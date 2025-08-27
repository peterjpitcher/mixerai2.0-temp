# MixerAI 2.0 System Architecture

## Overview
Complete system architecture, navigation, and state management documentation for MixerAI 2.0.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Navigation System](#navigation-system)
3. [State Management](#state-management)
4. [Permission System](#permission-system)
5. [Data Flow](#data-flow)
6. [Infrastructure](#infrastructure)

---

## System Architecture

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes, Edge Functions
- **Database**: PostgreSQL (Supabase)
- **AI**: Azure OpenAI
- **Auth**: Supabase Auth
- **Hosting**: Vercel
- **Email**: Resend

### Architecture Pattern
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   Next.js App   │────▶│  API Routes  │────▶│  Supabase   │
│   (Frontend)    │     │  (Backend)   │     │  (Database) │
└─────────────────┘     └──────────────┘     └─────────────┘
         │                      │                     │
         ▼                      ▼                     ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   React Query   │     │ Azure OpenAI │     │     RLS     │
│   (Caching)     │     │     (AI)     │     │  (Security) │
└─────────────────┘     └──────────────┘     └─────────────┘
```

### Multi-Tenant Architecture
- **Brand Isolation**: Complete data separation by brand
- **User Scoping**: Users belong to specific brands
- **RLS Policies**: Database-level security
- **Permission System**: Role-based access control

---

## Navigation System

### Primary Navigation Structure
```
/dashboard
├── /content         # Content management
├── /templates       # Content templates
├── /workflows       # Workflow management
├── /claims          # Claims system
├── /brands          # Brand management
├── /users           # User management
├── /tools           # AI tools
└── /account         # User settings
```

### Navigation Components

#### Desktop Navigation
- Persistent sidebar with collapsible sections
- Brand switcher in header
- User menu with quick actions
- Breadcrumb trail for context

#### Mobile Navigation
- Bottom tab bar for primary actions
- Hamburger menu for secondary items
- Swipe gestures for navigation
- Contextual action sheets

### Permission-Based Navigation
```typescript
// Navigation items filtered by permissions
const navItems = [
  {
    label: 'Content',
    href: '/dashboard/content',
    permission: 'content:read',
    icon: FileText,
  },
  {
    label: 'Users',
    href: '/dashboard/users',
    permission: 'users:manage',
    icon: Users,
    adminOnly: true,
  },
];

// Only show items user has access to
const filteredNav = navItems.filter(item => 
  user.hasPermission(item.permission)
);
```

---

## State Management

### State Management Strategy
1. **Server State**: TanStack Query (React Query)
2. **Client State**: React Context + useReducer
3. **Form State**: React Hook Form
4. **URL State**: Next.js router

### Global State Contexts

#### AuthContext
```typescript
interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (credentials) => Promise<void>;
  signOut: () => Promise<void>;
}
```

#### BrandContext
```typescript
interface BrandContextValue {
  currentBrand: Brand | null;
  brands: Brand[];
  switchBrand: (brandId: string) => void;
  permissions: Permission[];
}
```

### Data Fetching Patterns
```typescript
// Server Components (SSR)
async function Page() {
  const data = await fetchServerData();
  return <ClientComponent initialData={data} />;
}

// Client Components (CSR)
function ClientComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['data'],
    queryFn: fetchClientData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Optimistic Updates
```typescript
const mutation = useMutation({
  mutationFn: updateData,
  onMutate: async (newData) => {
    // Optimistically update cache
    await queryClient.cancelQueries(['data']);
    const previous = queryClient.getQueryData(['data']);
    queryClient.setQueryData(['data'], newData);
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['data'], context.previous);
  },
});
```

---

## Permission System

### Role Hierarchy
```
Super Admin
    ├── Brand Admin
    │   ├── Manager
    │   └── User
    └── Viewer
```

### Permission Model
```typescript
interface Permission {
  resource: 'content' | 'users' | 'brands' | 'claims';
  action: 'create' | 'read' | 'update' | 'delete';
  scope: 'own' | 'brand' | 'all';
}
```

### Permission Checks
```typescript
// API Route Protection
export const GET = withAuth(async (req, user) => {
  if (!user.hasPermission('content:read')) {
    return new Response('Forbidden', { status: 403 });
  }
  // Handle request
});

// Component Protection
function AdminPanel() {
  const { user } = useAuth();
  
  if (!user?.isAdmin) {
    return <AccessDenied />;
  }
  
  return <AdminContent />;
}
```

### Row-Level Security (RLS)
All database tables have RLS policies:
- Users can only see data from their brands
- Admins have broader access
- Service role bypasses RLS for system operations

---

## Data Flow

### Request Lifecycle
```
1. User Action
   ↓
2. Client Validation
   ↓
3. API Request (with CSRF token)
   ↓
4. Auth Middleware
   ↓
5. Permission Check
   ↓
6. Business Logic
   ↓
7. Database Query (with RLS)
   ↓
8. Response
   ↓
9. Client Cache Update
   ↓
10. UI Update
```

### Caching Strategy
- **Static Data**: Long cache (1 hour)
- **User Data**: Medium cache (5 minutes)
- **Real-time Data**: No cache
- **Invalidation**: On mutation

### WebSocket Events (Future)
```typescript
// Real-time updates
const subscription = supabase
  .channel('content-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'content',
  }, handleUpdate)
  .subscribe();
```

---

## Infrastructure

### Environment Configuration
```bash
# Development
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Production
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
RESEND_API_KEY=
```

### Deployment Pipeline
1. **Development**: Local development with hot reload
2. **Preview**: Vercel preview deployments for PRs
3. **Staging**: Pre-production testing
4. **Production**: Live environment

### Monitoring & Logging
- **Error Tracking**: Sentry (planned)
- **Analytics**: Vercel Analytics
- **Logs**: Vercel Functions logs
- **Uptime**: Vercel monitoring

### Security Measures
- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based with permissions
- **Data Protection**: Encryption at rest and in transit
- **API Security**: Rate limiting, CSRF protection
- **Input Validation**: Zod schemas
- **SQL Injection**: Parameterized queries only

### Scalability Considerations
- **Database**: Connection pooling, read replicas
- **API**: Edge functions for geo-distribution
- **Assets**: CDN for static files
- **Caching**: React Query for client, Redis for server

---

## API Design Principles

### RESTful Conventions
```
GET    /api/resource       # List
GET    /api/resource/:id   # Get one
POST   /api/resource       # Create
PUT    /api/resource/:id   # Update
DELETE /api/resource/:id   # Delete
```

### Response Standards
- Consistent JSON structure
- Proper HTTP status codes
- Detailed error messages
- Request ID for tracking

### Rate Limiting
- Per-endpoint limits
- User-based quotas
- Graceful degradation
- Clear limit headers

---

*This document consolidates: architecture.md, navigation-system.md, navigation-permissions.md, state-management.md, and infrastructure documentation.*