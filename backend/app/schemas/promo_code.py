from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.promo_code import DiscountType


class PromoCodeBase(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: DiscountType
    discount_value: float = Field(default=0.0, ge=0)
    min_order_total: float = Field(default=0.0, ge=0)
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    per_customer_limit: int = 1
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True


class PromoCodeCreate(PromoCodeBase):
    pass


class PromoCodeUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    discount_value: Optional[float] = None
    min_order_total: Optional[float] = None
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    per_customer_limit: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None


class PromoCodeOut(PromoCodeBase):
    id: str
    times_used: int
    created_at: datetime
    updated_at: datetime


class PromoValidateRequest(BaseModel):
    code: str
    phone: Optional[str] = None       # optional, for per-customer limit checks
    subtotal: float = Field(ge=0)     # required to compute the discount


class PromoValidateOut(BaseModel):
    valid: bool
    code: str
    discount_amount: float = 0.0
    message: str
    discount_type: Optional[DiscountType] = None