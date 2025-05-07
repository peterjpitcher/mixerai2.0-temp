# MixerAI 2.0 - UI and Authentication Updates

## Changes Made

### 1. Dashboard UI Update
- Removed the Analytics tab from the root dashboard page
- Simplified the tab interface to only include the Overview tab
- Changed the TabsList grid from grid-cols-2 to grid-cols-1

### 2. User Authentication Integration
- Updated the users API route to connect directly to Supabase authentication data
- Added integration with Supabase Auth Admin API to fetch real user data
- Merged authentication user data with profile information from the profiles table
- Enhanced the user data structure to include:
  - User metadata from Supabase Auth
  - Last sign-in timestamp
  - Role information from user_brand_permissions
  - Fallback avatar generation for users without profile images

## Implementation Details

### API Route Update
The `/api/users` route now:
1. Fetches all users from Supabase Auth Admin API
2. Retrieves associated profile data from the profiles table
3. Merges the data to provide complete user information
4. Determines the highest role for each user based on permissions

### User Data Structure
```typescript
{
  id: string,
  full_name: string,
  email: string,
  avatar_url: string,
  role: string,
  created_at: string,
  last_sign_in_at: string,
  brand_permissions: Array<{
    id: string,
    brand_id: string,
    role: 'admin' | 'editor' | 'viewer'
  }>
}
```

### Routing Structure Issues Fix
- Fixed route conflicts between the `/dashboard/*` routes and the `/(dashboard)/*` route group
- Implemented proper redirects to maintain backward compatibility 

## Benefits
- Live authentication data is now visible in the Users interface
- Simplified dashboard UI focuses on the most important content
- More complete user information for better user management
- Consistent user experience between local and production environments
- Fixed routing structure prevents duplicate layouts and navigation elements

## Requirements
- Requires SUPABASE_SERVICE_ROLE_KEY to be set in environment variables
- Needs the auth.admin.listUsers permission for the service role

# MixerAI 2.0 Documentation

## Recent Updates

### Unified Navigation System

We've implemented a comprehensive navigation system update to improve the user experience:

1. **Framework-Level Redirects**
   - Added Next.js redirects in next.config.js for better performance
   - Replaced client-side redirects with server-side redirects
   - Improved routing for content type pages (/dashboard/content/{type})

2. **Unified Navigation Component**
   - Created a new UnifiedNavigation component that replaces multiple competing navigation systems
   - Implemented expandable content type submenu for better organization
   - Uses Next.js useSelectedLayoutSegments() for accurate active state tracking
   - Supports automatic section expansion based on current route

3. **Dashboard Home Page**
   - Added a proper dashboard home page with quick access cards
   - Direct links to different content types
   - Improved organization of key features
   - Quick action buttons for common tasks

4. **Detailed Documentation**
   - Added comprehensive documentation in docs/NAVIGATION_SYSTEM.md
   - Guidelines for adding new navigation items
   - Best practices for future enhancements
   - Plans for automated testing

For more details, see the full documentation in [docs/NAVIGATION_SYSTEM.md](docs/NAVIGATION_SYSTEM.md).

### Brand UI Enhancements

We've implemented significant UI improvements to the brand creation and editing interfaces:

1. **Two-Column Layout**
   - Brand edit and new pages now use a responsive two-column layout
   - Left column contains form fields and controls
   - Right column shows brand preview and helpful information
   - Stacks vertically on mobile, side-by-side on desktop

2. **Card-Based Content Type Selection**
   - Improved content type selection with card-based interface
   - Each card shows the content type name and description
   - Visual indicators for selected content types
   - AI Taskforce managed indicator for governance

3. **Enhanced Brand Identity Generation**
   - Improved URL input for brand identity generation
   - Storage of input URLs for future reference
   - British English usage throughout the UI
   - Better field explanations for each section

4. **Agency Prioritization**
   - Color-coded badges for agency priority (high/medium/low)
   - Ability to adjust priority levels
   - Support for adding custom agencies
   - Proper storage of user-added agencies

5. **Missing API Routes**
   - Added the scrape-url API endpoint for web content extraction
   - Implemented build-time detection to provide mock data during builds

6. **Error Pages**
   - Added error.tsx and global-error.tsx for proper error handling
   - Consistent styling with the rest of the application

7. **Database Schema Updates**
   - Added website_urls column to brands table
   - Added user_added_agencies column to brands table

## Running the Application

