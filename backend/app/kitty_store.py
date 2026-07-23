"""MongoDB store for Kitty savings scheme - Plans, Enrollments, Installments, Withdrawals, Ledger."""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId

from db import (
    get_kitty_plans_collection,
    get_kitty_enrollments_collection,
    get_kitty_installments_collection,
    get_kitty_withdrawals_collection,
    get_kitty_ledger_collection,
    get_audit_logs_collection,
)


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


def _generate_code(prefix: str, collection_name: str) -> str:
    """Generate sequential code like KP-2026-001, EN-2026-001, etc."""
    year = datetime.now().year
    from db import get_db
    coll = get_db()[collection_name]
    count = coll.count_documents({})
    return f"{prefix}-{year}-{str(count + 1).zfill(4)}"


# ─── Audit Logging ────────────────────────────────────────────────────────────

def log_audit(
    entity_type: str,
    entity_id: str,
    action: str,
    performed_by: str,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
):
    """Record an audit log entry."""
    try:
        get_audit_logs_collection().insert_one({
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action": action,
            "performed_by": performed_by,
            "old_value": old_value,
            "new_value": new_value,
            "details": details,
            "ip_address": ip_address,
            "created_at": _now(),
        })
    except Exception:
        pass


# ─── Kitty Plans ──────────────────────────────────────────────────────────────

def plan_list(include_inactive: bool = False) -> List[dict]:
    """List all plans. By default only active ones."""
    coll = get_kitty_plans_collection()
    query = {} if include_inactive else {"status": {"$nin": ["archived", "deleted"]}}
    docs = coll.find(query).sort("created_at", -1)
    return [_str_id(dict(d)) for d in docs]


def plan_list_public() -> List[dict]:
    """List active plans for public view."""
    coll = get_kitty_plans_collection()
    docs = coll.find({"status": "active", "is_active": True}).sort("monthly_amount", 1)
    return [_str_id(dict(d)) for d in docs]


def plan_get(plan_id: str) -> Optional[dict]:
    """Get a single plan by ID."""
    try:
        doc = get_kitty_plans_collection().find_one({"_id": _oid(plan_id)})
        return _str_id(dict(doc)) if doc else None
    except Exception:
        return None


def plan_create(data: dict, created_by: str) -> dict:
    """Create a new kitty plan."""
    coll = get_kitty_plans_collection()
    now = _now()
    
    plan_code = data.get("plan_code") or _generate_code("KP", "kitty_plans")
    
    doc = {
        "plan_code": plan_code,
        "name": data["name"],
        "description": data.get("description") or "",
        "monthly_amount": float(data["monthly_amount"]),
        "duration_months": int(data.get("duration_months") or 11),
        "bonus_months": int(data.get("bonus_months") or 1),
        "joining_fee": float(data.get("joining_fee") or 0),
        "processing_fee": float(data.get("processing_fee") or 0),
        "late_fee": float(data.get("late_fee") or 0),
        "start_date": data.get("start_date"),
        "end_date": data.get("end_date"),
        "status": data.get("status") or "active",
        "is_active": data.get("is_active") if data.get("is_active") is not None else True,
        "banner_image": data.get("banner_image"),
        "thumbnail_image": data.get("thumbnail_image"),
        "terms_conditions": data.get("terms_conditions", ""),
        "created_at": now,
        "updated_at": now,
        "created_by": created_by,
    }
    
    # Use provided total_redeemable or compute it
    if data.get("total_redeemable"):
        doc["total_redeemable"] = float(data["total_redeemable"])
    else:
        doc["total_redeemable"] = doc["monthly_amount"] * (doc["duration_months"] + doc["bonus_months"])
    
    result = coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    log_audit("kitty_plan", str(result.inserted_id), "create", created_by, new_value=doc)
    
    return _str_id(doc)


