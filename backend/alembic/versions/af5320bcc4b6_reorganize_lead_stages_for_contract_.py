"""reorganize lead stages for contract workflow

Revision ID: af5320bcc4b6
Revises: aa6b6b28e12e
Create Date: 2026-01-09 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'af5320bcc4b6'
down_revision = 'aa6b6b28e12e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # Archive old stages
    conn.execute(text("""
        UPDATE lead_stages 
        SET is_archived = 1 
        WHERE name IN ('מסמכים מוכנים', 'קישור חתימה נשלח', 'חתום על ידי פנימי', 'הושלם')
    """))
    
    # Update leads using old stages to use stage 1 (New Lead)
    conn.execute(text("""
        UPDATE leads 
        SET stage_id = (SELECT id FROM lead_stages WHERE name = 'ליד חדש' LIMIT 1)
        WHERE stage_id IN (
            SELECT id FROM lead_stages 
            WHERE name IN ('מסמכים מוכנים', 'קישור חתימה נשלח', 'חתום על ידי פנימי', 'הושלם')
        )
    """))
    
    # Update existing "ליד חדש" stage
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 1, is_default = 1, is_archived = 0
        WHERE name = 'ליד חדש'
    """))
    
    # Update existing "חתום על ידי לקוח" stage
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 3, is_default = 0, is_archived = 0
        WHERE name = 'חתום על ידי לקוח'
    """))
    
    # Insert new stages (check if they exist first)
    new_stages = [
        ('חוזה לקוח מוכן', 2),
        ('חוזה מוכר מוכן', 4),
        ('חתום על ידי מוכר', 5),
        ('חוזה עורך דין מוכן', 6),
        ('חתום על ידי עורך דין', 7),
    ]
    
    for stage_name, stage_order in new_stages:
        # Check if stage exists
        result = conn.execute(text("""
            SELECT id FROM lead_stages WHERE name = :name
        """), {'name': stage_name}).fetchone()
        
        if not result:
            # Insert new stage
            conn.execute(text("""
                INSERT INTO lead_stages (name, "order", color, is_default, is_archived, created_at)
                VALUES (:name, :order, NULL, 0, 0, :created_at)
            """), {
                'name': stage_name,
                'order': stage_order,
                'created_at': datetime.utcnow()
            })
        else:
            # Update existing stage
            conn.execute(text("""
                UPDATE lead_stages 
                SET "order" = :order, is_default = 0, is_archived = 0
                WHERE name = :name
            """), {
                'name': stage_name,
                'order': stage_order
            })
    
    # Update archived stage
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 8, is_archived = 1
        WHERE name = 'בארכיון'
    """))


def downgrade() -> None:
    conn = op.get_bind()
    
    # Revert old stages
    conn.execute(text("""
        UPDATE lead_stages 
        SET is_archived = 0 
        WHERE name IN ('מסמכים מוכן', 'קישור חתימה נשלח', 'חתום על ידי פנימי', 'הושלם')
    """))
    
    # Restore old order
    stages_to_restore = [
        ('ליד חדש', 1, 1),
        ('מסמכים מוכנים', 2, 0),
        ('קישור חתימה נשלח', 3, 0),
        ('חתום על ידי לקוח', 4, 0),
        ('חתום על ידי פנימי', 5, 0),
        ('הושלם', 6, 0),
        ('בארכיון', 7, 1),
    ]
    
    for stage_name, stage_order, is_default in stages_to_restore:
        conn.execute(text("""
            UPDATE lead_stages 
            SET "order" = :order, is_default = :is_default, is_archived = 0
            WHERE name = :name
        """), {
            'name': stage_name,
            'order': stage_order,
            'is_default': is_default
        })
    
    # Archive new stages
    conn.execute(text("""
        UPDATE lead_stages 
        SET is_archived = 1 
        WHERE name IN ('חוזה לקוח מוכן', 'חוזה מוכר מוכן', 'חתום על ידי מוכר', 'חוזה עורך דין מוכן', 'חתום על ידי עורך דין')
    """))
