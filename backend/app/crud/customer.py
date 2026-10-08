import secrets
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.models.customer import Customer, SavedAddress
from app.models.order import Order, OrderStatus


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _generate_referral_code() -> str:
    """Short, shareable code like MRF-A4X9K."""
    return "MRF-" + secrets.token_hex(3).upper()


async def get_by_phone(phone: str) -> Optional[Customer]:
    return await Customer.find_one(Customer.phone == phone)


async def get_by_id(customer_id: str) -> Optional[Customer]:
    try:
        return await Customer.get(PydanticObjectId(customer_id))
    except Exception:
        return None


async def get_or_create(
    phone: str,
    full_name: str,
    email: Optional[str] = None,
) -> Customer:
    existing = await get_by_phone(phone)
    if existing:
        changed = False
        if full_name and existing.full_name != full_name:
            existing.full_name = full_name
            changed = True
        if email and existing.email != email:
            existing.email = email
            changed = True
        if not existing.referral_code:
            existing.referral_code = _generate_referral_code()
            changed = True
        if changed:
            existing.updated_at = _now()
            await existing.save()
        return existing

    customer = Customer(
        phone=phone,
        full_name=full_name,
        email=email,
        referral_code=_generate_referral_code(),
    )
    await customer.insert()
    return customer


# ---------- Addresses ----------

async def add_address(
    customer: Customer,
    label: str,
    zone_id: Optional[str],
    zone_name: str,
    address: str,
    is_default: bool = False,
) -> Customer:
    if is_default:
        for a in customer.saved_addresses:
            a.is_default = False

    customer.saved_addresses.append(
        SavedAddress(
            label=label,
            zone_id=PydanticObjectId(zone_id) if zone_id else None,
            zone_name=zone_name,
            address=address,
            is_default=is_default or len(customer.saved_addresses) == 0,
        )
    )
    customer.updated_at = _now()
    await customer.save()
    return customer


async def update_address(
    customer: Customer,
    index: int,
    data: dict,
) -> Customer:
    if index < 0 or index >= len(customer.saved_addresses):
        raise ValueError("Address index out of range")

    addr = customer.saved_addresses[index]

    if data.get("is_default"):
        for a in customer.saved_addresses:
            a.is_default = False

    for k, v in data.items():
        if v is None:
            continue
        if k == "zone_id":
            addr.zone_id = PydanticObjectId(v) if v else None
        elif hasattr(addr, k):
            setattr(addr, k, v)

    customer.updated_at = _now()
    await customer.save()
    return customer


async def delete_address(customer: Customer, index: int) -> Customer:
    if index < 0 or index >= len(customer.saved_addresses):
        raise ValueError("Address index out of range")

    was_default = customer.saved_addresses[index].is_default
    customer.saved_addresses.pop(index)

    # If we deleted the default, promote the first one
    if was_default and customer.saved_addresses:
        customer.saved_addresses[0].is_default = True

    customer.updated_at = _now()
    await customer.save()
    return customer


# ---------- Favorites ----------

async def toggle_favorite(
    customer: Customer,
    menu_item_id: str,
) -> tuple[Customer, bool]:
    """Returns (customer, is_now_favorite)."""
    try:
        oid = PydanticObjectId(menu_item_id)
    except Exception:
        raise ValueError("Invalid menu item id")

    if oid in customer.favorite_item_ids:
        customer.favorite_item_ids.remove(oid)
        is_fav = False
    else:
        customer.favorite_item_ids.append(oid)
        is_fav = True

    customer.updated_at = _now()
    await customer.save()
    return customer, is_fav


async def track_favorites_from_order(customer: Customer, order: Order) -> None:
    """Called after every paid order — adds menu items to favorites set."""
    changed = False
    for item in order.items:
        if item.item_id and item.item_id not in customer.favorite_item_ids:
            customer.favorite_item_ids.append(item.item_id)
            changed = True
    if changed:
        customer.updated_at = _now()
        await customer.save()


# ---------- Orders ----------

async def order_history(
    phone: str, limit: int = 50, skip: int = 0
) -> list[Order]:
    return (
        await Order.find(Order.customer.phone == phone)
        .sort(-Order.created_at)
        .skip(skip)
        .limit(limit)
        .to_list()
    )


async def order_stats(phone: str) -> dict:
    orders = await Order.find(Order.customer.phone == phone).to_list()
    completed = [o for o in orders if o.status == OrderStatus.DELIVERED]
    return {
        "total_orders": len(orders),
        "completed_orders": len(completed),
        "total_spent": round(sum(
            o.total for o in orders
            if o.status in (
                OrderStatus.PAID,
                OrderStatus.PREPARING,
                OrderStatus.READY,
                OrderStatus.OUT_FOR_DELIVERY,
                OrderStatus.DELIVERED,
            )
        ), 2),
    }