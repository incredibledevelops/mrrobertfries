from fastapi import APIRouter, Depends, HTTPException, Query, status

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


def _to_out(item: MenuItem) -> MenuItemOut:
    return MenuItemOut(
        id=str(item.id),
        name=item.name,
        slug=item.slug,
        description=item.description,
        price=item.price,
        category_id=str(item.category_id),
        image_url=item.image_url,
        tags=item.tags,
        is_available=item.is_available,
        stock_count=item.stock_count,
        display_order=item.display_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=list[MenuItemOut])
async def list_items(
    category_id: str | None = Query(None),
    available_only: bool = False,
    search: str | None = None,
):
    items = await menu_crud.list_items(
        category_id=category_id, available_only=available_only, search=search
    )
    return [_to_out(i) for i in items]


@router.get("/{item_id}", response_model=MenuItemOut)
async def get_item(item_id: str):
    item = await menu_crud.get_item(item_id)
    if not item:
        raise HTTPException(404, "Menu item not found")
    return _to_out(item)


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
    return _to_out(item)


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