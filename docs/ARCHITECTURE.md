# MixerAI 2.0 Architecture

This document provides a comprehensive overview of the technical architecture, design patterns, and implementation details for MixerAI 2.0.

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **UI Library**: React with shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with consistent spacing scale (4px/8px increments)
- **Form Handling**: React Hook Form with Zod validation
- **Rich Text**: React Quill for content editing
- **State Management**: React hooks with local component state
- **Data Fetching**: Native fetch in server components, SWR for client-side

### Backend
- **Runtime**: Node.js 18+
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **AI Integration**: Azure OpenAI API
- **API Pattern**: RESTful endpoints under `/src/app/api/`

### Development & Deployment
- **Package Manager**: npm
- **Build Tool**: Next.js built-in bundler
- **Deployment**: Vercel (production)
- **Code Quality**: ESLint with TypeScript rules

## Project Structure

```
MixerAI2.0/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes (RESTful)
│   │   │   ├── brands/           # Brand management endpoints
│   │   │   ├── content/          # Content CRUD and generation
│   │   │   ├── templates/        # Template management
│   │   │   ├── workflows/        # Workflow management
│   │   │   ├── claims/           # Claims management
│   │   │   ├── users/            # User management
│   │   │   └── auth/             # Authentication endpoints
│   │   ├── auth/                 # Authentication pages
│   │   ├── dashboard/            # Protected dashboard pages
│   │   │   ├── brands/           # Brand management UI
│   │   │   ├── content/          # Content management UI
│   │   │   ├── templates/        # Template management UI
│   │   │   ├── workflows/        # Workflow management UI
│   │   │   ├── claims/           # Claims management UI
│   │   │   ├── users/            # User management UI
│   │   │   └── tools/            # AI tools (alt-text, metadata, etc.)
│   │   └── (public pages)        # Landing, login, etc.
│   ├── components/               # React components
│   │   ├── ui/                   # Base UI components (shadcn/ui)
│   │   ├── content/              # Content-specific components
│   │   ├── dashboard/            # Dashboard-specific components
│   │   ├── layout/               # Layout components
│   │   ├── template/             # Template components
│   │   ├── workflow/             # Workflow components
│   │   └── forms/                # Form components
│   ├── lib/                      # Utilities and services
│   │   ├── auth/                 # Authentication helpers
│   │   ├── azure/                # Azure OpenAI client
│   │   ├── supabase/             # Supabase clients
│   │   └── utils/                # Utility functions
│   ├── types/                    # TypeScript type definitions
│   └── content/                  # Static content (help wiki)
├── docs/                         # Project documentation
├── migrations/                   # Database migrations
├── scripts/                      # Utility scripts
└── public/                       # Static assets
```

## Core Architectural Patterns

### 1. API Design

**RESTful Structure**
- All API routes follow RESTful patterns under `/src/app/api/`
- Each resource has its own route folder with standard HTTP methods
- Consistent response format: `{ success: boolean, data?: any, error?: string }`

**Authentication & Authorization**
- Protected routes use middleware for authentication
- Role-based access control (RBAC) with global and brand-specific permissions
- API endpoints validate permissions before data access

**Error Handling**
- Centralized error handling with user-friendly messages
- Proper HTTP status codes
- Detailed logging for debugging

### 2. Database Architecture

**Multi-Tenant Design**
- Row-Level Security (RLS) policies enforce data isolation
- Brand-based permissions system
- Foreign key relationships maintain data integrity

**Key Entities**
- **Users**: Authentication and profile management
- **Brands**: Multi-brand support with identity settings
- **Content**: Generated content with versioning
- **Templates**: Flexible content templates
- **Workflows**: Multi-step approval processes
- **Claims**: Product claims with market overrides

### 3. Authentication System

**Supabase Auth Integration**
- Email/password authentication
- Profile system linked to auth.users
- User metadata for role storage
- Session management

**Permission Model**
- **Global Admins**: Full system access
- **Brand Admins**: Admin rights for specific brands
- **Editors**: Content creation and editing
- **Viewers**: Read-only access

