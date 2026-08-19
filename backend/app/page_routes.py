"""Public and admin routes for Privacy Policy and Terms of Service pages."""
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.page_store import ALLOWED_SLUGS, page_get, page_list, page_update


class PageResponse(BaseModel):
    slug: str
    title: str
    body: str = ""
    updated_at: str = ""


class PageUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None


public_router = APIRouter(prefix="/api/pages", tags=["pages"])
admin_router = APIRouter(prefix="/api/admin/pages", tags=["pages-admin"])


@public_router.get("", response_model=List[PageResponse])
def list_pages():
    return page_list()


@public_router.get("/{slug}", response_model=PageResponse)
def get_page(slug: str):
    page = page_get(slug)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@admin_router.get("", response_model=List[PageResponse])
def admin_list_pages():
    return page_list()


@admin_router.put("/{slug}", response_model=PageResponse)
def admin_update_page(slug: str, body: PageUpdate):
    if slug not in ALLOWED_SLUGS:
        raise HTTPException(status_code=404, detail="Page not found")
    updated = page_update(slug, body.title, body.body)
    if not updated:
        raise HTTPException(status_code=404, detail="Page not found")
    return updated
