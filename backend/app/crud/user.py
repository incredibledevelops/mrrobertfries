from typing import Optional

from beanie import PydanticObjectId

from app.core.security import hash_password
from app.models.user import User, UserRole


async def get_by_email(email: str) -> Optional[User]:
    return await User.find_one(User.email == email.lower())


async def get_by_id(user_id: str) -> Optional[User]:
    try:
        return await User.get(PydanticObjectId(user_id))
    except Exception:
        return None


async def create_user(
    full_name: str,
    email: str,
    password: str,
    phone: Optional[str] = None,
    role: UserRole = UserRole.STAFF,
) -> User:
    user = User(
        full_name=full_name,
        email=email.lower(),
        phone=phone,
        hashed_password=hash_password(password),
        role=role,
    )
    await user.insert()
    return user


async def list_users() -> list[User]:
    return await User.find_all().to_list()