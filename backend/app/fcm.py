"""Firebase Cloud Messaging helpers.

Set FIREBASE_SERVICE_ACCOUNT_JSON to the full service-account JSON string
(Render env var), or FIREBASE_SERVICE_ACCOUNT_FILE to a local file path.
Either variable also accepts a path relative to the backend directory.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

_BACKEND_DIR = Path(__file__).resolve().parent.parent

_ready = False
_init_error: Optional[str] = None


TOPIC_ALL = "garg_all"
TOPIC_KITTY = "garg_kitty"
ANDROID_CHANNEL_ID = "garg_default"


def _resolve_key_file(value: str) -> Optional[Path]:
    """Return the service-account file for `value`, or None if it isn't a path."""
    value = (value or "").strip()
    if not value or value.startswith("{"):
        return None
    candidate = Path(value).expanduser()
    if not candidate.is_absolute():
        candidate = _BACKEND_DIR / candidate
    return candidate if candidate.is_file() else None


def init_firebase() -> bool:
    """Initialize the Firebase Admin SDK once. Safe to call repeatedly."""
    global _ready, _init_error
    if _ready:
        return True

    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError:
        _init_error = "firebase-admin is not installed"
        print(f"⚠ FCM: {_init_error}")
        return False

    if firebase_admin._apps:
        _ready = True
        return True

    cred = None
    raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    file_path = _resolve_key_file(os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE", ""))
    if file_path is None:
        # Deployments often paste a path into the JSON variable by mistake.
        file_path = _resolve_key_file(raw)
        if file_path is not None:
            raw = ""

    try:
        if raw:
            info = json.loads(raw)
            cred = credentials.Certificate(info)
        elif file_path:
            cred = credentials.Certificate(str(file_path))
        else:
            _init_error = (
                "FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_SERVICE_ACCOUNT_FILE) is not set"
            )
            print(f"⚠ FCM: {_init_error}")
            return False
        firebase_admin.initialize_app(cred)
        _ready = True
        print("✓ Firebase Admin initialized (FCM ready)")
        return True
    except Exception as e:
        _init_error = str(e)
        print(f"⚠ FCM init failed: {e}")
        return False


def is_ready() -> bool:
    return _ready


def status_message() -> str:
    if _ready:
        return "ready"
    return _init_error or "Firebase is not configured"


def _stringify_data(data: Optional[dict]) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in (data or {}).items():
        if value is None:
            continue
        out[str(key)] = str(value)
    return out


def topic_for_audience(audience: str) -> str:
    if (audience or "all").strip().lower() == "kitty":
        return TOPIC_KITTY
    return TOPIC_ALL


def send_to_topic(
    *,
    title: str,
    body: str,
    audience: str = "all",
    image_url: Optional[str] = None,
    data: Optional[dict] = None,
) -> str:
    """Send a push to an FCM topic. Returns the FCM message id."""
    if not init_firebase():
        raise RuntimeError(status_message())

    from firebase_admin import messaging

    topic = topic_for_audience(audience)
    payload = _stringify_data(data)
    image = (image_url or "").strip() or None

    android_notification = messaging.AndroidNotification(
        channel_id=ANDROID_CHANNEL_ID,
        sound="default",
        click_action="FLUTTER_NOTIFICATION_CLICK",
        image=image,
    )
    aps = messaging.Aps(sound="default", badge=1)
    if image:
        aps.mutable_content = True

    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body, image=image),
        data=payload,
        topic=topic,
        android=messaging.AndroidConfig(
            priority="high",
            notification=android_notification,
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(aps=aps),
            fcm_options=messaging.APNSFCMOptions(image=image) if image else None,
        ),
    )
    return messaging.send(message)


def send_to_tokens(
    *,
    tokens: list[str],
    title: str,
    body: str,
    image_url: Optional[str] = None,
    data: Optional[dict] = None,
) -> tuple[int, int]:
    """Send a personal push to device tokens. Returns success/failure counts."""
    unique_tokens = list(dict.fromkeys(token for token in tokens if token))
    if not unique_tokens:
        return (0, 0)
    if not init_firebase():
        raise RuntimeError(status_message())

    from firebase_admin import messaging

    payload = _stringify_data(data)
    image = (image_url or "").strip() or None
    android_notification = messaging.AndroidNotification(
        channel_id=ANDROID_CHANNEL_ID,
        sound="default",
        click_action="FLUTTER_NOTIFICATION_CLICK",
        image=image,
    )
    aps = messaging.Aps(sound="default", badge=1)
    if image:
        aps.mutable_content = True

    message = messaging.MulticastMessage(
        notification=messaging.Notification(title=title, body=body, image=image),
        data=payload,
        tokens=unique_tokens,
        android=messaging.AndroidConfig(
            priority="high",
            notification=android_notification,
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(aps=aps),
            fcm_options=messaging.APNSFCMOptions(image=image) if image else None,
        ),
    )
    response = messaging.send_each_for_multicast(message)
    return (response.success_count, response.failure_count)
