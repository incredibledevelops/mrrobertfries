from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class Branch(Document):
    name: str
    slug: Indexed(str, unique=True)  # type: ignore
    description: Optional[str] = None

    # Contact
    phone: Optional[str] = None
    email: Optional[str] = None

    # Location
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Operating
    opening_hours: Optional[str] = None   # e.g. "11:00-23:00"
    is_active: bool = True
    is_default: bool = False
    display_order: int = 0

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "branches"
        indexes = ["slug"]