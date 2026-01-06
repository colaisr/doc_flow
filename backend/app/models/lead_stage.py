"""
LeadStage model for pipeline stages.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class LeadStage(Base):
    __tablename__ = "lead_stages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    order = Column(Integer, nullable=False, default=0)
    color = Column(String(50), nullable=True)  # Optional color for UI (e.g., "#FF5733")
    is_default = Column(Boolean, default=False, nullable=False)  # First stage for new leads
    is_archived = Column(Boolean, default=False, nullable=False)  # Archived stage (read-only)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    leads = relationship("Lead", back_populates="stage")

