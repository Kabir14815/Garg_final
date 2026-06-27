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


# ─── Pydantic Schemas for Kitty API ──────────────────────────────────────────

class KittyPlanPublicResponse(BaseModel):
    id: str
    plan_code: Optional[str] = None
    name: str
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
    start_date: Optional[str] = None
    notes: Optional[str] = ""


class EnrollmentResponse(BaseModel):
    id: str
    enrollment_code: str
    plan_id: str
    user_email: str
    user_name: str
    user_phone: str = ""
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


def _format_enrollment(e: dict) -> dict:
    """Format enrollment document for response."""
    return {
        "id": e.get("id", ""),
        "enrollment_code": e.get("enrollment_code", ""),
        "plan_id": e.get("plan_id", ""),
        "user_email": e.get("user_email", ""),
        "user_name": e.get("user_name", ""),
        "user_phone": e.get("user_phone", ""),
        "status": e.get("status", "pending"),
        "start_date": e.get("start_date"),
        "total_installments": e.get("total_installments", 11),
        "installments_paid": e.get("installments_paid", 0),
        "installments_pending": e.get("installments_pending", 11),
        "amount_paid": e.get("amount_paid", 0),
        "remaining_amount": e.get("remaining_amount", 0),
        "total_redeemable": e.get("total_redeemable", 0),
        "next_due_date": e.get("next_due_date"),
        "total_withdrawn": e.get("total_withdrawn", 0),
        "approval_date": e.get("approval_date"),
        "approved_by": e.get("approved_by"),
        "rejection_reason": e.get("rejection_reason"),
        "notes": e.get("notes", ""),
        "created_at": _datetime_to_str(e.get("created_at")),
    }


def _format_plan(p: dict) -> dict:
    """Format plan document for response."""
    return {
        "id": p.get("id") or "",
        "plan_code": p.get("plan_code"),
        "name": p.get("name") or "",
        "description": p.get("description") or "",
        "monthly_amount": p.get("monthly_amount") or 0,
        "duration_months": p.get("duration_months") or 11,
        "bonus_months": p.get("bonus_months") or 1,
        "total_redeemable": p.get("total_redeemable") or 0,
        "joining_fee": p.get("joining_fee") or 0,
        "processing_fee": p.get("processing_fee") or 0,
        "late_fee": p.get("late_fee") or 0,
        "start_date": p.get("start_date"),
        "end_date": p.get("end_date"),
        "status": p.get("status") or "active",
        "is_active": p.get("is_active", True),
        "banner_image": p.get("banner_image"),
        "thumbnail_image": p.get("thumbnail_image"),
        "terms_conditions": p.get("terms_conditions") or "",
    }


def _format_installment(i: dict) -> dict:
    """Format installment document for response."""
    return {
        "id": i.get("id", ""),
        "enrollment_id": i.get("enrollment_id", ""),
        "installment_number": i.get("installment_number", 0),
        "due_date": i.get("due_date"),
        "amount_due": i.get("amount_due", 0),
        "amount_paid": i.get("amount_paid", 0),
        "payment_date": i.get("payment_date"),
        "payment_method": i.get("payment_method", "cash"),
        "reference_number": i.get("reference_number", ""),
        "receipt_url": i.get("receipt_url"),
        "status": i.get("status", "pending"),
        "remarks": i.get("remarks", ""),
        "recorded_by": i.get("recorded_by", ""),
        "created_at": _datetime_to_str(i.get("created_at")),
    }


def _format_withdrawal(w: dict) -> dict:
    """Format withdrawal document for response."""
    return {
        "id": w.get("id", ""),
        "enrollment_id": w.get("enrollment_id", ""),
        "withdrawal_code": w.get("withdrawal_code", ""),
        "amount": w.get("amount", 0),
        "withdrawal_type": w.get("withdrawal_type", "full"),
        "principal_amount": w.get("principal_amount", 0),
        "bonus_amount": w.get("bonus_amount", 0),
        "deductions": w.get("deductions", 0),
        "net_amount": w.get("net_amount", 0),
        "status": w.get("status", "pending"),
        "release_date": w.get("release_date"),
        "transaction_reference": w.get("transaction_reference", ""),
        "supporting_documents": w.get("supporting_documents", []),
        "admin_notes": w.get("admin_notes", ""),
        "approved_by": w.get("approved_by"),
        "created_by": w.get("created_by", ""),
        "created_at": _datetime_to_str(w.get("created_at")),
    }


def _format_ledger(l: dict) -> dict:
    """Format ledger entry for response."""
    return {
        "id": l.get("id", ""),
        "enrollment_id": l.get("enrollment_id", ""),
        "transaction_type": l.get("transaction_type", ""),
        "amount": l.get("amount", 0),
        "running_balance": l.get("running_balance", 0),
        "description": l.get("description", ""),
        "reference_id": l.get("reference_id"),
        "recorded_by": l.get("recorded_by", ""),
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
def request_enrollment(body: EnrollmentRequest, user_email: str = Query(...)):
    """Request enrollment in a kitty plan. Requires email auth.
    
    The enrollment starts in 'pending' status and must be approved by admin.
    """
    plan = plan_get(body.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    if not plan.get("is_active") or plan.get("status") != "active":
        raise HTTPException(status_code=400, detail="This plan is not available for enrollment")
    
    # Check if user already has pending/active enrollment in this plan
    existing = enrollment_list(user_email=user_email, plan_id=body.plan_id)
    active_enrollments = [e for e in existing if e["status"] in ["pending", "active"]]
    if active_enrollments:
        raise HTTPException(status_code=400, detail="You already have an active or pending enrollment in this plan")
    
    try:
        enrollment = enrollment_create({
            "plan_id": body.plan_id,
            "user_email": user_email,
            "user_name": body.user_name,
            "user_phone": body.user_phone or "",
            "start_date": body.start_date,
            "notes": body.notes or "",
        })
        return _format_enrollment(enrollment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@public_router.get("/my-enrollments", response_model=List[EnrollmentDetailResponse])
def get_my_enrollments(user_email: str = Query(...)):
    """Get all enrollments for the authenticated user, including plan details."""
    enrollments = enrollment_list(user_email=user_email)
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
def get_enrollment_detail(enrollment_id: str, user_email: Optional[str] = Query(None)):
    """Get enrollment details including installments, withdrawals, and ledger.
    
    If user_email is provided, verifies ownership.
    """
    enrollment = enrollment_get(enrollment_id)
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    # Verify ownership if user_email provided
    if user_email and enrollment.get("user_email", "").lower() != user_email.lower():
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
    user_email: Optional[str] = Query(None),
    plan_id: Optional[str] = Query(None),
):
    """List all enrollments with optional filters."""
    enrollments = enrollment_list(status=status, user_email=user_email, plan_id=plan_id)
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
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    installment = installment_update(installment_id, data, updated_by=admin_email)
    if not installment:
        raise HTTPException(status_code=404, detail="Installment not found")
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
        
        withdrawal = withdrawal_update_status(
            withdrawal_id,
            status=body.status,
            updated_by=admin_email,
            **kwargs
        )
        if not withdrawal:
            raise HTTPException(status_code=404, detail="Withdrawal not found")
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
