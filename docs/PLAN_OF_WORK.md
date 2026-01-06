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

**Step-by-Step Tasks:**

1. **Create LeadStage Model**
   - [x] Create `backend/app/models/lead_stage.py`
   - [x] Define columns: `id`, `name` (String), `order` (Integer), `color` (String, optional), `is_default` (Boolean), `is_archived` (Boolean)
   - [x] Add timestamps: `created_at`, `updated_at`
   - [x] Add `__tablename__ = "lead_stages"`
   - [x] Add relationship to Lead model (one-to-many)
   - [x] Update models `__init__.py` to export LeadStage

2. **Create Lead Model - Core Fields**
   - [x] Create `backend/app/models/lead.py`
   - [x] Define core relationship fields:
     - [x] `id` (Primary Key)
     - [x] `organization_id` (ForeignKey to organizations, required, indexed)
     - [x] `stage_id` (ForeignKey to lead_stages, required, indexed)
     - [x] `assigned_user_id` (ForeignKey to users, optional, indexed)
     - [x] `created_by_user_id` (ForeignKey to users, required)
     - [x] `source` (String: 'manual' or 'form')
     - [x] `deleted_at` (DateTime, nullable - for soft delete)
     - [x] `created_at`, `updated_at` (timestamps)
   - [x] Add relationships: `organization`, `stage`, `assigned_user`, `created_by_user`

3. **Create Lead Model - Basic Info Fields**
   - [x] Add basic information fields:
     - [x] `full_name` (String, required) - Name / שם
     - [x] `client_id` (String, optional) - ת"ז (ID number)
     - [x] `phone` (String, optional) - טלפון
     - [x] `address` (Text, optional) - כתובת מגורים
     - [x] `email` (String, optional) - דוא"ל
     - [x] `birth_date` (Date, optional) - תאריך לידה

4. **Create Lead Model - Transaction Details Fields**
   - [x] Add transaction-related fields (all 13 fields implemented)

5. **Create Lead Model - Document & Status Fields**
   - [x] Add document and status fields (all 16 fields implemented)

6. **Create Lead Model - Date & Deadline Fields**
   - [x] Add date and deadline tracking fields (all 12 fields implemented)

7. **Create Lead Model - Trigger Fields**
   - [x] Add trigger-related fields (all 7 fields implemented)

8. **Create Lead Model - Integration & External ID Fields**
   - [x] Add integration fields (all 7 fields implemented)

9. **Create Lead Model - Document Link Fields**
   - [x] Add document link fields (all 14 fields implemented)

10. **Create Lead Model - User & Assignment Fields**
    - [x] Add user and assignment fields (all 5 fields implemented)

11. **Create Lead Model - Status & Workflow Fields**
    - [x] Add status and workflow fields (all 10 fields implemented)

12. **Create Lead Model - Power of Attorney Fields**
    - [x] Add power of attorney fields (all 2 fields implemented)

13. **Create Lead Model - Collection & Payment Fields**
    - [x] Add collection and payment fields (all 7 fields implemented)

14. **Create Lead Model - Message Reminder Fields**
    - [x] Add message reminder date fields (all 4 fields implemented)

15. **Create Lead Model - Other Fields**
    - [x] Add remaining fields (all 10 fields implemented)

16. **Add Lead Model Relationships**
    - [x] Add relationship to `Organization` (many-to-one)
    - [x] Add relationship to `LeadStage` (many-to-one)
    - [x] Add relationship to `User` for assigned_user (many-to-one, optional)
    - [x] Add relationship to `User` for created_by (many-to-one)

17. **Update Models __init__.py**
    - [x] Import `Lead` model in `backend/app/models/__init__.py`
    - [x] Import `LeadStage` model in `backend/app/models/__init__.py`
    - [x] Add to `__all__` export list

18. **Create LeadStageHistory Model (for timeline)**
    - [x] Create `backend/app/models/lead_stage_history.py`
    - [x] Define columns: `id`, `lead_id` (ForeignKey), `stage_id` (ForeignKey), `changed_by_user_id` (ForeignKey), `changed_at` (DateTime)
    - [x] Add relationships to Lead, LeadStage, User
    - [x] Add relationship from Lead to LeadStageHistory (for timeline queries)
    - [x] Add to models `__init__.py`

19. **Create Alembic Migration**
    - [ ] Generate migration: `alembic revision --autogenerate -m "Add Lead and LeadStage models"`
    - [ ] Review generated migration file
    - [ ] Add data seeding for default stages (see step 20)
    - [ ] Test migration: `alembic upgrade head`

20. **Seed Default Stages in Migration**
    - [ ] Add seed data for 7 default stages:
      - [ ] "New Lead" / "ליד חדש" (order: 1, is_default: True)
      - [ ] "Documents Prepared" / "מסמכים מוכנים" (order: 2)
      - [ ] "Signing Link Sent" / "קישור חתימה נשלח" (order: 3)
      - [ ] "Signed by Client" / "חתום על ידי לקוח" (order: 4)
      - [ ] "Signed by Internal" / "חתום על ידי פנימי" (order: 5)
      - [ ] "Completed" / "הושלם" (order: 6)
      - [ ] "Archived" / "בארכיון" (order: 7, is_archived: True)

**Notes:**
- Comprehensive field list provided (Hebrew labels for real estate property law cases - 80+ fields)
- All fields are optional except: `organization_id`, `stage_id`, `created_by_user_id`, `full_name` (required)
- **Decision:** ✅ All fields must be implemented in Phase 1
- **IMPORTANT:** Application is in Hebrew - UI must support RTL (right-to-left) layout and Hebrew text

**Decisions Made:**
- ✅ **Lead fields:** Fixed columns on Lead table (all organizations use same fields - no custom fields per org)
- ✅ **Field validation:** Mixed approach - strict validation for email/phone/date fields, loose (text only) for text fields
- ✅ **Stage management:** All organizations use the same global default stages (no customization, no adding/modifying/deleting stages per org)

#### 1.2 Backend API - Lead Management

**Step-by-Step Tasks:**

1. **Create Pydantic Schemas for Lead**
   - [ ] Create `backend/app/api/schemas/lead.py` (or add to existing schemas)
   - [ ] Create `LeadCreate` schema (for POST requests)
     - [ ] Include all required fields: `organization_id`, `full_name`, `stage_id` (optional, defaults to first stage)
     - [ ] Include optional fields (all other 80+ fields)
     - [ ] Add validation: email format, phone format, date formats
     - [ ] Mark `full_name` as required
   - [ ] Create `LeadUpdate` schema (for PUT requests)
     - [ ] All fields optional (for partial updates)
     - [ ] Same validation as LeadCreate
   - [ ] Create `LeadResponse` schema (for GET responses)
     - [ ] Include all fields
     - [ ] Include nested objects: `stage`, `assigned_user`, `created_by_user`, `organization`
     - [ ] Format dates as ISO strings