def plan_update(plan_id: str, data: dict, updated_by: str) -> Optional[dict]:
    """Update a kitty plan."""
    coll = get_kitty_plans_collection()
    
    old_doc = coll.find_one({"_id": _oid(plan_id)})
    if not old_doc:
        return None
    
    update_fields = {}
    allowed = [
        "name", "description", "monthly_amount", "duration_months", "bonus_months",
        "joining_fee", "processing_fee", "late_fee", "start_date", "end_date",
        "status", "is_active", "banner_image", "thumbnail_image", "terms_conditions", "plan_code"
    ]
    
    for key in allowed:
        if key in data and data[key] is not None:
            if key in ["monthly_amount", "joining_fee", "processing_fee", "late_fee"]:
                update_fields[key] = float(data[key])
            elif key in ["duration_months", "bonus_months"]:
                update_fields[key] = int(data[key])
            elif key == "is_active":
                update_fields[key] = bool(data[key])
            else:
                update_fields[key] = data[key]
    
    if not update_fields:
        return _str_id(dict(old_doc))
    
    update_fields["updated_at"] = _now()
    
    # Use provided total_redeemable or recalculate if amounts changed
    if "total_redeemable" in data and data["total_redeemable"] is not None:
        update_fields["total_redeemable"] = float(data["total_redeemable"])
    else:
        monthly = update_fields.get("monthly_amount", old_doc.get("monthly_amount", 0))
        duration = update_fields.get("duration_months", old_doc.get("duration_months", 11))
        bonus = update_fields.get("bonus_months", old_doc.get("bonus_months", 1))
        update_fields["total_redeemable"] = monthly * (duration + bonus)
    
    coll.update_one({"_id": _oid(plan_id)}, {"$set": update_fields})
    
    new_doc = coll.find_one({"_id": _oid(plan_id)})
    log_audit("kitty_plan", plan_id, "update", updated_by, old_value=dict(old_doc), new_value=dict(new_doc))
    
    return _str_id(dict(new_doc))


def plan_delete(plan_id: str, deleted_by: str) -> bool:
    """Soft delete a plan (set status to deleted)."""
    coll = get_kitty_plans_collection()
    old_doc = coll.find_one({"_id": _oid(plan_id)})
    if not old_doc:
        return False
    
    coll.update_one(
        {"_id": _oid(plan_id)},
        {"$set": {"status": "deleted", "is_active": False, "updated_at": _now()}}
    )
    
    log_audit("kitty_plan", plan_id, "delete", deleted_by, old_value=dict(old_doc))
    return True


# ─── Kitty Enrollments ────────────────────────────────────────────────────────

def enrollment_list(
    status: Optional[str] = None,
    user_phone: Optional[str] = None,
    plan_id: Optional[str] = None,
) -> List[dict]:
    """List enrollments with optional filters.
    
    user_phone is the primary identifier for filtering enrollments.
    """
    coll = get_kitty_enrollments_collection()
    query: Dict[str, Any] = {}
    
    if status:
        query["status"] = status
    if user_phone:
        # Phone is the primary identifier
        query["user_phone"] = user_phone.strip()
    if plan_id:
        query["plan_id"] = plan_id
    
    docs = coll.find(query).sort("created_at", -1)
    return [_str_id(dict(d)) for d in docs]


def enrollment_get(enrollment_id: str) -> Optional[dict]:
    """Get a single enrollment by ID."""
    try:
        doc = get_kitty_enrollments_collection().find_one({"_id": _oid(enrollment_id)})
        return _str_id(dict(doc)) if doc else None
    except Exception:
        return None


def enrollment_get_by_code(code: str) -> Optional[dict]:
    """Get enrollment by enrollment_code."""
    doc = get_kitty_enrollments_collection().find_one({"enrollment_code": code})
    return _str_id(dict(doc)) if doc else None


def enrollment_create(data: dict) -> dict:
    """Create a new enrollment request (status: pending).
    
    user_phone is required as the primary identifier.
    """
    coll = get_kitty_enrollments_collection()
    now = _now()
    
    plan = plan_get(data["plan_id"])
    if not plan:
        raise ValueError("Plan not found")
    
    user_phone = data.get("user_phone", "").strip()
    if not user_phone:
        raise ValueError("Phone number is required")
    
    enrollment_code = _generate_code("EN", "kitty_enrollments")
    
    # Calculate expected amounts
    total_installments = plan["duration_months"]
    monthly_amount = plan["monthly_amount"]
    total_amount = monthly_amount * total_installments
    total_redeemable = plan["total_redeemable"]
    
    doc = {
        "enrollment_code": enrollment_code,
        "plan_id": data["plan_id"],
        "user_phone": user_phone,
        "user_name": data["user_name"],
        "user_email": data.get("user_email", "").lower().strip() if data.get("user_email") else "",
        "status": "pending",
        "start_date": data.get("start_date"),
        "total_installments": total_installments,
        "installments_paid": 0,
        "installments_pending": total_installments,
        "amount_paid": 0,
        "remaining_amount": total_amount,
        "total_redeemable": total_redeemable,
        "next_due_date": None,
        "total_withdrawn": 0,
        "approval_date": None,
        "approved_by": None,
        "rejection_reason": None,
        "notes": data.get("notes", ""),
        "created_at": now,
        "updated_at": now,
    }
    
    result = coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    log_audit("kitty_enrollment", str(result.inserted_id), "create", user_phone)
    
    return _str_id(doc)


