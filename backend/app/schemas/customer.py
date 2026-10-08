from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- Auth/profile ----------

class CustomerProfileOut(BaseModel):
    id: str
    phone: str
    full_name: str
    email: Optional[EmailStr] = None
    loyalty_points: int = 0
    lifetime_points_earned: int = 0
    lifetime_points_redeemed: int = 0
    total_orders: int = 0
    total_spent: float = 0.0
    referral_code: Optional[str] = None
    created_at: datetime


class CustomerUpdateIn(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


# ---------- Addresses ----------

class SavedAddressOut(BaseModel):
    index: int = 0
    label: str = "Home"
    zone_id: Optional[str] = None
    zone_name: str = ""
    address: str = ""
    is_default: bool = False


class SavedAddressIn(BaseModel):
    label: str = "Home"
    zone_id: Optional[str] = None
    zone_name: str
    address: str
    is_default: bool = False


class SavedAddressUpdateIn(BaseModel):
    label: Optional[str] = None
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    address: Optional[str] = None
    is_default: Optional[bool] = None


# ---------- Orders ----------

class CustomerOrderItemOut(BaseModel):
    name: str
    quantity: int = 1
    unit_price: float = 0.0


class CustomerOrderOut(BaseModel):
    id: str
    reference: str
    status: str = "pending"
    subtotal: float = 0.0
    delivery_fee: float = 0.0
    total: float = 0.0
    delivery_zone_name: str = ""
    delivery_address: str = ""
    items: List[CustomerOrderItemOut] = Field(default_factory=list)
    created_at: datetime


class CustomerOrderStats(BaseModel):
    total_orders: int = 0
    completed_orders: int = 0
    total_spent: float = 0.0


# ---------- Favorites ----------

class FavoriteItemOut(BaseModel):
    id: str
    name: str
    slug: str
    price: float = 0.0
    image_url: Optional[str] = None
    is_available: bool = True
    average_rating: float = 0.0
    total_reviews: int = 0


class FavoriteToggleOut(BaseModel):
    is_favorite: bool
    message: str