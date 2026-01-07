"""
SigningLink model - stores public signing links for documents
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class SigningLink(Base):
    """SigningLink model - public signing link with token for a document"""
    __tablename__ = "signing_links"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False, index=True)
    
    token = Column(String(255), unique=True, nullable=False, index=True)  # Public signing token (UUID)
    signer_type = Column(String(20), nullable=False)  # 'client' or 'internal'
    intended_signer_email = Column(String(255), nullable=True)  # Email for client links
    
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Optional expiration
    is_used = Column(Boolean, nullable=False, default=False)  # Link has been used
    
    created_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    document = relationship("Document", back_populates="signing_links")
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])

