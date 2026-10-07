from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId

from app.models.order import Order, OrderStatus
from app.utils.generators import generate_order_reference


async def create_order(
    customer: dict,
    items: list[dict],
    delivery_zone_id: str,
    delivery_zone_name: str,
    delivery_address: str,
    delivery_fee: float,
    notes: Optional[str] = None,
) -> Order:
    subtotal = sum(item["unit_price"] * item["quantity"] for item in items)
    total = subtotal + delivery_fee

    order = Order(
        reference=generate_order_reference(),
        customer=customer,
        delivery_zone_id=PydanticObjectId(delivery_zone_id),
        delivery_zone_name=delivery_zone_name,
        delivery_address=delivery_address,
        items=items,
        subtotal=round(subtotal, 2),
        delivery_fee=round(delivery_fee, 2),
        total=round(total, 2),
        notes=notes,
    )
    await order.insert()
    return order


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
) -> list[Order]:
    query = Order.find()
    if status:
        query = query.find(Order.status == status)
    return (
        await query.sort(-Order.created_at).skip(skip).limit(limit).to_list()
    )


async def update_order_status(order: Order, status: OrderStatus) -> Order:
    order.status = status
    order.updated_at = datetime.now(timezone.utc)
    await order.save()
    return order


async def attach_payment_reference(
    order: Order, payment_reference: str
) -> Order:
    order.payment_reference = payment_reference
    order.updated_at = datetime.now(timezone.utc)
    await order.save()
    return order