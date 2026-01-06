"""
Stages API endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user_dependency
from app.models.user import User
from app.models.lead_stage import LeadStage
from app.api.leads import LeadStageResponse

router = APIRouter()


@router.get("", response_model=List[LeadStageResponse])
async def list_stages(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """List all global stages (read-only)."""
    stages = db.query(LeadStage).order_by(LeadStage.order.asc()).all()
    return stages

