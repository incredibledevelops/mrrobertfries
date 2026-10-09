from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import (
    create_customer_access_token,
    create_customer_refresh_token,
    decode_token,
)
from app.core.sms import sms_otp
from app.crud import customer as customer_crud
from app.crud import otp as otp_crud
from app.models.otp import OTPPurpose
from app.schemas.otp import (
    OTPRequestIn,
    OTPRequestOut,
    OTPVerifyIn,
    OTPVerifyOut,
    RefreshRequest,
)

router = APIRouter(prefix="/customer-auth", tags=["Customer Auth"])


@router.post("/request-otp", response_model=OTPRequestOut)
@limiter.limit("3/minute")
async def request_otp(request: Request, payload: OTPRequestIn):
    phone = payload.phone.strip()
    full_name = payload.full_name.strip() or "Customer"

    # Pre-create or refresh the customer record so the name they typed is
    # persisted even before they verify. OTP creation then proceeds.
    try:
        await customer_crud.get_or_create(phone=phone, full_name=full_name)
    except Exception:
        # Name capture is best-effort; never block OTP on it.
        import logging
        logging.getLogger(__name__).exception(
            "Failed to pre-create customer for %s", phone
        )

    otp = await otp_crud.create_otp(phone, purpose=OTPPurpose.LOGIN)

    sent = await sms_otp(phone, otp.code)

    msg = (
        "Verification code sent to your phone."
        if sent or settings.ARKESEL_API_KEY
        else f"DEV MODE: your code is {otp.code}"
    )

    return OTPRequestOut(
        message=msg,
        expires_in_minutes=settings.CUSTOMER_OTP_EXPIRE_MINUTES,
    )


@router.post("/verify-otp", response_model=OTPVerifyOut)
@limiter.limit("10/minute")
async def verify_otp(request: Request, payload: OTPVerifyIn):
    phone = payload.phone.strip()

    valid, msg = await otp_crud.verify_otp(phone, payload.code)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    existing = await customer_crud.get_by_phone(phone)
    is_new = existing is None

    if is_new:
        customer = await customer_crud.get_or_create(
            phone=phone, full_name="Customer"
        )
    else:
        customer = existing

    access = create_customer_access_token(customer.phone, str(customer.id))
    refresh = create_customer_refresh_token(customer.phone, str(customer.id))

    return OTPVerifyOut(
        access_token=access,
        refresh_token=refresh,
        is_new_customer=is_new,
        customer_id=str(customer.id),
        full_name=customer.full_name,
    )


@router.post("/refresh", response_model=OTPVerifyOut)
async def refresh_token(payload: RefreshRequest):
    try:
        decoded = decode_token(payload.refresh_token)
    except ValueError:
        raise HTTPException(401, "Invalid refresh token")

    if decoded.get("type") != "customer_refresh":
        raise HTTPException(401, "Invalid token type")

    phone = decoded.get("sub")
    customer = await customer_crud.get_by_phone(phone)
    if not customer:
        raise HTTPException(401, "Customer not found")

    access = create_customer_access_token(customer.phone, str(customer.id))
    new_refresh = create_customer_refresh_token(customer.phone, str(customer.id))

    return OTPVerifyOut(
        access_token=access,
        refresh_token=new_refresh,
        is_new_customer=False,
        customer_id=str(customer.id),
        full_name=customer.full_name,
    )