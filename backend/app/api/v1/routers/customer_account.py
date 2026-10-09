from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.deps import get_current_customer
from app.crud import customer as customer_crud
from app.crud import menu as menu_crud
from app.models.customer import Customer
from app.schemas.customer import (
    CustomerOrderItemOut,
    CustomerOrderOut,
    CustomerOrderStats,
    CustomerProfileOut,
    CustomerUpdateIn,
    FavoriteItemOut,
    FavoriteToggleOut,
    SavedAddressIn,
    SavedAddressOut,
    SavedAddressUpdateIn,
)

router = APIRouter(prefix="/customer-account", tags=["Customer Account"])


def _safe_str(v, default="") -> str:
    return str(v) if v is not None else default


def _safe_int(v, default=0) -> int:
    try:
        return int(v) if v is not None else default
    except (TypeError, ValueError):
        return default


def _safe_float(v, default=0.0) -> float:
    try:
        return float(v) if v is not None else default
    except (TypeError, ValueError):
        return default


def _profile(c: Customer) -> CustomerProfileOut:
    """
    Build the /me response defensively.
    Every field falls back to a safe default if missing on the DB record.
    """
    return CustomerProfileOut(
        id=str(c.id),
        phone=_safe_str(getattr(c, "phone", None)),
        full_name=_safe_str(getattr(c, "full_name", None), "Customer"),
        email=getattr(c, "email", None),
        loyalty_points=_safe_int(getattr(c, "loyalty_points", 0)),
        lifetime_points_earned=_safe_int(
            getattr(c, "lifetime_points_earned", 0)
        ),
        lifetime_points_redeemed=_safe_int(
            getattr(c, "lifetime_points_redeemed", 0)
        ),
        total_orders=_safe_int(getattr(c, "total_orders", 0)),
        total_spent=_safe_float(getattr(c, "total_spent", 0.0)),
        referral_code=getattr(c, "referral_code", None),
        created_at=c.created_at,
    )


def _address_out(addr, index: int) -> SavedAddressOut:
    return SavedAddressOut(
        index=index,
        label=_safe_str(getattr(addr, "label", None), "Home"),
        zone_id=str(addr.zone_id) if getattr(addr, "zone_id", None) else None,
        zone_name=_safe_str(getattr(addr, "zone_name", None)),
        address=_safe_str(getattr(addr, "address", None)),
        is_default=bool(getattr(addr, "is_default", False)),
    )


# ---------- Profile ----------

@router.get("/me", response_model=CustomerProfileOut)
async def get_profile(current: Customer = Depends(get_current_customer)):
    return _profile(current)


@router.patch("/me", response_model=CustomerProfileOut)
async def update_profile(
    payload: CustomerUpdateIn,
    current: Customer = Depends(get_current_customer),
):
    if payload.full_name:
        current.full_name = payload.full_name.strip()
    if payload.email:
        current.email = payload.email
    await current.save()
    return _profile(current)


# ---------- Addresses ----------

@router.get("/addresses", response_model=list[SavedAddressOut])
async def list_addresses(current: Customer = Depends(get_current_customer)):
    addresses = getattr(current, "saved_addresses", None) or []
    return [_address_out(a, i) for i, a in enumerate(addresses)]


@router.post("/addresses", response_model=list[SavedAddressOut])
async def add_address(
    payload: SavedAddressIn,
    current: Customer = Depends(get_current_customer),
):
    current = await customer_crud.add_address(
        current,
        label=payload.label,
        zone_id=payload.zone_id,
        zone_name=payload.zone_name,
        address=payload.address,
        is_default=payload.is_default,
    )
    addresses = getattr(current, "saved_addresses", None) or []
    return [_address_out(a, i) for i, a in enumerate(addresses)]


