from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.order import OrderStatus


class OrderItemIn(BaseModel):
    item_id: Optional[str] = None
    name: str
    unit_price: float = Field(ge=0)
    quantity: int = Field(ge=1)
    is_custom_bowl: bool = False
    customizations: Optional[dict] = None


class OrderCustomerIn(BaseModel):
    full_name: str
    email: EmailStr
    phone: str


class OrderCreate(BaseModel):
    customer: OrderCustomerIn
    delivery_zone_id: str
    delivery_address: str
    items: List[OrderItemIn]
    notes: Optional[str] = None


class OrderItemOut(BaseModel):
    item_id: Optional[str] = None
    name: str
    unit_price: float
    quantity: int
    is_custom_bowl: bool
    customizations: Optional[dict] = None


class OrderOut(BaseModel):
    id: str
    reference: str
    customer: OrderCustomerIn
    delivery_zone_id: Optional[str] = None
    delivery_zone_name: str
    delivery_address: str
    items: List[OrderItemOut]
    subtotal: float
    delivery_fee: float
    total: float
    status: OrderStatus
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderTrackOut(BaseModel):
    reference: str
    status: OrderStatus
    total: float
    created_at: datetime
    updated_at: datetime