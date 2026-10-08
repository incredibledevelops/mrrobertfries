from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DeliveryZoneBase(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    delivery_fee: float = Field(default=15.0, ge=0)
    estimated_minutes: Optional[int] = None
    branch_id: Optional[str] = None
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
    branch_id: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class DeliveryZoneOut(DeliveryZoneBase):
    id: str
    branch_name: Optional[str] = None     # convenience for the UI
    is_shared: bool = False               # True when branch_id is None
    created_at: datetime
    updated_at: datetime


class AssignBranchIn(BaseModel):
    """Bulk assign all orphan zones to a branch."""
    branch_id: str