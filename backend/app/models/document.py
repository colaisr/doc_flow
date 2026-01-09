"""
Document model - represents generated documents from templates
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Document(Base):
    """Document model - generated instance of a template for a specific lead"""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey('leads.id'), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey('document_templates.id'), nullable=True, index=True)  # Nullable for uploaded documents
    
    title = Column(String(500), nullable=False)  # Generated from template name + lead info
    rendered_content = Column(Text, nullable=True)  # HTML with merged data (no placeholders) - Nullable for uploaded PDFs
    signature_blocks = Column(Text, nullable=True)  # JSON string with signature block metadata (copied from template, can be edited)
    pdf_file_path = Column(String(1000), nullable=True)  # Path/URL to signed PDF file
    signing_url = Column(String(500), nullable=True)  # Public signing URL (stored when signing link is created)
    
    contract_type = Column(String(50), nullable=True)  # 'buyer', 'seller', 'lawyer' - determines which stage this contract is for
    document_type = Column(String(100), nullable=True)  # Document type ID for uploaded documents (e.g., 'lawyer_approved_buyer_contract')
    status = Column(String(50), nullable=False, default='draft')  # 'draft' (being worked on), 'ready' (ready to send), 'sent' (link sent), 'signed' (moved to Documents tab), 'uploaded' (uploaded PDF)
    
    created_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="documents")
    lead = relationship("Lead", back_populates="documents")
    template = relationship("DocumentTemplate", back_populates="documents")
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    signatures = relationship("DocumentSignature", back_populates="document", cascade="all, delete-orphan")
    signing_links = relationship("SigningLink", back_populates="document", cascade="all, delete-orphan")

