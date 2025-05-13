# MixerAI 2.0 Documentation

## Overview

MixerAI 2.0 is an application for creating AI-generated content with Azure OpenAI for digital marketing. The application allows users to create and manage content for different brands using customizable workflows.

## Architecture

The application is built using the following technologies:

- **Frontend**: Next.js with App Router, React, Tailwind CSS
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **AI**: Azure OpenAI

## Navigation Structure

The application has a simplified URL structure with all primary features available at root-level routes. For details on the navigation implementation, see [NAVIGATION_UPDATES.md](./NAVIGATION_UPDATES.md).

## Main Features

- **Brands Management**: Create and manage brands with specific content guidelines
- **Content Generation**: Generate AI content based on brand guidelines and user-defined Content Templates.
- **Content Management**: Review, approve, and publish content
- **Workflows**: Define custom approval processes for content creation
- **User Management**: Manage users and their roles

## API Structure

### Authentication
// - POST /api/auth/register (Removed - Invite-only system)
- POST /api/auth/login
- GET /api/auth/me

### Brands
- GET /api/brands
- GET /api/brands/:id
- POST /api/brands
- PUT /api/brands/:id
- DELETE /api/brands/:id

### Users
- GET /api/users - Get all users with their roles
- POST /api/users/invite - Invite a new user

### Content
- GET /api/content - Get all content
- POST /api/content - Create new content
- GET /api/content/:id - Get specific content
- PUT /api/content/:id - Update content
- DELETE /api/content/:id - Delete content
- POST /api/content/generate - Generate content with AI (see [CONTENT_GENERATION.md](./CONTENT_GENERATION.md) for details)

### Workflows
- GET /api/workflows - Get all workflows
- POST /api/workflows - Create a new workflow
- GET /api/workflows/:id - Get a specific workflow
- PUT /api/workflows/:id - Update a workflow
- DELETE /api/workflows/:id - Delete a workflow
- GET /api/workflows/templates - Get predefined workflow templates

For detailed documentation on the workflow API, see [WORKFLOW_API.md](./WORKFLOW_API.md).

## Documentation Structure

The project documentation is divided into several files:

- [DATABASE_SETUP.md](./DATABASE_SETUP.md): Setting up the database
- [CLEAN_DATABASE.md](./CLEAN_DATABASE.md): Guide for cleaning test data
- [DATABASE_CONNECTION_ISSUES.md](./DATABASE_CONNECTION_ISSUES.md): Troubleshooting database connection issues
- [FOLDER_STRUCTURE_FIX.md](../FOLDER_STRUCTURE_FIX.md): Guide to fixing directory structure issues
- [CONTENT_GENERATION.md](./CONTENT_GENERATION.md): Details on the content generation feature
- [NAVIGATION_UPDATES.md](./NAVIGATION_UPDATES.md): Information about the navigation system
- [WORKFLOW_API.md](./WORKFLOW_API.md): Documentation for the workflows API

## Project Overview

MixerAI 2.0 is an application that creates AI-generated content with Azure OpenAI for digital marketing needs. It allows users to create and manage content for different brands using customizable workflows.

### Primary Colour: #14599f
### Secondary Colour: #cf0d2a

## Core Features

### 1. Brands Management
Brands represent the entities for which content is created. Each brand includes:
- Name
- Website URL
- Country
- Language
- Brand identity
- Tone of voice
- Guardrails
- Content vetting agencies

### 2. User Management with RBAC
Users can access multiple brands with different permission levels:
- Admin: Full access to all features
- Editor: Can create and edit content, but not manage users or brands
- Viewer: Can only view content

### 3. Workflow Management

#### API Endpoints

The following API endpoints are available for workflow management:

- `GET /api/workflows` - Retrieve all workflows
- `POST /api/workflows` - Create a new workflow
- `GET /api/workflows/{id}` - Retrieve a specific workflow
- `PUT /api/workflows/{id}` - Update a specific workflow
- `DELETE /api/workflows/{id}` - Delete a specific workflow
- `GET /api/workflows/templates` - Retrieve workflow templates

