# Content Components

This directory contains React components related to content management and generation in MixerAI 2.0.

## Overview

The components in this directory handle:
- Content generation using Azure OpenAI
- Content display and formatting
- Content approval workflows

## Components

### ContentGeneratorForm

The main component for AI content generation. It provides a form that allows users to:
1. Select a brand and content type
2. Input topic, keywords, and additional instructions
3. Generate content using AI
4. Preview and edit the generated content
5. Save the content to the database

**File**: `content-generator-form.tsx`

**Usage**:
```tsx
import { ContentGeneratorForm } from '@/components/content/content-generator-form';

export default function NewContentPage() {
  return (
    <div>
      <h1>Create New Content</h1>
      <ContentGeneratorForm />
    </div>
  );
}
```

### MarkdownDisplay

A utility component that renders markdown content with proper formatting.

**File**: `markdown-display.tsx`

**Usage**:
```tsx
import { MarkdownDisplay } from '@/components/content/markdown-display';

// Inside your component
<MarkdownDisplay content={markdownString} />
```

### ContentApprovalWorkflow

Manages the approval workflow for content, including step progression and status updates.

**File**: `content-approval-workflow.tsx`

## API Integration

The content generation components interact with two main API endpoints:

1. **Content Generation**: `POST /api/content/generate`
2. **Content Storage**: `POST /api/content`

See the [Content Generation Documentation](/docs/CONTENT_GENERATION.md) for detailed API specifications.

## Development Guidelines

When working with these components:

1. **Azure OpenAI Integration**:
   - Ensure environment variables are properly configured
   - Use the OpenAI client from `src/lib/azure/openai.ts`

2. **Content Structure**:
   - Follow the established pattern for handling markdown content
   - Include meta title and meta description for all content

3. **Error Handling**:
   - Implement proper loading states
   - Use toast notifications for user feedback
   - Handle API errors gracefully

4. **State Management**:
   - Keep form state and generated content in local state
   - Use React hooks for side effects and lifecycle management

5. **UI Consistency**:
   - Use shadcn/ui components for styling
   - Follow the design system for inputs, buttons, and layout

## Related Files

- API endpoint: `src/app/api/content/generate/route.ts`
- OpenAI client: `src/lib/azure/openai.ts`
- New content page: `src/app/content/new/page.tsx`
- Content API: `src/app/api/content/route.ts` 