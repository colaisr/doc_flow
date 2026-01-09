"""add verified buyer documents stage

Revision ID: d1e2f3a4b5c6
Revises: 101a6c1f0a3b
Create Date: 2026-01-09 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'd1e2f3a4b5c6'
down_revision = '101a6c1f0a3b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # Insert new stage "מסמכי לקוח מאומתים" after "חתום על ידי לקוח" (order 3)
    # New stage will be order 4
    conn.execute(text("""
        INSERT INTO lead_stages (name, "order", color, is_default, is_archived, created_at)
        VALUES (:name, :order, NULL, 0, 0, :created_at)
    """), {
        'name': 'מסמכי לקוח מאומתים',
        'order': 4,
        'created_at': datetime.utcnow()
    })
    
    # Shift all subsequent stages by 1
    # Seller Contract Ready: 4 -> 5
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 5
        WHERE name = 'חוזה מוכר מוכן'
    """))
    
    # Seller Signed: 5 -> 6
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 6
        WHERE name = 'חתום על ידי מוכר'
    """))
    
    # Lawyer Contract Ready: 6 -> 7
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 7
        WHERE name = 'חוזה עורך דין מוכן'
    """))
    
    # Lawyer Signed: 7 -> 8
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 8
        WHERE name = 'חתום על ידי עורך דין'
    """))
    
    # Archive: 8 -> 9
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 9
        WHERE name = 'בארכיון'
    """))


def downgrade() -> None:
    conn = op.get_bind()
    
    # Remove the new stage
    conn.execute(text("""
        DELETE FROM lead_stages 
        WHERE name = 'מסמכי לקוח מאומתים'
    """))
    
    # Restore original orders
    # Seller Contract Ready: 5 -> 4
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 4
        WHERE name = 'חוזה מוכר מוכן'
    """))
    
    # Seller Signed: 6 -> 5
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 5
        WHERE name = 'חתום על ידי מוכר'
    """))
    
    # Lawyer Contract Ready: 7 -> 6
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 6
        WHERE name = 'חוזה עורך דין מוכן'
    """))
    
    # Lawyer Signed: 8 -> 7
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 7
        WHERE name = 'חתום על ידי עורך דין'
    """))
    
    # Archive: 9 -> 8
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 8
        WHERE name = 'בארכיון'
    """))
