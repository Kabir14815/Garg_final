from pydantic import BaseModel
from typing import Optional, List


class ProductBase(BaseModel):
    name: str
    category: str  # gold, silver, diamond, bronze
    weight: float = 0
    making_charges: float = 0
    metal_type: str  # Gold, Silver, Diamond, Bronze
    purity: Optional[str] = None  # 24K, 22K, 18K for gold
    product_type: str = "Ring"  # Ring, Necklace, Chain, etc.
    diamond_weight: Optional[float] = None  # for diamond items
    images: List[str] = []


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


# ─── Kitty Savings Scheme ────────────────────────────────────────────────────

class KittyPlanBase(BaseModel):
    name: str
    monthly_amount: float
    duration_months: int = 11
    bonus_months: int = 1
    description: Optional[str] = None
    is_active: bool = True


class KittyPlanCreate(KittyPlanBase):
    pass


class KittyPlanUpdate(BaseModel):
    name: Optional[str] = None
    monthly_amount: Optional[float] = None
    duration_months: Optional[int] = None
    bonus_months: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


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
    start_date: str  # YYYY-MM-DD
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
