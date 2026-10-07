from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.core.deps import get_current_admin
from app.schemas.upload import UploadOut
from app.utils.file_storage import save_upload

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post(
    "",
    response_model=UploadOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
)
async def upload_image(
    file: UploadFile = File(...),
    subdir: str = Form("menu"),  # menu | categories | builder
):
    result = await save_upload(file, subdir=subdir)
    return UploadOut(**result)