2. **Implement POST /api/leads - Create Lead**
   - [ ] Open `backend/app/api/leads.py`
   - [ ] Create endpoint function `create_lead()`
   - [ ] Add authentication dependency (require logged-in user)
   - [ ] Add organization context dependency
   - [ ] Validate request body with `LeadCreate` schema
   - [ ] Check required fields (`full_name` must be present)
   - [ ] Set `organization_id` from session context
   - [ ] Set `created_by_user_id` from current user
   - [ ] Set `stage_id` to default stage if not provided
   - [ ] Validate email/phone formats if provided
   - [ ] Create Lead instance in database
   - [ ] Create initial LeadStageHistory entry
   - [ ] Return `LeadResponse` with created lead
   - [ ] Add error handling (400 for validation errors, 500 for server errors)

3. **Implement GET /api/leads - List Leads**
   - [ ] Create endpoint function `list_leads()`
   - [ ] Add authentication and organization context dependencies
   - [ ] Add query parameters:
     - [ ] `page` (int, default: 1)
     - [ ] `limit` (int, default: 50, max: 100)
     - [ ] `stage_id` (int, optional, can be multiple - comma-separated or array)
     - [ ] `assigned_user_id` (int, optional, can be multiple)
     - [ ] `search` (string, optional) - full-text search
   - [ ] Build query filtering:
     - [ ] Filter by `organization_id` from context
     - [ ] Filter by `deleted_at IS NULL` (soft delete)
     - [ ] Filter by `stage_id` if provided (support multiple)
     - [ ] Filter by `assigned_user_id` if provided (support multiple)
     - [ ] Add full-text search across all text fields if `search` provided
   - [ ] Add pagination logic (offset = (page - 1) * limit)
   - [ ] Count total results for pagination metadata
   - [ ] Order by `created_at DESC` (newest first)
   - [ ] Return paginated response:
     ```json
     {
       "leads": [...],
       "total": 100,
       "page": 1,
       "limit": 50,
       "total_pages": 2
     }
     ```
   - [ ] Include nested `stage` and `assigned_user` in response

4. **Implement GET /api/leads/{id} - Get Lead Details**
   - [ ] Create endpoint function `get_lead()`
   - [ ] Add authentication and organization context dependencies
   - [ ] Get `lead_id` from path parameter
   - [ ] Query lead by ID and organization_id (security check)
   - [ ] Check soft delete (`deleted_at IS NULL`)
   - [ ] If not found, return 404
   - [ ] Load stage history for timeline
   - [ ] Return `LeadResponse` with full lead data including:
     - [ ] All lead fields
     - [ ] Nested stage object
     - [ ] Nested assigned_user object
     - [ ] Nested created_by_user object
     - [ ] Stage history timeline

5. **Implement PUT /api/leads/{id} - Update Lead**
   - [ ] Create endpoint function `update_lead()`
   - [ ] Add authentication and organization context dependencies
   - [ ] Get `lead_id` from path parameter
   - [ ] Validate request body with `LeadUpdate` schema
   - [ ] Query lead by ID and organization_id (security check)
   - [ ] Check soft delete
   - [ ] If not found, return 404
   - [ ] Check permissions (user must be member of organization)
   - [ ] Update only provided fields (partial update)
   - [ ] If `stage_id` changed, create new LeadStageHistory entry
   - [ ] Validate email/phone if provided
   - [ ] Save changes to database
   - [ ] Return updated `LeadResponse`

6. **Implement DELETE /api/leads/{id} - Soft Delete Lead**
   - [ ] Create endpoint function `delete_lead()`
   - [ ] Add authentication and organization context dependencies
   - [ ] Get `lead_id` from path parameter
   - [ ] Query lead by ID and organization_id
   - [ ] If not found, return 404
   - [ ] Check permissions (org_admin or org_user)
   - [ ] Set `deleted_at = current_timestamp` (soft delete)
   - [ ] Save changes
   - [ ] Return 204 No Content or success message

7. **Add Helper Functions for Lead Service**
   - [ ] Create `backend/app/services/lead.py` (optional, for business logic)
   - [ ] Create `get_lead_by_id()` helper
   - [ ] Create `search_leads()` helper (full-text search logic)
   - [ ] Create `create_stage_history_entry()` helper
   - [ ] Create `validate_lead_data()` helper

8. **Update API Router**
   - [ ] Ensure `leads.py` router is included in `backend/app/main.py`
   - [ ] Verify route prefix is `/api/leads`
   - [ ] Test all endpoints with Postman/curl

**Decisions Made:**
- ✅ **Pagination:** Offset-based (`?page=1&limit=50` - default 50 leads per page)
- ✅ **Search:** Full-text search across all field values (single query searches all text fields)
- ✅ **Lead deletion:** Soft delete (add `deleted_at` timestamp, preserve data in database)
- ✅ **Stage advancement:** Automatic - leads move to next stage automatically based on events (e.g., document signing events)
- ✅ **Field validation:** Enforce required fields - some fields marked as required (e.g., Name), validation prevents saving without them

#### 1.3 Backend API - Stage Management

**Step-by-Step Tasks:**

1. **Create Pydantic Schemas for Stage**
   - [ ] Create `LeadStageResponse` schema in `backend/app/api/schemas/lead.py`
   - [ ] Include fields: `id`, `name`, `order`, `color`, `is_default`, `is_archived`

2. **Implement GET /api/stages - List All Stages**
   - [ ] Create endpoint function `list_stages()` in `backend/app/api/stages.py`
   - [ ] Add authentication dependency (logged-in user)
   - [ ] Query all stages ordered by `order` ASC
   - [ ] Return list of `LeadStageResponse` objects
   - [ ] No filtering needed (all organizations use same stages)

3. **Update API Router**
   - [ ] Create `backend/app/api/stages.py` if it doesn't exist
   - [ ] Include router in `backend/app/main.py` with prefix `/api/stages`

**Note:** Stages are global and read-only - no customization per organization. Only system admins can modify stages via admin panel (future enhancement). Default stages seeded in migration (see 1.1 step 20).

#### 1.4 Backend API - Field Definitions
**Status:** NOT NEEDED - Using fixed columns, no custom fields per organization

**Note:** Field definitions/validation will be handled in the Lead model itself (Pydantic schemas and database constraints).

#### 1.5 Frontend - Lead List Page

**Step-by-Step Tasks:**

1. **Setup Hebrew/RTL Support**
   - [ ] Install/configure i18n library (e.g., next-intl or react-i18next) if not already set up
   - [ ] Create translation files structure (e.g., `frontend/locales/he/` or `frontend/messages/he.json`)
   - [ ] Add Hebrew translations for common UI elements
   - [ ] Configure Next.js for RTL in `next.config.js` or layout
   - [ ] Update root layout to set `dir="rtl"` and `lang="he"`
   - [ ] Update global CSS for RTL support (text-align, padding, margins)
   - [ ] Test RTL rendering with Hebrew text

