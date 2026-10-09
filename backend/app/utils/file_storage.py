import os
import secrets
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.core.config import settings

ALLOWED_SUBDIRS = {"menu", "categories", "builder"}

# PIL format names → canonical extension we will use on disk.
_PIL_FORMAT_EXT = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
}

# MIME types we accept.
_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _validate_content_type(content_type: str) -> None:
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid image type '{content_type}'. "
                f"Allowed: {', '.join(sorted(_ALLOWED_CONTENT_TYPES))}"
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


def _build_filename(subdir: str, ext: str) -> str:
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

    # Open with PIL first — this is the real content-type check. If the
    # bytes aren't a valid image PIL will raise and we reject the upload.
    try:
        img = Image.open(BytesIO(contents))
        img.load()  # force decode so truncated images fail here
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is not a valid image.",
        )

    fmt = (img.format or "").upper()
    ext = _PIL_FORMAT_EXT.get(fmt)
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format '{fmt}'. Use JPEG, PNG, or WebP.",
        )

    target_dir = Path(settings.UPLOAD_DIR) / subdir
    _ensure_dir(target_dir)

    filename = _build_filename(subdir, ext)
    filepath = target_dir / filename

    # Normalize mode and resize.
    if img.mode in ("RGBA", "P"):
        # Save transparency-preserving formats as-is; convert to RGB for JPEG.
        if ext == ".jpg":
            img = img.convert("RGB")
    if img.mode not in ("RGB", "RGBA", "L"):
        img = img.convert("RGB")

    if img.width > max_width:
        ratio = max_width / float(img.width)
        new_height = int(float(img.height) * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

    save_kwargs: dict = {"optimize": True}
    if ext == ".png":
        save_kwargs["format"] = "PNG"
    elif ext == ".webp":
        save_kwargs["format"] = "WEBP"
        save_kwargs["quality"] = quality
    else:
        save_kwargs["format"] = "JPEG"
        save_kwargs["quality"] = quality

    try:
        img.save(filepath, **save_kwargs)
    except Exception:
        # If PIL succeeds decoding but fails encoding, reject the upload.
        # Previously we fell back to writing raw bytes — which allowed
        # arbitrary payloads to be served with a spoofed extension.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not process image.",
        )

    url_path = f"/uploads/{subdir}/{filename}"
    return {
        "url": url_path,
        "filename": filename,
        "content_type": file.content_type,
        "size": os.path.getsize(filepath),
    }