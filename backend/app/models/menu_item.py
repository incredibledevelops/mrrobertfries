from datetime import datetime, timezone
from typing import List, Optional

from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


class MenuItem(Document):
    name: str
    slug: Indexed(str, unique=True)  # type: ignore
    description: Optional[str] = None
    price: float = Field(ge=0)
    category_id: PydanticObjectId
    image_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)  # e.g. ["loaded", "chicken"]
    is_available: bool = True
    stock_count: Optional[int] = None
    display_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "menu_items"