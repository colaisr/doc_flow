# PLAN OF WORK - CRM + Document Signing MVP

**Project Start Date:** [To be filled]  
**Last Updated:** [To be updated during implementation]  
**Current Phase:** Planning & Discussion

---

## PROJECT OVERVIEW

This document serves as our working plan to discuss, plan, and track the step-by-step implementation of the CRM + Document Signing MVP system. We will update this document as we progress through implementation phases.

---

## IMPLEMENTATION PHASES

### Phase 0: Foundation & Setup ✅
**Status:** COMPLETED

**Tasks:**
- [x] User authentication system (login, register, email verification)
- [x] Organization and membership models
- [x] Basic admin functionality
- [x] Frontend structure (Next.js with TailwindCSS)
- [x] Backend structure (FastAPI)
- [x] Database setup (SQLite dev / MySQL prod)

**Current State:**
- Users can register, verify email, and log in
- Organizations can be created and managed
- Basic admin panel exists
- Session-based authentication works
- Organization context is stored in session

---

### Phase 1: CRM Foundation - Leads & Stages
**Status:** PLANNING

**Goal:** Build the core CRM functionality for managing leads through a pipeline.

#### 1.1 Database Models
**Tasks:**
- [ ] Create `Lead` model with fixed columns (comprehensive field list provided - see notes below)
- [ ] Create `LeadStage` model (pipeline stages)
- [ ] Create Alembic migration
- [ ] Seed default stages (New Lead, Documents Prepared, etc.)

**Notes:**
- Comprehensive field list provided (Hebrew labels for real estate property law cases - 80+ fields)
- Fields include: basic info (Name, ID, Phone, Address, Email), transaction details (Area, Price, Fees), dates, statuses, document links, integration IDs, triggers, and more
- **Decision:** ✅ All fields must be implemented in Phase 1
- **IMPORTANT:** Application is in Hebrew - UI must support RTL (right-to-left) layout and Hebrew text
- **UI Requirements:** 
  - Translate current UI to Hebrew
  - Menu/navigation on the right side (RTL layout)
  - All labels, buttons, messages in Hebrew
  - Keep Hebrew/RTL support in mind throughout all implementation phases

**Decisions Made:**
- ✅ **Lead fields:** Fixed columns on Lead table (all organizations use same fields - no custom fields per org)
- ✅ **Field validation:** Mixed approach - strict validation for email/phone/date fields, loose (text only) for text fields
- ✅ **Stage management:** All organizations use the same global default stages (no customization, no adding/modifying/deleting stages per org)

#### 1.2 Backend API - Lead Management
**Tasks:**
- [ ] `POST /api/leads` - Create lead (manual entry)
- [ ] `GET /api/leads` - List leads (with filters, search, pagination)
- [ ] `GET /api/leads/{id}` - Get lead details
- [ ] `PUT /api/leads/{id}` - Update lead (fields, stage, assignment)
- [ ] `DELETE /api/leads/{id}` - Delete lead (soft delete?)

**Decisions Made:**
- ✅ **Pagination:** Offset-based (`?page=1&limit=50` - default 50 leads per page)
- ✅ **Search:** Full-text search across all field values (single query searches all text fields)
- ✅ **Lead deletion:** Soft delete (add `deleted_at` timestamp, preserve data in database)
- ✅ **Stage advancement:** Automatic - leads move to next stage automatically based on events (e.g., document signing events)
- ✅ **Field validation:** Enforce required fields - some fields marked as required (e.g., Name), validation prevents saving without them

#### 1.3 Backend API - Stage Management
**Tasks:**
- [ ] `GET /api/stages` - List all global stages (simple read-only endpoint)
- [ ] Seed default stages in database migration (New Lead, Documents Prepared, Signing Link Sent, Signed by Client, Signed by Internal, Completed, Archived)

**Note:** Stages are global and read-only - no customization per organization. Only system admins can modify stages via admin panel (future enhancement).

