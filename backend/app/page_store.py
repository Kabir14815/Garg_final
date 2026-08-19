"""Site pages stored in MongoDB — Privacy Policy and Terms of Service."""
from datetime import datetime, timezone
from typing import Optional

from db import get_pages_collection

ALLOWED_SLUGS = ("privacy", "terms")

DEFAULT_PAGES = {
    "privacy": {
        "title": "Privacy Policy",
        "body": """Last updated: August 2026

Garg Jewellers (“The House of Garg”, “we”, “us”) respects your privacy. This policy explains what information we collect when you use our website, mobile app, and in-store services, and how we use it.

## Who we are

Garg Jewellers, also known in Kharar as Ved Parkash and Sons, is a jewellery boutique offering gold, silver, diamond, and custom work, private appointments, and our Kitty savings scheme. You can reach us at gargjewel@gmail.com or +91 90549 00042.

## Information we collect

We may collect:

- Name, phone number, and email when you create an account, book an appointment, or enrol in Kitty
- Order, appointment, and Kitty payment details
- Device information for our mobile app, including a push-notification token if you allow notifications
- Basic usage data such as pages viewed and how you reached our site

We do not ask for your card or UPI PIN on this website. In-store payments follow the method you choose at the counter.

## How we use your information

We use your information to:

- Fulfil orders, appointments, and Kitty memberships
- Send order or scheme updates you have requested
- Send app notifications you have opted in to receive
- Improve our website, app, and boutique experience
- Meet legal and accounting requirements

## Sharing

We do not sell your personal information. We may share it with:

- Payment, SMS, email, or cloud providers who help us run the business
- Authorities if the law requires it

## Cookies and similar tools

Our website may use essential cookies so the site works (for example, keeping you signed in). We do not use them to sell advertising profiles.

## Data retention

We keep account, order, and Kitty records for as long as needed to provide the service and meet tax or legal obligations, then delete or anonymise them where we reasonably can.

## Your choices

You may:

- Ask to see, correct, or delete the personal data we hold about you
- Turn off app notifications in your phone settings, or ask us to stop marketing messages

Contact gargjewel@gmail.com and we will respond as soon as we reasonably can.

## Children

Our services are intended for adults. We do not knowingly collect personal data from children.

## Changes

We may update this policy from time to time. The latest version will always be on this page.

## Contact

Garg Jewellers — The House of Garg
Email: gargjewel@gmail.com
Phone: +91 90549 00042
""",
    },
    "terms": {
        "title": "Terms of Service",
        "body": """Last updated: August 2026

These terms govern your use of the Garg Jewellers website, mobile app, and related services (“The House of Garg”). By using our site or app, you agree to these terms.

## About us

Garg Jewellers is a jewellery boutique in Punjab offering gold, silver, diamond, and custom jewellery, private consultations, and a Kitty savings scheme. Contact: gargjewel@gmail.com | +91 90549 00042.

## Using our website and app

You agree to provide accurate details when you register, book, or enrol, and to keep your login details safe. You may not misuse the site, attempt to break into it, or copy our content without permission.

## Products, prices, and jewellery

Product images are for illustration. Weight, making charges, metal type, and stone details shown online are a guide; the final piece is confirmed in store. Gold, silver, and diamond prices follow live metal rates and may change without notice. Making charges and any GST are additional unless we say otherwise.

Custom or made-to-order jewellery may take longer and cannot always be cancelled once work has started. Please confirm sizes, designs, and delivery dates with our team before we begin.

## Appointments

Booking a consultation helps us set aside time for you. Please arrive on time or let us know if you need to reschedule. Walk-ins are welcome when the boutique can accommodate you.

## Kitty scheme

Kitty plans, monthly amounts, duration, joining fees, and any bonus months are as described in the plan you enrol in. Late or missed instalments may attract fees as set out in that plan. Scheme-specific rules shown at enrolment apply in addition to these terms.

Kitty savings are for jewellery purchase with Garg Jewellers as described at enrolment. They are not a bank deposit or investment product.

## Intellectual property

The Garg Jewellers and The House of Garg names, logos, photographs, and website content belong to us or our licensors. You may not reuse them without written consent.

## Limitation of liability

Jewellery is a physical product; colour and finish can vary slightly from photographs. To the extent allowed by Indian law, we are not liable for indirect or consequential loss arising from use of the website or app. Nothing in these terms limits liability that cannot legally be limited.

## Governing law

These terms are governed by the laws of India. Courts in Punjab shall have jurisdiction, subject to any rights you have as a consumer.

## Changes

We may update these terms. Continued use of the website or app after a change means you accept the updated terms. The latest version is always on this page.

## Contact

Questions about these terms: gargjewel@gmail.com or +91 90549 00042.
""",
    },
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_response(doc: dict, slug: str) -> dict:
    updated = doc.get("updated_at")
    if isinstance(updated, datetime):
        updated = updated.isoformat()
    return {
        "slug": slug,
        "title": doc.get("title") or DEFAULT_PAGES[slug]["title"],
        "body": doc.get("body") or "",
        "updated_at": updated or "",
    }


def seed_pages() -> None:
    """Insert default privacy/terms if missing. Does not overwrite admin edits."""
    coll = get_pages_collection()
    now = _now()
    for slug, defaults in DEFAULT_PAGES.items():
        existing = coll.find_one({"_id": slug}, {"_id": 1})
        if existing:
            continue
        coll.insert_one(
            {
                "_id": slug,
                "title": defaults["title"],
                "body": defaults["body"],
                "updated_at": now,
            }
        )


def page_get(slug: str) -> Optional[dict]:
    slug = (slug or "").strip().lower()
    if slug not in ALLOWED_SLUGS:
        return None
    coll = get_pages_collection()
    doc = coll.find_one({"_id": slug})
    if not doc:
        defaults = DEFAULT_PAGES[slug]
        return {
            "slug": slug,
            "title": defaults["title"],
            "body": defaults["body"],
            "updated_at": "",
        }
    return _to_response(doc, slug)


def page_update(slug: str, title: Optional[str], body: Optional[str]) -> Optional[dict]:
    slug = (slug or "").strip().lower()
    if slug not in ALLOWED_SLUGS:
        return None
    defaults = DEFAULT_PAGES[slug]
    current = page_get(slug) or defaults
    next_title = (title if title is not None else current.get("title")) or defaults["title"]
    next_body = body if body is not None else current.get("body", "")
    next_title = next_title.strip() or defaults["title"]
    coll = get_pages_collection()
    now = _now()
    coll.update_one(
        {"_id": slug},
        {"$set": {"title": next_title, "body": next_body, "updated_at": now}},
        upsert=True,
    )
    return page_get(slug)


def page_list() -> list[dict]:
    pages = []
    for slug in ALLOWED_SLUGS:
        page = page_get(slug)
        if page:
            pages.append(page)
    return pages
