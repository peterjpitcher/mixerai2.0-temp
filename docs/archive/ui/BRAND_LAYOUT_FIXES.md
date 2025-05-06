# Brand Layout and Component Fixes for MixerAI 2.0

This document outlines the plan to address layout issues and restore missing components in the MixerAI 2.0 application, focusing on the brand creation and editing interfaces.

## 1. Current Issues

### 1.1 Missing Two-Column Layout
- The brand edit and creation pages have lost their two-column layout structure
- Currently, both pages render all content in a single column, leading to poor information hierarchy and user experience
- Console logs show users actively trying to use these pages with layout issues

### 1.2 Missing API Routes
- Console logs show consistent `POST /api/scrape-url 404` errors
- This missing endpoint is critical for the brand identity generation feature
- Without this API route, users are unable to generate brand identities from website URLs

### 1.3 Missing Error Handling Pages
- Error pages have been removed from the codebase:
  - `src/app/_error.tsx`
  - `src/app/global-error.tsx`
  - Other error-related components

## 2. Implementation Plan

### 2.1 Two-Column Layout Component
1. **Create Layout Component**
   - Implement a reusable `TwoColumnLayout` component in `src/components/layout/two-column-layout.tsx`
   - The component will accept left and right content, with configurable column widths
   - Ensure responsive behavior (stacking on mobile, side-by-side on desktop)

2. **Update Brand Pages**
   - Implement the layout in `/brands/[id]/edit/page.tsx`
   - Implement the layout in `/brands/new/page.tsx`
   - Structure:
     - Left column: Form fields, user inputs, main controls
     - Right column: Preview panels, help content, additional information

3. **Ensure Responsive Design**
   - Use Tailwind's responsive classes for proper mobile/desktop transitions
   - Test across various screen sizes

### 2.2 Restore Missing API Routes

1. **Scrape URL Endpoint**
   - Recreate `src/app/api/scrape-url/route.ts`
   - Implement with proper build-time detection from OPENAI_FIXES.md
   - Include error handling and fallback responses
   - Ensure compatibility with both local development and Vercel deployments

2. **Implementation Details**
   - Use JSDOM for HTML parsing
   - Extract relevant content from websites
   - Support proper error handling when scraping fails
   - Follow the standardized API response format:
     ```typescript
     // Success response
     return NextResponse.json({ 
       success: true, 
       content: extractedContent
     });

     // Error response
     return NextResponse.json(
       { success: false, error: 'Specific error message' },
       { status: errorCode }
     );
     ```

### 2.3 Restore Error Pages

1. **Custom Error Pages**
   - Recreate `src/app/_error.tsx` - Next.js error page
   - Recreate `src/app/global-error.tsx` - Global error handling component
   - Ensure these components provide useful error feedback to users

2. **Integration with Application**
   - Ensure error boundaries properly catch and display errors
   - Use consistent styling with the rest of the application

## 3. Testing Process

1. **Local Development**
   - Test all components with `npm run dev`
   - Verify API routes respond properly
   - Confirm layouts render correctly across screen sizes

2. **Production Build**
   - Verify build completes successfully with `npm run build`
   - Ensure no 404 errors in console logs
   - Validate component behavior in production mode

3. **Cross-Browser Compatibility**
   - Test in Chrome, Firefox, and Safari
   - Ensure consistent layout and functionality

## 4. Implementation Order

1. First: Restore the missing API route to fix 404 errors
2. Second: Implement the two-column layout component
3. Third: Apply the layout to brand pages
4. Fourth: Add missing error pages
5. Finally: Comprehensive testing

## 5. Expected Outcomes

- Brand pages will display proper two-column layout
- API routes will function correctly without 404 errors
- Error pages will provide graceful failure modes
- User experience will be significantly improved for brand creation/editing workflows 