"""
Leads API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date, timezone
from decimal import Decimal
from app.core.database import get_db
from app.core.auth import get_current_user_dependency, get_current_organization_dependency
from app.models.user import User
from app.models.organization import Organization
from app.models.lead import Lead
from app.models.lead_stage import LeadStage
from app.models.lead_stage_history import LeadStageHistory

router = APIRouter()


# ========== Pydantic Schemas ==========

class LeadStageResponse(BaseModel):
    id: int
    name: str
    order: int
    color: Optional[str] = None
    is_default: bool
    is_archived: bool

    class Config:
        from_attributes = True


class LeadUserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class LeadCreate(BaseModel):
    """Schema for creating a lead - only required fields."""
    full_name: str = Field(..., description="Full name (required) - שם")
    # All other fields are optional
    client_id: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[EmailStr] = None
    birth_date: Optional[date] = None
    stage_id: Optional[int] = None  # Defaults to first stage if not provided
    assigned_user_id: Optional[int] = None
    source: str = "manual"  # 'manual' or 'form'

    class Config:
        extra = "allow"  # Allow additional fields


class LeadUpdate(BaseModel):
    """Schema for updating a lead - all fields optional."""
    full_name: Optional[str] = None
    client_id: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[EmailStr] = None
    birth_date: Optional[date] = None
    stage_id: Optional[int] = None
    assigned_user_id: Optional[int] = None

    class Config:
        extra = "allow"  # Allow additional fields


class LeadResponse(BaseModel):
    """Full lead response with all fields."""
    id: int
    organization_id: int
    stage_id: int
    assigned_user_id: Optional[int] = None
    created_by_user_id: int
    source: str
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Basic info
    full_name: str
    client_id: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    birth_date: Optional[date] = None
    
    # Include nested objects
    stage: Optional[LeadStageResponse] = None
    assigned_user: Optional[LeadUserResponse] = None
    created_by_user: Optional[LeadUserResponse] = None
    
    class Config:
        from_attributes = True
        extra = "allow"  # Allow additional fields from model


class LeadListResponse(BaseModel):
    """Paginated lead list response."""
    leads: List[LeadResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class StageHistoryResponse(BaseModel):
    id: int
    stage_id: int
    changed_by_user_id: int
    changed_at: datetime
    stage: Optional[LeadStageResponse] = None
    changed_by_user: Optional[LeadUserResponse] = None

    class Config:
        from_attributes = True


class LeadDetailResponse(LeadResponse):
    """Lead detail response with stage history."""
    stage_history: List[StageHistoryResponse] = []


# ========== Helper Functions ==========

def get_default_stage(db: Session) -> LeadStage:
    """Get the default stage (first stage)."""
    stage = db.query(LeadStage).filter(LeadStage.is_default == True).first()
    if not stage:
        # Fallback to first stage by order
        stage = db.query(LeadStage).order_by(LeadStage.order).first()
    if not stage:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No stages found in database"
        )
    return stage


def create_stage_history_entry(
    db: Session,
    lead_id: int,
    stage_id: int,
    changed_by_user_id: int
):
    """Create a stage history entry."""
    history = LeadStageHistory(
        lead_id=lead_id,
        stage_id=stage_id,
        changed_by_user_id=changed_by_user_id
    )
    db.add(history)
    db.flush()


# ========== API Endpoints ==========

@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_data: LeadCreate,
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """Create a new lead."""
    # Validate required field
    if not lead_data.full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="full_name is required"
        )
    
    # Get or set default stage
    if lead_data.stage_id:
        stage = db.query(LeadStage).filter(LeadStage.id == lead_data.stage_id).first()
        if not stage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Stage not found"
            )
    else:
        stage = get_default_stage(db)
    
    # Convert Pydantic model to dict, excluding None values for optional fields
    lead_dict = lead_data.dict(exclude_none=True)
    
    # Create Lead instance
    new_lead = Lead(
        organization_id=current_organization.id,
        stage_id=stage.id,
        created_by_user_id=current_user.id,
        full_name=lead_dict['full_name'],
        source=lead_dict.get('source', 'manual'),
        assigned_user_id=lead_dict.get('assigned_user_id'),
        client_id=lead_dict.get('client_id'),
        phone=lead_dict.get('phone'),
        address=lead_dict.get('address'),
        email=lead_dict.get('email'),
        birth_date=lead_dict.get('birth_date'),
        # Add any other fields from lead_dict
        **{k: v for k, v in lead_dict.items() if k not in ['stage_id', 'source', 'assigned_user_id', 'full_name', 'client_id', 'phone', 'address', 'email', 'birth_date']}
    )
    
    db.add(new_lead)
    db.flush()
    
    # Create initial stage history entry
    create_stage_history_entry(db, new_lead.id, stage.id, current_user.id)
    
    db.commit()
    db.refresh(new_lead)
    
    # Load relationships
    new_lead.stage = stage
    if new_lead.assigned_user_id:
        new_lead.assigned_user = db.query(User).filter(User.id == new_lead.assigned_user_id).first()
    new_lead.created_by_user = current_user
    
    return new_lead


@router.get("", response_model=LeadListResponse)
async def list_leads(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    stage_id: Optional[List[int]] = Query(None, description="Filter by stage IDs"),
    assigned_user_id: Optional[List[int]] = Query(None, description="Filter by assigned user IDs"),
    search: Optional[str] = Query(None, description="Full-text search"),
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """List leads with pagination, filtering, and search."""
    # Build base query
    query = db.query(Lead).filter(
        Lead.organization_id == current_organization.id,
        Lead.deleted_at.is_(None)  # Soft delete filter
    )
    
    # Apply filters
    if stage_id:
        query = query.filter(Lead.stage_id.in_(stage_id))
    
    if assigned_user_id:
        query = query.filter(Lead.assigned_user_id.in_(assigned_user_id))
    
    # Full-text search across text fields
    if search:
        search_filter = or_(
            Lead.full_name.ilike(f"%{search}%"),
            Lead.email.ilike(f"%{search}%"),
            Lead.phone.ilike(f"%{search}%"),
            Lead.client_id.ilike(f"%{search}%"),
            Lead.address.ilike(f"%{search}%"),
            Lead.transaction_name.ilike(f"%{search}%"),
        )
        query = query.filter(search_filter)
    
    # Count total
    total = query.count()
    
    # Pagination
    offset = (page - 1) * limit
    total_pages = (total + limit - 1) // limit
    
    # Order and paginate
    leads = query.order_by(Lead.created_at.desc()).offset(offset).limit(limit).all()
    
    # Load relationships
    for lead in leads:
        lead.stage = db.query(LeadStage).filter(LeadStage.id == lead.stage_id).first()
        if lead.assigned_user_id:
            lead.assigned_user = db.query(User).filter(User.id == lead.assigned_user_id).first()
        lead.created_by_user = db.query(User).filter(User.id == lead.created_by_user_id).first()
    
    return LeadListResponse(
        leads=leads,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/{lead_id}", response_model=LeadDetailResponse)
async def get_lead(
    lead_id: int,
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """Get lead details with stage history."""
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.organization_id == current_organization.id,
        Lead.deleted_at.is_(None)
    ).first()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    # Load relationships
    lead.stage = db.query(LeadStage).filter(LeadStage.id == lead.stage_id).first()
    if lead.assigned_user_id:
        lead.assigned_user = db.query(User).filter(User.id == lead.assigned_user_id).first()
    lead.created_by_user = db.query(User).filter(User.id == lead.created_by_user_id).first()
    
    # Load stage history
    stage_history = db.query(LeadStageHistory).filter(
        LeadStageHistory.lead_id == lead_id
    ).order_by(LeadStageHistory.changed_at.asc()).all()
    
    # Load relationships for history
    for history in stage_history:
        history.stage = db.query(LeadStage).filter(LeadStage.id == history.stage_id).first()
        history.changed_by_user = db.query(User).filter(User.id == history.changed_by_user_id).first()
    
    # Create response - LeadDetailResponse extends LeadResponse, so it can be constructed from lead
    # Since we have from_attributes=True, Pydantic will automatically extract attributes
    response_dict = {
        **{col.name: getattr(lead, col.name) for col in Lead.__table__.columns},
        'stage': lead.stage,
        'assigned_user': lead.assigned_user,
        'created_by_user': lead.created_by_user,
        'stage_history': stage_history
    }
    response = LeadDetailResponse(**response_dict)
    return response


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """Update a lead."""
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.organization_id == current_organization.id,
        Lead.deleted_at.is_(None)
    ).first()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    # Check if stage changed
    stage_changed = False
    old_stage_id = lead.stage_id
    
    # Convert to dict and update fields
    update_dict = lead_data.model_dump(exclude_none=True)
    
    # Handle stage_id separately
    if 'stage_id' in update_dict and update_dict['stage_id'] != lead.stage_id:
        stage = db.query(LeadStage).filter(LeadStage.id == update_dict['stage_id']).first()
        if not stage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Stage not found"
            )
        lead.stage_id = update_dict['stage_id']
        stage_changed = True
        del update_dict['stage_id']
    
    # Update other fields
    for field, value in update_dict.items():
        if hasattr(lead, field):
            setattr(lead, field, value)
    
    # Create stage history entry if stage changed
    if stage_changed:
        create_stage_history_entry(db, lead_id, lead.stage_id, current_user.id)
    
    db.commit()
    db.refresh(lead)
    
    # Load relationships
    lead.stage = db.query(LeadStage).filter(LeadStage.id == lead.stage_id).first()
    if lead.assigned_user_id:
        lead.assigned_user = db.query(User).filter(User.id == lead.assigned_user_id).first()
    lead.created_by_user = db.query(User).filter(User.id == lead.created_by_user_id).first()
    
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: int,
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """Soft delete a lead."""
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.organization_id == current_organization.id,
        Lead.deleted_at.is_(None)
    ).first()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )

    # Soft delete
    lead.deleted_at = datetime.now(timezone.utc)
    db.commit()
    
    return None
