from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.core.deps import get_current_admin
from app.crud import analytics as analytics_crud
from app.schemas.analytics import (
    AnalyticsOverview,
    AnalyticsSummary,
    RevenuePoint,
    TopSeller,
)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/overview", response_model=AnalyticsOverview)
async def overview(days: int = Query(30, ge=1, le=365)):
    start, end = analytics_crud.default_range(days=days)
    summary = await analytics_crud.summary(start, end)
    daily = await analytics_crud.daily_series(start, end)
    top = await analytics_crud.top_sellers(start, end, limit=5)

    return AnalyticsOverview(
        summary=AnalyticsSummary(**summary),
        daily=[RevenuePoint(**d) for d in daily],
        top_sellers=[TopSeller(**t) for t in top],
    )


@router.get("/daily", response_model=list[RevenuePoint])
async def daily(days: int = Query(30, ge=1, le=365)):
    start, end = analytics_crud.default_range(days=days)
    data = await analytics_crud.daily_series(start, end)
    return [RevenuePoint(**d) for d in data]


@router.get("/top-sellers", response_model=list[TopSeller])
async def top_sellers(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(5, ge=1, le=50),
):
    start, end = analytics_crud.default_range(days=days)
    data = await analytics_crud.top_sellers(start, end, limit=limit)
    return [TopSeller(**t) for t in data]