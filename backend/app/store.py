"""In-memory store. Replace with database in production."""
import uuid
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

# Seed initial products (only if empty)
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
    for k, v in data.items():
        if k in products[id]:
            products[id][k] = v
    return products[id]


def product_delete(id: str) -> bool:
    if id in products:
        del products[id]
        return True
    return False


def rates_get() -> dict:
    return dict(metal_rates)


def rates_update(updates: dict) -> dict:
    for k, v in updates.items():
        if k in metal_rates and v is not None:
            metal_rates[k] = float(v)
    return rates_get()


_seed()
