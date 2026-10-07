from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class MenuItemBase(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    price: float = Field(ge=0)
    category_id: str
    image_url: Optional[str] = None
    tags: List[str] = []
    is_available: bool = True
    stock_count: Optional[int] = None
    display_order: int = 0


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    tags: Optional[List[str]] = None
    is_available: Optional[bool] = None
    stock_count: Optional[int] = None
    display_order: Optional[int] = None


class MenuItemOut(MenuItemBase):
    id: str
    created_at: datetime
    updated_at: datetime


class StockToggle(BaseModel):
    is_available: bool