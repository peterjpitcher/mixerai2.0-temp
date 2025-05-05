# Two-Column Layout Implementation Guide

This document provides detailed specifications for implementing the two-column layout component and applying it to brand pages in MixerAI 2.0.

## Component Specification

### 1. Component Structure

```typescript
// src/components/layout/two-column-layout.tsx
'use client';

import React from 'react';

interface TwoColumnLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: string;
  rightWidth?: string;
}

export default function TwoColumnLayout({
  left,
  right,
  leftWidth = "w-full md:w-2/3", // Default to 2/3 width on desktop
  rightWidth = "w-full md:w-1/3", // Default to 1/3 width on desktop
}: TwoColumnLayoutProps) {
  return (
    <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
      <div className={leftWidth}>
        {left}
      </div>
      <div className={rightWidth}>
        {right}
      </div>
    </div>
  );
}
```

### 2. Responsive Behavior

- **Mobile View** (< 768px):
  - Columns stack vertically
  - Each column takes full width
  - 1.5rem (24px) gap between columns

- **Desktop View** (≥ 768px):
  - Columns display side-by-side
  - Default left column: 2/3 width
  - Default right column: 1/3 width
  - 1.5rem (24px) gap between columns

### 3. Customization Options

- **Column Widths**:
  - Configurable through `leftWidth` and `rightWidth` props
  - Uses Tailwind CSS classes for flexibility
  - Recommended combinations:
    - Left 2/3, Right 1/3 (default)
    - Left 3/4, Right 1/4
    - Left 1/2, Right 1/2

## Implementation in Brand Pages

### 1. Brand Edit Page (`/brands/[id]/edit/page.tsx`)

```tsx
// Main component structure
return (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h1 className="text-3xl font-bold tracking-tight">Edit Brand</h1>
      <Button variant="outline" asChild>
        <Link href={`/brands/${id}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Brand
        </Link>
      </Button>
    </div>

    <TwoColumnLayout
      left={
        <Tabs 
          defaultValue="basic-details" 
          className="w-full"
          value={currentTab}
          onValueChange={setCurrentTab}
        >
          {/* Tabs content here */}
        </Tabs>
      }
      right={
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Preview</CardTitle>
              <CardDescription>
                Preview how your brand will appear
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                {/* Brand icon preview */}
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: brand.brand_color || '#3498db' }}
                >
                  {brand.name ? brand.name[0].toUpperCase() : 'B'}
                </div>
                <div>
                  <h3 className="font-medium">{brand.name || 'Brand Name'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {brand.country && COUNTRIES.find(c => c.value === brand.country)?.label}{' '}
                    {brand.language && brand.country && '•'}{' '}
                    {brand.language && LANGUAGES.find(l => l.value === brand.language)?.label}
                  </p>
                </div>
              </div>
              
              {/* Brand details preview */}
              {brand.brand_identity && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-1">Brand Identity</h4>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {brand.brand_identity}
                  </p>
                </div>
              )}
              
              {/* Help content */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-2">Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start">
                    <span className="bg-primary/10 text-primary rounded-full p-1 mr-2">
                      <Check className="h-3 w-3" />
                    </span>
                    Add your brand's website to generate content automatically
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 text-primary rounded-full p-1 mr-2">
                      <Check className="h-3 w-3" />
                    </span>
                    Select your brand's country to get region-specific recommendations
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 text-primary rounded-full p-1 mr-2">
                      <Check className="h-3 w-3" />
                    </span>
                    Choose a distinctive brand color to improve recognition
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    />

    {/* Dialog components */}
  </div>
);
```

### 2. Brand New Page (`/brands/new/page.tsx`)

Similar implementation as the edit page, but with form fields initialized to empty state.

## Styling Guidelines

1. **Consistency with Design System**:
   - Use existing color schemes and shadows
   - Match spacing patterns with other components
   - Maintain typography hierarchy

2. **White Space**:
   - 1.5rem gap between columns
   - 1rem internal padding for cards
   - 1.5rem vertical spacing between sections

## Testing Considerations

1. **Resize Testing**:
   - Verify correct stacking behavior at mobile breakpoint
   - Confirm spacing adjusts properly at different widths

2. **Content Overflow**:
   - Test with short and long content in both columns
   - Ensure columns handle varied content lengths gracefully

3. **Accessibility**:
   - Maintain logical tab order across two columns
   - Ensure proper heading hierarchy in both columns 