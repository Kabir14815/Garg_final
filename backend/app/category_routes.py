"""Public and admin routes for nested product categories."""
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.category_store import (
    category_list,
    category_get,
    category_create,
    category_update,
    category_delete,
    category_reorder,
    build_category_tree,
)


class CategoryCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    parent_id: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: bool = True


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    parent_id: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryReorder(BaseModel):
    ordered_ids: List[str]
    parent_id: Optional[str] = None


class CategoryNode(BaseModel):
    id: str
    name: str
    slug: str = ""
    parent_id: Optional[str] = None
    ancestors: List[str] = []
    depth: int = 0
    sort_order: int = 0
    is_active: bool = True
    children: List["CategoryNode"] = []


CategoryNode.model_rebuild()


class CategoryFlat(BaseModel):
    id: str
    name: str
    slug: str = ""
    parent_id: Optional[str] = None
    ancestors: List[str] = []
    depth: int = 0
    sort_order: int = 0
    is_active: bool = True


public_router = APIRouter(prefix="/api/categories", tags=["categories"])
admin_router = APIRouter(prefix="/api/admin/categories", tags=["categories-admin"])


def _flat(c: dict) -> dict:
    return {
        "id": c.get("id") or "",
        "name": c.get("name") or "",
        "slug": c.get("slug") or "",
        "parent_id": c.get("parent_id"),
        "ancestors": c.get("ancestors") or [],
        "depth": c.get("depth") or 0,
        "sort_order": c.get("sort_order") or 0,
        "is_active": c.get("is_active", True),
    }


@public_router.get("", response_model=List[CategoryNode])
@public_router.get("/", response_model=List[CategoryNode])
def list_category_tree(active_only: bool = Query(True)):
    return build_category_tree(active_only=active_only)


@public_router.get("/flat", response_model=List[CategoryFlat])
def list_categories_flat(active_only: bool = Query(True)):
    return [_flat(c) for c in category_list(active_only=active_only)]


@admin_router.get("", response_model=List[CategoryNode])
@admin_router.get("/", response_model=List[CategoryNode])
def admin_list_tree(include_inactive: bool = Query(True)):
    return build_category_tree(active_only=not include_inactive)


@admin_router.get("/flat", response_model=List[CategoryFlat])
def admin_list_flat(include_inactive: bool = Query(True)):
    return [_flat(c) for c in category_list(active_only=not include_inactive)]


@admin_router.post("", response_model=CategoryFlat)
@admin_router.post("/", response_model=CategoryFlat)
def admin_create_category(body: CategoryCreate):
    try:
        cat = category_create(body.model_dump())
        return _flat(cat)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@admin_router.put("/reorder", response_model=List[CategoryFlat])
def admin_reorder_categories(body: CategoryReorder):
    cats = category_reorder(body.ordered_ids, parent_id=body.parent_id)
    return [_flat(c) for c in cats]


@admin_router.put("/{category_id}", response_model=CategoryFlat)
def admin_update_category(category_id: str, body: CategoryUpdate):
    try:
        data = {k: v for k, v in body.model_dump().items() if v is not None or k == "parent_id"}
        # Allow explicitly clearing parent_id
        if "parent_id" in body.model_dump(exclude_unset=True):
            data["parent_id"] = body.parent_id
        cat = category_update(category_id, data)
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
        return _flat(cat)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@admin_router.delete("/{category_id}", status_code=204)
def admin_delete_category(category_id: str):
    try:
        if not category_delete(category_id):
            raise HTTPException(status_code=404, detail="Category not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@admin_router.get("/{category_id}", response_model=CategoryFlat)
def admin_get_category(category_id: str):
    cat = category_get(category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return _flat(cat)
