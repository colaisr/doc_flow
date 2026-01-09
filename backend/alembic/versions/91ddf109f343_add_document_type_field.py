"""add_document_type_field

Revision ID: 91ddf109f343
Revises: e2f3a4b5c6d7
Create Date: 2026-01-09 20:56:26.937894

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '91ddf109f343'
down_revision = 'e2f3a4b5c6d7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add document_type column to documents table
    op.add_column('documents', sa.Column('document_type', sa.String(length=100), nullable=True))


def downgrade() -> None:
    # Remove document_type column
    op.drop_column('documents', 'document_type')

