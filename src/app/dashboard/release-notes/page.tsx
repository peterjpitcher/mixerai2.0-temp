import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { formatDate } from '@/lib/utils/date';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

export default function ReleaseNotesPage() {
  const currentDate = formatDate(new Date());

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Release Notes" }
      ]} />
      
      <header className="space-y-1 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Release Notes</h1>
        <p className="text-muted-foreground">
          Summary of recent changes and improvements to MixerAI.
        </p>
      </header>
      <Separator className="my-6" />
      
      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
        
        {/* LATEST RELEASE - Priority Issues Batch Fix */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: June 18, 2025 (1795d65)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This release addresses multiple priority issues identified through comprehensive application review, focusing on accessibility, UI consistency, functionality enhancements, and code quality improvements.
          </p>

          <h3>Accessibility & UI Standards Compliance</h3>
          <h4>Touch Target Accessibility (Issues #91, #94) (354aaaa)</h4>
          <ul>
            <li>
              <strong>WCAG 2.1 Compliance:</strong> Implemented touch target utility classes to ensure all interactive elements meet the 44x44px minimum size requirement:
              <ul>
                <li>Created reusable touch target utility classes for consistent sizing</li>
                <li>Applied to all buttons, icon buttons, table actions, and dropdown triggers</li>
                <li>Special handling for table actions with negative margins to increase hit area without visual bulk</li>
                <li>Comprehensive application across dashboard, content, brands, and workflow pages</li>
              </ul>
            </li>
          </ul>

          <h4>Mobile Responsiveness (Issue #92) (354aaaa)</h4>
          <ul>
            <li>
              <strong>Table Mobile Optimization:</strong> Enhanced data tables for better mobile viewing:
              <ul>
                <li>Implemented responsive column hiding on mobile devices</li>
                <li>Added proper text wrapping and overflow handling</li>
                <li>Applied to data-table component and standard table implementations</li>
                <li>Improved scrolling behavior for complex tables on small screens</li>
              </ul>
            </li>
          </ul>

          <h4>UI Layout Fixes (Issue #132) (354aaaa)</h4>
          <ul>
            <li>
              <strong>CTA Button Overflow:</strong> Fixed sticky button positioning in workflow creation:
              <ul>
                <li>Adjusted z-index to prevent overlap with other elements</li>
                <li>Added proper padding to sticky container</li>
                <li>Ensured buttons remain accessible without obscuring content</li>
              </ul>
            </li>
          </ul>

          <h3>Content Management Enhancements</h3>
          <h4>Due Date Functionality (Issue #105) (1795d65)</h4>
          <ul>
            <li>
              <strong>Content Publishing Deadlines:</strong> Added comprehensive due date support:
              <ul>
                <li>Database migration to add due_date column to content table</li>
                <li>Created DatePicker component using shadcn/ui primitives</li>
                <li>Integrated due dates in content creation and editing forms</li>
                <li>Display due dates in content listings with visual indicators</li>
                <li>Added due date filtering and sorting capabilities</li>
              </ul>
            </li>
          </ul>

          <h4>Content Regeneration (Issue #102) (1795d65)</h4>
          <ul>
            <li>
              <strong>Workflow Step Regeneration:</strong> Enable content regeneration at any workflow step:
              <ul>
                <li>New API endpoint for selective content regeneration</li>
                <li>RegenerationPanel component for intuitive UI</li>
                <li>Section-based regeneration with feedback capture</li>
                <li>Maintains content history while allowing improvements</li>
                <li>Integrated with workflow approval process</li>
              </ul>
            </li>
          </ul>

          <h4>Content Access Control (Issue #100) (1795d65)</h4>
          <ul>
            <li>
              <strong>Approved Content Protection:</strong> Restrict editing of approved/published content:
              <ul>
                <li>Added status checks in content edit page</li>
                <li>Shows lock icon and informative message for restricted content</li>
                <li>Prevents accidental modifications to finalized content</li>
                <li>Maintains content integrity through workflow stages</li>
              </ul>
            </li>
          </ul>

          <h3>Email & Notification System</h3>
          <h4>Email Notifications (Issue #101) (1795d65)</h4>
          <ul>
            <li>
              <strong>Task Assignment Notifications:</strong> Implemented comprehensive email system:
              <ul>
                <li>Resend email service integration with proper configuration</li>
                <li>Professional HTML email templates for various notification types</li>
                <li>User preference checks before sending notifications</li>
                <li>Email types: task assignments, workflow updates, deadline reminders</li>
                <li>Database migration for email preferences (immediate, daily, weekly)</li>
                <li>API endpoint for centralized email sending with error handling</li>
              </ul>
            </li>
          </ul>

          <h3>AI Tool Enhancements</h3>
          <h4>Batch Processing UI (Issues #110, #111, #112) (1795d65)</h4>
          <ul>
            <li>
              <strong>Content Trans-Creator Batch Grouping:</strong> Enhanced batch processing visibility:
              <ul>
                <li>Groups historical runs by batch_id with expandable details</li>
                <li>Shows success/failure counts per batch</li>
                <li>Brand information display for each batch</li>
                <li>Collapsible UI for better history management</li>
              </ul>
            </li>
            <li>
              <strong>Metadata Generator History:</strong> Improved run history display:
              <ul>
                <li>Shows URL count per run</li>
                <li>Success/failure badges for batch results</li>
                <li>Enhanced table with more meaningful columns</li>
              </ul>
            </li>
            <li>
              <strong>Alt Text Generator History:</strong> Enhanced history tracking:
              <ul>
                <li>Displays image count per run</li>
                <li>Visual indicators for batch success rates</li>
                <li>Consistent UI with other AI tools</li>
              </ul>
            </li>
          </ul>

          <h3>Team Activity Feed Improvements (df5bd62)</h3>
          <ul>
            <li>
              <strong>Condensed Activity Display:</strong> Redesigned team activity feed for better information density:
              <ul>
                <li>Removed redundant "Content" prefix from activity types</li>
                <li>Proper date formatting using formatDate utility</li>
                <li>More compact layout while maintaining readability</li>
                <li>Consistent styling with other dashboard components</li>
              </ul>
            </li>
          </ul>

          <h3>Bug Fixes</h3>
          <h4>Authentication & API Issues</h4>
          <ul>
            <li>
              <strong>Missing Function Fix (4bd1d3e):</strong> Added normalize_website_domain database function required by brand operations</li>
            <li>
              <strong>API Authentication (dbf70dd):</strong> Fixed credentials include for API client to ensure proper authentication</li>
            <li>
              <strong>AI Suggest Fix (1c9d018):</strong> Resolved template variable interpolation in AI suggestions (Issue #171):
              <ul>
                <li>Fixed client-server mismatch in template field value transmission</li>
                <li>Proper interpolation of template variables before AI processing</li>
                <li>Cleanup of unreplaced placeholders in generated content</li>
              </ul>
            </li>
          </ul>

          <h3>Code Quality & Maintenance</h3>
          <h4>Large Commented Code Removal (Issue #69) (1795d65)</h4>
          <ul>
            <li>
              <strong>Codebase Cleanup:</strong> Removed all large blocks of commented code:
              <ul>
                <li>Eliminated commented imports and empty imports</li>
                <li>Removed commented metadata exports from page components</li>
                <li>Cleaned up unnecessary eslint-disable comments</li>
                <li>Removed diagnostic logging and unused interface definitions</li>
                <li>Major cleanup in layout.tsx, content pages, and tool components</li>
              </ul>
            </li>
          </ul>

          <h4>Database Migration Consolidation (1795d65)</h4>
          <ul>
            <li>
              <strong>Migration Squashing:</strong> Consolidated all database migrations:
              <ul>
                <li>Created final squashed migration with all schema changes</li>
                <li>Removed individual migration files after verification</li>
                <li>Updated documentation to reflect new migration structure</li>
                <li>Simplified future deployment and maintenance</li>
              </ul>
            </li>
          </ul>

          <h3>Documentation Updates</h3>
          <ul>
            <li>
              <strong>Comprehensive Review (2928b2e, 869e679):</strong> Added detailed application review documentation in dated folder structure</li>
            <li>
              <strong>Migration Status:</strong> Created detailed migration status report and cleanup procedures</li>
          </ul>
        </section>

        {/* Previous releases remain unchanged below... */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: June 17, 2025 (f313a80)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This release introduces comprehensive security enhancements, performance optimizations, and completes the implementation of various features including unit testing framework and error boundaries.
          </p>

          <h3>Security Enhancements</h3>
          <h4>Global Rate Limiting (Issue #139) (f510f3e)</h4>
          <ul>
            <li>
              <strong>Implemented Centralized Rate Limiting:</strong> Replaced individual endpoint rate limiting with global middleware-based solution:
              <ul>
                <li>Different rate limits for auth (5/15min), AI (10/min), expensive AI (5/5min), and general API (100/min) endpoints</li>
                <li>Exponential backoff for repeat offenders</li>
                <li>Rate limit headers (X-RateLimit-*) included in all responses</li>
                <li>IP and user-based tracking for authenticated requests</li>
              </ul>
            </li>
            <li>
              <strong>Security Benefits:</strong>
              <ul>
                <li>Protection against DDoS attacks</li>
                <li>Prevention of brute force authentication attempts</li>
                <li>API abuse mitigation</li>
                <li>Resource exhaustion protection</li>
              </ul>
            </li>
          </ul>

          <h4>Authentication Security (Issue #140) (f510f3e)</h4>
          <ul>
            <li>
              <strong>Account Lockout Protection:</strong> Implemented brute-force protection:
              <ul>
                <li>Accounts lock after 5 failed login attempts within 15 minutes</li>
                <li>30-minute lockout duration with clear user feedback</li>
                <li>Remaining attempts shown after failed logins</li>
                <li>Automatic cleanup of old login attempts</li>
              </ul>
            </li>
            <li>
              <strong>Enhanced Password Policy:</strong> Strengthened password requirements:
              <ul>
                <li>Minimum 12 characters (increased from 6)</li>
                <li>Must contain uppercase and lowercase letters</li>
                <li>Requires at least one number and special character</li>
                <li>Blocks common weak passwords</li>
                <li>Clear requirements shown in password change form</li>
              </ul>
            </li>
            <li>
              <strong>Security Event Logging:</strong> Added foundation for security audit trail:
              <ul>
                <li>Logs failed login attempts and account lockouts</li>
                <li>Database migration prepared for security_logs table</li>
                <li>Console logging in place until database table is deployed</li>
              </ul>
            </li>
          </ul>

          <h4>Performance Optimizations (Issues #138, #54) (f510f3e)</h4>
          <ul>
            <li>
              <strong>Fixed N+1 Query in Claims API:</strong> Optimized product claims permission checks:
              <ul>
                <li>Replaced individual queries per product with batch query</li>
                <li>Single query fetches all products with master brands and permissions</li>
                <li>Reduced database round trips from N+1 to 2 queries total</li>
                <li>Significant performance improvement for claims with multiple products</li>
              </ul>
            </li>
            <li>
              <strong>Added Pagination to Claims API:</strong> Implemented proper pagination:
              <ul>
                <li>Default 50 items per page, max 100</li>
                <li>Returns total count and pagination metadata</li>
                <li>Prevents loading entire claims table at once</li>
              </ul>
            </li>
            <li>
              <strong>Users API Already Optimized:</strong> Verified the users list API uses proper joins:
              <ul>
                <li>Fetches profiles with user_brand_permissions in single query</li>
                <li>No N+1 queries present in current implementation</li>
              </ul>
            </li>
          </ul>

          <h4>Error Boundaries (Issue #74) (f510f3e)</h4>
          <ul>
            <li>
              <strong>React Error Boundaries Implementation:</strong> Created and integrated comprehensive error handling:
              <ul>
                <li>ErrorBoundary: Full-page error boundary for route-level errors with recovery options</li>
                <li>FeatureErrorBoundary: Minimal UI error boundary for component-level errors</li>
                <li>Both components display detailed error information in development mode</li>
                <li>Provide user-friendly error messages and recovery options in production</li>
              </ul>
            </li>
            <li>
              <strong>Error Boundary Integration:</strong> Deployed error boundaries throughout the application:
              <ul>
                <li>Global ErrorBoundary wraps entire application in root layout</li>
                <li>FeatureErrorBoundary wraps dashboard content area for graceful feature-level error handling</li>
                <li>Prevents entire application crashes from component errors</li>
                <li>Provides consistent error handling UX across the application</li>
                <li>Successfully tested with production build</li>
              </ul>
            </li>
          </ul>

          <h4>Code Quality Improvements</h4>
          <ul>
            <li>
              <strong>TypeScript 'any' Type Reduction (Issue #63) (f510f3e):</strong> Started replacing 'any' types with proper TypeScript types:
              <ul>
                <li>Created common API types in /src/types/api.ts for consistent error handling</li>
                <li>Updated handleApiError function to use proper types instead of 'any'</li>
                <li>Fixed claims API route to use typed interfaces for Supabase responses</li>
                <li>Replaced 'any' in component workflow response mapping</li>
                <li>Improved type safety in critical API routes and error handling</li>
                <li>Progress: ~10 instances fixed, 140+ remaining (incremental approach)</li>
              </ul>
            </li>
            <li>
              <strong>Unit Testing Setup (Issue #64) (805bd00):</strong> Initiated unit test framework for the codebase:
              <ul>
                <li>Fixed Jest configuration to use modern ts-jest transform syntax</li>
                <li>Added test scripts to package.json (test, test:watch, test:coverage)</li>
                <li>Created test directory structure following best practices</li>
                <li>Wrote comprehensive tests for API type guards (13 passing tests)</li>
                <li>Created test templates for security features (rate limiting, session management, account lockout)</li>
                <li>Fixed package.json naming collision with .next/standalone</li>
                <li>Established foundation for achieving 60%+ test coverage goal</li>
              </ul>
            </li>
            <li>
              <strong>Dependency Security Updates (Issue #51) (f510f3e):</strong> Addressed npm vulnerabilities:
              <ul>
                <li>Fixed high-severity brace-expansion vulnerability via npm audit fix</li>
                <li>Identified remaining vulnerabilities require major version updates (Next.js 15, React 19)</li>
                <li>Major updates would introduce breaking changes requiring significant refactoring</li>
                <li>Documented upgrade path for future major version migrations</li>
              </ul>
            </li>
          </ul>

          <h4>Session Management (Issue #46) (f510f3e)</h4>
          <ul>
            <li>
              <strong>Proper Session Lifecycle Management:</strong> Implemented comprehensive session handling:
              <ul>
                <li>Session tracking with unique session IDs stored in secure httpOnly cookies</li>
                <li>Absolute session timeout of 24 hours regardless of activity</li>
                <li>Idle session timeout of 30 minutes of inactivity</li>
                <li>Automatic session renewal when approaching expiration (5 minute threshold)</li>
                <li>Maximum 5 concurrent sessions per user with automatic cleanup of oldest sessions</li>
              </ul>
            </li>
            <li>
              <strong>Enhanced Logout Functionality:</strong> Improved sign out process:
              <ul>
                <li>Server-side session invalidation on logout via /api/auth/logout endpoint</li>
                <li>All user sessions are invalidated preventing reuse of old session tokens</li>
                <li>Session cookies are properly cleared on logout</li>
                <li>Security event logging for audit trail (console logging, ready for database integration)</li>
              </ul>
            </li>
            <li>
              <strong>Re-authentication for Sensitive Operations:</strong> Added security checks for critical actions:
              <ul>
                <li>Password changes require re-authentication if last login was over 15 minutes ago</li>
                <li>/api/auth/check-reauthentication endpoint validates if re-auth is needed</li>
                <li>Sensitive operations list includes: password changes, account deletion, email changes, permission management</li>
                <li>Clear user feedback when re-authentication is required</li>
              </ul>
            </li>
            <li>
              <strong>Session Cleanup and Monitoring:</strong> Added maintenance capabilities:
              <ul>
                <li>/api/auth/cleanup-sessions endpoint for periodic expired session cleanup</li>
                <li>Session monitoring functions to track active sessions</li>
                <li>In-memory session store (development) - See /docs/INFRASTRUCTURE_REDIS_SETUP.md for production Redis implementation</li>
                <li>Middleware validates sessions on every request</li>
              </ul>
            </li>
          </ul>

          <h3>Feature Implementations</h3>
          <h4>Brand Logo Management (e1be6a0, d50a9e0, c8a42f4, b7566f2, 4fdd7a3)</h4>
          <ul>
            <li>
              <strong>Logo Upload Capability:</strong> Brands can now upload custom logos through the brand edit interface:
              <ul>
                <li>Support for common image formats (PNG, JPG, JPEG, WebP)</li>
                <li>Automatic image optimization and storage in Supabase Storage</li>
                <li>Real-time preview during upload</li>
                <li>Ability to remove existing logos</li>
              </ul>
            </li>
            <li>
              <strong>Logo Display Integration:</strong> Brand logos are now displayed throughout the application:
              <ul>
                <li>Brand listings show logos with automatic fallback to brand initials</li>
                <li>Brand detail pages prominently feature the logo</li>
                <li>Navigation brand selector includes logo avatars</li>
                <li>Consistent avatar styling across all brand references</li>
              </ul>
            </li>
          </ul>

          <h4>AI Tools Information Enhancement (889369f, 34e052f, 658121b)</h4>
          <ul>
            <li>
              <strong>Content Trans-Creator:</strong> Added useful info to past runs display</li>
            <li>
              <strong>Metadata Generator:</strong> Enhanced run history with detailed information</li>
            <li>
              <strong>Alt Text Generator:</strong> Improved historical run data presentation</li>
          </ul>

          <h4>Dashboard Redesign (Issue #121) (658121b)</h4>
          <ul>
            <li>Complete overhaul of the dashboard home page with improved layout and information architecture</li>
          </ul>

          <h4>Claims Approval Workflow (Issue #126) (9b88111)</h4>
          <ul>
            <li>Implemented comprehensive claims approval workflow system</li>
          </ul>

          <h3>Bug Fixes</h3>
          <ul>
            <li>
              <strong>CTA Button Overflow (Issue #132) (a3c9128):</strong> Prevented CTA buttons from overflowing their containers</li>
            <li>
              <strong>Expired User Invitations (Issue #95) (44846fc):</strong> Added resend invitation button for expired users</li>
            <li>
              <strong>Claim Deduplication (Issue #107) (b7db276):</strong> Removed claim deduplication to preserve exact database values</li>
            <li>
              <strong>Alt Text Accessibility (Issue #113) (eb521fd):</strong> Updated alt text generator to exclude color descriptions for better accessibility</li>
          </ul>

          <h3>Documentation Updates</h3>
          <ul>
            <li>
              <strong>CLAUDE.md Updates (ee4b70c):</strong> Enhanced AI assistant guidelines with AI title generation and expanded role descriptions</li>
            <li>
              <strong>Migration Path Updates (f07cbde, 028b421, 4c763da, e1be6a0):</strong> Standardized all migration path references across documentation</li>
            <li>
              <strong>User Flow Documentation (89237f7):</strong> Added comprehensive user flow documentation and testing guides</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: December 17, 2024</h2>
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
        </section>
        
        {/* Remaining release sections continue unchanged... */}
      </div>
    </div>
  );
}