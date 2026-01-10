"""
Documents API endpoints - document generation and management.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi import Request
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import os
from pathlib import Path
from fastapi.responses import FileResponse
from app.core.database import get_db
from app.core.auth import get_current_user_dependency, get_current_organization_dependency
from app.models.user import User
from app.models.organization import Organization
from app.models.lead import Lead
from app.models.lead_stage import LeadStage
from app.models.lead_stage_history import LeadStageHistory
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
from app.services.document_signing import submit_signature
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
    signature_block_id: Optional[str] = None  # ID of the signature block this signature belongs to
    signer_type: str
    signer_name: str
    signer_email: Optional[str] = None
    signature_data: Optional[str] = None  # Base64-encoded signature image (only included when viewing signed document)
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
    template_id: Optional[int] = None  # Nullable for uploaded documents
    title: str
    rendered_content: Optional[str] = None  # Nullable for uploaded PDFs
    signature_blocks: Optional[str] = None  # JSON string with signature block metadata
    pdf_file_path: Optional[str] = None
    signing_url: Optional[str] = None
    contract_type: Optional[str] = None  # 'buyer', 'seller', 'lawyer'
    document_type: Optional[str] = None  # Document type ID for uploaded documents (e.g., 'lawyer_approved_buyer_contract')
    status: str  # 'draft', 'ready', 'sent', 'signed', 'uploaded'
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
    contract_type: Optional[str] = Field(None, description="Type of contract: 'buyer', 'seller', or 'lawyer'")
    title: Optional[str] = Field(None, description="Optional custom title (defaults to template name + lead name)")


class CreateSigningLinkRequest(BaseModel):
    """Request schema for creating a signing link."""
    # signer_type removed - now determined by contract_type on document
    intended_signer_email: Optional[str] = Field(None, description="Email of intended signer")
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


class SubmitSignatureRequest(BaseModel):
    """Request schema for submitting a signature."""
    signer_name: str = Field(..., description="Name of the signer")
    signer_email: Optional[str] = Field(None, description="Email of the signer")
    signature_data: str = Field(..., description="Base64-encoded signature image (PNG)")
    # signer_type removed - for internal signing, determined by contract_type; for public, use 'client'


class SubmitSignatureResponse(BaseModel):
    """Response schema for signature submission."""
    success: bool
    message: str
    document_id: int
    new_status: str
    is_completed: bool


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
    
    # Copy signature blocks from template (can be edited later)
    signature_blocks = template.signature_blocks
    
    # Create document record
    new_document = Document(
        organization_id=current_organization.id,
        lead_id=lead.id,
        template_id=template.id,
        title=title,
        rendered_content=rendered_content,
        signature_blocks=signature_blocks,  # Copy from template
        contract_type=document_data.contract_type,  # 'buyer', 'seller', or 'lawyer'
        status='draft',  # Initial status: draft (being worked on)
        created_by_user_id=current_user.id,
        created_at=datetime.utcnow()  # Explicitly set created_at for SQLite compatibility
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
    
    # Load basic relationships and fix null created_at values
    for doc in documents:
        doc.created_by_user = db.query(User).filter(User.id == doc.created_by_user_id).first()
        doc.template = db.query(DocumentTemplate).filter(DocumentTemplate.id == doc.template_id).first()
        doc.lead = db.query(Lead).filter(Lead.id == doc.lead_id).first()
        # Fix null created_at for SQLite compatibility (set default for response only)
        if doc.created_at is None:
            doc.created_at = datetime.utcnow()
    
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


class DocumentUpdateRequest(BaseModel):
    """Request schema for updating a document."""
    status: Optional[str] = Field(None, description="New status: 'draft', 'ready', 'sent', 'signed'")
    rendered_content: Optional[str] = Field(None, description="Updated document content (HTML)")
    title: Optional[str] = Field(None, description="Updated document title")
    signature_blocks: Optional[str] = Field(None, description="Updated signature blocks JSON")


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int,
    update_data: DocumentUpdateRequest,
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """
    Update a document (currently only status can be updated).
    
    When status is set to 'ready', the lead stage is advanced based on contract_type:
    - 'buyer' → stage order 2 (Buyer Contract Ready)
    - 'seller' → stage order 4 (Seller Contract Ready)
    - 'lawyer' → stage order 6 (Lawyer Contract Ready)
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
    
    # Update rendered_content if provided (for editing contracts)
    # IMPORTANT: Save content WITH merge fields - they will be replaced on-the-fly when displaying on signing page
    # This allows users to edit, remove, or change merge fields in the editor
    if update_data.rendered_content is not None:
        document.rendered_content = update_data.rendered_content
    
    # Update title if provided
    if update_data.title:
        document.title = update_data.title
    
    # Update signature_blocks if provided (for editing contracts)
    if update_data.signature_blocks is not None:
        # Validate signature blocks JSON
        if update_data.signature_blocks:
            try:
                import json
                blocks = json.loads(update_data.signature_blocks)
                if not isinstance(blocks, list):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="signature_blocks must be a JSON array"
                    )
                # Basic validation
                for block in blocks:
                    if not isinstance(block, dict) or 'x' not in block or 'y' not in block:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid signature block format"
                        )
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid signature_blocks JSON"
                )
        document.signature_blocks = update_data.signature_blocks
    
    # Update status if provided
    if update_data.status:
        # Validate status value
        valid_statuses = ['draft', 'ready', 'sent', 'signed']
        if update_data.status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        
        document.status = update_data.status
        
        # If marking as ready, advance lead stage based on contract_type
        if update_data.status == 'ready' and document.contract_type:
            from app.api.leads import create_stage_history_entry
            
            # Map contract_type to stage name (Hebrew)
            stage_name_map = {
                'buyer': 'חוזה לקוח מוכן',    # Buyer Contract Ready
                'seller': 'חוזה מוכר מוכן',   # Seller Contract Ready
                'lawyer': 'חוזה עורך דין מוכן',  # Lawyer Contract Ready
            }
            
            target_stage_name = stage_name_map.get(document.contract_type)
            if target_stage_name:
                # Get the target stage by name (more reliable than order due to potential duplicates)
                target_stage = db.query(LeadStage).filter(LeadStage.name == target_stage_name).first()
                if target_stage:
                    lead = db.query(Lead).filter(Lead.id == document.lead_id).first()
                    if lead and lead.stage_id != target_stage.id:
                        # Only advance if not already at or past this stage
                        current_stage = db.query(LeadStage).filter(LeadStage.id == lead.stage_id).first()
                        if current_stage and current_stage.order < target_stage.order:
                            lead.stage_id = target_stage.id
                            create_stage_history_entry(db, lead.id, target_stage.id, current_user.id)
                            db.add(lead)
                            db.flush()
    
    document.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(document)
    
    # Load relationships
    document.created_by_user = current_user
    document.template = db.query(DocumentTemplate).filter(DocumentTemplate.id == document.template_id).first()
    document.lead = db.query(Lead).filter(Lead.id == document.lead_id).first()
    
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
    
    # Determine signer_type based on contract_type
    # For new workflow: all public signing links are 'client' type
    # The contract_type on document determines what stage to advance to
    signer_type = 'client'  # All public links are for client signing
    
    try:
        # Create signing link
        signing_link = create_signing_link(
            db=db,
            document_id=document_id,
            signer_type=signer_type,
            created_by_user_id=current_user.id,
            intended_signer_email=link_data.intended_signer_email,
            expires_in_days=link_data.expires_in_days
        )
        
        # Generate signing URL
        signing_url = get_signing_link_url(FRONTEND_BASE_URL, signing_link.token)
        
        # Update document signing_url and status to 'sent' (if it was 'ready')
        document.signing_url = signing_url
        if document.status == 'ready':
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


