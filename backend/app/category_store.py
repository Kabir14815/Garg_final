"""Nested product category tree stored in MongoDB."""
from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId

from db import get_categories_collection, get_products_collection


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _oid(id_str: str) -> ObjectId:
    return ObjectId(id_str)


def _str_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def _slugify(name: str) -> str:
    s = "".join(c.lower() if c.isalnum() else "-" for c in (name or "").strip())
    while "--" in s:
        s = s.replace("--", "-")
    return s.strip("-") or "category"


def category_list(active_only: bool = False) -> List[dict]:
    coll = get_categories_collection()
    query = {"is_active": True} if active_only else {}
    docs = list(coll.find(query).sort([("depth", 1), ("sort_order", 1), ("name", 1)]))
    return [_str_id(dict(d)) for d in docs]


def category_get(category_id: str) -> Optional[dict]:
    try:
        doc = get_categories_collection().find_one({"_id": _oid(category_id)})
        return _str_id(dict(doc)) if doc else None
    except Exception:
        return None


def category_get_by_slug(slug: str) -> Optional[dict]:
    doc = get_categories_collection().find_one({"slug": slug})
    return _str_id(dict(doc)) if doc else None


def build_category_tree(flat: Optional[List[dict]] = None, active_only: bool = True) -> List[dict]:
    """Nest flat category docs into a tree with `children` arrays."""
    items = flat if flat is not None else category_list(active_only=active_only)
    by_id = {}
    for c in items:
        node = {
            "id": c["id"],
            "name": c.get("name") or "",
            "slug": c.get("slug") or "",
            "parent_id": c.get("parent_id"),
            "ancestors": c.get("ancestors") or [],
            "depth": c.get("depth") or 0,
            "sort_order": c.get("sort_order") or 0,
            "is_active": c.get("is_active", True),
            "children": [],
        }
        by_id[c["id"]] = node

    roots = []
    for c in items:
        node = by_id[c["id"]]
        parent_id = c.get("parent_id")
        if parent_id and parent_id in by_id:
            by_id[parent_id]["children"].append(node)
        else:
            roots.append(node)

    def sort_rec(nodes):
        nodes.sort(key=lambda n: (n.get("sort_order") or 0, n.get("name") or ""))
        for n in nodes:
            sort_rec(n["children"])

    sort_rec(roots)
    return roots


def category_create(data: dict) -> dict:
    coll = get_categories_collection()
    name = (data.get("name") or "").strip()
    if not name:
        raise ValueError("Category name is required")

    parent_id = data.get("parent_id") or None
    ancestors = []
    depth = 0
    if parent_id:
        parent = category_get(parent_id)
        if not parent:
            raise ValueError("Parent category not found")
        ancestors = list(parent.get("ancestors") or []) + [parent["id"]]
        depth = int(parent.get("depth") or 0) + 1

    slug = (data.get("slug") or "").strip() or _slugify(name)
    # Keep slug unique among siblings
    existing = coll.find_one({"slug": slug, "parent_id": parent_id})
    if existing:
        slug = f"{slug}-{ObjectId()}"

    siblings = coll.count_documents({"parent_id": parent_id})
    sort_order = data.get("sort_order")
    if sort_order is None:
        sort_order = siblings

    now = _now()
    doc = {
        "name": name,
        "slug": slug,
        "parent_id": parent_id,
        "ancestors": ancestors,
        "depth": depth,
        "sort_order": int(sort_order),
        "is_active": data.get("is_active") if data.get("is_active") is not None else True,
        "created_at": now,
        "updated_at": now,
    }
    result = coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _str_id(doc)


def category_update(category_id: str, data: dict) -> Optional[dict]:
    coll = get_categories_collection()
    old = coll.find_one({"_id": _oid(category_id)})
    if not old:
        return None

    update_fields = {}
    if "name" in data and data["name"] is not None:
        update_fields["name"] = str(data["name"]).strip()
    if "slug" in data and data["slug"] is not None:
        update_fields["slug"] = str(data["slug"]).strip() or _slugify(update_fields.get("name") or old.get("name", ""))
    if "sort_order" in data and data["sort_order"] is not None:
        update_fields["sort_order"] = int(data["sort_order"])
    if "is_active" in data and data["is_active"] is not None:
        update_fields["is_active"] = bool(data["is_active"])

    # Re-parenting (optional)
    if "parent_id" in data:
        new_parent_id = data["parent_id"] or None
        if new_parent_id == category_id:
            raise ValueError("Category cannot be its own parent")
        if new_parent_id:
            parent = category_get(new_parent_id)
            if not parent:
                raise ValueError("Parent category not found")
            if category_id in (parent.get("ancestors") or []):
                raise ValueError("Cannot move a category under its own descendant")
            update_fields["parent_id"] = new_parent_id
            update_fields["ancestors"] = list(parent.get("ancestors") or []) + [parent["id"]]
            update_fields["depth"] = int(parent.get("depth") or 0) + 1
        else:
            update_fields["parent_id"] = None
            update_fields["ancestors"] = []
            update_fields["depth"] = 0

    if not update_fields:
        return _str_id(dict(old))

    update_fields["updated_at"] = _now()
    coll.update_one({"_id": _oid(category_id)}, {"$set": update_fields})

    # If ancestors/depth changed, cascade to descendants
    if "ancestors" in update_fields:
        _recompute_descendant_paths(category_id)

    doc = coll.find_one({"_id": _oid(category_id)})
    return _str_id(dict(doc)) if doc else None


