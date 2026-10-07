from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_admin
from app.crud import delivery_zone as zone_crud
from app.models.delivery_zone import DeliveryZone
from app.schemas.delivery_zone import (
    DeliveryZoneCreate,
    DeliveryZoneOut,
    DeliveryZoneUpdate,
)

router = APIRouter(prefix="/delivery-zones", tags=["Delivery Zones"])


def _to_out(z: DeliveryZone) -> DeliveryZoneOut:
    return DeliveryZoneOut(
        id=str(z.id),
        name=z.name,
        slug=z.slug,
        description=z.description,
        delivery_fee=z.delivery_fee,
        estimated_minutes=z.estimated_minutes,
        is_active=z.is_active,
        display_order=z.display_order,
        created_at=z.created_at,
        updated_at=z.updated_at,
    )


@router.get("", response_model=list[DeliveryZoneOut])
async def list_zones(active_only: bool = False):
    zones = await zone_crud.list_zones(active_only=active_only)
    return [_to_out(z) for z in zones]


@router.get("/{zone_id}", response_model=DeliveryZoneOut)
async def get_zone(zone_id: str):
    zone = await zone_crud.get_zone(zone_id)
    if not zone:
        raise HTTPException(404, "Delivery zone not found")
    return _to_out(zone)


@router.post(
    "",
    response_model=DeliveryZoneOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
)
async def create_zone(payload: DeliveryZoneCreate):
    zone = await zone_crud.create_zone(payload.model_dump())
    return _to_out(zone)


@router.patch(
    "/{zone_id}",
    response_model=DeliveryZoneOut,
    dependencies=[Depends(get_current_admin)],
)
async def update_zone(zone_id: str, payload: DeliveryZoneUpdate):
    zone = await zone_crud.get_zone(zone_id)
    if not zone:
        raise HTTPException(404, "Delivery zone not found")
    zone = await zone_crud.update_zone(zone, payload.model_dump(exclude_unset=True))
    return _to_out(zone)


@router.delete(
    "/{zone_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin)],
)
async def delete_zone(zone_id: str):
    zone = await zone_crud.get_zone(zone_id)
    if not zone:
        raise HTTPException(404, "Delivery zone not found")
    await zone_crud.delete_zone(zone)