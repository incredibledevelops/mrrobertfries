from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


class DeliveryZone(Document):
    name: str
    slug: Indexed(str, unique=True)  # type: ignore
    description: Optional[str] = None
    delivery_fee: float = Field(ge=0, default=15.0)
    estimated_minutes: Optional[int] = None

    # Branch scoping: None = shared across all branches
    branch_id: Optional[PydanticObjectId] = None

    is_active: bool = True
    display_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "delivery_zones"