#### 1.4 Backend API - Field Definitions
**Status:** NOT NEEDED - Using fixed columns, no custom fields per organization

**Note:** Field definitions/validation will be handled in the Lead model itself (Pydantic schemas and database constraints).

#### 1.5 Frontend - Lead List Page
**Tasks:**
- [ ] Translate UI to Hebrew (all labels, buttons, messages)
- [ ] Implement RTL layout support (menu on right, text direction RTL)
- [ ] Create `/leads` page
- [ ] Build lead list component (collapsed rows)
- [ ] Implement filters (stage, assigned user)
- [ ] Implement search functionality
- [ ] Implement pagination
- [ ] Add "Create Lead" button and modal/form

**Decisions Made:**
- ✅ **Collapsed rows display:** Name, Email, and Stage only
- ✅ **Leads per page:** 50 (default)
- ✅ **Filter UI:** Multi-select dropdowns (can select multiple stages/users at once)

#### 1.6 Frontend - Lead Details Page
**Tasks:**
- [ ] Create `/leads/[id]` page (Hebrew UI, RTL layout)
- [ ] Display all lead fields (editable) - all 80+ fields with Hebrew labels
- [ ] Stage progression timeline/history
- [ ] Related documents section (placeholder for Phase 2)
- [ ] Assign/unassign user dropdown
- [ ] Manual stage change dropdown
- [ ] Save/Cancel buttons (Hebrew labels)

**Decisions Made:**
- ✅ **Field editing:** Inline editing (click field and edit directly in place)
- ✅ **Timeline visualization:** Horizontal timeline (stage progression displayed horizontally)

**Estimated Duration:** 2-3 weeks

---

### Phase 2: Document Templates
**Status:** NOT STARTED

**Goal:** Build document template system with rich text editor and merge fields.

#### 2.1 Database Models
**Tasks:**
- [ ] Create `DocumentTemplate` model
- [ ] Create Alembic migration

**Discussion Points:**
- Template content storage: HTML, Markdown, or both?
- How to handle versioning? (MVP: simple update, no version history)

#### 2.2 Template Editor - Rich Text
**Tasks:**
- [ ] Choose/implement rich text editor library (e.g., TipTap, Quill, or Draft.js)
- [ ] Basic formatting (bold, italic, headings, lists)
- [ ] Save template content as HTML

**Discussion Points:**
- Which editor provides best balance of features vs complexity?
- Do we need advanced formatting (tables, images, etc.) in MVP?

#### 2.3 Merge Fields System
**Tasks:**
- [ ] Build merge field detection (regex: `{{lead.<field_key>}}`)
- [ ] Create UI component for available fields (drag-and-drop pills)
- [ ] Insert merge fields into editor at cursor position
- [ ] Visual indication of merge fields in editor

**Discussion Points:**
- Should merge fields be editable in rendered view or only in template?
- How to handle invalid/removed fields (show placeholder or empty)?

#### 2.4 Signature Blocks
**Tasks:**
- [ ] Define signature placeholder syntax (`{{signature.client}}`, `{{signature.internal}}`)
- [ ] Create UI component to insert signature blocks
- [ ] Validate signature blocks in template

**Discussion Points:**
- Should signature blocks be visible in editor or show as placeholders?

#### 2.5 Backend API - Templates
**Tasks:**
- [ ] `GET /api/organizations/{id}/templates` - List templates
- [ ] `POST /api/organizations/{id}/templates` - Create template
- [ ] `GET /api/templates/{id}` - Get template
- [ ] `PUT /api/templates/{id}` - Update template
- [ ] `DELETE /api/templates/{id}` - Delete template (soft delete)

#### 2.6 Frontend - Template Management
**Tasks:**
- [ ] Create `/templates` page (list view)
- [ ] Create `/templates/[id]` page (editor)
- [ ] Template editor with rich text + merge fields
- [ ] Preview mode (shows merged example)
- [ ] Save/Cancel functionality

