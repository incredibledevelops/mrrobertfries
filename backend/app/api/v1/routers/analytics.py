from fastapi import APIRouter, Depends, Query

from app.core.deps import get_current_admin
from app.crud import analytics as analytics_crud
from app.crud import review as review_crud
from app.schemas.analytics import (
    AnalyticsOverview,
    AnalyticsSummary,
    HourlyPoint,
    RevenuePoint,
    StatusCount,
    TopPromo,
    TopSeller,
    TopZone,
    WeeklyComparison,
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
    hourly = await analytics_crud.hourly_series(start, end)
    status_breakdown = await analytics_crud.status_breakdown(start, end)
    weekly = await analytics_crud.weekly_comparison()
    top = await analytics_crud.top_sellers(start, end, limit=5)
    promos = await analytics_crud.top_promos(start, end, limit=5)
    zones = await analytics_crud.top_zones(start, end, limit=5)

    return AnalyticsOverview(
        summary=AnalyticsSummary(**summary),
        daily=[RevenuePoint(**d) for d in daily],
        hourly=[HourlyPoint(**h) for h in hourly],
        status_breakdown=[StatusCount(**s) for s in status_breakdown],
        weekly=WeeklyComparison(**weekly) if weekly else None,
        top_sellers=[TopSeller(**t) for t in top],
        top_promos=[TopPromo(**p) for p in promos],
        top_zones=[TopZone(**z) for z in zones],
    )


@router.get("/daily", response_model=list[RevenuePoint])
async def daily(days: int = Query(30, ge=1, le=365)):
    start, end = analytics_crud.default_range(days=days)
    return [RevenuePoint(**d) for d in await analytics_crud.daily_series(start, end)]


@router.get("/hourly", response_model=list[HourlyPoint])
async def hourly(days: int = Query(30, ge=1, le=365)):
    start, end = analytics_crud.default_range(days=days)
    return [HourlyPoint(**h) for h in await analytics_crud.hourly_series(start, end)]


@router.get("/status-breakdown", response_model=list[StatusCount])
async def status_breakdown(days: int = Query(30, ge=1, le=365)):
    start, end = analytics_crud.default_range(days=days)
    return [StatusCount(**s) for s in await analytics_crud.status_breakdown(start, end)]


@router.get("/weekly", response_model=WeeklyComparison)
async def weekly():
    return WeeklyComparison(**await analytics_crud.weekly_comparison())


@router.get("/top-sellers", response_model=list[TopSeller])
async def top_sellers(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(5, ge=1, le=50),
):
    start, end = analytics_crud.default_range(days=days)
    return [TopSeller(**t) for t in await analytics_crud.top_sellers(start, end, limit)]


@router.get("/top-promos", response_model=list[TopPromo])
async def top_promos(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(5, ge=1, le=50),
):
    start, end = analytics_crud.default_range(days=days)
    return [TopPromo(**p) for p in await analytics_crud.top_promos(start, end, limit)]


@router.get("/top-zones", response_model=list[TopZone])
async def top_zones(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(5, ge=1, le=50),
):
    start, end = analytics_crud.default_range(days=days)
    return [TopZone(**z) for z in await analytics_crud.top_zones(start, end, limit)]


@router.get("/reviews")
async def reviews_overview():
    return await review_crud.summary()


# ---------- DEBUG — no auth issues possible (still behind admin) ----------

@router.get("/debug")
async def debug_overview(days: int = Query(30, ge=1, le=365)):
    """
    Runs every analytics function and reports which ones succeed or fail.
    Use this to pinpoint what's crashing the /overview endpoint.
    """
    start, end = analytics_crud.default_range(days=days)
    results = {
        "range": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "days": days,
        },
    }

    async def try_step(name, coro_factory):
        try:
            value = await coro_factory()
            sample = value if not isinstance(value, list) else value[:2]
            results[name] = {"ok": True, "sample": sample}
        except Exception as exc:
            results[name] = {
                "ok": False,
                "error": f"{type(exc).__name__}: {exc}",
            }

    await try_step("summary", lambda: analytics_crud.summary(start, end))
    await try_step("daily", lambda: analytics_crud.daily_series(start, end))
    await try_step("hourly", lambda: analytics_crud.hourly_series(start, end))
    await try_step("status_breakdown", lambda: analytics_crud.status_breakdown(start, end))
    await try_step("weekly", lambda: analytics_crud.weekly_comparison())
    await try_step("top_sellers", lambda: analytics_crud.top_sellers(start, end))
    await try_step("top_promos", lambda: analytics_crud.top_promos(start, end))
    await try_step("top_zones", lambda: analytics_crud.top_zones(start, end))

    return results