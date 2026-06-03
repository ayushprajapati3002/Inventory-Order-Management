"""
Customers router — CRUD for customer management.

Business rules enforced:
  - Customer email must be unique (HTTP 409 on duplicate)
  - Proper HTTP status codes for all operations
"""

from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import Customer, Order, OrderItem
from app.schemas import CustomerCreate, CustomerResponse, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer. Email must be unique."""
    db_customer = Customer(
        full_name=customer.full_name,
        email=customer.email,
        phone=customer.phone
    )
    db.add(db_customer)
    try:
        db.commit()
        db.refresh(db_customer)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Customer with email '{customer.email}' already exists"
        )
    return db_customer


@router.get("/", response_model=List[CustomerResponse])
def list_customers(db: Session = Depends(get_db)):
    """Retrieve all customers."""
    return db.query(Customer).order_by(Customer.created_at.desc()).all()


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: UUID, db: Session = Depends(get_db)):
    """Retrieve a single customer by ID."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID '{customer_id}' not found"
        )
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: UUID,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db)
):
    """Update customer details. Email must remain unique."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID '{customer_id}' not found"
        )

    update_dict = customer_data.model_dump(exclude_unset=True)

    for key, value in update_dict.items():
        setattr(customer, key, value)

    try:
        db.commit()
        db.refresh(customer)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Customer with email '{update_dict.get('email')}' already exists"
        )
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_200_OK)
def delete_customer(customer_id: UUID, db: Session = Depends(get_db)):
    """Delete a customer by ID, restoring stock for all their orders."""
    from sqlalchemy.orm import joinedload
    customer = (
        db.query(Customer)
        .options(
            joinedload(Customer.orders)
            .joinedload(Order.items)
            .joinedload(OrderItem.product)
        )
        .filter(Customer.id == customer_id)
        .first()
    )
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID '{customer_id}' not found"
        )

    # Restore stock for each item in all orders belonging to this customer
    for order in customer.orders:
        for item in order.items:
            if item.product:
                item.product.quantity += item.quantity

    db.delete(customer)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete customer and restore stock: {str(e)}"
        )

    return {"message": f"Customer '{customer.full_name}' deleted, associated orders cancelled, and stock restored"}
