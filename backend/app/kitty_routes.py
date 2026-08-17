"""Kitty Management API Routes - Plans, Enrollments, Installments, Withdrawals, Ledger."""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.kitty_store import (
    plan_list, plan_list_public, plan_get, plan_create, plan_update, plan_delete,
    enrollment_list, enrollment_get, enrollment_create, enrollment_approve, enrollment_reject,
    enrollment_cancel, enrollment_update_summary,
    installment_list, installment_get, installment_create, installment_update,
    withdrawal_list, withdrawal_get, withdrawal_create, withdrawal_update_status,
    ledger_list, ledger_add_adjustment,
    get_enrollment_stats, get_plan_stats,
)
from app.user_notification_service import (
    notify_enrollment,
    notify_installment,
    notify_withdrawal,
)


def _safe_notify(callback, *args) -> None:
    try:
        callback(*args)
    except Exception as exc:
        print(f"⚠ Customer notification could not be created: {exc}")


# ─── Pydantic Schemas for Kitty API ──────────────────────────────────────────

class KittyPlanPublicResponse(BaseModel):
    id: str
    plan_code: Optional[str] = None
    name: str
    subtitle: str = ""
    description: str = ""
    monthly_amount: float
    duration_months: int = 11
    bonus_months: int = 1
    total_redeemable: float
    joining_fee: float = 0
    processing_fee: float = 0
    late_fee: float = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "active"
    is_active: bool = True
    banner_image: Optional[str] = None
    thumbnail_image: Optional[str] = None
    terms_conditions: str = ""


class KittyPlanAdminCreate(BaseModel):
    name: str
    monthly_amount: float
    duration_months: int = 11
    bonus_months: int = 1
    subtitle: Optional[str] = ""
    description: Optional[str] = ""
    plan_code: Optional[str] = None
    joining_fee: float = 0
    processing_fee: float = 0
    late_fee: float = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "active"
    is_active: bool = True
    banner_image: Optional[str] = None
    thumbnail_image: Optional[str] = None
    terms_conditions: Optional[str] = ""


class KittyPlanAdminUpdate(BaseModel):
    name: Optional[str] = None
    monthly_amount: Optional[float] = None
    duration_months: Optional[int] = None
    bonus_months: Optional[int] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    plan_code: Optional[str] = None
    joining_fee: Optional[float] = None
    processing_fee: Optional[float] = None
    late_fee: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    banner_image: Optional[str] = None
    thumbnail_image: Optional[str] = None
    terms_conditions: Optional[str] = None


class EnrollmentRequest(BaseModel):
    plan_id: str
    user_name: str
    user_phone: Optional[str] = ""
    user_email: Optional[str] = ""  # Optional - phone is primary identifier
    start_date: Optional[str] = None
    notes: Optional[str] = ""


class EnrollmentResponse(BaseModel):
    id: str
    enrollment_code: str
    plan_id: str
    user_phone: str
    user_name: str
    user_email: str = ""  # Optional - phone is primary identifier
    status: str
    start_date: Optional[str] = None
    total_installments: int
    installments_paid: int = 0
    installments_pending: int
    amount_paid: float = 0
    remaining_amount: float
    total_redeemable: float
    next_due_date: Optional[str] = None
    total_withdrawn: float = 0
    approval_date: Optional[str] = None
    approved_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    notes: str = ""
    created_at: Optional[str] = None


class EnrollmentDetailResponse(EnrollmentResponse):
    plan: Optional[KittyPlanPublicResponse] = None
    installments: List[dict] = []
    withdrawals: List[dict] = []
    ledger: List[dict] = []


class InstallmentCreate(BaseModel):
    enrollment_id: str
    due_date: Optional[str] = None
    amount_due: Optional[float] = None
    amount_paid: Optional[float] = None
    payment_date: Optional[str] = None
    payment_method: str = "cash"
    reference_number: str = ""
    receipt_url: Optional[str] = None
    remarks: str = ""
    status: str = "paid"


class InstallmentUpdate(BaseModel):
    due_date: Optional[str] = None
    amount_due: Optional[float] = None
    amount_paid: Optional[float] = None
    payment_date: Optional[str] = None
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    receipt_url: Optional[str] = None
    remarks: Optional[str] = None
    status: Optional[str] = None


class InstallmentResponse(BaseModel):
    id: str
    enrollment_id: str
    installment_number: int
    due_date: Optional[str] = None
    amount_due: float
    amount_paid: float
    payment_date: Optional[str] = None
    payment_method: str = "cash"
    reference_number: str = ""
    receipt_url: Optional[str] = None
    status: str
    remarks: str = ""
    recorded_by: str = ""
    created_at: Optional[str] = None


class WithdrawalCreate(BaseModel):
    enrollment_id: str
    amount: Optional[float] = None
    withdrawal_type: str = "full"
    principal_amount: float = 0
    bonus_amount: float = 0
    deductions: float = 0
    transaction_reference: str = ""
    supporting_documents: List[str] = []
    admin_notes: str = ""


class WithdrawalStatusUpdate(BaseModel):
    status: str  # approved, released, rejected
    transaction_reference: Optional[str] = None
    admin_notes: Optional[str] = None


class WithdrawalResponse(BaseModel):
    id: str
    enrollment_id: str
    withdrawal_code: str
    amount: float
    withdrawal_type: str
    principal_amount: float
    bonus_amount: float
    deductions: float
    net_amount: float
    status: str
    release_date: Optional[str] = None
    transaction_reference: str = ""
    supporting_documents: List[str] = []
    admin_notes: str = ""
    approved_by: Optional[str] = None
    created_by: str = ""
    created_at: Optional[str] = None


class LedgerAdjustment(BaseModel):
    enrollment_id: str
    amount: float
    description: str
    transaction_type: str = "adjustment"


class LedgerEntryResponse(BaseModel):
    id: str
    enrollment_id: str
    transaction_type: str
    amount: float
    running_balance: float
    description: str = ""
    reference_id: Optional[str] = None
    recorded_by: str = ""
    created_at: Optional[str] = None


class EnrollmentStatsResponse(BaseModel):
    total_enrollments: int
    pending: int
    active: int
    completed: int
    cancelled: int
    total_collected: float
    total_withdrawn: float


class ApprovalRequest(BaseModel):
    start_date: Optional[str] = None


class RejectionRequest(BaseModel):
    reason: str


# ─── Helper Functions ─────────────────────────────────────────────────────────

def _datetime_to_str(dt) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


def _s(d: dict, key: str, default: str = "") -> str:
    """Return a string, treating missing or null values as default."""
    v = d.get(key)
    return default if v is None else str(v)


def _n(d: dict, key: str, default: float = 0):
    """Return a number, treating missing or null values as default."""
    v = d.get(key)
    return default if v is None else v


def _format_enrollment(e: dict) -> dict:
    """Format enrollment document for response."""
    return {
        "id": _s(e, "id"),
        "enrollment_code": _s(e, "enrollment_code"),
        "plan_id": _s(e, "plan_id"),
        "user_phone": _s(e, "user_phone"),
        "user_name": _s(e, "user_name"),
        "user_email": _s(e, "user_email"),
        "status": _s(e, "status", "pending"),
        "start_date": e.get("start_date"),
        "total_installments": int(_n(e, "total_installments", 11)),
        "installments_paid": int(_n(e, "installments_paid", 0)),
        "installments_pending": int(_n(e, "installments_pending", 11)),
        "amount_paid": float(_n(e, "amount_paid", 0)),
        "remaining_amount": float(_n(e, "remaining_amount", 0)),
        "total_redeemable": float(_n(e, "total_redeemable", 0)),
        "next_due_date": e.get("next_due_date"),
        "total_withdrawn": float(_n(e, "total_withdrawn", 0)),
        "approval_date": e.get("approval_date"),
        "approved_by": e.get("approved_by"),
        "rejection_reason": e.get("rejection_reason"),
        "notes": _s(e, "notes"),
        "created_at": _datetime_to_str(e.get("created_at")),
    }


