# MixerAI 2.0 API Specification
## RESTful and GraphQL API Design

Version: 1.0  
Date: December 2024  
[← Back to Data Model](./05-DATA-MODEL-SCHEMA.md) | [Next: UI/UX Guidelines →](./07-UI-UX-DESIGN-SYSTEM.md)

---

## 📋 Table of Contents

1. [API Overview](#1-api-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [RESTful API Endpoints](#3-restful-api-endpoints)
4. [GraphQL Schema](#4-graphql-schema)
5. [WebSocket Events](#5-websocket-events)
6. [Error Handling](#6-error-handling)
7. [Rate Limiting & Quotas](#7-rate-limiting--quotas)
8. [API Versioning](#8-api-versioning)
9. [SDK & Client Libraries](#9-sdk--client-libraries)

---

## 1. API Overview

### 1.1 API Architecture

```mermaid
graph TB
    subgraph "Client Applications"
        Web[Web App]
        Mobile[Mobile App]
        Third[3rd Party]
    end
    
    subgraph "API Gateway"
        Gateway[Kong/NGINX]
        Auth[Auth Middleware]
        Rate[Rate Limiter]
        Cache[Response Cache]
    end
    
    subgraph "API Layer"
        REST[REST API]
        GraphQL[GraphQL API]
        WebSocket[WebSocket Server]
    end
    
    subgraph "Services"
        UserSvc[User Service]
        BrandSvc[Brand Service]
        ContentSvc[Content Service]
        AISvc[AI Service]
    end
    
    Web --> Gateway
    Mobile --> Gateway
    Third --> Gateway
    
    Gateway --> Auth
    Auth --> Rate
    Rate --> Cache
    
    Cache --> REST
    Cache --> GraphQL
    Gateway --> WebSocket
    
    REST --> UserSvc
    REST --> BrandSvc
    REST --> ContentSvc
    REST --> AISvc
    
    GraphQL --> UserSvc
    GraphQL --> BrandSvc
    GraphQL --> ContentSvc
    GraphQL --> AISvc
```

### 1.2 API Design Principles

#### RESTful Principles
- **Resource-Based**: URLs identify resources (`/brands`, `/content`)
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE
- **Stateless**: Each request contains all information needed
- **Cacheable**: Responses indicate cacheability
- **Uniform Interface**: Consistent patterns across endpoints

#### GraphQL Benefits
- **Single Request**: Fetch multiple resources in one query
- **Type Safety**: Strongly typed schema
- **No Over/Under-fetching**: Request exactly what you need
- **Real-time Updates**: Subscriptions for live data

### 1.3 Base URLs

```yaml
Production:
  REST: https://api.mixerai.com/v1
  GraphQL: https://api.mixerai.com/graphql
  WebSocket: wss://api.mixerai.com/ws

Staging:
  REST: https://api-staging.mixerai.com/v1
  GraphQL: https://api-staging.mixerai.com/graphql
  WebSocket: wss://api-staging.mixerai.com/ws
```

---

## 2. Authentication & Authorization

### 2.1 Authentication Methods

#### JWT Bearer Token
```http
GET /api/v1/brands
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### API Key (for third-party integrations)
```http
GET /api/v1/brands
X-API-Key: mix_live_1234567890abcdef
```

### 2.2 Authentication Flow

```typescript
// 1. Login Request
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "mfaCode": "123456" // Optional
}

// 2. Success Response
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 28800,
      "tokenType": "Bearer"
    }
  }
}

// 3. Token Refresh
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2.3 Authorization Model

```typescript
interface AuthorizationContext {
  user: {
    id: string
    email: string
    globalRole?: 'platform_admin'
  }
  
  brands: Array<{
    brandId: string
    role: 'admin' | 'editor' | 'viewer'
    permissions: string[]
  }>
  
  currentBrand?: string
}

// Example authorization check
function canEditContent(auth: AuthorizationContext, contentBrandId: string): boolean {
  // Platform admins can edit anything
  if (auth.user.globalRole === 'platform_admin') return true
  
  // Check brand-specific permissions
  const brandAccess = auth.brands.find(b => b.brandId === contentBrandId)
  return brandAccess?.role === 'admin' || brandAccess?.role === 'editor'
}
```

---

## 3. RESTful API Endpoints

### 3.1 User Management

#### Get Current User
```http
GET /api/v1/users/me
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://cdn.mixerai.com/avatars/user123.jpg",
    "timezone": "America/New_York",
    "language": "en",
    "brands": [
      {
        "brandId": "660e8400-e29b-41d4-a716-446655440001",
        "brandName": "Acme Corp",
        "role": "admin",
        "lastAccessedAt": "2024-12-01T10:00:00Z"
      }
    ]
  }
}
```

#### Update User Profile
```http
PATCH /api/v1/users/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "timezone": "Europe/London",
  "notificationPreferences": {
    "email": true,
    "inApp": true,
    "taskReminders": false
  }
}

Response: 200 OK
{
  "success": true,
  "data": { /* updated user */ }
}
```

#### Invite User
```http
POST /api/v1/users/invite
Authorization: Bearer {token}
Content-Type: application/json

{
  "invitations": [
    {
      "email": "newuser@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "brandRoles": [
        {
          "brandId": "660e8400-e29b-41d4-a716-446655440001",
          "role": "editor"
        }
      ]
    }
  ]
}

Response: 201 Created
{
  "success": true,
  "data": {
    "sent": 1,
    "failed": 0,
    "invitations": [
      {
        "id": "inv_123",
        "email": "newuser@example.com",
        "status": "sent",
        "expiresAt": "2024-12-08T10:00:00Z"
      }
    ]
  }
}
```

### 3.2 Brand Management

#### List Brands
```http
GET /api/v1/brands?page=1&limit=20&search=acme
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "description": "Leading provider of quality products",
      "logo": {
        "url": "https://cdn.mixerai.com/brands/acme-logo.png",
        "altText": "Acme Corp Logo"
      },
      "country": "US",
      "language": "en",
      "userCount": 25,
      "contentCount": 1234
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "totalItems": 95
  }
}
```

#### Create Brand
```http
POST /api/v1/brands
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Brand",
  "description": "Brand description",
  "country": "US",
  "language": "en",
  "identity": {
    "mission": "Our mission statement",
    "values": ["Quality", "Innovation", "Trust"]
  },
  "toneOfVoice": "Professional yet approachable",
  "guardrails": [
    "Never mention competitors by name",
    "Always emphasize quality",
    "Use inclusive language"
  ]
}

Response: 201 Created
{
  "success": true,
  "data": { /* created brand */ }
}
```

#### Generate Brand Profile from URLs
```http
POST /api/v1/brands/generate-profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "brandName": "Acme Corp",
  "urls": [
    "https://acmecorp.com",
    "https://acmecorp.com/about",
    "https://acmecorp.com/products"
  ],
  "country": "US",
  "language": "en"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "identity": {
      "description": "Acme Corp is a leading innovator in...",
      "mission": "To provide innovative solutions...",
      "values": ["Innovation", "Quality", "Customer Focus"]
    },
    "toneOfVoice": "Professional, authoritative, yet approachable...",
    "guardrails": [
      "Always emphasize innovation and quality",
      "Use data to support claims",
      "Maintain professional tone"
    ],
    "suggestedAgencies": [
      {
        "name": "FDA",
        "priority": 1,
        "reason": "Healthcare products require FDA compliance"
      }
    ],
    "primaryColor": "#0066CC"
  }
}
```

### 3.3 Content Management

#### List Content
```http
GET /api/v1/content?brandId={brandId}&status=draft&page=1&limit=50
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "brandId": "660e8400-e29b-41d4-a716-446655440001",
      "title": "Summer Campaign Blog Post",
      "type": "blog_post",
      "status": "draft",
      "createdBy": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe"
      },
      "createdAt": "2024-12-01T10:00:00Z",
      "updatedAt": "2024-12-01T14:30:00Z",
      "assignedTo": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440003",
          "name": "Jane Smith"
        }
      ]
    }
  ],
  "pagination": { /* ... */ }
}
```

#### Create Content
```http
POST /api/v1/content
Authorization: Bearer {token}
Content-Type: application/json
X-Brand-Context: 660e8400-e29b-41d4-a716-446655440001

{
  "templateId": "880e8400-e29b-41d4-a716-446655440003",
  "type": "blog_post",
  "title": "New Product Launch",
  "fields": {
    "headline": "Introducing Our Revolutionary Product",
    "introduction": "We're excited to announce...",
    "body": "Full content here...",
    "cta": "Learn More",
    "keywords": ["innovation", "product launch", "technology"]
  },
  "metadata": {
    "metaTitle": "New Product Launch | Acme Corp",
    "metaDescription": "Discover our latest innovation...",
    "targetAudience": "Tech enthusiasts"
  }
}

Response: 201 Created
{
  "success": true,
  "data": { /* created content */ }
}
```

#### Generate Content with AI
```http
POST /api/v1/content/generate
Authorization: Bearer {token}
Content-Type: application/json
X-Brand-Context: 660e8400-e29b-41d4-a716-446655440001

{
  "templateId": "880e8400-e29b-41d4-a716-446655440003",
  "inputs": {
    "topic": "Summer safety tips",
    "targetAudience": "Parents with young children",
    "tone": "Friendly and informative",
    "keywords": ["summer", "safety", "children", "outdoors"]
  },
  "options": {
    "generateAll": true,
    "includeMetadata": true,
    "suggestImages": true
  }
}

Response: 200 OK
{
  "success": true,
  "data": {
    "fields": {
      "headline": "10 Essential Summer Safety Tips for Kids",
      "introduction": "As summer approaches, keeping our children safe...",
      "body": "1. Sun Protection is Key\n\nAlways apply sunscreen...",
      "cta": "Download Our Summer Safety Checklist"
    },
    "metadata": {
      "metaTitle": "Summer Safety Tips for Kids | Acme Corp",
      "metaDescription": "Keep your children safe this summer with these essential tips...",
      "keywords": ["summer safety", "kids safety", "outdoor activities"]
    },
    "suggestions": {
      "images": [
        "Children playing safely in a pool",
        "Family applying sunscreen at the beach",
        "Kids wearing safety gear while biking"
      ],
      "alternativeTitles": [
        "Keep Your Kids Safe This Summer: A Parent's Guide",
        "Summer Fun Without the Worry: Child Safety Tips"
      ]
    },
    "aiMetadata": {
      "model": "gpt-4",
      "tokensUsed": 1250,
      "generationTime": 3.5,
      "confidence": 0.92
    }
  }
}
```

### 3.4 Workflow Management

#### Get Content Workflow Status
```http
GET /api/v1/content/{contentId}/workflow
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "workflowId": "990e8400-e29b-41d4-a716-446655440004",
    "workflowName": "Standard Review Process",
    "status": "in_progress",
    "currentStep": {
      "id": "step_2",
      "name": "Legal Review",
      "assignees": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440005",
          "name": "Legal Team",
          "type": "group"
        }
      ],
      "dueDate": "2024-12-03T17:00:00Z",
      "status": "pending"
    },
    "history": [
      {
        "stepId": "step_1",
        "stepName": "Brand Review",
        "action": "approved",
        "actor": {
          "id": "550e8400-e29b-41d4-a716-446655440003",
          "name": "Jane Smith"
        },
        "comments": "Looks good, minor tone adjustment made",
        "timestamp": "2024-12-01T15:30:00Z"
      }
    ],
    "nextSteps": [
      {
        "id": "step_3",
        "name": "Final Approval",
        "estimatedDate": "2024-12-04T12:00:00Z"
      }
    ]
  }
}
```

#### Submit Workflow Action
```http
POST /api/v1/content/{contentId}/workflow/action
Authorization: Bearer {token}
Content-Type: application/json

{
  "action": "approve",
  "comments": "Approved with minor suggestions implemented",
  "attachments": [
    {
      "name": "review-notes.pdf",
      "url": "https://cdn.mixerai.com/attachments/review-notes.pdf"
    }
  ]
}

Response: 200 OK
{
  "success": true,
  "data": {
    "workflowStatus": "in_progress",
    "currentStep": {
      "id": "step_3",
      "name": "Final Approval"
    },
    "notification": {
      "sent": true,
      "recipients": ["finalapprover@acmecorp.com"]
    }
  }
}
```

### 3.5 AI Tools

#### Generate Alt Text
```http
POST /api/v1/ai/alt-text
Authorization: Bearer {token}
Content-Type: application/json

{
  "images": [
    {
      "url": "https://example.com/product-image-1.jpg",
      "context": "Product page for summer collection"
    },
    {
      "url": "https://example.com/lifestyle-image-2.jpg",
      "context": "Homepage hero banner"
    }
  ],
  "language": "en",
  "brandId": "660e8400-e29b-41d4-a716-446655440001"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "results": [
      {
        "imageUrl": "https://example.com/product-image-1.jpg",
        "altText": "Colorful summer dress collection displayed on mannequins in bright outdoor setting",
        "confidence": 0.95
      },
      {
        "imageUrl": "https://example.com/lifestyle-image-2.jpg",
        "altText": "Happy family enjoying beach vacation with children playing in sand",
        "confidence": 0.92
      }
    ],
    "metadata": {
      "totalImages": 2,
      "successCount": 2,
      "failureCount": 0,
      "processingTime": 2.3
    }
  }
}
```

#### Generate SEO Metadata
```http
POST /api/v1/ai/metadata
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://acmecorp.com/products/new-widget",
  "content": "Our new widget revolutionizes the way you work...",
  "targetKeywords": ["widget", "productivity", "innovation"],
  "brandId": "660e8400-e29b-41d4-a716-446655440001"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "metaTitle": "Revolutionary Widget for Enhanced Productivity | Acme Corp",
    "metaDescription": "Discover how Acme's innovative widget transforms your workflow. Boost productivity by 50% with our cutting-edge technology.",
    "suggestedKeywords": [
      "productivity widget",
      "workflow automation",
      "innovative tools",
      "Acme widget"
    ],
    "analysis": {
      "titleLength": 58,
      "descriptionLength": 156,
      "keywordRelevance": 0.89,
      "readabilityScore": 8.5
    }
  }
}
```

### 3.6 Claims Management

#### Get Claims Matrix
```http
GET /api/v1/claims/matrix?brandId={brandId}&country=US&productId={productId}
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "claims": [
      {
        "id": "claim_001",
        "text": "Clinically proven to reduce wrinkles",
        "type": "product",
        "status": "allowed",
        "source": "master_claim",
        "applicableCountries": ["US", "CA"],
        "restrictions": []
      },
      {
        "id": "claim_002",
        "text": "100% natural ingredients",
        "type": "ingredient",
        "status": "disallowed",
        "source": "country_override",
        "reason": "Requires certification in US",
        "alternative": "Made with natural ingredients"
      }
    ],
    "summary": {
      "totalClaims": 25,
      "allowed": 20,
      "disallowed": 3,
      "mandatory": 2
    }
  }
}
```

---

## 4. GraphQL Schema

### 4.1 Schema Overview

```graphql
schema {
  query: Query
  mutation: Mutation
  subscription: Subscription
}

# Scalars
scalar DateTime
scalar UUID
scalar JSON

# Common interfaces
interface Node {
  id: ID!
}

interface Timestamped {
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### 4.2 Core Types

```graphql
type User implements Node & Timestamped {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
  avatar: String
  timezone: String!
  language: String!
  
  # Relationships
  brands: [UserBrandRole!]!
  createdContent(
    first: Int
    after: String
    filter: ContentFilter
  ): ContentConnection!
  
  # Metadata
  lastLoginAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Brand implements Node & Timestamped {
  id: ID!
  name: String!
  slug: String!
  description: String
  
  # Identity
  identity: BrandIdentity!
  toneOfVoice: String
  guardrails: [String!]!
  
  # Configuration
  country: String!
  language: String!
  logo: Logo
  colors: BrandColors!
  
  # Relationships
  users(
    first: Int
    after: String
    role: UserRole
  ): UserConnection!
  
  content(
    first: Int
    after: String
    filter: ContentFilter
  ): ContentConnection!
  
  workflows: [Workflow!]!
  templates: [ContentTemplate!]!
  
  # Stats
  stats: BrandStats!
  
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Content implements Node & Timestamped {
  id: ID!
  brand: Brand!
  template: ContentTemplate
  type: ContentType!
  
  # Content data
  title: String!
  slug: String!
  fields: JSON!
  body: String
  excerpt: String
  
  # Status
  status: ContentStatus!
  publishedAt: DateTime
  scheduledFor: DateTime
  
  # Workflow
  workflow: WorkflowInstance
  
  # Relationships
  creator: User!
  assignees: [User!]!
  versions: [ContentVersion!]!
  
  # Metadata
  metadata: ContentMetadata!
  tags: [String!]!
  
  # Analytics
  analytics: ContentAnalytics!
  
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### 4.3 Query Operations

```graphql
type Query {
  # Current user
  me: User!
  
  # Users
  user(id: ID!): User
  users(
    first: Int = 20
    after: String
    filter: UserFilter
    orderBy: UserOrderBy
  ): UserConnection!
  
  # Brands
  brand(id: ID!): Brand
  brands(
    first: Int = 20
    after: String
    filter: BrandFilter
    orderBy: BrandOrderBy
  ): BrandConnection!
  
  # Content
  content(id: ID!): Content
  contents(
    first: Int = 50
    after: String
    filter: ContentFilter
    orderBy: ContentOrderBy
  ): ContentConnection!
  
  # Search
  searchContent(
    query: String!
    brandId: ID
    first: Int = 20
    after: String
  ): SearchResults!
  
  # Templates
  contentTemplates(
    brandId: ID
    active: Boolean
  ): [ContentTemplate!]!
  
  # Workflows
  workflows(
    brandId: ID
    active: Boolean
  ): [Workflow!]!
  
  # Claims
  claimsMatrix(
    brandId: ID!
    country: String!
    productId: ID
  ): ClaimsMatrix!
  
  # Analytics
  brandAnalytics(
    brandId: ID!
    dateRange: DateRange!
  ): BrandAnalytics!
  
  contentAnalytics(
    contentId: ID!
  ): ContentAnalytics!
}
```

### 4.4 Mutation Operations

```graphql
type Mutation {
  # Authentication
  login(input: LoginInput!): AuthPayload!
  logout: Boolean!
  refreshToken(token: String!): AuthPayload!
  
  # User management
  updateProfile(input: UpdateProfileInput!): User!
  uploadAvatar(file: Upload!): User!
  inviteUsers(input: InviteUsersInput!): InviteUsersPayload!
  
  # Brand management
  createBrand(input: CreateBrandInput!): Brand!
  updateBrand(id: ID!, input: UpdateBrandInput!): Brand!
  deleteBrand(id: ID!): Boolean!
  generateBrandProfile(input: GenerateBrandProfileInput!): BrandProfile!
  
  # Content management
  createContent(input: CreateContentInput!): Content!
  updateContent(id: ID!, input: UpdateContentInput!): Content!
  deleteContent(id: ID!): Boolean!
  publishContent(id: ID!): Content!
  scheduleContent(id: ID!, publishAt: DateTime!): Content!
  
  # AI operations
  generateContent(input: GenerateContentInput!): GeneratedContent!
  generateAltText(input: GenerateAltTextInput!): [AltTextResult!]!
  generateMetadata(input: GenerateMetadataInput!): MetadataResult!
  transcreateContent(input: TranscreateInput!): TranscreatedContent!
  
  # Workflow operations
  createWorkflow(input: CreateWorkflowInput!): Workflow!
  startWorkflow(contentId: ID!, workflowId: ID!): WorkflowInstance!
  submitWorkflowAction(
    instanceId: ID!
    input: WorkflowActionInput!
  ): WorkflowInstance!
  
  # Claims management
  createClaim(input: CreateClaimInput!): Claim!
  updateClaim(id: ID!, input: UpdateClaimInput!): Claim!
  reviewClaims(input: ReviewClaimsInput!): ClaimsReviewResult!
}
```

### 4.5 Subscription Operations

```graphql
type Subscription {
  # Content updates
  contentUpdated(contentId: ID!): Content!
  contentStatusChanged(brandId: ID!): ContentStatusUpdate!
  
  # Workflow updates
  workflowProgress(instanceId: ID!): WorkflowProgressUpdate!
  taskAssigned(userId: ID!): TaskAssignment!
  
  # AI generation progress
  aiGenerationProgress(requestId: ID!): AIGenerationProgress!
  
  # Real-time collaboration
  contentBeingEdited(contentId: ID!): EditingUser!
  commentAdded(contentId: ID!): Comment!
  
  # Notifications
  notificationReceived(userId: ID!): Notification!
}
```

### 4.6 Input Types

```graphql
input CreateContentInput {
  brandId: ID!
  templateId: ID
  type: ContentType!
  title: String!
  fields: JSON!
  metadata: ContentMetadataInput
  status: ContentStatus = DRAFT
  assignees: [ID!]
  workflowId: ID
}

input ContentFilter {
  brandId: ID
  status: [ContentStatus!]
  type: [ContentType!]
  createdBy: ID
  assignedTo: ID
  createdAfter: DateTime
  createdBefore: DateTime
  search: String
  tags: [String!]
}

input GenerateContentInput {
  brandId: ID!
  templateId: ID!
  inputs: JSON!
  options: GenerationOptions
  context: GenerationContext
}

input GenerationOptions {
  tone: ContentTone
  length: ContentLength
  includeKeywords: [String!]
  avoidTerms: [String!]
  generateMetadata: Boolean = true
  suggestImages: Boolean = false
}
```

### 4.7 Complex Queries Example

```graphql
# Fetch brand with content and analytics
query GetBrandDashboard($brandId: ID!, $contentFirst: Int = 10) {
  brand(id: $brandId) {
    id
    name
    
    # Recent content
    content(
      first: $contentFirst
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      edges {
        node {
          id
          title
          status
          creator {
            id
            firstName
            lastName
          }
          workflow {
            currentStep {
              name
              assignees {
                id
                name
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    
    # Analytics
    stats {
      totalContent
      publishedContent
      activeUsers
      weeklyGrowth
    }
  }
}

# Create content with AI generation
mutation CreateAIContent($input: GenerateContentInput!) {
  generateContent(input: $input) {
    fields
    metadata {
      metaTitle
      metaDescription
      keywords
    }
    suggestions {
      alternativeTitles
      images
    }
    aiMetadata {
      model
      tokensUsed
      confidence
    }
  }
}
```

---

## 5. WebSocket Events

### 5.1 Connection Setup

```javascript
// Client connection
const ws = new WebSocket('wss://api.mixerai.com/ws');

// Authentication
ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }));
});

// Subscribe to events
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: [
    'content:updates:brandId123',
    'workflow:progress:instanceId456',
    'notifications:userId789'
  ]
}));
```

### 5.2 Event Types

```typescript
// Content update event
{
  "type": "content:updated",
  "data": {
    "contentId": "770e8400-e29b-41d4-a716-446655440002",
    "brandId": "660e8400-e29b-41d4-a716-446655440001",
    "changes": {
      "status": {
        "from": "draft",
        "to": "pending_review"
      }
    },
    "updatedBy": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe"
    },
    "timestamp": "2024-12-01T15:30:00Z"
  }
}

// Workflow progress event
{
  "type": "workflow:progress",
  "data": {
    "instanceId": "workflow_instance_123",
    "contentId": "770e8400-e29b-41d4-a716-446655440002",
    "previousStep": {
      "id": "step_1",
      "name": "Brand Review"
    },
    "currentStep": {
      "id": "step_2",
      "name": "Legal Review"
    },
    "action": "approved",
    "actor": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "Jane Smith"
    },
    "timestamp": "2024-12-01T15:30:00Z"
  }
}

// Real-time collaboration event
{
  "type": "content:editing",
  "data": {
    "contentId": "770e8400-e29b-41d4-a716-446655440002",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "Jane Smith",
      "avatar": "https://cdn.mixerai.com/avatars/jane.jpg"
    },
    "field": "body",
    "cursor": {
      "line": 10,
      "column": 45
    }
  }
}
```

### 5.3 Presence & Collaboration

```typescript
// User presence
interface PresenceEvent {
  type: 'presence:update'
  data: {
    contentId: string
    users: Array<{
      id: string
      name: string
      avatar: string
      status: 'viewing' | 'editing'
      lastSeen: DateTime
    }>
  }
}

// Collaborative editing
interface CollaborativeEdit {
  type: 'content:collaborative:edit'
  data: {
    contentId: string
    userId: string
    operation: {
      type: 'insert' | 'delete' | 'format'
      position: number
      content?: string
      length?: number
      attributes?: Record<string, any>
    }
    version: number
  }
}
```

---

## 6. Error Handling

### 6.1 Error Response Format

```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string              // Machine-readable error code
    message: string           // Human-readable message
    details?: any            // Additional error details
    field?: string           // Field that caused the error
    requestId: string        // Unique request ID for debugging
  }
  meta?: {
    timestamp: string
    version: string
  }
}
```

### 6.2 Common Error Codes

```yaml
Authentication Errors:
  UNAUTHORIZED: "Authentication required"
  INVALID_TOKEN: "Invalid or expired token"
  TOKEN_EXPIRED: "Token has expired"
  INVALID_CREDENTIALS: "Invalid email or password"
  ACCOUNT_LOCKED: "Account is locked due to too many failed attempts"

Authorization Errors:
  FORBIDDEN: "You don't have permission to perform this action"
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions for this resource"
  BRAND_ACCESS_DENIED: "You don't have access to this brand"

Validation Errors:
  VALIDATION_ERROR: "Input validation failed"
  REQUIRED_FIELD_MISSING: "Required field is missing"
  INVALID_FORMAT: "Invalid format for field"
  VALUE_TOO_LONG: "Value exceeds maximum length"
  DUPLICATE_VALUE: "Value already exists"

Resource Errors:
  NOT_FOUND: "Resource not found"
  ALREADY_EXISTS: "Resource already exists"
  CONFLICT: "Resource conflict"
  GONE: "Resource no longer available"

Rate Limiting:
  RATE_LIMIT_EXCEEDED: "Too many requests"
  QUOTA_EXCEEDED: "Monthly quota exceeded"

Server Errors:
  INTERNAL_ERROR: "Internal server error"
  SERVICE_UNAVAILABLE: "Service temporarily unavailable"
  TIMEOUT: "Request timeout"
```

### 6.3 Error Examples

```http
# 400 Bad Request - Validation Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": {
      "fields": [
        {
          "field": "title",
          "code": "REQUIRED_FIELD_MISSING",
          "message": "Title is required"
        },
        {
          "field": "brandId",
          "code": "INVALID_FORMAT",
          "message": "Invalid UUID format"
        }
      ]
    },
    "requestId": "req_abc123"
  }
}

# 401 Unauthorized
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "requestId": "req_def456"
  }
}

# 429 Too Many Requests
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 60 seconds",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset": "2024-12-01T15:30:00Z"
    },
    "requestId": "req_ghi789"
  }
}
```

---

## 7. Rate Limiting & Quotas

### 7.1 Rate Limit Configuration

```yaml
Rate Limits:
  Authentication:
    - /api/v1/auth/login: 10 requests per 15 minutes per IP
    - /api/v1/auth/register: 5 requests per hour per IP
    - /api/v1/auth/forgot-password: 3 requests per hour per email
  
  AI Endpoints:
    - /api/v1/ai/*: 50 requests per 15 minutes per user
    - /api/v1/content/generate: 20 requests per hour per user
    - /api/v1/brands/generate-profile: 5 requests per hour per user
  
  General API:
    - /api/v1/*: 100 requests per 15 minutes per user
    - GraphQL: 200 points per minute (complex queries cost more)
  
  WebSocket:
    - Connections: 5 concurrent per user
    - Messages: 100 per minute per connection
```

### 7.2 Rate Limit Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1701441000
X-RateLimit-Reset-After: 600
X-RateLimit-Bucket: general-api
```

### 7.3 Quota Management

```typescript
interface UserQuota {
  plan: 'starter' | 'professional' | 'enterprise'
  
  limits: {
    aiGenerations: {
      monthly: number        // 1000, 5000, unlimited
      used: number
      resetDate: DateTime
    }
    
    storage: {
      total: number         // GB
      used: number
    }
    
    brands: {
      max: number           // 3, 10, unlimited
      current: number
    }
    
    users: {
      max: number           // 20, 100, unlimited
      current: number
    }
  }
  
  overagePolicy: 'block' | 'pay-as-you-go' | 'notify'
}

// Quota check response
GET /api/v1/account/quota
{
  "success": true,
  "data": {
    "plan": "professional",
    "limits": {
      "aiGenerations": {
        "monthly": 5000,
        "used": 2341,
        "remaining": 2659,
        "resetDate": "2024-12-31T23:59:59Z"
      }
    }
  }
}
```

---

## 8. API Versioning

### 8.1 Versioning Strategy

```yaml
Strategy: URI Versioning
Format: /api/v{version}/resource
Current: v1
Supported: [v1]
Deprecated: []
Sunset Policy: 12 months notice
```

### 8.2 Version Compatibility

```http
# Request specific version
GET /api/v1/brands
Accept: application/json

# Version in header (alternative)
GET /api/brands
API-Version: 1.0

# Response includes version
{
  "success": true,
  "data": [...],
  "meta": {
    "version": "1.0",
    "deprecation": null
  }
}
```

### 8.3 Deprecation Notices

```http
# Deprecated endpoint response
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: <https://docs.mixerai.com/api/migrations/v2>; rel="deprecation"

{
  "success": true,
  "data": {...},
  "meta": {
    "deprecation": {
      "deprecated": true,
      "sunset": "2025-12-31T23:59:59Z",
      "migration": "https://docs.mixerai.com/api/migrations/v2"
    }
  }
}
```

---

## 9. SDK & Client Libraries

### 9.1 Official SDKs

```typescript
// JavaScript/TypeScript SDK
import { MixerAIClient } from '@mixerai/sdk';

const client = new MixerAIClient({
  apiKey: process.env.MIXERAI_API_KEY,
  environment: 'production' // or 'staging'
});

// Create content with AI
const content = await client.content.generate({
  brandId: 'brand_123',
  templateId: 'template_456',
  inputs: {
    topic: 'Summer safety',
    audience: 'Parents'
  }
});

// Real-time updates
client.subscriptions.onContentUpdate('content_123', (update) => {
  console.log('Content updated:', update);
});
```

### 9.2 Language Support

```yaml
Official SDKs:
  - JavaScript/TypeScript: npm install @mixerai/sdk
  - Python: pip install mixerai
  - Ruby: gem install mixerai
  - PHP: composer require mixerai/sdk
  - Go: go get github.com/mixerai/mixerai-go
  - Java: Maven/Gradle packages

Community SDKs:
  - .NET: Install-Package MixerAI.SDK
  - Rust: cargo add mixerai
  - Swift: Swift Package Manager
```

### 9.3 SDK Features

```typescript
interface SDKFeatures {
  // Authentication
  auth: {
    login(email: string, password: string): Promise<AuthTokens>
    logout(): Promise<void>
    refreshToken(): Promise<AuthTokens>
    setApiKey(key: string): void
  }
  
  // Resource management
  brands: BrandResource
  content: ContentResource
  users: UserResource
  workflows: WorkflowResource
  
  // AI tools
  ai: {
    generateContent(params: GenerateContentParams): Promise<GeneratedContent>
    generateAltText(images: ImageInput[]): Promise<AltTextResult[]>
    generateMetadata(params: MetadataParams): Promise<MetadataResult>
    transcreate(params: TranscreateParams): Promise<TranscreatedContent>
  }
  
  // Real-time
  subscriptions: {
    onContentUpdate(contentId: string, callback: Function): Subscription
    onWorkflowProgress(instanceId: string, callback: Function): Subscription
    onNotification(callback: Function): Subscription
  }
  
  // Utilities
  utils: {
    validateBrandSlug(slug: string): boolean
    estimateTokens(text: string): number
    formatCurrency(amount: number, currency: string): string
  }
}
```

---

## 📊 API Best Practices

### Request Guidelines
1. **Always include Brand Context**: Use `X-Brand-Context` header
2. **Use Pagination**: Never request more than 100 items
3. **Cache Responses**: Respect cache headers
4. **Compress Payloads**: Use gzip for large requests

### Security Best Practices
1. **Use HTTPS Always**: Never send credentials over HTTP
2. **Rotate API Keys**: Change keys every 90 days
3. **Implement Retry Logic**: With exponential backoff
4. **Validate Webhooks**: Verify signatures on incoming webhooks

### Performance Tips
1. **Use GraphQL for Complex Queries**: Reduce round trips
2. **Batch Operations**: Use bulk endpoints when available
3. **Subscribe to Updates**: Use WebSocket instead of polling
4. **Optimize Images**: Resize before uploading

### Error Handling
1. **Check Status Codes**: Don't just check success flag
2. **Log Request IDs**: Include in support tickets
3. **Handle Rate Limits**: Implement backoff strategies
4. **Graceful Degradation**: Have fallbacks for AI features

---

[← Back to Data Model](./05-DATA-MODEL-SCHEMA.md) | [Next: UI/UX Guidelines →](./07-UI-UX-DESIGN-SYSTEM.md)