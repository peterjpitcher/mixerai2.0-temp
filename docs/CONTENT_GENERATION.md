# Content Generation Feature

## Overview

The content generation feature in MixerAI 2.0 allows users to create high-quality marketing content using Azure OpenAI. This document outlines the technical implementation, workflows, and API endpoints related to content generation.

## Features

- AI-powered content generation based on user inputs
- Support for multiple content types (articles, product descriptions, etc.)
- Brand-specific tone and style guidance
- Metadata generation (meta titles and descriptions)
- Content saving to database with appropriate categorization
- Integration with the content workflow system

## Technical Implementation

### API Endpoints

#### Content Generation API

**Endpoint**: `POST /api/content/generate`  
**Purpose**: Generates content using Azure OpenAI based on user parameters  
**Implementation**: `src/app/api/content/generate/route.ts`

Request Format:
```json
{
  "contentType": "article | retailer_pdp | owned_pdp",
  "brand": {
    "name": "Brand Name",
    "brand_identity": "Brand identity description",
    "tone_of_voice": "Tone of voice guidelines",
    "guardrails": "Content guardrails"
  },
  "input": {
    "topic": "Main topic for articles",
    "keywords": ["keyword1", "keyword2"],
    "productName": "Product name for PDPs",
    "productDescription": "Product details for PDPs",
    "additionalInstructions": "Any additional guidance"
  }
}
```

Response Format:
```json
{
  "content": "Generated markdown content",
  "metaTitle": "Generated SEO title",
  "metaDescription": "Generated SEO description"
}
```

#### Content Storage API

**Endpoint**: `POST /api/content`  
**Purpose**: Saves generated content to the database  
**Implementation**: `src/app/api/content/route.ts`

Request Format:
```json
{
  "brand_id": "uuid",
  "content_type_id": "uuid",
  "created_by": "user_uuid",
  "title": "Content title",
  "body": "Full content body (markdown)",
  "meta_title": "SEO title",
  "meta_description": "SEO description",
  "status": "draft",
  "workflow_id": "optional_workflow_uuid",
  "current_step": 0
}
```

Response Format:
```json
{
  "success": true,
  "content": {
    "id": "uuid",
    "brand_id": "uuid",
    "content_type_id": "uuid",
    "created_by": "user_uuid",
    "title": "Content title",
    "body": "Full content body",
    "meta_title": "SEO title",
    "meta_description": "SEO description",
    "status": "draft",
    "workflow_id": "optional_workflow_uuid",
    "current_step": 0,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### Components

#### ContentGeneratorForm

**Location**: `src/components/content/content-generator-form.tsx`  
**Purpose**: Provides the UI for content generation with form fields for all necessary inputs

Key features:
- Selection of brand and content type
- Input fields for topic, keywords, and additional instructions
- Generation button that calls the Azure OpenAI API
- Preview of generated content with markdown rendering
- Form to edit generated content before saving
- Save functionality to persist content to the database
- Error handling and loading states
- Toast notifications for user feedback

#### MarkdownDisplay

**Location**: `src/components/content/markdown-display.tsx`  
**Purpose**: Renders markdown content with appropriate formatting

Key features:
- Converts markdown syntax to HTML for display
- Styled with appropriate typography
- Contained within a card component for consistent UI

### Pages

#### New Content Page

**Location**: `src/app/content/new/page.tsx`  
**Purpose**: Hosts the content generator form with appropriate layout and metadata

## How It Works

### Content Generation Flow

1. **Input Collection**:
   - User selects a brand from the database
   - User selects a content type (article, retailer PDP, owned PDP)
   - User enters topic, keywords, and additional instructions

2. **AI Generation**:
   - Frontend sends parameters to the `/api/content/generate` endpoint
   - Backend constructs an appropriate prompt based on:
     - Selected content type
     - Brand identity and tone of voice
     - User inputs (topic, keywords, etc.)
   - Azure OpenAI processes the prompt using a sophisticated system and user message structure
   - Generated content is returned with main body, meta title, and meta description

3. **Content Review**:
   - Generated content is displayed to the user in markdown format
   - User can review and make edits to the content, title, meta title, and meta description
   - User can regenerate the content if needed

4. **Content Saving**:
   - User saves the content to the database via the `/api/content` endpoint
   - Content is stored with appropriate metadata and relationships
   - Content is assigned a "draft" status and enters the appropriate workflow
   - User is redirected to the content list page

### Azure OpenAI Integration

The integration with Azure OpenAI is implemented in `src/lib/azure/openai.ts` with these key components:

1. **Client Initialization**:
   ```typescript
   const client = new OpenAI({
     apiKey: process.env.AZURE_OPENAI_API_KEY,
     baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments`,
     defaultQuery: { "api-version": "2023-09-01-preview" },
     defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY }
   });
   ```

2. **Prompt Construction**:
   - System message incorporates brand identity, tone of voice, and guardrails
   - User message includes content type-specific instructions and user inputs
   - Instructions for markdown formatting and meta information are included

3. **Response Processing**:
   - Extract content, meta title, and meta description from the AI response
   - Format and structure the data for frontend display

## Environment Variables

The content generation feature requires the following environment variables:

```
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_DEPLOYMENT=your_azure_openai_deployment_name
```

## Database Schema

The content generation feature uses the following tables:

### Content Table
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

### Content Types Table
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

## Future Enhancements

1. **Advanced Content Templates**: Add support for more specialized content types and structured templates
2. **Content Analytics**: Track performance metrics for generated content
3. **Image Generation**: Integrate with DALL-E or similar services for accompanying image generation
4. **SEO Optimization**: Add SEO analysis and improvement suggestions
5. **Content Versioning**: Track content revisions and allow for version comparison
6. **Multilingual Support**: Generate content in multiple languages
7. **Bulk Generation**: Create multiple pieces of content with a single request

## Testing

To test the content generation feature:

1. Ensure the required environment variables are set
2. Navigate to `/content/new`
3. Select a brand and content type
4. Enter a topic (e.g., "The Benefits of Sustainable Packaging")
5. Add keywords (e.g., "eco-friendly, sustainability, packaging")
6. Click "Generate Content"
7. Review the generated content
8. Edit if necessary
9. Click "Save Content"
10. Verify the content appears in the content list at `/content` 