from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.core.config import settings
from app.crud import customer as customer_crud
from app.crud import loyalty as loyalty_crud
from app.crud import promo_code as promo_crud
from app.crud import referral as referral_crud
from app.models.order import Order, OrderStatus, OrderStatusEvent
from app.models.user import User
from app.utils.generators import generate_order_reference


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create_order(
    customer: dict,
    items: list[dict],
    delivery_zone_id: str,
    delivery_zone_name: str,
    delivery_address: str,
    delivery_fee: float,
    branch_id: Optional[str] = None,
    notes: Optional[str] = None,
    promo_code: Optional[str] = None,
    redeem_points: Optional[int] = None,
) -> tuple[Order, int, int]:
    subtotal = round(sum(i["unit_price"] * i["quantity"] for i in items), 2)

    promo_discount = 0.0
    promo: Optional[promo_crud.PromoCode] = None  # type: ignore
    if promo_code:
        valid, msg, discount, promo = await promo_crud.validate_promo(
            code=promo_code,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            phone=customer.get("phone"),
        )
        if not valid:
            raise ValueError(f"Promo error: {msg}")
        promo_discount = round(discount, 2)

    loyalty_discount = 0.0
    loyalty_customer = None
    if redeem_points and redeem_points > 0:
        loyalty_customer = await loyalty_crud.get_customer_by_phone(
            customer["phone"]
        )
        if not loyalty_customer:
            raise ValueError("No loyalty account found for this phone number")
        if redeem_points > loyalty_customer.loyalty_points:
            raise ValueError("Insufficient loyalty points")
        if redeem_points < settings.LOYALTY_MIN_REDEEM:
            raise ValueError(
                f"Minimum redemption is {settings.LOYALTY_MIN_REDEEM} points"
            )
        loyalty_discount = round(
            redeem_points * settings.LOYALTY_POINTS_TO_CEDI, 2
        )

    total = round(
        max(subtotal + delivery_fee - promo_discount - loyalty_discount, 0), 2
    )

    order = Order(
        reference=generate_order_reference(),
        branch_id=PydanticObjectId(branch_id) if branch_id else None,
        customer=customer,
        delivery_zone_id=PydanticObjectId(delivery_zone_id),
        delivery_zone_name=delivery_zone_name,
        delivery_address=delivery_address,
        items=items,
        subtotal=subtotal,
        delivery_fee=round(delivery_fee, 2),
        promo_code=promo.code if promo else None,
        promo_discount=promo_discount,
        loyalty_points_redeemed=int(redeem_points or 0),
        loyalty_discount=loyalty_discount,
        total=total,
        notes=notes,
        status_history=[OrderStatusEvent(status=OrderStatus.PENDING)],
    )
    await order.insert()

    if promo:
        await promo_crud.increment_usage(promo)

    if loyalty_customer and redeem_points and redeem_points > 0:
        await loyalty_crud.redeem_points(
            customer=loyalty_customer,
            order_id=order.id,
            order_reference=order.reference,
            points=int(redeem_points),
            note=f"Redeemed on order {order.reference}",
        )

    return order, promo_discount, loyalty_discount


async def get_order(order_id: str) -> Optional[Order]:
    try:
        return await Order.get(PydanticObjectId(order_id))
    except Exception:
        return None


async def get_order_by_reference(reference: str) -> Optional[Order]:
    return await Order.find_one(Order.reference == reference)


async def list_orders(
    status: Optional[OrderStatus] = None,
    limit: int = 100,
    skip: int = 0,
    branch_id: Optional[str] = None,
) -> list[Order]:
    query = Order.find()
    if branch_id:
        query = query.find(Order.branch_id == PydanticObjectId(branch_id))
    if status:
        query = query.find(Order.status == status)
    return await query.sort(-Order.created_at).skip(skip).limit(limit).to_list()


async def list_by_statuses(
    statuses: list[OrderStatus],
    limit: int = 200,
    branch_id: Optional[str] = None,
) -> list[Order]:
    query = Order.find({"status": {"$in": [s.value for s in statuses]}})
    if branch_id:
        query = query.find(Order.branch_id == PydanticObjectId(branch_id))
    return await query.sort(-Order.created_at).limit(limit).to_list()


async def list_for_rider(
    rider_id: str,
    include_delivered: bool = False,
    branch_id: Optional[str] = None,
) -> list[Order]:
    query = Order.find(Order.rider_id == PydanticObjectId(rider_id))
    if not include_delivered:
        query = query.find(
            {"status": {"$in": [
                OrderStatus.READY.value,
                OrderStatus.OUT_FOR_DELIVERY.value,
            ]}}
        )
    if branch_id:
        query = query.find(Order.branch_id == PydanticObjectId(branch_id))
    return await query.sort(+Order.dispatched_at).to_list()


