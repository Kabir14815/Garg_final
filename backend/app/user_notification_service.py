"""Create persistent customer notifications and deliver personal FCM pushes."""
from __future__ import annotations

from typing import Optional

from app.fcm import send_to_tokens
from app.notification_store import (
    create_user_notification,
    device_tokens_for_user,
)


def notify_customer(
    *,
    title: str,
    body: str,
    notification_type: str,
    user_id: str = "",
    user_phone: str = "",
    user_email: str = "",
    data: Optional[dict] = None,
) -> dict:
    """Persist first, then best-effort push. Business actions must never fail."""
    payload = {
        "type": "kitty",
        "notification_type": notification_type,
        "click_action": "FLUTTER_NOTIFICATION_CLICK",
        **(data or {}),
    }
    notification = create_user_notification(
        title=title,
        body=body,
        notification_type=notification_type,
        user_id=user_id,
        user_phone=user_phone,
        user_email=user_email,
        data=payload,
    )
    payload["notification_id"] = notification.get("id", "")
    tokens = device_tokens_for_user(
        user_id=notification.get("user_id", ""),
        user_phone=notification.get("user_phone", ""),
        user_email=notification.get("user_email", ""),
    )
    if tokens:
        try:
            send_to_tokens(tokens=tokens, title=title, body=body, data=payload)
        except Exception as exc:
            print(f"⚠ Personal notification push failed: {exc}")
    return notification


def notify_enrollment(enrollment: dict, event: str) -> None:
    plan_name = enrollment.get("plan_name") or "kitty plan"
    code = enrollment.get("enrollment_code") or ""
    messages = {
        "submitted": (
            "Enrollment Request Received",
            f"Your request for {plan_name} has been received and is awaiting approval.",
        ),
        "approved": (
            "Enrollment Accepted",
            f"Your {plan_name} enrollment {code} has been accepted.",
        ),
        "rejected": (
            "Enrollment Not Accepted",
            f"Your {plan_name} enrollment was not accepted. "
            f"{enrollment.get('rejection_reason') or 'Please contact the store for details.'}",
        ),
        "cancelled": (
            "Enrollment Cancelled",
            f"Your {plan_name} enrollment {code} has been cancelled.",
        ),
    }
    if event not in messages:
        return
    title, body = messages[event]
    notify_customer(
        title=title,
        body=body,
        notification_type=f"enrollment_{event}",
        user_phone=str(enrollment.get("user_phone") or ""),
        user_email=str(enrollment.get("user_email") or ""),
        data={"enrollment_id": str(enrollment.get("id") or "")},
    )


def notify_installment(installment: dict, enrollment: dict) -> None:
    amount = float(installment.get("amount_paid") or 0)
    number = installment.get("installment_number") or ""
    notify_customer(
        title="Payment Successful",
        body=f"Payment of ₹{amount:,.2f} for installment {number} was recorded successfully.",
        notification_type="payment_success",
        user_phone=str(enrollment.get("user_phone") or ""),
        user_email=str(enrollment.get("user_email") or ""),
        data={
            "enrollment_id": str(enrollment.get("id") or ""),
            "installment_id": str(installment.get("id") or ""),
        },
    )


def notify_withdrawal(withdrawal: dict, enrollment: dict, event: str) -> None:
    amount = float(withdrawal.get("net_amount") or withdrawal.get("amount") or 0)
    code = withdrawal.get("withdrawal_code") or ""
    messages = {
        "created": (
            "Withdrawal Initiated",
            f"Your withdrawal {code} for ₹{amount:,.2f} has been initiated.",
        ),
        "approved": (
            "Withdrawal Approved",
            f"Your withdrawal {code} for ₹{amount:,.2f} has been approved.",
        ),
        "released": (
            "Withdrawal Released",
            f"Your withdrawal {code} for ₹{amount:,.2f} has been released.",
        ),
        "rejected": (
            "Withdrawal Not Approved",
            f"Your withdrawal {code} was not approved. Please contact the store for details.",
        ),
    }
    if event not in messages:
        return
    title, body = messages[event]
    notify_customer(
        title=title,
        body=body,
        notification_type=f"withdrawal_{event}",
        user_phone=str(enrollment.get("user_phone") or ""),
        user_email=str(enrollment.get("user_email") or ""),
        data={
            "enrollment_id": str(enrollment.get("id") or ""),
            "withdrawal_id": str(withdrawal.get("id") or ""),
        },
    )
