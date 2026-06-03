"""
Database configuration and session management.
Uses SQLAlchemy with PostgreSQL via psycopg2.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.wxsjfddxerggwzzfvktg:6iNhlyDu0XLrHmzK@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
