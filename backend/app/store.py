"""MongoDB store for products and metal rates. Kitty operations moved to kitty_store.py."""
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from db import get_products_collection, get_db


def _oid(id_str: str) -> ObjectId:
    """Convert string to ObjectId."""
    return ObjectId(id_str)


def _str_id(doc: dict) -> dict:
    """Convert _id to string id in document."""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─── Products (MongoDB) ──────────────────────────────────────────────────────

def product_list() -> list[dict]:
    """List all products from MongoDB."""
    try:
        coll = get_products_collection()
        docs = coll.find({}).sort("created_at", -1)
        return [_str_id(dict(d)) for d in docs]
    except Exception:
        return []


def product_get(id: str) -> Optional[dict]:
    """Get a single product by ID."""
    try:
        coll = get_products_collection()
        doc = coll.find_one({"_id": _oid(id)})
        return _str_id(dict(doc)) if doc else None
    except Exception:
        return None


def product_create(data: dict) -> dict:
    """Create a new product in MongoDB."""
    coll = get_products_collection()
    now = _now()
    
    doc = {
        "name": data.get("name", "Untitled"),
        "category": data.get("category", "gold"),
        "weight": float(data.get("weight", 0)),
        "making_charges": float(data.get("making_charges", 0)),
        "metal_type": data.get("metal_type", "Gold"),
        "purity": data.get("purity"),
        "product_type": data.get("product_type", "Ring"),
        "diamond_weight": data.get("diamond_weight"),
        "images": data.get("images", []),
        "created_at": now,
        "updated_at": now,
    }
    
    result = coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _str_id(doc)


def product_update(id: str, data: dict) -> Optional[dict]:
    """Update a product."""
    try:
        coll = get_products_collection()
        
        if not coll.find_one({"_id": _oid(id)}):
            return None
        
        update_fields = {}
        allowed = [
            "name", "category", "weight", "making_charges", "metal_type",
            "purity", "product_type", "diamond_weight", "images"
        ]
        
        for key in allowed:
            if key in data:
                if key in ["weight", "making_charges"]:
                    update_fields[key] = float(data[key]) if data[key] is not None else 0
                elif key == "diamond_weight":
                    update_fields[key] = float(data[key]) if data[key] is not None else None
                else:
                    update_fields[key] = data[key]
        
        if not update_fields:
            doc = coll.find_one({"_id": _oid(id)})
            return _str_id(dict(doc))
        
        update_fields["updated_at"] = _now()
        
        coll.update_one({"_id": _oid(id)}, {"$set": update_fields})
        doc = coll.find_one({"_id": _oid(id)})
        return _str_id(dict(doc))
    except Exception:
        return None


def product_delete(id: str) -> bool:
    """Delete a product."""
    try:
        coll = get_products_collection()
        result = coll.delete_one({"_id": _oid(id)})
        return result.deleted_count > 0
    except Exception:
        return False


# ─── Metal Rates (MongoDB with in-memory fallback) ───────────────────────────

_default_rates = {
    "gold_24k": 6320,
    "gold_22k": 5800,
    "silver": 78,
    "diamond": 52000,
    "bronze": 0,
}


def rates_get() -> dict:
    """Get current metal rates from MongoDB, or defaults."""
    try:
        db = get_db()
        doc = db["metal_rates"].find_one({"_id": "current"})
        if doc:
            return {
                "gold_24k": doc.get("gold_24k", _default_rates["gold_24k"]),
                "gold_22k": doc.get("gold_22k", _default_rates["gold_22k"]),
                "silver": doc.get("silver", _default_rates["silver"]),
                "diamond": doc.get("diamond", _default_rates["diamond"]),
                "bronze": doc.get("bronze", _default_rates["bronze"]),
            }
    except Exception:
        pass
    return dict(_default_rates)


def rates_update(updates: dict) -> dict:
    """Update metal rates in MongoDB."""
    try:
        db = get_db()
        current = rates_get()
        
        for k, v in updates.items():
            if k in current and v is not None:
                current[k] = float(v)
        
        current["updated_at"] = _now()
        
        db["metal_rates"].update_one(
            {"_id": "current"},
            {"$set": current},
            upsert=True
        )
        return rates_get()
    except Exception:
        return rates_get()


# ─── Legacy Kitty Functions (redirects to kitty_store.py) ────────────────────
# These are kept for backward compatibility with existing admin dashboard code.
# New code should use kitty_store.py directly.

