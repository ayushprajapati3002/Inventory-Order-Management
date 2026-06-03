"""
Pydantic schemas for request validation and response serialization.

Provides strict input validation:
  - Product: price > 0, quantity >= 0
  - Customer: valid email format
  - Order: at least one item, quantity > 0
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ──────────────────────────────────────────────
#  Product Schemas
# ──────────────────────────────────────────────

class ProductCreate(BaseModel):
    """Schema for creating a new product."""
    name: str = Field(..., min_length=1, max_length=255, description="Product name")
    sku: str = Field(..., min_length=1, max_length=100, description="Unique SKU code")
    price: Decimal = Field(..., gt=0, description="Product price (must be > 0)")
    quantity: int = Field(..., ge=0, description="Stock quantity (must be >= 0)")


class ProductUpdate(BaseModel):
    """Schema for updating a product. All fields are optional."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    price: Optional[Decimal] = Field(None, gt=0)
    quantity: Optional[int] = Field(None, ge=0)


class ProductResponse(BaseModel):
    """Schema for product API responses."""
    id: UUID
    name: str
    sku: str
    price: Decimal
    quantity: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
#  Customer Schemas
# ──────────────────────────────────────────────

class CustomerCreate(BaseModel):
    """Schema for creating a new customer."""
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name")
    email: EmailStr = Field(..., description="Unique email address")
    phone: str = Field(..., min_length=1, max_length=50, description="Phone number")

    @field_validator("phone")
    @classmethod
    def validate_phone_number(cls, v: str) -> str:
        import re
        digits = re.sub(r"\D", "", v)
        if len(digits) != 10:
            raise ValueError("Phone number must contain exactly 10 digits")
        return v


class CustomerUpdate(BaseModel):
    """Schema for updating a customer. All fields are optional."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = Field(None)
    phone: Optional[str] = Field(None, min_length=1, max_length=50)

    @field_validator("phone")
    @classmethod
    def validate_phone_number(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import re
        digits = re.sub(r"\D", "", v)
        if len(digits) != 10:
            raise ValueError("Phone number must contain exactly 10 digits")
        return v


class CustomerResponse(BaseModel):
    """Schema for customer API responses."""
    id: UUID
    full_name: str
    email: str
    phone: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
#  Order Schemas
# ──────────────────────────────────────────────

class OrderItemCreate(BaseModel):
    """Schema for a single item within an order."""
    product_id: UUID = Field(..., description="Product UUID")
    quantity: int = Field(..., gt=0, description="Quantity to order (must be > 0)")


class OrderCreate(BaseModel):
    """Schema for creating an order."""
    customer_id: UUID = Field(..., description="Customer UUID")
    items: List[OrderItemCreate] = Field(
        ..., min_length=1, description="At least one order item required"
    )


class OrderItemResponse(BaseModel):
    """Schema for order item in API responses."""
    id: int
    product_id: Optional[UUID] = None
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    quantity: int
    unit_price: Decimal

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    """Schema for order API responses."""
    id: int
    customer_id: UUID
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    quantity: int = 0
    total_amount: Decimal
    created_at: datetime
    items: List[OrderItemResponse] = []

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
#  Dashboard Schemas
# ──────────────────────────────────────────────

class LowStockProduct(BaseModel):
    """Schema for a low-stock product entry."""
    id: UUID
    name: str
    sku: str
    price: Decimal
    quantity: int

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    """Schema for the dashboard statistics endpoint."""
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_products: List[LowStockProduct]
