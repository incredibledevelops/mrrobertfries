from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document, Indexed, PydanticObjectId
from pydantic import BaseModel, Field


class OrderStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    PREPARING = "preparing"
    READY = "ready"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    FAILED = "failed"


class OrderItem(BaseModel):
    item_id: Optional[PydanticObjectId] = None
    name: str
    unit_price: float
    quantity: int = Field(ge=1)
    is_custom_bowl: bool = False
    customizations: Optional[dict] = None


class OrderCustomer(BaseModel):
    full_name: str
    email: str
    phone: str


class OrderStatusEvent(BaseModel):
    status: OrderStatus
    at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    by: Optional[str] = None
    note: Optional[str] = None


class Order(Document):
    reference: Indexed(str, unique=True)  # type: ignore
    branch_id: Optional[PydanticObjectId] = None   # NEW

    customer: OrderCustomer
    delivery_zone_id: Optional[PydanticObjectId] = None
    delivery_zone_name: str
    delivery_address: str
    items: List[OrderItem]

    subtotal: float
    delivery_fee: float

    promo_code: Optional[str] = None
    promo_discount: float = 0.0

    loyalty_points_redeemed: int = 0
    loyalty_discount: float = 0.0
    loyalty_points_earned: int = 0

    # Referral
    referral_code: Optional[str] = None
    referral_discount: float = 0.0

    total: float

    status: OrderStatus = OrderStatus.PENDING
    status_history: List[OrderStatusEvent] = Field(default_factory=list)

    rider_id: Optional[PydanticObjectId] = None
    rider_name: Optional[str] = None
    rider_phone: Optional[str] = None
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

    payment_reference: Optional[str] = None
    notes: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "orders"
        indexes = ["reference", "promo_code", "status"]