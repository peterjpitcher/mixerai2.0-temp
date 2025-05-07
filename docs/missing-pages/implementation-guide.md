# MixerAI 2.0 Missing Pages Implementation Guide

This document provides detailed implementation guidance for recreating the high-priority missing pages in the MixerAI 2.0 application.

## Table of Contents

1. [Dashboard Content Listing Page](#dashboard-content-listing-page)
2. [Dashboard Brands Listing Page](#dashboard-brands-listing-page)
3. [Dashboard Workflows Listing Page](#dashboard-workflows-listing-page)
4. [Creation Pages](#creation-pages)

## Dashboard Content Listing Page

**Path:** `/dashboard/content/page.tsx`

### Component Structure

The content listing page should be implemented as a client component that includes:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/table';
import { 
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem 
} from '@/components/dropdown-menu';
import { useToast } from '@/components/toast-provider';
import { 
  Plus, Search, MoreVertical, Edit, Trash, Eye, ArrowUp, ArrowDown 
} from 'lucide-react';

export default function ContentPage() {
  // State management (content items, loading state, search/filter state)
  // Data fetching logic
  // UI rendering
}
```

### Data Requirements

- API endpoint: `/api/content` (GET)
- Response structure:
  ```typescript
  interface ContentItem {
    id: string;
    title: string;
    type: 'article' | 'ownedpdp' | 'retailerpdp';
    status: 'draft' | 'published' | 'archived';
    brand: {
      id: string;
      name: string;
      brand_color?: string;
    };
    created_by: {
      id: string;
      name: string;
    };
    created_at: string;
    updated_at: string;
  }
  ```

### UI Components

1. **Header Section**
   - Title: "Content"
   - "Create Content" button linking to `/dashboard/content/new`
   - Search input for filtering content items

2. **Filters**
   - Content type filter (Articles, Owned PDP, Retailer PDP)
   - Status filter (Draft, Published, Archived)
   - Brand filter (dropdown of all available brands)

3. **Content Table**
   - Columns: Title, Type, Brand, Status, Created By, Last Updated
   - Sortable columns with arrow indicators
   - Action dropdown (View, Edit, Delete)

4. **Loading/Empty States**
   - Loading spinner during data fetch
   - Empty state when no content exists or matches filters

### Code Snippets

#### Data Fetching

```typescript
useEffect(() => {
  const fetchContent = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/content');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch content');
      }
      
      setContent(data.content || []);
    } catch (error) {
      console.error('Error loading content:', error);
      toast({
        title: 'Error',
        description: 'Failed to load content. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchContent();
}, [toast]);
```

#### Content Table

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[300px] cursor-pointer" onClick={() => handleSort('title')}>
        <div className="flex items-center">
          Title
          <SortIndicator field="title" />
        </div>
      </TableHead>
      <TableHead className="w-[150px]">Type</TableHead>
      <TableHead className="w-[150px]">Brand</TableHead>
      <TableHead className="w-[120px]">Status</TableHead>
      <TableHead className="w-[150px]">Created By</TableHead>
      <TableHead className="w-[150px] cursor-pointer" onClick={() => handleSort('updated_at')}>
        <div className="flex items-center">
          Last Updated
          <SortIndicator field="updated_at" />
        </div>
      </TableHead>
      <TableHead className="w-[80px] text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {/* Map through content items */}
  </TableBody>
</Table>
```

## Dashboard Brands Listing Page

**Path:** `/dashboard/brands/page.tsx`

### Component Structure

The brands listing page can be implemented as a client component with a card-based view:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Card, CardContent, CardFooter } from '@/components/card';
import { useToast } from '@/components/toast-provider';
import { Plus, Search, Edit, Trash, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";

export default function BrandsPage() {
  // State management (brands, loading state, search state)
  // Data fetching logic
  // UI rendering
}
```

### Data Requirements

- API endpoint: `/api/brands` (GET)
- Response structure:
  ```typescript
  interface Brand {
    id: string;
    name: string;
    website_url?: string;
    brand_color?: string;
    country?: string;
    language?: string;
    content_count: number;
    created_at: string;
  }
  ```

### UI Components

1. **Header Section**
   - Title: "Brands"
   - "Create Brand" button linking to `/dashboard/brands/new`
   - Search input for filtering brands

2. **Brand Cards Grid**
   - Grid of cards, each representing a brand
   - Brand color as visual indicator
   - Content count and other key details
   - Action buttons (View, Edit, Delete)

3. **Loading/Empty States**
   - Loading spinner during data fetch
   - Empty state when no brands exist or match search

### Code Snippets

#### Brand Card Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {filteredBrands.map(brand => (
    <Card key={brand.id} className="overflow-hidden">
      <div 
        className="h-2" 
        style={{ backgroundColor: brand.brand_color || '#cbd5e1' }}
      />
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{brand.name}</h3>
            {brand.website_url && (
              <a 
                href={brand.website_url}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                {brand.website_url}
              </a>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/brands/${brand.id}`}>View</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/brands/${brand.id}/edit`}>Edit</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeleteBrand(brand)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Content</span>
            <span className="font-medium">{brand.content_count}</span>
          </div>
          {brand.country && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Country</span>
              <span>{brand.country}</span>
            </div>
          )}
          {brand.language && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Language</span>
              <span>{brand.language}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="bg-muted/20 px-6 py-3">
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/content?brandId=${brand.id}`}>
              View Content
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/brands/${brand.id}`}>
              Brand Details
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  ))}
</div>
```

## Dashboard Workflows Listing Page

**Path:** `/dashboard/workflows/page.tsx`

### Component Structure

The workflows listing page should be implemented as a client component with a table view:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/table';
import { 
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem 
} from '@/components/dropdown-menu';
import { Badge } from '@/components/badge';
import { useToast } from '@/components/toast-provider';
import { 
  Plus, Search, MoreVertical, Edit, Trash, GitBranch, ArrowUp, ArrowDown 
} from 'lucide-react';

export default function WorkflowsPage() {
  // State management (workflows, loading state, search/filter state)
  // Data fetching logic
  // UI rendering
}
```

### Data Requirements

- API endpoint: `/api/workflows` (GET)
- Response structure:
  ```typescript
  interface Workflow {
    id: string;
    name: string;
    description?: string;
    brand: {
      id: string;
      name: string;
      brand_color?: string;
    };
    status: 'active' | 'draft' | 'archived';
    steps_count: number;
    current_step?: number;
    created_by: {
      id: string;
      name: string;
    };
    created_at: string;
    updated_at: string;
  }
  ```

### UI Components

1. **Header Section**
   - Title: "Workflows"
   - "Create Workflow" button linking to `/dashboard/workflows/new`
   - Search input for filtering workflows

2. **Filters**
   - Status filter (Active, Draft, Archived)
   - Brand filter (dropdown of all available brands)

3. **Workflows Table**
   - Columns: Name, Brand, Status, Steps, Created By, Last Updated
   - Status badges with appropriate colors
   - Action dropdown (View, Edit, Delete)

4. **Loading/Empty States**
   - Loading spinner during data fetch
   - Empty state when no workflows exist or match filters

### Code Snippets

#### Status Badge Component

```tsx
const StatusBadge = ({ status }: { status: string }) => {
  const badgeStyles = {
    active: 'bg-green-100 text-green-800 hover:bg-green-100',
    draft: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    archived: 'bg-gray-100 text-gray-800 hover:bg-gray-100'
  };

  return (
    <Badge className={badgeStyles[status as keyof typeof badgeStyles] || badgeStyles.draft}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};
```

#### Workflow Table Row

```tsx
<TableRow key={workflow.id}>
  <TableCell className="font-medium">{workflow.name}</TableCell>
  <TableCell>
    <div className="flex items-center">
      <div 
        className="w-3 h-3 rounded-full mr-2" 
        style={{ backgroundColor: workflow.brand.brand_color || '#cbd5e1' }}
      />
      {workflow.brand.name}
    </div>
  </TableCell>
  <TableCell><StatusBadge status={workflow.status} /></TableCell>
  <TableCell>
    <div className="flex items-center">
      <GitBranch className="h-4 w-4 mr-1 text-muted-foreground" />
      {workflow.current_step ? `${workflow.current_step}/${workflow.steps_count}` : workflow.steps_count}
    </div>
  </TableCell>
  <TableCell>{workflow.created_by.name}</TableCell>
  <TableCell>{formatDate(workflow.updated_at)}</TableCell>
  <TableCell className="text-right">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/workflows/${workflow.id}`}>View</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/workflows/${workflow.id}/edit`}>Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDeleteWorkflow(workflow)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </TableCell>
</TableRow>
```

## Creation Pages

### Brand Creation Page

**Path:** `/dashboard/brands/new/page.tsx`

#### Component Structure

This page should be implemented as a client component with a form:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { useToast } from '@/components/toast-provider';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

export default function NewBrandPage() {
  // Form state, validation, and submission logic
  // UI rendering
}
```

#### Data Requirements

- API endpoint: `/api/brands` (POST)
- Request body structure:
  ```typescript
  interface CreateBrandRequest {
    name: string;
    website_url?: string;
    brand_color?: string;
    country?: string;
    language?: string;
    brand_identity?: string;
    tone_of_voice?: string;
    guardrails?: string;
  }
  ```

#### Form Structure

```tsx
<form onSubmit={handleSubmit} className="space-y-8">
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="name">Brand Name <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          name="name"
          value={form.name}
          onChange={handleInputChange}
          placeholder="Enter brand name"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="website_url">Website URL</Label>
        <Input
          id="website_url"
          name="website_url"
          value={form.website_url}
          onChange={handleInputChange}
          placeholder="https://example.com"
          type="url"
        />
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          name="country"
          value={form.country}
          onChange={handleInputChange}
          placeholder="Country"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="language">Language</Label>
        <Input
          id="language"
          name="language"
          value={form.language}
          onChange={handleInputChange}
          placeholder="Language"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="brand_color">Brand Color</Label>
        <div className="relative">
          <Input
            id="brand_color"
            name="brand_color"
            value={form.brand_color}
            onChange={handleInputChange}
            placeholder="#000000"
            style={{ 
              borderLeft: `2rem solid ${isValidHexColor(form.brand_color) ? form.brand_color : '#cbd5e1'}`
            }}
          />
          <div className="relative mt-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setShowColorPicker(!showColorPicker)}
            >
              {showColorPicker ? 'Close' : 'Pick'} Color
            </Button>
            {showColorPicker && (
              <div className="absolute z-10 mt-2">
                <HexColorPicker 
                  color={form.brand_color || '#000000'} 
                  onChange={(color) => setForm(prev => ({ ...prev, brand_color: color }))}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    
    <div className="space-y-2">
      <Label htmlFor="brand_identity">Brand Identity</Label>
      <Textarea
        id="brand_identity"
        name="brand_identity"
        value={form.brand_identity}
        onChange={handleTextareaChange}
        placeholder="Describe the brand identity..."
        rows={4}
      />
    </div>
    
    <div className="space-y-2">
      <Label htmlFor="tone_of_voice">Tone of Voice</Label>
      <Textarea
        id="tone_of_voice"
        name="tone_of_voice"
        value={form.tone_of_voice}
        onChange={handleTextareaChange}
        placeholder="Describe the brand's tone of voice..."
        rows={3}
      />
    </div>
    
    <div className="space-y-2">
      <Label htmlFor="guardrails">Content Guardrails</Label>
      <Textarea
        id="guardrails"
        name="guardrails"
        value={form.guardrails}
        onChange={handleTextareaChange}
        placeholder="List content guardrails..."
        rows={3}
      />
    </div>
  </div>
  
  <div className="flex justify-end space-x-4">
    <Button variant="outline" type="button" asChild>
      <Link href="/dashboard/brands">Cancel</Link>
    </Button>
    <Button type="submit" disabled={isSaving}>
      {isSaving ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          Create Brand
        </>
      )}
    </Button>
  </div>
</form>
```

### Content Creation Page

**Path:** `/dashboard/content/new/page.tsx`

Similar form structure to the brand creation page, but with content-specific fields. The full implementation would include fields for:

- Content type selection
- Title and metadata
- Brand association
- Content body with rich text editor
- Status selection
- Workflow assignment (optional)

### Workflow Creation Page

**Path:** `/dashboard/workflows/new/page.tsx`

This page would include a multi-step form for:

- Basic workflow information
- Step configuration
- Assignee selection
- Brand association
- Status settings

Each of these creation pages would follow similar patterns of form management, validation, and API submission, with specialized fields relevant to their entity type. 