1. **Development Mode**
   ```bash
   npm run dev
   ```
   This starts the application in development mode with hot reloading.

2. **Production Build**
   ```bash
   npm run build
   npm start
   ```
   This builds and starts the application in production mode.

3. **Database Migration**
   ```bash
   ./scripts/apply-website-urls-migration.sh
   ```
   Applies the migration to add the new columns to the brands table.

## API Routes

The application uses the following API routes:

- `GET /api/brands` - Get all brands
- `GET /api/brands/:id` - Get a specific brand
- `POST /api/brands` - Create a new brand
- `PUT /api/brands/:id` - Update a brand
- `DELETE /api/brands/:id` - Delete a brand
- `POST /api/brands/identity` - Generate brand identity using AI
- `POST /api/scrape-url` - Scrape content from a URL for AI processing

## Component Structure

1. **Layout Components**
   - `TwoColumnLayout` - Responsive two-column layout component

2. **Brand Components**
   - Brand edit page - `/brands/[id]/edit/page.tsx`
   - Brand new page - `/brands/new/page.tsx`
   - Brand detail page - `/brands/[id]/page.tsx`

3. **UI Components**
   - Card-based content type selection
   - Agency priority management
   - Custom agency dialog

## Database Schema

The brands table schema has been updated to include:

```sql
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS website_urls TEXT,
ADD COLUMN IF NOT EXISTS user_added_agencies JSONB;
```

These columns store:
- `website_urls` - The URLs used for brand identity generation
- `user_added_agencies` - Custom agencies added by users

## Future Enhancements

Planned improvements include:

1. Better integration with content workflows
2. Enhanced brand identity generation with more AI options
3. Improved user management and permissions
4. Additional content vetting features

## Azure OpenAI Integration

The MixerAI 2.0 application uses Azure OpenAI to generate brand identities, content, and other AI-powered features. The integration is managed through the `src/lib/azure/openai.ts` module.

### Required Environment Variables

For Azure OpenAI integration to work correctly, you need to set up the following environment variables:

```
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
```

### Debugging and Troubleshooting

The MixerAI 2.0 application includes several tools and enhanced logging to help troubleshoot issues, particularly with AI content generation:

### Diagnostic Scripts

1. **API Services Debug Script**
   - Located at `scripts/debug-api-services.js`
   - Tests multiple API endpoints in one run
   - Checks Azure OpenAI connectivity, workflow description generation, brand identity generation, and URL scraping
   - Provides detailed logs and a summary report
   - Usage: `node scripts/debug-api-services.js`

2. **Brand Identity Test Script**
   - Located at `scripts/test-brand-identity.js`
   - Tests the `/api/brands/identity` endpoint specifically
   - Creates a JSON file with the full results for inspection
   - Usage: `node scripts/test-brand-identity.js`

3. **Azure OpenAI Test Endpoint**
   - API endpoint at `/api/test-azure-openai`
   - Provides direct validation of Azure OpenAI connectivity
   - Shows authentication status, deployment details, and response times
   - Supports the `USE_LOCAL_GENERATION` environment variable for fallback testing

### Enhanced Logging

Critical areas of the application have been enhanced with detailed logging:

1. **Brand Identity Generation**
   - Input parameter logging (brandName, URLs, country, language)
   - API response status and content logging
   - Fallback mechanism detection 
   - Agency selection and priority debugging

2. **Workflow Description Generation**
   - Step name and content logging
   - Brand context validation
   - API request/response inspection
   - Error capture and detailed reporting

3. **URL Scraping**
   - Content extraction validation
   - Error handling with detailed messages
   - Build-time detection for Vercel deployments

### Common Issues and Solutions

#### Azure OpenAI Connection Issues

If Azure OpenAI integration is not working:

1. Check environment variables:
   ```
   AZURE_OPENAI_API_KEY=your_key_here
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_DEPLOYMENT=your_deployment_name
   ```

2. Enable local fallback if needed:
   ```
   USE_LOCAL_GENERATION=true
   ```

3. Verify the test endpoint is working:
   ```
   curl http://localhost:3001/api/test-azure-openai
   ```

#### Brand Identity Generation Issues

Common issues with brand identity generation:

1. **Missing parameters**: Ensure brandName and at least one URL are provided
2. **Invalid URLs**: Check that URLs are properly formatted with http/https
3. **Region-specific content**: Verify country and language parameters are correct
4. **Agency display**: If agencies aren't showing up, check the mapping from API to UI

