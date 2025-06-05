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
        
        {/* Latest Release Entry */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">{`Release: ${currentDate}`}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This major update completely refactors the password recovery flow to be more robust and reliable, resolving persistent token expiry errors.
          </p>

          <h3>Key Enhancements</h3>
          <h4>Password Recovery Flow Overhaul (<code>/auth/confirm</code>)</h4>
          <ul>
            <li>Replaced the previous multi-purpose confirmation page with a new, dedicated client component (<code>PasswordRecoveryFlow</code>) specifically designed for handling password resets.</li>
            <li>The new component correctly parses the <code>access_token</code> and <code>type=recovery</code> from the URL hash fragment (<code>#</code>), which is the method used by Supabase's secure PKCE authentication flow.</li>
            <li>It now uses <code>supabase.auth.setSession()</code> to establish a valid user session from the token before allowing a password update.</li>
            <li>The UI has been enhanced with distinct, clear states for "Loading", "Error", "Ready" (to show the password form), "Submitting", and "Complete", providing better user feedback throughout the process.</li>
            <li>This change fixes the root cause of the "Email link is invalid or has expired" errors by correctly implementing the client-side logic required by Supabase's PKCE password recovery.</li>
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

        {/* Latest Release Entry - Password Reset & Email Templates */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">{`Release: ${currentDate}`}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This update enhances the password recovery process for improved reliability and provides new, consistently branded email templates for all authentication flows.
          </p>

          <h3>Key Enhancements & Fixes</h3>
          <h4>Password Recovery Flow</h4>
          <ul>
            <li>Corrected the Supabase password reset email template to use <code>{"{{ .ConfirmationURL }}"}</code>, ensuring proper token generation and redirection. This resolves issues where reset links were sent with missing or invalid tokens.</li>
            <li>Updated the <code>/auth/confirm</code> page (<code>src/app/auth/confirm/page.tsx</code>) to robustly handle the <code>type=recovery</code> flow, including parsing tokens from URL hash fragments and displaying a dedicated "Set New Password" form.</li>
          </ul>

          <h4>New Branded Email Templates</h4>
          <ul>
            <li>Provided updated HTML email templates for Password Reset, Confirm Signup, Invite User, Magic Link (Login), and Reauthentication (Email OTP).</li>
            <li>Templates feature consistent MixerAI 2.0 branding, including the logo (referenced via <code>{"{{ .SiteURL }}/Mixerai2.0Logo.png"}</code>) and theme colors.</li>
            <li>Ensured correct Supabase variables are used for dynamic content and links within these templates.</li>
          </ul>
          <p className="mt-4">
            For any issues or feedback, please use the <Link href="/dashboard/admin/feedback-log">Feedback Log</Link>.
          </p>
        </section>

        {/* Latest Release Entry - Password Reset & Email Templates */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">{`Release: ${currentDate}`}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This update includes a diagnostic change to the password reset functionality to investigate an issue with token validation.
          </p>

          <h3>Key Changes</h3>
          <h4>Password Reset Flow (Diagnostic Step)</h4>
          <ul>
            <li>To investigate an issue with password reset links expiring immediately, the reset flow has been temporarily changed.</li>
            <li>The <code>redirectTo</code> parameter has been removed from the <code>resetPasswordForEmail</code> call in the "Forgot Password" page.</li>
            <li>This forces Supabase to use its default email-based token flow (<code>token_hash</code>) instead of the PKCE flow, helping to isolate the source of the token validation error.</li>
          </ul>
          <p className="mt-4">
            For any issues or feedback, please use the <Link href="/dashboard/admin/feedback-log">Feedback Log</Link>.
          </p>
        </section>

        {/* Latest Release Entry - Password Reset & Email Templates */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">{`Release: ${currentDate}`}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This update restores the intended password reset flow to continue investigating a token validation issue.
          </p>

          <h3>Key Changes</h3>
          <h4>Password Reset Flow</h4>
          <ul>
            <li>Restored the <code>redirectTo</code> parameter in the <code>resetPasswordForEmail</code> call on the "Forgot Password" page.</li>
            <li>Users will now be correctly redirected to <code>/auth/confirm</code> after clicking the link in the password reset email. This page is designed to handle the secure token from Supabase and allow the user to set a new password.</li>
            <li>This change reverts a previous diagnostic step and ensures the application follows the designed authentication flow.</li>
          </ul>
          <p className="mt-4">
            For any issues or feedback, please use the <Link href="/dashboard/admin/feedback-log">Feedback Log</Link>.
          </p>
        </section>

        {/* Latest Release Entry */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">{`Release: ${currentDate}`}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            As part of an ongoing investigation into a persistent password reset issue, a new diagnostic test page has been created.
          </p>

          <h3>Key Changes</h3>
          <h4>New Diagnostic Password Reset Page</h4>
          <ul>
            <li>Created a new, minimal test page at <code>/auth/reset-password-test</code>. This page replicates a simple, known-good HTML file to isolate the password reset flow from any potential issues within the Next.js component lifecycle or routing of the original <code>/auth/confirm</code> page.</li>
            <li>The "Forgot Password" flow now redirects to this new test page.</li>
            <li>This step aims to definitively confirm if the Supabase PKCE flow can complete successfully within the Next.js environment, providing a clear path to resolving the issue.</li>
          </ul>
          <p className="mt-4">
            For any issues or feedback, please use the <Link href="/dashboard/admin/feedback-log">Feedback Log</Link>.
          </p>
        </section>
      </div>
    </div>
  );
} 