def kitty_plan_list() -> list[dict]:
    """List kitty plans - redirects to kitty_store."""
    from app.kitty_store import plan_list
    plans = plan_list(include_inactive=True)
    # Transform to legacy format
    return [{
        "id": p["id"],
        "name": p["name"],
        "monthly_amount": p["monthly_amount"],
        "duration_months": p["duration_months"],
        "bonus_months": p["bonus_months"],
        "total_redeemable": p["total_redeemable"],
        "description": p.get("description", ""),
        "is_active": p.get("is_active", True),
    } for p in plans]


def kitty_plan_get(id: str) -> Optional[dict]:
    """Get kitty plan - redirects to kitty_store."""
    from app.kitty_store import plan_get
    p = plan_get(id)
    if not p:
        return None
    return {
        "id": p["id"],
        "name": p["name"],
        "monthly_amount": p["monthly_amount"],
        "duration_months": p["duration_months"],
        "bonus_months": p["bonus_months"],
        "total_redeemable": p["total_redeemable"],
        "description": p.get("description", ""),
        "is_active": p.get("is_active", True),
    }


def kitty_plan_create(data: dict) -> dict:
    """Create kitty plan - redirects to kitty_store."""
    from app.kitty_store import plan_create
    p = plan_create(data, created_by="system")
    return {
        "id": p["id"],
        "name": p["name"],
        "monthly_amount": p["monthly_amount"],
        "duration_months": p["duration_months"],
        "bonus_months": p["bonus_months"],
        "total_redeemable": p["total_redeemable"],
        "description": p.get("description", ""),
        "is_active": p.get("is_active", True),
    }


def kitty_plan_update(id: str, data: dict) -> Optional[dict]:
    """Update kitty plan - redirects to kitty_store."""
    from app.kitty_store import plan_update
    p = plan_update(id, data, updated_by="admin")
    if not p:
        return None
    return {
        "id": p["id"],
        "name": p["name"],
        "monthly_amount": p["monthly_amount"],
        "duration_months": p["duration_months"],
        "bonus_months": p["bonus_months"],
        "total_redeemable": p["total_redeemable"],
        "description": p.get("description", ""),
        "is_active": p.get("is_active", True),
    }


def kitty_plan_delete(id: str) -> bool:
    """Delete kitty plan - redirects to kitty_store."""
    from app.kitty_store import plan_delete
    return plan_delete(id, deleted_by="admin")


def kitty_member_list() -> list[dict]:
    """List kitty members (enrollments) - redirects to kitty_store."""
    from app.kitty_store import enrollment_list, installment_list
    
    enrollments = enrollment_list()
    result = []
    
    for e in enrollments:
        # Get payments for this enrollment
        installments = installment_list(enrollment_id=e["id"])
        payments = [{
            "month": i.get("due_date", "")[:7] if i.get("due_date") else "",
            "paid_at": i.get("payment_date", ""),
            "amount": i.get("amount_paid", 0),
            "note": i.get("remarks", ""),
        } for i in installments if i.get("status") == "paid"]
        
        result.append({
            "id": e["id"],
            "plan_id": e["plan_id"],
            "name": e["user_name"],
            "phone": e.get("user_phone", ""),
            "email": e.get("user_email", ""),
            "start_date": e.get("start_date", ""),
            "notes": e.get("notes", ""),
            "status": e["status"],
            "payments": payments,
            "redemption_date": None,
            "payments_made": e.get("installments_paid", 0),
            "plan_duration": e.get("total_installments", 11),
        })
    
    return result


def kitty_member_get(id: str) -> Optional[dict]:
    """Get kitty member - redirects to kitty_store."""
    from app.kitty_store import enrollment_get, installment_list
    
    e = enrollment_get(id)
    if not e:
        return None
    
    installments = installment_list(enrollment_id=id)
    payments = [{
        "month": i.get("due_date", "")[:7] if i.get("due_date") else "",
        "paid_at": i.get("payment_date", ""),
        "amount": i.get("amount_paid", 0),
        "note": i.get("remarks", ""),
    } for i in installments if i.get("status") == "paid"]
    
    return {
        "id": e["id"],
        "plan_id": e["plan_id"],
        "name": e["user_name"],
        "phone": e.get("user_phone", ""),
        "email": e.get("user_email", ""),
        "start_date": e.get("start_date", ""),
        "notes": e.get("notes", ""),
        "status": e["status"],
        "payments": payments,
        "redemption_date": None,
        "payments_made": e.get("installments_paid", 0),
        "plan_duration": e.get("total_installments", 11),
    }


