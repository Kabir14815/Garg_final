import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
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
)
from app.auth import create_user, authenticate_user
from app.store import (
    product_list,
    product_get,
    product_create,
    product_update,
    product_delete,
    rates_get,
    rates_update,
)
from app.live_rates import refresh_if_stale
from app.upload_routes import router as upload_router, UPLOAD_ROOT

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
    """Prime live metal rates; seed admin user when MongoDB is available."""
    try:
        refresh_if_stale()
    except Exception:
        pass
    try:
        from db import get_db
        from app.auth import ADMIN_EMAILS
        db = get_db()
        if db.users.count_documents({}) == 0:
            create_user("admin@garg.com", "1234", "Admin")
        else:
            for email in ADMIN_EMAILS:
                db.users.update_one(
                    {"email": email},
                    {"$set": {"is_admin": True}},
                )
    except Exception:
        pass  # MongoDB may be unavailable; auth will fail until connected


_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)

UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
(UPLOAD_ROOT / "products").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")


# ----- Products -----
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
def create_product(body: ProductCreate):
    data = body.model_dump()
    return product_create(data)


@app.put("/api/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: str, body: ProductUpdate):
    data = body.model_dump()
    updated = product_update(product_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    return updated


@app.delete("/api/products/{product_id}", status_code=204)
def delete_product(product_id: str):
    if not product_delete(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    return None


# ----- Metal rates (when these change, product prices update automatically) -----
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


# ----- Auth (MongoDB) -----
@app.post("/api/auth/register", response_model=UserResponse)
def register(body: RegisterRequest):
    try:
        user = create_user(body.email, body.password, body.name)
        return UserResponse(**user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail="Service temporarily unavailable. Please try again later.",
        )


# Dev fallback admin when MongoDB is unavailable or admin not seeded
_DEV_ADMIN = {"email": "admin@garg.com", "name": "Admin", "is_admin": True}


@app.post("/api/auth/login", response_model=UserResponse)
def login(body: LoginRequest):
    email = (body.email or "").lower().strip()
    password = (body.password or "").strip()
    # Dev fallback: always allow admin@garg.com / 1234 when DB auth fails
    if email == "admin@garg.com" and password == "1234":
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
