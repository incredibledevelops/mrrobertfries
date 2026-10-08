from typing import Any, Optional

from beanie import PydanticObjectId
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.core.security import decode_token
from app.crud import customer as customer_crud
from app.models.customer import Customer
from app.models.idempotency import IdempotencyRecord
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login"
)

oauth2_customer_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/customer-auth/request-otp"
)


# ---------- Idempotency ----------

async def get_idempotency_key(
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
) -> Optional[str]:
    """Optional header. Client sends a UUID; server caches the response."""
    return x_idempotency_key


async def check_idempotency(
    key: Optional[str], endpoint: str
) -> Optional[dict[str, Any]]:
    """Return a previously stored response body if this key was used before."""
    if not key:
        return None
    record = await IdempotencyRecord.find_one(
        IdempotencyRecord.key == key,
        IdempotencyRecord.endpoint == endpoint,
    )
    if record and record.response_body:
        return record.response_body
    return None


async def store_idempotency(
    key: Optional[str],
    endpoint: str,
    body: dict[str, Any],
    status_code: int = 200,
) -> None:
    if not key:
        return
    try:
        existing = await IdempotencyRecord.find_one(
            IdempotencyRecord.key == key,
            IdempotencyRecord.endpoint == endpoint,
        )
        if existing:
            return
        record = IdempotencyRecord(
            key=key,
            endpoint=endpoint,
            response_status=status_code,
            response_body=body,
        )
        await record.insert()
    except Exception:
        import logging
        logging.getLogger(__name__).exception("idempotency store failed")


# ---------- Staff auth ----------

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
    except ValueError:
        raise credentials_exc

    if payload.get("type") != "access":
        raise credentials_exc

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise credentials_exc

    try:
        user = await User.get(PydanticObjectId(user_id))
    except Exception:
        raise credentials_exc

    if not user or not user.is_active:
        raise credentials_exc
    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def get_current_staff_or_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in (UserRole.ADMIN, UserRole.STAFF):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or admin access required",
        )
    return current_user


async def get_current_kitchen(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in (UserRole.KITCHEN, UserRole.ADMIN, UserRole.STAFF):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kitchen access required",
        )
    return current_user


async def get_current_rider(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.RIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rider access required",
        )
    return current_user


async def get_current_rider_or_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in (UserRole.RIDER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rider or admin access required",
        )
    return current_user


def branch_scope_id(user: User) -> Optional[PydanticObjectId]:
    if user.role == UserRole.ADMIN:
        return None
    return user.branch_id


# ---------- Customer auth ----------

async def get_current_customer(
    token: str = Depends(oauth2_customer_scheme),
) -> Customer:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate customer credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
    except ValueError:
        raise credentials_exc

    if payload.get("type") != "customer_access":
        raise credentials_exc

    phone: Optional[str] = payload.get("sub")
    if not phone:
        raise credentials_exc

    customer = await customer_crud.get_by_phone(phone)
    if not customer:
        raise credentials_exc
    return customer


async def get_optional_customer(
    token: Optional[str] = Depends(
        OAuth2PasswordBearer(
            tokenUrl=f"{settings.API_V1_PREFIX}/customer-auth/request-otp",
            auto_error=False,
        )
    ),
) -> Optional[Customer]:
    if not token:
        return None
    try:
        payload = decode_token(token)
    except ValueError:
        return None
    if payload.get("type") != "customer_access":
        return None
    phone = payload.get("sub")
    if not phone:
        return None
    return await customer_crud.get_by_phone(phone)