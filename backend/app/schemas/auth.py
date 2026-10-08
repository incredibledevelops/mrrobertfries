from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    phone: Optional[str] = None
    role: UserRole = UserRole.STAFF
    branch_id: Optional[str] = None
    vehicle: Optional[str] = None
    plate_number: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    branch_id: Optional[str] = None
    vehicle: Optional[str] = None
    plate_number: Optional[str] = None
    is_active: Optional[bool] = None


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=6, max_length=128)


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)


class ProfileUpdateIn(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserOut(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    branch_id: Optional[str] = None
    vehicle: Optional[str] = None
    plate_number: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True