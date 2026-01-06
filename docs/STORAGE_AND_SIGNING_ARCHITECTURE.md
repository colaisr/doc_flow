# Storage and Signing Architecture

## Storage Locations

### 1. Templates
**Location:** Database (SQLite/MySQL)
- **Table:** `DocumentTemplate`
- **Fields:**
  - `content` (Text) - HTML content with merge fields
  - `signature_blocks` (JSON/Text) - Signature block metadata
- **Reason:** Templates are structured data, need to be queryable, versioned, and organization-scoped

### 2. Rendered Documents (HTML)
**Location:** Database
- **Table:** `Document`
- **Field:** `rendered_content` (Text) - HTML with merged data
- **Reason:** Need audit trail, fast retrieval, no file system complexity

### 3. Signed PDFs
**Location:** File System (MVP) / Cloud Storage (Production)
- **File System Path:** `storage/pdfs/{organization_id}/{document_id}.pdf`
- **Database Field:** `Document.pdf_file_path` (String) - Stores path/URL
- **Reason:** PDFs are binary files, can be large, need efficient storage
- **MVP:** Local file system
- **Production:** Cloud storage (S3, Azure Blob, etc.)

### 4. Signatures
**Location:** Database
- **Table:** `DocumentSignature`
- **Field:** `signature_data` (Text) - Base64-encoded image
- **Reason:** Small data size, need to be queryable, part of audit trail

### 5. Signing URLs
**Location:** Database
- **Table:** `Document`
- **Field:** `signing_url` (String) - Full public signing URL
- **Stored when:** Signing link is created via `POST /api/documents/{id}/signing-links`
- **Format:** `https://domain.com/public/sign/{token}`
- **Reason:** Need to track and display signing URLs, allow easy access

## Signing Pages

### 1. Public Signing Page
**Route:** `/public/sign/[token]`
- **Access:** No authentication required
- **Purpose:** Client signing via public link
- **Features:**
  - Token validation from URL
  - Display document content (read-only)
  - Signature canvas for client
  - Submit signature
  - Success confirmation
  - RTL/Hebrew support

### 2. Internal Signing Page
**Route:** `/documents/[id]/sign`
- **Access:** Requires authentication
- **Purpose:** Internal user (lawyer) signing
- **Features:**
  - Display document content
  - Signature canvas for internal signer
  - Submit signature
  - Success confirmation
  - RTL/Hebrew support

## Document Generation Flow

1. User selects template from Lead Details Page
2. Document is generated (merge fields replaced)
3. Rendered HTML stored in `Document.rendered_content`
4. Document status = `'draft'`
5. User creates signing link
6. Signing URL stored in `Document.signing_url`
7. Client signs via public link
8. Signature stored in `DocumentSignature` table
9. Internal user signs
10. When all signatures collected, status = `'completed'`
11. PDF automatically generated
12. PDF stored in file system/cloud
13. PDF path stored in `Document.pdf_file_path`

## Database Schema Summary

### Document Table
```sql
- id
- organization_id
- lead_id
- template_id
- title
- rendered_content (HTML)
- pdf_file_path (String, Optional)
- signing_url (String, Optional)  -- Stored when signing link created
- status
- created_by_user_id
- created_at
- updated_at
- completed_at
```

### DocumentTemplate Table
```sql
- id
- organization_id
- name
- description
- content (HTML with merge fields)
- signature_blocks (JSON)
- created_by_user_id
- created_at
- updated_at
- is_active
```

### SigningLink Table
```sql
- id
- document_id
- token (UUID)
- signer_type
- expires_at
- is_used
- created_at
- used_at
```

### DocumentSignature Table
```sql
- id
- document_id
- signer_type
- signature_data (Base64 image)
- signed_at
```