#### API 404 Errors

If you encounter 404 errors:

1. Check that all API routes are properly implemented
2. Verify that the `/api/scrape-url` endpoint exists and is working
3. Try restarting the development server
4. Check the browser console for specific request failures

### Testing and Validation

To comprehensively test the application:

1. Run the debug scripts first to verify API functionality
2. Test the workflow generation feature which is known to work correctly
3. Check brand identity generation with the debug tools
4. Examine the log files for any specific error messages
5. Verify that country and language parameters are correctly passed

For more detailed troubleshooting, refer to the [Azure OpenAI Troubleshooting Guide](docs/AZURE_OPENAI_TROUBLESHOOTING.md).

## Brand Management

The brand management features include:

- Create and edit brands with basic information
- Generate comprehensive brand identity using AI from website URLs
- Country-specific content vetting agencies suggestions
- Tabbed interface separating basic details from AI-generated content

## Content Vetting Agencies

Content vetting agencies are displayed as a selectable list of checkboxes under the "Suggested Agencies for [Country]" section. When a brand identity is generated via AI, the system will suggest 10 relevant vetting agencies specific to the brand's country, industry, and content needs. These agencies are dynamically generated by the AI based on its analysis of the brand's website content and the selected country.

Users can select from these AI-generated suggested agencies to comply with relevant content regulations. The selected agencies are stored as a comma-separated list in the `content_vetting_agencies` field in the database.

## Brand Color Generation

The system now uses AI to analyze a brand's website and automatically generate an appropriate color that reflects the brand's visual identity. This color is:

- Generated when creating a new brand or regenerating brand identity information
- Stored as a HEX color code in the `brand_color` field in the database
- Used visually in the UI to identify the brand
- Editable via a color picker by the user if they wish to change it
- Customized specifically for each brand based on AI analysis of their website colors and design elements

The brand color enhances visual recognition and consistency throughout the application, making it easier for users to quickly identify and work with different brands.

## User Interface Components

### Brand Visualization Components

#### BrandIcon Component

A consistent way to display brand avatars throughout the application using the brand's color:

```typescript
// src/components/brand-icon.tsx
export function BrandIcon({ 
  name, 
  color = "#3498db", 
  size = "md", 
  className 
}: BrandIconProps) {
  // Implementation details
}
```

