from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class RevenuePoint(BaseModel):
    date: str
    revenue: float
    orders: int


class HourlyPoint(BaseModel):
    hour: int
    label: str
    orders: int
    revenue: float


class StatusCount(BaseModel):
    status: str
    label: str
    count: int


class WeeklyComparison(BaseModel):
    this_week: dict
    last_week: dict
    revenue_change_pct: Optional[float] = None
    orders_change_pct: Optional[float] = None


class TopSeller(BaseModel):
    name: str
    quantity: int
    revenue: float


class TopPromo(BaseModel):
    code: str
    times_used: int
    discount_given: float


class TopZone(BaseModel):
    zone: str
    orders: int
    revenue: float


class AnalyticsSummary(BaseModel):
    total_revenue: float
    total_orders: int
    paid_orders: int
    pending_orders: int
    delivered_orders: int
    cancelled_orders: int
    average_order_value: float
    total_promo_discount: float = 0.0
    total_loyalty_discount: float = 0.0
    total_points_redeemed: int = 0
    total_points_earned: int = 0
    range_start: datetime
    range_end: datetime


class AnalyticsOverview(BaseModel):
    summary: AnalyticsSummary
    daily: List[RevenuePoint]
    hourly: List[HourlyPoint] = []
    status_breakdown: List[StatusCount] = []
    weekly: Optional[WeeklyComparison] = None
    top_sellers: List[TopSeller]
    top_promos: List[TopPromo] = []
    top_zones: List[TopZone] = []