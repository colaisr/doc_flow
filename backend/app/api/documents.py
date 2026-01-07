"""
Documents API endpoints - document generation and management.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.core.database import get_db
from app.core.auth import get_current_user_dependency, get_current_organization_dependency
from app.models.user import User
from app.models.organization import Organization
from app.models.lead import Lead
from app.models.document_template import DocumentTemplate
from app.models.document import Document
from app.models.document_signature import DocumentSignature
from app.models.signing_link import SigningLink
from app.services.document_generation import (
    generate_document_content,
    generate_document_title,
    validate_merge_fields
)
from app.services.signing_links import (
    create_signing_link,
    get_signing_link_by_token,
    validate_signing_link,
    mark_signing_link_as_used,
    get_signing_link_url,
    get_active_signing_links_for_document
)
from app.core.config import FRONTEND_BASE_URL

router = APIRouter()


# ========== Pydantic Schemas ==========

class DocumentUserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentTemplateInfoResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class DocumentLeadInfoResponse(BaseModel):
    id: int
    full_name: str

    class Config:
        from_attributes = True


class DocumentSignatureResponse(BaseModel):
    id: int
    signer_type: str
    signer_name: str
    signer_email: Optional[str] = None
    signed_at: datetime

    class Config:
        from_attributes = True


class SigningLinkResponse(BaseModel):
    id: int
    token: str
    signer_type: str
    intended_signer_email: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_used: bool
    created_at: datetime
    used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: int
    organization_id: int
    lead_id: int
    template_id: int
    title: str
    rendered_content: str
    pdf_file_path: Optional[str] = None
    signing_url: Optional[str] = None
    status: str
    created_by_user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Relationships (optional, loaded when needed)
    created_by_user: Optional[DocumentUserResponse] = None
    template: Optional[DocumentTemplateInfoResponse] = None
    lead: Optional[DocumentLeadInfoResponse] = None
    signatures: Optional[List[DocumentSignatureResponse]] = None
    signing_links: Optional[List[SigningLinkResponse]] = None

    class Config:
        from_attributes = True


class DocumentCreateRequest(BaseModel):
    """Request schema for creating a document from a template."""
    template_id: int = Field(..., description="ID of the template to use")
    lead_id: int = Field(..., description="ID of the lead to generate document for")
    title: Optional[str] = Field(None, description="Optional custom title (defaults to template name + lead name)")


class CreateSigningLinkRequest(BaseModel):
    """Request schema for creating a signing link."""
    signer_type: str = Field(..., description="Type of signer: 'client' or 'internal'")
    intended_signer_email: Optional[str] = Field(None, description="Email of intended signer (for client links)")
    expires_in_days: Optional[int] = Field(None, description="Number of days until expiration (None = no expiration)")


class CreateSigningLinkResponse(BaseModel):
    """Response schema for signing link creation."""
    id: int
    token: str
    signer_type: str
    intended_signer_email: Optional[str] = None
    expires_at: Optional[datetime] = None
    signing_url: str  # Full URL for signing
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""
    items: List[DocumentResponse]
    total: int
    page: int
    limit: int
    total_pages: int


# ========== API Endpoints ==========

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    document_data: DocumentCreateRequest,
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """
    Generate a new document from a template for a specific lead.
    
    This endpoint:
    1. Validates that template and lead exist and belong to the organization
    2. Validates merge fields can be resolved
    3. Generates document content with merged data
    4. Creates a Document record in the database
    """
    # Verify template exists and belongs to organization
    template = db.query(DocumentTemplate).filter(
        DocumentTemplate.id == document_data.template_id,
        DocumentTemplate.organization_id == current_organization.id,
        DocumentTemplate.is_active == True
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found or not accessible"
        )
    
    # Verify lead exists and belongs to organization
    lead = db.query(Lead).filter(
        Lead.id == document_data.lead_id,
        Lead.organization_id == current_organization.id,
        Lead.deleted_at.is_(None)
    ).first()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found or not accessible"
        )
    
    # Validate merge fields can be resolved
    validation = validate_merge_fields(template.content, lead)
    if not validation['valid']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid merge fields: {', '.join(validation['missing_fields'])}"
        )
    
    # Generate document content
    rendered_content = generate_document_content(template, lead)
    
    # Generate document title
    title = document_data.title or generate_document_title(template, lead)
    
    # Create document record
    new_document = Document(
        organization_id=current_organization.id,
        lead_id=lead.id,
        template_id=template.id,
        title=title,
        rendered_content=rendered_content,
        status='draft',
        created_by_user_id=current_user.id
    )
    
    db.add(new_document)
    db.commit()
    db.refresh(new_document)
    
    # Load relationships for response
    new_document.created_by_user = current_user
    new_document.template = template
    new_document.lead = lead
    
    return new_document


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    lead_id: Optional[int] = Query(None, description="Filter by lead ID"),
    template_id: Optional[int] = Query(None, description="Filter by template ID"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """
    List documents for the current organization with optional filters.
    """
    # Build query
    query = db.query(Document).filter(
        Document.organization_id == current_organization.id
    )
    
    # Apply filters
    if lead_id:
        query = query.filter(Document.lead_id == lead_id)
    
    if template_id:
        query = query.filter(Document.template_id == template_id)
    
    if status_filter:
        query = query.filter(Document.status == status_filter)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    documents = query.order_by(Document.created_at.desc()).offset(offset).limit(limit).all()
    
    # Load basic relationships
    for doc in documents:
        doc.created_by_user = db.query(User).filter(User.id == doc.created_by_user_id).first()
        doc.template = db.query(DocumentTemplate).filter(DocumentTemplate.id == doc.template_id).first()
        doc.lead = db.query(Lead).filter(Lead.id == doc.lead_id).first()
    
    # Calculate total pages
    total_pages = (total + limit - 1) // limit
    
    return DocumentListResponse(
        items=documents,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    include_signatures: bool = Query(False, description="Include signatures in response"),
    include_signing_links: bool = Query(False, description="Include signing links in response"),
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """
    Get document details by ID.
    """
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.organization_id == current_organization.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Load basic relationships
    document.created_by_user = db.query(User).filter(User.id == document.created_by_user_id).first()
    document.template = db.query(DocumentTemplate).filter(DocumentTemplate.id == document.template_id).first()
    document.lead = db.query(Lead).filter(Lead.id == document.lead_id).first()
    
    # Load optional relationships
    if include_signatures:
        document.signatures = db.query(DocumentSignature).filter(
            DocumentSignature.document_id == document_id
        ).order_by(DocumentSignature.signed_at.asc()).all()
    
    if include_signing_links:
        document.signing_links = db.query(SigningLink).filter(
            SigningLink.document_id == document_id
        ).order_by(SigningLink.created_at.desc()).all()
    
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """
    Delete a document (soft delete by updating status or hard delete).
    For MVP, we'll do a hard delete, but this can be changed to soft delete later.
    """
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.organization_id == current_organization.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Hard delete (can be changed to soft delete by adding deleted_at field)
    db.delete(document)
    db.commit()
    
    return None


@router.post("/{document_id}/signing-links", response_model=CreateSigningLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_signing_link_endpoint(
    document_id: int,
    link_data: CreateSigningLinkRequest,
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """
    Create a signing link for a document.
    
    This endpoint:
    1. Validates the document exists and belongs to the organization
    2. Creates a signing link with a secure token
    3. Returns the signing link with full URL
    """
    # Verify document exists and belongs to organization
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.organization_id == current_organization.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Validate signer_type
    if link_data.signer_type not in ['client', 'internal']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="signer_type must be 'client' or 'internal'"
        )
    
    try:
        # Create signing link
        signing_link = create_signing_link(
            db=db,
            document_id=document_id,
            signer_type=link_data.signer_type,
            created_by_user_id=current_user.id,
            intended_signer_email=link_data.intended_signer_email,
            expires_in_days=link_data.expires_in_days
        )
        
        # Generate signing URL
        signing_url = get_signing_link_url(FRONTEND_BASE_URL, signing_link.token)
        
        # Update document signing_url and status
        document.signing_url = signing_url
        if document.status == 'draft':
            document.status = 'sent'
        db.commit()
        
        # Return response
        return CreateSigningLinkResponse(
            id=signing_link.id,
            token=signing_link.token,
            signer_type=signing_link.signer_type,
            intended_signer_email=signing_link.intended_signer_email,
            expires_at=signing_link.expires_at,
            signing_url=signing_url,
            created_at=signing_link.created_at
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{document_id}/signing-links", response_model=List[SigningLinkResponse])
async def list_signing_links(
    document_id: int,
    signer_type: Optional[str] = Query(None, description="Filter by signer type"),
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """
    List all signing links for a document.
    """
    # Verify document exists and belongs to organization
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.organization_id == current_organization.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Get signing links
    if signer_type:
        signing_links = db.query(SigningLink).filter(
            SigningLink.document_id == document_id,
            SigningLink.signer_type == signer_type
        ).order_by(SigningLink.created_at.desc()).all()
    else:
        signing_links = db.query(SigningLink).filter(
            SigningLink.document_id == document_id
        ).order_by(SigningLink.created_at.desc()).all()
    
    return signing_links


@router.get("/signing-links/{token}/validate", response_model=dict)
async def validate_signing_link_endpoint(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to validate a signing link token.
    Returns whether the link is valid and can be used.
    """
    signing_link = get_signing_link_by_token(db, token)
    
    if not signing_link:
        return {
            "valid": False,
            "error": "Signing link not found"
        }
    
    is_valid, error_message = validate_signing_link(signing_link)
    
    response = {
        "valid": is_valid,
    }
    
    if not is_valid:
        response["error"] = error_message
    
    # Return minimal document info if valid
    if is_valid:
        document = db.query(Document).filter(Document.id == signing_link.document_id).first()
        if document:
            response["document_id"] = document.id
            response["signer_type"] = signing_link.signer_type
    
    return response

