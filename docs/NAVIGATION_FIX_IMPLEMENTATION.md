# Navigation Fix Implementation Plan (Revised)

## Introduction

This document provides a detailed implementation plan to fix the navigation issues in the MixerAI 2.0 application, specifically addressing the problem with content type submenu not displaying correctly. This plan incorporates senior developer feedback for more maintainable and performant solutions.

## Implementation Steps

### Step 1: Use Framework-Level Redirects

Instead of client-side redirects with useEffect, we'll implement Next.js framework-level redirects for better performance and maintainability.

**File:** `next.config.js`

**Current Implementation:**
```js
// Current next.config.js (likely without redirects)
const nextConfig = {
  // existing configuration
};

module.exports = nextConfig;
```

**Proposed Change:**
```js
// Updated next.config.js with redirects
const nextConfig = {
  // existing configuration
  
  async redirects() {
    return [
      // Redirect all content routes to dashboard/content routes
      {
        source: '/content/:slug*',
        destination: '/dashboard/content/:slug*',
        permanent: false,
      },
      // Ensure dashboard doesn't redirect to root
      {
        source: '/dashboard',
        destination: '/dashboard/home',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
```

For any pages that need server-side redirects, use Next.js's built-in redirect function:

**File:** `src/app/content/page.tsx`

**Proposed Change:**
```tsx
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/content');
}
```

Apply similar server-side redirects to other content pages as needed.

### Step 2: Create Dashboard Home Page

Create a dedicated dashboard home page that will be the entry point for the dashboard.

**File:** `src/app/dashboard/home/page.tsx` (new file)

```tsx
import {
  BookOpen,
  Building2,
  GitBranch,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { DomainCheck } from '@/components/domain-check';

export const metadata = {
  title: 'Dashboard | MixerAI',
  description: 'Manage your content, brands, and workflows',
};

function DashboardCard({ title, description, icon, href }) {
  return (
    <Link href={href}>
      <div className="p-6 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3 mb-2 text-primary">
          {icon}
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      
      {/* Domain verification component */}
      <DomainCheck />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Content"
          description="Create and manage content across different types"
          icon={<BookOpen className="h-6 w-6" />}
          href="/dashboard/content"
        />
        <DashboardCard
          title="Brands"
          description="Manage your brand profiles and settings"
          icon={<Building2 className="h-6 w-6" />}
          href="/dashboard/brands"
        />
        <DashboardCard
          title="Workflows"
          description="Set up content approval workflows"
          icon={<GitBranch className="h-6 w-6" />}
          href="/dashboard/workflows"
        />
        <DashboardCard
          title="Users"
          description="Manage user permissions and invitations"
          icon={<Users className="h-6 w-6" />}
          href="/dashboard/users"
        />
      </div>
    </div>
  );
}
```

### Step 3: Update Dashboard Index Page to Redirect to Home

**File:** `src/app/dashboard/page.tsx`

**Updated Implementation:**
```tsx
import { redirect } from 'next/navigation';

export default function DashboardIndex() {
  redirect('/dashboard/home');
}
```

### Step 4: Consolidate Navigation into a Single Layout Component

Instead of having multiple competing navigation systems, consolidate them into a single smart component.

**File:** `src/components/layout/unified-navigation.tsx` (new file)

