from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    order_reference: str
    phone: str                          # to verify the caller owns the order
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    photo_urls: List[str] = []


class ReviewOut(BaseModel):
    id: str
    order_reference: str
    rating: int
    comment: Optional[str] = None
    photo_urls: List[str] = []
    is_published: bool
    is_featured: bool
    created_at: datetime


class ReviewSummary(BaseModel):
    average_rating: float
    total_reviews: int
    rating_breakdown: dict  # {"5": 12, "4": 3, ...}


class MenuItemRatingOut(BaseModel):
    menu_item_id: str
    average_rating: float
    total_reviews: int