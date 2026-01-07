"""
DocumentTemplate model for document template management.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class DocumentTemplate(Base):
    __tablename__ = "document_templates"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=False)  # HTML content with merge fields
    signature_blocks = Column(Text, nullable=True)  # JSON string with signature block metadata
    created_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, nullable=False, default=True)  # Soft delete

    # Relationships
    organization = relationship("Organization", back_populates="document_templates")
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    # documents = relationship("Document", back_populates="template")  # For Phase 3

