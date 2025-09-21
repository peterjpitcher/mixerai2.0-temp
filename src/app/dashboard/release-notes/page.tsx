import { Separator } from "@/components/ui/separator";
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
        
        {/* Release: 26 June 2025 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: 26 June 2025 - Critical Security & Performance Update</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Major security and performance release addressing 47 critical issues identified in comprehensive discovery analysis. This release significantly improves application security, performance, and stability for production deployment.
          </p>

          <h3>🔒 Security Enhancements</h3>
          <ul>
            <li><strong>SQL Injection Prevention</strong> - Fixed vulnerable LIKE queries across 5 API endpoints by implementing proper escaping [fix-critical-issues]</li>
            <li><strong>CSRF Protection</strong> - Implemented double-submit cookie pattern protecting 48 mutation endpoints from cross-site request forgery [fix-critical-issues]</li>
            <li><strong>Authentication Optimization</strong> - Middleware now skips public routes, reducing unnecessary auth checks [fix-critical-issues]</li>
          </ul>

          <h3>⚡ Performance Improvements</h3>
          <ul>
            <li><strong>Database Indexes</strong> - Added 45+ critical indexes resulting in 10-100x query performance improvement [fix-critical-issues]</li>
            <li><strong>N+1 Query Fix</strong> - Optimized user fetching from O(n²) to O(n) complexity, 30x faster for large datasets [fix-critical-issues]</li>
            <li><strong>Parallel Data Loading</strong> - Implemented Promise.all() patterns reducing request time by 66% [fix-critical-issues]</li>
          </ul>

          <h3>🛡️ Infrastructure & Reliability</h3>
          <ul>
            <li><strong>TypeScript Type Safety</strong> - Generated proper types from Supabase database, eliminating all 'any' types [fix-critical-issues]</li>
            <li><strong>React Error Boundaries</strong> - Comprehensive error handling preventing application crashes with graceful recovery [fix-critical-issues]</li>
            <li><strong>Health Check Endpoint</strong> - New /api/health endpoint for production monitoring with service dependency checks [fix-critical-issues]</li>
            <li><strong>Azure OpenAI Configuration</strong> - Removed hardcoded deployment names, now uses environment variables [fix-critical-issues]</li>
          </ul>

          <h3>🎨 User Experience</h3>
          <ul>
            <li><strong>Loading States</strong> - Comprehensive loading feedback across all components with skeletons and spinners [fix-critical-issues]</li>
            <li><strong>Loading Button Component</strong> - New LoadingButton with built-in states for forms and actions [fix-critical-issues]</li>
            <li><strong>Enhanced Error Messages</strong> - User-friendly error states with recovery options throughout [fix-critical-issues]</li>
          </ul>

          <h3>🔧 Developer Experience</h3>
          <ul>
            <li><strong>Custom Hooks</strong> - New useLoadingState, useAsyncState, and useFormState hooks for consistent state management [fix-critical-issues]</li>
            <li><strong>Error Tracking Integration</strong> - Client and server-side error tracking with CSRF-protected endpoint [fix-critical-issues]</li>
            <li><strong>Monitoring Scripts</strong> - Health check script for automated monitoring and alerts [fix-critical-issues]</li>
          </ul>

          <h3>📚 Documentation</h3>
          <ul>
            <li>Comprehensive implementation guides for CSRF protection, error boundaries, and loading states</li>
            <li>Database optimization scripts with performance benchmarks</li>
            <li>Production deployment checklist and monitoring setup guide</li>
          </ul>

          <p className="text-sm text-muted-foreground mt-4">
            <strong>Note:</strong> Database indexes must be applied before deployment. See scripts/add-critical-indexes.sql and scripts/add-user-query-indexes.sql
          </p>
        </section>
        
        {/* Release: 20 June 2025 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: 20 June 2025</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Priority UI/UX and functionality fixes focusing on dashboard improvements, navigation reliability, and claims system enhancements.
          </p>

          <h3>🎯 Key Features</h3>
          <ul>
            <li><strong>Dashboard Team Activity</strong> - Simplified display grouped by time periods (Today, Yesterday, This Week, Last Week) showing last 30 changes [39e0491]</li>
            <li><strong>Claims Multiple Products/Ingredients</strong> - Enabled tagging multiple products and ingredients per claim using junction tables [39e0491]</li>
            <li><strong>Environment Validation</strong> - Added production environment variable validation for Vercel deployments [39e0491]</li>
            <li><strong>Global Error Boundary</strong> - Added production-ready error handling for better user experience [39e0491]</li>
          </ul>

          <h3>✨ Improvements</h3>
          <ul>
            <li><strong>Dashboard Layout</strong> - Removed metric cards for cleaner, more focused interface [39e0491]</li>
            <li><strong>Stalled Content Display</strong> - Enhanced formatting with visual hierarchy and status badges [39e0491]</li>
            <li><strong>Team Activity Panel</strong> - Made full height of page for better visibility [39e0491]</li>
            <li><strong>Navigation Templates</strong> - Fixed content templates not showing due to role detection timing [39e0491]</li>
            <li><strong>Claims UI Spacing</strong> - Added proper spacing between filters and tables on preview page [39e0491]</li>
            <li><strong>Search Functionality</strong> - Fixed MultiSelectCheckboxCombobox search by using label instead of value [39e0491]</li>
          </ul>

          <h3>🐛 Bug Fixes</h3>
          <ul>
            <li><strong>Delete Brand Action</strong> - Fixed event propagation causing navigation instead of delete dialog [39e0491]</li>
            <li><strong>Products API Permissions</strong> - Corrected permission checks for master claim brands [39e0491]</li>
            <li><strong>Claims Product Display</strong> - Fixed empty results by increasing fetch limits and checking correct permissions [39e0491]</li>
            <li><strong>React Ref Warnings</strong> - Fixed AlertDialog components with proper forwardRef implementation [39e0491]</li>
            <li><strong>Claims Type Restriction</strong> - Limited claim types to "allowed" and "disallowed" only [39e0491]</li>
          </ul>

          <h3>📚 Documentation</h3>
          <ul>
            <li>Created MixerAI 2.0 migration announcement email template</li>
            <li>Added claims system review and type restriction discovery documentation</li>
            <li>Updated CLAUDE.md with latest command references</li>
          </ul>
        </section>

        {/* Release: 18 June 2025 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: 18 June 2025</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This release addresses multiple priority issues identified through comprehensive application review, focusing on accessibility, UI consistency, functionality enhancements, and code quality improvements.
          </p>

          <h3>🎯 Key Features</h3>
          <ul>
            <li><strong>Accessibility Compliance</strong> - Full WCAG 2.1 AA compliance for touch targets across the application (Issues #91, #94) [354aaaa]</li>
            <li><strong>Content Due Dates</strong> - Comprehensive deadline management system for content publishing (Issue #105) [1795d65]</li>
            <li><strong>Email Notifications</strong> - Full email notification system with user preferences (Issue #101) [1795d65]</li>
            <li><strong>Content Regeneration</strong> - Regenerate content at any workflow step with feedback capture (Issue #102) [1795d65]</li>
            <li><strong>Batch Processing UI</strong> - Enhanced history displays for all AI tools (Issues #110, #111, #112) [1795d65]</li>
          </ul>

          <h3>✨ Improvements</h3>
          <ul>
            <li><strong>Mobile Responsiveness</strong> - Optimised table displays with responsive column hiding (Issue #92) [354aaaa]</li>
            <li><strong>UI Layout Fixes</strong> - Fixed CTA button overflow in workflow creation (Issue #132) [354aaaa]</li>
            <li><strong>Content Access Control</strong> - Restricted editing of approved/published content (Issue #100) [1795d65]</li>
            <li><strong>Team Activity Feed</strong> - Condensed display with proper date formatting [df5bd62]</li>
            <li><strong>Code Quality</strong> - Removed all large blocks of commented code (Issue #69) [1795d65]</li>
            <li><strong>Database Migrations</strong> - Consolidated all migrations into single squashed file [1795d65]</li>
          </ul>

          <h3>🐛 Bug Fixes</h3>
          <ul>
            <li><strong>Missing Database Function</strong> - Added normalize_website_domain function [4bd1d3e]</li>
            <li><strong>API Authentication</strong> - Fixed credentials include for proper authentication [dbf70dd]</li>
            <li><strong>AI Suggestions</strong> - Fixed template variable interpolation (Issue #171) [1c9d018]</li>
          </ul>

          <h3>📚 Documentation</h3>
          <ul>
            <li>Added comprehensive application review documentation [2928b2e, 869e679]</li>
            <li>Created migration status report and cleanup procedures</li>
            <li>Updated all documentation to reflect latest changes</li>
          </ul>
        </section>

        {/* Release: 17 June 2025 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: 17 June 2025</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This release introduces comprehensive security enhancements, performance optimisations, and implements critical infrastructure improvements including error boundaries and testing framework.
          </p>

          <h3>🎯 Key Features</h3>
          <ul>
            <li><strong>Global Rate Limiting</strong> - Centralised middleware-based rate limiting with different limits per endpoint type (Issue #139) [f510f3e]</li>
            <li><strong>Account Security</strong> - Brute-force protection with account lockout after 5 failed attempts (Issue #140) [f510f3e]</li>
            <li><strong>Session Management</strong> - Comprehensive session lifecycle with timeouts and re-authentication (Issue #46) [f510f3e]</li>
            <li><strong>Error Boundaries</strong> - React error boundaries for graceful error handling (Issue #74) [f510f3e]</li>
            <li><strong>Unit Testing Framework</strong> - Jest configuration with TypeScript support (Issue #64) [805bd00]</li>
            <li><strong>Brand Logo Management</strong> - Upload and display custom brand logos throughout the application [e1be6a0, d50a9e0]</li>
          </ul>

          <h3>✨ Improvements</h3>
          <ul>
            <li><strong>Performance Optimisation</strong> - Fixed N+1 queries in Claims API, added pagination (Issues #138, #54) [f510f3e]</li>
            <li><strong>Password Policy</strong> - Enhanced requirements: 12+ characters with mixed case, numbers, and symbols [f510f3e]</li>
            <li><strong>TypeScript Types</strong> - Replaced 'any' types with proper interfaces (Issue #63) [f510f3e]</li>
            <li><strong>Dashboard Redesign</strong> - Complete overhaul with improved layout (Issue #121) [658121b]</li>
            <li><strong>Claims Workflow</strong> - Implemented approval workflow system (Issue #126) [9b88111]</li>
            <li><strong>AI Tools Enhancement</strong> - Added detailed information to tool run histories [889369f, 34e052f]</li>
          </ul>

          <h3>🐛 Bug Fixes</h3>
          <ul>
            <li><strong>CTA Button Overflow</strong> - Prevented buttons from overflowing containers (Issue #132) [a3c9128]</li>
            <li><strong>Expired Invitations</strong> - Added resend button for expired users (Issue #95) [44846fc]</li>
            <li><strong>Claim Deduplication</strong> - Preserved exact database values (Issue #107) [b7db276]</li>
            <li><strong>Alt Text Accessibility</strong> - Excluded colour descriptions (Issue #113) [eb521fd]</li>
            <li><strong>Dependency Security</strong> - Fixed brace-expansion vulnerability (Issue #51) [f510f3e]</li>
          </ul>

          <h3>📚 Documentation</h3>
          <ul>
            <li>Updated CLAUDE.md with AI title generation and role descriptions [ee4b70c]</li>
            <li>Standardised migration path references across all documentation [f07cbde, 028b421]</li>
            <li>Added comprehensive user flow documentation and testing guides [89237f7]</li>
          </ul>
        </section>

        {/* Release: 17 December 2024 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: 17 December 2024</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Complete dashboard overhaul with dynamic interface and critical permission system fixes.
          </p>

          <h3>🎯 Key Features</h3>
          <ul>
            <li><strong>Team Activity Feed</strong> - Live feed showing content creation, updates, and approvals [2bcf416]</li>
            <li><strong>Stalled Content Module</strong> - Highlights content not updated in 7+ days (yellow) or 30+ days (red) [2bcf416]</li>
            <li><strong>My Tasks Module</strong> - Robust client-side component with dedicated API endpoint</li>
            <li><strong>Visual Polish</strong> - Professional UI matching design specifications</li>
          </ul>

          <h3>🐛 Bug Fixes</h3>
          <ul>
            <li><strong>Permissions System</strong> - Fixed brand-specific users unable to see data (corrected user_metadata lookup)</li>
            <li><strong>Database Functions</strong> - Removed calls to non-existent get_user_details function</li>
          </ul>
        </section>

        {/* Release: Date Template */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: {currentDate}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This release resolves critical bugs and enhances system stability.
          </p>

          <h3>🎯 Key Features</h3>
          <ul>
            <li><strong>User Management API</strong> - Fixed database functions for user details fetching and updating</li>
            <li><strong>SVG Image Support</strong> - Enabled SVG avatars from api.dicebear.com with proper Next.js configuration</li>
          </ul>

          <h3>🐛 Bug Fixes</h3>
          <ul>
            <li><strong>Database Permissions</strong> - Added SECURITY DEFINER clause to fix auth.users table access</li>
            <li><strong>Column References</strong> - Corrected raw_user_meta_data column name (was raw_app_meta_data)</li>
            <li><strong>Role Aliasing</strong> - Fixed globalRole alias in get_user_details function</li>
          </ul>
        </section>

        {/* Release: Architectural Refactor */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: Major Architectural Refactor</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Major architectural release resolving systemic security vulnerabilities, performance bottlenecks, and improving overall stability. Full code review identified and resolved 28 critical issues.
          </p>

          <h3>🎯 Key Features</h3>
          <ul>
            <li><strong>Server-Side Authorisation</strong> - Migrated all pages to Server Components with secure server-side checks</li>
            <li><strong>Performance Optimisation</strong> - Eliminated inefficient client-side data fetching patterns</li>
            <li><strong>Database Transactions</strong> - Added atomic operations for multi-step API operations</li>
            <li><strong>Component Refactoring</strong> - Split monolithic components into manageable child components</li>
          </ul>

          <h3>✨ Improvements</h3>
          <ul>
            <li><strong>Content API</strong> - Fixed N+1 query making 50+ database calls, now uses bulk fetching</li>
            <li><strong>Brand Detail API</strong> - Reduced from 6+ queries to single efficient database function</li>
            <li><strong>User Detail API</strong> - Replaced N+1 queries with get_user_details function</li>
            <li><strong>Centralised Services</strong> - Unified Supabase client initialisation</li>
          </ul>
        </section>

        {/* Release: Brand Creation Fix */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: Brand Creation Workflow Fix</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Critical fixes ensuring administrators can reliably create new brands.
          </p>

          <h3>🐛 Bug Fixes</h3>
          <ul>
            <li><strong>Invalid Role Enum</strong> - Fixed RPC attempting to assign invalid 'brand_admin' role [7fed487]</li>
            <li><strong>Missing Column</strong> - Removed reference to non-existent created_by column</li>
            <li><strong>Direct Approach</strong> - Replaced faulty RPC with direct Supabase calls for brand creation [7fed487]</li>
          </ul>

          <h3>✨ Improvements</h3>
          <ul>
            <li>Two-step process: Insert brand record, then assign admin permissions</li>
            <li>Proper error handling and database schema alignment</li>
          </ul>
        </section>

        {/* Release: Password Reset */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: Password Reset Enhancement</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Definitive fix for Supabase password reset functionality with secure PKCE flow.
          </p>

          <h3>🎯 Key Features</h3>
          <ul>
            <li><strong>PKCE Authentication</strong> - Dedicated client-side callback page at /auth/confirm [3a27e26]</li>
            <li><strong>Secure Session Handling</strong> - Proper code_verifier persistence across redirects [3a27e26]</li>
            <li><strong>Simplified Flow</strong> - Removed complex token-parsing logic from update page [3a27e26]</li>
          </ul>

          <h3>✨ Improvements</h3>
          <ul>
            <li>Isolated authentication handshake from React lifecycle [3a27e26]</li>
            <li>OAuth 2.0 PKCE best practices implementation</li>
            <li>Reliable and secure password reset experience</li>
          </ul>
        </section>

        {/* Release: Template Form Fix */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: Content Template Management</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Fixes for creating and editing content templates with consistent field structures.
          </p>

          <h3>🐛 Bug Fixes</h3>
          <ul>
            <li><strong>Payload Structure</strong> - Fixed inconsistent inputFields and outputFields handling [9c33f24]</li>
            <li><strong>API Alignment</strong> - POST endpoint now matches PUT endpoint structure</li>
            <li><strong>Field Storage</strong> - Proper reconstruction of nested fields object for database [9c33f24]</li>
          </ul>
        </section>

        {/* Release: 5 June 2025 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: 5 June 2025</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Critical bug fixes for content editing interface and template field handling.
          </p>

          <h3>🐛 Bug Fixes</h3>
          <ul>
            <li><strong>Template Fields Error</strong> - Fixed TypeError when accessing undefined template.fields.outputFields</li>
            <li><strong>Data Structure Mismatch</strong> - Corrected template field nesting for proper display</li>
            <li><strong>Output Fields Display</strong> - Fixed missing "Generated Output Fields" card</li>
          </ul>

          <h3>✨ Improvements</h3>
          <ul>
            <li>Enhanced conditional checks for template field existence</li>
            <li>Data transformation to align API response with component expectations</li>
            <li>Full restoration of content editing functionality</li>
          </ul>
        </section>

        {/* Release: 4 June 2025 - Navigation Updates */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: 4 June 2025 - Navigation & Permissions</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Enhanced content creation workflow with smart brand filtering and corrected navigation permissions.
          </p>

          <h3>🎯 Key Features</h3>
          <ul>
            <li><strong>Smart Brand Filtering</strong> - Only shows brands with active workflows for selected templates</li>
            <li><strong>Proactive Validation</strong> - Prevents invalid brand/template combinations before selection</li>
            <li><strong>Navigation Permissions</strong> - Corrected visibility for Editor role users</li>
            <li><strong>Dynamic Sub-menus</strong> - "Create Content" items filtered by user permissions</li>
          </ul>

          <h3>✨ Improvements</h3>
          <ul>
            <li>Disabled form with guidance message when no valid brands available</li>
            <li>Workflow API enhancement for template_id filtering</li>
            <li>New endpoint for fetching brand administrators</li>
          </ul>
        </section>

        {/* Release: 4 June 2025 - Content Generation */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Release: 4 June 2025 - Content Generation</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Major enhancements to content generation capabilities, UI/UX improvements, and build stability fixes.
          </p>

          <h3>🎯 Key Features</h3>
          <ul>
            <li><strong>Field Retry Mechanism</strong> - Individual regeneration buttons for each output field [09947b7]</li>
            <li><strong>Regenerate All</strong> - Option to regenerate entire content including title [09947b7]</li>
            <li><strong>AI Template Descriptions</strong> - Real Azure OpenAI integration for descriptions</li>
            <li><strong>Enhanced Retry Context</strong> - Comprehensive brand context for quality regeneration [09947b7]</li>
          </ul>

          <h3>✨ Improvements</h3>
          <ul>
            <li><strong>Toast Notifications</strong> - Moved to top-right with solid white background [2954b5e]</li>
            <li><strong>Navigation Highlighting</strong> - Correct active state for "Create Content" items</li>
            <li><strong>API Structure</strong> - Flattened template field structure for consistency</li>
            <li><strong>Type Safety</strong> - Aligned ContentTemplate types across components</li>
            <li><strong>Build Stability</strong> - Added Suspense boundary for useSearchParams</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
