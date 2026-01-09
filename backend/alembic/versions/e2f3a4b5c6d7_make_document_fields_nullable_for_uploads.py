"""make document fields nullable for uploads

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-01-09 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e2f3a4b5c6d7'
down_revision = 'd1e2f3a4b5c6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    # For SQLite, we'll use a workaround: create new table, copy data, drop old, rename
    conn = op.get_bind()
    
    # Check if we're using SQLite
    if conn.dialect.name == 'sqlite':
        # Drop temp table if it exists (from previous failed migration)
        conn.execute(sa.text("DROP TABLE IF EXISTS documents_new"))
        
        # SQLite workaround: create new table with nullable columns
        conn.execute(sa.text("""
            CREATE TABLE documents_new (
                id INTEGER NOT NULL PRIMARY KEY,
                organization_id INTEGER NOT NULL,
                lead_id INTEGER NOT NULL,
                template_id INTEGER,
                title VARCHAR(500) NOT NULL,
                rendered_content TEXT,
                pdf_file_path VARCHAR(1000),
                signing_url VARCHAR(500),
                status VARCHAR(50) NOT NULL,
                created_by_user_id INTEGER NOT NULL,
                created_at DATETIME,
                updated_at DATETIME,
                completed_at DATETIME,
                contract_type VARCHAR(50),
                signature_blocks TEXT,
                FOREIGN KEY(organization_id) REFERENCES organizations (id),
                FOREIGN KEY(lead_id) REFERENCES leads (id),
                FOREIGN KEY(template_id) REFERENCES document_templates (id),
                FOREIGN KEY(created_by_user_id) REFERENCES users (id)
            )
        """))
        
        # Copy data - explicitly list columns to match order
        conn.execute(sa.text("""
            INSERT INTO documents_new (
                id, organization_id, lead_id, template_id, title, rendered_content,
                pdf_file_path, signing_url, status, created_by_user_id,
                created_at, updated_at, completed_at, contract_type, signature_blocks
            )
            SELECT 
                id, organization_id, lead_id, template_id, title, rendered_content,
                pdf_file_path, signing_url, status, created_by_user_id,
                created_at, updated_at, completed_at, contract_type, signature_blocks
            FROM documents
        """))
        
        # Drop old table
        conn.execute(sa.text("DROP TABLE documents"))
        
        # Rename new table
        conn.execute(sa.text("ALTER TABLE documents_new RENAME TO documents"))
        
        # Recreate indexes
        conn.execute(sa.text("CREATE INDEX ix_documents_organization_id ON documents (organization_id)"))
        conn.execute(sa.text("CREATE INDEX ix_documents_lead_id ON documents (lead_id)"))
        conn.execute(sa.text("CREATE INDEX ix_documents_template_id ON documents (template_id)"))
    else:
        # For other databases (MySQL, PostgreSQL), use ALTER COLUMN
        op.alter_column('documents', 'template_id',
                        existing_type=sa.Integer(),
                        nullable=True)
        op.alter_column('documents', 'rendered_content',
                        existing_type=sa.Text(),
                        nullable=True)


def downgrade() -> None:
    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    conn = op.get_bind()
    
    # Check if we're using SQLite
    if conn.dialect.name == 'sqlite':
        # SQLite workaround: create new table with non-nullable columns
        conn.execute(sa.text("""
            CREATE TABLE documents_old (
                id INTEGER NOT NULL PRIMARY KEY,
                organization_id INTEGER NOT NULL,
                lead_id INTEGER NOT NULL,
                template_id INTEGER NOT NULL,
                title VARCHAR(500) NOT NULL,
                rendered_content TEXT NOT NULL,
                signature_blocks TEXT,
                pdf_file_path VARCHAR(1000),
                signing_url VARCHAR(500),
                contract_type VARCHAR(50),
                status VARCHAR(50) NOT NULL,
                created_by_user_id INTEGER NOT NULL,
                created_at DATETIME,
                updated_at DATETIME,
                completed_at DATETIME,
                FOREIGN KEY(organization_id) REFERENCES organizations (id),
                FOREIGN KEY(lead_id) REFERENCES leads (id),
                FOREIGN KEY(template_id) REFERENCES document_templates (id),
                FOREIGN KEY(created_by_user_id) REFERENCES users (id)
            )
        """))
        
        # Copy data (filter out NULL values)
        conn.execute(sa.text("""
            INSERT INTO documents_old 
            SELECT * FROM documents
            WHERE template_id IS NOT NULL AND rendered_content IS NOT NULL
        """))
        
        # Drop old table
        conn.execute(sa.text("DROP TABLE documents"))
        
        # Rename new table
        conn.execute(sa.text("ALTER TABLE documents_old RENAME TO documents"))
        
        # Recreate indexes
        conn.execute(sa.text("CREATE INDEX ix_documents_organization_id ON documents (organization_id)"))
        conn.execute(sa.text("CREATE INDEX ix_documents_lead_id ON documents (lead_id)"))
        conn.execute(sa.text("CREATE INDEX ix_documents_template_id ON documents (template_id)"))
    else:
        # For other databases (MySQL, PostgreSQL), use ALTER COLUMN
        op.alter_column('documents', 'rendered_content',
                        existing_type=sa.Text(),
                        nullable=False)
        op.alter_column('documents', 'template_id',
                        existing_type=sa.Integer(),
                        nullable=False)
