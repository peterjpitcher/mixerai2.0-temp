# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
# Development
npm run dev              # Start development server on http://localhost:3000

# Building & Production
npm run build           # Build for production (includes memory optimization)
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint for code quality checks

# Testing
npm run test:openai     # Verify Azure OpenAI integration
```

## Architecture Overview

MixerAI 2.0 is a Next.js 14 application using the App Router for AI-powered content generation. Key architectural decisions:

### API Structure
- All API routes follow RESTful patterns under `/src/app/api/`
- Each resource (brands, content, templates, etc.) has its own route folder
- AI endpoints integrate with Azure OpenAI for content generation
- Consistent error handling and response formats across all endpoints

### Database & Authentication
- Supabase provides both PostgreSQL database and authentication
- Row-Level Security (RLS) policies enforce multi-tenant data isolation
- Type-safe database operations with generated types from Supabase
- Role-based access control: admin, user, viewer

### UI Component System
- Shadcn/ui components built on Radix UI primitives
- Tailwind CSS with custom design tokens for consistent styling
- Form handling with React Hook Form and Zod validation
- Rich text editing via React Quill

### Key Patterns
1. **Protected Routes**: Dashboard routes require authentication via middleware
2. **Data Fetching**: SWR for client-side data fetching with automatic caching
3. **Type Safety**: Comprehensive TypeScript usage with strict type checking
4. **API Integration**: Azure OpenAI client configured in `/src/lib/azure/openai.ts`

## Critical Implementation Details

### AI Content Generation Flow
1. User selects template and provides inputs via forms
2. Product context and claims are fetched from database
3. Prompt is constructed with template instructions and product data
4. Azure OpenAI generates content based on prompt
5. Generated content is saved with metadata and versioning

### Multi-Brand Architecture
- Each user belongs to a brand (organization)
- Brand-specific settings include colors, logos, and default values
- Content and templates are scoped to brands via foreign keys
- User permissions are brand-specific

### Environment Configuration
Required environment variables:
- `AZURE_OPENAI_API_KEY`: Azure OpenAI service key
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI endpoint URL
- `AZURE_OPENAI_DEPLOYMENT_NAME`: Deployment name for GPT model
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

## UI Standards Compliance

Follow the established design system:
- Use existing color tokens (primary, secondary, accent, etc.)
- Maintain consistent spacing with Tailwind classes
- Ensure all interactive elements meet WCAG 2.1 Level AA
- Include proper loading states and error handling
- Mobile-first responsive design is mandatory