# Feedback System Development Log

This document tracks the requirements, design decisions, and implementation steps for the MixerAI Feedback System.

## 1. Core Requirements (Initial Request)

*   Users (authenticated) should be able to log enhancement requests and bug reports.
*   A view-only page should be available for users to see all logged feedback (later refined to be part of the submission page).
*   An admin-specific area/functionality for managing feedback.

## 2. Database Schema (`feedback_items`)

The following table was defined and created via migration (`migrations/20250516000000_create_feedback_system.sql`):

```sql
CREATE TYPE feedback_type AS ENUM ('bug', 'enhancement');
CREATE TYPE feedback_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE feedback_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'wont_fix');

CREATE TABLE feedback_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Assuming 'profiles' table exists for users
    type feedback_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL, -- Initially optional, later made required for submission
    status feedback_status DEFAULT 'open' NOT NULL,
    priority feedback_priority DEFAULT 'medium' NOT NULL,
    url TEXT,
    browser_info TEXT,
    os_info TEXT,
    user_context TEXT, -- General context, user impact
    reproduction_steps TEXT, -- Renamed from steps_to_reproduce during implementation
    expected_behavior TEXT,
    actual_behavior TEXT,
    resolution_details TEXT, -- For admins to detail how an issue was resolved
    attachments_metadata JSONB -- For storing metadata about any attachments
);

-- Indexes
CREATE INDEX idx_feedback_items_status ON feedback_items(status);
CREATE INDEX idx_feedback_items_priority ON feedback_items(priority);
CREATE INDEX idx_feedback_items_type ON feedback_items(type);
CREATE INDEX idx_feedback_items_created_by ON feedback_items(created_by);
CREATE INDEX idx_feedback_items_assigned_to ON feedback_items(assigned_to);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_feedback_item_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_feedback_item_updated_at
BEFORE UPDATE ON public.feedback_items
FOR EACH ROW
EXECUTE FUNCTION public.update_feedback_item_updated_at();
```

## 3. Row-Level Security (RLS) Policies

*   **Authenticated Users**:
    *   Can `INSERT` new feedback items.
    *   Can `SELECT` all feedback items (for viewing logs/details).
*   **Admin Users** (identified by `auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'` or `auth.jwt()->>'role' = 'admin'`):
    *   Can `UPDATE` existing feedback items.
    *   Can `DELETE` feedback items.
    *   Have full `SELECT` access.

## 4. API Endpoints

*   **`POST /api/feedback`**:
    *   Allows authenticated users to submit new feedback.
    *   Removes admin-specific logic for submission.
    *   Validates ENUM fields.
    *   Initially included fields like `affected_area`, `app_version`, these were later removed to align with the DB schema. Now includes all relevant DB fields: `type`, `title`, `description`, `priority`, `url`, `browser_info`, `os_info`, `user_context`, `reproduction_steps`.
*   **`GET /api/feedback`**:
    *   Retrieves all feedback items, including `created_by_profile` (full_name, avatar_url).
    *   Used for the feedback log display.
*   **`GET /api/feedback/[id]`**:
    *   Retrieves a single feedback item by its ID.
    *   Includes `created_by_profile` and `assigned_to_profile` (full_name, avatar_url).
*   **`PATCH /api/feedback/[id]`**:
    *   Allows admin users to update a feedback item.
    *   Validates ENUM fields.
    *   Accepts all editable fields from the database schema.

## 5. User Interface Pages & Features

### 5.1. Feedback Log & Submission Page (`/dashboard/admin/feedback-log`)

*   **Original Path**: `/dashboard/admin/feedback-log` (kept, but navigation label changed).
*   **Navigation Link**: "Submit Feedback" (accessible to all authenticated users).
*   **Page Title**: "Feedback Log & Submission".
*   **Page Description**: Added as per UI Standards.
*   **Functionality**:
    *   **Submission Form**:
        *   Allows users to submit new feedback items.
        *   Fields displayed: `Type`, `Priority`, `Title`, `Description` (all required), `URL`, `Browser Info`, `OS Info`, `User Context`, `Steps to Reproduce` (conditional on type 'bug').
        *   Removed fields not in DB: `affected_area`, `app_version`, `user_impact_details`.
        *   Helper text added for fields.
        *   Required field indicators (`*`) implemented.
    *   **Recently Logged Items Table**:
        *   Moved above the submission form.
        *   Displays: Title (clickable, links to detail page), Type, Priority, Status, Created At.
        *   `Created At` date format updated to "DD Mmm YYYY".
        *   Empty state message implemented.
*   **UI Standards Compliance**:
    *   Page padding applied.
    *   Back button present.

### 5.2. Feedback Detail Page (`/dashboard/feedback/[id]`)

*   **Functionality**:
    *   Displays details of a single feedback item.
    *   **Displayed Fields**: All fields from the `feedback_items` database schema are intended to be displayed. This includes: `ID` (implicitly via URL), `Title` (as H1), `Description`, `Type`, `Priority`, `Status`, `URL`, `Browser Info`, `OS Info`, `User Context`, `Reproduction Steps`, `Expected Behavior`, `Actual Behavior`, `Resolution Details`, `Attachments Metadata`, `Created At`, `Updated At`, `Reported by` (creator profile), `Assigned to` (assignee profile).
    *   Fields removed during reconciliation: `affected_area`, `app_version`. Field `user_impact_details` merged into `user_context`. Field `steps_to_reproduce` renamed to `reproduction_steps`.
    *   "Edit" button visible to admin users, linking to the edit page.
*   **UI Standards Compliance**:
    *   Page padding applied.
    *   Main page `<h1>` is the feedback item's title.
    *   Page description added.
    *   Back button present.
    *   Layout enhanced with section titles and a two-column grid for details.
    *   `DetailItem` component updated to show "N/A" for empty fields.

### 5.3. Feedback Edit Page (`/dashboard/feedback/[id]/edit`)

*   **Functionality**:
    *   Allows admin users to edit an existing feedback item.
    *   Form pre-filled with existing item data.
    *   **Editable Fields**: All relevant fields from `feedback_items` schema: `Type`, `Priority`, `Status`, `Title`, `Description` (all required), `URL`, `Browser Info`, `OS Info`, `User Context`, `Reproduction Steps`, `Expected Behavior`, `Actual Behavior`, `Resolution Details`.
    *   Fields removed/renamed to align with DB: `affected_area`, `app_version`, `user_impact_details`.
*   **UI Standards Compliance**:
    *   Page padding applied.
    *   Page `<h1>`: "Edit Feedback: [Original Item Title]".
    *   Page description added.
    *   Back button links to detail page.
    *   Form labels, helper text, and required field indicators (`*`) implemented.
    *   "Save Changes" (primary) and "Cancel" (secondary) buttons correctly positioned and styled.

## 6. Miscellaneous

*   **Linter Errors**: Addressed various linter errors during development (e.g., `createServerClient` vs `createSupabaseServerClient`, escaped quotes in SupabaseClient type, `Badge` variants).
*   **Supabase Types**: Regenerated via `supabase gen types typescript`.
*   **Shadcn/UI Components**: Added missing components as needed (`button`, `card`, `input`, `label`, `textarea`, `select`, `table`, `progress`, `badge`, `separator`).
*   **Overall Goal**: Create a robust, user-friendly system for managing feedback that aligns with specified UI standards and database schema.

This log will be updated if further changes or clarifications are made. 