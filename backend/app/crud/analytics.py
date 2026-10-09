from datetime import datetime, timedelta, timezone
from typing import Optional

from app.models.order import Order, OrderStatus


def _revenue_orders(orders: list[Order]) -> list[Order]:
    return [
        o for o in orders
        if o.status in (
            OrderStatus.PAID,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.DELIVERED,
        )
    ]


def _safe_float(v, default: float = 0.0) -> float:
    try:
        return float(v) if v is not None else default
    except (TypeError, ValueError):
        return default


def _safe_int(v, default: int = 0) -> int:
    try:
        return int(v) if v is not None else default
    except (TypeError, ValueError):
        return default


async def summary(start: datetime, end: datetime) -> dict:
    orders = await Order.find(
        Order.created_at >= start, Order.created_at <= end
    ).to_list()

    paid = [o for o in orders if o.status == OrderStatus.PAID]
    delivered = [o for o in orders if o.status == OrderStatus.DELIVERED]
    cancelled = [o for o in orders if o.status == OrderStatus.CANCELLED]
    pending = [
        o for o in orders
        if o.status in (
            OrderStatus.PENDING,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.OUT_FOR_DELIVERY,
        )
    ]

    revenue_orders = _revenue_orders(orders)
    total_revenue = sum(_safe_float(o.total) for o in revenue_orders)
    count_revenue_orders = len(revenue_orders)

    total_promo_discount = sum(
        _safe_float(o.promo_discount) for o in revenue_orders
    )
    total_loyalty_discount = sum(
        _safe_float(o.loyalty_discount) for o in revenue_orders
    )
    total_points_redeemed = sum(
        _safe_int(o.loyalty_points_redeemed) for o in revenue_orders
    )
    total_points_earned = sum(
        _safe_int(o.loyalty_points_earned) for o in revenue_orders
    )

    return {
        "total_revenue": round(total_revenue, 2),
        "total_orders": len(orders),
        "paid_orders": len(paid) + len(delivered),
        "pending_orders": len(pending),
        "delivered_orders": len(delivered),
        "cancelled_orders": len(cancelled),
        "average_order_value": (
            round(total_revenue / count_revenue_orders, 2)
            if count_revenue_orders else 0.0
        ),
        "total_promo_discount": round(total_promo_discount, 2),
        "total_loyalty_discount": round(total_loyalty_discount, 2),
        "total_points_redeemed": total_points_redeemed,
        "total_points_earned": total_points_earned,
        "range_start": start,
        "range_end": end,
    }


async def daily_series(start: datetime, end: datetime) -> list[dict]:
    orders = await Order.find(
        Order.created_at >= start, Order.created_at <= end
    ).to_list()

    revenue_ids = {str(o.id) for o in _revenue_orders(orders)}

    buckets: dict[str, dict] = {}
    cursor = start.date()
    end_date = end.date()
    while cursor <= end_date:
        key = cursor.isoformat()
        buckets[key] = {"date": key, "revenue": 0.0, "orders": 0}
        cursor = cursor + timedelta(days=1)

    for o in orders:
        key = o.created_at.date().isoformat()
        if key not in buckets:
            continue
        buckets[key]["orders"] += 1
        if str(o.id) in revenue_ids:
            buckets[key]["revenue"] += _safe_float(o.total)

    return [
        {
            "date": k,
            "revenue": round(v["revenue"], 2),
            "orders": v["orders"],
        }
        for k, v in sorted(buckets.items())
    ]


async def hourly_series(start: datetime, end: datetime) -> list[dict]:
    orders = await Order.find(
        Order.created_at >= start, Order.created_at <= end
    ).to_list()

    revenue_ids = {str(o.id) for o in _revenue_orders(orders)}

    buckets = {h: {"hour": h, "orders": 0, "revenue": 0.0} for h in range(24)}

    for o in orders:
        h = o.created_at.hour
        buckets[h]["orders"] += 1
        if str(o.id) in revenue_ids:
            buckets[h]["revenue"] += _safe_float(o.total)

    return [
        {
            "hour": h,
            "label": f"{h:02d}:00",
            "orders": buckets[h]["orders"],
            "revenue": round(buckets[h]["revenue"], 2),
        }
        for h in range(24)
    ]


