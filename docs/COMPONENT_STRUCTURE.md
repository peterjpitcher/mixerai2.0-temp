# MixerAI 2.0 Component Structure

This document outlines the component structure and organization in the MixerAI 2.0 application.

## Component Organization

The UI components are organized in a flat structure directly under the `src/components` directory instead of using the traditional shadcn/ui nested structure. This makes imports more straightforward.

### Component Import Pattern

When importing components, use the following pattern:

```tsx
import { Button } from "@/components/button";
import { Card } from "@/components/card";
```

Do not use the following pattern which would be incorrect in this project:

```tsx
// ❌ INCORRECT - Don't use this pattern
import { Button } from "@/components/ui/button";
```

## Core UI Components

The following core UI components are available directly in the `src/components` directory:

- `alert.tsx` - Alert component for notifications
- `avatar.tsx` - Avatar component for user profiles
- `badge.tsx` - Badge component for status indicators
- `button.tsx` - Button component with different variants
- `card.tsx` - Card component with headers, content, and footers
- `checkbox.tsx` - Checkbox input component
- `dialog.tsx` - Dialog/modal component
- `dropdown-menu.tsx` - Dropdown menu component
- `form.tsx` - Form components with validation
- `input.tsx` - Text input component
- `label.tsx` - Form label component
- `popover.tsx` - Popover component for tooltips and contextual information
- `select.tsx` - Select dropdown component
- `separator.tsx` - Horizontal/vertical separator
- `sheet.tsx` - Sheet/drawer component for sliding panels
- `tabs.tsx` - Tabbed interface components
- `textarea.tsx` - Multiline text input component
- `toast.tsx` - Toast notification component
- `toast-provider.tsx` - Provider for toast notifications

## Feature-Specific Components

Feature-specific components are organized into subdirectories:

### Dashboard Components

Located in `src/components/dashboard`:

- `analytics-overview.tsx` - Dashboard analytics components
- `mobile-notification-panel.tsx` - Mobile-friendly notification panel
- `notification-center.tsx` - Notification center for displaying alerts
- `notifications.tsx` - Notification components for system messages

### Content Components

Located in `src/components/content`:

- `content-approval-workflow.tsx` - Content approval workflow interface
- `content-generator-form.tsx` - Form for generating content with AI
- `markdown-display.tsx` - Component for displaying markdown content

### Workflow Components

Located in `src/components/workflows`:

- `workflow-builder.tsx` - Interface for building content workflows
- `workflow-step.tsx` - Individual workflow step component
- `workflow-visualizer.tsx` - Visual representation of workflows

## Additional Utility Components

Other utility components are available:

- `charts.tsx` - Chart components for data visualization
- `responsive-table.tsx` - Responsive table component
- `scroll-area.tsx` - Scrollable area component
- `skeleton.tsx` - Loading skeleton components

## Using Components

When building new features, follow these guidelines:

1. Use existing components whenever possible
2. Keep component imports clean and consistent
3. For common UI elements, use the core components
4. For feature-specific UI, create components in the appropriate subdirectory
5. Follow the established patterns for props and styling

Example usage:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { toast } from '@/components/toast-provider';

export function MyComponent() {
  const [name, setName] = useState('');
  
  const handleSubmit = () => {
    // Handle form submission
    toast({
      title: 'Success',
      description: 'Form submitted successfully',
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Component</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit}>Submit</Button>
        </div>
      </CardContent>
    </Card>
  );
} 