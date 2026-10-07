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
    zone = DeliveryZone(**data)
    await zone.insert()
    return zone


async def list_zones(active_only: bool = False) -> list[DeliveryZone]:
    query = DeliveryZone.find()
    if active_only:
        query = query.find(DeliveryZone.is_active == True)  # noqa: E712
    return await query.sort(+DeliveryZone.display_order).to_list()


async def get_zone(zone_id: str) -> Optional[DeliveryZone]:
    try:
        return await DeliveryZone.get(PydanticObjectId(zone_id))
    except Exception:
        return None


async def update_zone(zone: DeliveryZone, data: dict) -> DeliveryZone:
    for k, v in data.items():
        if v is not None:
            setattr(zone, k, v)
    await zone.save()
    return zone


async def delete_zone(zone: DeliveryZone) -> None:
    await zone.delete()