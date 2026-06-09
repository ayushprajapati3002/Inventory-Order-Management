"""
FastAPI application entry point.

- Configures CORS middleware (all origins for development)
- Registers all routers: products, customers, orders, dashboard
- Creates database tables on startup
- Provides /health endpoint for deployment health checks
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.requests import Request

from sqlalchemy import text
from app.database import engine, Base
from app.routers import products, customers, orders, dashboard

# Check and drop orders/order_items if they have UUID ID column (migration to Integer IDs) or are missing columns
try:
    with engine.begin() as conn:
        res = conn.execute(text("""
            SELECT data_type FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name = 'id';
        """)).fetchone()
        
        res_items = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'order_items' AND column_name = 'product_name';
        """)).fetchone()
        
        should_drop = False
        if res and res[0].lower() == 'uuid':
            should_drop = True
            print("Detected UUID primary key on orders table.")
        elif not res_items:
            table_exists = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'order_items'
                );
            """)).fetchone()
            if table_exists and table_exists[0]:
                should_drop = True
                print("Detected old order_items table schema (missing product_name column).")
                
        if should_drop:
            print("Dropping orders and order_items to recreate with new schema...")
            conn.execute(text("DROP TABLE IF EXISTS order_items CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS orders CASCADE;"))
except Exception as e:
    print(f"Error checking/dropping tables for migration: {e}")

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

# Run migrations and security configurations
try:
    with engine.begin() as conn:
        # Migrations
        conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_name VARCHAR(500);"))
        conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;"))
        
        # Performance: Create covering indexes for foreign keys
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_customer_id ON orders (customer_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_order_items_order_id ON order_items (order_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_order_items_product_id ON order_items (product_id);"))
        
        # Security: Enable Row Level Security (RLS) to resolve Supabase warnings
        # This secures the tables from unauthorized access via PostgREST API
        # while still allowing the FastAPI backend (which uses a direct connection) full access.
        conn.execute(text("ALTER TABLE customers ENABLE ROW LEVEL SECURITY;"))
        conn.execute(text("ALTER TABLE products ENABLE ROW LEVEL SECURITY;"))
        conn.execute(text("ALTER TABLE orders ENABLE ROW LEVEL SECURITY;"))
        conn.execute(text("ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;"))
except Exception as e:
    print(f"Migration/Security error: {e}")

app = FastAPI(
    title="Inventory & Order Management System",
    description="Production-ready API for managing products, customers, orders, and inventory tracking.",
    version="1.0.0",
)

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(dashboard.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Ensure CORS headers are present and expose detailed error for debugging."""
    import traceback
    print(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"Backend Error: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": "*"},
    )


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for deployment monitoring."""
    return {"status": "ok"}


@app.get("/", tags=["Root"])
def root():
    """Root endpoint with API information."""
    return {
        "message": "Inventory & Order Management API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }
