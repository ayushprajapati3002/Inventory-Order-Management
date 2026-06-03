"""
SQLAlchemy ORM models for the Inventory & Order Management System.

Models:
  - Product:   inventory items with SKU, price, and quantity tracking
  - Customer:  customer records with unique email
  - Order:     orders linking customers to products
  - OrderItem: line items within an order
"""

import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, Numeric, DateTime,
    ForeignKey, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base



class Product(Base):
    """Inventory product with unique SKU and stock tracking."""
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_product_quantity_non_negative"),
    )

    order_items = relationship("OrderItem", back_populates="product")

    def __repr__(self):
        return f"<Product(name='{self.name}', sku='{self.sku}', qty={self.quantity})>"


class Customer(Base):
    """Customer record with unique email address."""
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    orders = relationship(
        "Order",
        back_populates="customer",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Customer(name='{self.full_name}', email='{self.email}')>"


class Order(Base):
    """Order record linking a customer to one or more products."""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False
    )
    total_amount = Column(Numeric(12, 2), nullable=False, default=0)
    product_name = Column(String(500), nullable=True)
    quantity = Column(Integer, nullable=True, default=0)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    customer = relationship("Customer", back_populates="orders")
    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Order(id='{self.id}', total={self.total_amount})>"


class OrderItem(Base):
    """Individual line item within an order."""
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(
        Integer,
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False
    )
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True
    )
    product_name = Column(String(255), nullable=True)
    product_sku = Column(String(100), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    def __repr__(self):
        return f"<OrderItem(product_id='{self.product_id}', qty={self.quantity})>"
