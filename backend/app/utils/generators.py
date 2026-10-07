import random
from datetime import datetime, timezone


def generate_order_reference() -> str:
    """Human-readable order ref e.g. MRF-20261007-8942"""
    now = datetime.now(timezone.utc)
    suffix = random.randint(1000, 9999)
    return f"MRF-{now.strftime('%Y%m%d')}-{suffix}"


def generate_payment_reference(order_reference: str) -> str:
    return f"{order_reference}-PAY"