"""add contract_type to documents

Revision ID: c31f8cecfd97
Revises: af5320bcc4b6
Create Date: 2026-01-09 08:05:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c31f8cecfd97'
down_revision = 'af5320bcc4b6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add contract_type column to documents table
    op.add_column('documents', sa.Column('contract_type', sa.String(length=50), nullable=True))
    
    # Update existing documents - we can't determine their type, so leave as NULL
    # They'll be treated as legacy documents


def downgrade() -> None:
    # Remove contract_type column
    op.drop_column('documents', 'contract_type')