@router.patch("/addresses/{index}", response_model=list[SavedAddressOut])
async def update_address(
    index: int,
    payload: SavedAddressUpdateIn,
    current: Customer = Depends(get_current_customer),
):
    try:
        current = await customer_crud.update_address(
            current, index, payload.model_dump(exclude_unset=True)
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    addresses = getattr(current, "saved_addresses", None) or []
    return [_address_out(a, i) for i, a in enumerate(addresses)]


@router.delete("/addresses/{index}", response_model=list[SavedAddressOut])
async def delete_address(
    index: int,
    current: Customer = Depends(get_current_customer),
):
    try:
        current = await customer_crud.delete_address(current, index)
    except ValueError as e:
        raise HTTPException(400, str(e))
    addresses = getattr(current, "saved_addresses", None) or []
    return [_address_out(a, i) for i, a in enumerate(addresses)]


# ---------- Orders ----------

@router.get("/orders", response_model=list[CustomerOrderOut])
async def my_orders(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    current: Customer = Depends(get_current_customer),
):
    orders = await customer_crud.order_history(
        current.phone, limit=limit, skip=skip
    )
    out = []
    for o in orders:
        items = [
            CustomerOrderItemOut(
                name=_safe_str(getattr(i, "name", None)),
                quantity=_safe_int(getattr(i, "quantity", 1), 1),
                unit_price=_safe_float(getattr(i, "unit_price", 0.0)),
            )
            for i in (getattr(o, "items", None) or [])
        ]
        out.append(
            CustomerOrderOut(
                id=str(o.id),
                reference=_safe_str(getattr(o, "reference", None)),
                status=(
                    o.status.value
                    if hasattr(getattr(o, "status", None), "value")
                    else _safe_str(getattr(o, "status", None), "pending")
                ),
                subtotal=_safe_float(getattr(o, "subtotal", 0.0)),
                delivery_fee=_safe_float(getattr(o, "delivery_fee", 0.0)),
                total=_safe_float(getattr(o, "total", 0.0)),
                delivery_zone_name=_safe_str(
                    getattr(o, "delivery_zone_name", None)
                ),
                delivery_address=_safe_str(
                    getattr(o, "delivery_address", None)
                ),
                items=items,
                created_at=o.created_at,
            )
        )
    return out


@router.get("/orders/stats", response_model=CustomerOrderStats)
async def my_order_stats(current: Customer = Depends(get_current_customer)):
    stats = await customer_crud.order_stats(current.phone)
    return CustomerOrderStats(
        total_orders=_safe_int(stats.get("total_orders", 0)),
        completed_orders=_safe_int(stats.get("completed_orders", 0)),
        total_spent=_safe_float(stats.get("total_spent", 0.0)),
    )


# ---------- Favorites ----------

@router.get("/favorites", response_model=list[FavoriteItemOut])
async def list_favorites(current: Customer = Depends(get_current_customer)):
    fav_ids = getattr(current, "favorite_item_ids", None) or []
    if not fav_ids:
        return []

    items = []
    for oid in fav_ids:
        item = await menu_crud.get_item(str(oid))
        if item:
            items.append(item)

    if not items:
        return []

    ratings = await menu_crud.ratings_map_for(items)

    out = []
    for i in items:
        r = ratings.get(str(i.id), {})
        out.append(
            FavoriteItemOut(
                id=str(i.id),
                name=_safe_str(getattr(i, "name", None)),
                slug=_safe_str(getattr(i, "slug", None)),
                price=_safe_float(getattr(i, "price", 0.0)),
                image_url=getattr(i, "image_url", None),
                is_available=bool(getattr(i, "is_available", True)),
                average_rating=_safe_float(r.get("average", 0.0)),
                total_reviews=_safe_int(r.get("count", 0)),
            )
        )
    return out


@router.post("/favorites/{menu_item_id}", response_model=FavoriteToggleOut)
async def toggle_favorite(
    menu_item_id: str,
    current: Customer = Depends(get_current_customer),
):
    item = await menu_crud.get_item(menu_item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")

    try:
        current, is_fav = await customer_crud.toggle_favorite(
            current, menu_item_id
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    return FavoriteToggleOut(
        is_favorite=is_fav,
        message="Added to favorites" if is_fav else "Removed from favorites",
    )


@router.delete("/favorites/{menu_item_id}", response_model=FavoriteToggleOut)
async def remove_favorite(
    menu_item_id: str,
    current: Customer = Depends(get_current_customer),
):
    """
    Idempotent removal. If the item isn't in favorites, returns is_favorite=False
    without error, so the frontend can call this safely on any item.
    """
    try:
        current, is_fav = await customer_crud.remove_favorite(
            current, menu_item_id
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    return FavoriteToggleOut(
        is_favorite=is_fav,
        message="Removed from favorites",
    )