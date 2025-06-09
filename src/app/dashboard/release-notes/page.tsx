import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export default function ReleaseNotesPage() {
  const currentDate = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <header className="space-y-1 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Release Notes</h1>
        <p className="text-muted-foreground">
          Summary of recent changes and improvements to MixerAI.
        </p>
      </header>
      <Separator className="my-6" />
      
      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
        
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
                <li>An initial error was caused by a faulty RPC (<code>create_brand_and_set_admin</code>) that attempted to assign a <code>'brand_admin'</code> role, which was an invalid value for the database's <code>user_brand_role_enum</code> type.</li>
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
                    <li>Second, a permission record is inserted into the <code>user_brand_permissions</code> table, explicitly granting the creator the correct <code>'admin'</code> role for the new brand.</li>
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
              <strong>Root Cause Identified:</strong> Addressed a critical issue where the password reset process failed with a misleading "Token Expired" error. The investigation confirmed that the Next.js/React environment was interfering with the Supabase client's ability to persist the necessary <code>code_verifier</code> across redirects, which is a key part of the secure PKCE authentication flow.
            </li>
            <li>
              <strong>Resolution Implemented:</strong>
              <ol>
                <li>
                  A dedicated, client-side-only callback page was created at <code>/auth/confirm</code>. This page's sole responsibility is to handle the callback from Supabase, securely exchange the authorization code for a user session, and store it in a cookie.
                </li>
                <li>
                  The "Update Password" page was simplified to use the secure session from the cookie, removing all complex token-parsing logic.
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
            <li>This prevents errors such as "Name and fields are required" or "Name, inputFields, and outputFields are required" during template management.</li>
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
                  <li>Fixed a <code>TypeError: Cannot read properties of undefined (reading 'outputFields')</code> that occurred when the page attempted to access <code>template.fields.outputFields</code> but the <code>template.fields</code> object itself was undefined.</li>
                  <li>Enhanced conditional checks to ensure <code>template.fields</code> exists before accessing its nested properties, preventing the error and allowing the page to proceed with rendering.</li>
                </ul>
              </li>
              <li>
                <strong>Corrected Template Data Structure Handling:</strong>
                <ul>
                  <li>Addressed an issue where the "Generated Output Fields" card was not appearing. This was due to a mismatch between the component's expected <code>Template</code> interface (requiring fields to be nested under a <code>fields</code> property, e.g., <code>template.fields.outputFields</code>) and the actual flat structure returned by the <code>/api/content-templates/[id]</code> endpoint (e.g., <code>template.outputFields</code>).</li>
                  <li>Implemented a transformation step within the data fetching logic to reshape the API response for content templates. The fetched <code>inputFields</code> and <code>outputFields</code> are now correctly nested under a <code>fields</code> object before being set into the component's state.</li>
                  <li>This ensures the data structure aligns with the component's expectations, allowing the conditional rendering logic to pass and all template-based output fields (including those using <code>Textarea</code> and <code>RichTextEditor</code>) to be displayed correctly.</li>
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
                <strong>Editor Role Permissions:</strong> Corrected navigation item visibility for users with the "Editor" role. Editors will no longer see links for "Brands," "Workflows," and "Content Templates," aligning with the permissions outlined in <code>NAVIGATION_PERMISSIONS.md</code>.
              </li>
              <li>
                <strong>"Create Content" Sub-menu Filtering:</strong>
                <ul>
                  <li>Platform Administrators continue to see all "Create Content" sub-items (derived from all available templates).</li>
                  <li>Scoped Administrators and Editors will now only see "Create Content" sub-items for templates that have at least one workflow associated with one of their assigned brands.</li>
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
                  <li>Added "Retry Generation" buttons next to each output field in the Content Generator Form (<code>src/components/content/content-generator-form.tsx</code>).</li>
                  <li>These buttons are now always visible after the initial content generation attempt, allowing users to regenerate any field.</li>
                  <li>Enhanced the retry mechanism to include comprehensive brand context (name, identity, tone of voice, guardrails) and detailed task instructions, ensuring the AI has sufficient information for high-quality, brand-aligned regeneration. This addresses issues where retried content was too generic.</li>
                  <li>Improved placeholder interpolation in AI prompts for retries to correctly use brand details and other field values.</li>
                </ul>
              </li>
              <li>
                <strong>"Regenerate All Content" Button:</strong> Added a button to allow users to re-trigger the entire content generation process for all fields, including the title, after an initial generation.
              </li>
            </ul>

            <h4>AI-Generated Template Descriptions</h4>
            <ul>
              <li>
                <strong>Real AI Implementation:</strong> Replaced the mock AI call in the API route for generating content template descriptions (<code>src/app/api/ai/generate-template-description/route.ts</code>) with a call to the actual Azure OpenAI service using the project's standard <code>generateTextCompletion</code> utility.
              </li>
              <li>
                <strong>Improved Prompting:</strong>
                <ul>
                  <li>Removed the "AI Template Description: " prefix from the generated output.</li>
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
                <strong>Navigation Highlighting:</strong> Adjusted active state logic in <code>src/components/layout/unified-navigation.tsx</code> to correctly highlight "Create Content" sub-items in red and ensure "All Content" is not highlighted when a sub-item is active.
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