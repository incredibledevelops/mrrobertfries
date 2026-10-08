from fastapi import APIRouter, Depends, HTTPException, status

from app.core.cache import cache, invalidate_branches
from app.core.deps import get_current_admin
from app.crud import branch as branch_crud
from app.models.branch import Branch
from app.schemas.branch import BranchCreate, BranchOut, BranchUpdate

router = APIRouter(prefix="/branches", tags=["Branches"])


def _to_out(b: Branch) -> BranchOut:
    return BranchOut(
        id=str(b.id),
        name=b.name,
        slug=b.slug,
        description=b.description,
        phone=b.phone,
        email=b.email,
        address=b.address,
        city=b.city,
        region=b.region,
        latitude=b.latitude,
        longitude=b.longitude,
        opening_hours=b.opening_hours,
        is_active=b.is_active,
        is_default=b.is_default,
        display_order=b.display_order,
        created_at=b.created_at,
        updated_at=b.updated_at,
    )


@router.get("", response_model=list[BranchOut])
async def list_branches(active_only: bool = False):
    cache_key = f"branches:list:{int(active_only)}"

    async def build():
        branches = await branch_crud.list_branches(active_only=active_only)
        return [_to_out(b).model_dump() for b in branches]

    data = await cache.get_or_set(cache_key, build, ttl=120)
    return [BranchOut(**d) for d in data]


@router.get("/with-zone-counts", dependencies=[Depends(get_current_admin)])
async def list_with_counts():
    rows = await branch_crud.list_with_zone_counts()
    return [
        {
            **_to_out(row["branch"]).model_dump(),
            "zone_count": row["zone_count"],
            "shared_zone_count": row["shared_zone_count"],
        }
        for row in rows
    ]


@router.get("/default", response_model=BranchOut)
async def get_default():
    branch = await branch_crud.get_default_branch()
    if not branch:
        raise HTTPException(404, "No branch configured")
    return _to_out(branch)


@router.get("/{branch_id}", response_model=BranchOut)
async def get_branch(branch_id: str):
    branch = await branch_crud.get_branch(branch_id)
    if not branch:
        raise HTTPException(404, "Branch not found")
    return _to_out(branch)


@router.post(
    "",
    response_model=BranchOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
)
async def create_branch(payload: BranchCreate):
    if await branch_crud.get_by_slug(
        payload.slug or branch_crud.slugify(payload.name)
    ):
        raise HTTPException(409, "Branch slug already exists")
    branch = await branch_crud.create_branch(payload.model_dump())
    await invalidate_branches()
    return _to_out(branch)


@router.patch(
    "/{branch_id}",
    response_model=BranchOut,
    dependencies=[Depends(get_current_admin)],
)
async def update_branch(branch_id: str, payload: BranchUpdate):
    branch = await branch_crud.get_branch(branch_id)
    if not branch:
        raise HTTPException(404, "Branch not found")

    if payload.is_default:
        for b in await branch_crud.list_branches():
            if str(b.id) != branch_id and b.is_default:
                b.is_default = False
                await b.save()

    branch = await branch_crud.update_branch(
        branch, payload.model_dump(exclude_unset=True)
    )
    await invalidate_branches()
    return _to_out(branch)


@router.delete(
    "/{branch_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin)],
)
async def delete_branch(branch_id: str):
    branch = await branch_crud.get_branch(branch_id)
    if not branch:
        raise HTTPException(404, "Branch not found")
    await branch_crud.delete_branch(branch)
    await invalidate_branches()