**Estimated Duration:** 2-3 weeks

---

### Phase 3: Document Generation & Signing
**Status:** NOT STARTED

**Goal:** Generate documents from templates and enable electronic signing.

#### 3.1 Database Models
**Tasks:**
- [ ] Create `Document` model
- [ ] Create `DocumentSignature` model
- [ ] Create `SigningLink` model
- [ ] Create Alembic migrations

**Discussion Points:**
- Signature storage: Base64 image, vector data, or both?
- Should we store rendered HTML or regenerate on demand? (Current plan: store for audit)

#### 3.2 Document Generation Logic
**Tasks:**
- [ ] Build merge field replacement engine
- [ ] Fetch lead field values
- [ ] Replace `{{lead.<field_key>}}` with actual values
- [ ] HTML escape values (XSS prevention)
- [ ] Preserve signature placeholders
- [ ] Store rendered document

**Discussion Points:**
- Error handling for missing fields (show placeholder or empty string)?
- Should we validate all merge fields before generation?

#### 3.3 Backend API - Document Generation
**Tasks:**
- [ ] `POST /api/leads/{lead_id}/documents` - Generate document from template
- [ ] `GET /api/documents/{id}` - Get document details
- [ ] `GET /api/documents/{id}/rendered` - Get rendered HTML (for viewing)

**Discussion Points:**
- Should generation be synchronous or async? (MVP: synchronous)

#### 3.4 Signing Link System
**Tasks:**
- [ ] Generate secure tokens for signing links
- [ ] `POST /api/documents/{id}/signing-links` - Create signing link
- [ ] Token validation and expiration handling
- [ ] Mark links as used after signing

**Discussion Points:**
- Token format (UUID, random string, JWT)?
- Default expiration period?

#### 3.5 Signature Capture
**Tasks:**
- [ ] Choose signature capture library (e.g., react-signature-canvas, signature_pad)
- [ ] Build signature canvas component
- [ ] Convert signature to Base64 image
- [ ] Store signature in database

**Discussion Points:**
- Signature input method: mouse, touch, or both?
- Should we support typed signatures as fallback?

#### 3.6 Backend API - Signing
**Tasks:**
- [ ] `GET /api/public/sign/{token}` - Public signing page data
- [ ] `POST /api/public/sign/{token}/sign` - Submit client signature
- [ ] `POST /api/documents/{id}/sign` - Submit internal signature (authenticated)
- [ ] Update document status based on signatures
- [ ] Auto-advance lead stage (if configured)

**Discussion Points:**
- Should stage advancement be automatic or manual?
- How to handle signature order (enforce sequence)?

#### 3.7 Frontend - Document View
**Tasks:**
- [ ] Create `/documents/[id]` page
- [ ] Display rendered document
- [ ] Show signature status for each signer
- [ ] "Send Signing Link" button (opens modal)
- [ ] Generate signing link functionality

#### 3.8 Frontend - Signing Pages
**Tasks:**
- [ ] Create `/documents/[id]/sign` - Internal signing page
- [ ] Create `/public/sign/[token]` - Public signing page
- [ ] Signature canvas component
- [ ] Submit signature functionality
- [ ] Success/confirmation screen

**Estimated Duration:** 3-4 weeks

---

### Phase 4: Lead Intake Forms
**Status:** NOT STARTED

**Goal:** Allow organizations to create public forms that automatically create leads.

#### 4.1 Database Models
**Tasks:**
- [ ] Create `LeadIntakeForm` model
- [ ] Create `FormSubmission` model
- [ ] Create Alembic migrations

**Discussion Points:**
- Form fields config: JSON column or separate table? (Current plan: JSON for MVP simplicity)

#### 4.2 Form Builder
**Tasks:**
- [ ] Form builder UI (add/remove fields, configure field types)
- [ ] Field configuration (label, type, required, validation)
- [ ] Preview form
- [ ] Generate public URL token

