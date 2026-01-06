# MASTER PLAN - CRM + Document Signing MVP

**Last Updated:** [To be updated during implementation]  
**Status:** Planning Phase

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
- `form_submission_id` (Integer, Foreign Key, Optional) - If created from form
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Relationships:**
- Many-to-one with Organization
- Many-to-one with LeadStage
- Many-to-one with User (assigned, creator)
- One-to-many with LeadFieldValues
- One-to-many with Documents

**Custom Fields:**
- Dynamic field values stored in LeadFieldValue table (key-value pairs)

**Status:** ⏳ To Be Implemented

---

### 3.5 LeadFieldValue Model
**Properties:**
- `id` (Integer, Primary Key)
- `lead_id` (Integer, Foreign Key)
- `field_key` (String) - e.g., `'full_name'`, `'address'`, `'client_id'`
- `field_value` (Text) - Stored as string, type inferred from field definition
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Constraints:**
- Unique constraint on (lead_id, field_key)

**Status:** ⏳ To Be Implemented

---

### 3.6 LeadStage Model
**Properties:**
- `id` (Integer, Primary Key)
- `organization_id` (Integer, Foreign Key, Nullable) - NULL = global/system default
- `name` (String) - e.g., `'New Lead'`, `'Documents Prepared'`
- `order` (Integer) - Display order
- `color` (String, Optional) - UI color code
- `is_default` (Boolean) - First stage for new leads
- `is_archived` (Boolean) - Archived stage (read-only)
- `created_at` (DateTime)

**Default Stages:**
1. New Lead (order: 1)
2. Documents Prepared (order: 2)
3. Signing Link Sent (order: 3)
4. Signed by Client (order: 4)
5. Signed by Internal (order: 5)
6. Completed (order: 6)
7. Archived (order: 7)

**Status:** ⏳ To Be Implemented

---

### 3.7 LeadFieldDefinition Model
**Properties:**
- `id` (Integer, Primary Key)
- `organization_id` (Integer, Foreign Key, Nullable) - NULL = global/system default
- `key` (String) - Unique identifier: `'full_name'`, `'email'`, `'address'`, etc.
- `label` (String) - Display name: `'Full Name'`, `'Email Address'`
- `type` (String) - `'text'`, `'email'`, `'phone'`, `'date'`, `'number'`, `'textarea'`
- `required` (Boolean)
- `is_default` (Boolean) - Pre-defined system fields
- `order` (Integer) - Display order
- `created_at` (DateTime)

**Default Fields:**
- `full_name` (text, required)
- `email` (email, optional)
- `phone` (phone, optional)
- `address` (textarea, optional)
- `client_id` (text, optional) - Government ID number
- `notes` (textarea, optional)

**Status:** ⏳ To Be Implemented

---

### 3.8 DocumentTemplate Model
**Properties:**
- `id` (Integer, Primary Key)
- `organization_id` (Integer, Foreign Key) - **Required**
- `name` (String)
- `description` (Text, Optional)
- `content` (Text) - Rich text HTML with merge fields
- `created_by_user_id` (Integer, Foreign Key)
- `created_at` (DateTime)
- `updated_at` (DateTime)
- `is_active` (Boolean) - Soft delete

**Merge Field Syntax:**
- `{{lead.full_name}}` - Lead's full name
- `{{lead.email}}` - Lead's email
- `{{lead.address}}` - Lead's address
- `{{lead.<field_key>}}` - Any custom lead field

**Signature Placeholders:**
- `{{signature.client}}` - Client signature block
- `{{signature.internal}}` - Internal (lawyer) signature block

**Relationships:**
- Many-to-one with Organization
- One-to-many with Documents

**Status:** ⏳ To Be Implemented

---

### 3.9 Document Model
**Properties:**
- `id` (Integer, Primary Key)
- `organization_id` (Integer, Foreign Key) - **Required**
- `lead_id` (Integer, Foreign Key) - **Required**
- `template_id` (Integer, Foreign Key) - Original template
- `title` (String) - Generated from template name + lead info
- `rendered_content` (Text) - HTML with merged data (no placeholders)
- `status` (String) - `'draft'`, `'sent'`, `'signed_by_client'`, `'signed_by_internal'`, `'completed'`, `'expired'`
- `created_by_user_id` (Integer, Foreign Key)
- `created_at` (DateTime)
- `updated_at` (DateTime)
- `completed_at` (DateTime, Optional)

