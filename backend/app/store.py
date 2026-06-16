"""In-memory store. Replace with database in production."""
import uuid
from datetime import datetime, timezone
from typing import Optional

# Products: id -> dict
products: dict[str, dict] = {}

# Metal rates (per gram or index). When these change, product prices update automatically.
metal_rates = {
    "gold_24k": 6320,
    "gold_22k": 5800,
    "silver": 78,
    "diamond": 52000,
    "bronze": 0,
}

# Kitty savings scheme
kitty_plans: dict[str, dict] = {}
kitty_members: dict[str, dict] = {}


# ─── Seed helpers ────────────────────────────────────────────────────────────

def _seed():
    if products:
        return
    seed_products = [
        {"name": "Gold Ring", "category": "gold", "weight": 4.5, "making_charges": 800, "metal_type": "Gold", "purity": "22K", "product_type": "Ring", "diamond_weight": None, "images": []},
        {"name": "Gold Chain", "category": "gold", "weight": 8.2, "making_charges": 1200, "metal_type": "Gold", "purity": "24K", "product_type": "Chain", "diamond_weight": None, "images": []},
        {"name": "Gold Bangle", "category": "gold", "weight": 25, "making_charges": 2500, "metal_type": "Gold", "purity": "22K", "product_type": "Bangle", "diamond_weight": None, "images": []},
        {"name": "Silver Ring", "category": "silver", "weight": 5, "making_charges": 200, "metal_type": "Silver", "purity": None, "product_type": "Ring", "diamond_weight": None, "images": []},
        {"name": "Silver Chain", "category": "silver", "weight": 15, "making_charges": 400, "metal_type": "Silver", "purity": None, "product_type": "Chain", "diamond_weight": None, "images": []},
        {"name": "Diamond Ring", "category": "diamond", "weight": 0, "making_charges": 15000, "metal_type": "Diamond", "purity": None, "product_type": "Ring", "diamond_weight": 0.5, "images": []},
        {"name": "Bronze Ring", "category": "bronze", "weight": 12, "making_charges": 150, "metal_type": "Bronze", "purity": None, "product_type": "Ring", "diamond_weight": None, "images": []},
    ]
    for p in seed_products:
        product_create(p)


def _seed_kitty_plans():
    if kitty_plans:
        return
    seed_plans = [
        {
            "name": "Silver Savings – ₹1,000/mo",
            "monthly_amount": 1000,
            "duration_months": 11,
            "bonus_months": 1,
            "description": "Save ₹1,000 every month for 11 months and get 1 month free. Redeem ₹12,000 toward any purchase.",
            "is_active": True,
        },
        {
            "name": "Gold Savings – ₹2,000/mo",
            "monthly_amount": 2000,
            "duration_months": 11,
            "bonus_months": 1,
            "description": "Save ₹2,000 every month for 11 months and get 1 month free. Redeem ₹24,000 toward any purchase.",
            "is_active": True,
        },
        {
            "name": "Premium – ₹5,000/mo",
            "monthly_amount": 5000,
            "duration_months": 11,
            "bonus_months": 1,
            "description": "Save ₹5,000 every month for 11 months and get 1 month free. Redeem ₹60,000 toward any purchase.",
            "is_active": True,
        },
    ]
    for p in seed_plans:
        kitty_plan_create(p)


# ─── Products ────────────────────────────────────────────────────────────────

def product_list() -> list[dict]:
    return list(products.values())


def product_get(id: str) -> Optional[dict]:
    return products.get(id)


def product_create(data: dict) -> dict:
    id = str(uuid.uuid4())
    products[id] = {"id": id, **data}
    return products[id]


def product_update(id: str, data: dict) -> Optional[dict]:
    if id not in products:
        return None
    # Update all provided keys (not just pre-existing ones)
    for k, v in data.items():
        if k != "id":
            products[id][k] = v
    return products[id]


def product_delete(id: str) -> bool:
    if id in products:
        del products[id]
        return True
    return False


# ─── Metal Rates ─────────────────────────────────────────────────────────────

def rates_get() -> dict:
    return dict(metal_rates)


def rates_update(updates: dict) -> dict:
    for k, v in updates.items():
        if k in metal_rates and v is not None:
            metal_rates[k] = float(v)
    return rates_get()


# ─── Kitty Plans ─────────────────────────────────────────────────────────────

def _plan_total(plan: dict) -> float:
    return plan["monthly_amount"] * (plan["duration_months"] + plan["bonus_months"])


def kitty_plan_list() -> list[dict]:
    return list(kitty_plans.values())


def kitty_plan_get(id: str) -> Optional[dict]:
    return kitty_plans.get(id)


def kitty_plan_create(data: dict) -> dict:
    id = str(uuid.uuid4())
    plan = {"id": id, **data}
    plan["total_redeemable"] = _plan_total(plan)
    kitty_plans[id] = plan
    return plan


def kitty_plan_update(id: str, data: dict) -> Optional[dict]:
    if id not in kitty_plans:
        return None
    for k, v in data.items():
        if k != "id" and v is not None:
            kitty_plans[id][k] = v
    kitty_plans[id]["total_redeemable"] = _plan_total(kitty_plans[id])
    return kitty_plans[id]


def kitty_plan_delete(id: str) -> bool:
    if id in kitty_plans:
        del kitty_plans[id]
        return True
    return False


# ─── Kitty Members ───────────────────────────────────────────────────────────

def _member_enrich(member: dict) -> dict:
    plan = kitty_plans.get(member.get("plan_id", ""))
    member["payments_made"] = len(member.get("payments", []))
    member["plan_duration"] = plan["duration_months"] if plan else 11
    return member


def kitty_member_list() -> list[dict]:
    return [_member_enrich(dict(m)) for m in kitty_members.values()]


def kitty_member_get(id: str) -> Optional[dict]:
    m = kitty_members.get(id)
    return _member_enrich(dict(m)) if m else None


def kitty_member_create(data: dict) -> dict:
    id = str(uuid.uuid4())
    member = {
        "id": id,
        "status": "active",
        "payments": [],
        "redemption_date": None,
        **data,
    }
    kitty_members[id] = member
    return _member_enrich(dict(member))


def kitty_member_update(id: str, data: dict) -> Optional[dict]:
    if id not in kitty_members:
        return None
    for k, v in data.items():
        if k != "id":
            kitty_members[id][k] = v
    return _member_enrich(dict(kitty_members[id]))


def kitty_member_add_payment(id: str, payment: dict) -> Optional[dict]:
    if id not in kitty_members:
        return None
    member = kitty_members[id]

    # Prevent duplicate payments for same month
    existing_months = {p["month"] for p in member["payments"]}
    if payment["month"] in existing_months:
        return None  # caller should raise 409

    member["payments"].append(payment)

    # Auto-complete when all months paid
    plan = kitty_plans.get(member.get("plan_id", ""))
    if plan and len(member["payments"]) >= plan["duration_months"]:
        member["status"] = "completed"

    return _member_enrich(dict(member))


def kitty_member_delete(id: str) -> bool:
    if id in kitty_members:
        del kitty_members[id]
        return True
    return False


_seed()
_seed_kitty_plans()
