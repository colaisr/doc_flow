"""
Templates API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import json
from app.core.database import get_db
from app.core.auth import get_current_user_dependency, get_current_organization_dependency
from app.models.user import User
from app.models.organization import Organization
from app.models.document_template import DocumentTemplate

router = APIRouter()


# ========== Pydantic Schemas ==========

class TemplateUserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class TemplateCreate(BaseModel):
    """Schema for creating a template."""
    name: str = Field(..., description="Template name")
    description: Optional[str] = Field(None, description="Template description")
    content: str = Field(..., description="HTML content with merge fields")
    signature_blocks: Optional[str] = Field(None, description="JSON string with signature block metadata")

    class Config:
        from_attributes = True


class TemplateUpdate(BaseModel):
    """Schema for updating a template - all fields optional."""
    name: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    signature_blocks: Optional[str] = None

    class Config:
        from_attributes = True


class TemplateResponse(BaseModel):
    """Full template response."""
    id: int
    organization_id: int
    name: str
    description: Optional[str] = None
    content: str
    signature_blocks: Optional[str] = None
    created_by_user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_active: bool
    created_by_user: Optional[TemplateUserResponse] = None

    class Config:
        from_attributes = True


# ========== Helper Functions ==========

def validate_signature_blocks_json(signature_blocks: Optional[str]) -> bool:
    """Validate that signature_blocks is valid JSON if provided."""
    if signature_blocks is None or signature_blocks.strip() == "":
        return True
    
    try:
        data = json.loads(signature_blocks)
        if not isinstance(data, list):
            return False
        # Validate each signature block has required fields
        required_fields = ["id", "type", "x", "y", "width", "height"]
        for block in data:
            if not isinstance(block, dict):
                return False
            if not all(field in block for field in required_fields):
                return False
            if block.get("type") not in ["client", "internal"]:
                return False
        return True
    except json.JSONDecodeError:
        return False


# ========== API Endpoints ==========

@router.get("/organizations/{organization_id}/templates", response_model=list[TemplateResponse])
async def list_templates(
    organization_id: int,
    search: Optional[str] = Query(None, description="Search in name and description"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
):
    """
    List all templates for an organization.
    Requires organization membership.
    """
    # Verify organization access
    if current_organization.id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this organization"
        )

    # Build query
    query = db.query(DocumentTemplate).filter(
        DocumentTemplate.organization_id == organization_id,
        DocumentTemplate.is_active == True
    )

    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                DocumentTemplate.name.ilike(search_term),
                DocumentTemplate.description.ilike(search_term)
            )
        )

    # Order by most recent first
    query = query.order_by(DocumentTemplate.updated_at.desc())

    templates = query.all()

    # Load relationships
    for template in templates:
        db.refresh(template, ["created_by_user"])

    return templates


@router.post("/organizations/{organization_id}/templates", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    organization_id: int,
    template_data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
):
    """
    Create a new template for an organization.
    Requires organization membership.
    """
    # Verify organization access
    if current_organization.id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this organization"
        )

    # Validate signature_blocks JSON
    if template_data.signature_blocks and not validate_signature_blocks_json(template_data.signature_blocks):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature_blocks JSON format"
        )

    # Create template
    template = DocumentTemplate(
        organization_id=organization_id,
        name=template_data.name,
        description=template_data.description,
        content=template_data.content,
        signature_blocks=template_data.signature_blocks,
        created_by_user_id=current_user.id,
        is_active=True
    )

    db.add(template)
    db.commit()
    db.refresh(template)
    db.refresh(template, ["created_by_user"])

    return template


@router.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
):
    """
    Get a template by ID.
    Requires organization membership.
    """
    template = db.query(DocumentTemplate).filter(
        DocumentTemplate.id == template_id,
        DocumentTemplate.is_active == True
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Verify organization access
    if template.organization_id != current_organization.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this template"
        )

    db.refresh(template, ["created_by_user"])

    return template


@router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    template_data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
):
    """
    Update a template.
    Requires organization membership.
    """
    template = db.query(DocumentTemplate).filter(
        DocumentTemplate.id == template_id,
        DocumentTemplate.is_active == True
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Verify organization access
    if template.organization_id != current_organization.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this template"
        )

    # Update only provided fields
    if template_data.name is not None:
        template.name = template_data.name
    if template_data.description is not None:
        template.description = template_data.description
    if template_data.content is not None:
        template.content = template_data.content
    if template_data.signature_blocks is not None:
        # Validate signature_blocks JSON
        if template_data.signature_blocks and not validate_signature_blocks_json(template_data.signature_blocks):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature_blocks JSON format"
            )
        template.signature_blocks = template_data.signature_blocks

    # updated_at is automatically set by onupdate

    db.commit()
    db.refresh(template)
    db.refresh(template, ["created_by_user"])

    return template


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
):
    """
    Delete a template (soft delete).
    Requires organization membership.
    """
    template = db.query(DocumentTemplate).filter(
        DocumentTemplate.id == template_id,
        DocumentTemplate.is_active == True
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Verify organization access
    if template.organization_id != current_organization.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this template"
        )

    # Soft delete
    template.is_active = False

    db.commit()

    return None


@router.post("/templates/{template_id}/duplicate", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
):
    """
    Duplicate a template.
    Creates a new template with "Copy of [name]" as the name.
    Requires organization membership.
    """
    template = db.query(DocumentTemplate).filter(
        DocumentTemplate.id == template_id,
        DocumentTemplate.is_active == True
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Verify organization access
    if template.organization_id != current_organization.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this template"
        )

    # Create duplicate
    new_template = DocumentTemplate(
        organization_id=template.organization_id,
        name=f"העתק של {template.name}",
        description=template.description,
        content=template.content,
        signature_blocks=template.signature_blocks,
        created_by_user_id=current_user.id,
        is_active=True
    )

    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    db.refresh(new_template, ["created_by_user"])

    return new_template

