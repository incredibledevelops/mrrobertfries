from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # App
    APP_NAME: str = "Mr. Robert's Fries API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    FRONTEND_URL: str = "http://localhost:3000"
    SITE_URL: str = "http://localhost:3000"   # NEW

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "mr_roberts_fries"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 60

    # JWT
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CUSTOMER_TOKEN_EXPIRE_DAYS: int = 30
    CUSTOMER_REFRESH_EXPIRE_DAYS: int = 90
    CUSTOMER_OTP_EXPIRE_MINUTES: int = 10

    # Paystack
    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""
    PAYSTACK_BASE_URL: str = "https://api.paystack.co"
    PAYSTACK_CALLBACK_URL: str = "http://localhost:3000/order/callback"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"

    # Uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 5
    ALLOWED_IMAGE_TYPES: str = "image/jpeg,image/png,image/webp"

    # Business
    DEFAULT_DELIVERY_FEE: float = 15.00
    CURRENCY: str = "GHS"

    # Free delivery: any subtotal >= this amount gets GH₵ 0 delivery fee.
    # Set to 0 to disable the rule entirely.
    FREE_DELIVERY_THRESHOLD: float = 100.0

    # Email
    RESEND_API_KEY: str = ""
    MAIL_FROM: str = "Mr. Robert's Fries <onboarding@resend.dev>"
    MAIL_FROM_NAME: str = "Mr. Robert's Fries"

    # SMS
    ARKESEL_API_KEY: str = ""
    ARKESEL_SENDER_ID: str = "MrRobertsF"   # ≤ 11 chars (Ghana SMS gateway limit)
    ARKESEL_BASE_URL: str = "https://sms.arkesel.com/api/v2"

    # Loyalty
    LOYALTY_POINTS_PER_CEDI: int = 1
    LOYALTY_POINTS_TO_CEDI: float = 0.01
    LOYALTY_MIN_REDEEM: int = 100

    # Idempotency records are removed after this many hours by the Mongo TTL
    # index (see models/idempotency.py). 24h covers all realistic retries.
    IDEMPOTENCY_TTL_HOURS: int = 24

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_image_types_list(self) -> List[str]:
        return [t.strip() for t in self.ALLOWED_IMAGE_TYPES.split(",") if t.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()