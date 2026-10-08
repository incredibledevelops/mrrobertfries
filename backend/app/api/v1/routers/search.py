import logging
from typing import Optional

from fastapi import APIRouter, Query

from app.crud import menu as menu_crud
from app.schemas.search import (
    SearchCategoryOut,
    SearchMenuItemOut,
    SearchResultsOut,
    SearchSuggestOut,
    SearchSuggestionItem,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=SearchResultsOut)
async def search(
    q: str = Query("", min_length=0, max_length=120),
    branch_id: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=100),
):
    logger.info("[SEARCH ROUTE] q='%s' branch='%s' limit=%d", q, branch_id, limit)

    data = await menu_crud.search_full(query=q, branch_id=branch_id, limit=limit)

    items = [SearchMenuItemOut(**i) for i in data["items"]]
    categories = [SearchCategoryOut(**c) for c in data["categories"]]
    suggestions = [SearchSuggestionItem(**s) for s in data["suggestions"]]

    logger.info(
        "[SEARCH ROUTE] returning %d items, %d categories, %d suggestions",
        len(items), len(categories), len(suggestions),
    )

    return SearchResultsOut(
        query=q,
        items=items,
        categories=categories,
        suggestions=suggestions,
        total=len(items),
    )


@router.get("/suggest", response_model=SearchSuggestOut)
async def suggest(
    q: str = Query(..., min_length=1, max_length=120),
    branch_id: Optional[str] = Query(None),
):
    data = await menu_crud.search_full(query=q, branch_id=branch_id, limit=5)
    return SearchSuggestOut(
        query=q,
        suggestions=[SearchSuggestionItem(**s) for s in data["suggestions"]],
    )


@router.get("/debug")
async def debug(q: str = Query("", min_length=0), limit: int = Query(50)):
    """
    Plain-JSON debug endpoint. No Pydantic serialization. If this works
    but /search doesn't, the bug is in the schema layer.
    """
    from app.models.menu_item import MenuItem

    all_items = await MenuItem.find().to_list()
    total = len(all_items)

    q_lower = q.strip().lower()
    matching = []
    for item in all_items:
        name = (item.name or "").lower()
        desc = (item.description or "").lower()
        if not q_lower or q_lower in name or q_lower in desc:
            matching.append({
                "name": item.name,
                "slug": item.slug,
                "price": item.price,
                "is_available": item.is_available,
            })
        if len(matching) >= limit:
            break

    return {
        "query": q,
        "total_items_in_db": total,
        "matching_count": len(matching),
        "matches": matching,
    }