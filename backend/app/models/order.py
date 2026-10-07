from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document, Indexed, PydanticObjectId
from pydantic import BaseModel, Field


class OrderStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    PREPARING = "preparing"
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
    customizations: Optional[dict] = None  # {base, proteins[], sauce, toppings[]}


class OrderCustomer(BaseModel):
    full_name: str
    email: str
    phone: str


class Order(Document):
    reference: Indexed(str, unique=True)  # type: ignore
    customer: OrderCustomer
    delivery_zone_id: Optional[PydanticObjectId] = None
    delivery_zone_name: str
    delivery_address: str
    items: List[OrderItem]
    subtotal: float
    delivery_fee: float
    total: float
    status: OrderStatus = OrderStatus.PENDING
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "orders"