**Discussion Points:**
- Should form builder be visual drag-and-drop or simple list?
- Which field types to support in MVP (text, email, phone, textarea, date)?

#### 4.3 Backend API - Forms
**Tasks:**
- [ ] `GET /api/organizations/{id}/forms` - List forms
- [ ] `POST /api/organizations/{id}/forms` - Create form
- [ ] `GET /api/organizations/{id}/forms/{id}` - Get form
- [ ] `PUT /api/organizations/{id}/forms/{id}` - Update form
- [ ] `DELETE /api/organizations/{id}/forms/{id}` - Delete form
- [ ] `GET /api/public/form/{token}` - Get public form
- [ ] `POST /api/public/form/{token}/submit` - Submit form

#### 4.4 Form Submission Logic
**Tasks:**
- [ ] Validate form submission data
- [ ] Create FormSubmission record
- [ ] Create Lead from submission data
- [ ] Auto-assign to configured user (if set)
- [ ] Set default stage (if configured)
- [ ] Send notification (optional, future enhancement)

**Discussion Points:**
- Should form submissions be stored even if lead creation fails?
- Email notifications in MVP or Phase 5?

#### 4.5 Frontend - Form Management
**Tasks:**
- [ ] Create `/forms` page (list view)
- [ ] Create `/forms/[id]` page (form builder)
- [ ] Form builder interface
- [ ] Public URL display and copy button
- [ ] Embed code generation (iframe)

#### 4.6 Frontend - Public Form
**Tasks:**
- [ ] Create `/public/form/[token]` page
- [ ] Dynamic form rendering from config
- [ ] Form validation
- [ ] Submit form functionality
- [ ] Success/thank you page

**Estimated Duration:** 2-3 weeks

---

### Phase 5: Reports & Analytics
**Status:** NOT STARTED

**Goal:** Basic reporting and CSV export functionality.

#### 5.1 Backend API - Reports
**Tasks:**
- [ ] `GET /api/organizations/{id}/reports/leads-by-stage` - Leads count per stage
- [ ] `GET /api/organizations/{id}/reports/completion` - Completion statistics
- [ ] `GET /api/organizations/{id}/reports/export` - CSV export

**Discussion Points:**
- What metrics are most valuable for users?
- Date range filtering needed in MVP?

#### 5.2 CSV Export
**Tasks:**
- [ ] Build CSV generation logic
- [ ] Support field selection
- [ ] Support filtering (by stage, date range)
- [ ] Return downloadable file

#### 5.3 Frontend - Reports Page
**Tasks:**
- [ ] Create `/reports` page
- [ ] Leads by stage chart (simple bar or pie chart)
- [ ] Completion statistics display
- [ ] CSV export button
- [ ] Date range selector (optional)

**Discussion Points:**
- Chart library choice (Chart.js, Recharts, or simple HTML/CSS)?
- Real-time updates or refresh button?

**Estimated Duration:** 1 week

---

### Phase 6: System Administration Enhancements
**Status:** NOT STARTED

**Goal:** Complete admin functionality for global configuration.

#### 6.1 Default Lead Fields Management
**Tasks:**
- [ ] `GET /api/admin/lead-fields` - List default fields
- [ ] `POST /api/admin/lead-fields` - Create default field
- [ ] `PUT /api/admin/lead-fields/{id}` - Update default field
- [ ] `DELETE /api/admin/lead-fields/{id}` - Delete default field
- [ ] Admin UI for managing default fields

#### 6.2 Default Lead Stages Management
**Tasks:**
- [ ] `GET /api/admin/lead-stages` - List default stages
- [ ] `POST /api/admin/lead-stages` - Create default stage
- [ ] `PUT /api/admin/lead-stages/{id}` - Update default stage
- [ ] `DELETE /api/admin/lead-stages/{id}` - Delete default stage
- [ ] Admin UI for managing default stages