def kitty_member_create(data: dict) -> dict:
    """Create kitty member - creates enrollment and auto-approves for backward compat."""
    from app.kitty_store import enrollment_create, enrollment_approve
    
    enrollment_data = {
        "plan_id": data["plan_id"],
        "user_email": data.get("email", f"{data.get('phone', '')}@kitty.local"),
        "user_name": data["name"],
        "user_phone": data.get("phone", ""),
        "start_date": data.get("start_date"),
        "notes": data.get("notes", ""),
    }
    
    e = enrollment_create(enrollment_data)
    
    # Auto-approve for backward compatibility with admin-created enrollments
    e = enrollment_approve(e["id"], approved_by="admin", start_date=data.get("start_date"))
    
    return {
        "id": e["id"],
        "plan_id": e["plan_id"],
        "name": e["user_name"],
        "phone": e.get("user_phone", ""),
        "email": e.get("user_email", ""),
        "start_date": e.get("start_date", ""),
        "notes": e.get("notes", ""),
        "status": e["status"],
        "payments": [],
        "redemption_date": None,
        "payments_made": 0,
        "plan_duration": e.get("total_installments", 11),
    }


def kitty_member_update(id: str, data: dict) -> Optional[dict]:
    """Update kitty member - limited update support."""
    from app.kitty_store import enrollment_get, enrollment_cancel
    from db import get_kitty_enrollments_collection
    
    e = enrollment_get(id)
    if not e:
        return None
    
    # Handle status changes
    if data.get("status") == "cancelled" and e["status"] == "active":
        e = enrollment_cancel(id, cancelled_by="admin", reason=data.get("notes", ""))
    elif data.get("status") == "completed":
        coll = get_kitty_enrollments_collection()
        coll.update_one({"_id": ObjectId(id)}, {"$set": {"status": "completed"}})
        e = enrollment_get(id)
    
    # Update notes if provided
    if "notes" in data:
        coll = get_kitty_enrollments_collection()
        coll.update_one({"_id": ObjectId(id)}, {"$set": {"notes": data["notes"]}})
        e = enrollment_get(id)
    
    return kitty_member_get(id)


def kitty_member_add_payment(id: str, payment: dict) -> Optional[dict]:
    """Add payment to kitty member - redirects to kitty_store."""
    from app.kitty_store import installment_create, enrollment_get
    
    e = enrollment_get(id)
    if not e:
        return None
    
    # Check for duplicate month
    from app.kitty_store import installment_list
    existing = installment_list(enrollment_id=id)
    existing_months = {i.get("due_date", "")[:7] for i in existing if i.get("due_date")}
    if payment.get("month") in existing_months:
        return None  # Duplicate
    
    installment_data = {
        "enrollment_id": id,
        "due_date": f"{payment['month']}-01",
        "amount_paid": payment.get("amount", 0),
        "payment_date": payment.get("paid_at", "")[:10] if payment.get("paid_at") else None,
        "remarks": payment.get("note", ""),
        "status": "paid",
    }
    
    installment_create(installment_data, recorded_by="admin")
    
    return kitty_member_get(id)


def kitty_member_delete(id: str) -> bool:
    """Delete kitty member - soft delete via cancel."""
    from app.kitty_store import enrollment_cancel, enrollment_get
    
    e = enrollment_get(id)
    if not e:
        return False
    
    try:
        enrollment_cancel(id, cancelled_by="admin", reason="Deleted")
        return True
    except Exception:
        return False


# ─── Seed data on first run ──────────────────────────────────────────────────

def seed_kitty_plans():
    """Seed default kitty plans if none exist."""
    from app.kitty_store import plan_list, plan_create
    
    existing = plan_list()
    if existing:
        return
    
    seed_plans = [
        {
            "name": "Silver Savings – ₹1,000/mo",
            "monthly_amount": 1000,
            "duration_months": 11,
            "bonus_months": 1,
            "description": "Save ₹1,000 every month for 11 months and get 1 month free. Redeem ₹12,000 toward any purchase.",
            "is_active": True,
            "status": "active",
        },
        {
            "name": "Gold Savings – ₹2,000/mo",
            "monthly_amount": 2000,
            "duration_months": 11,
            "bonus_months": 1,
            "description": "Save ₹2,000 every month for 11 months and get 1 month free. Redeem ₹24,000 toward any purchase.",
            "is_active": True,
            "status": "active",
        },
        {
            "name": "Premium – ₹5,000/mo",
            "monthly_amount": 5000,
            "duration_months": 11,
            "bonus_months": 1,
            "description": "Save ₹5,000 every month for 11 months and get 1 month free. Redeem ₹60,000 toward any purchase.",
            "is_active": True,
            "status": "active",
        },
    ]
    
    for p in seed_plans:
        try:
            plan_create(p, created_by="system")
        except Exception:
            pass
