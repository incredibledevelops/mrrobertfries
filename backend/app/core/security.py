from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def _create_token(
    subject: str,
    expires_delta: timedelta,
    token_type: str,
    extra: Optional[Dict[str, Any]] = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "type": token_type,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ---------- Staff ----------

def create_access_token(
    subject: str, extra: Optional[Dict[str, Any]] = None
) -> str:
    return _create_token(
        subject,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "access",
        extra,
    )


def create_refresh_token(subject: str) -> str:
    return _create_token(
        subject,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "refresh",
    )


# ---------- Customer ----------

def create_customer_access_token(
    phone: str, customer_id: str, extra: Optional[Dict[str, Any]] = None
) -> str:
    payload = {"phone": phone, "cid": customer_id}
    if extra:
        payload.update(extra)
    return _create_token(
        subject=phone,
        expires_delta=timedelta(days=settings.CUSTOMER_TOKEN_EXPIRE_DAYS),
        token_type="customer_access",
        extra=payload,
    )


def create_customer_refresh_token(phone: str, customer_id: str) -> str:
    return _create_token(
        subject=phone,
        expires_delta=timedelta(days=settings.CUSTOMER_REFRESH_EXPIRE_DAYS),
        token_type="customer_refresh",
        extra={"cid": customer_id},
    )


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError as exc:
        raise ValueError(f"Invalid token: {exc}") from exc