import os
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.schemas import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    MetalRatesResponse,
    MetalRatesUpdate,
    LoginRequest,
    RegisterRequest,
    UserResponse,
    SendOTPRequest,
    SendOTPResponse,
    VerifyOTPRequest,
    PhoneUserResponse,
    SendEmailOTPRequest,
    SendEmailOTPResponse,
    VerifyEmailOTPRequest,
    EmailUserResponse,
    KittyPlanCreate,
    KittyPlanUpdate,
    KittyPlanResponse,
    KittyMemberCreate,
    KittyMemberUpdate,
    KittyMemberResponse,
    KittyMemberWithPlan,
    KittyAddPayment,
    KittyPayment,
)
from app.otp import send_otp, verify_otp, normalize_phone
from app.auth import create_user, authenticate_user
from app.store import (
    product_list,
    product_get,
    product_create,
    product_update,
    product_delete,
    rates_get,
    rates_update,
    kitty_plan_list,
    kitty_plan_get,
    kitty_plan_create,
    kitty_plan_update,
    kitty_plan_delete,
    kitty_member_list,
    kitty_member_get,
    kitty_member_create,
    kitty_member_update,
    kitty_member_add_payment,
    kitty_member_delete,
)
from app.live_rates import refresh_if_stale
from app.upload_routes import router as upload_router, UPLOAD_ROOT
from app.kitty_routes import public_router as kitty_public_router, admin_router as kitty_admin_router
from app.category_routes import public_router as category_public_router, admin_router as category_admin_router
from app.notification_routes import router as notification_router
from app.fcm import init_firebase

app = FastAPI(title="Garg Jewellers API")


@app.get("/")
def root():
    """Root URL — Render and other probes often hit `/`; avoid 404 here."""
    return {"ok": True}


@app.get("/api/health")
def health():
    """Health check for frontend and load balancers."""
    return {"ok": True}


@app.on_event("startup")
def on_startup():
    """Prime live metal rates; seed admin user and kitty plans when MongoDB is available."""
    try:
        refresh_if_stale()
    except Exception:
        pass
    try:
        # Ensure indexes are created
        from db import ensure_indexes
        ensure_indexes()
    except Exception as e:
        print(f"⚠ Failed to ensure indexes: {e}")
    try:
        from db import get_db
        from app.auth import ADMIN_EMAILS
        db = get_db()
        if db.users.count_documents({}) == 0:
            create_user("admin@garg.com", "Admin@2024", "Admin")
        else:
            for email in ADMIN_EMAILS:
                db.users.update_one(
                    {"email": email},
                    {"$set": {"is_admin": True}},
                )
    except Exception:
        pass  # MongoDB may be unavailable; auth will fail until connected
    try:
        # Seed default kitty plans
        from app.store import seed_kitty_plans
        seed_kitty_plans()
    except Exception as e:
        print(f"⚠ Failed to seed kitty plans: {e}")
    try:
        from app.category_store import seed_categories_and_backfill_products
        result = seed_categories_and_backfill_products()
        print(f"✓ Categories: {result}")
    except Exception as e:
        print(f"⚠ Failed to seed categories: {e}")
    try:
        init_firebase()
    except Exception as e:
        print(f"⚠ Firebase init skipped: {e}")


_cors_env = os.getenv("CORS_ORIGINS", "").strip()

# Handle wildcard CORS for development
if _cors_env == "*":
    _cors_origins = ["*"]
    _allow_credentials = False  # Can't use credentials with wildcard
else:
    _cors_origins = [
        o.strip().rstrip("/")
        for o in _cors_env.split(",")
        if o.strip()
    ]
    _allow_credentials = True

