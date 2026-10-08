import re
from typing import Optional

from beanie import PydanticObjectId

from app.crud import review as review_crud
from app.models.category import Category
from app.models.menu_item import MenuItem


def slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", text).strip("-")


async def create_item(data: dict) -> MenuItem:
    if not data.get("slug"):
        data["slug"] = slugify(data["name"])
    if isinstance(data.get("category_id"), str):
        data["category_id"] = PydanticObjectId(data["category_id"])
    if isinstance(data.get("branch_id"), str):
        data["branch_id"] = PydanticObjectId(data["branch_id"])
    item = MenuItem(**data)
    await item.insert()
    return item


async def list_items(
    category_id: Optional[str] = None,
    available_only: bool = False,
    search: Optional[str] = None,
) -> list[MenuItem]:
    return await list_items_branched(
        branch_id=None,
        category_id=category_id,
        available_only=available_only,
        search=search,
    )


async def list_items_branched(
    branch_id: Optional[str] = None,
    category_id: Optional[str] = None,
    available_only: bool = False,
    search: Optional[str] = None,
) -> list[MenuItem]:
    query = MenuItem.find()

    if branch_id:
        bid = PydanticObjectId(branch_id)
        query = query.find({"$or": [{"branch_id": bid}, {"branch_id": None}]})

    if category_id:
        query = query.find(MenuItem.category_id == PydanticObjectId(category_id))

    if available_only:
        query = query.find(MenuItem.is_available == True)  # noqa: E712

    items = await query.sort(+MenuItem.display_order).to_list()

    if search:
        s = search.lower()
        items = [
            i
            for i in items
            if s in i.name.lower()
            or (i.description or "").lower().find(s) >= 0
            or any(s in t.lower() for t in (i.tags or []))
        ]
    return items


async def search_full(
    query: str,
    branch_id: Optional[str] = None,
    limit: int = 30,
) -> dict:
    """
    Search across menu items and categories.
    Simple substring matching. Case-insensitive. Ignores branch by default
    so results always come back (frontend can filter further).
    """
    q = (query or "").strip().lower()

    # Empty query → return nothing, no error
    if not q:
        return {"items": [], "categories": [], "suggestions": []}

    # ---------- 1. Items ----------
    all_items = await MenuItem.find().to_list()
    print(f"[search] query='{q}' — total items in DB: {len(all_items)}")

    matched_items: list[MenuItem] = []
    for item in all_items:
        name = (item.name or "").lower()
        desc = (item.description or "").lower()
        tags = " ".join(item.tags or []).lower()

        if q in name or q in desc or q in tags:
            matched_items.append(item)
            if len(matched_items) >= limit:
                break

    print(f"[search] query='{q}' — matched items: {len(matched_items)}")

    # Attach ratings + category names
    item_ids = [i.id for i in matched_items]
    ratings = await review_crud.ratings_for_items(item_ids) if item_ids else {}

    cat_ids = {i.category_id for i in matched_items if i.category_id}
    cat_map: dict[str, Category] = {}
    if cat_ids:
        cats = await Category.find({"_id": {"$in": list(cat_ids)}}).to_list()
        cat_map = {str(c.id): c for c in cats}

    items_out = []
    for i in matched_items:
        r = ratings.get(str(i.id), {})
        c = cat_map.get(str(i.category_id))
        items_out.append(
            {
                "id": str(i.id),
                "name": i.name,
                "slug": i.slug,
                "description": i.description,
                "price": i.price,
                "image_url": i.image_url,
                "is_available": i.is_available,
                "average_rating": r.get("average", 0.0),
                "total_reviews": r.get("count", 0),
                "category_name": c.name if c else None,
                "category_slug": c.slug if c else None,
            }
        )

    # ---------- 2. Categories ----------
    all_cats = await Category.find().to_list()
    matched_cats = []
    for c in all_cats:
        cn = (c.name or "").lower()
        cs = (c.slug or "").lower()
        if q in cn or q in cs:
            matched_cats.append(
                {
                    "id": str(c.id),
                    "name": c.name,
                    "slug": c.slug,
                    "image_url": c.image_url,
                }
            )

    print(f"[search] query='{q}' — matched categories: {len(matched_cats)}")

    # ---------- 3. Suggestions ----------
    suggestions = []
    for item in items_out[:5]:
        suggestions.append(
            {"text": item["name"], "kind": "item", "slug": item["slug"]}
        )
    for c in matched_cats[:3]:
        suggestions.append(
            {"text": c["name"], "kind": "category", "slug": c["slug"]}
        )

    return {
        "items": items_out,
        "categories": matched_cats,
        "suggestions": suggestions,
    }


async def get_item(item_id: str) -> Optional[MenuItem]:
    try:
        return await MenuItem.get(PydanticObjectId(item_id))
    except Exception:
        return None


async def get_by_slug(slug: str) -> Optional[MenuItem]:
    return await MenuItem.find_one(MenuItem.slug == slug)


async def update_item(item: MenuItem, data: dict) -> MenuItem:
    for k, v in data.items():
        if v is not None and k not in ("category_id", "branch_id"):
            setattr(item, k, v)
        elif k == "category_id" and v is not None:
            item.category_id = PydanticObjectId(v)
        elif k == "branch_id":
            item.branch_id = PydanticObjectId(v) if v else None
    await item.save()
    return item


async def delete_item(item: MenuItem) -> None:
    await item.delete()


async def toggle_stock(item: MenuItem, is_available: bool) -> MenuItem:
    item.is_available = is_available
    await item.save()
    return item


async def ratings_map_for(items: list[MenuItem]) -> dict[str, dict]:
    ids = [i.id for i in items]
    return await review_crud.ratings_for_items(ids)


async def related_items(item: MenuItem, limit: int = 4) -> list[MenuItem]:
    return (
        await MenuItem.find(
            MenuItem.category_id == item.category_id,
            MenuItem.id != item.id,
            MenuItem.is_available == True,  # noqa: E712
        )
        .sort(+MenuItem.display_order)
        .limit(limit)
        .to_list()
    )


async def low_stock_items(threshold: int = 5) -> list[dict]:
    """
    Menu items whose stock_count is at or below the given threshold.
    Items with stock_count=None (unlimited) are excluded.
    """
    items = await MenuItem.find().to_list()
    low = [
        {
            "id": str(i.id),
            "name": i.name,
            "stock_count": i.stock_count,
            "low_stock_threshold": i.low_stock_threshold,
            "is_available": i.is_available,
        }
        for i in items
        if i.stock_count is not None
        and i.stock_count <= threshold
    ]
    low.sort(key=lambda x: x["stock_count"])
    return low