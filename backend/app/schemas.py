from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ProductBase(BaseModel):
    name: str
    category: str  # gold, silver, diamond, bronze (legacy metal bucket)
    weight: float = 0
    making_charges: float = 0
    metal_type: str  # Gold, Silver, Diamond, Bronze
    purity: Optional[str] = None  # 24K, 22K, 18K, 14K for gold
    product_type: str = "Ring"  # Ring, Necklace, Chain, etc.
    diamond_weight: Optional[float] = None  # for diamond items
    images: List[str] = []
    category_id: Optional[str] = None  # leaf node in nested category tree
    category_ancestors: List[str] = []  # path including leaf for filtering


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    weight: Optional[float] = None
    making_charges: Optional[float] = None
    metal_type: Optional[str] = None
    purity: Optional[str] = None
    product_type: Optional[str] = None
    diamond_weight: Optional[float] = None
    images: Optional[List[str]] = None
    category_id: Optional[str] = None
    category_ancestors: Optional[List[str]] = None


class ProductResponse(ProductBase):
    id: str

    class Config:
        from_attributes = True


class MetalRatesResponse(BaseModel):
    gold_24k: float = 6320
    gold_22k: float = 5800
    silver: float = 78
    diamond: float = 52000
    bronze: float = 0


class MetalRatesUpdate(BaseModel):
    gold_24k: Optional[float] = None
    gold_22k: Optional[float] = None
    silver: Optional[float] = None
    diamond: Optional[float] = None
    bronze: Optional[float] = None


# Auth — email/password (admin)
class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class UserResponse(BaseModel):
    email: str
    name: Optional[str] = None
    is_admin: bool = False


# Auth — phone/OTP (customers)
class SendOTPRequest(BaseModel):
    phone: str


class SendOTPResponse(BaseModel):
    message: str
    expires_in: int = 300
    dev_otp: Optional[str] = None   # only set in mock/dev mode


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str


class PhoneUserResponse(BaseModel):
    phone: str
    name: Optional[str] = None
    is_admin: bool = False


# Auth — email/OTP (for Kitty enrollment and user login)
class SendEmailOTPRequest(BaseModel):
    email: str


class SendEmailOTPResponse(BaseModel):
    sent: bool
    message: str
    email: str
    expires_in_seconds: int = 300
    dev_otp: Optional[str] = None  # only set in mock/dev mode


class VerifyEmailOTPRequest(BaseModel):
    email: str
    otp: str


class EmailUserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    is_admin: bool = False
    is_verified: bool = False


# ─── Enhanced Signup/Login (name, phone, email, password + OTP verification) ──

class SignupRequest(BaseModel):
    """Signup step 1: Collect user details and send OTP"""
    name: str
    phone: str
    email: str
    password: str


class SignupResponse(BaseModel):
    """Response after signup initiation - OTP sent"""
    message: str
    email: str
    expires_in_seconds: int = 300
    dev_otp: Optional[str] = None  # only in dev mode


class VerifySignupRequest(BaseModel):
    """Signup step 2: Verify OTP to complete registration"""
    email: str
    otp: str


class VerifySignupResponse(BaseModel):
    """Response after successful signup verification"""
    id: str
    email: str
    name: str
    phone: str
    is_admin: bool = False
    is_verified: bool = True
    message: str = "Account created successfully"


class LoginWithPasswordRequest(BaseModel):
    """Login with email or phone and password"""
    identifier: str  # Can be email or phone number
    password: str


class DirectSignupRequest(BaseModel):
    """Direct signup without OTP - phone required, email optional"""
    name: str
    phone: str
    email: Optional[str] = None
    password: str


class DirectSignupResponse(BaseModel):
    """Response after direct signup"""
    id: str
    email: str
    name: str
    phone: str
    is_admin: bool = False
    is_verified: bool = True


class LoginWithOTPRequest(BaseModel):
    """Login with email and OTP (passwordless)"""
    email: str
    otp: str


class RequestLoginOTPRequest(BaseModel):
    """Request OTP for login"""
    email: str


class FullUserResponse(BaseModel):
    """Full user response with all details"""
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    is_admin: bool = False
    is_verified: bool = True


# ─── Kitty Savings Scheme ────────────────────────────────────────────────────

class KittyPlanBase(BaseModel):
    name: str
    monthly_amount: float
    duration_months: int = 11
    bonus_months: int = 1
    subtitle: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True


class KittyPlanCreate(KittyPlanBase):
    total_redeemable: Optional[float] = None  # Admin can set manually; auto-calculated if not provided


class KittyPlanUpdate(BaseModel):
    name: Optional[str] = None
    monthly_amount: Optional[float] = None
    duration_months: Optional[int] = None
    bonus_months: Optional[int] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    total_redeemable: Optional[float] = None  # Admin can override the calculated value


class KittyPlanResponse(KittyPlanBase):
    id: str
    total_redeemable: float


class KittyPayment(BaseModel):
    month: str       # YYYY-MM
    paid_at: str     # ISO datetime string
    amount: float
    note: Optional[str] = None


class KittyMemberBase(BaseModel):
    plan_id: str
    name: str
    phone: str
    email: Optional[str] = None
    start_date: Optional[str] = None  # YYYY-MM-DD
    notes: Optional[str] = None


class KittyMemberCreate(KittyMemberBase):
    pass


class KittyMemberUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None         # active | completed | cancelled
    redemption_date: Optional[str] = None


class KittyAddPayment(BaseModel):
    month: str        # YYYY-MM, e.g. "2026-06"
    amount: Optional[float] = None       # defaults to plan monthly_amount
    note: Optional[str] = None


class KittyMemberResponse(KittyMemberBase):
    id: str
    status: str                          # active | completed | cancelled
    payments: List[KittyPayment] = []
    redemption_date: Optional[str] = None
    payments_made: int = 0
    plan_duration: int = 11


# ─── User Dashboard ───────────────────────────────────────────────────────────

class KittyMemberWithPlan(KittyMemberResponse):
    """Member record enriched with the full plan details for the dashboard."""
    plan: Optional[KittyPlanResponse] = None
    total_saved: float = 0
    total_redeemable: float = 0


# ─── Push notifications ───────────────────────────────────────────────────────

class DeviceRegisterRequest(BaseModel):
    token: str
    platform: str = "unknown"  # android | ios
    user_id: Optional[str] = None
    user_email: Optional[str] = None


class DeviceRegisterResponse(BaseModel):
    ok: bool = True
    token: str


class DeviceUnregisterRequest(BaseModel):
    token: str


class SendNotificationRequest(BaseModel):
    title: str
    body: str
    audience: str = "all"  # all | kitty
    image_url: Optional[str] = None
    deep_link_type: str = "home"  # home | shop | rates | kitty | product
    product_id: Optional[str] = None


class SendNotificationResponse(BaseModel):
    ok: bool = True
    id: str
    fcm_message_id: Optional[str] = None
    audience: str = "all"
    device_count: int = 0


class NotificationLogResponse(BaseModel):
    id: str
    title: str
    body: str
    audience: str = "all"
    image_url: Optional[str] = None
    data: Dict[str, Any] = {}
    sent_by: str = ""
    fcm_message_id: Optional[str] = None
    status: str = "sent"
    error: Optional[str] = None
    created_at: str = ""


class NotificationListResponse(BaseModel):
    device_count: int = 0
    items: List[NotificationLogResponse] = []
