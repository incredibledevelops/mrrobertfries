from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.order import OrderStatus, OrderStatusEvent


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
    promo_code: Optional[str] = None
    redeem_points: Optional[int] = None
    branch_id: Optional[str] = None       # NEW


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
    branch_id: Optional[str] = None
    customer: OrderCustomerIn
    delivery_zone_id: Optional[str] = None
    delivery_zone_name: str
    delivery_address: str
    items: List[OrderItemOut]

    subtotal: float
    delivery_fee: float
    promo_code: Optional[str] = None
    promo_discount: float = 0.0
    loyalty_points_redeemed: int = 0
    loyalty_discount: float = 0.0
    total: float

    status: OrderStatus
    status_history: List[OrderStatusEvent] = []

    rider_id: Optional[str] = None
    rider_name: Optional[str] = None
    rider_phone: Optional[str] = None
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    note: Optional[str] = None


class OrderAssignRider(BaseModel):
    rider_id: str


class OrderTrackOut(BaseModel):
    reference: str
    status: OrderStatus
    subtotal: float
    promo_discount: float = 0.0
    loyalty_discount: float = 0.0
    total: float
    rider_name: Optional[str] = None
    rider_phone: Optional[str] = None
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    status_history: List[OrderStatusEvent] = []
    created_at: datetime
    updated_at: datetime


class KitchenOrderOut(BaseModel):
    id: str
    reference: str
    customer_name: str
    delivery_zone_name: str
    items: List[OrderItemOut]
    notes: Optional[str] = None
    status: OrderStatus
    created_at: datetime
    updated_at: datetime
    minutes_since_created: int
    minutes_in_current_status: int


class KitchenFeedOut(BaseModel):
    new: List[KitchenOrderOut]
    preparing: List[KitchenOrderOut]
    ready: List[KitchenOrderOut]
    out_for_delivery: List[KitchenOrderOut]


class RiderOrderOut(BaseModel):
    id: str
    reference: str
    customer_name: str
    customer_phone: str
    delivery_address: str
    delivery_zone_name: str
    items_count: int
    total: float
    status: OrderStatus
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime


class RiderAssignableOut(BaseModel):
    id: str
    reference: str
    delivery_zone_name: str
    items_count: int
    total: float
    status: OrderStatus
    created_at: datetime