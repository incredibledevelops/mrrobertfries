import logging
import re
from typing import Optional

from beanie import PydanticObjectId

from app.crud import review as review_crud
from app.models.category import Category
from app.models.menu_item import MenuItem

logger = logging.getLogger(__name__)


def slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", text).strip("-")


def _escape_regex(s: str) -> str:
    return re.escape(s)


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

    if search:
        # Push the substring filter into Mongo so we don't fetch the whole
        # collection and filter in Python. Case-insensitive regex on
        # name/description/tags.
        rx = _escape_regex(search.strip())
        query = query.find({
            "$or": [
                {"name": {"$regex": rx, "$options": "i"}},
                {"description": {"$regex": rx, "$options": "i"}},
                {"tags": {"$regex": rx, "$options": "i"}},
            ]
        })

    return await query.sort(+MenuItem.display_order).to_list()


async def search_full(
    query: str,
    branch_id: Optional[str] = None,
    limit: int = 30,
) -> dict:
    """
    Search across menu items and categories.

    Matching is done server-side (regex) so we don't pull the whole
    collection into memory. Case-insensitive. If `branch_id` is provided,
    only items available at that branch (or shared) are considered.
    """
    q = (query or "").strip()
    if not q:
        return {"items": [], "categories": [], "suggestions": []}

    rx = _escape_regex(q)

    # ---------- 1. Items ----------
    item_query = MenuItem.find({
        "$or": [
            {"name": {"$regex": rx, "$options": "i"}},
            {"description": {"$regex": rx, "$options": "i"}},
            {"tags": {"$regex": rx, "$options": "i"}},
        ]
    })

    if branch_id:
        try:
            bid = PydanticObjectId(branch_id)
            item_query = item_query.find({
                "$or": [
                    {"branch_id": bid},
                    {"branch_id": None},
                ]
            })
        except Exception:
            # Invalid branch id — fall through without branch filter.
            pass

    matched_items = await item_query.limit(limit).to_list()

    logger.debug(
        "[search] q=%r branch=%r matched_items=%d",
        q, branch_id, len(matched_items),
    )

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
    matched_cats = await Category.find({
        "$or": [
            {"name": {"$regex": rx, "$options": "i"}},
            {"slug": {"$regex": rx, "$options": "i"}},
        ]
    }).to_list()

    cats_out = [
        {
            "id": str(c.id),
            "name": c.name,
            "slug": c.slug,
            "image_url": c.image_url,
        }
        for c in matched_cats
    ]

    logger.debug(
        "[search] q=%r matched_categories=%d", q, len(cats_out),
    )

    # ---------- 3. Suggestions ----------
    suggestions = []
    for item in items_out[:5]:
        suggestions.append(
            {"text": item["name"], "kind": "item", "slug": item["slug"]}
        )
    for c in cats_out[:3]:
        suggestions.append(
            {"text": c["name"], "kind": "category", "slug": c["slug"]}
        )

    return {
        "items": items_out,
        "categories": cats_out,
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


async def related_items(
    item: MenuItem,
    limit: int = 4,
    branch_id: Optional[str] = None,
) -> list[MenuItem]:
    """
    Related items: same category, available, excluding the current item.
    Branch-aware: if `branch_id` is given, includes items shared across
    branches + items scoped to that branch.

    If the category has fewer than `limit` items, top up with recent
    available items from other categories (still branch-scoped) so we
    never return an empty section for a category with one product.
    """
    base_query: dict = {
        "_id": {"$ne": item.id},
        "category_id": item.category_id,
        "is_available": True,
    }
    if branch_id:
        try:
            bid = PydanticObjectId(branch_id)
            base_query["$or"] = [{"branch_id": bid}, {"branch_id": None}]
        except Exception:
            pass

    related = (
        await MenuItem.find(base_query)
        .sort(+MenuItem.display_order)
        .limit(limit)
        .to_list()
    )

    if len(related) >= limit:
        return related

    # Top up with other categories.
    exclude_ids = [item.id] + [r.id for r in related]
    fallback_query: dict = {
        "_id": {"$nin": exclude_ids},
        "is_available": True,
    }
    if branch_id:
        try:
            bid = PydanticObjectId(branch_id)
            fallback_query["$or"] = [{"branch_id": bid}, {"branch_id": None}]
        except Exception:
            pass

    extra = (
        await MenuItem.find(fallback_query)
        .sort(+MenuItem.display_order)
        .limit(limit - len(related))
        .to_list()
    )
    return related + extra


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