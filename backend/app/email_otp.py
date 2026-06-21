"""Email OTP authentication for Kitty enrollment and user login."""
import os
import random
import smtplib
import ssl
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from db import get_email_otp_collection, get_users_collection


OTP_EXPIRY_MINUTES = 5
OTP_LENGTH = 6


def normalize_email(email: str) -> str:
    """Normalize email for consistent comparison."""
    return email.lower().strip() if email else ""


def generate_otp() -> str:
    """Generate a 6-digit OTP."""
    return "".join([str(random.randint(0, 9)) for _ in range(OTP_LENGTH)])


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send email using SMTP. Returns True on success."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM", smtp_user or "noreply@gargjewellers.com")
    use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    
    # Mock mode if no SMTP credentials
    if not smtp_user or not smtp_pass:
        print(f"[MOCK EMAIL] To: {to_email}, Subject: {subject}")
        print(f"[MOCK EMAIL] Body: {html_body}")
        return True
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = to_email
        
        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)
        
        context = ssl.create_default_context()
        
        if use_ssl:
            # SSL connection (port 465)
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(from_email, to_email, msg.as_string())
        else:
            # STARTTLS connection (port 587)
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                if use_tls:
                    server.starttls(context=context)
                server.login(smtp_user, smtp_pass)
                server.sendmail(from_email, to_email, msg.as_string())
        
        print(f"[EMAIL] Successfully sent to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")
        return False


