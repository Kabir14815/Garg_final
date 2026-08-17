"""MongoDB store for device tokens and notification send history."""
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

from db import (
    get_device_tokens_collection,
    get_notification_logs_collection,
    get_user_notifications_collection,
    get_users_collection,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _str_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key in ("created_at", "updated_at", "read_at"):
        val = doc.get(key)
        if isinstance(val, datetime):
            doc[key] = val.isoformat()
    return doc


def register_device(
    token: str,
    platform: str,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
) -> dict:
    coll = get_device_tokens_collection()
    now = _now()
    platform = (platform or "unknown").strip().lower()
    if platform not in ("android", "ios"):
        platform = "unknown"

    update = {
        "token": token,
        "platform": platform,
        "updated_at": now,
    }
    if user_id is not None:
        update["user_id"] = user_id or None
    if user_email is not None:
        update["user_email"] = (user_email or "").strip().lower() or None

    coll.update_one(
        {"token": token},
        {"$set": update, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    doc = coll.find_one({"token": token})
    return _str_id(dict(doc)) if doc else update


def attach_user(token: str, user_id: Optional[str], user_email: Optional[str]) -> None:
    if not token:
        return
    get_device_tokens_collection().update_one(
        {"token": token},
        {
            "$set": {
                "user_id": user_id or None,
                "user_email": (user_email or "").strip().lower() or None,
                "updated_at": _now(),
            }
        },
    )


def unregister_device(token: str) -> bool:
    if not token:
        return False
    result = get_device_tokens_collection().delete_one({"token": token})
    return result.deleted_count > 0


def device_count() -> int:
    try:
        return get_device_tokens_collection().count_documents({})
    except Exception:
        return 0


def log_send(
    *,
    title: str,
    body: str,
    audience: str,
    image_url: Optional[str],
    data: dict,
    sent_by: str,
    fcm_message_id: Optional[str],
    error: Optional[str] = None,
) -> dict:
    coll = get_notification_logs_collection()
    doc = {
        "title": title,
        "body": body,
        "audience": audience,
        "image_url": image_url or None,
        "data": data or {},
        "sent_by": sent_by,
        "fcm_message_id": fcm_message_id,
        "status": "sent" if fcm_message_id else "failed",
        "error": error,
        "created_at": _now(),
    }
    result = coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _str_id(doc)


def list_logs(limit: int = 20) -> list[dict]:
    try:
        coll = get_notification_logs_collection()
        docs = coll.find({}).sort("created_at", -1).limit(max(1, min(limit, 100)))
        return [_str_id(dict(d)) for d in docs]
    except Exception:
        return []


def get_log(log_id: str) -> Optional[dict]:
    try:
        doc = get_notification_logs_collection().find_one({"_id": ObjectId(log_id)})
        return _str_id(dict(doc)) if doc else None
    except Exception:
        return None


def resolve_user(*, phone: str = "", email: str = "") -> dict:
    """Resolve a customer so notifications remain linked across devices."""
    query = {}
    if phone:
        query["phone"] = phone
    elif email:
        query["email"] = email.strip().lower()
    if not query:
        return {}
    doc = get_users_collection().find_one(query)
    if not doc:
        return {}
    return {
        "user_id": str(doc["_id"]),
        "user_phone": str(doc.get("phone") or phone),
        "user_email": str(doc.get("email") or email).strip().lower(),
    }


def device_tokens_for_user(
    *, user_id: str = "", user_phone: str = "", user_email: str = ""
) -> list[str]:
    clauses = []
    if user_id:
        clauses.append({"user_id": user_id})
    if user_email:
        clauses.append({"user_email": user_email.strip().lower()})
    if user_phone:
        for user in get_users_collection().find({"phone": user_phone}, {"_id": 1}):
            clauses.append({"user_id": str(user["_id"])})
    if not clauses:
        return []
    return [
        str(doc["token"])
        for doc in get_device_tokens_collection().find(
            {"$or": clauses}, {"token": 1}
        )
        if doc.get("token")
    ]


def create_user_notification(
    *,
    title: str,
    body: str,
    notification_type: str,
    user_id: str = "",
    user_phone: str = "",
    user_email: str = "",
    data: Optional[dict] = None,
) -> dict:
    resolved = resolve_user(phone=user_phone, email=user_email)
    doc = {
        "user_id": user_id or resolved.get("user_id", ""),
        "user_phone": user_phone or resolved.get("user_phone", ""),
        "user_email": (user_email or resolved.get("user_email", "")).strip().lower(),
        "title": title,
        "body": body,
        "type": notification_type,
        "data": data or {},
        "read_at": None,
        "created_at": _now(),
    }
    result = get_user_notifications_collection().insert_one(doc)
    doc["_id"] = result.inserted_id
    return _str_id(doc)


def _user_query(*, user_id: str = "", user_phone: str = "") -> dict:
    clauses = []
    if user_id:
        clauses.append({"user_id": user_id})
    if user_phone:
        clauses.append({"user_phone": user_phone})
    if not clauses:
        return {"_id": None}
    return {"$or": clauses}


def list_user_notifications(
    *, user_id: str = "", user_phone: str = "", limit: int = 50
) -> list[dict]:
    docs = (
        get_user_notifications_collection()
        .find(_user_query(user_id=user_id, user_phone=user_phone))
        .sort("created_at", -1)
        .limit(max(1, min(limit, 100)))
    )
    return [_str_id(dict(doc)) for doc in docs]


def unread_user_notification_count(*, user_id: str = "", user_phone: str = "") -> int:
    query = _user_query(user_id=user_id, user_phone=user_phone)
    query["read_at"] = None
    return get_user_notifications_collection().count_documents(query)


def mark_user_notification_read(
    notification_id: str, *, user_id: str = "", user_phone: str = ""
) -> bool:
    try:
        query = _user_query(user_id=user_id, user_phone=user_phone)
        query["_id"] = ObjectId(notification_id)
        result = get_user_notifications_collection().update_one(
            query, {"$set": {"read_at": _now()}}
        )
        return result.matched_count > 0
    except Exception:
        return False


def mark_all_user_notifications_read(*, user_id: str = "", user_phone: str = "") -> int:
    query = _user_query(user_id=user_id, user_phone=user_phone)
    query["read_at"] = None
    result = get_user_notifications_collection().update_many(
        query, {"$set": {"read_at": _now()}}
    )
    return result.modified_count