async def status_breakdown(start: datetime, end: datetime) -> list[dict]:
    orders = await Order.find(
        Order.created_at >= start, Order.created_at <= end
    ).to_list()

    counts: dict[str, int] = {}
    for o in orders:
        key = (
            o.status.value
            if hasattr(o.status, "value")
            else str(o.status)
        )
        counts[key] = counts.get(key, 0) + 1

    labels = {
        "pending": "Pending",
        "paid": "Paid",
        "preparing": "Preparing",
        "ready": "Ready",
        "out_for_delivery": "Out for delivery",
        "delivered": "Delivered",
        "cancelled": "Cancelled",
        "failed": "Failed",
    }

    return [
        {
            "status": k,
            "label": labels.get(k, k.replace("_", " ").title()),
            "count": v,
        }
        for k, v in counts.items()
    ]


async def weekly_comparison() -> dict:
    now = datetime.now(timezone.utc)
    start_this = (now - timedelta(days=6)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    start_last = start_this - timedelta(days=7)
    end_last = start_this - timedelta(seconds=1)

    this_orders = await Order.find(
        Order.created_at >= start_this, Order.created_at <= now
    ).to_list()
    last_orders = await Order.find(
        Order.created_at >= start_last, Order.created_at <= end_last
    ).to_list()

    def _agg(orders):
        rev_orders = _revenue_orders(orders)
        return {
            "revenue": round(
                sum(_safe_float(o.total) for o in rev_orders), 2
            ),
            "orders": len(orders),
        }

    this_agg = _agg(this_orders)
    last_agg = _agg(last_orders)

    def _pct_change(curr: float, prev: float) -> Optional[float]:
        if not prev:
            return None
        return round(((curr - prev) / prev) * 100, 1)

    return {
        "this_week": this_agg,
        "last_week": last_agg,
        "revenue_change_pct": _pct_change(
            this_agg["revenue"], last_agg["revenue"]
        ),
        "orders_change_pct": _pct_change(
            this_agg["orders"], last_agg["orders"]
        ),
    }


async def top_sellers(
    start: datetime, end: datetime, limit: int = 5
) -> list[dict]:
    orders = await Order.find(
        Order.created_at >= start,
        Order.created_at <= end,
        Order.status != OrderStatus.CANCELLED,
    ).to_list()

    tally: dict[str, dict] = {}
    for o in orders:
        for item in (getattr(o, "items", None) or []):
            key = getattr(item, "name", "Unknown")
            row = tally.setdefault(
                key, {"name": key, "quantity": 0, "revenue": 0.0}
            )
            qty = _safe_int(getattr(item, "quantity", 0))
            price = _safe_float(getattr(item, "unit_price", 0.0))
            row["quantity"] += qty
            row["revenue"] += price * qty

    top = sorted(
        tally.values(), key=lambda r: r["quantity"], reverse=True
    )[:limit]
    for r in top:
        r["revenue"] = round(r["revenue"], 2)
    return top


async def top_promos(
    start: datetime, end: datetime, limit: int = 5
) -> list[dict]:
    # Mongo has no `$ne: null` on the doc field here in the Beanie query
    # syntax; `promo_code` is optional and its absence is semantically
    # equivalent to null. Use the raw dict form so the query is explicit.
    orders = await Order.find(
        {
            "created_at": {"$gte": start, "$lte": end},
            "promo_code": {"$exists": True, "$ne": None},
            "status": {"$ne": OrderStatus.CANCELLED.value},
        }
    ).to_list()

    tally: dict[str, dict] = {}
    for o in orders:
        code = getattr(o, "promo_code", None) or ""
        if not code:
            continue
        row = tally.setdefault(
            code, {"code": code, "times_used": 0, "discount_given": 0.0}
        )
        row["times_used"] += 1
        row["discount_given"] += _safe_float(
            getattr(o, "promo_discount", 0.0)
        )

    top = sorted(
        tally.values(), key=lambda r: r["times_used"], reverse=True
    )[:limit]
    for r in top:
        r["discount_given"] = round(r["discount_given"], 2)
    return top


async def top_zones(
    start: datetime, end: datetime, limit: int = 5
) -> list[dict]:
    orders = await Order.find(
        Order.created_at >= start,
        Order.created_at <= end,
        Order.status != OrderStatus.CANCELLED,
    ).to_list()

    revenue_ids = {str(o.id) for o in _revenue_orders(orders)}

    tally: dict[str, dict] = {}
    for o in orders:
        key = getattr(o, "delivery_zone_name", None) or "Unknown zone"
        row = tally.setdefault(
            key, {"zone": key, "orders": 0, "revenue": 0.0}
        )
        row["orders"] += 1
        if str(o.id) in revenue_ids:
            row["revenue"] += _safe_float(o.total)

    top = sorted(
        tally.values(), key=lambda r: r["orders"], reverse=True
    )[:limit]
    for r in top:
        r["revenue"] = round(r["revenue"], 2)
    return top


def default_range(days: int = 30) -> tuple[datetime, datetime]:
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days - 1)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, end