def enrollment_approve(enrollment_id: str, approved_by: str, start_date: Optional[str] = None) -> Optional[dict]:
    """Approve a pending enrollment."""
    coll = get_kitty_enrollments_collection()
    
    old_doc = coll.find_one({"_id": _oid(enrollment_id)})
    if not old_doc:
        return None
    
    if old_doc["status"] != "pending":
        raise ValueError(f"Cannot approve enrollment with status: {old_doc['status']}")
    
    now = _now()
    start = start_date or now.strftime("%Y-%m-%d")
    
    # Calculate first due date (next month from start)
    from dateutil.relativedelta import relativedelta
    start_dt = datetime.strptime(start, "%Y-%m-%d")
    next_due = (start_dt + relativedelta(months=1)).strftime("%Y-%m-%d")
    
    update_fields = {
        "status": "active",
        "start_date": start,
        "next_due_date": next_due,
        "approval_date": now.isoformat(),
        "approved_by": approved_by,
        "updated_at": now,
    }
    
    coll.update_one({"_id": _oid(enrollment_id)}, {"$set": update_fields})
    
    new_doc = coll.find_one({"_id": _oid(enrollment_id)})
    log_audit("kitty_enrollment", enrollment_id, "approve", approved_by, old_value=dict(old_doc), new_value=dict(new_doc))
    
    # Create ledger entry for enrollment
    ledger_create({
        "enrollment_id": enrollment_id,
        "transaction_type": "enrollment",
        "amount": 0,
        "description": f"Enrollment approved - {old_doc['enrollment_code']}",
        "recorded_by": approved_by,
    })
    
    return _str_id(dict(new_doc))


def enrollment_reject(enrollment_id: str, rejected_by: str, reason: str) -> Optional[dict]:
    """Reject a pending enrollment."""
    coll = get_kitty_enrollments_collection()
    
    old_doc = coll.find_one({"_id": _oid(enrollment_id)})
    if not old_doc:
        return None
    
    if old_doc["status"] != "pending":
        raise ValueError(f"Cannot reject enrollment with status: {old_doc['status']}")
    
    now = _now()
    update_fields = {
        "status": "rejected",
        "rejection_reason": reason,
        "updated_at": now,
    }
    
    coll.update_one({"_id": _oid(enrollment_id)}, {"$set": update_fields})
    
    new_doc = coll.find_one({"_id": _oid(enrollment_id)})
    log_audit("kitty_enrollment", enrollment_id, "reject", rejected_by, old_value=dict(old_doc), new_value=dict(new_doc))
    
    return _str_id(dict(new_doc))


def enrollment_update_summary(enrollment_id: str):
    """Recalculate enrollment summary from installments and withdrawals."""
    coll = get_kitty_enrollments_collection()
    enrollment = coll.find_one({"_id": _oid(enrollment_id)})
    if not enrollment:
        return
    
    # Get installments
    installments = list(get_kitty_installments_collection().find({
        "enrollment_id": enrollment_id,
        "status": "paid"
    }))
    
    # Get withdrawals
    withdrawals = list(get_kitty_withdrawals_collection().find({
        "enrollment_id": enrollment_id,
        "status": "released"
    }))
    
    installments_paid = len(installments)
    amount_paid = sum(i.get("amount_paid", 0) for i in installments)
    total_withdrawn = sum(w.get("net_amount", 0) for w in withdrawals)
    
    plan = plan_get(enrollment["plan_id"])
    total_installments = plan["duration_months"] if plan else enrollment.get("total_installments", 11)
    monthly_amount = plan["monthly_amount"] if plan else 0
    
    installments_pending = max(0, total_installments - installments_paid)
    remaining_amount = max(0, (monthly_amount * total_installments) - amount_paid)
    
    # Calculate next due date
    next_due_date = None
    if enrollment["status"] == "active" and installments_pending > 0:
        from dateutil.relativedelta import relativedelta
        start = datetime.strptime(enrollment["start_date"], "%Y-%m-%d")
        next_due_date = (start + relativedelta(months=installments_paid + 1)).strftime("%Y-%m-%d")
    
    # Check if completed
    new_status = enrollment["status"]
    if installments_paid >= total_installments and enrollment["status"] == "active":
        new_status = "completed"
    
    coll.update_one(
        {"_id": _oid(enrollment_id)},
        {"$set": {
            "installments_paid": installments_paid,
            "installments_pending": installments_pending,
            "amount_paid": amount_paid,
            "remaining_amount": remaining_amount,
            "total_withdrawn": total_withdrawn,
            "next_due_date": next_due_date,
            "status": new_status,
            "updated_at": _now(),
        }}
    )


