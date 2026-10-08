from fastapi import Request
from app.core.limiter import limiter
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from app.core.config import settings
from app.core.deps import get_current_staff_or_admin
from app.core.email import send_order_receipt
from app.core.paystack import PaystackError, paystack_client
from app.core.sms import sms_loyalty_earned, sms_order_paid
from app.crud import order as order_crud
from app.crud import payment as payment_crud
from app.models.order import OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.schemas.payment import (
    PaymentInitialize,
    PaymentInitializeOut,
    PaymentOut,
    PaymentVerifyOut,
)
from app.utils.generators import generate_payment_reference

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


def _to_out(p: Payment) -> PaymentOut:
    return PaymentOut(
        id=str(p.id),
        order_id=str(p.order_id),
        reference=p.reference,
        amount=p.amount,
        currency=p.currency,
        status=p.status.value,
        channel=p.channel,
        created_at=p.created_at,
        paid_at=p.paid_at,
    )


async def _safe(coro, description: str, *args):
    """Run a coroutine, swallow exceptions, log them."""
    try:
        await coro(*args)
    except Exception:
        logger.exception("Failed: %s", description)


async def _on_paid(order, was_already_success: bool) -> None:
    """Shared post-payment handler used by both verify & webhook."""
    if not order:
        return
    await order_crud.update_order_status(order, OrderStatus.PAID)

    if was_already_success:
        return

    # 1. Receipt email
    await _safe(send_order_receipt, "send receipt email", order)

    # 2. Award loyalty points (returns 0 if already awarded)
    earned = 0
    try:
        earned = await order_crud.award_loyalty_for_paid_order(order)
    except Exception:
        logger.exception("Failed to award loyalty points for %s", order.reference)

    # 3. SMS confirmation
    await _safe(sms_order_paid, "send paid SMS", order)

    # 4. SMS about points earned
    if earned > 0:
        try:
            customer = await __import__(
                "app.crud.loyalty", fromlist=["get_customer_by_phone"]
            ).get_customer_by_phone(order.customer.phone)
            if customer:
                await sms_loyalty_earned(order, earned, customer.loyalty_points)
        except Exception:
            logger.exception("Failed to send loyalty SMS for %s", order.reference)


@router.post(
    "/initialize",
    response_model=PaymentInitializeOut,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("20/minute")
async def initialize_payment(request: Request, payload: PaymentInitialize):
    if not payload.order_id:
        raise HTTPException(400, "order_id is required")

    order = await order_crud.get_order(payload.order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status not in (OrderStatus.PENDING, OrderStatus.FAILED):
        raise HTTPException(400, f"Order already in status '{order.status.value}'")

    amount = float(payload.amount or order.total)
    if amount <= 0:
        raise HTTPException(400, "Amount must be greater than zero")

    reference = generate_payment_reference(order.reference)
    amount_pesewas = int(round(amount * 100))

    try:
        resp = await paystack_client.initialize_transaction(
            email=payload.email,
            amount_pesewas=amount_pesewas,
            reference=reference,
            currency=settings.CURRENCY,
            metadata={
                "order_reference": order.reference,
                "order_id": str(order.id),
                "customer_name": order.customer.full_name,
                "customer_phone": order.customer.phone,
                "delivery_zone": order.delivery_zone_name,
                "promo_code": order.promo_code or "",
                "loyalty_points_redeemed": order.loyalty_points_redeemed,
            },
            channels=["mobile_money", "card", "bank_transfer"],
        )
    except PaystackError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Paystack error: {e.message}",
        )

    data = resp["data"]

    await payment_crud.create_payment(
        order_id=str(order.id),
        reference=reference,
        amount=amount,
        currency=settings.CURRENCY,
        authorization_url=data.get("authorization_url"),
        access_code=data.get("access_code"),
    )

    await order_crud.attach_payment_reference(order, reference)

    return PaymentInitializeOut(
        authorization_url=data["authorization_url"],
        access_code=data["access_code"],
        reference=reference,
        amount=amount,
    )


@router.get("/verify/{reference}", response_model=PaymentVerifyOut)
async def verify_payment(reference: str):
    payment = await payment_crud.get_by_reference(reference)
    if not payment:
        raise HTTPException(404, "Payment record not found")

    try:
        resp = await paystack_client.verify_transaction(reference)
    except PaystackError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Paystack error: {e.message}",
        )

    data = resp["data"]
    ps_status = data.get("status")
    order = await order_crud.get_order_by_reference(
        data.get("metadata", {}).get("order_reference", "")
    )

    if ps_status == "success":
        was_already_success = payment.status == PaymentStatus.SUCCESS
        await payment_crud.mark_paid(
            payment,
            channel=data.get("channel"),
            gateway_response=data,
            paystack_reference=data.get("reference"),
        )
        await _on_paid(order, was_already_success)
    elif ps_status in ("failed", "abandoned"):
        await payment_crud.mark_failed(payment, gateway_response=data)
        if order:
            await order_crud.update_order_status(order, OrderStatus.FAILED)

    return PaymentVerifyOut(
        reference=reference,
        status=ps_status or payment.status.value,
        amount=data.get("amount", 0) / 100,
        currency=data.get("currency", settings.CURRENCY),
        channel=data.get("channel"),
        paid_at=(
            datetime.fromisoformat(data["paid_at"].replace("Z", "+00:00"))
            if data.get("paid_at")
            else None
        ),
        gateway_response=data,
    )


@router.post("/webhook", include_in_schema=False)
async def paystack_webhook(
    request: Request,
    x_paystack_signature: str | None = Header(None, alias="x-paystack-signature"),
):
    raw = await request.body()
    if not x_paystack_signature or not paystack_client.verify_webhook_signature(
        raw, x_paystack_signature
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature"
        )

    try:
        event = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    event_type = event.get("event")
    data = event.get("data", {})
    reference = data.get("reference")

    if not reference:
        return {"status": "ignored"}

    payment = await payment_crud.get_by_reference(reference)
    order_ref = data.get("metadata", {}).get("order_reference", "")
    order = await order_crud.get_order_by_reference(order_ref) if order_ref else None

    if event_type == "charge.success":
        was_already_success = payment and payment.status == PaymentStatus.SUCCESS
        if payment:
            await payment_crud.mark_paid(
                payment,
                channel=data.get("channel"),
                gateway_response=data,
                paystack_reference=data.get("reference"),
            )
        await _on_paid(order, bool(was_already_success))
    elif event_type in ("charge.failed", "transfer.failed"):
        if payment:
            await payment_crud.mark_failed(payment, gateway_response=data)
        if order:
            await order_crud.update_order_status(order, OrderStatus.FAILED)

    return {"status": "ok"}


@router.get(
    "",
    response_model=list[PaymentOut],
    dependencies=[Depends(get_current_staff_or_admin)],
)
async def list_payments(limit: int = 100, skip: int = 0):
    payments = await payment_crud.list_payments(limit=limit, skip=skip)
    return [_to_out(p) for p in payments]