from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import settings
from app.core.deps import (
    get_current_admin,
    get_current_user,
    get_current_staff_or_admin,
)
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.crud import user as user_crud
from app.models.user import User, UserRole
from app.schemas.auth import (
    ChangePasswordIn,
    LoginRequest,
    PasswordReset,
    ProfileUpdateIn,
    RefreshRequest,
    TokenResponse,
    UserCreate,
    UserOut,
    UserUpdate,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


def _to_out(u: User) -> UserOut:
    return UserOut(
        id=str(u.id),
        full_name=u.full_name,
        email=u.email,
        phone=u.phone,
        role=u.role,
        is_active=u.is_active,
        branch_id=str(u.branch_id) if getattr(u, "branch_id", None) else None,
        vehicle=getattr(u, "vehicle", None),
        plate_number=getattr(u, "plate_number", None),
        created_at=u.created_at.isoformat() if getattr(u, "created_at", None) else None,
    )


def _to_token_response(user: User) -> TokenResponse:
    access = create_access_token(
        str(user.id), extra={"role": user.role.value, "email": user.email}
    )
    refresh = create_refresh_token(str(user.id))
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ---------- Login / refresh / me ----------

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, payload: LoginRequest):
    user = await user_crud.get_by_email(payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled"
        )
    return _to_token_response(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest):
    try:
        decoded = decode_token(payload.refresh_token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
        )
    user = await user_crud.get_by_id(decoded.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return _to_token_response(user)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return _to_out(current_user)


# ---------- Own profile ----------

@router.patch("/me", response_model=UserOut)
async def update_my_profile(
    payload: ProfileUpdateIn,
    current_user: User = Depends(get_current_user),
):
    user = await user_crud.update_profile(
        current_user, payload.full_name, payload.phone
    )
    return _to_out(user)


@router.post("/me/change-password")
async def change_my_password(
    payload: ChangePasswordIn,
    current_user: User = Depends(get_current_user),
):
    ok, msg = await user_crud.change_password(
        current_user, payload.current_password, payload.new_password
    )
    if not ok:
        raise HTTPException(400, msg)
    return {"message": "Password changed successfully"}


# ---------- Admin: user management ----------

@router.get(
    "/users",
    response_model=list[UserOut],
    dependencies=[Depends(get_current_admin)],
)
async def list_users(
    role: UserRole | None = None,
    branch_id: str | None = None,
    search: str | None = None,
):
    users = await user_crud.list_users(role=role, branch_id=branch_id, search=search)
    return [_to_out(u) for u in users]


@router.post(
    "/users",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
)
async def create_user(payload: UserCreate):
    existing = await user_crud.get_by_email(payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = await user_crud.create_user(
        full_name=payload.full_name,
        email=payload.email,
        password=payload.password,
        phone=payload.phone,
        role=payload.role,
        branch_id=payload.branch_id,
        vehicle=payload.vehicle,
        plate_number=payload.plate_number,
    )
    return _to_out(user)


@router.get(
    "/users/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(get_current_admin)],
)
async def get_user(user_id: str):
    user = await user_crud.get_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return _to_out(user)


@router.patch(
    "/users/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(get_current_admin)],
)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: User = Depends(get_current_admin),
):
    user = await user_crud.get_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found")

    if user.id == current_user.id and payload.role and payload.role != user.role:
        raise HTTPException(400, "You cannot change your own role")

    if user.id == current_user.id and payload.is_active is False:
        raise HTTPException(400, "You cannot deactivate yourself")

    user = await user_crud.update_user(user, payload.model_dump(exclude_unset=True))
    return _to_out(user)


@router.post(
    "/users/{user_id}/reset-password",
    dependencies=[Depends(get_current_admin)],
)
async def reset_password(user_id: str, payload: PasswordReset):
    user = await user_crud.get_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    await user_crud.reset_password(user, payload.new_password)
    return {"message": "Password reset successfully"}


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_admin),
):
    if user_id == str(current_user.id):
        raise HTTPException(400, "You cannot delete yourself")
    user = await user_crud.get_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    await user_crud.delete_user(user)