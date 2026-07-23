"""MongoDB connection. Set MONGODB_URI and MONGODB_DB_NAME in backend/.env or the environment."""
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.database import Database
from pymongo.collection import Collection

# Load backend/.env regardless of current working directory (uvicorn, tests, scripts).
_backend_dir = Path(__file__).resolve().parent
load_dotenv(_backend_dir / ".env")

# Never commit credentials in this file — use .env (gitignored) or Render env vars.
# Default is local MongoDB when MONGODB_URI is unset.
URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", "garg")

_client: Optional[MongoClient] = None
_indexes_created = False


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(URI, serverSelectionTimeoutMS=10_000)
    return _client


def get_db() -> Database:
    return get_client()[DB_NAME]


# ─── Collection Helpers ───────────────────────────────────────────────────────

def get_users_collection() -> Collection:
    return get_db()["users"]


def get_products_collection() -> Collection:
    return get_db()["products"]


def get_kitty_plans_collection() -> Collection:
    return get_db()["kitty_plans"]


def get_kitty_enrollments_collection() -> Collection:
    return get_db()["kitty_enrollments"]


def get_kitty_installments_collection() -> Collection:
    return get_db()["kitty_installments"]


def get_kitty_withdrawals_collection() -> Collection:
    return get_db()["kitty_withdrawals"]


def get_kitty_ledger_collection() -> Collection:
    return get_db()["kitty_ledger"]


def get_email_otp_collection() -> Collection:
    return get_db()["email_otp"]


def get_audit_logs_collection() -> Collection:
    return get_db()["audit_logs"]


# ─── Index Setup ──────────────────────────────────────────────────────────────

def ensure_indexes():
    """Create indexes for all collections. Safe to call multiple times."""
    global _indexes_created
    if _indexes_created:
        return
    
    try:
        db = get_db()
        
        # Users collection - drop old non-sparse email index if exists
        try:
            db["users"].drop_index("email_1")
        except Exception:
            pass  # Index might not exist
        
        # Email is optional, so use sparse index to allow multiple null values
        db["users"].create_index("email", unique=True, sparse=True)
        # Phone is required and must be unique
        db["users"].create_index("phone", unique=True, sparse=True)
        
        # Products collection
        db["products"].create_index("category")
        db["products"].create_index("created_at")
        
        # Kitty Plans
        db["kitty_plans"].create_index("plan_code", unique=True, sparse=True)
        db["kitty_plans"].create_index("status")
        db["kitty_plans"].create_index("is_active")
        db["kitty_plans"].create_index("created_at")
        
        # Kitty Enrollments
        db["kitty_enrollments"].create_index("enrollment_code", unique=True, sparse=True)
        db["kitty_enrollments"].create_index("plan_id")
        db["kitty_enrollments"].create_index("user_email")
        db["kitty_enrollments"].create_index("status")
        db["kitty_enrollments"].create_index("created_at")
        db["kitty_enrollments"].create_index([("user_email", ASCENDING), ("status", ASCENDING)])
        
        # Kitty Installments
        db["kitty_installments"].create_index("enrollment_id")
        db["kitty_installments"].create_index("status")
        db["kitty_installments"].create_index("due_date")
        db["kitty_installments"].create_index([("enrollment_id", ASCENDING), ("installment_number", ASCENDING)])
        
        # Kitty Withdrawals
        db["kitty_withdrawals"].create_index("enrollment_id")
        db["kitty_withdrawals"].create_index("withdrawal_code", unique=True, sparse=True)
        db["kitty_withdrawals"].create_index("status")
        db["kitty_withdrawals"].create_index("created_at")
        
        # Kitty Ledger
        db["kitty_ledger"].create_index("enrollment_id")
        db["kitty_ledger"].create_index("transaction_type")
        db["kitty_ledger"].create_index("created_at")
        db["kitty_ledger"].create_index([("enrollment_id", ASCENDING), ("created_at", DESCENDING)])
        
        # Email OTP - TTL index for auto-expiry
        db["email_otp"].create_index("email", unique=True)
        db["email_otp"].create_index("expires_at", expireAfterSeconds=0)
        
        # Audit Logs
        db["audit_logs"].create_index("entity_type")
        db["audit_logs"].create_index("entity_id")
        db["audit_logs"].create_index("action")
        db["audit_logs"].create_index("performed_by")
        db["audit_logs"].create_index("created_at")
        
        _indexes_created = True
        print("✓ MongoDB indexes created/verified")
    except Exception as e:
        print(f"⚠ Failed to create indexes: {e}")
