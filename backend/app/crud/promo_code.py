from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.models.promo_code import DiscountType, PromoCode
from app.models.order import Order


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _is_time_aware(dt: Optional[datetime]) -> bool:
    return dt is not None and dt.tzinfo is not None


def _make_aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def create_promo(data: dict) -> PromoCode:
    data["code"] = data["code"].strip().upper()
    promo = PromoCode(**data)
    await promo.insert()
    return promo


async def get_by_code(code: str) -> Optional[PromoCode]:
    return await PromoCode.find_one(PromoCode.code == code.strip().upper())


async def get_by_id(promo_id: str) -> Optional[PromoCode]:
    try:
        return await PromoCode.get(PydanticObjectId(promo_id))
    except Exception:
        return None


async def list_promos(
    active_only: bool = False,
    skip: int = 0,
    limit: int = 200,
) -> list[PromoCode]:
    query = PromoCode.find()
    if active_only:
        query = query.find(PromoCode.is_active == True)  # noqa: E712
    return await query.sort(-PromoCode.created_at).skip(skip).limit(limit).to_list()


async def update_promo(promo: PromoCode, data: dict) -> PromoCode:
    for k, v in data.items():
        if v is not None:
            if k == "code":
                v = v.strip().upper()
            setattr(promo, k, v)
    promo.updated_at = _now()
    await promo.save()
    return promo


async def delete_promo(promo: PromoCode) -> None:
    await promo.delete()


async def count_uses_by_phone(promo_code: str, phone: str) -> int:
    if not phone:
        return 0
    return await Order.find(
        Order.promo_code == promo_code.strip().upper(),
        Order.customer.phone == phone,
        Order.status != "cancelled",
    ).count()


def compute_discount(
    promo: PromoCode, subtotal: float, delivery_fee: float
) -> float:
    """
    Return the cash discount this promo produces for the given subtotal.
    Does NOT mutate anything.
    """
    if promo.discount_type == DiscountType.FREE_DELIVERY:
        return delivery_fee
    if promo.discount_type == DiscountType.FIXED:
        return min(promo.discount_value, subtotal + delivery_fee)
    if promo.discount_type == DiscountType.PERCENT:
        raw = subtotal * (promo.discount_value / 100.0)
        if promo.max_discount is not None:
            raw = min(raw, promo.max_discount)
        return min(raw, subtotal + delivery_fee)
    return 0.0


async def validate_promo(
    code: str,
    subtotal: float,
    delivery_fee: float,
    phone: Optional[str] = None,
) -> tuple[bool, str, float, Optional[PromoCode]]:
    """
    Returns (is_valid, message, discount_amount, promo_or_none).
    """
    promo = await get_by_code(code)
    if not promo:
        return False, "Promo code not found", 0.0, None

    if not promo.is_active:
        return False, "This promo code is no longer active", 0.0, promo

    now = _now()
    if promo.valid_from and _make_aware(promo.valid_from) > now:
        return False, "This promo code is not yet active", 0.0, promo
    if promo.valid_until and _make_aware(promo.valid_until) < now:
        return False, "This promo code has expired", 0.0, promo

    if promo.usage_limit is not None and promo.times_used >= promo.usage_limit:
        return False, "This promo code has reached its usage limit", 0.0, promo

    if subtotal < promo.min_order_total:
        return (
            False,
            f"Minimum order of GH₵ {promo.min_order_total:.2f} required",
            0.0,
            promo,
        )

    if phone and promo.per_customer_limit:
        used = await count_uses_by_phone(promo.code, phone)
        if used >= promo.per_customer_limit:
            return (
                False,
                "You've already used this promo code",
                0.0,
                promo,
            )

    discount = compute_discount(promo, subtotal, delivery_fee)
    return True, f"Promo applied: −GH₵ {discount:.2f}", discount, promo


async def increment_usage(promo: PromoCode) -> None:
    promo.times_used += 1
    promo.updated_at = _now()
    await promo.save()