def _format_plan(p: dict) -> dict:
    """Format plan document for response."""
    return {
        "id": _s(p, "id"),
        "plan_code": p.get("plan_code"),
        "name": _s(p, "name"),
        "subtitle": _s(p, "subtitle"),
        "description": _s(p, "description"),
        "monthly_amount": float(_n(p, "monthly_amount", 0)),
        "duration_months": int(_n(p, "duration_months", 11)),
        "bonus_months": int(_n(p, "bonus_months", 1)),
        "total_redeemable": float(_n(p, "total_redeemable", 0)),
        "joining_fee": float(_n(p, "joining_fee", 0)),
        "processing_fee": float(_n(p, "processing_fee", 0)),
        "late_fee": float(_n(p, "late_fee", 0)),
        "start_date": p.get("start_date"),
        "end_date": p.get("end_date"),
        "status": _s(p, "status", "active"),
        "is_active": bool(p["is_active"]) if p.get("is_active") is not None else True,
        "banner_image": p.get("banner_image"),
        "thumbnail_image": p.get("thumbnail_image"),
        "terms_conditions": _s(p, "terms_conditions"),
    }


def _format_installment(i: dict) -> dict:
    """Format installment document for response."""
    return {
        "id": _s(i, "id"),
        "enrollment_id": _s(i, "enrollment_id"),
        "installment_number": int(_n(i, "installment_number", 0)),
        "due_date": i.get("due_date"),
        "amount_due": float(_n(i, "amount_due", 0)),
        "amount_paid": float(_n(i, "amount_paid", 0)),
        "payment_date": i.get("payment_date"),
        "payment_method": _s(i, "payment_method", "cash"),
        "reference_number": _s(i, "reference_number"),
        "receipt_url": i.get("receipt_url"),
        "status": _s(i, "status", "pending"),
        "remarks": _s(i, "remarks"),
        "recorded_by": _s(i, "recorded_by"),
        "created_at": _datetime_to_str(i.get("created_at")),
    }


def _format_withdrawal(w: dict) -> dict:
    """Format withdrawal document for response."""
    return {
        "id": _s(w, "id"),
        "enrollment_id": _s(w, "enrollment_id"),
        "withdrawal_code": _s(w, "withdrawal_code"),
        "amount": float(_n(w, "amount", 0)),
        "withdrawal_type": _s(w, "withdrawal_type", "full"),
        "principal_amount": float(_n(w, "principal_amount", 0)),
        "bonus_amount": float(_n(w, "bonus_amount", 0)),
        "deductions": float(_n(w, "deductions", 0)),
        "net_amount": float(_n(w, "net_amount", 0)),
        "status": _s(w, "status", "pending"),
        "release_date": w.get("release_date"),
        "transaction_reference": _s(w, "transaction_reference"),
        "supporting_documents": w.get("supporting_documents") or [],
        "admin_notes": _s(w, "admin_notes"),
        "approved_by": w.get("approved_by"),
        "created_by": _s(w, "created_by"),
        "created_at": _datetime_to_str(w.get("created_at")),
    }


def _format_ledger(l: dict) -> dict:
    """Format ledger entry for response."""
    return {
        "id": _s(l, "id"),
        "enrollment_id": _s(l, "enrollment_id"),
        "transaction_type": _s(l, "transaction_type"),
        "amount": float(_n(l, "amount", 0)),
        "running_balance": float(_n(l, "running_balance", 0)),
        "description": _s(l, "description"),
        "reference_id": l.get("reference_id"),
        "recorded_by": _s(l, "recorded_by"),
        "created_at": _datetime_to_str(l.get("created_at")),
    }


# ─── Routers ──────────────────────────────────────────────────────────────────

public_router = APIRouter(prefix="/api/kitty", tags=["kitty-public"])
admin_router = APIRouter(prefix="/api/admin/kitty", tags=["kitty-admin"])


# ─── Public Endpoints ─────────────────────────────────────────────────────────

@public_router.get("/plans", response_model=List[KittyPlanPublicResponse])
def get_public_plans():
    """List all active kitty plans for public view."""
    plans = plan_list_public()
    return [_format_plan(p) for p in plans]


