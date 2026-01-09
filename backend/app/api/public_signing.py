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
from app.services.document_signing import submit_signature_for_block, check_all_blocks_signed, finish_document_signing

router = APIRouter()


# ========== Pydantic Schemas ==========

class SignatureBlockStatus(BaseModel):
    """Status of a signature block"""
    block_id: str
    is_signed: bool
    signature_data: Optional[str] = None  # Base64 signature image if signed
    signer_name: Optional[str] = None
    signed_at: Optional[str] = None


class PublicSigningPageResponse(BaseModel):
    """Response schema for public signing page data."""
    document_id: int
    document_title: str
    rendered_content: str
    signature_blocks: Optional[str] = None  # JSON string with signature blocks metadata
    signature_statuses: list[SignatureBlockStatus] = []  # Status of each signature block
    signer_type: str
    signer_email: Optional[str] = None
    token_valid: bool
    all_blocks_signed: bool = False


class SubmitSignatureRequest(BaseModel):
    """Request schema for submitting a signature."""
    signature_block_id: str = Field(..., description="ID of the signature block to sign")
    signer_name: str = Field(..., description="Name of the signer")
    signer_email: Optional[str] = Field(None, description="Email of the signer")
    signature_data: str = Field(..., description="Base64-encoded signature image (PNG)")
    # signer_type removed - determined by signing link or contract_type


class SubmitSignatureResponse(BaseModel):
    """Response schema for signature submission."""
    success: bool
    message: str
    document_id: int
    signature_block_id: str
    all_blocks_signed: bool
    remaining_blocks: int  # Number of remaining unsigned blocks


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
    
    # Get signature blocks from document (preferred) or template (fallback)
    signature_blocks_json = document.signature_blocks
    if not signature_blocks_json:
        template = db.query(DocumentTemplate).filter(DocumentTemplate.id == document.template_id).first()
        signature_blocks_json = template.signature_blocks if template else None
    
    # Use document signature blocks if available, otherwise template
    # Document signature blocks take precedence as they may have been edited
    
    # Get existing signatures for this document
    from app.models.document_signature import DocumentSignature
    import json
    from datetime import datetime
    
    existing_signatures = db.query(DocumentSignature).filter(
        DocumentSignature.document_id == document.id,
        DocumentSignature.signer_type == signing_link.signer_type
    ).all()
    
    # Create a map of block_id -> signature
    signature_map = {sig.signature_block_id: sig for sig in existing_signatures if sig.signature_block_id}
    
    # Build signature statuses for each block
    signature_statuses = []
    all_blocks_signed = True
    
    if signature_blocks_json:
        try:
            blocks = json.loads(signature_blocks_json)
            for block in blocks:
                block_id = block.get('id')
                if block_id:
                    signature = signature_map.get(block_id)
                    if signature:
                        signature_statuses.append(SignatureBlockStatus(
                            block_id=block_id,
                            is_signed=True,
                            signature_data=signature.signature_data,
                            signer_name=signature.signer_name,
                            signed_at=signature.signed_at.isoformat() if signature.signed_at else None
                        ))
                    else:
                        all_blocks_signed = False
                        signature_statuses.append(SignatureBlockStatus(
                            block_id=block_id,
                            is_signed=False
                        ))
        except json.JSONDecodeError:
            pass
    
    return PublicSigningPageResponse(
        document_id=document.id,
        document_title=document.title,
        rendered_content=document.rendered_content,
        signature_blocks=signature_blocks_json,
        signature_statuses=signature_statuses,
        signer_type=signing_link.signer_type,
        signer_email=signing_link.intended_signer_email,
        token_valid=True,
        all_blocks_signed=all_blocks_signed
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
        # Validate signature_block_id exists in document's signature blocks
        import json
        signature_blocks_json = document.signature_blocks
        if not signature_blocks_json:
            template = db.query(DocumentTemplate).filter(DocumentTemplate.id == document.template_id).first()
            signature_blocks_json = template.signature_blocks if template else None
        
        if not signature_blocks_json:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document has no signature blocks"
            )
        
        try:
            blocks = json.loads(signature_blocks_json)
            block_ids = [block.get('id') for block in blocks if block.get('id')]
            if signature_data.signature_block_id not in block_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid signature_block_id"
                )
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature blocks format"
            )
        
        # Check if this block is already signed
        from app.models.document_signature import DocumentSignature
        existing_signature = db.query(DocumentSignature).filter(
            DocumentSignature.document_id == document.id,
            DocumentSignature.signature_block_id == signature_data.signature_block_id,
            DocumentSignature.signer_type == signing_link.signer_type
        ).first()
        
        if existing_signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This signature block has already been signed"
            )
        
        # Get client IP and user agent
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Submit signature
        signature = submit_signature_for_block(
            db=db,
            document_id=document.id,
            signature_block_id=signature_data.signature_block_id,
            signer_type=signing_link.signer_type,
            signer_name=signature_data.signer_name.strip(),
            signature_data=signature_data.signature_data,
            signer_email=signature_data.signer_email,
            signing_token=token,
            signer_user_id=None,  # Public signing, no user ID
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Check if all blocks are now signed
        all_blocks_signed = check_all_blocks_signed(db, document.id, signing_link.signer_type, signature_blocks_json)
        
        # Count remaining unsigned blocks
        remaining_blocks = len(block_ids) - len(db.query(DocumentSignature).filter(
            DocumentSignature.document_id == document.id,
            DocumentSignature.signer_type == signing_link.signer_type
        ).all())
        
        # Don't mark signing link as used yet - allow multiple signatures
        # Link will be marked as used when document is finished
        
        return SubmitSignatureResponse(
            success=True,
            message="Signature submitted successfully",
            document_id=document.id,
            signature_block_id=signature_data.signature_block_id,
            all_blocks_signed=all_blocks_signed,
            remaining_blocks=max(0, remaining_blocks)
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


@router.post("/sign/{token}/finish", response_model=SubmitSignatureResponse, status_code=status.HTTP_200_OK)
async def finish_public_signing(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Finish the signing process - marks document as 'signed' and advances lead stage.
    This should be called when all signature blocks are signed.
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
    
    try:
        # Finish signing - marks document as 'signed', advances stage, marks link as used
        finish_document_signing(
            db=db,
            document_id=document.id,
            signer_type=signing_link.signer_type,
            signing_token=token
        )
        
        return SubmitSignatureResponse(
            success=True,
            message="Document signing completed successfully",
            document_id=document.id,
            signature_block_id="",  # Not applicable for finish
            all_blocks_signed=True,
            remaining_blocks=0
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
            detail=f"Failed to finish signing: {str(e)}"
        )