### 4. AI Integration Architecture

**Azure OpenAI Integration**
- Centralized client in `/src/lib/azure/openai.ts`
- Direct fetch calls to Azure OpenAI API
- Deployment-specific endpoint configuration
- Error handling and retry logic

**Content Generation Flow**
1. User selects template and provides inputs
2. Product context and claims fetched from database
3. Prompt constructed with template instructions
4. Azure OpenAI generates content
5. Content saved with metadata and versioning
6. Workflow assignments trigger notifications

### 5. UI Component System

**Design System**
- shadcn/ui components built on Radix UI primitives
- Consistent Tailwind CSS classes
- Responsive design with mobile-first approach
- WCAG 2.1 Level AA accessibility compliance

**Component Organization**
- Base UI components in `/src/components/ui/`
- Feature-specific components grouped by domain
- Reusable form components with validation
- Layout components for consistent structure

## Key Implementation Patterns

### 1. Data Fetching

**Server Components**
```typescript
// Direct fetch in server components
const response = await fetch('/api/brands', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data: brands } = await response.json();
```

**Client Components**
```typescript
// SWR for client-side data fetching
const { data: brands, error } = useSWR('/api/brands', fetcher);
```

### 2. Form Handling

**React Hook Form + Zod**
```typescript
const form = useForm<BrandFormData>({
  resolver: zodResolver(brandSchema),
  defaultValues: {
    name: '',
    website_url: '',
    // ...
  }
});
```

### 3. Error Handling

**API Routes**
```typescript
try {
  // API logic
  return NextResponse.json({ success: true, data });
} catch (error) {
  console.error('API Error:', error);
  return NextResponse.json(
    { success: false, error: 'Failed to process request' },
    { status: 500 }
  );
}
```

### 4. Type Safety

**TypeScript Configuration**
- Strict mode enabled
- Comprehensive type definitions
- Database types generated from Supabase
- API response types for consistency

## Security Implementation

### 1. Authentication
- Supabase Auth for secure user management
- Session-based authentication
- Protected routes with middleware

### 2. Authorization
- Row-Level Security (RLS) policies
- Brand-based permissions
- API endpoint permission validation

### 3. Data Protection
- Environment variable security
- HTTPS enforcement
- Input validation and sanitization
- CSRF protection

## Performance Optimizations

### 1. Frontend
- Code splitting with dynamic imports
- Image optimization with Next.js Image component
- React.memo for component optimization
- Proper caching strategies

### 2. Database
- Proper indexing on foreign keys
- RLS policies for data filtering
- Connection pooling via Supabase

### 3. API
- Efficient database queries
- Response caching where appropriate
- Pagination for large datasets

## Development Guidelines

### 1. Code Style
- TypeScript for all new code
- ESLint configuration adherence
- Named exports preferred
- Absolute imports with @ alias

### 2. Component Design
- Single responsibility principle
- Reusable and composable components
- Proper prop typing
- Accessibility considerations

### 3. API Development
- RESTful endpoint design
- Consistent error handling
- Proper status codes
- Input validation

### 4. Database Operations
- Use parameterized queries
- Implement proper error handling
- Follow RLS policy patterns
- Maintain referential integrity

## Deployment Architecture

### 1. Vercel Deployment
- Automatic deployments from Git
- Environment variable management
- Preview deployments for testing
- Production optimizations

### 2. Database
- Supabase hosted PostgreSQL
- Automatic backups
- Connection pooling
- Row-Level Security enforcement

### 3. External Services
- Azure OpenAI for AI generation
- Supabase for database and auth
- Email services for notifications

## Monitoring and Debugging

### 1. Logging
- Console logging for development
- Error tracking in production
- API request/response logging
- User action tracking

### 2. Error Handling
- Graceful error boundaries
- User-friendly error messages
- Proper error propagation
- Development vs production error details

This architecture provides a solid foundation for scalable, maintainable, and secure AI-powered content generation while maintaining good developer experience and user performance.