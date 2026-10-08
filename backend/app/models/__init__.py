from app.models.branch import Branch
from app.models.builder_option import BuilderOption
from app.models.category import Category
from app.models.customer import Customer, SavedAddress
from app.models.delivery_zone import DeliveryZone
from app.models.idempotency import IdempotencyRecord
from app.models.loyalty import LoyaltyReason, LoyaltyTransaction
from app.models.menu_item import MenuItem
from app.models.order import (
    Order,
    OrderCustomer,
    OrderItem,
    OrderStatus,
    OrderStatusEvent,
)
from app.models.otp import OTPPurpose, OTPToken
from app.models.payment import Payment, PaymentStatus
from app.models.promo_code import DiscountType, PromoCode
from app.models.referral import Referral, ReferralStatus
from app.models.review import Review
from app.models.user import User, UserRole

ALL_DOCUMENTS = [
    User,
    Customer,
    Branch,
    Category,
    MenuItem,
    BuilderOption,
    DeliveryZone,
    PromoCode,
    Referral,
    LoyaltyTransaction,
    Order,
    Payment,
    Review,
    OTPToken,
    IdempotencyRecord,
]

__all__ = [
    "User",
    "UserRole",
    "Customer",
    "SavedAddress",
    "Branch",
    "Category",
    "MenuItem",
    "BuilderOption",
    "DeliveryZone",
    "PromoCode",
    "DiscountType",
    "Referral",
    "ReferralStatus",
    "LoyaltyTransaction",
    "LoyaltyReason",
    "Order",
    "OrderItem",
    "OrderCustomer",
    "OrderStatus",
    "OrderStatusEvent",
    "Payment",
    "PaymentStatus",
    "Review",
    "OTPToken",
    "OTPPurpose",
    "IdempotencyRecord",
    "ALL_DOCUMENTS",
]