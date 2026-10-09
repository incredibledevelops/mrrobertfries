from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect

from app.core.deps import get_current_kitchen
from app.core.security import decode_token
from app.core.ws import broadcast_order_event, kitchen_broker
from app.crud import order as order_crud
from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole
from app.schemas.order import KitchenFeedOut, KitchenOrderOut, OrderStatusUpdate

router = APIRouter(prefix="/kitchen", tags=["Kitchen"])


def _minutes_since(dt: datetime) -> int:
    if not dt:
        return 0
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = now - dt
    return max(0, int(delta.total_seconds() // 60))


def _minutes_in_status(order: Order) -> int:
    if not order.status_history:
        return _minutes_since(order.created_at)
    return _minutes_since(order.status_history[-1].at)


def _to_kitchen(o: Order) -> KitchenOrderOut:
    return KitchenOrderOut(
        id=str(o.id),
        reference=o.reference,
        customer_name=o.customer.full_name,
        delivery_zone_name=o.delivery_zone_name,
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
        notes=o.notes,
        status=o.status,
        created_at=o.created_at,
        updated_at=o.updated_at,
        minutes_since_created=_minutes_since(o.created_at),
        minutes_in_current_status=_minutes_in_status(o),
    )


@router.get("/feed", response_model=KitchenFeedOut)
async def feed(_: User = Depends(get_current_kitchen)):
    orders = await order_crud.list_by_statuses(
        statuses=[
            OrderStatus.PAID,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.OUT_FOR_DELIVERY,
        ],
        limit=200,
    )

    buckets = {
        "new": [],
        "preparing": [],
        "ready": [],
        "out_for_delivery": [],
    }
    for o in orders:
        if o.status == OrderStatus.PAID:
            buckets["new"].append(_to_kitchen(o))
        elif o.status == OrderStatus.PREPARING:
            buckets["preparing"].append(_to_kitchen(o))
        elif o.status == OrderStatus.READY:
            buckets["ready"].append(_to_kitchen(o))
        elif o.status == OrderStatus.OUT_FOR_DELIVERY:
            buckets["out_for_delivery"].append(_to_kitchen(o))

    for k in buckets:
        buckets[k].sort(key=lambda x: x.created_at)

    return KitchenFeedOut(**buckets)


@router.patch("/orders/{order_id}/status")
async def advance_order(
    order_id: str,
    payload: OrderStatusUpdate,
    current_user: User = Depends(get_current_kitchen),
):
    order = await order_crud.get_order(order_id)
    if not order:
        raise HTTPException(404, "Order not found")

    kitchen_allowed = {
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.CANCELLED,
    }
    if payload.status not in kitchen_allowed:
        raise HTTPException(
            400,
            f"Kitchen cannot set status '{payload.status.value}'",
        )

    order = await order_crud.update_order_status(
        order,
        payload.status,
        by=current_user.email,
        note=payload.note,
    )

    # Broadcast to every connected kitchen screen
    await broadcast_order_event(
        "order.updated",
        _to_kitchen(order).model_dump(),
    )

    return _to_kitchen(order)


@router.websocket("/ws")
async def kitchen_ws(websocket: WebSocket):
    """
    WebSocket endpoint. Client must send {"token": "<jwt>"} first.
    If the token is invalid, the connection is closed with code 1008.

    NOTE: `kitchen_broker.connect()` performs the single `websocket.accept()`
    call. Do NOT call `accept()` here — doing so twice raises a RuntimeError.
    """
    try:
        auth_message = await websocket.receive_json()
    except Exception:
        # Not yet accepted; still safe to close
        try:
            await websocket.close(code=1008)
        except Exception:
            pass
        return

    token = auth_message.get("token")
    if not token:
        try:
            await websocket.close(code=1008)
        except Exception:
            pass
        return

    # Verify the token + role
    try:
        payload = decode_token(token)
    except ValueError:
        try:
            await websocket.close(code=1008)
        except Exception:
            pass
        return

    if payload.get("type") != "access":
        try:
            await websocket.close(code=1008)
        except Exception:
            pass
        return

    from beanie import PydanticObjectId
    try:
        user = await User.get(PydanticObjectId(payload.get("sub")))
    except Exception:
        user = None

    if not user or user.role not in (
        UserRole.KITCHEN,
        UserRole.ADMIN,
        UserRole.STAFF,
    ):
        try:
            await websocket.close(code=1008)
        except Exception:
            pass
        return

    # Register with the broker — this performs the only `accept()` call.
    await kitchen_broker.connect(websocket)

    try:
        while True:
            # Keep the connection alive by responding to client pings
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text('{"event":"pong"}')
    except WebSocketDisconnect:
        await kitchen_broker.disconnect(websocket)
    except Exception:
        await kitchen_broker.disconnect(websocket)