async def list_assignable(branch_id: Optional[str] = None) -> list[Order]:
    query = Order.find({
        "status": {"$in": [
            OrderStatus.PAID.value,
            OrderStatus.PREPARING.value,
            OrderStatus.READY.value,
        ]},
        "rider_id": None,
    })
    if branch_id:
        query = query.find(Order.branch_id == PydanticObjectId(branch_id))
    return await query.sort(+Order.created_at).to_list()


async def update_order_status(
    order: Order,
    status: OrderStatus,
    by: Optional[str] = None,
    note: Optional[str] = None,
) -> Order:
    if order.status == status:
        return order
    order.status = status
    order.status_history.append(
        OrderStatusEvent(status=status, by=by, note=note)
    )
    now = _now()
    if status == OrderStatus.OUT_FOR_DELIVERY:
        order.dispatched_at = now
    elif status == OrderStatus.DELIVERED:
        order.delivered_at = now
    order.updated_at = now
    await order.save()
    return order


async def assign_rider(order: Order, rider: User) -> Order:
    order.rider_id = rider.id
    order.rider_name = rider.full_name
    order.rider_phone = rider.phone
    order.updated_at = _now()
    await order.save()
    return order


async def attach_payment_reference(order: Order, payment_reference: str) -> Order:
    order.payment_reference = payment_reference
    order.updated_at = _now()
    await order.save()
    return order


async def _decrement_stock(order: Order) -> None:
    """Decrement stock for all menu items in a paid order."""
    try:
        from app.models.menu_item import MenuItem
        for item in order.items:
            if not item.item_id:
                continue
            db_item = await MenuItem.get(item.item_id)
            if not db_item:
                continue
            if db_item.stock_count is None:
                continue
            db_item.stock_count = max(0, db_item.stock_count - item.quantity)
            if db_item.stock_count == 0:
                db_item.is_available = False
            db_item.updated_at = _now()
            await db_item.save()
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Stock decrement failed")


async def restock_for_cancelled_order(order: Order) -> None:
    """Add back stock when an order is cancelled after being paid."""
    try:
        from app.models.menu_item import MenuItem
        for item in order.items:
            if not item.item_id:
                continue
            db_item = await MenuItem.get(item.item_id)
            if not db_item or db_item.stock_count is None:
                continue
            db_item.stock_count += item.quantity
            if db_item.stock_count > 0:
                db_item.is_available = True
            db_item.updated_at = _now()
            await db_item.save()
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Restock failed")


async def award_loyalty_for_paid_order(order: Order) -> int:
    if order.loyalty_points_earned > 0:
        return order.loyalty_points_earned
    points = int(order.total * settings.LOYALTY_POINTS_PER_CEDI)
    if points <= 0:
        return 0

    customer = await loyalty_crud.get_or_create_customer(
        phone=order.customer.phone,
        full_name=order.customer.full_name,
        email=order.customer.email,
    )
    await loyalty_crud.award_points(
        customer=customer,
        order_id=order.id,
        order_reference=order.reference,
        points=points,
    )
    await loyalty_crud.touch_customer_order_stats(customer, order.total)

    try:
        await customer_crud.track_favorites_from_order(customer, order)
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Failed to track favorites")

    try:
        ref = await referral_crud.find_pending_by_referee(order.customer.phone)
        if ref:
            await referral_crud.complete_referral(ref, order.reference)
            points_per_cedi = settings.LOYALTY_POINTS_PER_CEDI

            referee_bonus = int(ref.referee_reward * points_per_cedi)
            if referee_bonus > 0:
                await loyalty_crud.award_points(
                    customer=customer,
                    order_id=order.id,
                    order_reference=order.reference,
                    points=referee_bonus,
                    note=f"Referral bonus for using {ref.code}",
                )

            referrer = await loyalty_crud.get_customer_by_phone(
                ref.referrer_phone
            )
            if referrer:
                referrer_bonus = int(ref.referrer_reward * points_per_cedi)
                if referrer_bonus > 0:
                    await loyalty_crud.award_points(
                        customer=referrer,
                        order_id=order.id,
                        order_reference=order.reference,
                        points=referrer_bonus,
                        note=f"Referral bonus — {ref.referee_name or 'friend'} ordered",
                    )
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Failed to complete referral")

    order.loyalty_points_earned = points
    order.updated_at = _now()
    await order.save()

    await _decrement_stock(order)

    return points