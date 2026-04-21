from pydantic import BaseModel, Field
from typing import Optional


class ProductBase(BaseModel):
    name: str
    category: str  # gold, silver, diamond, bronze
    weight: float = 0
    making_charges: float = 0
    metal_type: str  # Gold, Silver, Diamond, Bronze
    purity: Optional[str] = None  # 24K, 22K, 18K for gold
    product_type: str = "Ring"  # Ring, Necklace, Chain, etc.
    diamond_weight: Optional[float] = None  # for diamond items
    images: list[str] = []


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    weight: Optional[float] = None
    making_charges: Optional[float] = None
    metal_type: Optional[str] = None
    purity: Optional[str] = None
    product_type: Optional[str] = None
    diamond_weight: Optional[float] = None
    images: Optional[list[str]] = None


class ProductResponse(ProductBase):
    id: str

    class Config:
        from_attributes = True


class MetalRatesResponse(BaseModel):
    gold_24k: float = 6320
    gold_22k: float = 5800
    silver: float = 78
    diamond: float = 52000
    bronze: float = 0


class MetalRatesUpdate(BaseModel):
    gold_24k: Optional[float] = None
    gold_22k: Optional[float] = None
    silver: Optional[float] = None
    diamond: Optional[float] = None
    bronze: Optional[float] = None


# Auth
class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class UserResponse(BaseModel):
    email: str
    name: Optional[str] = None
    is_admin: bool = False
