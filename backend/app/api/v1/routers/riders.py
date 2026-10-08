from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_rider, get_current_rider_or_admin
from app.crud import order as order_crud
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.schemas.order import OrderStatusUpdate, RiderAssignableOut, RiderOrderOut
from app.core.ws import broadcast_order_event
from app.api.v1.routers.kitchen import _to_kitchen

router = APIRouter(prefix="/riders", tags=["Riders"])


def _items_count(order: Order) -> int:
    return sum(i.quantity for i in order.items)


def _to_rider(o: Order) -> RiderOrderOut:
    return RiderOrderOut(
        id=str(o.id),
        reference=o.reference,
        customer_name=o.customer.full_name,
        customer_phone=o.customer.phone,
        delivery_address=o.delivery_address,
        delivery_zone_name=o.delivery_zone_name,
        items_count=_items_count(o),
        total=o.total,
        status=o.status,
        dispatched_at=o.dispatched_at,
        delivered_at=o.delivered_at,
        created_at=o.created_at,
    )


def _to_assignable(o: Order) -> RiderAssignableOut:
    return RiderAssignableOut(
        id=str(o.id),
        reference=o.reference,
        delivery_zone_name=o.delivery_zone_name,
        items_count=_items_count(o),
        total=o.total,
        status=o.status,
        created_at=o.created_at,
    )


async def _broadcast(order: Order) -> None:
    try:
        await broadcast_order_event(
            "order.updated", _to_kitchen(order).model_dump()
        )
    except Exception:
        pass


@router.get("/assignable", response_model=list[RiderAssignableOut])
async def assignable(_: User = Depends(get_current_rider_or_admin)):
    """Paid / preparing / ready orders without a rider yet — pick one up."""
    orders = await order_crud.list_assignable()
    return [_to_assignable(o) for o in orders]


@router.get("/mine", response_model=list[RiderOrderOut])
async def my_orders(
    include_delivered: bool = False,
    current_user: User = Depends(get_current_rider),
):
    orders = await order_crud.list_for_rider(
        str(current_user.id), include_delivered=include_delivered
    )
    return [_to_rider(o) for o in orders]


@router.post("/claim/{order_id}", response_model=RiderOrderOut)
async def claim_order(
    order_id: str,
    current_user: User = Depends(get_current_rider),
):
    """Rider picks up an unassigned order."""
    order = await order_crud.get_order(order_id)
    if not order:
        raise HTTPException(404, "Order not found")

    if order.rider_id is not None and str(order.rider_id) != str(current_user.id):
        raise HTTPException(409, "This order is already assigned to another rider")

    if order.status not in (
        OrderStatus.PAID,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.OUT_FOR_DELIVERY,
    ):
        raise HTTPException(400, f"Cannot claim an order in '{order.status.value}'")

    order = await order_crud.assign_rider(order, current_user)
    await _broadcast(order)
    return _to_rider(order)


@router.patch("/orders/{order_id}/status", response_model=RiderOrderOut)
async def rider_update_status(
    order_id: str,
    payload: OrderStatusUpdate,
    current_user: User = Depends(get_current_rider),
):
    """
    Riders can move: ready → out_for_delivery → delivered.
    A rider can only act on their own assigned orders.
    """
    order = await order_crud.get_order(order_id)
    if not order:
        raise HTTPException(404, "Order not found")

    if order.rider_id is None or str(order.rider_id) != str(current_user.id):
        raise HTTPException(403, "This order is not assigned to you")

    rider_allowed = {OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED}
    if payload.status not in rider_allowed:
        raise HTTPException(
            400,
            f"Rider cannot set status '{payload.status.value}'",
        )

    order = await order_crud.update_order_status(
        order,
        payload.status,
        by=current_user.email,
        note=payload.note,
    )
    await _broadcast(order)
    return _to_rider(order)