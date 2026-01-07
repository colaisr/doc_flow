"""
DocumentSignature model - stores signature data for documents
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class DocumentSignature(Base):
    """DocumentSignature model - stores signature data for a document"""
    __tablename__ = "document_signatures"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False, index=True)
    
    signer_type = Column(String(20), nullable=False)  # 'client' or 'internal'
    signer_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # NULL for client (token-based)
    signer_name = Column(String(255), nullable=False)  # Name of signer
    signer_email = Column(String(255), nullable=True)  # Email of signer
    
    signature_data = Column(Text, nullable=False)  # Base64-encoded signature image or JSON
    
    signing_token = Column(String(255), nullable=True, index=True)  # Token used for signing (client only)
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(String(500), nullable=True)
    
    signed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    document = relationship("Document", back_populates="signatures")
    signer_user = relationship("User", foreign_keys=[signer_user_id])

