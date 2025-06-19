# AI Title Generation Feature

## Overview
This document describes the AI-powered title generation feature that has been integrated into the content creation workflow.

## What Changed

### 1. Backend API Enhancement
- The existing `/api/ai/generate-title` endpoint is now properly integrated into the content creation flow
- The endpoint accepts:
  - `contentBody`: The generated content to create a title for
  - `brand_id`: The brand context for tone and style
  - `topic` (optional): Additional context from template fields
  - `keywords` (optional): Keywords to consider in title generation

### 2. Content Generator Hook Updates (`/src/hooks/use-content-generator.ts`)
- Added `generateTitle` function that calls the AI title generation API
- Updated `saveContent` function to automatically generate a title if one isn't provided
- Title generation happens after content is generated but before saving
- Falls back to `{Template Name} - {Date}` format if AI generation fails

### 3. UI Enhancements (`/src/components/content/content-generator-form-refactored.tsx`)
- Added a title input field in the "Generated Content" section
- Added "Generate Title" button with AI sparkle icon
- Shows loading state while generating title
- Allows manual editing of generated titles
- Title generation is optional - users can type their own

## User Experience Flow

1. User fills in template fields and generates content
2. Generated content appears with an empty title field
3. User can either:
   - Type their own title manually
   - Click "Generate Title" to use AI
   - Leave it empty (auto-generates on save)
4. When saving, if no title exists, AI automatically generates one
5. If AI fails, falls back to a default format

## Technical Implementation

### Key Functions

```typescript
// Generate title using AI
const generateTitle = useCallback(async (contentBody: string): Promise<string | null> => {
  // Calls /api/ai/generate-title with content and brand context
  // Returns generated title or null on failure
}, [selectedBrand, templateFieldValues]);

// Save content with automatic title generation
const saveContent = useCallback(async () => {
  // Get primary body content
  // If no title exists, generate one using AI
  // Fall back to default format if AI fails
  // Save content with generated or manual title
}, [...dependencies]);
```

### UI Components

```tsx
{/* Title Field with Generate Button */}
<div className="space-y-2">
  <Label htmlFor="content-title">Title</Label>
  <div className="flex gap-2">
    <Input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      placeholder={isGeneratingTitle ? "Generating title..." : "Enter content title"}
    />
    <Button onClick={generateTitle}>
      <Sparkles /> Generate Title
    </Button>
  </div>
</div>
```

## Benefits

1. **Time Saving**: No need to manually create titles for every piece of content
2. **SEO Optimized**: AI generates engaging, keyword-aware titles
3. **Brand Consistent**: Uses brand voice and tone settings
4. **Flexible**: Users can override or edit AI suggestions
5. **Fallback Safe**: Never blocks content creation if AI is unavailable

## Testing

Use the provided test script to verify functionality:

```bash
node scripts/test-title-generation.js
```

## Future Enhancements

1. Multiple title suggestions for users to choose from
2. Title optimization based on content type (blog, social, email)
3. A/B testing integration for title performance
4. Character limit enforcement for different platforms