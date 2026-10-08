from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.cache import cache, invalidate_zones
from app.core.deps import get_current_admin
from app.crud import branch as branch_crud
from app.crud import delivery_zone as zone_crud
from app.models.delivery_zone import DeliveryZone
from app.schemas.delivery_zone import (
    AssignBranchIn,
    DeliveryZoneCreate,
    DeliveryZoneOut,
    DeliveryZoneUpdate,
)

router = APIRouter(prefix="/delivery-zones", tags=["Delivery Zones"])


async def _to_out(z: DeliveryZone) -> DeliveryZoneOut:
    branch_name = None
    if z.branch_id:
        b = await branch_crud.get_branch(str(z.branch_id))
        branch_name = b.name if b else "Unknown branch"

    return DeliveryZoneOut(
        id=str(z.id),
        name=z.name,
        slug=z.slug,
        description=z.description,
        delivery_fee=z.delivery_fee,
        estimated_minutes=z.estimated_minutes,
        branch_id=str(z.branch_id) if z.branch_id else None,
        branch_name=branch_name,
        is_shared=z.branch_id is None,
        is_active=z.is_active,
        display_order=z.display_order,
        created_at=z.created_at,
        updated_at=z.updated_at,
    )


@router.get("", response_model=list[DeliveryZoneOut])
async def list_zones(
    active_only: bool = False,
    branch_id: Optional[str] = Query(None),
    include_shared: bool = Query(True),
):
    cache_key = (
        f"zones:list:{int(active_only)}:{branch_id or 'all'}:"
        f"{int(include_shared)}"
    )

    async def build():
        zones = await zone_crud.list_zones(
            active_only=active_only,
            branch_id=branch_id,
            include_shared=include_shared,
        )
        out = []
        for z in zones:
            out.append((await _to_out(z)).model_dump())
        return out

    data = await cache.get_or_set(cache_key, build, ttl=60)
    return [DeliveryZoneOut(**d) for d in data]


@router.get("/orphans/count")
async def orphans_count(_=Depends(get_current_admin)):
    orphans = await zone_crud.list_orphans()
    return {"count": len(orphans)}


@router.post(
    "/assign-orphans",
    dependencies=[Depends(get_current_admin)],
)
async def assign_orphans(payload: AssignBranchIn):
    branch = await branch_crud.get_branch(payload.branch_id)
    if not branch:
        raise HTTPException(404, "Branch not found")

    count = await zone_crud.assign_all_orphans(payload.branch_id)
    await invalidate_zones()
    return {
        "message": f"Assigned {count} orphan zone(s) to '{branch.name}'",
        "count": count,
    }


@router.get("/{zone_id}", response_model=DeliveryZoneOut)
async def get_zone(zone_id: str):
    zone = await zone_crud.get_zone(zone_id)
    if not zone:
        raise HTTPException(404, "Delivery zone not found")
    return await _to_out(zone)


@router.post(
    "",
    response_model=DeliveryZoneOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
)
async def create_zone(payload: DeliveryZoneCreate):
    if payload.branch_id:
        b = await branch_crud.get_branch(payload.branch_id)
        if not b:
            raise HTTPException(400, "Invalid branch_id")

    zone = await zone_crud.create_zone(payload.model_dump())
    await invalidate_zones()
    return await _to_out(zone)


@router.patch(
    "/{zone_id}",
    response_model=DeliveryZoneOut,
    dependencies=[Depends(get_current_admin)],
)
async def update_zone(zone_id: str, payload: DeliveryZoneUpdate):
    zone = await zone_crud.get_zone(zone_id)
    if not zone:
        raise HTTPException(404, "Delivery zone not found")

    data = payload.model_dump(exclude_unset=True)

    if "branch_id" in data and data["branch_id"]:
        b = await branch_crud.get_branch(data["branch_id"])
        if not b:
            raise HTTPException(400, "Invalid branch_id")

    zone = await zone_crud.update_zone(zone, data)
    await invalidate_zones()
    return await _to_out(zone)


@router.post(
    "/{zone_id}/assign-branch",
    response_model=DeliveryZoneOut,
    dependencies=[Depends(get_current_admin)],
)
async def assign_zone_branch(zone_id: str, payload: AssignBranchIn):
    zone = await zone_crud.get_zone(zone_id)
    if not zone:
        raise HTTPException(404, "Delivery zone not found")

    if payload.branch_id != "shared":
        b = await branch_crud.get_branch(payload.branch_id)
        if not b:
            raise HTTPException(400, "Branch not found")

    zone = await zone_crud.assign_branch(zone, payload.branch_id)
    await invalidate_zones()
    return await _to_out(zone)


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
    await invalidate_zones()