from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DeliveryZoneBase(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    delivery_fee: float = Field(default=15.0, ge=0)
    estimated_minutes: Optional[int] = None
    is_active: bool = True
    display_order: int = 0


class DeliveryZoneCreate(DeliveryZoneBase):
    pass


class DeliveryZoneUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    delivery_fee: Optional[float] = None
    estimated_minutes: Optional[int] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class DeliveryZoneOut(DeliveryZoneBase):
    id: str
    created_at: datetime
    updated_at: datetime