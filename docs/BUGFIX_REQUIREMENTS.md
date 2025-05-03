# MixerAI 2.0 Bugfix and Enhancement Requirements

This document outlines the requirements for fixing various issues and implementing enhancements in the MixerAI 2.0 application.

## 1. Dashboard Page (Root) - COMPLETE

### Current Issues:
- Note stating "Some data shown is placeholder data. API endpoints for workflows and users will be implemented in a future update."
- The "Overview" tab button is no longer needed since the Analytics tab was removed.
- Potentially hardcoded data in the content overview component.

### Requirements:
- Remove the "Overview" tab button from the TabsList since it's now the only tab.
- Replace all placeholder data with live data from API endpoints:
  - Currently hardcoded: `userCount: 3` and `workflowCount: 5`
  - Create or connect to appropriate API endpoints for accurate data
  - Implement best-practice approach for counting workflows and users
- Remove the note about placeholder data once all data is live.

## 2. Brands Page - COMPLETE

### Current Issues:
- Import and export buttons are unnecessary.
- Clicking to view or edit a brand (e.g. `/brands/[id]`) results in a 404 error.

### Requirements:
- Remove import and export buttons from the brands page.
- Fix the routing for brand viewing and editing:
  - Review code to determine the correct routes according to application standards
  - Follow the same URL structure pattern as the rest of the application
  - Fix links to ensure they point to the correct routes

## 3. Brand Creation Page - COMPLETE

### Current Issues:
- Country and language fields are not user-friendly.
- Brand identity, tone of voice, guardrails, and vetting agencies need to be moved to a separate tab.
- No functionality for automatically generating these fields from URLs.
- Brand identity generation is too generic and doesn't incorporate country/language context.
- Content vetting agencies aren't provided as selectable options specific to the brand's country.

### Requirements:
- Update country and language fields to combo boxes with standard ISO options.
- Create a new tab for brand identity details:
  - Move brand identity, tone of voice, guardrails, and vetting agencies fields to this tab.
  - Add a text area where users can input multiple URLs (one per line).
  - Implement URL validation to ensure they are valid.
  - Add functionality to extract text from these URLs.
  - Use Azure OpenAI to generate brand identity, tone of voice, guardrails, and vetting agencies.
  - Display error messages if URLs can't be processed.
  - Implement rate limiting to avoid OpenAI API rate limits.
  - No preview of extracted content is needed before generation.
  - Use existing Azure OpenAI configuration:
    ```
    AZURE_OPENAI_API_KEY=91657ac1fc944910992d8c9da1d9c866
    AZURE_OPENAI_ENDPOINT=https://owned-ai-dev.openai.azure.com
    AZURE_OPENAI_DEPLOYMENT=gpt-4o
    ```
- Enhanced brand identity generation:
  - Use the country and language selected for the brand when generating identity.
  - Ensure the AI properly scrapes and analyzes content from the provided URLs.
  - Add confirmation dialog if user attempts to regenerate when fields already have values.
- Content vetting agencies implementation:
  - Generate a list of relevant vetting agencies specific to the selected country.
  - Present agencies as selectable options (checkboxes) that the user can choose from.
  - Order agencies by priority/relevance to the brand.
  - Provide brief explanation for why each agency is important for the brand.
  - Examples of agencies by country:
    - US: FDA, USDA, CDC, FTC, EPA
    - UK: FSA, DEFRA, UHSA, ASA, EA
    - France: SNAM, DGCCRF, ARPP
  - Allow users to select multiple relevant agencies

## 4. Users Page

### Current Issues:
- Cannot assign roles (admin, editor, viewer) to users.
- "Joined date" should be "Last login date".
- Export button is unnecessary.

### Requirements:
- Remove the export button.
- Change "Joined date" to "Last login date" using the `last_sign_in_at` field.
- User management clarifications:
  - Only admin users can be added through the 'Invite User' functionality
  - Regular users need to be set up by assigning them to a workflow stage
  - Brand assignment for users will be handled through the workflow system, not directly on the users page
  - User roles will be defined by workflow stage assignments

## 5. Workflows System

### Current Issues:
- Workflows are not connected to brands and content types.

### Requirements:
- Review existing schema in migrations and create a migration for any missing tables/fields
- Update workflow schema to include brand_id and content_type_id as required fields.
- Implement workflow according to the detailed PRD specifications:
- Workflow-specific requirements:
  - Workflows are always unique to brands (not shareable across brands)
  - Users should be assignable to workflow stages by email
  - If the email belongs to an existing user, assign to their account
  - If the email is new, invite them to the system
  - Implement proper UI for workflow stage user assignment

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
   - Team assignment (user selection by email)
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
   - Review existing tables for workflows, stages, permissions
   - Create migration script for any missing tables/fields
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
   - Add rate limiting for OpenAI API calls

## Implementation Priority

1. Fix dashboard page placeholder data and remove unnecessary tab
2. Fix brand viewing/editing routes
3. Enhance brand creation page with combo boxes and separate tab
4. Update users page to show last login date and remove export button
5. Implement workflow system with brand and content type connections

Each issue should be addressed independently to ensure clean commits and easier review. 