**Relationships:**
- Many-to-one with Organization, Lead, DocumentTemplate
- One-to-many with DocumentSignatures
- One-to-many with SigningLinks

**Status:** ⏳ To Be Implemented

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

**Status:** ⏳ To Be Implemented

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

**Status:** ⏳ To Be Implemented

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
  "fields": {
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "address": "123 Main St"
  },
  "stage_id": 1,  // Optional, defaults to first stage
  "assigned_user_id": 2  // Optional
}
```

**Status:** ⏳ To Be Implemented

---

#### List Leads
**Endpoint:** `GET /api/leads`

**Query Parameters:**
- `stage_id` (Optional) - Filter by stage
- `assigned_user_id` (Optional) - Filter by assigned user
- `search` (Optional) - Search in lead fields
- `page` (Optional) - Pagination
- `limit` (Optional) - Items per page

**Response:**
```json
{
  "leads": [
    {
      "id": 1,
      "fields": {
        "full_name": "John Doe",
        "email": "john@example.com"
      },
      "stage": {
        "id": 1,
        "name": "New Lead"
      },
      "assigned_user": {
        "id": 2,
        "full_name": "Jane Lawyer"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

**Status:** ⏳ To Be Implemented (Placeholder exists)

---

#### Get Lead Details
**Endpoint:** `GET /api/leads/{id}`

**Response:**
- Full lead data
- All field values
- Current stage
- Stage history (timeline)
- Related documents
- Document signing status

**Status:** ⏳ To Be Implemented

---

#### Update Lead
**Endpoint:** `PUT /api/leads/{id}`

**Request:**
```json
{
  "fields": {
    "full_name": "John Doe Updated"
  },
  "stage_id": 2,
  "assigned_user_id": 3
}
```

**Status:** ⏳ To Be Implemented

---

#### Delete Lead
**Endpoint:** `DELETE /api/leads/{id}`

**Status:** ⏳ To Be Implemented

---

### 6.2 Lead Stages (Pipeline)

#### List Stages
**Endpoint:** `GET /api/organizations/{id}/stages`

**Response:**
- Organization-specific stages (if configured)
- Falls back to system default stages

**Status:** ⏳ To Be Implemented

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

**Status:** ⏳ To Be Implemented

---

#### Create Template
**Endpoint:** `POST /api/organizations/{id}/templates`

**Request:**
```json
{
  "name": "Real Estate Purchase Agreement",
  "description": "Standard purchase agreement template",
  "content": "<h1>Purchase Agreement</h1><p>This agreement is between {{lead.full_name}} and...</p>{{signature.client}}{{signature.internal}}"
}
```

**Status:** ⏳ To Be Implemented

---

#### Update Template
**Endpoint:** `PUT /api/templates/{id}`

**Status:** ⏳ To Be Implemented

---

#### Delete Template
**Endpoint:** `DELETE /api/templates/{id}`

**Status:** ⏳ To Be Implemented

---

### 7.2 Template Editor Features

**Rich Text Editor:**
- Bold, italic, underline
- Headings, paragraphs, lists
- Basic formatting

**Merge Fields:**
- Drag-and-drop interface
- Available lead fields displayed as pills
- Insertion syntax: `{{lead.<field_key>}}`

**Signature Blocks:**
- `{{signature.client}}` - Client signature placeholder
- `{{signature.internal}}` - Internal lawyer signature placeholder

**Status:** ⏳ To Be Implemented

---

## 8. DOCUMENT GENERATION

### 8.1 Generate Document from Template

#### Create Document
**Endpoint:** `POST /api/leads/{lead_id}/documents`

**Request:**
```json
{
  "template_id": 5
}
```

**Process:**
1. Fetch template content
2. Fetch lead field values
3. Replace merge fields: `{{lead.full_name}}` → actual value
4. Preserve signature placeholders
5. Generate rendered HTML
6. Create Document record with `status = 'draft'`

**Response:**
```json
{
  "id": 10,
  "title": "Real Estate Purchase Agreement - John Doe",
  "rendered_content": "<h1>Purchase Agreement</h1><p>This agreement is between John Doe and...</p>{{signature.client}}{{signature.internal}}",
  "status": "draft",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Status:** ⏳ To Be Implemented

---

### 8.2 Document Rendering Logic

**Merge Field Replacement:**
- Pattern: `{{lead.<field_key>}}`
- Lookup in LeadFieldValue table
- Replace with actual value or empty string
- HTML escape values to prevent XSS

**Signature Placeholder Handling:**
- `{{signature.client}}` → Rendered as signature block UI (when viewing)
- `{{signature.internal}}` → Rendered as signature block UI (when viewing)

**Status:** ⏳ To Be Implemented

---

## 9. ELECTRONIC SIGNING

### 9.1 Signing Flow

#### Typical Flow:
1. Document generated from template
2. User creates signing link for client: `POST /api/documents/{id}/signing-links`
3. Client receives public link: `GET /api/public/sign/{token}`
4. Client signs document: `POST /api/public/sign/{token}/sign`
5. Document status updates: `'signed_by_client'`
6. Internal user signs: `POST /api/documents/{id}/sign` (authenticated)
7. Document status updates: `'completed'`
8. Lead stage may auto-advance (if configured)

---

### 9.2 Create Signing Link

#### For Client (Public Link)
**Endpoint:** `POST /api/documents/{id}/signing-links`

**Request:**
```json
{
  "signer_type": "client",
  "intended_signer_email": "client@example.com",
  "expires_at": "2024-12-31T23:59:59Z"  // Optional
}
```

**Response:**
```json
{
  "id": 20,
  "token": "abc123xyz789",
  "public_url": "https://app.example.com/public/sign/abc123xyz789",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

**Status:** ⏳ To Be Implemented

---

#### For Internal User (Authenticated)
**Endpoint:** `POST /api/documents/{id}/sign`

**Request:**
```json
{
  "signer_type": "internal",
  "signature_data": "data:image/png;base64,iVBORw0KG..."  // Base64 signature image
}
```

**Status:** ⏳ To Be Implemented

---

### 9.3 Public Signing Page

**Endpoint:** `GET /api/public/sign/{token}`

**Response:**
- Document details (read-only)
- Signing interface
- Signature canvas/input

**Status:** ⏳ To Be Implemented

---

### 9.4 Submit Signature (Public)

**Endpoint:** `POST /api/public/sign/{token}/sign`

**Request:**
```json
{
  "signer_name": "John Doe",
  "signer_email": "john@example.com",
  "signature_data": "data:image/png;base64,iVBORw0KG..."
}
```

**Process:**
1. Validate token and expiration
2. Check if link already used
3. Create DocumentSignature record
4. Update document status
5. Mark signing link as used
6. Optionally trigger stage advancement

**Status:** ⏳ To Be Implemented

---

### 9.5 Signature Storage

**Signature Data Format:**
- Base64-encoded PNG image
- Or JSON with vector data (for future vector signature support)

**Audit Trail:**
- Timestamp
- IP address
- User agent
- Signer identity (name, email, or user_id)

**Status:** ⏳ To Be Implemented

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
- `/leads` - Lead list page ⏳ To Be Implemented
- `/leads/[id]` - Lead details page ⏳ To Be Implemented

**Lead List Features:**
- Collapsed rows with key information
- Filters (stage, assigned user)
- Search
- Create new lead button
- Pagination

**Lead Details Features:**
- Full lead data display
- Stage progression timeline
- Related documents list
- Document signing status
- Assign/unassign user
- Generate document button
- Send signing link button
- Manual stage change

---

### 14.4 Template Management Pages
- `/templates` - Template list page ⏳ To Be Implemented
- `/templates/[id]` - Template editor page ⏳ To Be Implemented

**Template Editor Features:**
- Rich text editor
- Merge field pills (drag-and-drop)
- Signature block insertion
- Preview mode
- Save/Cancel buttons

---

### 14.5 Document Pages
- `/documents/[id]` - Document view page ⏳ To Be Implemented
- `/documents/[id]/sign` - Internal signing page ⏳ To Be Implemented

---

### 14.6 Public Pages
- `/public/sign/[token]` - Public signing page ⏳ To Be Implemented
- `/public/form/[token]` - Public form submission page ⏳ To Be Implemented

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

**Document Version:** 1.0  
**Last Updated:** [Initial creation]  
**Next Review:** [After first implementation sprint]