2. **Update Navigation/Sidebar for RTL**
   - [ ] Move menu/sidebar to the right side
   - [ ] Update navigation component (check `frontend/components/Sidebar.tsx`)
   - [ ] Reverse icon positions and text alignment
   - [ ] Update menu items with Hebrew labels
   - [ ] Test navigation in RTL mode

3. **Create Leads API Client Functions**
   - [ ] Create `frontend/lib/api/leads.ts`
   - [ ] Create `getLeads()` function (with pagination, filters, search params)
   - [ ] Create `getLead(id)` function
   - [ ] Create `createLead(data)` function
   - [ ] Create `updateLead(id, data)` function
   - [ ] Create `deleteLead(id)` function
   - [ ] Create `getStages()` function
   - [ ] Add TypeScript interfaces for Lead, LeadStage, etc.
   - [ ] Handle API errors appropriately

4. **Create Lead List Page Structure**
   - [ ] Create `frontend/app/leads/page.tsx`
   - [ ] Set up page metadata (title in Hebrew)
   - [ ] Create page layout with header
   - [ ] Add "Create Lead" button (Hebrew: "צור ליד חדש")
   - [ ] Add search input field
   - [ ] Add filter section (stages and assigned users)
   - [ ] Add leads table/list area
   - [ ] Add pagination controls

5. **Implement Lead List State Management**
   - [ ] Use React state or SWR/React Query for data fetching
   - [ ] Set up state for: leads list, loading, error, pagination (page, total, limit)
   - [ ] Set up state for filters: selected stages, selected users
   - [ ] Set up state for search query
   - [ ] Implement debounced search (wait for user to stop typing)

6. **Build Lead List Component - Collapsed Rows**
   - [ ] Create `frontend/components/LeadList.tsx` component
   - [ ] Display collapsed rows showing: Name, Email, Stage (Hebrew labels)
   - [ ] Style rows with hover effects
   - [ ] Add click handler to expand/view lead details
   - [ ] Show loading skeleton while fetching
   - [ ] Show empty state when no leads
   - [ ] Make rows responsive for mobile

7. **Implement Multi-Select Filters**
   - [ ] Create `frontend/components/LeadFilters.tsx` component
   - [ ] Implement multi-select dropdown for stages (use library like react-select or custom)
   - [ ] Implement multi-select dropdown for assigned users
   - [ ] Fetch stages on component mount
   - [ ] Fetch organization users for assignment filter
   - [ ] Update parent state when filters change
   - [ ] Show selected filter chips/badges
   - [ ] Add "Clear filters" button

8. **Implement Search Functionality**
   - [ ] Create search input component
   - [ ] Implement debounced search (500ms delay)
   - [ ] Update API call with search parameter
   - [ ] Show search results count
   - [ ] Clear search functionality

9. **Implement Pagination**
   - [ ] Create `frontend/components/LeadPagination.tsx` component
   - [ ] Display page numbers (Hebrew: "עמוד 1 מתוך 5")
   - [ ] Add Previous/Next buttons (Hebrew: "קודם", "הבא")
   - [ ] Calculate total pages from API response
   - [ ] Handle page changes
   - [ ] Show current page and total
   - [ ] Disable buttons at first/last page

10. **Create Lead Form/Modal**
    - [ ] Create `frontend/components/CreateLeadModal.tsx` or use dialog component
    - [ ] Add form fields for required fields (Name is required)
    - [ ] Add form fields for common optional fields (Email, Phone, Address, etc.)
    - [ ] Add form validation (email format, required fields)
    - [ ] Add stage selection dropdown (defaults to first stage)
    - [ ] Add "Save" and "Cancel" buttons (Hebrew: "שמור", "ביטול")
    - [ ] Handle form submission
    - [ ] Show success/error messages
    - [ ] Refresh lead list after creation

11. **Connect Everything**
    - [ ] Wire up API calls on page load
    - [ ] Wire up search to trigger API call
    - [ ] Wire up filters to trigger API call
    - [ ] Wire up pagination to trigger API call
    - [ ] Handle loading and error states
    - [ ] Add error messages in Hebrew

12. **Testing & Polish**
    - [ ] Test all functionality (create, list, search, filter, paginate)
    - [ ] Test RTL layout and Hebrew text rendering
    - [ ] Test responsive design (mobile, tablet)
    - [ ] Fix any styling issues
    - [ ] Add loading states everywhere
    - [ ] Add error handling UI

**Decisions Made:**
- ✅ **Collapsed rows display:** Name, Email, and Stage only
- ✅ **Leads per page:** 50 (default)
- ✅ **Filter UI:** Multi-select dropdowns (can select multiple stages/users at once)

#### 1.6 Frontend - Lead Details Page

**Step-by-Step Tasks:**

1. **Create Lead Details Page Structure**
   - [ ] Create `frontend/app/leads/[id]/page.tsx`
   - [ ] Set up dynamic route with `id` parameter
   - [ ] Fetch lead data using `getLead(id)` API function
   - [ ] Handle loading state (skeleton or spinner)
   - [ ] Handle error state (404, network error)
   - [ ] Create page layout with back button and title

2. **Organize Lead Fields into Sections**
   - [ ] Group 80+ fields into logical sections:
     - [ ] Basic Information (Name, ID, Phone, Email, Address, etc.)
     - [ ] Transaction Details (Area, Price, Fees, etc.)
     - [ ] Dates & Deadlines (Signing date, realization date, deadlines, etc.)
     - [ ] Document Links (all document-related fields)
     - [ ] Status & Workflow (various status fields)
     - [ ] Integration IDs (Morning IDs, invoice IDs, etc.)
     - [ ] Collection & Payment (payment-related fields)
     - [ ] Other fields
   - [ ] Create section components or use accordion/collapsible sections

3. **Create Inline Editable Field Component**
   - [ ] Create `frontend/components/EditableField.tsx` component
   - [ ] Support different field types: text, email, phone, date, number, textarea, boolean
   - [ ] Display field label in Hebrew
   - [ ] Show field value in read mode
   - [ ] On click, switch to edit mode (input field appears)
   - [ ] Add Save/Cancel buttons for edit mode
   - [ ] Validate field on save (email format, phone format, required fields)
   - [ ] Call API to update field value
   - [ ] Show loading state during save
   - [ ] Show success/error feedback
   - [ ] Handle RTL for input fields

4. **Implement Field Display with Hebrew Labels**
   - [ ] Create translation mapping for all 80+ field names (Hebrew labels)
   - [ ] Create `frontend/lib/leadFields.ts` with field definitions and labels
   - [ ] Map each database field to Hebrew label
   - [ ] Render all fields in organized sections
   - [ ] Show field values or "לא מוגדר" (Not set) for empty fields
   - [ ] Format dates in Hebrew format (DD/MM/YYYY)
   - [ ] Format numbers with proper separators