def enrollment_cancel(enrollment_id: str, cancelled_by: str, reason: str = "") -> Optional[dict]:
    """Cancel an active enrollment."""
    coll = get_kitty_enrollments_collection()
    
    old_doc = coll.find_one({"_id": _oid(enrollment_id)})
    if not old_doc:
        return None
    
    if old_doc["status"] not in ["active", "pending"]:
        raise ValueError(f"Cannot cancel enrollment with status: {old_doc['status']}")
    
    coll.update_one(
        {"_id": _oid(enrollment_id)},
        {"$set": {"status": "cancelled", "notes": reason, "updated_at": _now()}}
    )
    
    new_doc = coll.find_one({"_id": _oid(enrollment_id)})
    log_audit("kitty_enrollment", enrollment_id, "cancel", cancelled_by, old_value=dict(old_doc), new_value=dict(new_doc))
    
    return _str_id(dict(new_doc))


# ─── Kitty Installments ───────────────────────────────────────────────────────

def installment_list(enrollment_id: Optional[str] = None, status: Optional[str] = None) -> List[dict]:
    """List installments with optional filters."""
    coll = get_kitty_installments_collection()
    query: Dict[str, Any] = {}
    
    if enrollment_id:
        query["enrollment_id"] = enrollment_id
    if status:
        query["status"] = status
    
    docs = coll.find(query).sort([("enrollment_id", 1), ("installment_number", 1)])
    return [_str_id(dict(d)) for d in docs]


def installment_get(installment_id: str) -> Optional[dict]:
    """Get a single installment by ID."""
    try:
        doc = get_kitty_installments_collection().find_one({"_id": _oid(installment_id)})
        return _str_id(dict(doc)) if doc else None
    except Exception:
        return None


def installment_create(data: dict, recorded_by: str) -> dict:
    """Record a new installment payment."""
    coll = get_kitty_installments_collection()
    now = _now()
    
    enrollment = enrollment_get(data["enrollment_id"])
    if not enrollment:
        raise ValueError("Enrollment not found")
    
    if enrollment["status"] != "active":
        raise ValueError(f"Cannot add installment to enrollment with status: {enrollment['status']}")
    
    # Get current installment count
    existing = coll.count_documents({"enrollment_id": data["enrollment_id"]})
    installment_number = existing + 1
    
    plan = plan_get(enrollment["plan_id"])
    default_amount = plan["monthly_amount"] if plan else 0
    
    doc = {
        "enrollment_id": data["enrollment_id"],
        "installment_number": installment_number,
        "due_date": data.get("due_date"),
        "amount_due": float(data.get("amount_due") or default_amount),
        "amount_paid": float(data.get("amount_paid") or default_amount),
        "payment_date": data.get("payment_date") or now.strftime("%Y-%m-%d"),
        "payment_method": data.get("payment_method") or "cash",
        "reference_number": data.get("reference_number") or "",
        "receipt_url": data.get("receipt_url"),
        "status": data.get("status") or "paid",
        "remarks": data.get("remarks") or "",
        "recorded_by": recorded_by,
        "created_at": now,
        "updated_at": now,
    }
    
    result = coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    log_audit("kitty_installment", str(result.inserted_id), "create", recorded_by, new_value=doc)
    
    # Update enrollment summary
    enrollment_update_summary(data["enrollment_id"])
    
    # Create ledger entry
    ledger_create({
        "enrollment_id": data["enrollment_id"],
        "transaction_type": "installment_paid",
        "amount": doc["amount_paid"],
        "description": f"Installment #{installment_number} paid",
        "reference_id": str(result.inserted_id),
        "recorded_by": recorded_by,
    })
    
    return _str_id(doc)


