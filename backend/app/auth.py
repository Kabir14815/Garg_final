"""Auth helpers: hash password, verify, get user from DB."""
from passlib.context import CryptContext
from db import get_db

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def get_user_by_email(email: str) -> dict | None:
    db = get_db()
    return db.users.find_one({"email": email.lower().strip()})


# Emails that have admin access to the portal
ADMIN_EMAILS = {"admin@garg.com"}


def create_user(email: str, password: str, name: str | None = None, is_admin: bool = False) -> dict:
    db = get_db()
    email = email.lower().strip()
    if db.users.find_one({"email": email}):
        raise ValueError("Email already registered")
    doc = {
        "email": email,
        "password": hash_password(password),
        "name": name or email.split("@")[0],
        "is_admin": is_admin or email in ADMIN_EMAILS,
    }
    db.users.insert_one(doc)
    return {"email": doc["email"], "name": doc["name"], "is_admin": doc["is_admin"]}


def authenticate_user(email: str, password: str) -> dict | None:
    user = get_user_by_email(email)
    if not user or not verify_password(password, user["password"]):
        return None
    is_admin = user.get("is_admin", False) or user["email"] in ADMIN_EMAILS
    return {
        "email": user["email"],
        "name": user.get("name") or user["email"].split("@")[0],
        "is_admin": is_admin,
    }
