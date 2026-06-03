"""
Orders router — order creation with atomic stock management.

Business rules enforced:
  - Validates customer exists (HTTP 404)
  - Validates all products exist (HTTP 404)
  - Checks stock availability per item (HTTP 422 with product name)
  - Deducts stock atomically within a DB transaction
  - Auto-calculates total_amount = sum(qty × unit_price)
  - Cancelling/deleting an order restores stock
"""

from uuid import UUID
from typing import List
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Order, OrderItem, Product, Customer
from app.schemas import OrderCreate, OrderResponse, OrderItemResponse

router = APIRouter(prefix="/orders", tags=["Orders"])


def _build_order_response(order: Order) -> dict:
    """Build a complete order response with customer name and product details."""
    p_names = order.product_name
    if not p_names:
        p_names = ", ".join([item.product.name for item in order.items if item.product])
    
    qty = order.quantity
    if not qty or qty == 0:
        qty = sum([item.quantity for item in order.items])

    return {
        "id": order.id,
        "customer_id": order.customer_id,
        "customer_name": order.customer.full_name if order.customer else None,
        "product_name": p_names,
        "quantity": qty,
        "total_amount": order.total_amount,
        "created_at": order.created_at,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product_name or (item.product.name if item.product else None),
                "product_sku": item.product_sku or (item.product.sku if item.product else None),
                "quantity": item.quantity,
                "unit_price": item.unit_price,
            }
            for item in order.items
        ]
    }


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(order_data: OrderCreate, db: Session = Depends(get_db)):
    """
    Create a new order with atomic stock deduction.

    Steps:
      1. Validate customer exists
      2. For each item: validate product exists, check stock
      3. Deduct stock from all products
      4. Calculate total amount
      5. Commit everything in one transaction
    """
    # 1. Validate customer
    customer = db.query(Customer).filter(Customer.id == order_data.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID '{order_data.customer_id}' not found"
        )

    # 2. Validate products and check stock
    total_amount = Decimal("0.00")
    order_items = []
    product_names = []
    total_quantity = 0

    for item in order_data.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID '{item.product_id}' not found"
            )

        if product.quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Insufficient stock for {product.name}. "
                       f"Available: {product.quantity}, Requested: {item.quantity}"
            )

        # 3. Deduct stock
        product.quantity -= item.quantity
        product_names.append(product.name)
        total_quantity += item.quantity

        # Calculate line total
        line_total = Decimal(str(product.price)) * item.quantity
        total_amount += line_total

        order_items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                product_sku=product.sku,
                quantity=item.quantity,
                unit_price=product.price
            )
        )

    # 4. Create order
    new_order = Order(
        customer_id=order_data.customer_id,
        total_amount=total_amount,
        product_name=", ".join(product_names),
        quantity=total_quantity
    )
    new_order.items = order_items
    db.add(new_order)

    # 5. Commit transaction (atomic — all stock deductions + order creation)
    try:
        db.commit()
        db.refresh(new_order)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
        )

    # Reload with relationships
    order = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == new_order.id)
        .first()
    )
    return _build_order_response(order)


@router.get("/", response_model=List[OrderResponse])
def list_orders(db: Session = Depends(get_db)):
    """Retrieve all orders with customer names and item details."""
    orders = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items).joinedload(OrderItem.product))
        .order_by(Order.created_at.desc())
        .all()
    )
    return [_build_order_response(o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """Retrieve a single order with full details."""
    order = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID '{order_id}' not found"
        )
    return _build_order_response(order)


@router.delete("/{order_id}", status_code=status.HTTP_200_OK)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """
    Cancel/delete an order and restore stock for all items.
    """
    order = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID '{order_id}' not found"
        )

    # Restore stock for each item
    for item in order.items:
        if item.product:
            item.product.quantity += item.quantity

    db.delete(order)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete order: {str(e)}"
        )

    return {"message": f"Order '{order_id}' cancelled and stock restored"}
