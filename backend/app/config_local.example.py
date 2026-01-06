"""
Local configuration example for the backend.
Copy this file as `app/config_local.py` and keep it out of git.
"""

# Database (SQLite)
# Path to SQLite database file (relative to backend directory or absolute path)
SQLITE_DB_PATH = "data/app.db"

# Security
SESSION_COOKIE_NAME = "researchflow_session"
SESSION_SECRET = "CHANGE_ME_RANDOM_SECRET_FOR_SIGNING"  # keep only on the server

# Email (SMTP) Configuration
SMTP_HOST = "smtp.example.com"  # Your SMTP server
SMTP_PORT = 465  # 465 for SSL, 587 for TLS
SMTP_USE_TLS = False  # Set to True if using port 587
SMTP_USE_SSL = True  # Set to True if using port 465
SMTP_USERNAME = "your_email@example.com"  # Your email address
SMTP_PASSWORD = "YOUR_EMAIL_PASSWORD"  # Email account password
SMTP_FROM_EMAIL = "your_email@example.com"  # From address
SMTP_FROM_NAME = "Doc Flow"  # Display name

# Email verification
EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS = 24  # Token expires after 24 hours
FRONTEND_BASE_URL = "http://localhost:3000"  # Change to your production URL

