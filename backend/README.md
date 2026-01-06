# Doc Flow — Backend

FastAPI backend for user administration and organization management.

## Setup

1. **Create virtual environment:**
   ```bash
   python3.11 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure local settings:**
   ```bash
   cp app/config_local.example.py app/config_local.py
   ```
   - Edit `app/config_local.py` and configure:
     - SQLite database path (default: `data/app.db`)
     - Session secret (for cookie signing)
     - SMTP settings (for email verification)

4. **Run Alembic migrations:**
   ```bash
   alembic upgrade head
   ```
   This will create the SQLite database file if it doesn't exist.

5. **Start the development server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

6. **Verify:**
   - Visit `http://localhost:8000/health` — should return `{"status": "ok", ...}`
   - Visit `http://localhost:8000/docs` — FastAPI auto-generated docs

## Project Structure

```
backend/
├── app/
│   ├── api/          # API route handlers
│   ├── core/         # Core config, database, etc.
│   ├── models/       # SQLAlchemy models
│   └── main.py       # FastAPI app entry point
├── alembic/          # Database migrations
├── requirements.txt
└── README.md
```

## Development

- **Database:** Uses SQLite (database file stored at `data/app.db` by default)
- **Database migrations:** Use Alembic (`alembic revision --autogenerate -m "description"`, then `alembic upgrade head`)
- **API docs:** Auto-generated at `/docs` (Swagger) and `/redoc`

## Features

- User authentication and registration
- Email verification
- Organization management
- Organization invitations
- User and organization administration
- Feature flags system
- Audit logging for admin actions