def _otp_email_template(otp: str, user_name: Optional[str] = None) -> str:
    """Generate HTML email body for OTP."""
    greeting = f"Hello {user_name}," if user_name else "Hello,"
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 480px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px 0; border-bottom: 2px solid #8B0000; }}
            .header h1 {{ color: #8B0000; margin: 0; font-size: 24px; }}
            .content {{ padding: 30px 0; text-align: center; }}
            .otp-box {{ 
                background: linear-gradient(135deg, #f8f5f0 0%, #fff 100%); 
                border: 2px solid #D4AF37; 
                border-radius: 8px; 
                padding: 20px; 
                margin: 20px 0;
            }}
            .otp {{ 
                font-size: 36px; 
                font-weight: bold; 
                letter-spacing: 8px; 
                color: #8B0000;
                font-family: 'Courier New', monospace;
            }}
            .expires {{ color: #666; font-size: 14px; margin-top: 10px; }}
            .footer {{ 
                text-align: center; 
                padding: 20px 0; 
                border-top: 1px solid #ddd; 
                color: #888; 
                font-size: 12px;
            }}
            .logo {{ color: #D4AF37; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Garg <span class="logo">Jewellers</span></h1>
            </div>
            <div class="content">
                <p>{greeting}</p>
                <p>Your One-Time Password (OTP) for Garg Jewellers is:</p>
                <div class="otp-box">
                    <div class="otp">{otp}</div>
                    <div class="expires">Valid for {OTP_EXPIRY_MINUTES} minutes</div>
                </div>
                <p style="color: #666; font-size: 14px;">
                    If you didn't request this code, please ignore this email.
                </p>
            </div>
            <div class="footer">
                <p>© Garg Jewellers - Trusted since 1990</p>
                <p>Do not share this OTP with anyone.</p>
            </div>
        </div>
    </body>
    </html>
    """


def send_email_otp(email: str) -> dict:
    """Generate OTP, store in MongoDB, and send via email.
    
    Returns:
        dict with 'sent': True/False, 'message': str, and optionally 'dev_otp' in mock mode
    """
    email = normalize_email(email)
    if not email or "@" not in email:
        raise ValueError("Invalid email address")
    
    otp = generate_otp()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    # Get user name if exists
    user_name = None
    try:
        user = get_users_collection().find_one({"email": email})
        if user:
            user_name = user.get("name")
    except Exception:
        pass
    
    # Store OTP in MongoDB (upsert to handle re-requests)
    coll = get_email_otp_collection()
    coll.update_one(
        {"email": email},
        {
            "$set": {
                "otp": otp,
                "created_at": now,
                "expires_at": expires_at,
                "attempts": 0,
            }
        },
        upsert=True
    )
    
    # Send email
    subject = f"Your OTP for Garg Jewellers: {otp}"
    html_body = _otp_email_template(otp, user_name)
    sent = send_email(email, subject, html_body)
    
    result = {
        "sent": sent,
        "message": "OTP sent to your email" if sent else "Failed to send OTP",
        "email": email,
        "expires_in_seconds": OTP_EXPIRY_MINUTES * 60,
    }
    
    # Include OTP in response for mock/dev mode
    smtp_user = os.getenv("SMTP_USER", "")
    if not smtp_user:
        result["dev_otp"] = otp
    
    return result


def verify_email_otp(email: str, otp: str) -> bool:
    """Verify the OTP for the given email.
    
    Returns True if valid, False otherwise.
    Deletes the OTP after successful verification.
    """
    email = normalize_email(email)
    otp = (otp or "").strip()
    
    if not email or not otp:
        return False
    
    coll = get_email_otp_collection()
    now = datetime.now(timezone.utc)
    
    # Find and increment attempts
    doc = coll.find_one_and_update(
        {"email": email},
        {"$inc": {"attempts": 1}},
        return_document=True
    )
    
    if not doc:
        return False
    
    # Check expiry
    expires_at = doc.get("expires_at")
    if expires_at and isinstance(expires_at, datetime):
        # Make expires_at timezone-aware if it's naive
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            coll.delete_one({"email": email})
            return False
    
    # Check max attempts (5)
    if doc.get("attempts", 0) > 5:
        coll.delete_one({"email": email})
        return False
    
    # Check OTP match
    if doc.get("otp") != otp:
        return False
    
    # Success - delete OTP record
    coll.delete_one({"email": email})
    return True


def get_or_create_user_by_email(email: str, name: Optional[str] = None) -> dict:
    """Get existing user or create a new one by email.
    
    Used after successful OTP verification to ensure user exists.
    """
    email = normalize_email(email)
    coll = get_users_collection()
    
    user = coll.find_one({"email": email})
    if user:
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", ""),
            "phone": user.get("phone", ""),
            "is_admin": user.get("is_admin", False),
            "is_verified": user.get("is_verified", True),
        }
    
    # Create new user
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    new_user = {
        "email": email,
        "name": name or email.split("@")[0],
        "phone": "",
        "password_hash": None,  # OTP-only users have no password
        "is_admin": False,
        "is_verified": True,
        "created_at": now,
        "updated_at": now,
        "auth_method": "email_otp",
    }
    
    result = coll.insert_one(new_user)
    new_user["id"] = str(result.inserted_id)
    
    return {
        "id": str(result.inserted_id),
        "email": new_user["email"],
        "name": new_user["name"],
        "phone": "",
        "is_admin": False,
        "is_verified": True,
    }


def _hash_password(password: str) -> str:
    """Hash password with bcrypt, truncating to 72 bytes if needed."""
    import bcrypt as _bcrypt
    # bcrypt has a 72-byte limit, truncate if necessary
    password_bytes = password.encode('utf-8')[:72]
    salt = _bcrypt.gensalt()
    return _bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def _verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash, handling 72-byte limit."""
    import bcrypt as _bcrypt
    password_bytes = password.encode('utf-8')[:72]
    return _bcrypt.checkpw(password_bytes, password_hash.encode('utf-8'))


def create_pending_user(name: str, phone: str, email: str, password: str) -> dict:
    """Create a pending user (unverified) during signup.
    
    The user must verify their email with OTP to complete registration.
    """
    email = normalize_email(email)
    coll = get_users_collection()
    
    # Check if user already exists
    existing = coll.find_one({"email": email})
    if existing:
        if existing.get("is_verified", False):
            raise ValueError("An account with this email already exists")
        # Update existing unverified user
        coll.update_one(
            {"email": email},
            {
                "$set": {
                    "name": name,
                    "phone": phone,
                    "password_hash": _hash_password(password),
                    "updated_at": datetime.now(timezone.utc),
                }
            }
        )
        return {"email": email, "name": name}
    
    # Create new unverified user
    now = datetime.now(timezone.utc)
    new_user = {
        "email": email,
        "name": name,
        "phone": phone,
        "password_hash": _hash_password(password),
        "is_admin": False,
        "is_verified": False,
        "created_at": now,
        "updated_at": now,
        "auth_method": "password",
    }
    
    coll.insert_one(new_user)
    return {"email": email, "name": name}


def complete_signup(email: str) -> dict:
    """Mark user as verified after successful OTP verification."""
    email = normalize_email(email)
    coll = get_users_collection()
    
    user = coll.find_one({"email": email})
    if not user:
        raise ValueError("User not found")
    
    coll.update_one(
        {"email": email},
        {"$set": {"is_verified": True, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", ""),
        "phone": user.get("phone", ""),
        "is_admin": user.get("is_admin", False),
        "is_verified": True,
    }


def login_with_password(email: str, password: str) -> Optional[dict]:
    """Authenticate user with email and password.
    
    Returns user dict if successful, None otherwise.
    """
    email = normalize_email(email)
    coll = get_users_collection()
    
    user = coll.find_one({"email": email})
    if not user:
        return None
    
    # Check if user is verified
    if not user.get("is_verified", False):
        raise ValueError("Please verify your email first")
    
    # Check password
    password_hash = user.get("password_hash")
    if not password_hash:
        raise ValueError("This account uses OTP login only")
    
    if not _verify_password(password, password_hash):
        return None
    
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", ""),
        "phone": user.get("phone", ""),
        "is_admin": user.get("is_admin", False),
        "is_verified": True,
    }


def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email."""
    email = normalize_email(email)
    coll = get_users_collection()
    
    user = coll.find_one({"email": email})
    if not user:
        return None
    
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", ""),
        "phone": user.get("phone", ""),
        "is_admin": user.get("is_admin", False),
        "is_verified": user.get("is_verified", True),
    }
