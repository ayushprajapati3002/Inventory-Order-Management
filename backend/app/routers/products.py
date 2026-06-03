"""
Products router — full CRUD for inventory products.

Business rules enforced:
  - SKU must be unique (HTTP 409 on duplicate)
  - Quantity cannot be negative (HTTP 400)
  - Proper HTTP status codes for all operations
"""

from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import Product
from app.schemas import ProductCreate, ProductUpdate, ProductResponse

router = APIRouter(prefix="/products", tags=["Products"])


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product. SKU must be unique."""
    db_product = Product(
        name=product.name,
        sku=product.sku,
        price=product.price,
        quantity=product.quantity
    )
    db.add(db_product)
    try:
        db.commit()
        db.refresh(db_product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with SKU '{product.sku}' already exists"
        )
    return db_product


@router.get("/", response_model=List[ProductResponse])
def list_products(db: Session = Depends(get_db)):
    """Retrieve all products."""
    return db.query(Product).order_by(Product.created_at.desc()).all()


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: UUID, db: Session = Depends(get_db)):
    """Retrieve a single product by ID."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found"
        )
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: UUID,
    product_data: ProductUpdate,
    db: Session = Depends(get_db)
):
    """Update product details. SKU must remain unique."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found"
        )

    update_dict = product_data.model_dump(exclude_unset=True)

    # Validate quantity is not negative
    if "quantity" in update_dict and update_dict["quantity"] < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product quantity cannot be negative"
        )

    for key, value in update_dict.items():
        setattr(product, key, value)

    try:
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with SKU '{update_dict.get('sku')}' already exists"
        )
    return product


@router.delete("/{product_id}", status_code=status.HTTP_200_OK)
def delete_product(product_id: UUID, db: Session = Depends(get_db)):
    """Delete a product by ID."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found"
        )
    db.delete(product)
    db.commit()
    return {"message": f"Product '{product.name}' deleted successfully"}
