# MixerAI 2.0 Documentation

## Project Overview

MixerAI 2.0 is an application for creating AI-generated content with Azure OpenAI for digital marketing. The application allows users to create and manage content for different brands using customizable workflows.

### Core Technology Stack

- **Frontend**: Next.js 14 with App Router, React, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **AI**: Azure OpenAI

### Brand Colors
- **Primary Colour**: #14599f
- **Secondary Colour**: #cf0d2a

## Core Features

### 1. Brands Management
Brands represent the entities for which content is created. Each brand includes:
- Name
- Website URL
- Country
- Language
- Brand identity (AI-generated or manually entered)
- Tone of voice
- Guardrails
- Content vetting agencies

### 2. User Management with RBAC
Users can access multiple brands with different permission levels:
- Admin: Full access to all features
- Editor: Can create and edit content, but not manage users or brands
- Viewer: Can only view content

### 3. Workflow Management
Custom configurable workflows for content approval with:
- Multi-step processes
- Role-based approvals
- Content status tracking
- Email notifications

### 4. Content Generation
AI-generated content using Azure OpenAI, supporting:
- Articles
- Retailer PDPs (Product Description Pages)
- Owned PDPs
- Includes meta title and description
- Structured to industry best practices

## Database Architecture

### Database Connection Methods

The application can use two database connection methods:

1. **Supabase Connection** (Default)
   - Used for authentication and data storage in production/staging
   - Connection is managed through the Supabase client libraries
   - Configured via environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

2. **Direct PostgreSQL Connection** (Local Development)
   - Implemented through the `src/lib/db.ts` module
   - Configured via environment variables:
     - `POSTGRES_HOST`
     - `POSTGRES_PORT`
     - `POSTGRES_USER`
     - `POSTGRES_PASSWORD`
     - `POSTGRES_DB`

### Database Migrations

The project uses a consolidated migrations approach for simplicity and reliability:

1. **Consolidated Migrations File**:
   - All schema definitions and initial data are in a single SQL file: `migrations/consolidated_migrations.sql`
   - This makes it easier to set up new environments and ensures consistency

2. **Running Migrations**:
   - Execute migrations using the provided script: `./scripts/run-migrations.sh`
   - The script can create a new database or clean an existing one using the `--clean` flag

3. **Migration History**:
   - Previous migration files are archived in `migrations/archive/` for reference
   - Each archive includes documentation of what was consolidated

This approach simplifies database management and reduces the risk of migration conflicts.

### Database Schema

#### Brands Table
```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  website_url TEXT,
  country TEXT,
  language TEXT,
  brand_identity TEXT,
  tone_of_voice TEXT,
  guardrails TEXT,
  content_vetting_agencies TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Users Table (Managed by Supabase Auth)
```sql
-- Supabase manages the core user table
-- We'll create a profiles table for additional info

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### User-Brand Permissions Table
```sql
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE user_brand_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, brand_id)
);
```

#### Content Types Table
```sql
CREATE TABLE content_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name)
);
```

#### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  content_type_id UUID REFERENCES content_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(brand_id, content_type_id)
);
```

#### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  content_type_id UUID REFERENCES content_types(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  status content_status NOT NULL DEFAULT 'draft',
  current_step INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Structure

### Authentication Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Brands Endpoints
- GET /api/brands - Get all brands
- POST /api/brands - Create a new brand
- GET /api/brands/:id - Get a specific brand
- PUT /api/brands/:id - Update a brand
- DELETE /api/brands/:id - Delete a brand
- POST /api/brands/identity - Generate brand identity

### Users Endpoints
- GET /api/users - Get all users with their roles
- POST /api/users/invite - Invite a new user
- GET /api/users/:id - Get a specific user
- PUT /api/users/:id - Update a user
- DELETE /api/users/:id - Delete a user

### Content Endpoints
- GET /api/content - Get all content
- POST /api/content - Create new content
- GET /api/content/:id - Get specific content
- PUT /api/content/:id - Update content
- DELETE /api/content/:id - Delete content
- POST /api/content/generate - Generate content with AI

### Workflows Endpoints
- GET /api/workflows - Retrieve all workflows
- POST /api/workflows - Create a new workflow
- GET /api/workflows/:id - Retrieve a specific workflow
- PUT /api/workflows/:id - Update a specific workflow
- DELETE /api/workflows/:id - Delete a specific workflow
- GET /api/workflows/templates - Retrieve workflow templates

## Authentication Strategy

The application uses Supabase Auth for authentication with the following setup:

1. **Supabase Auth Helpers**:
   - `@supabase/auth-helpers-nextjs` for Next.js integration
   - Server, client, and middleware components for different contexts

2. **Next.js Middleware**:
   - Route protection with automatic session refresh
   - Redirection for unauthenticated users

3. **Secure Cookie-Based Auth**:
   - HttpOnly cookies for secure token storage
   - No client-side token storage in localStorage/sessionStorage

4. **API Route Protection**:
   - Consistent auth wrapper for all API routes
   - JWT verification through Supabase

## Azure OpenAI Integration

### Configuration
- Primary connection uses Azure OpenAI service
  - `AZURE_OPENAI_API_KEY`
  - `AZURE_OPENAI_ENDPOINT`
  - `AZURE_OPENAI_DEPLOYMENT_NAME`
- Fallback to standard OpenAI API when Azure not available
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL_NAME`

### Features
1. **Brand Identity Generation**:
   - Analyzes brand websites for tone and identity
   - Generates consistent guidelines for content
   - Fallback templates when AI generation fails

2. **Content Generation**:
   - Creates structured content based on brand guidelines
   - Adapts to different content types (articles, PDPs)
   - Includes meta information for SEO

### Error Handling
- All API calls use try/catch blocks
- Template-based fallback generation when API fails
- UI indicators for fallback content usage
- Rate limiting with friendly messages

## AI Integration

### Azure OpenAI Configuration

MixerAI 2.0 uses Azure OpenAI for all AI-powered content generation. The system is configured via environment variables:

```
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=deployment_name
```

The OpenAI client is initialized in `/src/lib/azure/openai.ts` and all API calls are made server-side to protect API credentials.

### Content Generation Features

MixerAI 2.0 includes several AI-powered tools:

1. **Content Generation**
   - Articles, Product Descriptions, and other marketing content
   - Incorporates brand voice, guidelines, and context

2. **Brand Identity Generation**
   - Creates brand identity from website URLs
   - Includes tone of voice, guardrails, and agency recommendations
   
3. **Metadata Generator**
   - SEO-optimized meta titles (50-60 characters) and descriptions (150-160 characters)
   - Incorporates brand context for consistent messaging

4. **Alt Text Generator**
   - Accessible image descriptions for web content
   - Follows accessibility best practices (no "image of...", concise descriptions)
   - Limited to 125 characters for optimal screen reader experience

5. **Content Trans-Creator**
   - Adapts content between languages with cultural sensitivity
   - Goes beyond direct translation to localize for target markets

### Brand Context Integration

Each AI request includes comprehensive brand information:

- **Brand Language & Country**: For localization and cultural relevance
- **Brand Identity**: Core brand personality and values
- **Tone of Voice**: Specific communication style guidance
- **Guardrails**: Content limitations and requirements
- **Vetting Agency Alignment**: Content validated against country-specific regulatory agencies

### Error Handling

When Azure OpenAI API calls fail:

1. Errors are logged to the console with detailed information
2. Specific error messages are returned to the client
3. UI displays appropriate error notifications
4. No fallback content is generated - errors are transparently reported

For more detailed information on the Azure OpenAI integration, refer to:
- [Azure OpenAI Integration](./AZURE_OPENAI_INTEGRATION.md)
- [Removing Fallback Generation](./REMOVE_FALLBACK_GENERATION.md)

## Local Development Setup

### Using Docker for PostgreSQL
```