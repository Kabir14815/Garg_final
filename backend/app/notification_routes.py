"""Device token registration and admin push-notification endpoints."""
from fastapi import APIRouter, HTTPException, Query

from app.fcm import init_firebase, is_ready, send_to_topic, status_message
from app.notification_store import (
    attach_user,
    device_count,
    list_user_notifications,
    list_logs,
    log_send,
    mark_all_user_notifications_read,
    mark_user_notification_read,
    register_device,
    unread_user_notification_count,
    unregister_device,
)
from app.schemas import (
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    DeviceUnregisterRequest,
    NotificationListResponse,
    NotificationLogResponse,
    SendNotificationRequest,
    SendNotificationResponse,
)

router = APIRouter(tags=["notifications"])


def _log_to_response(doc: dict) -> NotificationLogResponse:
    return NotificationLogResponse(
        id=doc.get("id", ""),
        title=doc.get("title", ""),
        body=doc.get("body", ""),
        audience=doc.get("audience", "all"),
        image_url=doc.get("image_url"),
        data=doc.get("data") or {},
        sent_by=doc.get("sent_by", ""),
        fcm_message_id=doc.get("fcm_message_id"),
        status=doc.get("status", "sent"),
        error=doc.get("error"),
        created_at=doc.get("created_at", ""),
    )


@router.post("/api/devices/register", response_model=DeviceRegisterResponse)
def register_device_endpoint(body: DeviceRegisterRequest):
    token = (body.token or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="FCM token is required")
    register_device(
        token=token,
        platform=body.platform,
        user_id=body.user_id,
        user_email=body.user_email,
    )
    return DeviceRegisterResponse(ok=True, token=token)


@router.post("/api/devices/attach", response_model=DeviceRegisterResponse)
def attach_device_user(body: DeviceRegisterRequest):
    token = (body.token or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="FCM token is required")
    attach_user(token, body.user_id, body.user_email)
    return DeviceRegisterResponse(ok=True, token=token)


@router.post("/api/devices/unregister")
def unregister_device_endpoint(body: DeviceUnregisterRequest):
    token = (body.token or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="FCM token is required")
    unregister_device(token)
    return {"ok": True}


@router.post("/api/admin/notifications", response_model=SendNotificationResponse)
def send_notification(
    body: SendNotificationRequest,
    admin_email: str = Query("admin"),
):
    title = (body.title or "").strip()
    message = (body.body or "").strip()
    if not title or not message:
        raise HTTPException(status_code=400, detail="Title and body are required")

    audience = (body.audience or "all").strip().lower()
    if audience not in ("all", "kitty"):
        raise HTTPException(status_code=400, detail="audience must be 'all' or 'kitty'")

    data = {
        "type": (body.deep_link_type or "home").strip().lower(),
        "product_id": (body.product_id or "").strip(),
        "click_action": "FLUTTER_NOTIFICATION_CLICK",
    }
    image_url = (body.image_url or "").strip() or None

    if not init_firebase() or not is_ready():
        log_send(
            title=title,
            body=message,
            audience=audience,
            image_url=image_url,
            data=data,
            sent_by=admin_email,
            fcm_message_id=None,
            error=status_message(),
        )
        raise HTTPException(
            status_code=503,
            detail=f"Push notifications are not configured: {status_message()}",
        )

    try:
        message_id = send_to_topic(
            title=title,
            body=message,
            audience=audience,
            image_url=image_url,
            data=data,
        )
    except Exception as e:
        log_send(
            title=title,
            body=message,
            audience=audience,
            image_url=image_url,
            data=data,
            sent_by=admin_email,
            fcm_message_id=None,
            error=str(e),
        )
        raise HTTPException(status_code=502, detail=f"FCM send failed: {e}") from e

    doc = log_send(
        title=title,
        body=message,
        audience=audience,
        image_url=image_url,
        data=data,
        sent_by=admin_email,
        fcm_message_id=message_id,
    )
    return SendNotificationResponse(
        ok=True,
        id=doc.get("id", ""),
        fcm_message_id=message_id,
        audience=audience,
        device_count=device_count(),
    )


@router.get("/api/admin/notifications", response_model=NotificationListResponse)
def list_notifications(limit: int = Query(20, ge=1, le=100)):
    items = [_log_to_response(d) for d in list_logs(limit)]
    return NotificationListResponse(device_count=device_count(), items=items)


@router.get("/api/notifications")
def customer_notifications(
    user_id: str = Query(""),
    user_phone: str = Query(""),
    limit: int = Query(50, ge=1, le=100),
):
    if not user_id and not user_phone:
        raise HTTPException(status_code=400, detail="User identity is required")
    items = list_user_notifications(
        user_id=user_id, user_phone=user_phone, limit=limit
    )
    return {
        "items": items,
        "unread_count": unread_user_notification_count(
            user_id=user_id, user_phone=user_phone
        ),
    }


@router.put("/api/notifications/{notification_id}/read")
def read_customer_notification(
    notification_id: str,
    user_id: str = Query(""),
    user_phone: str = Query(""),
):
    if not user_id and not user_phone:
        raise HTTPException(status_code=400, detail="User identity is required")
    if not mark_user_notification_read(
        notification_id, user_id=user_id, user_phone=user_phone
    ):
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"ok": True}


@router.put("/api/notifications/actions/read-all")
def read_all_customer_notifications(
    user_id: str = Query(""),
    user_phone: str = Query(""),
):
    if not user_id and not user_phone:
        raise HTTPException(status_code=400, detail="User identity is required")
    count = mark_all_user_notifications_read(
        user_id=user_id, user_phone=user_phone
    )
    return {"ok": True, "updated": count}
