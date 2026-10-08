from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class DiscountType(str, Enum):
    PERCENT = "percent"       # % off subtotal
    FIXED = "fixed"           # fixed GH₵ off
    FREE_DELIVERY = "free_delivery"   # waives delivery fee


class PromoCode(Document):
    code: Indexed(str, unique=True)  # type: ignore — stored uppercase
    description: Optional[str] = None

    discount_type: DiscountType
    discount_value: float = Field(ge=0, default=0.0)  # ignored for FREE_DELIVERY

    min_order_total: float = Field(ge=0, default=0.0)
    max_discount: Optional[float] = None  # cap for PERCENT codes

    # Usage limits
    usage_limit: Optional[int] = None       # None = unlimited total
    per_customer_limit: int = 1             # how many times one phone can use it
    times_used: int = 0

    # Validity window
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None

    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "promo_codes"
        indexes = ["code"]