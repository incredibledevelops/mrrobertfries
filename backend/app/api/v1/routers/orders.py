from fastapi import Request
from app.core.limiter import limiter
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import (
    check_idempotency,
    get_current_staff_or_admin,
    get_idempotency_key,
    store_idempotency,
)
from app.core.sms import (
    sms_order_cancelled,
    sms_order_delivered,
    sms_order_out_for_delivery,
    sms_order_received,
)
from app.crud import branch as branch_crud
from app.crud import delivery_zone as zone_crud
from app.crud import menu as menu_crud
from app.crud import order as order_crud
from app.crud import user as user_crud
from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole
from app.schemas.order import (
    OrderAssignRider,
    OrderCreate,
    OrderOut,
    OrderStatusUpdate,
    OrderTrackOut,
)

router = APIRouter(prefix="/orders", tags=["Orders"])


def _to_out(o: Order) -> OrderOut:
    return OrderOut(
        id=str(o.id),
        reference=o.reference,
        branch_id=str(o.branch_id) if o.branch_id else None,
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
        promo_code=o.promo_code,
        promo_discount=o.promo_discount,
        loyalty_points_redeemed=o.loyalty_points_redeemed,
        loyalty_discount=o.loyalty_discount,
        total=o.total,
        status=o.status,
        status_history=o.status_history,
        rider_id=str(o.rider_id) if o.rider_id else None,
        rider_name=o.rider_name,
        rider_phone=o.rider_phone,
        dispatched_at=o.dispatched_at,
        delivered_at=o.delivered_at,
        payment_reference=o.payment_reference,
        notes=o.notes,
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def create_order(
    request: Request,
    payload: OrderCreate,
    idem_key: str | None = Depends(get_idempotency_key),
):
    endpoint = "POST /api/v1/orders"

    # 1. If this exact request was made before, return the cached response
    cached = await check_idempotency(idem_key, endpoint)
    if cached:
        return OrderOut(**cached)

    # 2. Resolve branch
    branch_id = payload.branch_id
    if branch_id:
        branch = await branch_crud.get_branch(branch_id)
        if not branch or not branch.is_active:
            raise HTTPException(400, "Invalid or inactive branch_id")
    else:
        default_branch = await branch_crud.get_default_branch()
        if default_branch:
            branch_id = str(default_branch.id)

    # 3. Resolve zone
    zone = await zone_crud.get_zone(payload.delivery_zone_id)
    if not zone:
        raise HTTPException(400, "Invalid delivery_zone_id")
    if not zone.is_active:
        raise HTTPException(400, "Delivery zone is currently unavailable")

    ok, reason = await zone_crud.zone_belongs_to_branch(zone, branch_id)
    if not ok:
        raise HTTPException(400, reason)

    # 4. Resolve items
    resolved_items: list[dict] = []
    for item in payload.items:
        if item.is_custom_bowl:
            resolved_items.append({
                "item_id": None,
                "name": item.name,
                "unit_price": float(item.unit_price),
                "quantity": item.quantity,
                "is_custom_bowl": True,
                "customizations": item.customizations,
            })
            continue

        if not item.item_id:
            raise HTTPException(400, f"item_id missing for '{item.name}'")

        db_item = await menu_crud.get_item(item.item_id)
        if not db_item:
            raise HTTPException(400, f"Menu item not found: {item.name}")
        if not db_item.is_available:
            raise HTTPException(400, f"'{db_item.name}' is out of stock")

        if db_item.branch_id is not None:
            from beanie import PydanticObjectId
            try:
                item_bid = PydanticObjectId(branch_id) if branch_id else None
            except Exception:
                item_bid = None
            if item_bid is None or db_item.branch_id != item_bid:
                raise HTTPException(
                    400,
                    f"'{db_item.name}' is not available at this branch",
                )

        resolved_items.append({
            "item_id": db_item.id,
            "name": db_item.name,
            "unit_price": db_item.price,
            "quantity": item.quantity,
            "is_custom_bowl": False,
            "customizations": None,
        })

    try:
        order, _, _ = await order_crud.create_order(
            customer=payload.customer.model_dump(),
            items=resolved_items,
            delivery_zone_id=str(zone.id),
            delivery_zone_name=zone.name,
            delivery_address=payload.delivery_address,
            delivery_fee=zone.delivery_fee,
            branch_id=branch_id,
            notes=payload.notes,
            promo_code=payload.promo_code,
            redeem_points=payload.redeem_points,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    try:
        await sms_order_received(order)
    except Exception:
        import logging
        logging.getLogger(__name__).exception("SMS received failed")

    result = _to_out(order)

    # 5. Cache the response under the idempotency key
    await store_idempotency(idem_key, endpoint, result.model_dump(), 201)

    return result


@router.get("/track/{reference}", response_model=OrderTrackOut)
async def track_order(reference: str):
    order = await order_crud.get_order_by_reference(reference)
    if not order:
        raise HTTPException(404, "Order not found")
    return OrderTrackOut(
        reference=order.reference,
        status=order.status,
        subtotal=order.subtotal,
        promo_discount=order.promo_discount,
        loyalty_discount=order.loyalty_discount,
        total=order.total,
        rider_name=order.rider_name,
        rider_phone=order.rider_phone,
        dispatched_at=order.dispatched_at,
        delivered_at=order.delivered_at,
        status_history=order.status_history,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


@router.get("", response_model=list[OrderOut])
async def list_orders(
    status_filter: OrderStatus | None = Query(None, alias="status"),
    branch_id: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    _=Depends(get_current_staff_or_admin),
):
    orders = await order_crud.list_orders(
        status=status_filter, limit=limit, skip=skip, branch_id=branch_id
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

    if order.status in (OrderStatus.DELIVERED, OrderStatus.CANCELLED) \
            and payload.status != order.status:
        raise HTTPException(
            400,
            f"Cannot change status once order is '{order.status.value}'",
        )

        order = await order_crud.update_order_status(
        order, payload.status, note=payload.note
    )

    # Broadcast to kitchen displays
    from app.core.ws import broadcast_order_event
    from app.api.v1.routers.kitchen import _to_kitchen
    try:
        await broadcast_order_event("order.updated", _to_kitchen(order).model_dump())
    except Exception:
        pass

    try:
        if payload.status == OrderStatus.OUT_FOR_DELIVERY:
            await sms_order_out_for_delivery(order)
        elif payload.status == OrderStatus.DELIVERED:
            await sms_order_delivered(order)
        elif payload.status == OrderStatus.CANCELLED:
            await sms_order_cancelled(order)
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Status SMS failed")

    return _to_out(order)


@router.patch(
    "/{order_id}/assign-rider",
    response_model=OrderOut,
    dependencies=[Depends(get_current_staff_or_admin)],
)
async def assign_rider(order_id: str, payload: OrderAssignRider):
    order = await order_crud.get_order(order_id)
    if not order:
        raise HTTPException(404, "Order not found")

    rider = await user_crud.get_by_id(payload.rider_id)
    if not rider:
        raise HTTPException(400, "Rider not found")
    if rider.role != UserRole.RIDER:
        raise HTTPException(400, "User is not a rider")
    if not rider.is_active:
        raise HTTPException(400, "Rider is inactive")

    order = await order_crud.assign_rider(order, rider)
    return _to_out(order)


@router.get(
    "/misc/riders",
    dependencies=[Depends(get_current_staff_or_admin)],
)
async def list_riders():
    riders = await User.find(User.role == UserRole.RIDER).to_list()
    return [
        {
            "id": str(r.id),
            "full_name": r.full_name,
            "phone": r.phone,
            "vehicle": r.vehicle,
            "plate_number": r.plate_number,
            "is_active": r.is_active,
            "branch_id": str(r.branch_id) if r.branch_id else None,
        }
        for r in riders
    ]