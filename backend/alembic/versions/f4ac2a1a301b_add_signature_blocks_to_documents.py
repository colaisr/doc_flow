"""add_signature_blocks_to_documents

Revision ID: f4ac2a1a301b
Revises: c31f8cecfd97
Create Date: 2026-01-09 11:43:02.813988

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4ac2a1a301b'
down_revision = 'c31f8cecfd97'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add signature_blocks column to documents table
    op.add_column('documents', sa.Column('signature_blocks', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove signature_blocks column from documents table
    op.drop_column('documents', 'signature_blocks')

