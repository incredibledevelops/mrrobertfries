import re
from typing import Optional

from beanie import PydanticObjectId

from app.models.menu_item import MenuItem


def slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", text).strip("-")


async def create_item(data: dict) -> MenuItem:
    if not data.get("slug"):
        data["slug"] = slugify(data["name"])
    if isinstance(data.get("category_id"), str):
        data["category_id"] = PydanticObjectId(data["category_id"])
    item = MenuItem(**data)
    await item.insert()
    return item


async def list_items(
    category_id: Optional[str] = None,
    available_only: bool = False,
    search: Optional[str] = None,
) -> list[MenuItem]:
    query = MenuItem.find()
    if category_id:
        query = query.find(MenuItem.category_id == PydanticObjectId(category_id))
    if available_only:
        query = query.find(MenuItem.is_available == True)  # noqa: E712
    items = await query.sort(+MenuItem.display_order).to_list()
    if search:
        s = search.lower()
        items = [
            i for i in items if s in i.name.lower() or (i.description or "").lower().find(s) >= 0
        ]
    return items


async def get_item(item_id: str) -> Optional[MenuItem]:
    try:
        return await MenuItem.get(PydanticObjectId(item_id))
    except Exception:
        return None


async def update_item(item: MenuItem, data: dict) -> MenuItem:
    for k, v in data.items():
        if v is not None and k != "category_id":
            setattr(item, k, v)
        elif k == "category_id" and v is not None:
            item.category_id = PydanticObjectId(v)
    await item.save()
    return item


async def delete_item(item: MenuItem) -> None:
    await item.delete()


async def toggle_stock(item: MenuItem, is_available: bool) -> MenuItem:
    item.is_available = is_available
    await item.save()
    return item