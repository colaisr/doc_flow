# MASTER PLAN - CRM + Document Signing MVP

**Last Updated:** January 2026  
**Status:** Phase 1 & 2 Complete, Phase 3 In Progress (3.1-3.8 Complete, 3.9 Pending)

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Architecture & Technology Stack](#2-architecture--technology-stack)
3. [Core Domain Models](#3-core-domain-models)
4. [User Management & Authentication](#4-user-management--authentication)
5. [Organization Management](#5-organization-management)
6. [CRM Functionality](#6-crm-functionality)
7. [Document Templates](#7-document-templates)
8. [Document Generation](#8-document-generation)
9. [Electronic Signing](#9-electronic-signing)
10. [Lead Intake Forms](#10-lead-intake-forms)
11. [Reports & Analytics](#11-reports--analytics)
12. [System Administration](#12-system-administration)
13. [API Specifications](#13-api-specifications)
14. [Frontend Pages & Components](#14-frontend-pages--components)
15. [Security & Compliance](#15-security--compliance)
16. [Non-Goals (Explicitly Excluded from MVP)](#16-non-goals)

---

## 1. SYSTEM OVERVIEW

### 1.1 Purpose
A web-based MVP combining CRM functionality with document generation and electronic signing, designed primarily for law offices handling real estate property cases.

### 1.2 Core Value Proposition
- **For Law Firms:** Streamlined lead management through configurable pipelines, automated document generation, and sequential electronic signing workflows.
- **For Clients:** Simple, secure document signing experience via public links without requiring account creation.

### 1.3 MVP Philosophy
- Focus on core business workflows
- Deliberately simplified advanced features (no PDF editing tools, no complex compliance certifications)
- Clear user experience with reliable document signing basics
- Multi-tenant collaboration support
- Extensible foundation for future iterations

---

## 2. ARCHITECTURE & TECHNOLOGY STACK

### 2.1 Current Stack
- **Backend:** FastAPI (Python)
- **Database:** SQLite (development) / MySQL (production)
- **Frontend:** Next.js (React/TypeScript) with TailwindCSS
- **Authentication:** Session-based (cookie) with token signing
- **ORM:** SQLAlchemy
- **Migrations:** Alembic

### 2.2 Architecture Patterns
- **Multi-tenant:** Organization-scoped data isolation
- **RESTful API:** Backend-frontend separation
- **Session Management:** Cookie-based sessions with HMAC signing
- **Template Rendering:** Server-side document generation

### 2.3 Database Schema Overview
- Users, Organizations, OrganizationMembers
- Leads, LeadFields, LeadStages
- DocumentTemplates, TemplateFields
- Documents, DocumentSignatures, SigningLinks
- LeadIntakeForms, FormSubmissions

---

## 3. CORE DOMAIN MODELS

### 3.1 User Model
**Properties:**
- `id` (Integer, Primary Key)
- `email` (String, Unique, Indexed)
- `hashed_password` (String)
- `full_name` (String, Optional)
- `role` (String) - Platform-level: `'admin'` or `'user'`
- `email_verified` (Boolean)
- `email_verification_token` (String, Optional)
- `email_verification_token_expires` (DateTime, Optional)
- `is_active` (Boolean)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Relationships:**
- Many-to-many with Organizations (via OrganizationMember)
- One-to-many with Documents (as creator/signer)
- One-to-many with Leads (as assigned user)

**Status:** ✅ Implemented

---

### 3.2 Organization Model
**Properties:**
- `id` (Integer, Primary Key)
- `name` (String)
- `slug` (String, Unique, Optional)
- `owner_id` (Integer, Foreign Key to User)
- `is_personal` (Boolean) - Auto-created on user registration
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Relationships:**
- One-to-many with OrganizationMembers
- One-to-many with Leads
- One-to-many with DocumentTemplates
- One-to-many with Documents
- One-to-many with LeadIntakeForms

**Status:** ✅ Implemented

---

### 3.3 OrganizationMember Model
**Properties:**
- `id` (Integer, Primary Key)
- `organization_id` (Integer, Foreign Key)
- `user_id` (Integer, Foreign Key)
- `role` (String) - `'org_admin'` or `'org_user'`
- `invited_by` (Integer, Foreign Key to User, Optional)
- `joined_at` (DateTime)

**Constraints:**
- Unique constraint on (organization_id, user_id)

**Status:** ✅ Implemented

---

### 3.4 Lead Model
**Properties:**
- `id` (Integer, Primary Key)
- `organization_id` (Integer, Foreign Key) - **Required**
- `stage_id` (Integer, Foreign Key to LeadStage) - Current stage
- `assigned_user_id` (Integer, Foreign Key to User, Optional)
- `created_by_user_id` (Integer, Foreign Key to User)
- `source` (String) - `'manual'` or `'form'`
- `deleted_at` (DateTime, Optional) - Soft delete
- `created_at` (DateTime)
- `updated_at` (DateTime)
- **130+ fixed fields** including:
  - Basic info: `full_name` (required), `client_id`, `phone`, `address`, `email`, `birth_date`
  - Transaction details: `signing_date`, `plot_number`, `block_number`, `area_sqm`, `transaction_amount`, `legal_fee`, etc.
  - Document fields: `id_scan`, `signing_documents_word`, `signing_documents_pdf`, etc.
  - Dates & deadlines: `realization_date`, `report_deadline`, `purchase_tax_payment_deadline`, etc.
  - Integration IDs: `morning_client_id_company`, `morning_client_id_office`, `invoice_id`, etc.
  - Status & workflow: `signing_status`, `fee_payment_status`, `client_type`, etc.
  - Collection & payment: `non_payment_reason`, `collection_notes`, `plot_value`, etc.
  - And many more...

**Relationships:**
- Many-to-one with Organization
- Many-to-one with LeadStage
- Many-to-one with User (assigned, creator)
- One-to-many with LeadStageHistory
- One-to-many with Documents (future)

**Field Storage Strategy:**
- All fields stored as fixed columns in Lead table (not dynamic key-value pairs)
- All organizations use the same 130+ fields
- Fields organized into logical sections (Basic Info, Transaction, Documents, Dates, etc.)

**Status:** ✅ Implemented

---

### 3.5 LeadFieldValue Model
**Status:** ❌ NOT IMPLEMENTED - Using fixed columns in Lead table instead

**Note:** All lead fields are stored as fixed columns in the Lead model. No separate LeadFieldValue table needed.

---

### 3.6 LeadStage Model
**Properties:**
- `id` (Integer, Primary Key)
- `name` (String) - Stage name in Hebrew
- `order` (Integer) - Display order
- `color` (String, Optional) - UI color code
- `is_default` (Boolean) - First stage for new leads
- `is_archived` (Boolean) - Archived stage (read-only)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Default Stages (in Hebrew):**
1. ליד חדש (New Lead) - order: 1
2. מסמכים מוכנים (Documents Prepared) - order: 2
3. לינק חתימה נשלח (Signing Link Sent) - order: 3
4. חתום על ידי לקוח (Signed by Client) - order: 4
5. חתום על ידי פנימי (Signed by Internal) - order: 5
6. הושלם (Completed) - order: 6
7. בארכיון (Archived) - order: 7

**Note:** Stages are global (not organization-specific). All organizations use the same stages.

**Status:** ✅ Implemented

---

### 3.6.1 LeadStageHistory Model
**Properties:**
- `id` (Integer, Primary Key)
- `lead_id` (Integer, Foreign Key to Lead)
- `stage_id` (Integer, Foreign Key to LeadStage)
- `changed_by_user_id` (Integer, Foreign Key to User)
- `changed_at` (DateTime) - When stage was changed

**Relationships:**
- Many-to-one with Lead
- Many-to-one with LeadStage
- Many-to-one with User

**Purpose:** Track stage progression history for timeline visualization

**Status:** ✅ Implemented

---

### 3.7 LeadFieldDefinition Model
**Status:** ❌ NOT IMPLEMENTED - Using fixed columns in Lead table

**Note:** Field definitions are managed in the frontend (`frontend/lib/leadFields.ts`) with Hebrew labels. All organizations use the same fixed fields stored as columns in the Lead table. No separate LeadFieldDefinition table needed.

---

### 3.8 DocumentTemplate Model
**Properties:**
- `id` (Integer, Primary Key)
- `organization_id` (Integer, Foreign Key) - **Required**
- `name` (String)
- `description` (Text, Optional)
- `content` (Text) - Rich text HTML with merge fields (stored as HTML)
- `signature_blocks` (Text, Optional) - JSON string with signature block metadata (type, x, y, width, height, label)
- `created_by_user_id` (Integer, Foreign Key)
- `created_at` (DateTime)
- `updated_at` (DateTime)
- `is_active` (Boolean) - Soft delete

**Merge Field Syntax:**
- `{{lead.full_name}}` - Lead's full name
- `{{lead.email}}` - Lead's email
- `{{lead.address}}` - Lead's address
- `{{lead.<field_key>}}` - Any lead field from the 130+ available fields

**Signature Blocks:**
- Stored as JSON array with metadata: `[{id, type: 'client', x, y, width, height, label}]`
- Currently supports only `'client'` type (can be placed multiple times)
- Draggable and resizable in template editor (Adobe PDF / DocuSign style)
- Positioned absolutely in rendered documents
- Coordinates relative to document content area

**Relationships:**
- Many-to-one with Organization
- Many-to-one with User (created_by)
- One-to-many with Documents (future)

**Status:** ✅ Implemented

---

### 3.9 Document Model
**Properties:**
- `id` (Integer, Primary Key)
- `organization_id` (Integer, Foreign Key) - **Required**
- `lead_id` (Integer, Foreign Key) - **Required**
- `template_id` (Integer, Foreign Key) - Original template
- `title` (String) - Generated from template name + lead info
- `rendered_content` (Text) - HTML with merged data (no placeholders) - stored in database
- `pdf_file_path` (String, Optional) - Path/URL to signed PDF file (stored after signing)
- `signing_url` (String, Optional) - Public signing URL (stored when signing link is created)
- `status` (String) - `'draft'`, `'sent'`, `'signed_by_client'`, `'signed_by_internal'`, `'completed'`, `'expired'`
- `created_by_user_id` (Integer, Foreign Key)
- `created_at` (DateTime)
- `updated_at` (DateTime)
- `completed_at` (DateTime, Optional)

**Storage:**
- Rendered HTML: Database (`rendered_content` field)
- Signed PDF: File system or cloud storage (path stored in `pdf_file_path`)
- Signing URL: Stored in `signing_url` field when link is created

**Relationships:**
- Many-to-one with Organization, Lead, DocumentTemplate
- One-to-many with DocumentSignatures
- One-to-many with SigningLinks

**Status:** ✅ Implemented

---

### 3.10 DocumentSignature Model
**Properties:**
- `id` (Integer, Primary Key)
- `document_id` (Integer, Foreign Key)
- `signer_type` (String) - `'client'` or `'internal'`
- `signer_user_id` (Integer, Foreign Key, Optional) - NULL for client (token-based)
- `signer_name` (String) - Name of signer
- `signer_email` (String, Optional) - Email of signer
- `signature_data` (Text) - Base64-encoded signature image or JSON
- `signing_token` (String, Optional) - Token used for signing (client only)
- `ip_address` (String, Optional)
- `user_agent` (String, Optional)
- `signed_at` (DateTime)

**Relationships:**
- Many-to-one with Document
- Many-to-one with User (optional, for internal signers)

**Status:** ✅ Implemented

---

### 3.11 SigningLink Model
**Properties:**
- `id` (Integer, Primary Key)
- `document_id` (Integer, Foreign Key)
- `token` (String, Unique, Indexed) - Public signing token
- `signer_type` (String) - `'client'` or `'internal'`
- `intended_signer_email` (String, Optional) - Email for client links
- `expires_at` (DateTime, Optional)
- `is_used` (Boolean) - Link has been used
- `created_by_user_id` (Integer, Foreign Key)
- `created_at` (DateTime)
- `used_at` (DateTime, Optional)

**Relationships:**
- Many-to-one with Document

**Status:** ✅ Implemented

---

### 3.12 LeadIntakeForm Model
**Properties:**
- `id` (Integer, Primary Key)
- `organization_id` (Integer, Foreign Key) - **Required**
- `name` (String)
- `description` (Text, Optional)
- `public_url_token` (String, Unique, Indexed) - Public access token
- `fields_config` (JSON/Text) - JSON array of field definitions
- `auto_assign_user_id` (Integer, Foreign Key, Optional) - Auto-assign leads to user
- `default_stage_id` (Integer, Foreign Key, Optional) - Default stage for new leads
- `is_active` (Boolean)
- `created_by_user_id` (Integer, Foreign Key)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Field Config Example:**
```json
[
  {"key": "full_name", "label": "Full Name", "type": "text", "required": true},
  {"key": "email", "label": "Email", "type": "email", "required": false},
  {"key": "phone", "label": "Phone", "type": "phone", "required": false}
]
```

**Status:** ⏳ To Be Implemented

---

### 3.13 FormSubmission Model
**Properties:**
- `id` (Integer, Primary Key)
- `form_id` (Integer, Foreign Key)
- `lead_id` (Integer, Foreign Key, Optional) - Created lead
- `submitted_data` (JSON/Text) - Original submission payload
- `ip_address` (String, Optional)
- `user_agent` (String, Optional)
- `submitted_at` (DateTime)

**Relationships:**
- Many-to-one with LeadIntakeForm
- One-to-one with Lead (if lead was created)

**Status:** ⏳ To Be Implemented

---

## 4. USER MANAGEMENT & AUTHENTICATION

### 4.1 Authentication Flow
1. User registers with email/password
2. System sends email verification code (3-digit)
3. User verifies email via `/verify-email` endpoint
4. User logs in with email/password
5. Session token created (HMAC-signed cookie)
6. Personal organization context set automatically

**Status:** ✅ Implemented

---

### 4.2 User Registration
**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe"
}
```

**Response:**
- User created with `email_verified = false`
- Verification code generated
- Verification email sent
- Personal organization auto-created

**Status:** ✅ Implemented

---

### 4.3 Email Verification
**Endpoint:** `POST /api/auth/verify-email`

**Request:**
```json
{
  "token": "123"  // 3-digit code
}
```

**Status:** ✅ Implemented

---

### 4.4 Login
**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
- Session cookie set
- User data returned
- Current organization context set

**Status:** ✅ Implemented

---

### 4.5 User Roles

#### Platform-Level Roles
- **System Administrator (`role = 'admin'`):**
  - Full access to system administration panel
  - Can manage all users
  - Can configure global settings
  - Can manage default lead fields and stages

- **Regular User (`role = 'user'`):**
  - Standard platform access
  - Can belong to multiple organizations

#### Organization-Level Roles
- **Organization Owner:**
  - Full control over organization
  - Invite/remove users
  - Assign organization roles
  - Manage all organization resources

- **Organization Admin (`role = 'org_admin'`):**
  - Invite/remove users
  - Assign organization roles
  - Manage leads, templates, and configuration
  - Generate and send documents

- **Organization User (`role = 'org_user'`):**
  - Manage leads (create, edit, assign)
  - Generate and send documents
  - Sign documents internally

**Status:** ✅ Partially Implemented (Roles exist, full permission system to be implemented)

---

## 5. ORGANIZATION MANAGEMENT

### 5.1 Organization Context
- After login, user operates within a selected organization
- All leads, templates, and documents are organization-scoped
- User can switch between organizations they belong to
- Session stores `organization_id` in context

**Status:** ✅ Implemented (Basic structure)

---

### 5.2 Organization Operations

#### List User's Organizations
**Endpoint:** `GET /api/organizations`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Law Office ABC",
    "slug": "law-office-abc",
    "role": "org_admin",
    "is_personal": false
  }
]
```

**Status:** ✅ Implemented

#### Switch Organization Context
**Endpoint:** `POST /api/organizations/{id}/switch`

**Response:**
- Session updated with new `organization_id`
- Returns updated user context

**Status:** ⏳ To Be Implemented

#### Invite User to Organization
**Endpoint:** `POST /api/organizations/{id}/invite`

**Request:**
```json
{
  "email": "newuser@example.com",
  "role": "org_user"
}
```

**Status:** ✅ Implemented (Basic invitation system exists)

---

## 6. CRM FUNCTIONALITY

### 6.1 Lead Management

#### Create Lead (Manual)
**Endpoint:** `POST /api/leads`

**Request:**
```json
{
  "full_name": "John Doe",  // Required
  "email": "john@example.com",  // Optional
  "phone": "+1234567890",  // Optional
  "address": "123 Main St",  // Optional
  "stage_id": 1,  // Optional, defaults to first stage
  "assigned_user_id": 2,  // Optional
  "client_id": "123456789",  // Optional
  "birth_date": "1990-01-01",  // Optional
  // ... any of the 130+ lead fields
  "source": "manual"  // Default: "manual"
}
```

**Response:**
- Returns created Lead with all fields
- Creates initial LeadStageHistory entry
- Sets organization_id from session context
- Sets created_by_user_id from current user

**Status:** ✅ Implemented

---

#### List Leads
**Endpoint:** `GET /api/leads`

**Query Parameters:**
- `stage_id` (Optional, can be multiple) - Filter by stage IDs
- `assigned_user_id` (Optional, can be multiple) - Filter by assigned user IDs
- `search` (Optional) - Full-text search across all lead fields
- `page` (Optional, default: 1) - Pagination page number
- `limit` (Optional, default: 50) - Items per page

**Response:**
```json
{
  "leads": [
    {
      "id": 1,
      "organization_id": 1,
      "stage_id": 1,
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "stage": {
        "id": 1,
        "name": "ליד חדש",
        "order": 1
      },
      "assigned_user": {
        "id": 2,
        "email": "lawyer@example.com",
        "full_name": "Jane Lawyer"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50,
  "total_pages": 2
}
```

**Status:** ✅ Implemented

---

#### Get Lead Details
**Endpoint:** `GET /api/leads/{id}`

**Response:**
- Full lead data with all 130+ fields
- Current stage (nested object)
- Stage history timeline (array of LeadStageHistory)
- Assigned user (nested object)
- Created by user (nested object)
- All lead field values

**Example Response:**
```json
{
  "id": 1,
  "organization_id": 1,
  "full_name": "John Doe",
  "email": "john@example.com",
  // ... all 130+ fields
  "stage": {
    "id": 1,
    "name": "ליד חדש"
  },
  "stage_history": [
    {
      "id": 1,
      "stage_id": 1,
      "changed_at": "2024-01-01T00:00:00Z",
      "stage": {"id": 1, "name": "ליד חדש"},
      "changed_by_user": {"id": 1, "email": "user@example.com"}
    }
  ],
  "assigned_user": {...},
  "created_by_user": {...}
}
```

**Status:** ✅ Implemented

---

#### Update Lead
**Endpoint:** `PUT /api/leads/{id}`

**Request:** (All fields optional, partial update)
```json
{
  "full_name": "John Doe Updated",
  "email": "newemail@example.com",
  "stage_id": 2,
  "assigned_user_id": 3
  // ... any of the 130+ lead fields
}
```

**Response:**
- Returns updated Lead with all fields
- Creates LeadStageHistory entry if stage_id changed
- Validates email/phone formats if provided

**Status:** ✅ Implemented

---

#### Delete Lead
**Endpoint:** `DELETE /api/leads/{id}`

**Process:**
- Soft delete: Sets `deleted_at` timestamp
- Does not permanently remove from database
- Filtered out from list queries (deleted_at IS NULL)

**Status:** ✅ Implemented

---

### 6.2 Lead Stages (Pipeline)

#### List Stages
**Endpoint:** `GET /api/stages`

**Response:**
- All global stages (ordered by `order` ASC)
- All organizations use the same stages
- Returns list of stages with: id, name (Hebrew), order, color, is_default, is_archived

**Note:** Stages are global, not organization-specific. Organizations cannot customize stages.

**Status:** ✅ Implemented

---

#### Create Custom Stage
**Endpoint:** `POST /api/organizations/{id}/stages`

**Request:**
```json
{
  "name": "Under Review",
  "order": 3,
  "color": "#FF5733"
}
```

**Status:** ⏳ To Be Implemented

---

#### Update Stage Order
**Endpoint:** `PUT /api/organizations/{id}/stages/reorder`

**Request:**
```json
{
  "stage_orders": [
    {"stage_id": 1, "order": 1},
    {"stage_id": 2, "order": 2}
  ]
}
```

**Status:** ⏳ To Be Implemented

---

### 6.3 Lead Field Definitions

#### List Field Definitions
**Endpoint:** `GET /api/organizations/{id}/lead-fields`

**Response:**
- Organization-specific fields + system default fields

**Status:** ⏳ To Be Implemented

---

#### Create Custom Field
**Endpoint:** `POST /api/organizations/{id}/lead-fields`

**Request:**
```json
{
  "key": "property_address",
  "label": "Property Address",
  "type": "textarea",
  "required": false,
  "order": 10
}
```

**Status:** ⏳ To Be Implemented

---

## 7. DOCUMENT TEMPLATES

### 7.1 Template Management

#### List Templates
**Endpoint:** `GET /api/organizations/{id}/templates`

**Query Parameters:**
- `search` (Optional) - Search in name and description

**Response:**
- Returns list of templates for the organization
- Includes: id, name, description, created_by_user, created_at, updated_at

**Status:** ✅ Implemented

---

#### Create Template
**Endpoint:** `POST /api/organizations/{id}/templates`

**Request:**
```json
{
  "name": "Real Estate Purchase Agreement",
  "description": "Standard purchase agreement template",
  "content": "<p>This agreement is between {{lead.full_name}} and...</p>",
  "signature_blocks": "[{\"id\":\"sig_123\",\"type\":\"client\",\"x\":297,\"y\":521,\"width\":200,\"height\":80,\"label\":\"חתימת לקוח\"}]"
}
```

**Status:** ✅ Implemented

---

#### Get Template
**Endpoint:** `GET /api/templates/{id}`

**Response:**
- Full template data including content and signature_blocks

**Status:** ✅ Implemented

---

#### Update Template
**Endpoint:** `PUT /api/templates/{id}`

**Request:** (All fields optional - partial update)
```json
{
  "name": "Updated Template Name",
  "content": "<p>Updated content...</p>",
  "signature_blocks": "[...]"
}
```

**Status:** ✅ Implemented

---

#### Delete Template
**Endpoint:** `DELETE /api/templates/{id}`

**Process:**
- Soft delete: Sets `is_active = false`

**Status:** ✅ Implemented

---

#### Duplicate Template
**Endpoint:** `POST /api/templates/{id}/duplicate`

**Response:**
- Creates new template with "העתק של [name]" as the name
- Copies content and signature_blocks

**Status:** ✅ Implemented

---

### 7.2 Template Editor Features

**Rich Text Editor (Google Docs-style):**
- Full-page editor with A4 page view
- Bold, italic, underline formatting
- Font size dropdown (replaces H1/H2/H3)
- Text alignment (left, center, right, justify)
- Bulleted and numbered lists
- Undo/Redo support
- Preserves formatting when pasting from Google Docs/Word
- Multi-page A4 layout with automatic page breaks
- RTL (right-to-left) support for Hebrew content

**Merge Fields:**
- Panel with available lead fields displayed as pills
- Click to insert merge field: `{{lead.<field_key>}}`
- Visual indication in editor (styled differently from regular text)
- All 130+ lead fields available for insertion

**Signature Blocks:**
- Single signature type: "Customer" (חתימת לקוח)
- Can be placed multiple times per template
- Click icon in toolbar → block appears centered on page
- Drag and drop to position (Adobe PDF / DocuSign style)
- Resizable via corner handle
- Delete button on each block
- Stored as JSON with absolute coordinates (x, y, width, height)
- Overlay system - blocks appear on top of document content

**Editor UI:**
- Full-screen editing mode (sidebar/topbar hidden)
- Page-based view with shadows (like Google Docs)
- Automatic page creation when content exceeds A4 height
- Visual page break indicators

**Status:** ✅ Implemented

---

## 8. DOCUMENT GENERATION

### 8.1 Generate Document from Template

#### Create Document
**Endpoint:** `POST /api/documents`

**Request:**
```json
{
  "template_id": 5,
  "lead_id": 12,
  "title": "Optional custom title"
}
```

**Process:**
1. Fetch template content
2. Fetch lead field values
3. Validate merge fields against lead fields
4. Replace merge fields: `{{lead.full_name}}` → actual value (HTML-escaped)
5. Preserve signature block structure (overlay handled in frontend)
6. Generate rendered HTML and document title
7. Create Document record with `status = 'draft'`

**Document Creation from Lead Page:**
- "צור מסמך חדש" (Create New Document) button on Lead Details page
- Opens `CreateDocumentModal` component
- Modal displays list of available templates for organization
- User selects template
- Document is generated with merged lead data
- Automatic redirect to document view page after creation
- Documents list on lead page refreshes automatically

**Response:**
```json
{
  "id": 10,
  "title": "Real Estate Purchase Agreement - John Doe",
  "rendered_content": "<h1>Purchase Agreement</h1><p>This agreement is between John Doe and...</p>",
  "status": "draft",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Status:** ✅ Implemented

---

### 8.2 Document Rendering Logic

**Merge Field Replacement:**
- Pattern: `{{lead.<field_key>}}`
- Lookup in Lead model fixed columns (130+ fields)
- Replace with actual value or empty string
- HTML escape values to prevent XSS
- RTL preserved (wrapping when missing)

**Signature Placeholder Handling:**
- Signature blocks stored as JSON on template; rendered via overlay on frontend
- Content left intact; blocks handled separately on view/sign

**Status:** ✅ Implemented

---

## 9. ELECTRONIC SIGNING

### 9.1 Signing Flow

#### Typical Flow:
1. Document generated from template (via Lead Details page or API)
2. User creates signing link for client: `POST /api/documents/{id}/signing-links`
3. Client receives public link: `GET /api/public/sign/{token}`
4. Client signs document: `POST /api/public/sign/{token}/sign`
5. Document status updates: `'signed_by_client'`
6. Lead stage auto-advances to "חתום על ידי לקוח" (order 4)
7. Internal user signs: `POST /api/documents/{id}/sign` (authenticated)
8. Document status updates: `'signed_by_internal'` or `'completed'`
9. Lead stage auto-advances accordingly (to order 5, then 6 if completed)

**Status:** ✅ Implemented

---

### 9.2 Create Signing Link

#### For Client (Public Link)
**Endpoint:** `POST /api/documents/{id}/signing-links`

**Request:**
```json
{
  "signer_type": "client",
  "intended_signer_email": "client@example.com",
  "expires_in_days": 7
}
```

**Response:**
```json
{
  "id": 20,
  "token": "abc123xyz789",
  "signing_url": "https://app.example.com/sign/abc123xyz789",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

**Status:** ✅ Implemented

---

#### For Internal User (Authenticated)
**Endpoint:** `POST /api/documents/{id}/sign`

**Request:**
```json
{
  "signer_type": "internal",
  "signer_name": "John Doe",
  "signature_data": "data:image/png;base64,iVBORw0KG..."  // Base64 signature image
}
```

**Process:**
1. Validates user authentication
2. Creates DocumentSignature record with signer_user_id
3. Updates document status to `'signed_by_internal'` or `'completed'`
4. Auto-advances lead stage to "חתום על ידי פנימי" (order 5) or "הושלם" (order 6)
5. Creates LeadStageHistory entry

**Status:** ✅ Implemented

---

### 9.3 Public Signing Page

**Endpoint:** `GET /api/public/sign/{token}`

**Response:**
- Document details (title, rendered_content, signature_blocks)
- Signer type information
- Expiration and usage status
- Read-only document view with signature blocks positioned

**Frontend Route:** `/public/sign/[token]`

**Features:**
- Token validation (checks expiration, usage status)
- Display rendered document with merged lead data
- Signature canvas for capturing handwritten signature
- Form fields: signer name, email (pre-filled from link if available)
- Submit signature button
- Success confirmation after signing

**Status:** ✅ Implemented

---

### 9.4 Submit Signature (Public)

**Endpoint:** `POST /api/public/sign/{token}/sign`

**Request:**
```json
{
  "signer_name": "John Doe",
  "signer_email": "john@example.com",
  "signature_data": "data:image/png;base64,iVBORw0KG...",
  "signer_type": "client"
}
```

**Process:**
1. Validate token and expiration
2. Check if link already used
3. Verify signer_type matches link's intended type
4. Create DocumentSignature record with signing_token
5. Update document status to `'signed_by_client'`
6. Auto-advance lead stage to "חתום על ידי לקוח" (order 4)
7. Mark signing link as used
8. Create LeadStageHistory entry
9. Log IP address and user agent

**Response:**
```json
{
  "message": "Signature submitted successfully",
  "document_status": "signed_by_client",
  "signature_id": 123
}
```

**Status:** ✅ Implemented

---

### 9.5 Signature Storage

**Signature Data Format:**
- Base64-encoded PNG image (`data:image/png;base64,...` format)
- Stored in `DocumentSignature.signature_data` field as Text
- Captured using `react-signature-canvas` component
- Supports both mouse and touch input

**Audit Trail:**
- Timestamp (`signed_at`)
- IP address (`ip_address`)
- User agent (`user_agent`)
- Signer identity (`signer_name`, `signer_email`, `signer_user_id`)
- Signing token (for public client signatures)

**Signature Capture Component:**
- React component with signature canvas
- Clear button
- Status indicator (signature saved confirmation)
- RTL support with Hebrew labels
- Converts to Base64 PNG on submit

**Status:** ✅ Implemented

---

## 10. LEAD INTAKE FORMS

### 10.1 Form Management

#### Create Form
**Endpoint:** `POST /api/organizations/{id}/forms`

**Request:**
```json
{
  "name": "New Client Intake",
  "description": "Form for new real estate clients",
  "fields_config": [
    {"key": "full_name", "label": "Full Name", "type": "text", "required": true},
    {"key": "email", "label": "Email", "type": "email", "required": false},
    {"key": "property_address", "label": "Property Address", "type": "textarea", "required": true}
  ],
  "auto_assign_user_id": 2,
  "default_stage_id": 1
}
```

**Response:**
```json
{
  "id": 5,
  "public_url_token": "form_xyz789abc123",
  "public_url": "https://app.example.com/public/form/form_xyz789abc123",
  "embed_code": "<iframe src='...' width='100%' height='600'></iframe>"
}
```

**Status:** ⏳ To Be Implemented

---

#### List Forms
**Endpoint:** `GET /api/organizations/{id}/forms`

**Status:** ⏳ To Be Implemented

---

### 10.2 Public Form Submission

#### Get Public Form
**Endpoint:** `GET /api/public/form/{token}`

**Response:**
- Form configuration
- Fields to render

**Status:** ⏳ To Be Implemented

---

#### Submit Form
**Endpoint:** `POST /api/public/form/{token}/submit`

**Request:**
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "property_address": "123 Main St"
}
```

**Process:**
1. Validate token and form is active
2. Create FormSubmission record
3. Create Lead from submission data
4. Assign to configured user (if set)
5. Set default stage (if configured)
6. Return success response

**Status:** ⏳ To Be Implemented

---

## 11. REPORTS & ANALYTICS

### 11.1 Basic Reports

#### Leads by Stage
**Endpoint:** `GET /api/organizations/{id}/reports/leads-by-stage`

**Response:**
```json
{
  "stages": [
    {"stage_id": 1, "stage_name": "New Lead", "count": 15},
    {"stage_id": 2, "stage_name": "Documents Prepared", "count": 8},
    {"stage_id": 3, "stage_name": "Signing Link Sent", "count": 5}
  ],
  "total_leads": 28
}
```

**Status:** ⏳ To Be Implemented

---

#### Lead Completion Stats
**Endpoint:** `GET /api/organizations/{id}/reports/completion`

**Response:**
```json
{
  "completed_leads": 10,
  "total_leads": 50,
  "completion_rate": 0.2,
  "average_completion_days": 14.5
}
```

**Status:** ⏳ To Be Implemented

---

#### CSV Export
**Endpoint:** `GET /api/organizations/{id}/reports/export`

**Query Parameters:**
- `format` = `'csv'`
- `fields` - Comma-separated list of fields to include
- `stage_id` - Optional filter

**Response:**
- CSV file download

**Status:** ⏳ To Be Implemented

---

## 12. SYSTEM ADMINISTRATION

### 12.1 Admin Panel Access
**Route:** `/admin/*`
**Required Role:** System Administrator (`role = 'admin'`)

**Status:** ✅ Partially Implemented (Admin routes exist)

---

### 12.2 Global User Management

#### List All Users
**Endpoint:** `GET /api/admin/users`

**Status:** ✅ Implemented

---

#### Update User
**Endpoint:** `PUT /api/admin/users/{id}`

**Can update:**
- Email
- Full name
- Role (platform-level)
- Active status

**Status:** ✅ Implemented

---

### 12.3 Global Configuration

#### Default Lead Fields
**Endpoint:** `GET /api/admin/lead-fields`
**Endpoint:** `POST /api/admin/lead-fields` - Create default field
**Endpoint:** `PUT /api/admin/lead-fields/{id}` - Update default field

**Status:** ⏳ To Be Implemented

---

#### Default Lead Stages
**Endpoint:** `GET /api/admin/lead-stages`
**Endpoint:** `POST /api/admin/lead-stages` - Create default stage
**Endpoint:** `PUT /api/admin/lead-stages/{id}` - Update default stage

**Status:** ⏳ To Be Implemented

---

#### Platform Settings
**Endpoint:** `GET /api/admin/settings`
**Endpoint:** `PUT /api/admin/settings`

**Settings:**
- `allow_public_registration` (Boolean)

**Status:** ✅ Partially Implemented

---

## 13. API SPECIFICATIONS

### 13.1 Authentication
- All authenticated endpoints require session cookie
- Public endpoints: `/api/public/*`
- Admin endpoints: `/api/admin/*` (require `role = 'admin'`)

### 13.2 Organization Context
- Most endpoints require organization context
- Organization ID from session or explicit parameter
- Data scoped to organization

### 13.3 Error Responses
**Standard Error Format:**
```json
{
  "detail": "Error message"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## 14. FRONTEND PAGES & COMPONENTS

### 14.1 Authentication Pages
- `/login` - Login page ✅ Implemented
- `/register` - Registration page ✅ Implemented
- `/verify-email` - Email verification page ✅ Implemented

---

### 14.2 Dashboard
- `/dashboard` - Main dashboard (organization context) ✅ Implemented (Basic)

---

### 14.3 Lead Management Pages
- `/leads` - Lead list page ✅ Implemented
- `/leads/[id]` - Lead details page ✅ Implemented

**Lead List Features:** ✅ All Implemented
- Collapsed rows showing: Name, Email, Stage (Hebrew labels)
- Multi-select filters by stage
- Full-text search across all fields (debounced)
- Create new lead modal with form
- Pagination (50 leads per page, Previous/Next buttons)
- RTL layout with Hebrew UI

**Lead Details Features:** ✅ All Implemented
- Full lead data display with all 130+ fields organized in 12 collapsible sections
- Hebrew field labels for all fields
- Inline editing for all fields (click to edit, save/cancel)
- Horizontal stage progression timeline (responsive, shows history)
- Stage change dropdown with confirmation
- User assignment dropdown
- Delete lead button with confirmation
- Related documents section with list of all documents for the lead
  - Shows document title, status, created date
  - "View" button to navigate to document page
  - "Create New Document" button opens template selection modal
- Document creation modal (`CreateDocumentModal` component)
  - Lists all available templates for organization
  - Template selection with visual feedback
  - Automatic document generation with merged lead data
  - Redirects to document view page after creation
  - Documents list refreshes automatically
- RTL layout with Hebrew UI
- Responsive design (mobile and desktop)

---

### 14.4 Template Management Pages
- `/templates` - Template list page ✅ Implemented
- `/templates/[id]/edit` - Template editor page ✅ Implemented

**Template List Features:** ✅ Implemented
- List all templates for current organization
- Search functionality (filters by name/description)
- "Create New Template" button
- Actions per template: Edit, Duplicate, Delete
- Loading and error states
- Hebrew UI with RTL layout

**Template Editor Features:** ✅ Implemented
- Full-page Google Docs-style editor
- Rich text editing with comprehensive toolbar
- Merge fields panel for inserting lead data placeholders
- Signature block placement and positioning
- Auto-save indication (unsaved changes warning)
- Template name editing inline
- Save/Cancel buttons
- Automatic page breaks (A4 layout)
- Multi-page document support

---

### 14.5 Document Pages
- `/documents/[id]` - Document view page ✅ Implemented
- `/documents/[id]/sign` - Internal signing page ✅ Implemented

**Document View Page Features:** ✅ Implemented
- Display rendered document content with merged lead data
- Show document metadata (title, status, created date, created by)
- Display signature blocks positioned on document (via overlay)
- Signature status display (client signed, internal signed, both)
- List of signing links with status (active, used, expired)
- "Send Signing Link" button with modal for creating new signing links
- "Sign Document" button for internal signing (if not already signed internally)
- Delete document button with confirmation
- Link to related lead
- Link to template source
- Success/error notifications
- RTL layout with Hebrew UI
- Responsive design

**Internal Signing Page Features:** ✅ Implemented
- Display document content
- Signature canvas component for capturing signature
- Form fields: signer name (pre-filled from user), signature capture
- Submit signature button
- Automatic document status update
- Automatic lead stage advancement
- Success confirmation after signing
- Redirect to document view page after successful signing

---

### 14.6 Public Pages
- `/public/sign/[token]` - Public signing page ✅ Implemented
- `/public/form/[token]` - Public form submission page ⏳ To Be Implemented

**Public Signing Page Features:** ✅ Implemented
- Token-based access (no authentication required)
- Token validation (checks expiration, usage status)
- Display document title and rendered content
- Signature blocks positioned on document (via overlay)
- Signature canvas component for capturing handwritten signature
- Form fields: signer name (required), signer email (pre-filled if available from link)
- Submit signature button
- Loading states during submission
- Error handling (expired link, already used, invalid token)
- Success confirmation page after signing
- Automatic document status update to 'signed_by_client'
- Automatic lead stage advancement to "חתום על ידי לקוח"
- RTL layout with Hebrew UI

---

### 14.7 Forms Management Pages
- `/forms` - Form list page ⏳ To Be Implemented
- `/forms/[id]` - Form builder/editor page ⏳ To Be Implemented

---

### 14.8 Reports Page
- `/reports` - Reports dashboard ⏳ To Be Implemented

**Features:**
- Leads by stage chart
- Completion statistics
- CSV export button

---

### 14.9 Settings Pages
- `/settings` - Organization settings ⏳ To Be Implemented
- `/user-settings` - User profile settings ✅ Implemented
- `/admin/settings` - System admin settings ✅ Implemented (Basic)
- `/admin/users` - User management ✅ Implemented

---

### 14.10 Organization Management Pages
- `/organizations` - Organization list/switch ⏳ To Be Implemented
- `/organizations/[id]` - Organization details ⏳ To Be Implemented
- `/organizations/[id]/members` - Member management ⏳ To Be Implemented

---

## 15. SECURITY & COMPLIANCE

### 15.1 Authentication Security
- Password hashing: bcrypt
- Session tokens: HMAC-signed
- Email verification required for login
- Session expiration (to be configured)

**Status:** ✅ Implemented (Basic)

---

### 15.2 Authorization
- Organization-scoped data access
- Role-based permissions
- Admin-only endpoints protected

**Status:** ⏳ To Be Implemented (Full permission system)

---

### 15.3 Data Privacy
- Personal organization isolation
- Multi-tenant data separation
- Signing link tokens (unguessable)
- IP address and user agent logging for signatures

**Status:** ⏳ To Be Implemented

---

### 15.4 Input Validation
- Pydantic models for request validation
- HTML escaping in rendered documents
- SQL injection protection (SQLAlchemy ORM)
- XSS prevention

**Status:** ⏳ To Be Implemented (For new features)

---

## 16. NON-GOALS (Explicitly Excluded from MVP)

### 16.1 Advanced PDF Features
- **NOT INCLUDED:** Full PDF editing and layout tools
- **REASON:** MVP focuses on HTML-based document generation

### 16.2 Legal Compliance Certifications
- **NOT INCLUDED:** Qualified electronic signatures or legal compliance certification
- **REASON:** MVP provides basic signing functionality, legal compliance handled separately

### 16.3 Complex Approval Workflows
- **NOT INCLUDED:** Multi-step approval chains beyond sequential signing
- **REASON:** MVP supports simple sequential signing (client → internal)

### 16.4 Payment Processing
- **NOT INCLUDED:** Payment collection or billing integration
- **REASON:** Outside MVP scope

### 16.5 Advanced Document Features
- **NOT INCLUDED:** PDF manipulation, complex layouts, digital certificates
- **REASON:** MVP focuses on template-based HTML documents

---

## IMPLEMENTATION STATUS LEGEND

- ✅ **Implemented** - Feature is complete and functional
- ⏳ **To Be Implemented** - Feature is planned but not yet built
- 🔄 **In Progress** - Feature is currently being developed
- ❌ **Blocked** - Feature is blocked by dependencies or issues

---

**Document Version:** 1.4  
**Last Updated:** January 2026  
**Latest Changes:**
- Phase 3.5: Built signature capture component (`SignatureCanvas`) with mouse/touch support, Base64 PNG conversion
- Phase 3.6: Created signing API endpoints (public and internal)
  - `POST /api/public/sign/{token}/sign` - Public client signature submission
  - `POST /api/documents/{id}/sign` - Internal authenticated signature submission
  - Document status auto-updates based on signer type
  - Lead stage auto-advances on signature (client → order 4, internal → order 5, completed → order 6)
- Phase 3.7: Built document view page (`/documents/[id]`)
  - Displays rendered document content with merged lead data
  - Shows signature status and signing links
  - "Send Signing Link" modal for creating client signing links
  - Internal signing capability
- Phase 3.8: Created signing pages (public and internal)
  - `/public/sign/[token]` - Public signing page with token validation
  - `/documents/[id]/sign` - Internal signing page (authenticated)
  - Both pages integrate `SignatureCanvas` component
  - Success/confirmation screens after signing
- Added document creation workflow from Lead Details page
  - `CreateDocumentModal` component for template selection
  - "צור מסמך חדש" button on lead page
  - Automatic redirect to document page after creation
  - Documents list integration on lead page
- Phase 3.1-3.4: Previous phases (Document models, generation service, API endpoints, signing links)
- Phase 2 Complete: Google Docs-style template editor with multi-page A4 layout, merge fields, signature overlay, RTL support