@public_router.get("/plans/{plan_id}", response_model=KittyPlanPublicResponse)
def get_public_plan(plan_id: str):
    """Get a single plan details."""
    p = plan_get(plan_id)
    if not p:
        raise HTTPException(status_code=404, detail="Plan not found")
    return _format_plan(p)


@public_router.post("/enroll", response_model=EnrollmentResponse)
def request_enrollment(body: EnrollmentRequest, user_phone: str = Query(...)):
    """Request enrollment in a kitty plan. Requires phone auth.
    
    The enrollment starts in 'pending' status and must be approved by admin.
    """
    plan = plan_get(body.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    if not plan.get("is_active") or plan.get("status") != "active":
        raise HTTPException(status_code=400, detail="This plan is not available for enrollment")
    
    # Check if user already has pending/active enrollment in this plan
    existing = enrollment_list(user_phone=user_phone, plan_id=body.plan_id)
    active_enrollments = [e for e in existing if e["status"] in ["pending", "active"]]
    if active_enrollments:
        raise HTTPException(status_code=400, detail="You already have an active or pending enrollment in this plan")
    
    try:
        enrollment = enrollment_create({
            "plan_id": body.plan_id,
            "user_phone": user_phone,
            "user_name": body.user_name,
            "user_email": body.user_email or "",
            "start_date": body.start_date,
            "notes": body.notes or "",
        })
        _safe_notify(notify_enrollment, enrollment, "submitted")
        return _format_enrollment(enrollment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@public_router.get("/my-enrollments", response_model=List[EnrollmentDetailResponse])
def get_my_enrollments(user_phone: str = Query(...)):
    """Get all enrollments for the authenticated user, including plan details."""
    enrollments = enrollment_list(user_phone=user_phone)
    result = []
    for e in enrollments:
        formatted = _format_enrollment(e)
        # Include plan details for each enrollment
        plan = plan_get(e.get("plan_id", ""))
        formatted["plan"] = _format_plan(plan) if plan else None
        formatted["installments"] = []
        formatted["withdrawals"] = []
        formatted["ledger"] = []
        result.append(formatted)
    return result


@public_router.get("/enrollments/{enrollment_id}", response_model=EnrollmentDetailResponse)
def get_enrollment_detail(enrollment_id: str, user_phone: Optional[str] = Query(None)):
    """Get enrollment details including installments, withdrawals, and ledger.
    
    If user_phone is provided, verifies ownership.
    """
    enrollment = enrollment_get(enrollment_id)
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    # Verify ownership if user_phone provided
    if user_phone and enrollment.get("user_phone", "") != user_phone:
        raise HTTPException(status_code=403, detail="Not authorized to view this enrollment")
    
    # Get related data
    plan = plan_get(enrollment.get("plan_id", ""))
    installments = installment_list(enrollment_id=enrollment_id)
    withdrawals = withdrawal_list(enrollment_id=enrollment_id)
    ledger = ledger_list(enrollment_id)
    
    result = _format_enrollment(enrollment)
    result["plan"] = _format_plan(plan) if plan else None
    result["installments"] = [_format_installment(i) for i in installments]
    result["withdrawals"] = [_format_withdrawal(w) for w in withdrawals]
    result["ledger"] = [_format_ledger(l) for l in ledger]
    
    return result


# ─── Admin Plan Endpoints ─────────────────────────────────────────────────────

@admin_router.get("/plans", response_model=List[KittyPlanPublicResponse])
def admin_list_plans(include_inactive: bool = Query(False)):
    """List all plans including inactive ones."""
    plans = plan_list(include_inactive=include_inactive)
    return [_format_plan(p) for p in plans]


@admin_router.post("/plans", response_model=KittyPlanPublicResponse)
def admin_create_plan(body: KittyPlanAdminCreate, admin_email: str = Query("admin")):
    """Create a new kitty plan."""
    try:
        plan = plan_create(body.model_dump(), created_by=admin_email)
        return _format_plan(plan)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@admin_router.put("/plans/{plan_id}", response_model=KittyPlanPublicResponse)
def admin_update_plan(plan_id: str, body: KittyPlanAdminUpdate, admin_email: str = Query("admin")):
    """Update a kitty plan."""
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    plan = plan_update(plan_id, data, updated_by=admin_email)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return _format_plan(plan)


@admin_router.delete("/plans/{plan_id}", status_code=204)
def admin_delete_plan(plan_id: str, admin_email: str = Query("admin")):
    """Soft delete a kitty plan (set status to deleted)."""
    if not plan_delete(plan_id, deleted_by=admin_email):
        raise HTTPException(status_code=404, detail="Plan not found")
    return None


# ─── Admin Enrollment Endpoints ───────────────────────────────────────────────

@admin_router.get("/enrollments", response_model=List[EnrollmentResponse])
def admin_list_enrollments(
    status: Optional[str] = Query(None),
    user_phone: Optional[str] = Query(None),
    plan_id: Optional[str] = Query(None),
):
    """List all enrollments with optional filters."""
    enrollments = enrollment_list(status=status, user_phone=user_phone, plan_id=plan_id)
    return [_format_enrollment(e) for e in enrollments]


@admin_router.get("/enrollments/stats", response_model=EnrollmentStatsResponse)
def admin_enrollment_stats():
    """Get enrollment statistics."""
    return get_enrollment_stats()


@admin_router.get("/enrollments/{enrollment_id}", response_model=EnrollmentDetailResponse)
def admin_get_enrollment(enrollment_id: str):
    """Get enrollment details for admin."""
    enrollment = enrollment_get(enrollment_id)
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    plan = plan_get(enrollment.get("plan_id", ""))
    installments = installment_list(enrollment_id=enrollment_id)
    withdrawals = withdrawal_list(enrollment_id=enrollment_id)
    ledger = ledger_list(enrollment_id)
    
    result = _format_enrollment(enrollment)
    result["plan"] = _format_plan(plan) if plan else None
    result["installments"] = [_format_installment(i) for i in installments]
    result["withdrawals"] = [_format_withdrawal(w) for w in withdrawals]
    result["ledger"] = [_format_ledger(l) for l in ledger]
    
    return result


@admin_router.put("/enrollments/{enrollment_id}/approve", response_model=EnrollmentResponse)
def admin_approve_enrollment(
    enrollment_id: str,
    body: ApprovalRequest,
    admin_email: str = Query("admin"),
):
    """Approve a pending enrollment."""
    try:
        enrollment = enrollment_approve(
            enrollment_id,
            approved_by=admin_email,
            start_date=body.start_date,
        )
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        _safe_notify(notify_enrollment, enrollment, "approved")
        return _format_enrollment(enrollment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@admin_router.put("/enrollments/{enrollment_id}/reject", response_model=EnrollmentResponse)
def admin_reject_enrollment(
    enrollment_id: str,
    body: RejectionRequest,
    admin_email: str = Query("admin"),
):
    """Reject a pending enrollment."""
    try:
        enrollment = enrollment_reject(
            enrollment_id,
            rejected_by=admin_email,
            reason=body.reason,
        )
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        _safe_notify(notify_enrollment, enrollment, "rejected")
        return _format_enrollment(enrollment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@admin_router.put("/enrollments/{enrollment_id}/cancel", response_model=EnrollmentResponse)
def admin_cancel_enrollment(
    enrollment_id: str,
    body: RejectionRequest,
    admin_email: str = Query("admin"),
):
    """Cancel an active enrollment."""
    try:
        enrollment = enrollment_cancel(
            enrollment_id,
            cancelled_by=admin_email,
            reason=body.reason,
        )
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        _safe_notify(notify_enrollment, enrollment, "cancelled")
        return _format_enrollment(enrollment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Admin Installment Endpoints ──────────────────────────────────────────────

@admin_router.get("/installments", response_model=List[InstallmentResponse])
def admin_list_installments(
    enrollment_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    """List all installments with optional filters."""
    installments = installment_list(enrollment_id=enrollment_id, status=status)
    return [_format_installment(i) for i in installments]


@admin_router.post("/installments", response_model=InstallmentResponse)
def admin_create_installment(
    body: InstallmentCreate,
    admin_email: str = Query("admin"),
):
    """Record a new installment payment."""
    try:
        installment = installment_create(body.model_dump(), recorded_by=admin_email)
        enrollment = enrollment_get(body.enrollment_id)
        if enrollment and installment.get("status") == "paid":
            _safe_notify(notify_installment, installment, enrollment)
        return _format_installment(installment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@admin_router.put("/installments/{installment_id}", response_model=InstallmentResponse)
def admin_update_installment(
    installment_id: str,
    body: InstallmentUpdate,
    admin_email: str = Query("admin"),
):
    """Update an installment record."""
    previous = installment_get(installment_id)
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    installment = installment_update(installment_id, data, updated_by=admin_email)
    if not installment:
        raise HTTPException(status_code=404, detail="Installment not found")
    if (
        installment.get("status") == "paid"
        and (not previous or previous.get("status") != "paid")
    ):
        enrollment = enrollment_get(installment.get("enrollment_id", ""))
        if enrollment:
            _safe_notify(notify_installment, installment, enrollment)
    return _format_installment(installment)


# ─── Admin Withdrawal Endpoints ───────────────────────────────────────────────

@admin_router.get("/withdrawals", response_model=List[WithdrawalResponse])
def admin_list_withdrawals(
    enrollment_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    """List all withdrawals with optional filters."""
    withdrawals = withdrawal_list(enrollment_id=enrollment_id, status=status)
    return [_format_withdrawal(w) for w in withdrawals]


@admin_router.post("/withdrawals", response_model=WithdrawalResponse)
def admin_create_withdrawal(
    body: WithdrawalCreate,
    admin_email: str = Query("admin"),
):
    """Create a new withdrawal/payout record."""
    try:
        withdrawal = withdrawal_create(body.model_dump(), created_by=admin_email)
        enrollment = enrollment_get(body.enrollment_id)
        if enrollment:
            _safe_notify(notify_withdrawal, withdrawal, enrollment, "created")
        return _format_withdrawal(withdrawal)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@admin_router.put("/withdrawals/{withdrawal_id}", response_model=WithdrawalResponse)
def admin_update_withdrawal_status(
    withdrawal_id: str,
    body: WithdrawalStatusUpdate,
    admin_email: str = Query("admin"),
):
    """Update withdrawal status (approve, release, reject)."""
    try:
        kwargs = {}
        if body.transaction_reference:
            kwargs["transaction_reference"] = body.transaction_reference
        if body.admin_notes:
            kwargs["admin_notes"] = body.admin_notes
        
        previous = withdrawal_get(withdrawal_id)
        withdrawal = withdrawal_update_status(
            withdrawal_id,
            status=body.status,
            updated_by=admin_email,
            **kwargs
        )
        if not withdrawal:
            raise HTTPException(status_code=404, detail="Withdrawal not found")
        if not previous or previous.get("status") != withdrawal.get("status"):
            enrollment = enrollment_get(withdrawal.get("enrollment_id", ""))
            if enrollment:
                _safe_notify(
                    notify_withdrawal,
                    withdrawal,
                    enrollment,
                    str(withdrawal.get("status") or ""),
                )
        return _format_withdrawal(withdrawal)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Admin Ledger Endpoints ───────────────────────────────────────────────────

@admin_router.get("/ledger/{enrollment_id}", response_model=List[LedgerEntryResponse])
def admin_get_ledger(enrollment_id: str):
    """Get ledger entries for an enrollment."""
    enrollment = enrollment_get(enrollment_id)
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    entries = ledger_list(enrollment_id)
    return [_format_ledger(l) for l in entries]


@admin_router.post("/ledger/adjustment", response_model=LedgerEntryResponse)
def admin_add_ledger_adjustment(
    body: LedgerAdjustment,
    admin_email: str = Query("admin"),
):
    """Add a manual adjustment to the ledger."""
    enrollment = enrollment_get(body.enrollment_id)
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    entry = ledger_add_adjustment(
        enrollment_id=body.enrollment_id,
        amount=body.amount,
        description=body.description,
        recorded_by=admin_email,
        transaction_type=body.transaction_type,
    )
    return _format_ledger(entry)