5. **Create Horizontal Timeline Component**
   - [ ] Create `frontend/components/StageTimeline.tsx` component
   - [ ] Fetch stage history for lead (from LeadStageHistory)
   - [ ] Display timeline horizontally (left-to-right in RTL, so newest on left)
   - [ ] Show stage names in Hebrew
   - [ ] Show date/time for each stage change
   - [ ] Show user who changed the stage
   - [ ] Use visual indicators (dots, lines, colors)
   - [ ] Highlight current stage
   - [ ] Make responsive (vertical on mobile if needed)

6. **Implement Stage Change Dropdown**
   - [ ] Create stage selector component
   - [ ] Fetch all available stages
   - [ ] Show current stage
   - [ ] Allow selecting new stage
   - [ ] Show confirmation before changing
   - [ ] Call API to update stage
   - [ ] Refresh timeline after change
   - [ ] Show success message

7. **Implement User Assignment**
   - [ ] Create user assignment dropdown
   - [ ] Fetch organization users
   - [ ] Show current assigned user or "לא מוקצה" (Unassigned)
   - [ ] Allow selecting user or "Unassign"
   - [ ] Call API to update assigned_user_id
   - [ ] Show success message
   - [ ] Update UI immediately

8. **Create Related Documents Section**
   - [x] Create section component (placeholder implemented)
   - [ ] Update to show actual documents list when Phase 2/3 is complete
   - [ ] Display documents with:
     - Document name/title
     - Template name
     - Status (draft, sent, signed, completed)
     - Created date
     - Actions: View, Download PDF (when signed), Delete
   - [ ] "Prepare New Document" button in documents section
   - [ ] Show empty state when no documents exist

9. **Add Save/Cancel Functionality**
   - [ ] Track which fields have been modified (dirty state)
   - [ ] Show "Save Changes" button when fields are modified
   - [ ] Show "Cancel" button to discard changes
   - [ ] Implement bulk save (save all modified fields at once)
   - [ ] Or save individually on each field (if inline editing saves immediately)
   - [ ] Add confirmation dialog if user tries to leave with unsaved changes

10. **Add Delete Lead Functionality**
    - [ ] Add "Delete Lead" button (Hebrew: "מחק ליד")
    - [ ] Show confirmation dialog before deleting
    - [ ] Call delete API
    - [ ] Redirect to leads list after deletion
    - [ ] Show success message

11. **Polish & Responsive Design**
    - [ ] Ensure all fields are visible and accessible
    - [ ] Make sections collapsible if too many fields
    - [ ] Test on mobile/tablet
    - [ ] Ensure RTL works correctly
    - [ ] Add loading states
    - [ ] Add error handling
    - [ ] Improve field grouping/organization based on user feedback

12. **Testing**
    - [ ] Test inline editing for all field types
    - [ ] Test stage change
    - [ ] Test user assignment
    - [ ] Test timeline display
    - [ ] Test form validation
    - [ ] Test save/cancel functionality
    - [ ] Test delete functionality
    - [ ] Test RTL layout

**Decisions Made:**
- ✅ **Field editing:** Inline editing (click field and edit directly in place)
- ✅ **Timeline visualization:** Horizontal timeline (stage progression displayed horizontally)

**Estimated Duration:** 2-3 weeks

---

### Phase 2: Document Templates
**Status:** NOT STARTED

**Goal:** Build document template system with rich text editor and merge fields.

#### 2.1 Database Models

**Step-by-Step Tasks:**

1. **Create DocumentTemplate Model**
   - [ ] Create `backend/app/models/document_template.py`
   - [ ] Import necessary SQLAlchemy components (Column, Integer, String, Text, Boolean, DateTime, ForeignKey)
   - [ ] Import Base from `app.core.database`
   - [ ] Define `DocumentTemplate` class with `__tablename__ = "document_templates"`
   - [ ] Add columns:
     - [ ] `id` (Integer, Primary Key, Index)
     - [ ] `organization_id` (Integer, ForeignKey('organizations.id'), nullable=False, indexed)
     - [ ] `name` (String(255), nullable=False)
     - [ ] `description` (Text, nullable=True)
     - [ ] `content` (Text, nullable=False) - HTML content with merge fields
     - [ ] `signature_blocks` (Text, nullable=True) - JSON string with signature block metadata
     - [ ] `created_by_user_id` (Integer, ForeignKey('users.id'), nullable=False)
     - [ ] `created_at` (DateTime(timezone=True), server_default=func.now())
     - [ ] `updated_at` (DateTime(timezone=True), onupdate=func.now())
     - [ ] `is_active` (Boolean, nullable=False, default=True) - Soft delete
   - [ ] Add relationships:
     - [ ] `organization` - relationship to Organization
     - [ ] `created_by_user` - relationship to User
     - [ ] `documents` - one-to-many relationship to Document (for Phase 3)
   - [ ] Update `backend/app/models/__init__.py` to export DocumentTemplate

2. **Create Alembic Migration**
   - [ ] Run `alembic revision --autogenerate -m "add_document_template_model"`
   - [ ] Review generated migration file
   - [ ] Verify all columns and constraints are correct
   - [ ] Run `alembic upgrade head` to apply migration
   - [ ] Test migration by creating a test template via database

**Decisions Made:**
- ✅ **Template content storage:** HTML only (simpler implementation, direct rendering, good rich text editor support)
- ✅ **Versioning:** MVP will use simple update (no version history)
- ✅ **Signature blocks storage:** JSON field storing array of signature block metadata (separate from HTML content)

**Signature Block Data Structure:**
```json
{
  "signature_blocks": [
    {
      "id": "sig_1",
      "type": "client",  // or "internal"
      "x": 100,          // absolute position in pixels
      "y": 500,
      "width": 200,
      "height": 80,
      "label": "חתימת לקוח"
    }
  ]
}
```

**Discussion Points:**
- ~~Template content storage: HTML, Markdown, or both?~~ → **DECIDED: HTML only**
- ~~How to handle versioning?~~ → **DECIDED: Simple update, no version history**

#### 2.2 Template Editor - Rich Text

**Step-by-Step Tasks:**

1. **Install TipTap and Dependencies**
   - [ ] Navigate to `frontend/` directory
   - [ ] Install TipTap core: `npm install @tiptap/react @tiptap/starter-kit`
   - [ ] Install TipTap extensions if needed: `npm install @tiptap/extension-text-style @tiptap/extension-color`
   - [ ] Verify installation in `package.json`

2. **Create TipTap Editor Component**
   - [ ] Create `frontend/components/TipTapEditor.tsx`
   - [ ] Import TipTap editor and extensions
   - [ ] Create editor component with basic configuration
   - [ ] Set `dir="rtl"` attribute for RTL support
   - [ ] Configure editor with StarterKit extension (includes bold, italic, headings, lists, paragraphs)
   - [ ] Add state management for editor content
   - [ ] Add onChange handler to track content changes

