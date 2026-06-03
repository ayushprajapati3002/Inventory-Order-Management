"""
Dashboard router — aggregated statistics for the dashboard view.

Returns:
  - Total product count
  - Total customer count
  - Total order count
  - List of low-stock products (quantity <= 10)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, Customer, Order
from app.schemas import DashboardStats, LowStockProduct

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

LOW_STOCK_THRESHOLD = 10


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Return aggregated inventory statistics and low-stock alerts."""
    total_products = db.query(Product).count()
    total_customers = db.query(Customer).count()
    total_orders = db.query(Order).count()

    low_stock = (
        db.query(Product)
        .filter(Product.quantity <= LOW_STOCK_THRESHOLD)
        .order_by(Product.quantity.asc())
        .all()
    )

    return DashboardStats(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        low_stock_products=[
            LowStockProduct(
                id=p.id,
                name=p.name,
                sku=p.sku,
                price=p.price,
                quantity=p.quantity
            )
            for p in low_stock
        ]
    )
