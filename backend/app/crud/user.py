from typing import Optional

from beanie import PydanticObjectId

from app.core.security import hash_password, verify_password
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
    branch_id: Optional[str] = None,
    vehicle: Optional[str] = None,
    plate_number: Optional[str] = None,
) -> User:
    user = User(
        full_name=full_name,
        email=email.lower(),
        phone=phone,
        hashed_password=hash_password(password),
        role=role,
        branch_id=PydanticObjectId(branch_id) if branch_id else None,
        vehicle=vehicle,
        plate_number=plate_number,
    )
    await user.insert()
    return user


async def list_users(
    role: Optional[UserRole] = None,
    branch_id: Optional[str] = None,
    search: Optional[str] = None,
) -> list[User]:
    query = User.find()

    if role:
        query = query.find(User.role == role)

    if branch_id:
        query = query.find(User.branch_id == PydanticObjectId(branch_id))

    if search:
        import re
        rx = re.escape(search.strip())
        query = query.find({
            "$or": [
                {"full_name": {"$regex": rx, "$options": "i"}},
                {"email": {"$regex": rx, "$options": "i"}},
                {"phone": {"$regex": rx, "$options": "i"}},
            ]
        })

    return await query.sort(+User.created_at).to_list()


async def update_user(user: User, data: dict) -> User:
    for k, v in data.items():
        if k == "branch_id":
            user.branch_id = PydanticObjectId(v) if v else None
        elif k == "password":
            user.hashed_password = hash_password(v)
        elif hasattr(user, k) and v is not None:
            setattr(user, k, v)
    await user.save()
    return user


async def delete_user(user: User) -> None:
    await user.delete()


async def change_password(
    user: User, current_password: str, new_password: str
) -> tuple[bool, str]:
    if not verify_password(current_password, user.hashed_password):
        return False, "Current password is incorrect"
    if len(new_password) < 6:
        return False, "New password must be at least 6 characters"
    user.hashed_password = hash_password(new_password)
    await user.save()
    return True, ""


async def reset_password(user: User, new_password: str) -> None:
    user.hashed_password = hash_password(new_password)
    await user.save()


async def update_profile(
    user: User, full_name: Optional[str], phone: Optional[str]
) -> User:
    if full_name:
        user.full_name = full_name.strip()
    if phone is not None:
        user.phone = phone.strip() or None
    await user.save()
    return user