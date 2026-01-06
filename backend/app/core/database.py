"""
Database connection and session management.
"""
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import SQLITE_DB_PATH

# Ensure the database directory exists
db_path = Path(SQLITE_DB_PATH)
db_path.parent.mkdir(parents=True, exist_ok=True)

# Create SQLite engine
# Use check_same_thread=False for SQLite to work with FastAPI
sqlite_url = f"sqlite:///{SQLITE_DB_PATH}"
engine = create_engine(
    sqlite_url,
    connect_args={"check_same_thread": False},  # Required for SQLite with FastAPI
    echo=False,  # Set to True for SQL debugging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for FastAPI to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

