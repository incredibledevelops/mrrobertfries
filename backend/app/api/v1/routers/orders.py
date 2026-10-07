from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import get_current_staff_or_admin
from app.crud import delivery_zone as zone_crud
from app.crud import menu as menu_crud
from app.crud import order as order_crud
from app.models.order import Order, OrderStatus
from app.schemas.order import (
    OrderCreate,
    OrderItemIn,
    OrderOut,
    OrderStatusUpdate,
    OrderTrackOut,
)

router = APIRouter(prefix="/orders", tags=["Orders"])


def _to_out(o: Order) -> OrderOut:
    return OrderOut(
        id=str(o.id),
        reference=o.reference,
        customer=o.customer.model_dump(),
        delivery_zone_id=str(o.delivery_zone_id) if o.delivery_zone_id else None,
        delivery_zone_name=o.delivery_zone_name,
        delivery_address=o.delivery_address,
        items=[
            {
                "item_id": str(i.item_id) if i.item_id else None,
                "name": i.name,
                "unit_price": i.unit_price,
                "quantity": i.quantity,
                "is_custom_bowl": i.is_custom_bowl,
                "customizations": i.customizations,
            }
            for i in o.items
        ],
        subtotal=o.subtotal,
        delivery_fee=o.delivery_fee,
        total=o.total,
        status=o.status,
        payment_reference=o.payment_reference,
        notes=o.notes,
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(payload: OrderCreate):
    zone = await zone_crud.get_zone(payload.delivery_zone_id)
    if not zone:
        raise HTTPException(400, "Invalid delivery_zone_id")
    if not zone.is_active:
        raise HTTPException(400, "Delivery zone is currently unavailable")

    # Validate menu items & snapshot prices
    resolved_items: list[dict] = []
    for item in payload.items:
        if item.is_custom_bowl:
            resolved_items.append(
                {
                    "item_id": None,
                    "name": item.name,
                    "unit_price": float(item.unit_price),
                    "quantity": item.quantity,
                    "is_custom_bowl": True,
                    "customizations": item.customizations,
                }
            )
            continue

        if not item.item_id:
            raise HTTPException(400, f"item_id missing for '{item.name}'")

        db_item = await menu_crud.get_item(item.item_id)
        if not db_item:
            raise HTTPException(400, f"Menu item not found: {item.name}")
        if not db_item.is_available:
            raise HTTPException(400, f"'{db_item.name}' is out of stock")

        resolved_items.append(
            {
                "item_id": db_item.id,
                "name": db_item.name,
                "unit_price": db_item.price,
                "quantity": item.quantity,
                "is_custom_bowl": False,
                "customizations": None,
            }
        )

    order = await order_crud.create_order(
        customer=payload.customer.model_dump(),
        items=resolved_items,
        delivery_zone_id=str(zone.id),
        delivery_zone_name=zone.name,
        delivery_address=payload.delivery_address,
        delivery_fee=zone.delivery_fee,
        notes=payload.notes,
    )
    return _to_out(order)


@router.get("/track/{reference}", response_model=OrderTrackOut)
async def track_order(reference: str):
    order = await order_crud.get_order_by_reference(reference)
    if not order:
        raise HTTPException(404, "Order not found")
    return OrderTrackOut(
        reference=order.reference,
        status=order.status,
        total=order.total,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


@router.get("", response_model=list[OrderOut])
async def list_orders(
    status_filter: OrderStatus | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    _=Depends(get_current_staff_or_admin),
):
    orders = await order_crud.list_orders(
        status=status_filter, limit=limit, skip=skip
    )
    return [_to_out(o) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: str, _=Depends(get_current_staff_or_admin)):
    order = await order_crud.get_order(order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    return _to_out(order)


@router.patch(
    "/{order_id}/status",
    response_model=OrderOut,
    dependencies=[Depends(get_current_staff_or_admin)],
)
async def update_status(order_id: str, payload: OrderStatusUpdate):
    order = await order_crud.get_order(order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    order = await order_crud.update_order_status(order, payload.status)
    return _to_out(order)