import os
import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image

from app.core.config import settings

ALLOWED_SUBDIRS = {"menu", "categories", "builder"}


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _validate_content_type(content_type: str) -> None:
    if content_type not in settings.allowed_image_types_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid image type '{content_type}'. "
                f"Allowed: {', '.join(settings.ALLOWED_IMAGE_TYPES)}"
            ),
        )


def _validate_size(size: int) -> None:
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB allowed."
            ),
        )


def _build_filename(original: str, subdir: str) -> str:
    ext = Path(original).suffix.lower() or ".jpg"
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        ext = ".jpg"
    token = secrets.token_hex(8)
    return f"{subdir}_{token}{ext}"


async def save_upload(
    file: UploadFile,
    subdir: str = "menu",
    max_width: int = 1600,
    quality: int = 85,
) -> dict:
    if subdir not in ALLOWED_SUBDIRS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid upload subdir. Allowed: {ALLOWED_SUBDIRS}",
        )

    _validate_content_type(file.content_type or "")

    contents = await file.read()
    _validate_size(len(contents))

    target_dir = Path(settings.UPLOAD_DIR) / subdir
    _ensure_dir(target_dir)

    filename = _build_filename(file.filename or "image.jpg", subdir)
    filepath = target_dir / filename

    # Optimize / resize using PIL
    try:
        from io import BytesIO

        img = Image.open(BytesIO(contents))
        img = img.convert("RGB") if img.mode in ("RGBA", "P") else img

        if img.width > max_width:
            ratio = max_width / float(img.width)
            new_height = int(float(img.height) * ratio)
            img = img.resize((max_width, new_height), Image.LANCZOS)

        save_kwargs = {"optimize": True}
        if filename.endswith(".png"):
            save_kwargs["format"] = "PNG"
        elif filename.endswith(".webp"):
            save_kwargs["format"] = "WEBP"
            save_kwargs["quality"] = quality
        else:
            save_kwargs["format"] = "JPEG"
            save_kwargs["quality"] = quality

        img.save(filepath, **save_kwargs)
    except Exception:
        # Fallback: save raw bytes
        with open(filepath, "wb") as f:
            f.write(contents)

    url_path = f"/uploads/{subdir}/{filename}"
    return {
        "url": url_path,
        "filename": filename,
        "content_type": file.content_type,
        "size": os.path.getsize(filepath),
    }