def installment_update(installment_id: str, data: dict, updated_by: str) -> Optional[dict]:
    """Update an installment record."""
    coll = get_kitty_installments_collection()
    
    old_doc = coll.find_one({"_id": _oid(installment_id)})
    if not old_doc:
        return None
    
    update_fields = {}
    allowed = [
        "due_date", "amount_due", "amount_paid", "payment_date",
        "payment_method", "reference_number", "receipt_url", "status", "remarks"
    ]
    
    for key in allowed:
        if key in data and data[key] is not None:
            if key in ["amount_due", "amount_paid"]:
                update_fields[key] = float(data[key])
            else:
                update_fields[key] = data[key]
    
    if not update_fields:
        return _str_id(dict(old_doc))
    
    update_fields["updated_at"] = _now()
    
    coll.update_one({"_id": _oid(installment_id)}, {"$set": update_fields})
    
    new_doc = coll.find_one({"_id": _oid(installment_id)})
    log_audit("kitty_installment", installment_id, "update", updated_by, old_value=dict(old_doc), new_value=dict(new_doc))
    
    # Update enrollment summary
    enrollment_update_summary(old_doc["enrollment_id"])
    
    return _str_id(dict(new_doc))


# ─── Kitty Withdrawals ────────────────────────────────────────────────────────

def withdrawal_list(enrollment_id: Optional[str] = None, status: Optional[str] = None) -> List[dict]:
    """List withdrawals with optional filters."""
    coll = get_kitty_withdrawals_collection()
    query: Dict[str, Any] = {}
    
    if enrollment_id:
        query["enrollment_id"] = enrollment_id
    if status:
        query["status"] = status
    
    docs = coll.find(query).sort("created_at", -1)
    return [_str_id(dict(d)) for d in docs]


def withdrawal_get(withdrawal_id: str) -> Optional[dict]:
    """Get a single withdrawal by ID."""
    try:
        doc = get_kitty_withdrawals_collection().find_one({"_id": _oid(withdrawal_id)})
        return _str_id(dict(doc)) if doc else None
    except Exception:
        return None


def withdrawal_create(data: dict, created_by: str) -> dict:
    """Create a new withdrawal/payout record."""
    coll = get_kitty_withdrawals_collection()
    now = _now()
    
    enrollment = enrollment_get(data["enrollment_id"])
    if not enrollment:
        raise ValueError("Enrollment not found")
    
    withdrawal_code = _generate_code("WD", "kitty_withdrawals")
    
    principal = float(data.get("principal_amount") or 0)
    bonus = float(data.get("bonus_amount") or 0)
    deductions = float(data.get("deductions") or 0)
    net_amount = principal + bonus - deductions
    
    doc = {
        "enrollment_id": data["enrollment_id"],
        "withdrawal_code": withdrawal_code,
        "amount": float(data.get("amount") or net_amount),
        "withdrawal_type": data.get("withdrawal_type") or "full",
        "principal_amount": principal,
        "bonus_amount": bonus,
        "deductions": deductions,
        "net_amount": net_amount,
        "status": "pending",
        "release_date": None,
        "transaction_reference": data.get("transaction_reference") or "",
        "supporting_documents": data.get("supporting_documents") or [],
        "admin_notes": data.get("admin_notes") or "",
        "approved_by": None,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }
    
    result = coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    log_audit("kitty_withdrawal", str(result.inserted_id), "create", created_by, new_value=doc)
    
    return _str_id(doc)


