from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.cache import cache, invalidate_menu
from app.core.deps import get_current_admin
from app.crud import category as category_crud
from app.crud import menu as menu_crud
from app.models.menu_item import MenuItem
from app.schemas.menu import (
    MenuItemCreate,
    MenuItemOut,
    MenuItemUpdate,
    StockToggle,
)

router = APIRouter(prefix="/menu", tags=["Menu"])


def _to_out(item: MenuItem, rating: dict | None = None) -> MenuItemOut:
    base = {
        "id": str(item.id),
        "name": item.name,
        "slug": item.slug,
        "description": item.description,
        "price": item.price,
        "category_id": str(item.category_id),
        "branch_id": str(item.branch_id) if item.branch_id else None,
        "image_url": item.image_url,
        "tags": item.tags,
        "is_available": item.is_available,
        "stock_count": item.stock_count,
        "display_order": item.display_order,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "average_rating": 0.0,
        "total_reviews": 0,
    }
    if rating:
        base["average_rating"] = rating.get("average", 0.0)
        base["total_reviews"] = rating.get("count", 0)
    return MenuItemOut(**base)


@router.get("", response_model=list[MenuItemOut])
async def list_items(
    branch_id: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    available_only: bool = False,
    search: Optional[str] = None,
):
    cache_key = (
        f"menu:list:{branch_id or 'all'}:{category_id or 'all'}:"
        f"{int(available_only)}:{search or ''}"
    )

    async def build():
        items = await menu_crud.list_items_branched(
            branch_id=branch_id,
            category_id=category_id,
            available_only=available_only,
            search=search,
        )
        ratings = await menu_crud.ratings_map_for(items)
        return [
            _to_out(i, ratings.get(str(i.id))).model_dump() for i in items
        ]

    data = await cache.get_or_set(cache_key, build, ttl=60)
    return [MenuItemOut(**d) for d in data]


# ---------------------------------------------------------------------------
# IMPORTANT: literal paths must be declared BEFORE /{item_id}
# ---------------------------------------------------------------------------

@router.get("/low-stock", dependencies=[Depends(get_current_admin)])
async def list_low_stock(threshold: int = Query(5, ge=0, le=1000)):
    """
    Items whose `stock_count` is at or below the given threshold.
    Items with `stock_count=None` (unlimited) are excluded.
    """
    return await menu_crud.low_stock_items(threshold=threshold)


@router.get("/slug/{slug}", response_model=MenuItemOut)
async def get_item_by_slug(slug: str):
    cache_key = f"menu:slug:{slug}"

    async def build():
        item = await menu_crud.get_by_slug(slug)
        if not item:
            return None
        ratings = await menu_crud.ratings_map_for([item])
        return _to_out(item, ratings.get(str(item.id))).model_dump()

    data = await cache.get_or_set(cache_key, build, ttl=60)
    if not data:
        raise HTTPException(404, "Menu item not found")
    return MenuItemOut(**data)


@router.get("/{item_id}/related", response_model=list[MenuItemOut])
async def get_related(
    item_id: str,
    limit: int = Query(4, ge=1, le=12),
    branch_id: Optional[str] = Query(None),
):
    cache_key = f"menu:related:{item_id}:{limit}:{branch_id or 'all'}"

    async def build():
        item = await menu_crud.get_item(item_id)
        if not item:
            return None
        related = await menu_crud.related_items(
            item, limit=limit, branch_id=branch_id
        )
        ratings = await menu_crud.ratings_map_for(related)
        return [_to_out(i, ratings.get(str(i.id))).model_dump() for i in related]

    data = await cache.get_or_set(cache_key, build, ttl=60)
    if data is None:
        raise HTTPException(404, "Menu item not found")
    return [MenuItemOut(**d) for d in data]


@router.get("/{item_id}", response_model=MenuItemOut)
async def get_item(item_id: str):
    item = await menu_crud.get_item(item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")
    ratings = await menu_crud.ratings_map_for([item])
    return _to_out(item, ratings.get(str(item.id)))


@router.post(
    "",
    response_model=MenuItemOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
)
async def create_item(payload: MenuItemCreate):
    cat = await category_crud.get_category(payload.category_id)
    if not cat:
        raise HTTPException(400, "Invalid category_id")
    item = await menu_crud.create_item(payload.model_dump())
    await invalidate_menu()
    return _to_out(item)


@router.patch(
    "/{item_id}",
    response_model=MenuItemOut,
    dependencies=[Depends(get_current_admin)],
)
async def update_item(item_id: str, payload: MenuItemUpdate):
    item = await menu_crud.get_item(item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")
    if payload.category_id:
        cat = await category_crud.get_category(payload.category_id)
        if not cat:
            raise HTTPException(400, "Invalid category_id")
    item = await menu_crud.update_item(item, payload.model_dump(exclude_unset=True))
    await invalidate_menu()
    ratings = await menu_crud.ratings_map_for([item])
    return _to_out(item, ratings.get(str(item.id)))


@router.patch(
    "/{item_id}/stock",
    response_model=MenuItemOut,
    dependencies=[Depends(get_current_admin)],
)
async def toggle_stock(item_id: str, payload: StockToggle):
    item = await menu_crud.get_item(item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")
    item = await menu_crud.toggle_stock(item, payload.is_available)
    await invalidate_menu()
    return _to_out(item)


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin)],
)
async def delete_item(item_id: str):
    item = await menu_crud.get_item(item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")
    await menu_crud.delete_item(item)
    await invalidate_menu()