3. **Create Formatting Toolbar**
   - [ ] Create `frontend/components/EditorToolbar.tsx`
   - [ ] Add toolbar buttons:
     - [ ] Bold button (uses editor.commands.toggleBold())
     - [ ] Italic button (uses editor.commands.toggleItalic())
     - [ ] Heading buttons (H1, H2, H3)
     - [ ] Bullet list button
     - [ ] Numbered list button
   - [ ] Style toolbar with RTL layout (buttons aligned right)
   - [ ] Add active state indicators for current formatting
   - [ ] Ensure Hebrew text input works correctly (test typing Hebrew)

4. **Integrate Editor into Template Editor Page**
   - [ ] Import TipTapEditor component in `/templates/[id]/page.tsx`
   - [ ] Replace placeholder editor with TipTapEditor
   - [ ] Connect editor content to template state
   - [ ] Save template content as HTML when saving
   - [ ] Load existing template content into editor on page load
   - [ ] Test Hebrew text input and RTL layout

**Decisions Made:**
- ✅ **Rich text editor:** TipTap (modern, extensible, good React/Next.js integration, supports RTL)
- ✅ **Advanced formatting in MVP:** No - basic text formatting only (bold, italic, headings, lists, paragraphs)
- ✅ **RTL support:** TipTap supports RTL through HTML `dir="rtl"` attribute - templates will be stored with RTL direction

**Discussion Points:**
- ~~Which editor provides best balance of features vs complexity?~~ → **DECIDED: TipTap**
- ~~Do we need advanced formatting (tables, images, etc.) in MVP?~~ → **DECIDED: No - basic formatting only**

#### 2.3 Merge Fields System

**Step-by-Step Tasks:**

1. **Create Merge Field Detection Utility**
   - [ ] Create `frontend/lib/mergeFields.ts`
   - [ ] Create function to detect merge fields: `detectMergeFields(content: string)` using regex `/\{\{lead\.(\w+)\}\}/g`
   - [ ] Create function to get all available lead fields from `leadFields.ts`
   - [ ] Create function to validate merge field exists in lead fields

2. **Create TipTap Custom Extension for Merge Fields**
   - [ ] Create `frontend/lib/tiptap/MergeFieldExtension.ts` (or use TipTap node extension)
   - [ ] Define merge field as a custom node type
   - [ ] Configure merge field node:
     - [ ] Inline node (appears inline with text)
     - [ ] Formattable (can apply bold, italic, color, etc.)
     - [ ] Custom rendering with subtle visual indicator (light background, dotted underline)
     - [ ] Display field key (e.g., "full_name") in Hebrew label
   - [ ] Parse `{{lead.field_key}}` syntax into merge field nodes
   - [ ] Serialize merge field nodes back to `{{lead.field_key}}` syntax

3. **Create Merge Fields UI Component**
   - [ ] Create `frontend/components/MergeFieldsPanel.tsx`
   - [ ] Fetch available lead fields from `leadFields.ts` (all sections)
   - [ ] Display fields as pills/buttons with Hebrew labels
   - [ ] Group fields by section (Basic Info, Transaction, etc.)
   - [ ] Add search/filter functionality
   - [ ] Make panel collapsible/expandable

4. **Implement Merge Field Insertion**
   - [ ] Add "Insert Field" button in toolbar
   - [ ] Open MergeFieldsPanel when button clicked
   - [ ] On field click, insert merge field at cursor position in editor
   - [ ] Use editor command to insert custom merge field node
   - [ ] Ensure merge field is inserted as formattable text
   - [ ] Test formatting merge fields (bold, italic, color)

5. **Merge Field Visual Styling**
   - [ ] Add CSS classes for merge field nodes
   - [ ] Style with light background color (e.g., bg-blue-50)
   - [ ] Add dotted underline or border
   - [ ] Show Hebrew label for field name
   - [ ] Ensure merge fields look distinct but formattable
   - [ ] Test in RTL layout

6. **Merge Field Validation**
   - [ ] Validate merge field syntax when saving template
   - [ ] Check if all merge fields exist in available lead fields
   - [ ] Show warning for invalid/unknown fields
   - [ ] Display Hebrew error message: "[שדה לא נמצא]" for invalid fields

**Decisions Made:**
- ✅ **Editor style:** WYSIWYG editor (like Google Docs/Word) for non-technical users
- ✅ **Merge field appearance:** Merge fields look like regular text but formattable (subtle visual indicator only)
- ✅ **Formatting:** Users can format merge fields (bold, italic, font size, color) - formatting is preserved in merged output
- ✅ **Merge fields in rendered view:** Merge fields are only placeholders in templates - rendered documents show actual values
- ✅ **Invalid/removed fields:** Show "[שדה לא נמצא]" (Field not found) in Hebrew when field doesn't exist

#### 2.4 Signature Blocks

**Step-by-Step Tasks:**

1. **Define Signature Block Data Structure**
   - [ ] Create TypeScript interface in `frontend/lib/signatureBlocks.ts`:
     ```typescript
     interface SignatureBlock {
       id: string;
       type: 'client' | 'internal';
       x: number;        // absolute position X
       y: number;        // absolute position Y
       width: number;
       height: number;
       label: string;    // Hebrew label
     }
     ```
   - [ ] Create utility functions to serialize/deserialize signature blocks JSON

