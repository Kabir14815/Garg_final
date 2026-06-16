"""OTP management for phone-based login.

In production, replace _send_sms() with a real SMS gateway
(e.g. Twilio, MSG91, AWS SNS).  Set the environment variable
SMS_PROVIDER to something other than "mock" to suppress the
dev_otp field from the /api/auth/send-otp response.
"""
import os
import random
import time
from typing import Optional

OTP_TTL_SECONDS = 300   # 5 minutes
MAX_VERIFY_ATTEMPTS = 5

# In-memory store: normalized_phone -> {otp, expires_at, attempts}
_store: dict[str, dict] = {}

_SMS_PROVIDER = os.getenv("SMS_PROVIDER", "mock").lower()


def normalize_phone(raw: str) -> str:
    """Strip everything except digits; remove leading 91 for 12-digit Indian numbers."""
    digits = "".join(c for c in (raw or "") if c.isdigit())
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    return digits


def _send_sms(phone: str, otp: str) -> None:
    """Send OTP via SMS gateway.  Extend this for real providers."""
    if _SMS_PROVIDER == "mock":
        print(f"[OTP DEV] Phone: {phone}  OTP: {otp}")
        return

    # ── Twilio example ──────────────────────────────────────────────────────
    # from twilio.rest import Client
    # client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
    # client.messages.create(
    #     body=f"Your Garg Jewellers OTP is {otp}. Valid for 5 minutes.",
    #     from_=os.getenv("TWILIO_FROM"),
    #     to=f"+91{phone}",
    # )

    # ── MSG91 example ────────────────────────────────────────────────────────
    # import httpx
    # httpx.post("https://api.msg91.com/api/v5/otp", json={
    #     "template_id": os.getenv("MSG91_TEMPLATE_ID"),
    #     "mobile": f"91{phone}",
    #     "authkey": os.getenv("MSG91_AUTH_KEY"),
    #     "otp": otp,
    # })


def send_otp(phone: str) -> dict:
    """Generate and dispatch an OTP for `phone`.

    Returns a dict with `message` and, in mock/dev mode, `dev_otp`.
    """
    norm = normalize_phone(phone)
    if not norm or len(norm) < 10:
        raise ValueError("Invalid phone number")

    otp = str(random.randint(100000, 999999))
    _store[norm] = {
        "otp": otp,
        "expires_at": time.time() + OTP_TTL_SECONDS,
        "attempts": 0,
    }

    _send_sms(norm, otp)

    result: dict = {"message": "OTP sent successfully", "expires_in": OTP_TTL_SECONDS}
    if _SMS_PROVIDER == "mock":
        result["dev_otp"] = otp   # only exposed in dev / mock mode
    return result


def verify_otp(phone: str, otp: str) -> bool:
    """Return True and consume the OTP if valid; False otherwise."""
    norm = normalize_phone(phone)
    record = _store.get(norm)

    if not record:
        return False
    if time.time() > record["expires_at"]:
        _store.pop(norm, None)
        return False

    record["attempts"] += 1
    if record["attempts"] > MAX_VERIFY_ATTEMPTS:
        _store.pop(norm, None)
        return False

    if record["otp"] != otp.strip():
        return False

    _store.pop(norm, None)   # single-use
    return True


def otp_status(phone: str) -> Optional[float]:
    """Return seconds remaining for a pending OTP, or None if none."""
    norm = normalize_phone(phone)
    record = _store.get(norm)
    if not record:
        return None
    remaining = record["expires_at"] - time.time()
    return max(0.0, remaining)
