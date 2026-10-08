from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from beanie import Document, Indexed, PydanticObjectId
from pydantic import EmailStr, Field


class UserRole(str, Enum):
    ADMIN = "admin"
    STAFF = "staff"
    KITCHEN = "kitchen"
    RIDER = "rider"


class User(Document):
    full_name: str
    email: Indexed(EmailStr, unique=True)  # type: ignore
    phone: Optional[str] = None
    hashed_password: str
    role: UserRole = UserRole.STAFF
    is_active: bool = True

    # Branch scoping (None = all branches, e.g. owner/admin)
    branch_id: Optional[PydanticObjectId] = None

    # Rider-specific
    vehicle: Optional[str] = None
    plate_number: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
        indexes = ["email"]