```tsx
'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import {
  Home,
  GitBranch,
  BookOpen,
  Building2,
  Users,
  Settings,
  HelpCircle,
  FileText,
  ShoppingBag,
  Store
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  segment: string; // The layout segment this item corresponds to
}

interface NavGroupItem {
  label: string;
  icon: React.ReactNode;
  segment: string; 
  items: Omit<NavItem, 'segment'>[];
}

/**
 * Unified navigation component that handles both dashboard and regular layouts
 * with conditional rendering based on the current route
 */
export function UnifiedNavigation() {
  const segment = useSelectedLayoutSegment();
  
  // Dashboard-specific navigation items
  const navItems: (NavItem | NavGroupItem)[] = [
    {
      href: '/dashboard/home',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      segment: 'home'
    },
    {
      href: '/dashboard/workflows',
      label: 'Workflows',
      icon: <GitBranch className="h-5 w-5" />,
      segment: 'workflows'
    },
    {
      href: '/dashboard/brands',
      label: 'Brands',
      icon: <Building2 className="h-5 w-5" />,
      segment: 'brands'
    },
    // Content with submenu - always visible
    {
      label: 'Content',
      icon: <BookOpen className="h-5 w-5" />,
      segment: 'content',
      items: [
        {
          href: '/dashboard/content/article',
          label: 'Articles',
          icon: <FileText className="h-4 w-4" />
        },
        {
          href: '/dashboard/content/ownedpdp',
          label: 'Owned PDP',
          icon: <ShoppingBag className="h-4 w-4" />
        },
        {
          href: '/dashboard/content/retailerpdp',
          label: 'Retailer PDP',
          icon: <Store className="h-4 w-4" />
        }
      ]
    },
    {
      href: '/dashboard/users',
      label: 'Users',
      icon: <Users className="h-5 w-5" />,
      segment: 'users'
    }
  ];
  
  const bottomNavItems: NavItem[] = [
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      segment: 'settings'
    },
    {
      href: '/help',
      label: 'Help',
      icon: <HelpCircle className="h-5 w-5" />,
      segment: 'help'
    }
  ];
  
  const isActiveSegment = (navSegment: string) => {
    return segment === navSegment;
  };
  
  const isActiveSubItem = (href: string) => {
    // For subitems, we need to check if the path contains the content type
    // Extract the last segment from the href
    const itemSegment = href.split('/').pop();
    // Check if the current segment matches the item segment
    return segment === itemSegment;
  };
  
  return (
    <nav className="bg-side-nav w-64 p-4 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border sticky top-16 hidden lg:block">
      <div className="space-y-8">
        <div className="space-y-1">
          {navItems.map((item, index) => (
            'items' in item ? (
              <div key={index} className="space-y-1">
                {/* Group header */}
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium",
                  isActiveSegment(item.segment) 
                    ? "text-primary"
                    : "text-neutral-700"
                )}>
                  {item.icon}
                  {item.label}
                </div>
                
                {/* Group items - indented */}
                <div className="pl-6 space-y-1">
                  {item.items.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                        isActiveSubItem(subItem.href)
                          ? 'bg-primary text-white'
                          : 'text-neutral-700 hover:text-primary hover:bg-primary-50'
                      )}
                    >
                      {subItem.icon}
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActiveSegment(item.segment)
                    ? 'bg-primary text-white'
                    : 'text-neutral-700 hover:text-primary hover:bg-primary-50'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          ))}
        </div>
        
        <div className="pt-4 border-t border-border">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mt-1',
                isActiveSegment(item.segment)
                  ? 'bg-primary text-white'
                  : 'text-neutral-700 hover:text-primary hover:bg-primary-50'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
        
        <div className="pt-4 border-t border-border">
          <div className="p-3 bg-white rounded-md border border-border">
            <p className="text-xs text-neutral-600 mb-2">
              Need help creating content?
            </p>
            <Link
              href="/dashboard/workflows/templates"
              className="flex items-center justify-center bg-primary text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary-600 transition-colors"
            >
              View Templates
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default UnifiedNavigation;
```

### Step 5: Update Dashboard Layout to Use the Unified Navigation

**File:** `src/app/dashboard/layout.tsx`

**Updated Implementation:**
```tsx
'use client';

import Link from "next/link";
import { Button } from "@/components/button";
import { NotificationCenter } from "@/components/dashboard/notification-center";
import { UnifiedNavigation } from "@/components/layout/unified-navigation";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: '#13599f' }}>
        <div className="max-w-[1440px] mx-auto px-4 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <Link href="/dashboard/home" className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#13599f] font-bold text-xl">M</div>
              <h1 className="text-2xl font-bold">MixerAI 2.0</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationCenter />
            <Button variant="ghost" asChild className="text-white hover:bg-[#13599f]/80">
              <Link href="/dashboard/account">
                <span className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Account</span>
                </span>
              </Link>
            </Button>
            <Button variant="ghost" className="text-white hover:bg-[#13599f]/80">
              <span className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Log out</span>
              </span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Use the unified navigation component */}
        <UnifiedNavigation />

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Dynamic import for DomainVerification to avoid build errors */}
          {process.env.NODE_ENV === 'development' && (
            <div id="domain-verification-container" className="mb-4">
              {/* This will be populated client-side */}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Step 6: Extract DomainCheck Component

Move the domain check code into a separate component for better reusability.

**File:** `src/components/domain-check.tsx` (new file)

```tsx
'use client';

import { useEffect } from 'react';

export function DomainCheck() {
  useEffect(() => {
    const productionDomain = 'mixerai.orangejely.co.uk';
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      const container = document.getElementById('domain-verification-container');
      if (!container) return;
      
      const hostname = window.location.hostname;
      const isConfigured = hostname === productionDomain || 
                          process.env.NEXT_PUBLIC_APP_URL?.includes(productionDomain);
      
      if (!isConfigured) {
        container.innerHTML = `
          <div class="p-4 rounded-lg border border-yellow-500/50 text-yellow-700 bg-yellow-50 relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-4 top-4">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div class="pl-7">
              <h5 class="mb-1 font-medium leading-none tracking-tight">Domain Configuration Warning</h5>
              <div class="text-sm">
                The application is not configured to use the production domain <strong>${productionDomain}</strong>.<br>
                Run <code class="bg-muted px-1 rounded">./scripts/update-domain-config.sh</code> to configure the application.
              </div>
            </div>
          </div>
        `;
      }
    }
  }, []);
  
  return null;
}
```

### Step 7: Update Content Pages Links for Dashboard Routes

Ensure all links in dashboard content pages use the correct dashboard routes. Here's an example update for an article content page:

**File:** `src/app/dashboard/content/article/page.tsx`

```tsx
import { Button } from "@/components/button";
import Link from "next/link";
import { requireAuth } from '@/lib/auth/server';