def _recompute_descendant_paths(category_id: str):
    """After moving a node, fix ancestors/depth for all descendants."""
    coll = get_categories_collection()
    root = coll.find_one({"_id": _oid(category_id)})
    if not root:
        return
    root_id = str(root["_id"])
    root_ancestors = list(root.get("ancestors") or [])
    root_depth = int(root.get("depth") or 0)

    descendants = list(coll.find({"ancestors": root_id}))
    for d in descendants:
        old_anc = list(d.get("ancestors") or [])
        try:
            idx = old_anc.index(root_id)
        except ValueError:
            continue
        # Keep the suffix after this node, prepend new path including this node
        suffix = old_anc[idx + 1 :]
        new_anc = root_ancestors + [root_id] + suffix
        new_depth = root_depth + 1 + len(suffix)
        coll.update_one(
            {"_id": d["_id"]},
            {"$set": {"ancestors": new_anc, "depth": new_depth, "updated_at": _now()}},
        )


def category_delete(category_id: str) -> bool:
    """Delete a leaf category with no products. Raises ValueError if blocked."""
    coll = get_categories_collection()
    doc = coll.find_one({"_id": _oid(category_id)})
    if not doc:
        return False

    child_count = coll.count_documents({"parent_id": category_id})
    if child_count > 0:
        raise ValueError("Cannot delete a category that has subcategories")

    product_count = get_products_collection().count_documents({"category_id": category_id})
    if product_count > 0:
        raise ValueError("Cannot delete a category that has products assigned")

    result = coll.delete_one({"_id": _oid(category_id)})
    return result.deleted_count > 0


def category_reorder(ordered_ids: List[str], parent_id: Optional[str] = None) -> List[dict]:
    """Set sort_order for siblings under parent_id based on ordered_ids."""
    coll = get_categories_collection()
    for i, cid in enumerate(ordered_ids):
        coll.update_one(
            {"_id": _oid(cid), "parent_id": parent_id},
            {"$set": {"sort_order": i, "updated_at": _now()}},
        )
    return category_list(active_only=False)


# ─── Seed / migration ─────────────────────────────────────────────────────────

_DEFAULT_ROOTS = [
    ("Gold", "gold"),
    ("Silver", "silver"),
    ("Diamond", "diamond"),
    ("Bronze", "bronze"),
]

_DEFAULT_TYPES = [
    "Ring", "Necklace", "Chain", "Bracelet", "Bangle", "Earrings", "Pendant", "Anklet",
]


def seed_categories_and_backfill_products() -> dict:
    """
    Seed root metals + product-type children if none exist,
    then backfill category_id on products that lack it.
    Safe to call multiple times.
    """
    coll = get_categories_collection()
    products = get_products_collection()
    created = 0

    if coll.count_documents({}) == 0:
        root_ids = {}
        for i, (name, slug) in enumerate(_DEFAULT_ROOTS):
            cat = category_create({
                "name": name,
                "slug": slug,
                "parent_id": None,
                "sort_order": i,
                "is_active": True,
            })
            root_ids[slug] = cat["id"]
            created += 1
            for j, t in enumerate(_DEFAULT_TYPES):
                category_create({
                    "name": t,
                    "slug": _slugify(t),
                    "parent_id": cat["id"],
                    "sort_order": j,
                    "is_active": True,
                })
                created += 1
    else:
        # Ensure roots exist for known metals
        root_ids = {}
        for i, (name, slug) in enumerate(_DEFAULT_ROOTS):
            existing = coll.find_one({"slug": slug, "parent_id": None})
            if existing:
                root_ids[slug] = str(existing["_id"])
            else:
                cat = category_create({
                    "name": name,
                    "slug": slug,
                    "parent_id": None,
                    "sort_order": i,
                })
                root_ids[slug] = cat["id"]
                created += 1

    # Build lookup: (metal_slug, product_type_name_lower) -> leaf id
    all_cats = category_list(active_only=False)
    by_id = {c["id"]: c for c in all_cats}
    leaf_lookup = {}
    for c in all_cats:
        parent_id = c.get("parent_id")
        if not parent_id:
            continue
        parent = by_id.get(parent_id)
        if not parent:
            continue
        metal_slug = (parent.get("slug") or "").lower()
        type_key = (c.get("name") or "").lower()
        leaf_lookup[(metal_slug, type_key)] = c["id"]

    backfilled = 0
    for prod in products.find({"$or": [{"category_id": {"$exists": False}}, {"category_id": None}, {"category_id": ""}]}):
        metal = (prod.get("category") or "gold").lower()
        ptype = (prod.get("product_type") or "Ring").lower()
        leaf_id = leaf_lookup.get((metal, ptype))
        if not leaf_id:
            # Fall back to root metal if no type child
            leaf_id = root_ids.get(metal)
        if not leaf_id:
            continue
        leaf = by_id.get(leaf_id) or category_get(leaf_id)
        ancestors = list((leaf or {}).get("ancestors") or [])
        if leaf_id not in ancestors:
            # products store ancestors of the leaf including the leaf itself for easy filtering
            path = ancestors + [leaf_id]
        else:
            path = ancestors
        products.update_one(
            {"_id": prod["_id"]},
            {"$set": {
                "category_id": leaf_id,
                "category_ancestors": path,
                "updated_at": _now(),
            }},
        )
        backfilled += 1

    return {"categories_created": created, "products_backfilled": backfilled}
