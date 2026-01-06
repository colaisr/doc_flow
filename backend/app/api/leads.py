"""
Leads API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.core.database import get_db
from app.core.auth import get_current_user_dependency, get_current_organization_dependency
from app.models.user import User
from app.models.organization import Organization

router = APIRouter()


class LeadResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[LeadResponse])
async def list_leads(
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Optional[Organization] = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """List all leads for the current organization (placeholder)."""
    # Placeholder - return empty list for now
    return []


@router.post("", response_model=LeadResponse)
async def create_lead(
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Optional[Organization] = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """Create a new lead (placeholder)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Lead creation not yet implemented"
    )

