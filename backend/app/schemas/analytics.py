from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class RevenuePoint(BaseModel):
    date: str  # YYYY-MM-DD
    revenue: float
    orders: int


class TopSeller(BaseModel):
    name: str
    quantity: int
    revenue: float


class AnalyticsSummary(BaseModel):
    total_revenue: float
    total_orders: int
    paid_orders: int
    pending_orders: int
    delivered_orders: int
    cancelled_orders: int
    average_order_value: float
    range_start: datetime
    range_end: datetime


class AnalyticsOverview(BaseModel):
    summary: AnalyticsSummary
    daily: List[RevenuePoint]
    top_sellers: List[TopSeller]