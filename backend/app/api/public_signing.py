"""
Public signing API endpoints - no authentication required
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from app.core.database import get_db
from app.models.document import Document
from app.models.document_template import DocumentTemplate
from app.models.signing_link import SigningLink
from app.services.signing_links import (
    get_signing_link_by_token,
    validate_signing_link,
    mark_signing_link_as_used
)
from app.services.document_signing import submit_signature

router = APIRouter()


# ========== Pydantic Schemas ==========

class PublicSigningPageResponse(BaseModel):
    """Response schema for public signing page data."""
    document_id: int
    document_title: str
    rendered_content: str
    signature_blocks: Optional[str] = None  # JSON string with signature blocks metadata
    signer_type: str
    signer_email: Optional[str] = None
    token_valid: bool


class SubmitSignatureRequest(BaseModel):
    """Request schema for submitting a signature."""
    signer_name: str = Field(..., description="Name of the signer")
    signer_email: Optional[str] = Field(None, description="Email of the signer")
    signature_data: str = Field(..., description="Base64-encoded signature image (PNG)")
    # signer_type removed - determined by signing link or contract_type


class SubmitSignatureResponse(BaseModel):
    """Response schema for signature submission."""
    success: bool
    message: str
    document_id: int
    new_status: str
    is_completed: bool


# ========== API Endpoints ==========

@router.get("/sign/{token}", response_model=PublicSigningPageResponse)
async def get_public_signing_page(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get document data for public signing page (no authentication required).
    
    This endpoint:
    1. Validates the signing link token
    2. Returns document content and metadata for the signing page
    3. Does not require authentication
    """
    # Get signing link
    signing_link = get_signing_link_by_token(db, token)
    
    if not signing_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signing link not found"
        )
    
    # Validate signing link
    is_valid, error_message = validate_signing_link(signing_link)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message or "Invalid signing link"
        )
    
    # Get document
    document = db.query(Document).filter(Document.id == signing_link.document_id).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Get template to retrieve signature blocks
    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == document.template_id).first()
    signature_blocks_json = template.signature_blocks if template else None
    
    # Check if signature already exists for this signer type
    from app.models.document_signature import DocumentSignature
    existing_signature = db.query(DocumentSignature).filter(
        DocumentSignature.document_id == document.id,
        DocumentSignature.signer_type == signing_link.signer_type
    ).first()
    
    if existing_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This document has already been signed"
        )
    
    return PublicSigningPageResponse(
        document_id=document.id,
        document_title=document.title,
        rendered_content=document.rendered_content,
        signature_blocks=signature_blocks_json,
        signer_type=signing_link.signer_type,
        signer_email=signing_link.intended_signer_email,
        token_valid=True
    )


@router.post("/sign/{token}/sign", response_model=SubmitSignatureResponse, status_code=status.HTTP_201_CREATED)
async def submit_public_signature(
    token: str,
    signature_data: SubmitSignatureRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Submit a signature via public signing link (no authentication required).
    
    This endpoint:
    1. Validates the signing link token
    2. Validates the signature data
    3. Creates a DocumentSignature record
    4. Updates document status
    5. Marks signing link as used
    6. Advances lead stage if needed
    """
    # Get signing link
    signing_link = get_signing_link_by_token(db, token)
    
    if not signing_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signing link not found"
        )
    
    # Validate signing link
    is_valid, error_message = validate_signing_link(signing_link)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message or "Invalid signing link"
        )
    
    # Get document
    document = db.query(Document).filter(Document.id == signing_link.document_id).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Validate signature data format (should be base64 PNG)
    if not signature_data.signature_data or not signature_data.signature_data.startswith("data:image/png;base64,"):
        # Allow both formats: with or without data URI prefix
        if not signature_data.signature_data.startswith("data:image"):
            # If it's just base64, assume it's PNG
            signature_data.signature_data = f"data:image/png;base64,{signature_data.signature_data}"
    
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
        
        # Submit signature
        signature, new_status, is_completed = submit_signature(
            db=db,
            document_id=document.id,
            signer_type=signing_link.signer_type,
            signer_name=signature_data.signer_name.strip(),
            signature_data=signature_data.signature_data,
            signer_email=signature_data.signer_email,
            signing_token=token,
            signer_user_id=None,  # Public signing, no user ID
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Mark signing link as used
        mark_signing_link_as_used(db, signing_link)
        
        return SubmitSignatureResponse(
            success=True,
            message="Signature submitted successfully",
            document_id=document.id,
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
