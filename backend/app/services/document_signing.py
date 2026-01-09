"""
Document signing service - handles signature submission and document status updates
"""
from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.document import Document
from app.models.document_signature import DocumentSignature
from app.models.lead import Lead
from app.models.lead_stage import LeadStage
from app.models.lead_stage_history import LeadStageHistory
from app.models.signing_link import SigningLink


def get_stage_by_order(db: Session, order: int) -> Optional[LeadStage]:
    """Get a lead stage by its order number."""
    return db.query(LeadStage).filter(LeadStage.order == order).first()


def get_stage_by_name_pattern(db: Session, pattern: str) -> Optional[LeadStage]:
    """Get a lead stage by name pattern (for Hebrew stage names)."""
    # Look for stages that contain the pattern
    stages = db.query(LeadStage).filter(LeadStage.name.like(f"%{pattern}%")).all()
    if stages:
        return stages[0]
    return None


def advance_lead_stage(db: Session, lead_id: int, stage_order: int, changed_by_user_id: int) -> bool:
    """
    Advance a lead to a specific stage by order number.
    Creates a stage history entry.
    
    Returns:
        True if stage was advanced, False if already at that stage or higher
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return False
    
    # Get target stage
    target_stage = get_stage_by_order(db, stage_order)
    if not target_stage:
        return False
    
    # Check if lead is already at this stage or beyond
    current_stage = db.query(LeadStage).filter(LeadStage.id == lead.stage_id).first()
    if current_stage and current_stage.order >= stage_order:
        return False  # Already at or beyond target stage
    
    # Update lead stage
    lead.stage_id = target_stage.id
    
    # Create stage history entry
    history_entry = LeadStageHistory(
        lead_id=lead_id,
        stage_id=target_stage.id,
        changed_by_user_id=changed_by_user_id
    )
    db.add(history_entry)
    db.commit()
    
    return True


def advance_lead_stage_by_id(db: Session, lead_id: int, stage_id: int, changed_by_user_id: int) -> bool:
    """
    Advance a lead to a specific stage by stage ID.
    Creates a stage history entry.
    
    Returns:
        True if stage was advanced, False if already at that stage or higher
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return False
    
    # Get target stage
    target_stage = db.query(LeadStage).filter(LeadStage.id == stage_id).first()
    if not target_stage:
        return False
    
    # Check if lead is already at this stage or beyond
    current_stage = db.query(LeadStage).filter(LeadStage.id == lead.stage_id).first()
    if current_stage and current_stage.order >= target_stage.order:
        return False  # Already at or beyond target stage
    
    # Update lead stage
    lead.stage_id = target_stage.id
    
    # Create stage history entry
    history_entry = LeadStageHistory(
        lead_id=lead_id,
        stage_id=target_stage.id,
        changed_by_user_id=changed_by_user_id
    )
    db.add(history_entry)
    db.commit()
    
    return True


