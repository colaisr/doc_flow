"""
Configuration management.
Loads from config_local.py (gitignored) for secrets, with defaults.
"""
import sys
from pathlib import Path
from typing import Optional

# Try to import local config (gitignored)
try:
    from app.config_local import (
        SQLITE_DB_PATH,
        SESSION_COOKIE_NAME,
        SESSION_SECRET,
        SMTP_HOST,
        SMTP_PORT,
        SMTP_USE_TLS,
        SMTP_USE_SSL,
        SMTP_USERNAME,
        SMTP_PASSWORD,
        SMTP_FROM_EMAIL,
        SMTP_FROM_NAME,
        EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
        FRONTEND_BASE_URL,
    )
except ImportError:
    # Fallback defaults
    SQLITE_DB_PATH: str = "data/app.db"
    SESSION_COOKIE_NAME: str = "researchflow_session"
    SESSION_SECRET: Optional[str] = None
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 465
    SMTP_USE_TLS: bool = False
    SMTP_USE_SSL: bool = True
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "Research Flow"
    EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS: int = 24
    FRONTEND_BASE_URL: str = "http://localhost:3000"


def get_settings():
    """Return settings object (for FastAPI dependency injection if needed)."""
    return type("Settings", (), {
        "sqlite_db_path": SQLITE_DB_PATH,
        "session_cookie_name": SESSION_COOKIE_NAME,
        "session_secret": SESSION_SECRET,
        "smtp_host": SMTP_HOST,
        "smtp_port": SMTP_PORT,
        "smtp_use_tls": SMTP_USE_TLS,
        "smtp_use_ssl": SMTP_USE_SSL,
        "smtp_username": SMTP_USERNAME,
        "smtp_password": SMTP_PASSWORD,
        "smtp_from_email": SMTP_FROM_EMAIL,
        "smtp_from_name": SMTP_FROM_NAME,
        "email_verification_token_expiry_hours": EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
        "frontend_base_url": FRONTEND_BASE_URL,
    })()