@router.post("/{document_id}/sign", response_model=SubmitSignatureResponse, status_code=status.HTTP_201_CREATED)
async def submit_internal_signature(
    document_id: int,
    signature_data: SubmitSignatureRequest,
    request: Request,
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """
    Submit an internal signature for a document (requires authentication).
    
    This endpoint:
    1. Validates the document exists and belongs to the organization
    2. Validates the signature data
    3. Creates a DocumentSignature record
    4. Updates document status
    5. Advances lead stage if needed
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
    
    # For internal signing, determine signer_type based on contract_type
    # Lawyer contracts can be signed internally, buyer/seller contracts are signed via public link
    if document.contract_type == 'lawyer':
        signer_type = 'internal'  # Lawyer signs internally
    else:
        # For buyer/seller contracts signed internally (edge case), use 'internal'
        signer_type = 'internal'
    
    # Check if signature already exists for this document
    existing_signature = db.query(DocumentSignature).filter(
        DocumentSignature.document_id == document_id
    ).first()
    
    if existing_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This document has already been signed"
        )
    
    # Validate signature data format (should be base64 PNG)
    signature_data_value = signature_data.signature_data
    if not signature_data_value.startswith("data:image/png;base64,"):
        # Allow both formats: with or without data URI prefix
        if not signature_data_value.startswith("data:image"):
            # If it's just base64, assume it's PNG
            signature_data_value = f"data:image/png;base64,{signature_data_value}"
    
    # Validate signer_name
    if not signature_data.signer_name or not signature_data.signer_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signer name is required"
        )
    
    try:
        # Get client IP and user agent
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Use current user's name if signer_name not provided or use provided name
        signer_name = signature_data.signer_name.strip() or current_user.full_name or current_user.email
        
        # Submit signature
        signature, new_status, is_completed = submit_signature(
            db=db,
            document_id=document_id,
            signer_type=signer_type,  # Determined above based on contract_type
            signer_name=signer_name,
            signature_data=signature_data_value,
            signer_email=signature_data.signer_email or current_user.email,
            signing_token=None,  # Internal signing, no token
            signer_user_id=current_user.id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return SubmitSignatureResponse(
            success=True,
            message="Signature submitted successfully",
            document_id=document_id,
            new_status=new_status,
            is_completed=is_completed
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit signature: {str(e)}"
        )



@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    lead_id: int = Form(...),
    document_type: str = Form(...),  # Document type ID (e.g., 'lawyer_approved_buyer_contract')
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """
    Upload a PDF document for a lead.
    
    This endpoint:
    1. Validates the lead exists and belongs to the organization
    2. Validates document_type is provided
    3. Saves the uploaded PDF file
    4. Creates a Document record with status='uploaded'
    5. Advances lead stage based on document_type configuration
    """
    # Validate document_type is provided
    if not document_type or not document_type.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="document_type is required"
        )
    
    # Verify lead exists and belongs to organization
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.organization_id == current_organization.id,
        Lead.deleted_at.is_(None)
    ).first()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found or not accessible"
        )
    
    # Validate file type (PDF only)
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )
    
    # Create storage directory if it doesn't exist
    storage_dir = Path("storage") / "uploads" / str(current_organization.id)
    storage_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{lead_id}_{timestamp}_{file.filename}"
    file_path = storage_dir / filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Document type configuration - maps document_type IDs to stage names they trigger
    # This should match the frontend DOCUMENT_TYPES configuration
    DOCUMENT_TYPE_STAGE_MAP = {
        'lawyer_approved_buyer_contract': 'מסמכי לקוח מאומתים',
        'lawyer_approved_seller_contract': 'מסמכי מוכר מאומתים',
    }
    
    # Create document record
    new_document = Document(
        organization_id=current_organization.id,
        lead_id=lead.id,
        template_id=None,  # Uploaded documents don't have templates
        title=f"{file.filename} - {lead.full_name or 'ליד'}",
        rendered_content=None,  # Uploaded PDFs don't have HTML content
        signature_blocks=None,  # Uploaded documents don't have signature blocks
        pdf_file_path=str(file_path),
        document_type=document_type,  # Store document type ID
        status='uploaded',  # Special status for uploaded documents
        created_by_user_id=current_user.id,
        created_at=datetime.utcnow()  # Explicitly set created_at for SQLite compatibility
    )
    
    db.add(new_document)
    db.flush()
    
    # Mark stage as complete based on document_type configuration
    # For document uploads, we mark the stage as complete in history without changing the lead's current stage
    # because document verification can happen at any point in the workflow
    target_stage_name = DOCUMENT_TYPE_STAGE_MAP.get(document_type)
    if target_stage_name:
        target_stage = db.query(LeadStage).filter(
            LeadStage.name == target_stage_name
        ).first()
        
        if target_stage:
            # Check if this stage is already marked as complete in history
            existing_history = db.query(LeadStageHistory).filter(
                LeadStageHistory.lead_id == lead.id,
                LeadStageHistory.stage_id == target_stage.id
            ).first()
            
            # Only create history entry if it doesn't already exist
            if not existing_history:
                # Create stage history entry to mark this stage as complete
                history_entry = LeadStageHistory(
                    lead_id=lead.id,
                    stage_id=target_stage.id,
                    changed_by_user_id=current_user.id
                )
                db.add(history_entry)
    
    db.commit()
    db.refresh(new_document)
    
    # Load relationships for response
    new_document.created_by_user = current_user
    new_document.lead = lead
    
    return new_document


@router.get("/{document_id}/pdf")
async def download_document_pdf(
    document_id: int,
    current_user: User = Depends(get_current_user_dependency),
    current_organization: Organization = Depends(get_current_organization_dependency),
    db: Session = Depends(get_db)
):
    """
    Download PDF file for a document.
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
    
    if not document.pdf_file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found for this document"
        )
    
    file_path = Path(document.pdf_file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found on server"
        )
    
    return FileResponse(
        path=str(file_path),
        media_type='application/pdf',
        filename=file_path.name
    )
