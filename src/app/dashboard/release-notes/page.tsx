import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { format } from 'date-fns';

export default function ReleaseNotesPage() {
  const currentDate = format(new Date(), 'MMMM d, yyyy');

  return (
    <div className="space-y-6">
      <header className="space-y-1 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Release Notes</h1>
        <p className="text-muted-foreground">
          Summary of recent changes and improvements to MixerAI.
        </p>
      </header>
      <Separator className="my-6" />
      
      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
        
        {/* LATEST RELEASE - DASHBOARD REDESIGN & STABILIZATION */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">{`Release: ${currentDate}`}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This release introduces a complete overhaul of the main dashboard, replacing the previous workflow matrix with a more dynamic and insightful interface. It also includes critical bug fixes to stabilize the application&apos;s data-fetching and permission systems.
          </p>

          <h3>Key Features & Enhancements</h3>
          <h4>Dashboard (<code>/dashboard</code>)</h4>
          <ul>
            <li>
              <strong>New &quot;Team Activity&quot; Feed:</strong> The centrepiece of the new dashboard is a live feed showing significant events from across the platform, such as content creation, updates, and approvals. This provides a clear, at-a-glance overview of team activity.
            </li>
            <li>
              <strong>New &quot;Stalled Content&quot; Module:</strong> To help identify bottlenecks, this module lists content that has not been updated in a while. The age of the content is highlighted with colours (yellow for over 7 days, red for over 30 days) to draw attention to the most urgent items.
            </li>
             <li>
              <strong>New &quot;My Tasks&quot; Module:</strong> The &quot;My Tasks&quot; component has been re-introduced as a robust, client-side component that fetches data safely from a dedicated API endpoint (<code>/api/me/tasks</code>), resolving the previous server-side rendering errors.
            </li>
            <li>
              <strong>Visual & Layout Polish:</strong> The dashboard layout and typography have been meticulously adjusted to match the design specification, ensuring a clean, professional, and consistent user interface.
            </li>
          </ul>

          <h4>Bug Fixes</h4>
           <ul>
            <li>
              <strong>Permissions Fix (<code>getProfileWithAssignedBrands</code>):</strong> Fixed a critical bug where brand-specific users could not see any data. The helper function was incorrectly looking for the user&apos;s role in the `profiles` table instead of the correct `user.user_metadata`. This fix ensures RBAC rules are correctly applied for all user types.
            </li>
             <li>
              <strong>Database Function Fix (<code>getMyTasks</code>):</strong> Removed all calls to a non-existent and faulty database function (`get_user_details`) from the dashboard, eliminating the last of the startup errors.
            </li>
          </ul>
          <p className="mt-4">
            For any issues or feedback, please use the <Link href="/dashboard/admin/feedback-log">Feedback Log</Link>.
          </p>
        </section>
        
        {/* LATEST RELEASE - USER MANAGEMENT AND SVG FIXES */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">{`Release: ${currentDate}`}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This release resolves several critical bugs related to user management and image rendering, ensuring the user pages are stable, secure, and functional.
          </p>

          <h3>Key Fixes & Enhancements</h3>
          <h4>User Management API & Database</h4>
          <ul>
            <li>
              <strong>Database Functionality:</strong> Corrected multiple critical bugs in the database functions responsible for fetching and updating user details.
              <ul>
                <li>Fixed a bug where the `get_user_details` function was referencing a non-existent column (`raw_app_meta_data` instead of `raw_user_meta_data`), which caused the user detail page to fail with a 500 error.</li>
                <li>Added the `SECURITY DEFINER` clause to the `get_user_details` function to resolve a &quot;permission denied&quot; error when reading from the `auth.users` table.</li>
                 <li>Corrected the `update_user_details` function to use the proper `raw_user_meta_data` column name, fixing a 500 error on user profile updates.</li>
                 <li>Aliased the user&apos;s role correctly as `globalRole` in the `get_user_details` function to match the frontend&apos;s expectation.</li>
              </ul>
            </li>
          </ul>
          <h4>Next.js Image Configuration</h4>
           <ul>
            <li>
              <strong>SVG Image Support:</strong> Fixed an error that prevented user avatars from loading from `api.dicebear.com`. Updated `next.config.js` to use the modern `remotePatterns` configuration and enabled `dangerouslyAllowSVG` to correctly process SVG images.
            </li>
          </ul>
          <p className="mt-4">
            For any issues or feedback, please use the <Link href="/dashboard/admin/feedback-log">Feedback Log</Link>.
          </p>
        </section>

        {/* LATEST RELEASE - ARCHITECTURAL REFACTOR */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">{`Release: ${currentDate}`}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This is a major architectural release focused on resolving systemic security vulnerabilities, fixing critical performance bottlenecks, and improving the overall stability and maintainability of the application. A full-code review was performed, and 28 issues were logged and resolved.
          </p>

          <h3>Key Architectural Changes</h3>
          <h4>1. Server-Side Authorization & Data Fetching</h4>
          <ul>
            <li>
              <strong>Security Hardening:</strong> All pages that were previously performing insecure authorization checks on the client-side have been refactored into <strong>Server Components</strong>. Authorization is now enforced securely on the server, preventing unauthorized access to data and pages.
            </li>
            <li>
              <strong>Performance Optimization:</strong> Inefficient client-side data fetching patterns have been eliminated. Data is now fetched efficiently on the server, significantly improving page load times and reducing the number of network requests.
            </li>
          </ul>
          <h4>2. Database Performance (N+1 Bug Fixes)</h4>
          <ul>
            <li>
              <strong>Content API:</strong> Fixed a catastrophic N+1 query bug in the <code>GET /api/content</code> endpoint that was making over 50 database calls for a single request. This has been replaced with an efficient bulk-fetching strategy.
            </li>
            <li>
              <strong>Brand Detail API:</strong> Fixed a severe N+1 query bug in the <code>GET /api/brands/[id]</code> endpoint that made 6+ database calls. This has been replaced with a single, efficient database function (<code>get_brand_details_by_id</code>).
            </li>
             <li>
              <strong>User Detail API:</strong> Fixed an N+1 query bug in the <code>GET /api/users/[id]</code> endpoint and replaced it with the <code>get_user_details</code> database function.
            </li>
          </ul>
          <h4>3. Data Integrity & Transactions</h4>
          <ul>
             <li>
              <strong>Atomic Operations:</strong> Fixed critical data integrity bugs by adding database transactions to all multi-step API operations, including brand creation (<code>POST /api/brands</code>) and user updates/deletions (<code>PUT/DELETE /api/users/[id]</code>). This prevents the database from entering a corrupt or inconsistent state if an operation fails midway.
            </li>
          </ul>
           <h4>4. Code Quality & Maintainability</h4>
          <ul>
            <li>
              <strong>Component Refactoring:</strong> Broke down large, monolithic page components (e.g., Brands page, Dashboard page) into smaller, more manageable child components (e.g., `DeleteBrandDialog`, `DashboardMetrics`).
            </li>
             <li>
              <strong>Centralized Services:</strong> Centralized the Supabase client initialization to ensure consistency.
            </li>
          </ul>
          <p className="mt-4">
            For any issues or feedback, please use the <Link href="/dashboard/admin/feedback-log">Feedback Log</Link>.
          </p>
        </section>
        
        {/* LATEST RELEASE - BRAND CREATION FIX */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">{`Release: ${currentDate}`}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This release resolves critical errors in the brand creation process, ensuring new brands can be created reliably by administrators.
          </p>

          <h3>Key Fixes & Enhancements</h3>
          <h4>Brand Creation Workflow (<code>/dashboard/brands/new</code>)</h4>
          <ul>
            <li>
              <strong>Root Cause Identified:</strong> The brand creation process was failing due to two separate issues in the <code>POST /api/brands</code> endpoint.
              <ol>
                <li>An initial error was caused by a faulty RPC (<code>create_brand_and_set_admin</code>) that attempted to assign a <code>&apos;brand_admin&apos;</code> role, which was an invalid value for the database&apos;s <code>user_brand_role_enum</code> type.</li>
                <li>A subsequent fix attempt introduced a second error by trying to write to a non-existent <code>created_by</code> column in the <code>brands</code> table.</li>
              </ol>
            </li>
            <li>
              <strong>Resolution Implemented:</strong>
              <ul>
                <li>The problematic <code>create_brand_and_set_admin</code> RPC has been entirely removed from the brand creation logic.</li>
                <li>The process now uses two direct Supabase calls:
                  <ol>
                    <li>First, a new record is inserted into the <code>brands</code> table with the core brand details.</li>
                    <li>Second, a permission record is inserted into the <code>user_brand_permissions</code> table, explicitly granting the creator the correct <code>&apos;admin&apos;</code> role for the new brand.</li>
                  </ol>
                </li>
                <li>This direct approach bypasses the faulty RPC and aligns with the database schema, resolving both errors.</li>
              </ul>
            </li>
            <li>
              <strong>Outcome:</strong> The brand creation functionality is now stable. Administrators can create new brands without encountering a 500 Internal Server Error.
            </li>
          </ul>
          <p className="mt-4">
            For any issues or feedback, please use the <Link href="/dashboard/admin/feedback-log">Feedback Log</Link>.
          </p>
        </section>

        {/* LATEST RELEASE - PASSWORD RESET FIX */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">{`Release: ${currentDate}`}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This release includes a definitive fix for the Supabase password reset functionality, resolving all previously encountered token errors.
          </p>

          <h3>Key Fixes & Enhancements</h3>
          <h4>Secure Password Reset Flow (PKCE)</h4>
          <ul>
            <li>
              <strong>Root Cause Identified:</strong> Addressed a critical issue where the password reset process failed with a misleading &quot;Token Expired&quot; error. The investigation confirmed that the Next.js/React environment was interfering with the Supabase client&apos;s ability to persist the necessary <code>code_verifier</code> across redirects, which is a key part of the secure PKCE authentication flow.
            </li>
            <li>
              <strong>Resolution Implemented:</strong>
              <ol>
                <li>
                  A dedicated, client-side-only callback page was created at <code>/auth/confirm</code>. This page&apos;s sole responsibility is to handle the callback from Supabase, securely exchange the authorization code for a user session, and store it in a cookie.
                </li>
                <li>
                  The &quot;Update Password&quot; page was simplified to use the secure session from the cookie, removing all complex token-parsing logic.
                </li>
                <li>
                  This new approach isolates the sensitive authentication handshake from the React component lifecycle, ensuring a reliable and secure password reset experience.
                </li>
              </ol>
            </li>
            <li>
              <strong>Outcome:</strong> The password reset functionality is now fully stable, secure, and aligns with modern best practices for handling OAuth 2.0 PKCE flows in a single-page application framework.
            </li>
          </ul>
          <p className="mt-4">
            For any issues or feedback, please use the <Link href="/dashboard/admin/feedback-log">Feedback Log</Link>.
          </p>
        </section>

        {/* Latest Release Entry - Template Form Fix */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">{`Release: ${currentDate}`}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This update addresses issues with creating and editing Content Templates, ensuring consistent and reliable saving of template field structures.
          </p>

          <h3>Key Fixes</h3>
          <h4>Content Template Form & API (<code>/dashboard/templates/new</code>, <code>/dashboard/templates/[id]/edit</code>)</h4>
          <ul>
            <li>Resolved errors during template creation and updates caused by inconsistent payload structures for <code>inputFields</code> and <code>outputFields</code>.</li>
            <li>The <code>TemplateForm</code> component now consistently sends <code>inputFields</code> and <code>outputFields</code> as top-level arrays in the payload.</li>
            <li>The <code>POST /api/content-templates</code> API endpoint has been updated to accept this flat structure and internally reconstruct the nested <code>fields</code> object for database storage, aligning it with the <code>PUT</code> endpoint for template updates.</li>
            <li>This prevents errors such as &quot;Name and fields are required&quot; or &quot;Name, inputFields, and outputFields are required&quot; during template management.</li>
          </ul>
          <p className="mt-4">
            For any issues or feedback, please use the <Link href="/dashboard/admin/feedback-log">Feedback Log</Link>.
          </p>
        </section>

        {/* Existing Release Entry - June 5, 2025 */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: June 5, 2025</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This release addresses critical bugs on the Content Edit page, ensuring that content data and template-defined fields are correctly loaded and displayed.
            </p>

            <h3>Key Enhancements & Fixes (Developed on <code>fix/small-bugs</code>)</h3>
            
            <h4>Content Edit Page (<code>/dashboard/content/[id]/edit</code>)</h4>
            <ul>
              <li>
                <strong>Resolved TypeError for Template Fields:</strong>
                <ul>
                  <li>Fixed a <code>TypeError: Cannot read properties of undefined (reading &apos;outputFields&apos;)</code> that occurred when the page attempted to access <code>template.fields.outputFields</code> but the <code>template.fields</code> object itself was undefined.</li>
                  <li>Enhanced conditional checks to ensure <code>template.fields</code> exists before accessing its nested properties, preventing the error and allowing the page to proceed with rendering.</li>
                </ul>
              </li>
              <li>
                <strong>Corrected Template Data Structure Handling:</strong>
                <ul>
                  <li>Addressed an issue where the &quot;Generated Output Fields&quot; card was not appearing. This was due to a mismatch between the component&apos;s expected <code>Template</code> interface (requiring fields to be nested under a <code>fields</code> property, e.g., <code>template.fields.outputFields</code>) and the actual flat structure returned by the <code>/api/content-templates/[id]</code> endpoint (e.g., <code>template.outputFields</code>).</li>
                  <li>Implemented a transformation step within the data fetching logic to reshape the API response for content templates. The fetched <code>inputFields</code> and <code>outputFields</code> are now correctly nested under a <code>fields</code> object before being set into the component&apos;s state.</li>
                  <li>This ensures the data structure aligns with the component&apos;s expectations, allowing the conditional rendering logic to pass and all template-based output fields (including those using <code>Textarea</code> and <code>RichTextEditor</code>) to be displayed correctly.</li>
                </ul>
              </li>
            </ul>
            <p className="mt-4">
              These fixes restore the full functionality of the content editing interface, allowing users to view and modify all parts of their content as intended.
            </p>
            <p className="mt-4">
              For any issues or feedback, please use the <Link href="/dashboard/admin/feedback-log">Feedback Log</Link>.
            </p>
          </section>

          {/* Existing Release Entry - June 4, 2025 (First of the previous entries) */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: June 4, 2025</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This release focuses on refining the content creation process by ensuring users can only select brands with configured workflows for specific templates, and aligns navigation visibility with documented permissions.
            </p>

            <h3>Key Enhancements & Fixes (Developed on <code>feature/content-page-navigation-updates</code>)</h3>
            
            <h4>Content Creation Page (<code>/dashboard/content/new</code>)</h4>
            <ul>
              <li>
                <strong>Smart Brand Filtering:</strong>
                <ul>
                  <li>The brand dropdown on the content generation page is now dynamically filtered. Users will only see brands that have an active workflow configured for the currently selected content template.</li>
                  <li>This prevents users from selecting a brand/template combination that cannot be used for content generation.</li>
                  <li>If no brands are configured with a workflow for the selected template, a message is displayed guiding the user to contact an administrator, and the form is disabled.</li>
                </ul>
              </li>
              <li>
                <strong>Removed Post-Selection Error:</strong> The previous behavior of allowing selection and then showing an error if no workflow was found (with admin contact details) has been replaced by the proactive filtering mentioned above.
              </li>
            </ul>

            <h4>Navigation and Permissions (<code>UnifiedNavigation.tsx</code>)</h4>
            <ul>
              <li>
                <strong>Editor Role Permissions:</strong> Corrected navigation item visibility for users with the &quot;Editor&quot; role. Editors will no longer see links for &quot;Brands,&quot; &quot;Workflows,&quot; and &quot;Content Templates,&quot; aligning with the permissions outlined in <code>NAVIGATION_PERMISSIONS.md</code>.
              </li>
              <li>
                <strong>&quot;Create Content&quot; Sub-menu Filtering:</strong>
                <ul>
                  <li>Platform Administrators continue to see all &quot;Create Content&quot; sub-items (derived from all available templates).</li>
                  <li>Scoped Administrators and Editors will now only see &quot;Create Content&quot; sub-items for templates that have at least one workflow associated with one of their assigned brands.</li>
                </ul>
              </li>
            </ul>

            <h4>API Updates</h4>
            <ul>
              <li>
                <strong>New Endpoint for Brand Admins:</strong> Created <code>GET /api/brands/[id]/admins</code> to fetch a list of administrators for a specific brand. This was initially used for error messaging but is now less directly exposed in the UI due to the new brand filtering logic.
              </li>
              <li>
                <strong>Workflow API Enhancement:</strong> The <code>GET /api/workflows</code> endpoint now correctly filters workflows by <code>template_id</code> when this parameter is provided in the request. This ensures accurate data for both the content generation page and navigation filtering.
              </li>
            </ul>
            <p className="mt-4">
              For any issues or feedback, please use the <Link href="/dashboard/admin/feedback-log">Feedback Log</Link>.
            </p>
          </section>

          {/* Entry for the current/most recent release */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: June 4, 2025</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This release focuses on enhancing the content generation capabilities, improving UI/UX, ensuring build stability, and adding this Release Notes page.
            </p>

            <h3>Key Enhancements & Fixes (Developed on <code>feature/enhance-content-page</code>)</h3>
            
            <h4>Content Generation Form (<code>/dashboard/content/new</code>)</h4>
            <ul>
              <li>
                <strong>Individual Field Retry:</strong>
                <ul>
                  <li>Implemented a new API endpoint (<code>src/app/api/content/generate-field/route.ts</code>) to allow regeneration of content for a single output field if the initial attempt fails or if users wish to retry.</li>
                  <li>Added &quot;Retry Generation&quot; buttons next to each output field in the Content Generator Form (<code>src/components/content/content-generator-form.tsx</code>).</li>
                  <li>These buttons are now always visible after the initial content generation attempt, allowing users to regenerate any field.</li>
                  <li>Enhanced the retry mechanism to include comprehensive brand context (name, identity, tone of voice, guardrails) and detailed task instructions, ensuring the AI has sufficient information for high-quality, brand-aligned regeneration. This addresses issues where retried content was too generic.</li>
                  <li>Improved placeholder interpolation in AI prompts for retries to correctly use brand details and other field values.</li>
                </ul>
              </li>
              <li>
                <strong>&quot;Regenerate All Content&quot; Button:</strong> Added a button to allow users to re-trigger the entire content generation process for all fields, including the title, after an initial generation.
              </li>
            </ul>

            <h4>AI-Generated Template Descriptions</h4>
            <ul>
              <li>
                <strong>Real AI Implementation:</strong> Replaced the mock AI call in the API route for generating content template descriptions (<code>src/app/api/ai/generate-template-description/route.ts</code>) with a call to the actual Azure OpenAI service using the project&apos;s standard <code>generateTextCompletion</code> utility.
              </li>
              <li>
                <strong>Improved Prompting:</strong>
                <ul>
                  <li>Removed the &quot;AI Template Description: &quot; prefix from the generated output.</li>
                  <li>Updated the system and user prompts to encourage clear, concise, helpful, and complete descriptions, avoiding truncation.</li>
                </ul>
              </li>
            </ul>

            <h4>User Interface & User Experience (UI/UX)</h4>
            <ul>
              <li>
                <strong>Toast Notification Position:</strong> Moved toast notifications (using Sonner) from the bottom-right to the **top-right** corner of the screen to prevent them from obstructing critical UI elements. This change was made globally in <code>src/components/sonner.tsx</code>.
              </li>
              <li>
                <strong>Toast Notification Appearance:</strong> Updated toast notifications to have a solid white background and dark text for improved readability, addressing issues with transparency.
              </li>
              <li>
                <strong>Navigation Highlighting:</strong> Adjusted active state logic in <code>src/components/layout/unified-navigation.tsx</code> to correctly highlight &quot;Create Content&quot; sub-items in red and ensure &quot;All Content&quot; is not highlighted when a sub-item is active.
              </li>
            </ul>

            <h4>Build Stability & Technical Fixes</h4>
            <ul>
              <li>
                <strong>API Structure for Templates:</strong> Corrected the API response for single content templates (<code>src/app/api/content-templates/[id]/route.ts</code>) to return a flattened structure for <code>inputFields</code> and <code>outputFields</code>, resolving an issue where template fields were not loading in the Content Generator.
              </li>
              <li>
                <strong>Type Definitions:</strong> Modified <code>ContentTemplate</code> type in <code>src/types/template.ts</code> and updated consuming components (`ContentGeneratorForm`, `TemplateForm`) to align with data structure changes, resolving various linter and build errors.
              </li>
              <li>
                <strong>Suspense Boundary:</strong> Added a <code>&lt;React.Suspense&gt;</code> boundary around the <code>UnifiedNavigation</code> component in <code>src/app/dashboard/layout.tsx</code> to fix build errors related to the use of <code>useSearchParams</code>.
              </li>
            </ul>
            <p className="mt-4">
              For any issues or feedback, please use the <Link href="/dashboard/admin/feedback-log">Feedback Log</Link>.
            </p>
          </section>
      </div>
    </div>
  );
} 