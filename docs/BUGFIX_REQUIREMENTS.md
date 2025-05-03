# MixerAI 2.0 Bugfix and Enhancement Requirements

This document outlines the requirements for fixing various issues and implementing enhancements in the MixerAI 2.0 application.

## 1. Dashboard Page (Root)

### Current Issues:
- Note stating "Some data shown is placeholder data. API endpoints for workflows and users will be implemented in a future update."
- The "Overview" tab button is no longer needed since the Analytics tab was removed.
- Potentially hardcoded data in the content overview component.

### Requirements:
- Remove the "Overview" tab button from the TabsList since it's now the only tab.
- Replace all placeholder data with live data from API endpoints:
  - Currently hardcoded: `userCount: 3` and `workflowCount: 5`
  - Connect to appropriate API endpoints for accurate data
- Remove the note about placeholder data once all data is live.

## 2. Brands Page

### Current Issues:
- Import and export buttons are unnecessary.
- Clicking to view or edit a brand (e.g. `/brands/[id]`) results in a 404 error.

### Requirements:
- Remove import and export buttons from the brands page.
- Fix the routing for brand viewing and editing:
  - Review code to determine the correct routes according to project standards
  - Fix links to ensure they point to the correct routes (likely `/dashboard/brands/[id]` or similar)

## 3. Brand Creation Page

### Current Issues:
- Country and language fields are not user-friendly.
- Brand identity, tone of voice, guardrails, and vetting agencies need to be moved to a separate tab.
- No functionality for automatically generating these fields from URLs.

### Requirements:
- Update country and language fields to combo boxes with standard ISO options.
- Create a new tab for brand identity details:
  - Move brand identity, tone of voice, guardrails, and vetting agencies fields to this tab.
  - Add a text area where users can input multiple URLs (one per line).
  - Implement URL validation to ensure they are valid.
  - Add functionality to extract text from these URLs.
  - Use Azure OpenAI to generate brand identity, tone of voice, guardrails, and vetting agencies.
  - Display error messages if URLs can't be processed.
  - Use existing Azure OpenAI configuration:
    ```
    AZURE_OPENAI_API_KEY=91657ac1fc944910992d8c9da1d9c866
    AZURE_OPENAI_ENDPOINT=https://owned-ai-dev.openai.azure.com
    AZURE_OPENAI_DEPLOYMENT=gpt-4o
    ```

## 4. Users Page

### Current Issues:
- Cannot assign roles (admin, editor, viewer) to users.
- No way to assign users to specific brands.
- "Joined date" should be "Last login date".
- Export button is unnecessary.

### Requirements:
- Remove the export button.
- Change "Joined date" to "Last login date" using the `last_sign_in_at` field.
- Add functionality to assign roles to users:
  - Dropdown menu for role selection (admin, editor, viewer)
  - Store this information properly in Supabase
- Add functionality to assign users to brands:
  - Multi-select component for brand assignment
  - Allow different roles for different brands
  - Connect to user_brand_permissions table in Supabase

## 5. Workflows System

### Current Issues:
- Workflows are not connected to brands and content types.

### Requirements:
- Update workflow schema to include brand_id and content_type_id as required fields.
- Implement workflow according to the detailed PRD specifications:

### Workflow Core Components:
- Workflow Definitions - Templates that define a sequence of stages
- Workflow Stages - Individual steps in a workflow (brand, seo, legal, culinary, publisher)
- Stage Assignments - Users responsible for actions in a stage
- Stage Transitions - Rules for moving between stages
- Content Progress - Tracking content through workflows

### Implementation Details:
1. **Stage Configuration Interface**
   - Basic information (name, type, order)
   - Stage requirements (customizable checklist)
   - Team assignment (user selection, role assignment)
   - Automation settings (auto-transition, notifications)

2. **Workflow Dashboard**
   - Task overview (assigned content, due dates)
   - Content status (current stage, progress)
   - Action items (needs attention, overdue)

3. **Review Interface**
   - Content preview
   - Review panel with stage-specific checklist
   - Feedback system with inline comments
   - Progress tracker

4. **Transition Rules**
   - Manual transitions (explicit action)
   - Automatic transitions (when minimum approvals met)
   - Conditional transitions (based on feedback)

5. **Progress Visualization**
   - Shows all stages in workflow
   - Highlights current stage
   - Indicates completed stages
   - Shows assignees

6. **Workflow Analytics**
   - Time in workflow (average completion time)
   - Approval rates (first-time approval %)
   - User performance (response time)

## Technical Implementation Notes

1. **Database Structure**
   - Ensure appropriate tables exist for workflows, stages, permissions
   - Create proper relations between brands, content types, workflows

2. **API Integration**
   - Create/update API endpoints for workflow management
   - Ensure proper authentication and authorization

3. **UI Components**
   - Implement all UI components according to specifications
   - Ensure responsive design
   - Follow existing design patterns

4. **Error Handling**
   - Implement specific error handling for workflow operations
   - Display user-friendly error messages

## Implementation Priority

1. Fix dashboard page placeholder data and remove unnecessary tab
2. Fix brand viewing/editing routes
3. Enhance brand creation page with combo boxes and separate tab
4. Update users page with role and brand assignment functionality
5. Implement workflow system with brand and content type connections

Each issue should be addressed independently to ensure clean commits and easier review. 