- **Features**:
  - Displays the first letter of the brand name in a circular avatar
  - Uses the brand's color for text and background (with opacity)
  - Supports different sizes (sm, md, lg)
  - Fully customizable through className prop
  - Falls back to default blue (#3498db) if no color is provided

- **Usage Examples**:
  - Brand cards in dashboard and brand listing
  - Brand selection dropdowns
  - Content listing where brand is displayed
  - Anywhere a brand needs visual identification

This component enhances visual recognition and consistency throughout the application, making it easier for users to quickly identify and work with different brands.

## Future Improvements

Potential future improvements include:

- Implementing retry logic for transient Azure OpenAI API errors
- Adding more detailed validation for environment variables at startup
- Enhancing the AI-generated content with additional examples and references 

## Workflow User Assignment

The MixerAI 2.0 application now supports assigning users to workflow stages during the workflow creation and editing process.

### Key Features

- **User Assignment by Email**: Users can be assigned to workflow stages by email addresses
- **Existing Users Recognition**: If an email belongs to an existing user, they are automatically assigned
- **User Invitation**: If an email doesn't match an existing user, an invitation is created
- **Role-Based Access**: Each workflow stage has an associated role (editor, admin, etc.)
- **Multiple Assignees**: Each workflow stage can have multiple assignees

### Technical Implementation

#### Database Schema

The workflow schema uses a JSONB column to store steps with assignees:

```json
{
  "steps": [
    {
      "id": 1,
      "name": "Draft Review",
      "description": "Initial review by the content author",
      "role": "editor",
      "approvalRequired": true,
      "assignees": [
        {"email": "user1@example.com", "id": "user-uuid-if-exists"},
        {"email": "user2@example.com", "id": "user-uuid-if-exists"}
      ]
    }
  ]
}
```

A separate `workflow_invitations` table tracks invitations for users not yet in the system:

```sql
CREATE TABLE workflow_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  step_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invite_token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(workflow_id, step_id, email)
);
```

#### User Interface

The workflow creation and editing pages include:

- Input field for entering assignee emails
- List of current assignees with removal option
- Email validation to ensure correct format
- Prevention of duplicate email assignments

#### API Implementation

The API handles:
1. Checking if an assignee email belongs to an existing user
2. Creating invitations for new users
3. Tracking assignee status in the workflow steps
4. Managing invitation lifecycle (pending, accepted, declined)

### Usage

1. Create or edit a workflow
2. Add steps as needed
3. For each step, enter email addresses to assign users
4. Save the workflow
5. Users will either:
   - See their assignments directly (if already in the system)
   - Receive an invitation email (if not yet a user)

### Future Enhancements

- Email notification system integration
- User invitation acceptance flow
- Assignment history tracking
- Reassignment capabilities 

## Workflow Management Enhancements

The workflow management in MixerAI 2.0 has been enhanced with several usability improvements:

### Key Features

#### Improved Role Selection
- **Role Checkboxes with Descriptions**: Replaced dropdown menu with visual checkbox cards
- **Role Context**: Each role now displays a description of its responsibilities
- **Visual Clarity**: Selected roles are highlighted with a border and background color

#### Step Reordering
- **Up/Down Controls**: Added buttons to move steps up or down in the workflow
- **Step Numbering**: Clear visual indicators of step order with numbered badges
- **Drag Handles**: Intuitive controls for adjusting workflow sequence

#### Optional Steps
- **Clearer Terminology**: Changed "Require approval" to "Optional step" for better clarity
- **Enhanced Description**: Added explanation of what optional steps mean in the workflow
- **Toggle Interface**: Simple checkbox toggle with descriptive label

#### Assignee Management
- **Improved Styling**: Assignee emails now use badges for better visibility
- **Easier Removal**: One-click removal of assignees from workflow steps
- **Simplified Addition**: Enter key support for quickly adding multiple assignees

#### Auto-generate Description
- **Brand Context Awareness**: Descriptions now consider brand language and geography
- **Improved Error Handling**: Better feedback when description generation fails
- **Optimized State Updates**: Prevents UI refreshes that could cause user position loss

### Technical Improvements

#### Azure OpenAI Integration
- **Fixed Client Configuration**: Proper endpoint construction for Azure OpenAI
- **Error Handling**: Detailed error information for troubleshooting
- **API Versioning**: Updated to use the latest API version for better compatibility

#### User Interface Enhancements
- **Consistent Styling**: Harmonized UI elements across new and edit workflow pages
- **Improved Layout**: Better spacing and visual hierarchy for workflow steps
- **Responsive Design**: Layout adjustments for different screen sizes

### Usage

1. Create or edit a workflow
2. Use the step reordering buttons to arrange workflow steps in the desired sequence
3. Select the appropriate role for each step using the descriptive checkbox cards
4. Toggle "Optional step" for steps that can be skipped in certain cases
5. Use the "Auto-generate" button to quickly create professional step descriptions
6. Add assignees by email to each step in the workflow
7. Remove assignees with a single click if needed

The enhanced workflow management provides a more intuitive, user-friendly interface that makes creating and managing complex content workflows simpler and more efficient. 

## Azure OpenAI Integration Fixes

The workflow description auto-generation feature has been enhanced with improved Azure OpenAI integration:

### Key Improvements

- **Simplified API Configuration**: Removed complex client setup in favor of direct fetch calls to Azure OpenAI
- **Comprehensive Error Handling**: Added detailed error handling with informative error messages
- **Diagnostic Tools**: Created testing endpoints and scripts to validate Azure OpenAI configuration
- **Troubleshooting Guide**: Added detailed documentation for common Azure OpenAI issues

### Implementation Changes

1. **Azure OpenAI Client Configuration**:
   - Updated the Azure OpenAI client to use the correct API endpoint format
   - Fixed authentication header setup
   - Added environment variable validation

2. **Frontend Error Handling**:
   - Added pre-flight checks to verify Azure OpenAI configuration
   - Improved error message display
   - Added detailed logging for troubleshooting

3. **Testing and Diagnostics**:
   - Created `/api/test-azure-openai` endpoint for quick configuration testing
   - Added `scripts/test-azure-openai.js` for command-line testing
   - Enhanced error reporting with specific troubleshooting steps

### Technical Considerations

When using the Azure OpenAI API, these points are critical:

1. The endpoint URL format must be: `https://your-resource-name.openai.azure.com`
2. Authentication requires the `api-key` header (not `Authorization`)
3. API calls need to specify the deployment name in the URL path
4. The API version (`2023-05-15`) must be included as a query parameter

For detailed troubleshooting information, refer to the [Azure OpenAI Troubleshooting Guide](docs/AZURE_OPENAI_TROUBLESHOOTING.md). 

## Testing and Debugging Tools

### OpenAI Testing Tools

MixerAI 2.0 includes a dedicated page for testing and debugging the Azure OpenAI integration at `/openai-test`. This page provides various tools to help developers:

- Test brand identity generation
- Test content generation
- Test Azure OpenAI connectivity
- View environment configuration
- Detect whether content is truly AI-generated or uses fallback templates

These tools are essential for diagnosing issues with AI content generation and verifying that Azure OpenAI is properly configured and working. For detailed information on using these tools, see [OPENAI_TESTING_TOOLS.md](docs/OPENAI_TESTING_TOOLS.md).

Key features:
- AI versus template detection through heuristic analysis
- Timing information for performance monitoring
- Raw API response inspection
- Direct API testing for any endpoint
- Environment configuration display 

## UI Components

### Footer and Release Notes

The application now includes a footer component with links to important pages:

- **Implementation**: The footer is implemented in `src/components/layout/root-layout-wrapper.tsx` and appears on all main pages
- **Release Notes**: A dedicated page at `/release-notes` displays version history and changes
- **Other Pages**: Links to Privacy Policy, Terms of Service and GitHub repository

The footer provides users with easy access to key information and helps maintain a professional appearance across the application.

Release notes are structured with:
- Version numbering (following semantic versioning)
- Release dates
- Categorized changes (new features, improvements, bug fixes)

See `docs/RELEASE_NOTES.md` for details on how to update the release notes for future versions.

## Recent Changes

### UI and Layout Improvements (June 2023)

- **Accordion-style Grouping**: Implemented accordion UI for grouping workflows by brand
- **Auto-generate Feature**: Added workflow step description generation on both new and edit workflow pages
- **Culinary Role**: Added Culinary reviewer role for food content review
- **Footer and Release Notes**: Added application footer with release notes, privacy policy, and terms of service pages

## Brand Identity Generation

The application features a brand identity generation system that uses Azure OpenAI to analyze website URLs and generate comprehensive brand profiles.

### Brand Identity Generation Process

1. **URL Collection**: Users provide one or more URLs related to their brand
2. **AI Analysis**: The system analyzes the URLs to extract brand-related information
3. **Profile Generation**: A comprehensive brand profile is generated with:
   - Brand identity description
   - Tone of voice
   - Content guardrails
   - Recommended vetting agencies (with priority levels)
   - Suggested brand color (in hex format)

### Implementation Details

#### API Endpoints

- `/api/brands/identity` - Accepts brand name and URLs, returns generated brand identity content
- `/api/scrape-url` - Extracts content from URLs for analysis

#### Database Schema

The brands table includes these fields for storing brand identity information:

```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  website_url TEXT,
  website_urls TEXT, -- Stores multiple URLs as newline-separated strings
  country TEXT,
  language TEXT,
  brand_identity TEXT,
  tone_of_voice TEXT,
  guardrails TEXT,
  content_vetting_agencies TEXT,
  user_added_agencies JSONB, -- Stores custom agencies as JSON
  brand_color TEXT,
  approved_content_types JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Error Handling

The brand identity generation system includes several layers of error handling:

1. **Input Validation**: Validates brand name and URLs before processing
2. **API Fallbacks**: Falls back to template-based generation if OpenAI API fails
3. **JSON Parsing**: Robust parsing of AI responses with fallback mechanisms
4. **Default Values**: Provides sensible defaults for all fields if specific values can't be generated

### Regional Content Adaptation

A major enhancement to the brand identity generation system is the ability to adapt content based on regional context:

#### Country and Language Awareness

1. **Regional Context Parameters**:
   - The API now accepts `country` and `language` parameters
   - These parameters are used to generate region-specific content
   - Country codes are mapped to full country names for better context

2. **Localized Content Generation**:
   - Brand identity descriptions include country-specific references
   - Tone of voice recommendations adapt to regional communication styles
   - Content guardrails incorporate regional compliance considerations

3. **Country-Specific Vetting Agencies**:
   - The system provides relevant regulatory agencies based on country
   - Each country has its own set of recommended agencies
   - Agency priorities are adjusted based on brand industry and country
   - The Advertising Standards Authority (ASA) is always set as high priority for UK brands

4. **Fallback Templates with Regional Context**:
   - When AI generation fails, fallback templates include regional references
   - Different industry templates are available (food, technology, health, fashion, general)
   - Each template incorporates country-specific elements when available

#### Technical Implementation

1. **Build-Time Detection**:
   - The API includes sophisticated build-time detection
   - During builds, mock data is returned to prevent API calls
   - This ensures successful builds even when external services are unavailable

2. **Enhanced Debugging**:
   - Comprehensive logging throughout the generation process
   - Detailed error reporting for troubleshooting
   - Test script (`scripts/test-brand-identity.js`) for validating functionality

3. **URL Content Extraction**:
   - The `/api/scrape-url` endpoint extracts relevant content from brand websites
   - Extracts titles, descriptions, headings, and body content
   - Provides this information to the AI for more accurate brand analysis

### Recent Updates (August 2023)

- Enhanced brand identity generation with country and language context
- Fixed agency prioritization to ensure ASA always appears as high priority
- Implemented improved fallback templates with regional references
- Added comprehensive testing and debugging tools
- Created a dedicated URL scraping endpoint for website content extraction
- Improved error handling and logging throughout the generation process

## Brand Identity Multi-Language Support

The MixerAI 2.0 application now supports generating brand identity content in multiple languages based on the brand's country and language settings.

### Key Features

- **Language-Specific Generation**: Brand identity content is generated in the language specified in the brand settings
- **Explicit Language Instructions**: The OpenAI prompt now includes clear instructions to generate content in the specified language
- **Country-Language Awareness**: The system combines country and language information for more accurate localized content
- **UI Language Indicators**: The interface displays which language is being used for generation
- **Fallback Content Translation**: Even fallback templates now attempt to respect language preferences

### Technical Implementation

The language support is implemented through several components:

#### 1. API Prompt Enhancement

The `src/app/api/brands/identity/route.ts` now includes explicit language instructions in the OpenAI prompt:

```typescript
const userMessage = `Create a comprehensive brand identity profile for "${name}" based on the following website content:
    
${contents.map((content, i) => `URL ${i+1}: ${validUrls[i]}\n${content.substring(0, 500)}...\n`).join('\n')}

The brand operates in ${countryName} and communicates in ${language}.

IMPORTANT: Generate ALL content in the "${language}" language. The entire response must be written in this language.

// ... remaining prompt ...
```

#### 2. UI Language Indicators

The brand identity generation UI now shows which country and language the content will be generated for:

```tsx
<div className="text-xs text-muted-foreground mb-4 flex items-center">
  <Info className="h-3 w-3 mr-1" />
  <span>
    Content will be generated for {countryName} in {languageName}.
  </span>
</div>
```

#### 3. Response Handling

The response handling code has been updated to properly process content in any language:

```typescript
// Set brand with generated content
const updatedBrand = {
  ...brand,
  brand_identity: data.data.brandIdentity || '',
  tone_of_voice: data.data.toneOfVoice || '',
  guardrails: guardrailsContent,
  // ... other fields ...
};
```

### Benefits

- **Global Brand Support**: Better support for brands operating in non-English markets
- **Authentic Local Content**: Generated content that truly reflects local language and culture
- **Consistent Language Experience**: All brand identity elements (identity, tone, guardrails) in the same language
- **Improved AI Response Quality**: More accurate content by explicitly instructing the AI about language requirements

### Supported Languages

The system supports all languages available in the LANGUAGES constant, including but not limited to:

- English (various locales)
- Spanish
- French
- German
- Italian
- Portuguese
- Dutch
- And many more

The language selection is directly tied to the brand's language setting in the basic details tab.

## UI Consistency Between Brand Pages

We've ensured consistency between the brand creation and editing experiences:

### Standardized Layout
- Both `/brands/new` and `/brands/[id]/edit` pages now share identical layouts
- The same two-tab interface (Basic Details and Brand Identity)
- Consistent two-column layout in the Brand Identity tab

### Custom Agency Support
- Both pages now support adding, editing, and removing custom regulatory agencies
- Custom agencies include name, description, and priority settings
- Visual distinction between standard and custom agencies

### Error Handling Improvements
- Consistent handling of different response formats from the API
- Better fallback content generation with appropriate user notifications
- Clear validation messages for URL inputs
- Type-safe handling of guardrails content (array vs string)

## Authentication Implementation Updates

### Completed Work

Following our authentication strategy, we've completed the following tasks:

1. **API Route Protection**
   - Implemented `withAuth` and `withAuthAndMonitoring` wrappers for API routes
   - Migrated these API routes to use the wrappers:
     - `/api/brands` and related endpoints
     - `/api/content` and related endpoints
     - `/api/content-types`
     - `/api/workflows` and related endpoints
     - `/api/users` and related endpoints
   - Added authenticated user info to API responses where appropriate

2. **Database Security**
   - Created Row Level Security (RLS) policies in `migrations/auth-rls-policies.sql`
   - Added deployment script (`scripts/deploy-rls-policies.sh`) for applying policies
   - Created test script (`scripts/test-rls-policies.sh`) to verify policies

3. **User Permission Checks**
   - Added role-based permission checks to sensitive operations
   - Enhanced user invite API to check admin privileges
   - Added tracking of who invited users and assigned permissions

### Technical Implementation Details

1. **Authentication Middleware**
   The middleware in `src/middleware.ts` checks for user authentication on protected routes:
   - Redirects unauthenticated requests to `/dashboard/*` routes to the login page
   - Returns 401 responses for unauthenticated requests to `/api/*` routes

2. **API Authentication Wrappers**
   Two wrappers in `src/lib/auth/api-auth.ts` provide standardized auth for API routes:
   - `withAuth`: Basic protection that ensures user is authenticated
   - `withAuthAndMonitoring`: Adds timing and logging for resource-intensive operations

3. **Row-Level Security Policies**
   Database-level security implemented through policies:
   - Brand editing limited to users with admin/editor roles for that brand
   - Content visibility filtered by brand permissions
   - Profile updates limited to the owner
   - Permissions management limited to admins

4. **Server Component Utilities**
   Utilities in `src/lib/auth/server.ts` for server components:
   - `requireAuth`: Server component authentication check with redirect
   - `getCurrentUser`: Gets the current authenticated user

### Next Steps

1. **Complete Client Updates**
   - Remove any remaining localStorage/sessionStorage token storage
   - Update authentication context providers

2. **RLS Policy Deployment**
   - Execute the deployment script to apply RLS policies to the database
   - Run the test script to verify RLS is working correctly

3. **Security Review**
   - Conduct a thorough review of authentication flows
   - Review secure cookie settings
   - Verify CSRF protection

4. **Documentation**
   - Create detailed technical documentation on authentication
   - Document RLS policies and access control

5. **Testing**
   - Test all API routes with and without authentication
   - Verify proper error handling for authentication failures
   - Test session refresh functionality

By implementing cookie-based authentication with Supabase and applying Row-Level Security at the database level, we've significantly improved the security posture of the application while maintaining a good user experience.

## Domain Configuration

The MixerAI 2.0 application is configured to run on the production domain `mixerai.orangejely.co.uk`. We've created detailed documentation for setting up and configuring the application with this domain:

- See [`docs/domain-configuration.md`](docs/domain-configuration.md) for complete setup instructions

Key configuration areas include:
- Supabase authentication settings
- Email templates for user invitations
- Environment variables
- DNS and SSL configuration

When deploying to the production domain, ensure all authentication settings and invitation email templates are updated to reference the correct domain.

## Build and Deployment Optimizations

We've implemented several optimizations to ensure smooth building and deployment:

### Dynamic API Routes

API routes that use authentication require `cookies` and can't be rendered statically. We've added the `dynamic = "force-dynamic"` flag to these routes:

```typescript
// Force dynamic rendering for this route
export const dynamic = "force-dynamic";
```

A utility script is available to automatically add this flag to all API routes:
```bash
./scripts/update-api-routes.sh
```

### Configuration Cleanup

- Removed deprecated `experimental.serverActions` from next.config.js since this is now the default in Next.js 14+
- Added proper component imports to fix TypeScript errors
- Ensured all dependencies are correctly installed (e.g., class-variance-authority)

### Domain Configuration Testing

For the production domain (`mixerai.orangejely.co.uk`), we've added:

- A warning component that displays in development mode when not configured
- Client-side verification in the dashboard layout
- Email template verification in the user invitation API

The domain configuration system avoids hardcoded values by using environment variables throughout the application.

# User Profile Fields

The user profile contains the following fields:

| Field Name | Description | Required | Location |
|------------|-------------|----------|----------|
| id | Unique identifier | Yes | auth.users, profiles |
| email | User's email address | Yes | auth.users, profiles |
| full_name | User's full name | Yes | auth.users (metadata), profiles |
| job_title | User's job title or role | Yes | auth.users (metadata), profiles |
| job_description | Description of user's job | No | auth.users (metadata), profiles |
| company | User's company or organization | Yes | auth.users (metadata), profiles |
| avatar_url | URL to user's profile picture | No | profiles |
| role | System role (admin, editor, viewer) | Yes | user_brand_permissions |
| created_at | Account creation timestamp | Yes | auth.users, profiles |

# Company Field

The company field has been added to the user profile to track organizational information. This field is:

- Displayed in the users management table
- Required during user signup/invitation acceptance
- Automatically pre-filled with the domain name from the user's email address (without TLD)
- Editable by admins through the user edit interface
- Stored in both the user metadata and profiles table

## Route Cleanup (2024-06-XX)

### Problem
The application had duplicate routes with nearly identical implementations: top-level routes (`/brands`, `/workflows`, etc.) and dashboard routes (`/dashboard/brands`, `/dashboard/workflows`, etc.). This caused code duplication, maintenance challenges, and inconsistent user experiences.

### Solution Implemented
We simplified the application architecture through a phased approach:

#### Phase 1: Redirect Implementation (COMPLETED)
1. **Framework-Level Redirects:** 
   - Implemented catch-all patterns in `next.config.js` for efficient redirects
   - Used the `:path*` pattern to handle all nested routes automatically
   - Added special case redirect for `/dashboard/content` to `/dashboard/content/article`

2. **Middleware Redirects:**
   - Enhanced middleware with dynamic redirect logic
   - Preserved query parameters during redirects
   - Added detailed logging for debugging and monitoring

3. **Placeholder Components:**
   - Created minimal placeholder components for all non-dashboard routes
   - Added clear documentation explaining their purpose
   - Ensured they render safely if redirects fail

#### Phase 2: Testing and Verification (IN PROGRESS)
1. **Testing Tools Development:**
   - Created automated redirect testing script (`scripts/test-redirects.js`)
   - Developed bundle size analysis tool (`scripts/analyze-bundle-sizes.sh`)
   - Prepared comprehensive test plan and report templates

2. **Testing Strategy:**
   - Route coverage testing with automated verification
   - Query parameter preservation checks
   - Browser navigation and history testing
   - Authentication state preservation verification
   - Bundle size and performance measurement

#### Phase 3: Code Cleanup (PLANNED)
After a successful testing period, we'll:
1. Remove all placeholder files
2. Update all documentation to reference only dashboard routes
3. Final verification of all redirects

### Technical Implementation Details

#### Catch-all Redirect Patterns
```javascript
// next.config.js
module.exports = {
  async redirects() {
    return [
      {
        source: '/brands/:path*',
        destination: '/dashboard/brands/:path*',
        permanent: false,
      },
      // ... similar patterns for workflows, content, users
    ]
  },
}
```

#### Middleware Implementation
```typescript
// middleware.ts
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  if (['/brands', '/workflows', '/content', '/users']
      .some(prefix => pathname.startsWith(prefix))) {
    
    const newPath = pathname.replace(
      /^\/(brands|workflows|content|users)/, 
      '/dashboard/$1'
    )
    
    // Preserve query parameters
    const url = new URL(newPath, req.url)
    req.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value)
    })
    
    return NextResponse.redirect(url)
  }
}
```

### Benefits Achieved
- Eliminated code duplication across route structures
- Simplified application architecture
- Improved maintainability with single source of truth
- Enhanced user navigation consistency
- Expected performance improvements (pending final measurements)

### Next Steps
1. Complete the testing phase using the developed tools
2. Document test results and performance measurements
3. Proceed to Phase 3 for final cleanup after successful testing
4. Update all references to use only dashboard routes

Detailed documentation about the implementation can be found in:
- [Duplicate Pages Removal Plan](./docs/DUPLICATE_PAGES_REMOVAL_PLAN.md)
- [Route Cleanup Executive Summary](./docs/ROUTE_CLEANUP_EXECUTIVE_SUMMARY.md)
- [Route Redirect Test Plan](./docs/ROUTE_REDIRECT_TEST_PLAN.md)