export const metadata = {
  title: 'Articles | MixerAI',
  description: 'Manage article content for your brands',
};

export default async function ArticleContentPage() {
  await requireAuth();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
          <p className="text-muted-foreground">
            Manage long-form article content for your brands
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/content/new?type=Article">Create New Article</Link>
        </Button>
      </div>
      
      <div className="border rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Article Content Management</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          This page will display your articles with filters, search, and other customizations specific to article content.
        </p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/content/new?type=Article">Create Your First Article</Link>
        </Button>
      </div>
    </div>
  );
}
```

### Step 8: Add Cache-Busting Headers

To ensure navigation updates are always fresh without requiring users to manually clear their cache:

**File:** `src/app/layout.tsx` (update with cache control headers)

Add to the HTML head:

```tsx
export const metadata = {
  // existing metadata,
  
  // Add cache-control headers
  other: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};
```

### Step 9: Add Automated Testing

Create a simple Playwright test to verify navigation and redirects:

**File:** `e2e/navigation.spec.ts` (new file)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Navigation Tests', () => {
  test('should redirect from /content to /dashboard/content', async ({ page }) => {
    // Navigate to /content
    await page.goto('/content');
    
    // Should be redirected to /dashboard/content
    await expect(page).toHaveURL('/dashboard/content');
    
    // Sidebar should show "Content" section
    await expect(page.locator('nav').getByText('Content')).toBeVisible();
  });
  
  test('should show Articles submenu when on article page', async ({ page }) => {
    // Navigate to articles page
    await page.goto('/dashboard/content/article');
    
    // Content submenu should be visible
    await expect(page.locator('nav').getByText('Articles')).toBeVisible();
    
    // Articles link should be highlighted
    await expect(page.locator('nav').getByRole('link', { name: 'Articles' })).toHaveClass(/bg-primary/);
  });
  
  test('dashboard home page should show content cards', async ({ page }) => {
    // Navigate to dashboard home
    await page.goto('/dashboard/home');
    
    // Should see dashboard cards
    await expect(page.getByText('Content')).toBeVisible();
    await expect(page.getByText('Brands')).toBeVisible();
    await expect(page.getByText('Workflows')).toBeVisible();
  });
});
```

### Step 10: Create Storybook Story for Navigation Component

To isolate and test the navigation component:

**File:** `src/components/layout/unified-navigation.stories.tsx` (new file)

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { UnifiedNavigation } from './unified-navigation';
import { useState } from 'react';

// Mock next/navigation for Storybook
jest.mock('next/navigation', () => ({
  useSelectedLayoutSegment: () => {
    return mockSegment;
  },
}));

let mockSegment = 'content';

const meta: Meta<typeof UnifiedNavigation> = {
  title: 'Layout/UnifiedNavigation',
  component: UnifiedNavigation,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    activeSegment: {
      control: 'select',
      options: ['home', 'brands', 'content', 'workflows', 'users', 'article', 'ownedpdp', 'retailerpdp'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof UnifiedNavigation>;

export const Default: Story = {
  render: ({ activeSegment = 'home' }) => {
    mockSegment = activeSegment;
    return (
      <div style={{ width: '300px', height: '600px' }}>
        <UnifiedNavigation />
      </div>
    );
  },
};

export const ContentSubmenuActive: Story = {
  render: () => {
    mockSegment = 'article';
    return (
      <div style={{ width: '300px', height: '600px' }}>
        <UnifiedNavigation />
      </div>
    );
  },
};
```

## Conclusion

This revised implementation plan addresses the navigation issues with more maintainable and performant solutions, following best practices recommended by the senior developer:

1. **Framework-Level Redirects**: Using Next.js built-in redirects instead of client-side useEffect redirects
2. **Unified Navigation**: Consolidating navigation into a single component with useSelectedLayoutSegment
3. **Dashboard Home**: Creating a dedicated dashboard home page with proper structure
4. **Cache-Busting**: Adding headers to ensure navigation updates are seen immediately
5. **Automated Testing**: Adding test coverage for navigation and redirects

These changes will provide a consistent navigation experience while keeping the codebase maintainable and following Next.js best practices. 