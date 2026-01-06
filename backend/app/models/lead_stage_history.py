"""
LeadStageHistory model for tracking lead stage changes (timeline).
"""
from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class LeadStageHistory(Base):
    __tablename__ = "lead_stage_history"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey('leads.id'), nullable=False, index=True)
    stage_id = Column(Integer, ForeignKey('lead_stages.id'), nullable=False, index=True)
    changed_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    lead = relationship("Lead", foreign_keys=[lead_id], back_populates="stage_history")
    stage = relationship("LeadStage", foreign_keys=[stage_id])
    changed_by_user = relationship("User", foreign_keys=[changed_by_user_id])