#### 6.3 Admin UI Updates
**Tasks:**
- [ ] Update `/admin/settings` page
- [ ] Add sections for default fields and stages
- [ ] Improve user management UI

**Estimated Duration:** 1 week

---

### Phase 7: Polish & Testing
**Status:** NOT STARTED

**Goal:** Refine UI/UX, fix bugs, and prepare for production.

#### 7.1 UI/UX Improvements
**Tasks:**
- [ ] Consistent styling across all pages
- [ ] Loading states and spinners
- [ ] Error handling and user-friendly error messages
- [ ] Responsive design testing (mobile, tablet)
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)

#### 7.2 Testing
**Tasks:**
- [ ] Unit tests for critical backend logic
- [ ] Integration tests for API endpoints
- [ ] Frontend component tests (optional for MVP)
- [ ] End-to-end user flow testing
- [ ] Performance testing (large datasets)

#### 7.3 Documentation
**Tasks:**
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User guide/documentation
- [ ] Deployment guide
- [ ] Update MASTER_PLAN.md with completed features

#### 7.4 Security Review
**Tasks:**
- [ ] Security audit (XSS, CSRF, SQL injection)
- [ ] Input validation review
- [ ] Authentication/authorization review
- [ ] Rate limiting (if needed)

**Estimated Duration:** 2 weeks

---

## DISCUSSION TOPICS

### Architecture Decisions Needed

1. **Field Storage Strategy**
   - Option A: Separate `LeadFieldValue` table (current plan)
   - Option B: JSON column on `Lead` table
   - **Decision:** [To be discussed]

2. **Stage Customization**
   - Option A: Organizations can fully customize stages
   - Option B: Organizations inherit global stages but can add custom ones
   - Option C: Only system admins can create stages (organizations select from available)
   - **Decision:** [To be discussed]

3. **Signature Storage Format**
   - Option A: Base64 PNG images only
   - Option B: Vector data (SVG paths)
   - Option C: Both (store in multiple formats)
   - **Decision:** [To be discussed]

4. **Document Rendering**
   - Option A: Store rendered HTML in database
   - Option B: Regenerate on-demand (faster development, slower reads)
   - Option C: Hybrid (cache rendered, regenerate on template update)
   - **Decision:** [To be discussed]

5. **Template Versioning**
   - Include version history in MVP?
   - **Decision:** [No - defer to future iteration]

### Technical Stack Decisions

1. **Rich Text Editor Library**
   - Options: TipTap, Quill, Draft.js, ReactQuill
   - **Decision:** [To be discussed]

2. **Signature Capture Library**
   - Options: react-signature-canvas, signature_pad
   - **Decision:** [To be discussed]

3. **Chart Library (Reports)**
   - Options: Chart.js, Recharts, D3.js, or simple CSS
   - **Decision:** [To be discussed]

---

## TIMELINE ESTIMATE

**Total Estimated Duration:** 12-16 weeks (3-4 months)

- Phase 1: 2-3 weeks
- Phase 2: 2-3 weeks
- Phase 3: 3-4 weeks
- Phase 4: 2-3 weeks
- Phase 5: 1 week
- Phase 6: 1 week
- Phase 7: 2 weeks

**Note:** These are rough estimates and will be refined as we progress. Parallel work on frontend/backend may reduce total time.

---

## PROGRESS TRACKING

### Completed Tasks
- [x] Phase 0: Foundation & Setup

### In Progress
- [ ] Phase 1: CRM Foundation

### Next Up
- [ ] Phase 2: Document Templates

---

## NOTES & DECISIONS LOG

### [Date] - Initial Planning
- Created MASTER_PLAN.md and PLAN_OF_WORK.md
- Defined implementation phases
- Identified discussion topics

### [Date] - [Decision/Note]
- [To be updated as we make decisions]

---

**Document Status:** Active Planning  
**Next Review:** After Phase 1 completion