For detailed API documentation, see [docs/WORKFLOW_API.md](./WORKFLOW_API.md).

#### Routing Structure

The application uses the following routing structure for workflows:

- `/workflows` - Workflows listing page
- `/workflows/new` - Create new workflow page
- `/workflows/[id]` - View workflow details
- `/workflows/[id]/edit` - Edit workflow

> **Note:** Previous versions had duplicate routes under both `/workflows` and `/dashboard/workflows`. This has been resolved by using only the root-level routes (`/workflows`) and removing the duplicates from the dashboard directory.

### 4. Content Generation
AI-generated content using Azure OpenAI, supporting generation via customizable Content Templates.
- Includes meta title and description (often defined within templates).
- Structured to industry best practices (guided by template structure).

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
2. ✅ Implement CRUD operations for brands
3. ✅ Build brand management UI
4. ✅ Set up user-brand permissions

#### Phase 3: Workflows
1. ✅ Create workflows table (the `content_types` table is no longer used).
2. ✅ Build workflow designer UI.
3. ✅ Implement workflow templates that can be associated with Content Templates.
4. ✅ Create workflow execution engine.

#### Phase 4: Content Generation
1. ✅ Set up Azure OpenAI integration
2. ✅ Build content creation UI
3. ✅ Implement content listing and detail pages
4. ✅ Create content editing functionality
5. ✅ Add content filtering and search capabilities
6. ✅ Implement content approval workflows

#### Phase 5: Finalization
1. ✅ Implement dashboard with analytics
2. ✅ Add notifications system
3. ✅ Final UI polish and responsiveness
4. ✅ Testing and bug fixes

## Next Steps

With the completion of all implementation phases, the MixerAI 2.0 application is now ready for production deployment. Key features to consider for future updates include:

1. ⏭️ Advanced analytics and reporting
2. ⏭️ AI-powered content optimization
3. ⏭️ Integration with additional marketing platforms
4. ⏭️ Performance optimization for large content volumes
5. ⏭️ Multi-language support enhancements

## Azure OpenAI Integration

We'll use Azure OpenAI to generate content based on flexible Content Templates defined by users.
Each Content Template will guide the AI in producing structured and relevant output.

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- Tailwind CSS for styling
- shadcn/ui component library
- Responsive design optimized for all devices

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- Role-based access control (RBAC)

### AI Integration
- Azure OpenAI for content generation
- Content structured to best-in-class standards

## Database Schema

### Brands Table
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

### Users Table (Managed by Supabase Auth)
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

### User-Brand Permissions Table
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

### Workflows Table
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Content Table
```sql
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID,
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

## Application Structure

```
mixerai-2.0/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── workflows/
│   │   ├── auth/         # Authentication pages
│   │   ├── brands/       # Brand management
│   │   ├── users/        # User management
│   │   ├── workflows/    # Workflow management
│   │   ├── content/      # Content management
│   │   ├── dashboard/    # Dashboard
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   ├── ui/           # UI components from shadcn
│   │   ├── brands/       # Brand-related components
│   │   ├── users/        # User-related components
│   │   ├── workflows/    # Workflow-related components
│   │   ├── content/      # Content-related components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase client and helpers
│   │   ├── azure/        # Azure OpenAI client and helpers
│   │   ├── auth/         # Authentication helpers
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript types
└── ...
```

## Implementation Progress

### Completed

#### Phase 1: Setup and Authentication
1. ✅ Set up Next.js project with Tailwind CSS and shadcn/ui
2. ✅ Configure Supabase for authentication and database
3. ✅ Create login, registration, and user profile pages
4. ✅ Implement RBAC system

#### Phase 2: Brands Management
1. ✅ Create brands database table
We'll use Azure OpenAI to generate different types of content:

1. Articles - Long-form content with structured sections
2. Retailer PDPs - Product descriptions optimized for third-party retailers
3. Owned PDPs - Product descriptions for the brand's own website

Each content type will have different prompts and templates to ensure high-quality output. 