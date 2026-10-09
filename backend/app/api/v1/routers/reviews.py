from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import get_current_admin
from app.crud import menu as menu_crud
from app.crud import order as order_crud
from app.crud import review as review_crud
from app.models.review import Review
from app.schemas.review import (
    ReviewCreate,
    ReviewModerateIn,
    ReviewOut,
    ReviewSummary,
)

router = APIRouter(prefix="/reviews", tags=["Reviews"])


def _to_out(r: Review) -> ReviewOut:
    return ReviewOut(
        id=str(r.id),
        order_reference=r.order_reference,
        rating=r.rating,
        comment=r.comment,
        photo_urls=r.photo_urls,
        is_published=r.is_published,
        is_featured=r.is_featured,
        created_at=r.created_at,
    )


# ---------- PUBLIC ----------

@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def submit_review(payload: ReviewCreate):
    order = await order_crud.get_order_by_reference(payload.order_reference)
    if not order:
        raise HTTPException(404, "Order not found")

    if order.customer.phone != payload.phone:
        raise HTTPException(403, "Phone does not match this order")

    eligible, msg = await review_crud.order_is_eligible_for_review(order)
    if not eligible:
        raise HTTPException(400, msg)

    item_ids = [i.item_id for i in order.items if i.item_id is not None]

    review = await review_crud.create_review({
        "order_id": order.id,
        "order_reference": order.reference,
        "customer_phone": payload.phone,
        "rating": payload.rating,
        "comment": payload.comment,
        "photo_urls": payload.photo_urls or [],
        "item_ids": item_ids,
    })
    return _to_out(review)


@router.get("/menu/{menu_item_id}")
async def menu_item_ratings(menu_item_id: str):
    from beanie import PydanticObjectId
    try:
        oid = PydanticObjectId(menu_item_id)
    except Exception:
        raise HTTPException(400, "Invalid menu item id")

    data = await review_crud.ratings_for_items([oid])
    stats = data.get(str(oid), {"average": 0.0, "count": 0})
    return {
        "menu_item_id": menu_item_id,
        "average_rating": stats["average"],
        "total_reviews": stats["count"],
    }


@router.get("/item/{menu_item_id}", response_model=list[ReviewOut])
async def reviews_for_item(
    menu_item_id: str,
    limit: int = Query(20, ge=1, le=100),
):
    """
    All published reviews that mention a specific menu item.
    Used by /menu/[slug] page.
    """
    from beanie import PydanticObjectId
    try:
        oid = PydanticObjectId(menu_item_id)
    except Exception:
        raise HTTPException(400, "Invalid menu item id")

    reviews = await review_crud.reviews_for_item(oid, limit=limit)
    return [_to_out(r) for r in reviews]


@router.get("/item-by-slug/{slug}", response_model=list[ReviewOut])
async def reviews_for_slug(
    slug: str,
    limit: int = Query(20, ge=1, le=100),
):
    """
    Convenience endpoint: given a menu slug, return reviews for that item.
    """
    item = await menu_crud.get_by_slug(slug)
    if not item:
        raise HTTPException(404, "Menu item not found")

    reviews = await review_crud.reviews_for_item(item.id, limit=limit)
    return [_to_out(r) for r in reviews]


@router.get("/recent", response_model=list[ReviewOut])
async def recent_reviews(
    featured_only: bool = False,
    limit: int = Query(20, ge=1, le=100),
):
    reviews = (
        await review_crud.list_featured(limit=limit)
        if featured_only
        else await review_crud.list_reviews(published_only=True, limit=limit)
    )
    return [_to_out(r) for r in reviews]


@router.get("/summary", response_model=ReviewSummary)
async def review_summary():
    return ReviewSummary(**await review_crud.summary())


# ---------- ADMIN ----------

@router.get(
    "",
    response_model=list[ReviewOut],
    dependencies=[Depends(get_current_admin)],
)
async def list_all(
    published_only: bool = False,
    limit: int = Query(200, ge=1, le=500),
    skip: int = Query(0, ge=0),
):
    reviews = await review_crud.list_reviews(
        published_only=published_only, limit=limit, skip=skip
    )
    return [_to_out(r) for r in reviews]


@router.patch(
    "/{review_id}",
    response_model=ReviewOut,
    dependencies=[Depends(get_current_admin)],
)
async def moderate_review(review_id: str, payload: ReviewModerateIn):
    from beanie import PydanticObjectId
    try:
        oid = PydanticObjectId(review_id)
    except Exception:
        raise HTTPException(400, "Invalid review id")

    review = await Review.get(oid)
    if not review:
        raise HTTPException(404, "Review not found")

    review = await review_crud.update_review(
        review,
        is_published=payload.is_published,
        is_featured=payload.is_featured,
    )
    return _to_out(review)


@router.delete(
    "/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin)],
)
async def delete_review(review_id: str):
    from beanie import PydanticObjectId
    try:
        oid = PydanticObjectId(review_id)
    except Exception:
        raise HTTPException(400, "Invalid review id")

    review = await Review.get(oid)
    if not review:
        raise HTTPException(404, "Review not found")
    await review_crud.delete_review(review)