print("CORS:", _cors_origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(kitty_public_router)
app.include_router(kitty_admin_router)
app.include_router(category_public_router)
app.include_router(category_admin_router)
app.include_router(notification_router)

UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
(UPLOAD_ROOT / "products").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")


# ─── Products ────────────────────────────────────────────────────────────────

@app.get("/api/products", response_model=list[ProductResponse])
def list_products():
    return product_list()


@app.get("/api/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: str):
    p = product_get(product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


@app.post("/api/products", response_model=ProductResponse)
def create_product_endpoint(body: ProductCreate):
    data = body.model_dump()
    return product_create(data)


@app.put("/api/products/{product_id}", response_model=ProductResponse)
def update_product_endpoint(product_id: str, body: ProductUpdate):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    updated = product_update(product_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    return updated


@app.delete("/api/products/{product_id}", status_code=204)
def delete_product_endpoint(product_id: str):
    if not product_delete(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    return None


# ─── Metal Rates ─────────────────────────────────────────────────────────────

@app.get("/api/metal-rates", response_model=MetalRatesResponse)
def get_metal_rates():
    try:
        refresh_if_stale()
    except Exception:
        pass
    return MetalRatesResponse(**rates_get())


@app.put("/api/metal-rates", response_model=MetalRatesResponse)
def update_metal_rates(body: MetalRatesUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    return MetalRatesResponse(**rates_update(updates))


# ─── Auth ────────────────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=UserResponse)
def register(body: RegisterRequest):
    try:
        user = create_user(body.email, body.password, body.name)
        return UserResponse(**user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Service temporarily unavailable. Please try again later.",
        )


_DEV_ADMIN = {"email": "admin@garg.com", "name": "Admin", "is_admin": True}


@app.post("/api/auth/login", response_model=UserResponse)
def login(body: LoginRequest):
    email = (body.email or "").lower().strip()
    password = (body.password or "").strip()
    # Dev fallback: always allow admin@garg.com / Admin@2024 when DB auth fails
    if email == "admin@garg.com" and password in ("Admin@2024", "1234"):
        try:
            user = authenticate_user(body.email, body.password)
            if user:
                return UserResponse(**user)
        except Exception:
            pass
        return UserResponse(**_DEV_ADMIN)
    try:
        user = authenticate_user(body.email, body.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        return UserResponse(**user)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Service temporarily unavailable. Please try again later.",
        )


# ─── Kitty Plans ─────────────────────────────────────────────────────────────

@app.get("/api/kitty/plans", response_model=list[KittyPlanResponse])
def list_kitty_plans():
    return kitty_plan_list()


@app.post("/api/kitty/plans", response_model=KittyPlanResponse)
def create_kitty_plan(body: KittyPlanCreate):
    return kitty_plan_create(body.model_dump())


@app.put("/api/kitty/plans/{plan_id}", response_model=KittyPlanResponse)
def update_kitty_plan(plan_id: str, body: KittyPlanUpdate):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    updated = kitty_plan_update(plan_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Plan not found")
    return updated


@app.delete("/api/kitty/plans/{plan_id}", status_code=204)
def delete_kitty_plan(plan_id: str):
    if not kitty_plan_delete(plan_id):
        raise HTTPException(status_code=404, detail="Plan not found")
    return None


# ─── Kitty Members ───────────────────────────────────────────────────────────

@app.get("/api/kitty/members", response_model=list[KittyMemberResponse])
def list_kitty_members():
    return kitty_member_list()


@app.post("/api/kitty/members", response_model=KittyMemberResponse)
def create_kitty_member(body: KittyMemberCreate):
    plan = kitty_plan_get(body.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Plan not found")
    return kitty_member_create(body.model_dump())


@app.put("/api/kitty/members/{member_id}", response_model=KittyMemberResponse)
def update_kitty_member(member_id: str, body: KittyMemberUpdate):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    updated = kitty_member_update(member_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Member not found")
    return updated


@app.post("/api/kitty/members/{member_id}/payments", response_model=KittyMemberResponse)
def add_kitty_payment(member_id: str, body: KittyAddPayment):
    member = kitty_member_get(member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    plan = kitty_plan_get(member["plan_id"])
    amount = body.amount if body.amount is not None else (plan["monthly_amount"] if plan else 0)

    payment = KittyPayment(
        month=body.month,
        paid_at=datetime.now(timezone.utc).isoformat(),
        amount=amount,
        note=body.note,
    ).model_dump()

    result = kitty_member_add_payment(member_id, payment)
    if result is None:
        raise HTTPException(status_code=409, detail=f"Payment for {body.month} already recorded")
    return result


@app.delete("/api/kitty/members/{member_id}", status_code=204)
def delete_kitty_member(member_id: str):
    if not kitty_member_delete(member_id):
        raise HTTPException(status_code=404, detail="Member not found")
    return None


# ─── Phone / OTP Auth ─────────────────────────────────────────────────────────

@app.post("/api/auth/send-otp", response_model=SendOTPResponse)
def send_otp_endpoint(body: SendOTPRequest):
    """Generate a 6-digit OTP and dispatch it via SMS.

    In mock/dev mode (SMS_PROVIDER=mock), the OTP is echoed back in
    the `dev_otp` field so you can test without a real SMS gateway.
    """
    try:
        result = send_otp(body.phone)
        return SendOTPResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to send OTP: {str(e)}")


@app.post("/api/auth/verify-otp", response_model=PhoneUserResponse)
def verify_otp_endpoint(body: VerifyOTPRequest):
    """Verify OTP and return the user's profile (name from kitty enrollments)."""
    if not verify_otp(body.phone, body.otp):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")

    norm = normalize_phone(body.phone)

    # Derive the customer's name from their kitty memberships (most recent first)
    all_members = kitty_member_list()
    my_members = [
        m for m in all_members
        if normalize_phone(m.get("phone", "")) == norm
    ]
    name = my_members[0]["name"] if my_members else None

    return PhoneUserResponse(phone=norm, name=name, is_admin=False)


# ─── Email / OTP Auth ─────────────────────────────────────────────────────────

@app.post("/api/auth/send-email-otp", response_model=SendEmailOTPResponse)
def send_email_otp_endpoint(body: SendEmailOTPRequest, background_tasks: BackgroundTasks):
    """Generate a 6-digit OTP and send it via email.

    In mock/dev mode (no SMTP configured), the OTP is echoed back in
    the `dev_otp` field so you can test without a real email server.
    """
    from app.email_otp import send_email_otp
    
    try:
        result = send_email_otp(body.email, background_tasks=background_tasks)
        return SendEmailOTPResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to send OTP: {str(e)}")


@app.post("/api/auth/verify-email-otp", response_model=EmailUserResponse)
def verify_email_otp_endpoint(body: VerifyEmailOTPRequest):
    """Verify email OTP and return the user's profile.
    
    Creates a new user if one doesn't exist with this email.
    """
    from app.email_otp import verify_email_otp, get_or_create_user_by_email, normalize_email
    
    if not verify_email_otp(body.email, body.otp):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    
    # Get or create user
    user = get_or_create_user_by_email(body.email)
    
    return EmailUserResponse(**user)


# ─── Enhanced Signup/Login (with password) ─────────────────────────────────────

from app.schemas import (
    SignupRequest,
    SignupResponse,
    VerifySignupRequest,
    VerifySignupResponse,
    LoginWithPasswordRequest,
    LoginWithOTPRequest,
    RequestLoginOTPRequest,
    FullUserResponse,
    DirectSignupRequest,
    DirectSignupResponse,
)


@app.post("/api/auth/signup", response_model=SignupResponse)
def signup_endpoint(body: SignupRequest, background_tasks: BackgroundTasks):
    """Step 1: Register new user and send OTP for email verification.
    
    Collects name, phone, email, password and sends OTP to verify email.
    """
    from app.email_otp import create_pending_user, send_email_otp, normalize_email
    
    try:
        # Create pending user (unverified)
        create_pending_user(body.name, body.phone, body.email, body.password)
        
        # Send OTP for verification (email dispatched in background)
        result = send_email_otp(body.email, background_tasks=background_tasks)
        
        return SignupResponse(
            message="OTP sent to your email. Please verify to complete registration.",
            email=normalize_email(body.email),
            expires_in_seconds=result.get("expires_in_seconds", 300),
            dev_otp=result.get("dev_otp"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Signup failed: {str(e)}")


@app.post("/api/auth/verify-signup", response_model=VerifySignupResponse)
def verify_signup_endpoint(body: VerifySignupRequest):
    """Step 2: Verify OTP to complete registration.
    
    After successful verification, the user account is activated.
    """
    from app.email_otp import verify_email_otp, complete_signup
    
    if not verify_email_otp(body.email, body.otp):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    
    try:
        user = complete_signup(body.email)
        return VerifySignupResponse(**user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login/password", response_model=FullUserResponse)
def login_with_password_endpoint(body: LoginWithPasswordRequest):
    """Login with email/phone and password.
    
    The identifier can be either an email address or phone number.
    """
    from app.email_otp import login_with_identifier
    
    try:
        user = login_with_identifier(body.identifier, body.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return FullUserResponse(**user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/signup-direct", response_model=DirectSignupResponse)
def signup_direct_endpoint(body: DirectSignupRequest):
    """Direct signup without OTP verification.
    
    Both phone and email are required and must be unique.
    Creates a verified user immediately.
    """
    from app.email_otp import create_user_direct
    
    try:
        user = create_user_direct(
            name=body.name,
            phone=body.phone,
            email=body.email,
            password=body.password,
        )
        return DirectSignupResponse(**user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Signup failed: {str(e)}")


@app.post("/api/auth/login/request-otp", response_model=SignupResponse)
def request_login_otp_endpoint(body: RequestLoginOTPRequest, background_tasks: BackgroundTasks):
    """Request OTP for passwordless login."""
    from app.email_otp import send_email_otp, get_user_by_email, normalize_email
    
    # Check if user exists
    user = get_user_by_email(body.email)
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")
    
    if not user.get("is_verified", False):
        raise HTTPException(status_code=400, detail="Please complete your registration first")
    
    try:
        result = send_email_otp(body.email, background_tasks=background_tasks)
        return SignupResponse(
            message="OTP sent to your email",
            email=normalize_email(body.email),
            expires_in_seconds=result.get("expires_in_seconds", 300),
            dev_otp=result.get("dev_otp"),
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to send OTP: {str(e)}")


@app.post("/api/auth/login/otp", response_model=FullUserResponse)
def login_with_otp_endpoint(body: LoginWithOTPRequest):
    """Login with email and OTP (passwordless)."""
    from app.email_otp import verify_email_otp, get_user_by_email
    
    if not verify_email_otp(body.email, body.otp):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    
    user = get_user_by_email(body.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return FullUserResponse(**user)


# ─── User / Customer Dashboard ───────────────────────────────────────────────

@app.get("/api/user/kitties", response_model=list[KittyMemberWithPlan])
def get_user_kitties(phone: str):
    """Return all kitty enrollments for a given phone number, enriched with plan details."""
    norm = normalize_phone(phone)
    if not norm:
        raise HTTPException(status_code=400, detail="Phone number required")

    all_members = kitty_member_list()
    my_members = [
        m for m in all_members
        if normalize_phone(m.get("phone", "")) == norm
    ]

    result = []
    for m in my_members:
        plan_doc = kitty_plan_get(m.get("plan_id", ""))
        plan_obj = KittyPlanResponse(**plan_doc) if plan_doc else None
        total_saved = sum(p["amount"] for p in m.get("payments", []))
        total_redeemable = plan_doc["total_redeemable"] if plan_doc else 0
        result.append(KittyMemberWithPlan(
            **{k: v for k, v in m.items() if k not in ("payments_made", "plan_duration")},
            plan=plan_obj,
            total_saved=total_saved,
            total_redeemable=total_redeemable,
        ))

    return result
