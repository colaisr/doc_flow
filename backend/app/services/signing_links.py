"""
Signing link service - handles token generation and signing link management
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models.signing_link import SigningLink
from app.models.document import Document


def generate_signing_token() -> str:
    """
    Generate a unique, secure token for signing links.
    Uses UUID4 for uniqueness and security.
    
    Returns:
        UUID string (without dashes for cleaner URLs)
    """
    return str(uuid.uuid4())


def create_signing_link(
    db: Session,
    document_id: int,
    signer_type: str,
    created_by_user_id: int,
    intended_signer_email: Optional[str] = None,
    expires_in_days: Optional[int] = None
) -> SigningLink:
    """
    Create a new signing link for a document.
    
    Args:
        db: Database session
        document_id: ID of the document to sign
        signer_type: 'client' or 'internal'
        created_by_user_id: ID of user creating the link
        intended_signer_email: Optional email of intended signer
        expires_in_days: Optional number of days until expiration (None = no expiration)
    
    Returns:
        Created SigningLink object
    
    Raises:
        ValueError: If signer_type is invalid or document doesn't exist
    """
    # Validate signer_type
    if signer_type not in ['client', 'internal']:
        raise ValueError(f"Invalid signer_type: {signer_type}. Must be 'client' or 'internal'")
    
    # Verify document exists
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise ValueError(f"Document {document_id} not found")
    
    # Generate unique token
    token = generate_signing_token()
    
    # Calculate expiration date if provided
    expires_at = None
    if expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
    
    # Create signing link
    signing_link = SigningLink(
        document_id=document_id,
        token=token,
        signer_type=signer_type,
        intended_signer_email=intended_signer_email,
        expires_at=expires_at,
        is_used=False,
        created_by_user_id=created_by_user_id
    )
    
    db.add(signing_link)
    db.commit()
    db.refresh(signing_link)
    
    return signing_link


def get_signing_link_by_token(
    db: Session,
    token: str
) -> Optional[SigningLink]:
    """
    Get a signing link by its token.
    
    Args:
        db: Database session
        token: Signing link token
    
    Returns:
        SigningLink object or None if not found
    """
    return db.query(SigningLink).filter(SigningLink.token == token).first()


def validate_signing_link(signing_link: SigningLink) -> tuple:
    """
    Validate that a signing link is valid and can be used.
    
    Args:
        signing_link: SigningLink object to validate
    
    Returns:
        Tuple of (is_valid: bool, error_message: Optional[str])
    """
    # Check if already used
    if signing_link.is_used:
        return False, "This signing link has already been used"
    
    # Check expiration
    if signing_link.expires_at and signing_link.expires_at < datetime.utcnow():
        return False, "This signing link has expired"
    
    return True, None


def mark_signing_link_as_used(
    db: Session,
    signing_link: SigningLink
) -> None:
    """
    Mark a signing link as used.
    
    Args:
        db: Database session
        signing_link: SigningLink object to mark as used
    """
    signing_link.is_used = True
    signing_link.used_at = datetime.utcnow()
    db.commit()


def get_signing_link_url(base_url: str, token: str) -> str:
    """
    Generate the full URL for a signing link.
    
    Args:
        base_url: Base URL of the application (e.g., "https://example.com")
        token: Signing link token
    
    Returns:
        Full signing URL
    """
    # Remove trailing slash from base_url if present
    base_url = base_url.rstrip('/')
    return f"{base_url}/sign/{token}"


def get_active_signing_links_for_document(
    db: Session,
    document_id: int,
    signer_type: Optional[str] = None
) -> list[SigningLink]:
    """
    Get all active (unused and not expired) signing links for a document.
    
    Args:
        db: Database session
        document_id: ID of the document
        signer_type: Optional filter by signer type ('client' or 'internal')
    
    Returns:
        List of active SigningLink objects
    """
    query = db.query(SigningLink).filter(
        SigningLink.document_id == document_id,
        SigningLink.is_used == False
    )
    
    if signer_type:
        query = query.filter(SigningLink.signer_type == signer_type)
    
    # Filter out expired links
    now = datetime.utcnow()
    links = query.all()
    
    active_links = []
    for link in links:
        if link.expires_at is None or link.expires_at > now:
            active_links.append(link)
    
    return active_links

