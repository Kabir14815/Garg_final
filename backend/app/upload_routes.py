"""Admin product image uploads: saved under /uploads/products (served as static files)."""
from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(tags=["uploads"])

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"
PRODUCT_DIR = UPLOAD_ROOT / "products"

_ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
_MAX_BYTES = 5 * 1024 * 1024


@router.post("/api/uploads/product-image")
async def upload_product_image(file: UploadFile = File(...)) -> dict[str, str]:
    raw_name = file.filename or ""
    suffix = Path(raw_name).suffix.lower()
    if suffix not in _ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(sorted(_ALLOWED_EXT))}",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 5 MB)")

    PRODUCT_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{suffix}"
    path = PRODUCT_DIR / name
    path.write_bytes(data)

    return {"url": f"/uploads/products/{name}"}
