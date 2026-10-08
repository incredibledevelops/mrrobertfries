from datetime import datetime, timezone
from typing import List, Optional

from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


class Review(Document):
    order_id: Indexed(PydanticObjectId)  # type: ignore
    order_reference: Indexed(str)  # type: ignore
    customer_phone: Indexed(str)  # type: ignore

    # Overall order rating
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None

    # Per-item feedback (optional)
    item_ids: List[PydanticObjectId] = Field(default_factory=list)

    # Photos
    photo_urls: List[str] = Field(default_factory=list)

    # Moderation
    is_published: bool = True
    is_featured: bool = False

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "reviews"
        indexes = ["order_reference", "customer_phone"]