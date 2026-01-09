"""add_signature_block_id_to_document_signatures

Revision ID: 101a6c1f0a3b
Revises: f4ac2a1a301b
Create Date: 2026-01-09 12:31:12.509271

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '101a6c1f0a3b'
down_revision = 'f4ac2a1a301b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add signature_block_id column to document_signatures table
    # This allows multiple signatures per document (one per signature block)
    op.add_column('document_signatures', sa.Column('signature_block_id', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # Remove signature_block_id column from document_signatures table
    op.drop_column('document_signatures', 'signature_block_id')

