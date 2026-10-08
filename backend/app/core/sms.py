"""
Arkesel SMS helper.

If ARKESEL_API_KEY is empty, messages are logged to console instead
of sent — so development works without a real Arkesel account.
"""
import logging
from typing import List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def _normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if digits.startswith("233"):
        return digits
    if digits.startswith("0"):
        return "233" + digits[1:]
    if len(digits) == 9:
        return "233" + digits
    return digits


async def send_sms(to: str, message: str) -> bool:
    if not settings.ARKESEL_API_KEY:
        logger.info("[SMS SKIPPED — no ARKESEL_API_KEY] to=%s msg=%s", to, message)
        return False

    recipient = _normalize_phone(to)
    url = f"{settings.ARKESEL_BASE_URL.rstrip('/')}/sms/send"

    payload = {
        "sender": settings.ARKESEL_SENDER_ID,
        "message": message,
        "recipients": [recipient],
    }
    headers = {
        "api-key": settings.ARKESEL_API_KEY,
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, json=payload, headers=headers)

        data = {}
        try:
            data = res.json()
        except Exception:
            data = {"raw": res.text}

        if res.status_code >= 400:
            logger.error("Arkesel SMS failed (%s): %s", res.status_code, data)
            return False

        logger.info("[SMS SENT] to=%s status=%s", recipient, res.status_code)
        return True

    except Exception as exc:
        logger.exception("Arkesel SMS request error: %s", exc)
        return False


async def send_sms_bulk(recipients: List[str], message: str) -> bool:
    if not recipients:
        return True
    if not settings.ARKESEL_API_KEY:
        logger.info(
            "[SMS BULK SKIPPED — no ARKESEL_API_KEY] to=%s msg=%s",
            recipients, message,
        )
        return False

    url = f"{settings.ARKESEL_BASE_URL.rstrip('/')}/sms/send"
    normalized = [_normalize_phone(r) for r in recipients]

    payload = {
        "sender": settings.ARKESEL_SENDER_ID,
        "message": message,
        "recipients": normalized,
    }
    headers = {
        "api-key": settings.ARKESEL_API_KEY,
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(url, json=payload, headers=headers)

        if res.status_code >= 400:
            logger.error("Arkesel bulk SMS failed (%s): %s", res.status_code, res.text)
            return False

        logger.info("[SMS BULK SENT] to=%d recipients", len(normalized))
        return True

    except Exception as exc:
        logger.exception("Arkesel bulk SMS error: %s", exc)
        return False


# ---------- Templates ----------

async def sms_order_received(order) -> bool:
    msg = (
        f"Hi {order.customer.full_name.split()[0]}! "
        f"Your Mr. Robert's Fries order {order.reference} has been received. "
        f"Total: GH₵ {order.total:.2f}. We'll notify you when it's on the way. "
        f"Questions? Call 0599233488"
    )
    return await send_sms(order.customer.phone, msg)


async def sms_order_paid(order) -> bool:
    msg = (
        f"Medaase {order.customer.full_name.split()[0]}! "
        f"Payment for {order.reference} (GH₵ {order.total:.2f}) confirmed. "
        f"Our kitchen is preparing your food now. 🍟"
    )
    return await send_sms(order.customer.phone, msg)


async def sms_order_out_for_delivery(order) -> bool:
    msg = (
        f"Good news, {order.customer.full_name.split()[0]}! "
        f"Your order {order.reference} is on the way to {order.delivery_zone_name}. "
        f"Estimated arrival: soon. 🛵"
    )
    return await send_sms(order.customer.phone, msg)


async def sms_order_delivered(order) -> bool:
    msg = (
        f"Delivered! Enjoy your meal, {order.customer.full_name.split()[0]} 🍟 "
        f"Thanks for ordering from Mr. Robert's Fries. "
        f"Reply with feedback or reorder at mrfries.com"
    )
    return await send_sms(order.customer.phone, msg)


async def sms_order_cancelled(order) -> bool:
    msg = (
        f"Hi {order.customer.full_name.split()[0]}, "
        f"order {order.reference} has been cancelled. "
        f"If you were charged, a refund will arrive within 3 business days. "
        f"Questions? Call 0599233488"
    )
    return await send_sms(order.customer.phone, msg)


async def sms_loyalty_earned(order, points_earned: int, new_balance: int) -> bool:
    msg = (
        f"🎁 You earned {points_earned} loyalty points on order {order.reference}! "
        f"Your balance is now {new_balance} points. "
        f"Redeem at checkout: 100 points = GH₵ 1 off."
    )
    return await send_sms(order.customer.phone, msg)


async def sms_otp(phone: str, code: str) -> bool:
    msg = (
        f"Your Mr. Robert's Fries login code is: {code}\n"
        f"Valid for {settings.CUSTOMER_OTP_EXPIRE_MINUTES} minutes. "
        f"Do not share this code with anyone."
    )
    return await send_sms(phone, msg)