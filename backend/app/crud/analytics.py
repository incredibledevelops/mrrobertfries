from datetime import datetime, timedelta, timezone

from app.models.menu_item import MenuItem
from app.models.order import Order, OrderStatus


async def summary(start: datetime, end: datetime) -> dict:
    orders = await Order.find(
        Order.created_at >= start, Order.created_at <= end
    ).to_list()

    paid = [o for o in orders if o.status == OrderStatus.PAID]
    delivered = [o for o in orders if o.status == OrderStatus.DELIVERED]
    cancelled = [o for o in orders if o.status == OrderStatus.CANCELLED]
    pending = [
        o
        for o in orders
        if o.status in (OrderStatus.PENDING, OrderStatus.PREPARING,
                        OrderStatus.OUT_FOR_DELIVERY)
    ]

    revenue_orders = [
        o for o in orders if o.status in (OrderStatus.PAID, OrderStatus.PREPARING,
                                          OrderStatus.OUT_FOR_DELIVERY,
                                          OrderStatus.DELIVERED)
    ]
    total_revenue = sum(o.total for o in revenue_orders)
    count_revenue_orders = len(revenue_orders)

    return {
        "total_revenue": round(total_revenue, 2),
        "total_orders": len(orders),
        "paid_orders": len(paid) + len(delivered),
        "pending_orders": len(pending),
        "delivered_orders": len(delivered),
        "cancelled_orders": len(cancelled),
        "average_order_value": round(
            total_revenue / count_revenue_orders, 2
        ) if count_revenue_orders else 0.0,
        "range_start": start,
        "range_end": end,
    }


async def daily_series(start: datetime, end: datetime) -> list[dict]:
    orders = await Order.find(
        Order.created_at >= start, Order.created_at <= end
    ).to_list()

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
        if o.status in (OrderStatus.PAID, OrderStatus.PREPARING,
                        OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED):
            buckets[key]["revenue"] += o.total

    return [
        {
            "date": k,
            "revenue": round(v["revenue"], 2),
            "orders": v["orders"],
        }
        for k, v in sorted(buckets.items())
    ]


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
        for item in o.items:
            key = item.name
            row = tally.setdefault(
                key, {"name": key, "quantity": 0, "revenue": 0.0}
            )
            row["quantity"] += item.quantity
            row["revenue"] += item.unit_price * item.quantity

    top = sorted(tally.values(), key=lambda r: r["quantity"], reverse=True)[:limit]
    for r in top:
        r["revenue"] = round(r["revenue"], 2)
    return top


def default_range(days: int = 30) -> tuple[datetime, datetime]:
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days - 1)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, end