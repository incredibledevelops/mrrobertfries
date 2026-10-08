import re
from typing import Optional

from beanie import PydanticObjectId

from app.models.delivery_zone import DeliveryZone


def slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", text).strip("-")


async def create_zone(data: dict) -> DeliveryZone:
    if not data.get("slug"):
        data["slug"] = slugify(data["name"])
    if isinstance(data.get("branch_id"), str):
        data["branch_id"] = PydanticObjectId(data["branch_id"])
    zone = DeliveryZone(**data)
    await zone.insert()
    return zone


async def list_zones(
    active_only: bool = False,
    branch_id: Optional[str] = None,
    include_shared: bool = True,
) -> list[DeliveryZone]:
    """
    If branch_id is given:
      - include_shared=True (default) → returns zones for that branch + zones with branch_id=None
      - include_shared=False → returns ONLY zones whose branch_id matches
    """
    query = DeliveryZone.find()

    if branch_id:
        bid = PydanticObjectId(branch_id)
        if include_shared:
            query = query.find({"$or": [{"branch_id": bid}, {"branch_id": None}]})
        else:
            query = query.find(DeliveryZone.branch_id == bid)

    if active_only:
        query = query.find(DeliveryZone.is_active == True)  # noqa: E712

    return await query.sort(+DeliveryZone.display_order).to_list()


async def list_orphans() -> list[DeliveryZone]:
    """Zones with no branch_id (they show up in every branch)."""
    return await DeliveryZone.find(DeliveryZone.branch_id == None).to_list()  # noqa: E711


async def count_for_branch(branch_id: str) -> int:
    try:
        bid = PydanticObjectId(branch_id)
    except Exception:
        return 0
    return await DeliveryZone.find(DeliveryZone.branch_id == bid).count()


async def get_zone(zone_id: str) -> Optional[DeliveryZone]:
    try:
        return await DeliveryZone.get(PydanticObjectId(zone_id))
    except Exception:
        return None


async def update_zone(zone: DeliveryZone, data: dict) -> DeliveryZone:
    for k, v in data.items():
        if v is not None and k != "branch_id":
            setattr(zone, k, v)
        elif k == "branch_id":
            # Explicit None clears the branch (zone becomes shared)
            if v in (None, ""):
                zone.branch_id = None
            else:
                zone.branch_id = PydanticObjectId(v)
    await zone.save()
    return zone


async def assign_branch(zone: DeliveryZone, branch_id: str) -> DeliveryZone:
    """Set or clear the branch on a single zone."""
    if branch_id in (None, "", "shared"):
        zone.branch_id = None
    else:
        zone.branch_id = PydanticObjectId(branch_id)
    await zone.save()
    return zone


async def assign_all_orphans(branch_id: str) -> int:
    """Link every orphan zone to a branch. Returns how many were updated."""
    if not branch_id:
        raise ValueError("branch_id is required")
    try:
        bid = PydanticObjectId(branch_id)
    except Exception:
        raise ValueError("Invalid branch_id")

    orphans = await list_orphans()
    for z in orphans:
        z.branch_id = bid
        await z.save()
    return len(orphans)


async def delete_zone(zone: DeliveryZone) -> None:
    await zone.delete()


async def zone_belongs_to_branch(
    zone: DeliveryZone, branch_id: Optional[str]
) -> tuple[bool, str]:
    if zone.branch_id is None:
        return True, ""

    if not branch_id:
        return (
            False,
            "This delivery zone belongs to a specific branch. "
            "Please select a branch first.",
        )

    try:
        bid = PydanticObjectId(branch_id)
    except Exception:
        return False, "Invalid branch_id"

    if zone.branch_id != bid:
        return (
            False,
            "This delivery zone is not available for the selected branch. "
            "Please choose a different zone.",
        )

    return True, ""