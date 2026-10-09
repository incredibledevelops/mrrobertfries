import re
from typing import Optional

from beanie import PydanticObjectId

from app.crud import delivery_zone as zone_crud
from app.models.branch import Branch


def slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", text).strip("-")


async def create_branch(data: dict) -> Branch:
    if not data.get("slug"):
        data["slug"] = slugify(data["name"])
    branch = Branch(**data)
    await branch.insert()
    return branch


async def get_default_branch() -> Optional[Branch]:
    default = await Branch.find_one(Branch.is_default == True)  # noqa: E712
    if default:
        return default
    return await Branch.find_one(Branch.is_active == True)  # noqa: E712


async def get_branch(branch_id: str) -> Optional[Branch]:
    try:
        return await Branch.get(PydanticObjectId(branch_id))
    except Exception:
        return None


async def get_by_slug(slug: str) -> Optional[Branch]:
    return await Branch.find_one(Branch.slug == slug)


async def list_branches(active_only: bool = False) -> list[Branch]:
    query = Branch.find()
    if active_only:
        query = query.find(Branch.is_active == True)  # noqa: E712
    return await query.sort(+Branch.display_order).to_list()


async def list_with_zone_counts() -> list[dict]:
    """
    Returns each branch with:
      - zone_count (zones assigned to this branch only)
      - shared_zone_count (zones with no branch_id, visible everywhere)

    Single pass over the zones collection (one query), then a dict lookup
    per branch — no N+1.
    """
    branches = await list_branches(active_only=False)
    counts = await zone_crud.count_for_branches()
    shared = counts.get("shared", 0)

    out = []
    for b in branches:
        out.append(
            {
                "branch": b,
                "zone_count": counts.get(str(b.id), 0),
                "shared_zone_count": shared,
            }
        )
    return out


async def update_branch(branch: Branch, data: dict) -> Branch:
    for k, v in data.items():
        if v is not None:
            setattr(branch, k, v)
    await branch.save()
    return branch


async def delete_branch(branch: Branch) -> None:
    await branch.delete()