2. **Create Signature Block Component**
   - [ ] Create `frontend/components/SignatureBlock.tsx`
   - [ ] Display signature box with label (Hebrew: "חתימת לקוח" or "חתימת עו"ד")
   - [ ] Add visual styling (border, background color)
   - [ ] Make component draggable using `react-draggable` or native drag API
   - [ ] Add resize handles (corners) using resize functionality
   - [ ] Track position (x, y) and size (width, height) state
   - [ ] Add delete button for signature block

3. **Create Signature Blocks Canvas/Overlay**
   - [ ] Create `frontend/components/SignatureBlocksCanvas.tsx`
   - [ ] Position canvas as overlay on top of editor content
   - [ ] Use absolute positioning for signature blocks
   - [ ] Calculate relative positions based on editor container
   - [ ] Handle drag-and-drop positioning
   - [ ] Handle resize operations
   - [ ] Support multiple signature blocks

4. **Integrate Signature Blocks into Template Editor**
   - [ ] Add "Add Signature Block" button in toolbar
   - [ ] Allow selection of signature type (client or internal)
   - [ ] Add new signature block to canvas at default position
   - [ ] Render all signature blocks on canvas
   - [ ] Save signature blocks to template state (as JSON array)
   - [ ] Load signature blocks from template on page load

5. **Signature Block Storage**
   - [ ] Convert signature blocks array to JSON string
   - [ ] Store in `DocumentTemplate.signature_blocks` field (Text column)
   - [ ] Parse JSON when loading template
   - [ ] Validate signature block data structure on save

6. **Signature Block Positioning System**
   - [ ] Use relative positioning within editor container
   - [ ] Store positions as percentage or pixels (decide: pixels for MVP)
   - [ ] Handle responsive sizing (signature blocks scale with document)
   - [ ] Ensure signature blocks render correctly in final document (Phase 3)

**Decisions Made:**
- ✅ **Signature block appearance:** Visual signature boxes (like DocuSign/SignNow)
- ✅ **Positioning:** Draggable and freely positionable on template (absolute positioning)
- ✅ **Resizing:** Signature blocks can be resized (width/height)
- ✅ **Storage:** Store signature block metadata (type, x, y, width, height) in template data structure
- ✅ **Multiple signatures:** Support multiple signature blocks per template (client, internal, etc.)

**Technical Considerations:**
- Signature blocks need absolute positioning (not inline with text)
- Template data structure needs to store signature block metadata separately from HTML content
- Editor needs canvas/overlay system for drag-and-drop positioning
- Signature blocks rendered as positioned elements in final document

#### 2.5 Backend API - Templates

**Step-by-Step Tasks:**

1. **Create Pydantic Schemas**
   - [ ] Create `backend/app/api/schemas/template.py`
   - [ ] Create `TemplateCreate` schema:
     - [ ] `name` (str, required)
     - [ ] `description` (Optional[str])
     - [ ] `content` (str, required) - HTML content
     - [ ] `signature_blocks` (Optional[str]) - JSON string
   - [ ] Create `TemplateUpdate` schema (all fields optional)
   - [ ] Create `TemplateResponse` schema:
     - [ ] Include all fields from DocumentTemplate
     - [ ] Include `created_by_user` nested object
     - [ ] Parse `signature_blocks` JSON for response

2. **Implement GET /api/organizations/{id}/templates - List Templates**
   - [ ] Create `backend/app/api/templates.py`
   - [ ] Create endpoint function `list_templates()`
   - [ ] Add authentication and organization context dependencies
   - [ ] Query templates by organization_id
   - [ ] Filter by `is_active = True` (exclude soft-deleted)
   - [ ] Add search parameter (search in name, description)
   - [ ] Order by `updated_at DESC` (most recent first)
   - [ ] Return list of `TemplateResponse` objects
   - [ ] Include created_by_user info in response

3. **Implement POST /api/organizations/{id}/templates - Create Template**
   - [ ] Create endpoint function `create_template()`
   - [ ] Add authentication and organization context dependencies
   - [ ] Validate request body with `TemplateCreate` schema
   - [ ] Validate signature_blocks JSON format
   - [ ] Set `organization_id` from context
   - [ ] Set `created_by_user_id` from current user
   - [ ] Set `is_active = True`
   - [ ] Create DocumentTemplate instance
   - [ ] Save to database
   - [ ] Return `TemplateResponse` with created template

4. **Implement GET /api/templates/{id} - Get Template**
   - [ ] Create endpoint function `get_template()`
   - [ ] Add authentication dependency
   - [ ] Get template_id from path parameter
   - [ ] Query template by ID
   - [ ] Check organization membership (user must be member of template's organization)
   - [ ] Return 404 if not found or user doesn't have access
   - [ ] Return `TemplateResponse` with full template data

5. **Implement PUT /api/templates/{id} - Update Template**
   - [ ] Create endpoint function `update_template()`
   - [ ] Add authentication and organization context dependencies
   - [ ] Validate request body with `TemplateUpdate` schema
   - [ ] Query template by ID and organization_id
   - [ ] Check permissions (user must be member of organization)
   - [ ] Update only provided fields (partial update)
   - [ ] Validate signature_blocks JSON if provided
   - [ ] Update `updated_at` timestamp automatically
   - [ ] Save changes
   - [ ] Return updated `TemplateResponse`

6. **Implement DELETE /api/templates/{id} - Delete Template**
   - [ ] Create endpoint function `delete_template()`
   - [ ] Add authentication and organization context dependencies
   - [ ] Query template by ID and organization_id
   - [ ] Check permissions (user must be member of organization)
   - [ ] Set `is_active = False` (soft delete)
   - [ ] Save changes
   - [ ] Return 204 No Content

7. **Implement POST /api/templates/{id}/duplicate - Duplicate Template**
   - [ ] Create endpoint function `duplicate_template()`
   - [ ] Add authentication and organization context dependencies
   - [ ] Get template_id from path parameter
   - [ ] Query template by ID and organization_id
   - [ ] Create new template with:
     - [ ] Same organization_id
     - [ ] Name: "Copy of [original_name]"
     - [ ] Copy all other fields (content, signature_blocks, etc.)
     - [ ] New created_by_user_id (current user)
     - [ ] New timestamps
   - [ ] Save new template
   - [ ] Return `TemplateResponse` with duplicated template

8. **Update API Router**
   - [ ] Import templates router in `backend/app/main.py`
   - [ ] Include router with prefix `/api/templates`
   - [ ] Test all endpoints with Postman/curl

#### 2.6 Frontend - Template Management

**Step-by-Step Tasks:**

1. **Create Templates API Client**
   - [ ] Create `frontend/lib/api/templates.ts`
   - [ ] Create `fetchTemplates(organizationId, search?)` function
   - [ ] Create `fetchTemplate(id)` function
   - [ ] Create `createTemplate(data)` function
   - [ ] Create `updateTemplate(id, data)` function
   - [ ] Create `deleteTemplate(id)` function
   - [ ] Create `duplicateTemplate(id)` function
   - [ ] Add TypeScript interfaces for Template, TemplateCreate, TemplateUpdate
   - [ ] Handle API errors appropriately

2. **Create Templates List Page**
   - [ ] Create `frontend/app/templates/page.tsx`
   - [ ] Set up page metadata (title in Hebrew)
   - [ ] Use organization context to get current organization
   - [ ] Fetch templates on page load using `fetchTemplates()`
   - [ ] Display loading state
   - [ ] Display error state if fetch fails
   - [ ] Create template cards layout:
     - [ ] Template name (Hebrew)
     - [ ] Description (if exists)
     - [ ] Last modified date (formatted in Hebrew)
     - [ ] Created by user name
   - [ ] Add search input field (Hebrew placeholder)
   - [ ] Implement search functionality (filter templates by name/description)
   - [ ] Add "Create New Template" button (Hebrew: "צור תבנית חדשה")
   - [ ] Add action buttons for each template:
     - [ ] Edit button
     - [ ] Duplicate button
     - [ ] Delete button (with confirmation)
   - [ ] Handle template deletion with confirmation dialog
   - [ ] Navigate to editor when clicking template or Edit button
   - [ ] Ensure RTL layout

3. **Create Template Editor Page**
   - [ ] Create `frontend/app/templates/[id]/page.tsx` (for editing)
   - [ ] Create `frontend/app/templates/new/page.tsx` (for creating new)
   - [ ] Set up dynamic route with `id` parameter
   - [ ] Fetch template data on load (if editing) using `fetchTemplate()`
   - [ ] Handle loading and error states
   - [ ] Create page layout with:
     - [ ] Back button (return to templates list)
     - [ ] Template name input field (Hebrew label)
     - [ ] Template description textarea (Hebrew label)
     - [ ] TipTap editor component (from 2.2)
     - [ ] Merge fields panel (from 2.3)
     - [ ] Signature blocks canvas (from 2.4)
   - [ ] Add Save and Cancel buttons (Hebrew: "שמור", "ביטול")
   - [ ] Implement save functionality:
     - [ ] Get HTML content from TipTap editor
     - [ ] Get signature blocks from canvas
     - [ ] Call `createTemplate()` or `updateTemplate()` API
     - [ ] Show success message
     - [ ] Redirect to templates list or stay on page
   - [ ] Implement cancel functionality:
     - [ ] Show confirmation if unsaved changes
     - [ ] Discard changes and redirect to templates list
   - [ ] Track dirty state (unsaved changes)
   - [ ] Ensure RTL layout throughout

4. **Implement Template Duplication**
   - [ ] Add duplicate handler in templates list page
   - [ ] Call `duplicateTemplate(id)` API function
   - [ ] Show loading state during duplication
   - [ ] On success, refresh templates list or navigate to new template editor
   - [ ] Show success message
   - [ ] Handle errors appropriately

**Decisions Made:**
- ✅ **Preview mode:** Not needed - users will see preview when generating actual documents from leads
- ✅ **Template duplication:** Users can duplicate templates to create variations or reuse

**Estimated Duration:** 2-3 weeks

#### 2.7 Frontend - Document Generation from Lead (Integration)

**Step-by-Step Tasks:**

1. **Create Document Generation Modal Component**
   - [ ] Create `frontend/components/PrepareDocumentModal.tsx`
   - [ ] Create modal with 4 option tabs/buttons:
     - [ ] Tab 1: "בחר תבנית קיימת" (Select Existing Template)
     - [ ] Tab 2: "צור תבנית חדשה" (Create New Template)
     - [ ] Tab 3: "שכפל תבנית והתאם" (Duplicate & Adjust)
     - [ ] Tab 4: "שכפל ושמור תבנית" (Duplicate & Save Template)
   - [ ] Add close button and backdrop
   - [ ] Style modal with RTL layout

2. **Implement Option 1: Select Existing Template**
   - [ ] Fetch organization templates using `fetchTemplates()`
   - [ ] Display templates as selectable list/cards
   - [ ] Add search/filter for templates
   - [ ] Show template name and description
   - [ ] Add "Generate Document" button
   - [ ] On selection, call document generation API (Phase 3)
   - [ ] Show loading state during generation
   - [ ] Handle errors

3. **Implement Option 2: Create New Template**
   - [ ] Open template editor in new tab/window
   - [ ] Or open template editor in same modal (more complex)
   - [ ] After template is saved, automatically generate document
   - [ ] Return to lead page or show document

4. **Implement Option 3: Duplicate & Adjust (One-time)**
   - [ ] Show template selection (same as Option 1)
   - [ ] On template selection, duplicate template via API
   - [ ] Open duplicated template in editor
   - [ ] Allow editing
   - [ ] Add "Generate Document" button (don't save template)
   - [ ] Generate document from edited template
   - [ ] Optionally delete temporary template after generation

5. **Implement Option 4: Duplicate & Save Template**
   - [ ] Show template selection
   - [ ] On selection, duplicate template via API
   - [ ] Open duplicated template in editor
   - [ ] Allow editing
   - [ ] Add "Save Template" button
   - [ ] Save template to database
   - [ ] Then generate document from saved template

6. **Add Prepare Document Button to Lead Details Page**
   - [ ] Update `frontend/app/leads/[id]/page.tsx`
   - [ ] Add "הכן מסמך" (Prepare Document) button in header or documents section
   - [ ] Open `PrepareDocumentModal` when clicked
   - [ ] Pass `leadId` to modal for document generation
   - [ ] Refresh documents list after document is generated

7. **Handle Document Generation Response**
   - [ ] After document generation, show success message
   - [ ] Update documents list on lead page (if visible)
   - [ ] Optionally redirect to document view page (Phase 3)
   - [ ] Or stay on lead page and show document in list

**UX Flow:**
1. User is on Lead Details Page
2. User clicks "הכן מסמך" (Prepare Document) button
3. Modal/dialog opens with options:
   - **בחר תבנית קיימת** (Select Existing Template) - dropdown with templates
   - **צור תבנית חדשה** (Create New Template) - opens template editor
   - **שכפל תבנית והתאם** (Duplicate & Adjust) - select template → duplicate → edit → generate (temporary)
   - **שכפל ושמור תבנית** (Duplicate & Save Template) - select template → duplicate → edit → save → generate
4. After selection, document is generated and user can proceed to signing flow

**Decisions Made:**
- ✅ **Document generation access:** Available directly from Lead Details Page
- ✅ **Template selection flow:** Multiple options for flexibility (select, create, duplicate)
- ✅ **Template duplication for one-time use:** Users can duplicate, edit, and use without saving
- ✅ **Template duplication for reuse:** Users can duplicate, edit, save, and use multiple times
- ✅ **Multiple documents per lead:** Leads can have multiple documents (different templates, versions, etc.)
- ✅ **Document list on lead page:** Lead Details Page shows list of all documents associated with the lead

#### 2.8 Navigation Updates

**Step-by-Step Tasks:**

1. **Update Sidebar Navigation**
   - [ ] Open `frontend/components/Sidebar.tsx`
   - [ ] Add new menu item "תבניות" (Templates) below "לידים" (Leads)
   - [ ] Add icon for templates (document/file icon)
   - [ ] Link to `/templates` route
   - [ ] Ensure RTL layout (text aligned right)
   - [ ] Update active state detection to highlight Templates when on templates page
   - [ ] Test navigation functionality

**Decisions Made:**
- ✅ **Navigation structure:** Templates page accessible from main navigation below Leads

---

### Phase 3: Document Generation & Signing
**Status:** NOT STARTED

**Goal:** Generate documents from templates and enable electronic signing.

#### 3.1 Database Models
**Tasks:**
- [ ] Create `Document` model with fields:
  - `id`, `organization_id`, `lead_id`, `template_id`
  - `title` (String) - Generated from template name + lead info
  - `rendered_content` (Text) - HTML with merged data (stored for audit)
  - `pdf_file_path` (String, Optional) - Path/URL to signed PDF file
  - `signing_url` (String, Optional) - Public signing URL (stored when signing link is created)
  - `status` (String) - `'draft'`, `'sent'`, `'signed_by_client'`, `'signed_by_internal'`, `'completed'`, `'expired'`
  - `created_by_user_id`, `created_at`, `updated_at`, `completed_at`
- [ ] Create `DocumentSignature` model
- [ ] Create `SigningLink` model
- [ ] Create Alembic migrations

**Decisions Made:**
- ✅ **Template storage:** Templates stored in database (HTML content + signature blocks JSON in `DocumentTemplate` table)
- ✅ **Rendered document storage:** Rendered HTML stored in database (`Document.rendered_content`) for audit trail
- ✅ **Signed PDF storage:** Signed PDFs stored on file system or cloud storage (path stored in `Document.pdf_file_path`)
- ✅ **Signing URL storage:** Signing URL stored in `Document.signing_url` when signing link is created
- ✅ **Signature storage:** Base64 image stored in `DocumentSignature.signature_data` field

**Storage Architecture:**
- **Templates:** Database (SQLite/MySQL) - `DocumentTemplate` table
- **Rendered Documents (HTML):** Database - `Document.rendered_content` field
- **Signed PDFs:** File system or cloud storage (S3, etc.) - path stored in `Document.pdf_file_path`
- **Signatures:** Database - `DocumentSignature.signature_data` (Base64 image)

**Discussion Points:**
- Signature storage: Base64 image, vector data, or both? → **DECIDED: Base64 image**
- Should we store rendered HTML or regenerate on demand? → **DECIDED: Store for audit**
- File storage location: Local file system or cloud storage (S3, etc.)?

#### 3.2 Document Generation Logic
**Tasks:**
- [ ] Build merge field replacement engine
- [ ] Fetch lead field values
- [ ] Replace `{{lead.<field_key>}}` with actual values
- [ ] HTML escape values (XSS prevention)
- [ ] Preserve signature placeholders
- [ ] Store rendered document
- [ ] Ensure RTL direction is preserved in rendered HTML (`dir="rtl"`)

**Discussion Points:**
- Error handling for missing fields (show placeholder or empty string)?
- Should we validate all merge fields before generation?


#### 3.3 Backend API - Document Generation
**Tasks:**
- [ ] `POST /api/leads/{lead_id}/documents` - Generate document from template
  - [ ] Request body: `{ "template_id": 5 }`
  - [ ] Generate document with merged fields
  - [ ] Store rendered HTML in `Document.rendered_content`
  - [ ] Return document with `status = 'draft'`
- [ ] `GET /api/documents/{id}` - Get document details (includes signing_url if exists)
- [ ] `GET /api/documents/{id}/rendered` - Get rendered HTML (for viewing)
- [ ] `GET /api/documents/{id}/pdf` - Download signed PDF (if exists)

**Decisions Made:**
- ✅ **Document generation:** Synchronous (MVP) - document created immediately
- ✅ **Signing URL creation:** When signing link is created, URL is stored in `Document.signing_url` field
- ✅ **URL format:** Public signing URL format: `/public/sign/{token}` (token stored in SigningLink table)

**Discussion Points:**
- Should generation be synchronous or async? → **DECIDED: Synchronous for MVP**

#### 3.4 Signing Link System
**Tasks:**
- [ ] Generate secure tokens for signing links
- [ ] `POST /api/documents/{id}/signing-links` - Create signing link
  - [ ] Generate unique token (UUID recommended)
  - [ ] Create SigningLink record
  - [ ] Store signing URL in `Document.signing_url` field
  - [ ] Return signing URL to frontend
- [ ] Token validation and expiration handling
- [ ] Mark links as used after signing
- [ ] Update `Document.signing_url` when link is created

**Decisions Made:**
- ✅ **Token format:** UUID (secure, unique, URL-safe)
- ✅ **Signing URL storage:** Stored in `Document.signing_url` when signing link is created
- ✅ **URL format:** `https://domain.com/public/sign/{token}` (public route, no authentication required)
- ✅ **Default expiration:** 30 days (configurable)

**Discussion Points:**
- Token format (UUID, random string, JWT)? → **DECIDED: UUID**
- Default expiration period? → **DECIDED: 30 days (configurable)**

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
- [ ] Create `/documents/[id]/sign` - Internal signing page (authenticated users)
  - [ ] Display document content
  - [ ] Show signature blocks
  - [ ] Signature canvas component
  - [ ] Submit signature functionality
  - [ ] Success/confirmation screen
- [ ] Create `/public/sign/[token]` - Public signing page (no authentication required)
  - [ ] Validate token from URL parameter
  - [ ] Fetch document data using token
  - [ ] Display document content (read-only, RTL layout)
  - [ ] Show signature blocks for this signer type (client or internal)
  - [ ] Signature canvas component
  - [ ] Submit signature functionality
  - [ ] Success/confirmation screen
  - [ ] Handle expired/invalid tokens with error message

**Decisions Made:**
- ✅ **Dedicated signing pages:** Yes - separate pages for internal and public signing
- ✅ **Public signing page:** `/public/sign/[token]` - accessible without authentication
- ✅ **Internal signing page:** `/documents/[id]/sign` - requires authentication
- ✅ **Token-based access:** Public signing uses token from URL, no login required
- ✅ **RTL support:** Signing pages support Hebrew/RTL layout

**Discussion Points:**
- ~~Do we have a dedicated signing page?~~ → **DECIDED: Yes - two pages (public and internal)**

#### 3.9 PDF Generation & Storage
**Tasks:**
- [ ] Choose PDF generation library (e.g., xhtml2pdf, pdfkit, or Playwright)
- [ ] Convert signed HTML documents to PDF
- [ ] Ensure RTL/Hebrew formatting is preserved in PDF
- [ ] Store PDF files (file system or cloud storage)
- [ ] Update Document model to include PDF file path/URL (`pdf_file_path` field)
- [ ] Add API endpoint to download PDF: `GET /api/documents/{id}/pdf`
- [ ] Ensure PDF is generated after all signatures are collected
- [ ] Auto-generate PDF when document status changes to `'completed'`

**Decisions Made:**
- ✅ **PDF generation requirement:** Signed documents MUST be saved as PDF
- ✅ **RTL support in PDF:** PDF generation must preserve RTL direction and Hebrew text rendering
- ✅ **PDF storage location:** File system (local) for MVP, cloud storage (S3) for production
- ✅ **PDF file path:** Stored in `Document.pdf_file_path` field
- ✅ **PDF generation trigger:** Automatic when document status = `'completed'` (all signatures collected)

**Storage Structure:**
```
storage/
├── templates/          # (Not needed - templates in DB)
├── documents/          # Rendered HTML (in DB)
├── pdfs/              # Signed PDF files
│   └── {organization_id}/
│       └── {document_id}.pdf
└── signatures/        # (Not needed - signatures in DB as Base64)
```

**Discussion Points:**
- PDF library choice: xhtml2pdf (simple), pdfkit (needs wkhtmltopdf), Playwright (headless browser, best HTML/CSS support)?
- Storage: File system or cloud storage (S3, etc.)? → **DECIDED: File system for MVP, cloud storage for production**

**Estimated Duration:** 3-4 weeks (including PDF generation)

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