def update_document_status_after_signing(
    db: Session,
    document_id: int,
    contract_type: Optional[str]
) -> str:
    """
    Update document status after signing.
    New workflow: when contract is signed, set status='signed' and advance stage based on contract_type.
    
    Args:
        db: Database session
        document_id: ID of the document
        contract_type: Type of contract ('buyer', 'seller', 'lawyer')
    
    Returns:
        new_status: str (always 'signed')
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise ValueError(f"Document {document_id} not found")
    
    # New workflow: always set status to 'signed' when contract is signed
    document.status = 'signed'
    document.completed_at = datetime.utcnow()
    document.updated_at = datetime.utcnow()
    
    db.add(document)
    db.flush()
    
    return 'signed'


def submit_signature(
    db: Session,
    document_id: int,
    signer_type: str,
    signer_name: str,
    signature_data: str,  # Base64 image data
    signer_email: Optional[str] = None,
    signing_token: Optional[str] = None,
    signer_user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Tuple[DocumentSignature, str, bool]:
    """
    Submit a signature for a document.
    
    Args:
        db: Database session
        document_id: ID of the document
        signer_type: 'client' or 'internal'
        signer_name: Name of the signer
        signature_data: Base64-encoded signature image
        signer_email: Optional email of signer
        signing_token: Optional token used for signing (client only)
        signer_user_id: Optional user ID (internal only)
        ip_address: Optional IP address
        user_agent: Optional user agent string
    
    Returns:
        Tuple of (DocumentSignature object, new_status: str, is_completed: bool)
    
    Raises:
        ValueError: If document not found or invalid signer_type
    """
    # Validate signer_type
    if signer_type not in ['client', 'internal']:
        raise ValueError(f"Invalid signer_type: {signer_type}. Must be 'client' or 'internal'")
    
    # Verify document exists
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise ValueError(f"Document {document_id} not found")
    
    # Check if signature already exists for this signer type
    existing_signature = db.query(DocumentSignature).filter(
        DocumentSignature.document_id == document_id,
        DocumentSignature.signer_type == signer_type
    ).first()
    
    if existing_signature:
        raise ValueError(f"Signature already exists for {signer_type} signer")
    
    # Create signature record
    signature = DocumentSignature(
        document_id=document_id,
        signer_type=signer_type,
        signer_name=signer_name,
        signer_email=signer_email,
        signature_data=signature_data,
        signing_token=signing_token,
        signer_user_id=signer_user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        signed_at=datetime.utcnow()
    )
    
    db.add(signature)
    db.flush()  # Flush to get the signature ID
    
    # Update document status (new workflow: always set to 'signed')
    new_status = update_document_status_after_signing(db, document_id, document.contract_type)
    
    # Advance lead stage based on contract_type
    # Map contract_type to signed stage name (Hebrew):
    # - buyer → "חתום על ידי לקוח" (Buyer Signed)
    # - seller → "חתום על ידי מוכר" (Seller Signed)  
    # - lawyer → "חתום על ידי עורך דין" (Lawyer Signed)
    if document.contract_type:
        stage_name_map = {
            'buyer': 'חתום על ידי לקוח',    # Buyer Signed
            'seller': 'חתום על ידי מוכר',   # Seller Signed
            'lawyer': 'חתום על ידי עורך דין',  # Lawyer Signed
        }
        target_stage_name = stage_name_map.get(document.contract_type)
        if target_stage_name:
            # Get stage by name to avoid issues with duplicate orders
            target_stage = db.query(LeadStage).filter(LeadStage.name == target_stage_name).first()
            if target_stage:
                advance_lead_stage_by_id(db, document.lead_id, target_stage.id, signer_user_id or document.created_by_user_id)
    
    db.commit()
    db.refresh(signature)
    db.refresh(document)
    
    return signature, new_status, True  # Always return True for is_completed since contract is signed


def submit_signature_for_block(
    db: Session,
    document_id: int,
    signature_block_id: str,
    signer_type: str,
    signer_name: str,
    signature_data: str,  # Base64 image data
    signer_email: Optional[str] = None,
    signing_token: Optional[str] = None,
    signer_user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> DocumentSignature:
    """
    Submit a signature for a specific signature block.
    This allows multiple signatures per document (one per block).
    
    Args:
        db: Database session
        document_id: ID of the document
        signature_block_id: ID of the signature block from signature_blocks JSON
        signer_type: 'client' or 'internal'
        signer_name: Name of the signer
        signature_data: Base64-encoded signature image
        signer_email: Optional email of signer
        signing_token: Optional token used for signing (client only)
        signer_user_id: Optional user ID (internal only)
        ip_address: Optional IP address
        user_agent: Optional user agent string
    
    Returns:
        DocumentSignature object
    
    Raises:
        ValueError: If document not found, invalid signer_type, or block already signed
    """
    # Validate signer_type
    if signer_type not in ['client', 'internal']:
        raise ValueError(f"Invalid signer_type: {signer_type}. Must be 'client' or 'internal'")
    
    # Verify document exists
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise ValueError(f"Document {document_id} not found")
    
    # Check if this block is already signed
    existing_signature = db.query(DocumentSignature).filter(
        DocumentSignature.document_id == document_id,
        DocumentSignature.signature_block_id == signature_block_id,
        DocumentSignature.signer_type == signer_type
    ).first()
    
    if existing_signature:
        raise ValueError(f"Signature block {signature_block_id} has already been signed")
    
    # Create signature record
    signature = DocumentSignature(
        document_id=document_id,
        signature_block_id=signature_block_id,
        signer_type=signer_type,
        signer_name=signer_name,
        signer_email=signer_email,
        signature_data=signature_data,
        signing_token=signing_token,
        signer_user_id=signer_user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        signed_at=datetime.utcnow()
    )
    
    db.add(signature)
    db.commit()
    db.refresh(signature)
    
    return signature


def check_all_blocks_signed(
    db: Session,
    document_id: int,
    signer_type: str,
    signature_blocks_json: str
) -> bool:
    """
    Check if all signature blocks have been signed.
    
    Args:
        db: Database session
        document_id: ID of the document
        signer_type: 'client' or 'internal'
        signature_blocks_json: JSON string with signature blocks metadata
    
    Returns:
        True if all blocks are signed, False otherwise
    """
    import json
    
    try:
        blocks = json.loads(signature_blocks_json)
        block_ids = [block.get('id') for block in blocks if block.get('id')]
        
        if not block_ids:
            return False
        
        # Get all signatures for this document and signer type
        signatures = db.query(DocumentSignature).filter(
            DocumentSignature.document_id == document_id,
            DocumentSignature.signer_type == signer_type
        ).all()
        
        signed_block_ids = {sig.signature_block_id for sig in signatures if sig.signature_block_id}
        
        # Check if all blocks are signed
        return all(block_id in signed_block_ids for block_id in block_ids)
        
    except (json.JSONDecodeError, AttributeError):
        return False


def finish_document_signing(
    db: Session,
    document_id: int,
    signer_type: str,
    signing_token: Optional[str] = None
) -> None:
    """
    Finish document signing process:
    1. Marks document status as 'signed'
    2. Advances lead stage based on contract_type
    3. Marks signing link as used (if token provided)
    
    Args:
        db: Database session
        document_id: ID of the document
        signer_type: 'client' or 'internal'
        signing_token: Optional signing token (to mark link as used)
    
    Raises:
        ValueError: If document not found or not all blocks are signed
    """
    from app.services.signing_links import mark_signing_link_as_used, get_signing_link_by_token
    
    # Verify document exists
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise ValueError(f"Document {document_id} not found")
    
    # Verify all blocks are signed
    signature_blocks_json = document.signature_blocks
    if not signature_blocks_json:
        from app.models.document_template import DocumentTemplate
        template = db.query(DocumentTemplate).filter(DocumentTemplate.id == document.template_id).first()
        signature_blocks_json = template.signature_blocks if template else None
    
    if signature_blocks_json:
        if not check_all_blocks_signed(db, document_id, signer_type, signature_blocks_json):
            raise ValueError("Not all signature blocks have been signed")
    
    # Update document status to 'signed'
    document.status = 'signed'
    document.completed_at = datetime.utcnow()
    document.updated_at = datetime.utcnow()
    
    db.add(document)
    db.flush()
    
    # Advance lead stage based on contract_type
    if document.contract_type:
        stage_name_map = {
            'buyer': 'חתום על ידי לקוח',    # Buyer Signed
            'seller': 'חתום על ידי מוכר',   # Seller Signed
            'lawyer': 'חתום על ידי עורך דין',  # Lawyer Signed
        }
        target_stage_name = stage_name_map.get(document.contract_type)
        if target_stage_name:
            # Get stage by name to avoid issues with duplicate orders
            target_stage = db.query(LeadStage).filter(LeadStage.name == target_stage_name).first()
            if target_stage:
                advance_lead_stage_by_id(
                    db, 
                    document.lead_id, 
                    target_stage.id, 
                    document.created_by_user_id  # Use document creator since this is public signing
                )
    
    # Mark signing link as used if token provided
    if signing_token:
        signing_link = get_signing_link_by_token(db, signing_token)
        if signing_link:
            mark_signing_link_as_used(db, signing_link)
    
    db.commit()
    db.refresh(document)