def withdrawal_update_status(withdrawal_id: str, status: str, updated_by: str, **kwargs) -> Optional[dict]:
    """Update withdrawal status (approve, release, reject)."""
    coll = get_kitty_withdrawals_collection()
    
    old_doc = coll.find_one({"_id": _oid(withdrawal_id)})
    if not old_doc:
        return None
    
    now = _now()
    update_fields = {
        "status": status,
        "updated_at": now,
    }
    
    if status == "approved":
        update_fields["approved_by"] = updated_by
    elif status == "released":
        update_fields["release_date"] = now.isoformat()
        update_fields["approved_by"] = updated_by
        if "transaction_reference" in kwargs:
            update_fields["transaction_reference"] = kwargs["transaction_reference"]
    elif status == "rejected":
        if "admin_notes" in kwargs:
            update_fields["admin_notes"] = kwargs["admin_notes"]
    
    coll.update_one({"_id": _oid(withdrawal_id)}, {"$set": update_fields})
    
    new_doc = coll.find_one({"_id": _oid(withdrawal_id)})
    log_audit("kitty_withdrawal", withdrawal_id, f"status_{status}", updated_by, old_value=dict(old_doc), new_value=dict(new_doc))
    
    # If released, update enrollment and create ledger entry
    if status == "released":
        enrollment_update_summary(old_doc["enrollment_id"])
        ledger_create({
            "enrollment_id": old_doc["enrollment_id"],
            "transaction_type": "withdrawal",
            "amount": -new_doc["net_amount"],
            "description": f"Withdrawal released - {new_doc['withdrawal_code']}",
            "reference_id": withdrawal_id,
            "recorded_by": updated_by,
        })
    
    return _str_id(dict(new_doc))


# ─── Kitty Ledger ─────────────────────────────────────────────────────────────

def ledger_list(enrollment_id: str) -> List[dict]:
    """Get ledger entries for an enrollment."""
    coll = get_kitty_ledger_collection()
    docs = coll.find({"enrollment_id": enrollment_id}).sort("created_at", -1)
    return [_str_id(dict(d)) for d in docs]


def ledger_create(data: dict) -> dict:
    """Create a ledger entry."""
    coll = get_kitty_ledger_collection()
    now = _now()
    
    # Calculate running balance
    existing = list(coll.find({"enrollment_id": data["enrollment_id"]}).sort("created_at", -1).limit(1))
    previous_balance = existing[0].get("running_balance", 0) if existing else 0
    running_balance = previous_balance + float(data.get("amount") or 0)
    
    doc = {
        "enrollment_id": data["enrollment_id"],
        "transaction_type": data["transaction_type"],
        "amount": float(data.get("amount") or 0),
        "running_balance": running_balance,
        "description": data.get("description", ""),
        "reference_id": data.get("reference_id"),
        "recorded_by": data.get("recorded_by", "system"),
        "created_at": now,
    }
    
    result = coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    return _str_id(doc)


def ledger_add_adjustment(enrollment_id: str, amount: float, description: str, recorded_by: str, transaction_type: str = "adjustment") -> dict:
    """Add a manual adjustment to the ledger."""
    return ledger_create({
        "enrollment_id": enrollment_id,
        "transaction_type": transaction_type,
        "amount": amount,
        "description": description,
        "recorded_by": recorded_by,
    })


# ─── Statistics / Reports ─────────────────────────────────────────────────────

def get_enrollment_stats() -> dict:
    """Get overall enrollment statistics."""
    coll = get_kitty_enrollments_collection()
    
    total = coll.count_documents({})
    pending = coll.count_documents({"status": "pending"})
    active = coll.count_documents({"status": "active"})
    completed = coll.count_documents({"status": "completed"})
    cancelled = coll.count_documents({"status": "cancelled"})
    
    # Total collected from installments
    installments = list(get_kitty_installments_collection().find({"status": "paid"}))
    total_collected = sum(i.get("amount_paid", 0) for i in installments)
    
    # Total withdrawn
    withdrawals = list(get_kitty_withdrawals_collection().find({"status": "released"}))
    total_withdrawn = sum(w.get("net_amount", 0) for w in withdrawals)
    
    return {
        "total_enrollments": total,
        "pending": pending,
        "active": active,
        "completed": completed,
        "cancelled": cancelled,
        "total_collected": total_collected,
        "total_withdrawn": total_withdrawn,
    }


def get_plan_stats(plan_id: str) -> dict:
    """Get statistics for a specific plan."""
    coll = get_kitty_enrollments_collection()
    
    total = coll.count_documents({"plan_id": plan_id})
    active = coll.count_documents({"plan_id": plan_id, "status": "active"})
    completed = coll.count_documents({"plan_id": plan_id, "status": "completed"})
    
    return {
        "total_enrollments": total,
        "active": active,
        "completed": completed,
    }
