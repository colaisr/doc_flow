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
