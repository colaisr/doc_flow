"""add_verified_seller_documents_stage

Revision ID: 0177ec7b554d
Revises: 91ddf109f343
Create Date: 2026-01-09 21:35:01.491278

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '0177ec7b554d'
down_revision = '91ddf109f343'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # Insert new stage "מסמכי מוכר מאומתים" after "חתום על ידי מוכר" (order 6)
    # New stage will be order 7
    conn.execute(text("""
        INSERT INTO lead_stages (name, "order", color, is_default, is_archived, created_at)
        VALUES (:name, :order, NULL, 0, 0, :created_at)
    """), {
        'name': 'מסמכי מוכר מאומתים',
        'order': 7,
        'created_at': datetime.utcnow()
    })
    
    # Shift all subsequent stages by 1
    # Lawyer Contract Ready: 7 -> 8
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 8
        WHERE name = 'חוזה עורך דין מוכן'
    """))
    
    # Lawyer Signed: 8 -> 9
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 9
        WHERE name = 'חתום על ידי עורך דין'
    """))
    
    # Archive: 9 -> 10
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 10
        WHERE name = 'בארכיון'
    """))


def downgrade() -> None:
    conn = op.get_bind()
    
    # Remove the new stage
    conn.execute(text("""
        DELETE FROM lead_stages 
        WHERE name = 'מסמכי מוכר מאומתים'
    """))
    
    # Restore original orders
    # Lawyer Contract Ready: 8 -> 7
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 7
        WHERE name = 'חוזה עורך דין מוכן'
    """))
    
    # Lawyer Signed: 9 -> 8
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 8
        WHERE name = 'חתום על ידי עורך דין'
    """))
    
    # Archive: 10 -> 9
    conn.execute(text("""
        UPDATE lead_stages 
        SET "order" = 9
        WHERE name = 'בארכיון'
    """))

