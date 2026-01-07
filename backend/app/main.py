"""
FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, auth, organizations, leads, stages, templates, documents
from app.api.admin import router as admin_router
from app.core.config import get_settings

app_settings = get_settings()

app = FastAPI(
    title="Doc Flow API",
    description="CRM system with Leads management",
    version="1.0.0",
)

# CORS middleware (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Frontend dev server (localhost)
        "http://127.0.0.1:3000",      # Frontend dev server (127.0.0.1)
        "http://45.144.177.203:3000",  # Old production frontend
        "http://84.54.30.222:3000",    # Production frontend (rf-prod)
        "https://researchflow.ru",     # Production domain
        "https://www.researchflow.ru", # Production domain (www)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(organizations.router, prefix="/api", tags=["organizations"])
app.include_router(leads.router, prefix="/api/leads", tags=["leads"])
app.include_router(stages.router, prefix="/api/stages", tags=["stages"])
app.include_router(templates.router, prefix="/api", tags=["templates"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])



