# MixerAI 2.0 UI/UX Guidelines and Design System
## User Interface Standards and Component Library

Version: 1.0  
Date: December 2024  
[← Back to API Specification](./06-API-SPECIFICATION.md) | [Next: Non-Functional Requirements →](./10-NON-FUNCTIONAL-REQUIREMENTS.md)

---

## 📋 Table of Contents

1. [Design Principles](#1-design-principles)
2. [Visual Design System](#2-visual-design-system)
3. [Component Library](#3-component-library)
4. [Layout & Grid System](#4-layout--grid-system)
5. [Interaction Patterns](#5-interaction-patterns)
6. [Content Guidelines](#6-content-guidelines)
7. [Accessibility Standards](#7-accessibility-standards)
8. [Responsive Design](#8-responsive-design)
9. [Motion & Animation](#9-motion--animation)
10. [Design Tokens](#10-design-tokens)

---

## 1. Design Principles

### 1.1 Core Principles

#### Clarity First
- **Clear Information Hierarchy**: Most important information is immediately visible
- **Progressive Disclosure**: Show only what's needed, when it's needed
- **Consistent Patterns**: Same actions work the same way everywhere
- **Meaningful Feedback**: Every action has a clear response

#### Efficiency Focused
- **Minimize Clicks**: Common tasks completed in 3 clicks or less
- **Smart Defaults**: Pre-fill with intelligent suggestions
- **Bulk Operations**: Enable power users to work faster
- **Keyboard Navigation**: Full keyboard support for all actions

#### Trust Through Transparency
- **Show System Status**: Users always know what's happening
- **Explain AI Actions**: Make AI decisions understandable
- **Clear Error Messages**: Tell users what went wrong and how to fix it
- **Audit Trail**: Show who did what and when

#### Delightful Experience
- **Smooth Interactions**: Thoughtful micro-animations
- **Personality**: Professional but approachable
- **Celebrate Success**: Acknowledge user achievements
- **Helpful Guidance**: Contextual help when needed

### 1.2 Design Philosophy

```yaml
User-Centered Design:
  Research: Continuous user feedback and testing
  Iteration: Design, test, refine, repeat
  Accessibility: Design for all users from the start
  Performance: Beautiful and fast

Brand Alignment:
  Professional: Enterprise-ready appearance
  Modern: Current design trends, tastefully applied
  Flexible: Adapts to client brand colors
  Scalable: Works for 10 or 10,000 users
```

---

## 2. Visual Design System

### 2.1 Color System

```scss
// Primary Colors
$primary-50: #E8F0FF;
$primary-100: #C4D9FF;
$primary-200: #9FC2FF;
$primary-300: #7AABFF;
$primary-400: #5594FF;
$primary-500: #307DFF; // Main brand color
$primary-600: #2B6FE5;
$primary-700: #2661CC;
$primary-800: #2053B2;
$primary-900: #1B4599;

// Neutral Colors
$gray-50: #F9FAFB;
$gray-100: #F3F4F6;
$gray-200: #E5E7EB;
$gray-300: #D1D5DB;
$gray-400: #9CA3AF;
$gray-500: #6B7280;
$gray-600: #4B5563;
$gray-700: #374151;
$gray-800: #1F2937;
$gray-900: #111827;

// Semantic Colors
$success-500: #10B981;
$warning-500: #F59E0B;
$error-500: #EF4444;
$info-500: #3B82F6;

// Surface Colors
$surface-primary: #FFFFFF;
$surface-secondary: #F9FAFB;
$surface-tertiary: #F3F4F6;
$surface-inverse: #1F2937;

// Text Colors
$text-primary: #111827;
$text-secondary: #4B5563;
$text-tertiary: #9CA3AF;
$text-inverse: #FFFFFF;
$text-link: #307DFF;

// Brand-Specific Overrides
$brand-primary: var(--brand-primary, $primary-500);
$brand-secondary: var(--brand-secondary, $primary-600);
```

### 2.2 Typography

```scss
// Font Stack
$font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                   Roboto, 'Helvetica Neue', Arial, sans-serif;
$font-family-mono: 'JetBrains Mono', Monaco, Consolas, 'Courier New', monospace;

// Type Scale
$text-xs: 0.75rem;    // 12px
$text-sm: 0.875rem;   // 14px
$text-base: 1rem;     // 16px
$text-lg: 1.125rem;   // 18px
$text-xl: 1.25rem;    // 20px
$text-2xl: 1.5rem;    // 24px
$text-3xl: 1.875rem;  // 30px
$text-4xl: 2.25rem;   // 36px
$text-5xl: 3rem;      // 48px

// Font Weights
$font-thin: 100;
$font-light: 300;
$font-normal: 400;
$font-medium: 500;
$font-semibold: 600;
$font-bold: 700;
$font-black: 900;

// Line Heights
$leading-none: 1;
$leading-tight: 1.25;
$leading-snug: 1.375;
$leading-normal: 1.5;
$leading-relaxed: 1.625;
$leading-loose: 2;

// Typography Styles
.heading-1 {
  font-size: $text-4xl;
  font-weight: $font-bold;
  line-height: $leading-tight;
  letter-spacing: -0.02em;
}

.heading-2 {
  font-size: $text-3xl;
  font-weight: $font-semibold;
  line-height: $leading-snug;
  letter-spacing: -0.01em;
}

.heading-3 {
  font-size: $text-2xl;
  font-weight: $font-semibold;
  line-height: $leading-snug;
}

.body-large {
  font-size: $text-lg;
  font-weight: $font-normal;
  line-height: $leading-relaxed;
}

.body-default {
  font-size: $text-base;
  font-weight: $font-normal;
  line-height: $leading-normal;
}

.body-small {
  font-size: $text-sm;
  font-weight: $font-normal;
  line-height: $leading-normal;
}

.caption {
  font-size: $text-xs;
  font-weight: $font-medium;
  line-height: $leading-normal;
  letter-spacing: 0.03em;
}
```

### 2.3 Spacing System

```scss
// Base unit: 4px
$space-0: 0;
$space-px: 1px;
$space-0_5: 0.125rem;  // 2px
$space-1: 0.25rem;     // 4px
$space-1_5: 0.375rem;  // 6px
$space-2: 0.5rem;      // 8px
$space-2_5: 0.625rem;  // 10px
$space-3: 0.75rem;     // 12px
$space-3_5: 0.875rem;  // 14px
$space-4: 1rem;        // 16px
$space-5: 1.25rem;     // 20px
$space-6: 1.5rem;      // 24px
$space-7: 1.75rem;     // 28px
$space-8: 2rem;        // 32px
$space-9: 2.25rem;     // 36px
$space-10: 2.5rem;     // 40px
$space-11: 2.75rem;    // 44px
$space-12: 3rem;       // 48px
$space-14: 3.5rem;     // 56px
$space-16: 4rem;       // 64px
$space-20: 5rem;       // 80px
$space-24: 6rem;       // 96px
$space-28: 7rem;       // 112px
$space-32: 8rem;       // 128px

// Component Spacing
$component-padding-xs: $space-2 $space-3;
$component-padding-sm: $space-3 $space-4;
$component-padding-md: $space-4 $space-6;
$component-padding-lg: $space-6 $space-8;
$component-padding-xl: $space-8 $space-10;
```

### 2.4 Elevation System

```scss
// Shadow Scale
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
$shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
$shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
$shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
$shadow-none: none;

// Elevation Levels
.elevation-0 { box-shadow: $shadow-none; }
.elevation-1 { box-shadow: $shadow-sm; }
.elevation-2 { box-shadow: $shadow-base; }
.elevation-3 { box-shadow: $shadow-md; }
.elevation-4 { box-shadow: $shadow-lg; }
.elevation-5 { box-shadow: $shadow-xl; }
```

---

## 3. Component Library

### 3.1 Buttons

```tsx
// Button Component
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

// Button Styles
const buttonVariants = {
  primary: {
    background: '$primary-500',
    color: 'white',
    hover: {
      background: '$primary-600',
      shadow: '$shadow-md'
    },
    active: {
      background: '$primary-700'
    }
  },
  secondary: {
    background: '$gray-100',
    color: '$gray-700',
    hover: {
      background: '$gray-200'
    }
  },
  outline: {
    background: 'transparent',
    border: '1px solid $gray-300',
    color: '$gray-700',
    hover: {
      background: '$gray-50',
      borderColor: '$gray-400'
    }
  },
  ghost: {
    background: 'transparent',
    color: '$gray-600',
    hover: {
      background: '$gray-100',
      color: '$gray-700'
    }
  },
  danger: {
    background: '$error-500',
    color: 'white',
    hover: {
      background: '$error-600'
    }
  }
}

// Button Sizes
const buttonSizes = {
  xs: {
    padding: '$space-1 $space-2',
    fontSize: '$text-xs',
    height: '24px'
  },
  sm: {
    padding: '$space-2 $space-3',
    fontSize: '$text-sm',
    height: '32px'
  },
  md: {
    padding: '$space-2_5 $space-4',
    fontSize: '$text-sm',
    height: '40px'
  },
  lg: {
    padding: '$space-3 $space-5',
    fontSize: '$text-base',
    height: '48px'
  },
  xl: {
    padding: '$space-4 $space-6',
    fontSize: '$text-lg',
    height: '56px'
  }
}

// Button Examples
<Button variant="primary" size="md">
  Create Content
</Button>

<Button variant="secondary" size="md" icon={<PlusIcon />}>
  Add Template
</Button>

<Button variant="outline" size="sm" loading>
  Generating...
</Button>
```

### 3.2 Form Controls

```tsx
// Input Component
interface InputProps {
  type: 'text' | 'email' | 'password' | 'number' | 'search'
  size: 'sm' | 'md' | 'lg'
  state?: 'default' | 'success' | 'error'
  icon?: ReactNode
  prefix?: string
  suffix?: string
  helper?: string
  error?: string
}

// Input Styles
.input {
  width: 100%;
  border: 1px solid $gray-300;
  border-radius: 6px;
  font-size: $text-sm;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: $primary-500;
    box-shadow: 0 0 0 3px rgba(48, 125, 255, 0.1);
  }
  
  &.error {
    border-color: $error-500;
    
    &:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  }
  
  &.success {
    border-color: $success-500;
  }
}

// Select Component
interface SelectProps {
  options: Array<{
    value: string
    label: string
    icon?: ReactNode
  }>
  multiple?: boolean
  searchable?: boolean
  placeholder?: string
}

// Checkbox & Radio
interface CheckboxProps {
  label: string
  description?: string
  indeterminate?: boolean
  size?: 'sm' | 'md' | 'lg'
}

// Switch/Toggle
interface SwitchProps {
  label: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'warning'
}
```

### 3.3 Cards & Containers

```tsx
// Card Component
interface CardProps {
  variant?: 'elevated' | 'outlined' | 'filled'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
}

// Card Styles
.card {
  background: $surface-primary;
  border-radius: 8px;
  overflow: hidden;
  
  &.elevated {
    box-shadow: $shadow-base;
    
    &:hover.interactive {
      box-shadow: $shadow-md;
      transform: translateY(-2px);
    }
  }
  
  &.outlined {
    border: 1px solid $gray-200;
    
    &:hover.interactive {
      border-color: $gray-300;
      background: $gray-50;
    }
  }
  
  &.filled {
    background: $surface-secondary;
  }
}

// Content Card Example
<Card variant="elevated" padding="lg">
  <CardHeader>
    <CardTitle>Blog Post Title</CardTitle>
    <CardMeta>
      <StatusBadge status="draft" />
      <TimeAgo date={createdAt} />
    </CardMeta>
  </CardHeader>
  
  <CardBody>
    <p className="text-secondary">
      {excerpt}
    </p>
  </CardBody>
  
  <CardFooter>
    <Button variant="outline" size="sm">Edit</Button>
    <Button variant="primary" size="sm">Preview</Button>
  </CardFooter>
</Card>
```

### 3.4 Navigation Components

```tsx
// Navigation Bar
interface NavBarProps {
  logo: ReactNode
  items: NavItem[]
  actions?: ReactNode
  user?: User
}

// Sidebar Navigation
interface SidebarProps {
  items: Array<{
    label: string
    icon: ReactNode
    href?: string
    children?: NavItem[]
    badge?: string | number
  }>
  collapsed?: boolean
  footer?: ReactNode
}

// Breadcrumbs
interface BreadcrumbProps {
  items: Array<{
    label: string
    href?: string
    icon?: ReactNode
  }>
  separator?: 'slash' | 'chevron' | 'arrow'
}

// Tabs
interface TabsProps {
  items: Array<{
    key: string
    label: string
    icon?: ReactNode
    badge?: string | number
    disabled?: boolean
  }>
  variant?: 'line' | 'pills' | 'enclosed'
  size?: 'sm' | 'md' | 'lg'
}
```

### 3.5 Feedback Components

```tsx
// Alert Component
interface AlertProps {
  variant: 'info' | 'success' | 'warning' | 'error'
  title?: string
  description: string
  closable?: boolean
  action?: ReactNode
  icon?: ReactNode | boolean
}

// Toast Notification
interface ToastProps {
  variant: 'info' | 'success' | 'warning' | 'error'
  title: string
  description?: string
  duration?: number // ms
  action?: {
    label: string
    onClick: () => void
  }
}

// Progress Indicators
interface ProgressProps {
  variant?: 'linear' | 'circular'
  value?: number // 0-100
  indeterminate?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'warning'
  label?: string
}

// Loading States
interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: number | string
  height?: number | string
  animation?: 'pulse' | 'wave' | 'none'
}

// Empty States
interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'error' | 'search'
}
```

### 3.6 Overlay Components

```tsx
// Modal/Dialog
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  actions?: ReactNode
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

// Dropdown Menu
interface DropdownProps {
  trigger: ReactNode
  items: Array<{
    label: string
    icon?: ReactNode
    onClick?: () => void
    href?: string
    disabled?: boolean
    danger?: boolean
    divider?: boolean
  }>
  placement?: 'bottom' | 'top' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
}

// Tooltip
interface TooltipProps {
  content: ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  arrow?: boolean
  interactive?: boolean
}

// Popover
interface PopoverProps {
  trigger: ReactNode
  content: ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  width?: number | 'auto'
  closeOnClickOutside?: boolean
}
```

---

## 4. Layout & Grid System

### 4.1 Grid System

```scss
// Grid Container
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 $space-4;
  
  @media (min-width: 640px) {
    padding: 0 $space-6;
  }
  
  @media (min-width: 1024px) {
    padding: 0 $space-8;
  }
}

// Grid
.grid {
  display: grid;
  gap: $space-4;
  
  &.cols-1 { grid-template-columns: repeat(1, 1fr); }
  &.cols-2 { grid-template-columns: repeat(2, 1fr); }
  &.cols-3 { grid-template-columns: repeat(3, 1fr); }
  &.cols-4 { grid-template-columns: repeat(4, 1fr); }
  &.cols-5 { grid-template-columns: repeat(5, 1fr); }
  &.cols-6 { grid-template-columns: repeat(6, 1fr); }
  &.cols-12 { grid-template-columns: repeat(12, 1fr); }
}

// Flexbox Utilities
.flex { display: flex; }
.flex-row { flex-direction: row; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }
.items-start { align-items: flex-start; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }
.justify-start { justify-content: flex-start; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }
.gap-1 { gap: $space-1; }
.gap-2 { gap: $space-2; }
.gap-3 { gap: $space-3; }
.gap-4 { gap: $space-4; }
```

### 4.2 Page Layouts

```tsx
// Dashboard Layout
interface DashboardLayoutProps {
  sidebar: ReactNode
  header: ReactNode
  content: ReactNode
  footer?: ReactNode
}

const DashboardLayout = () => (
  <div className="dashboard-layout">
    <aside className="sidebar">
      {/* Logo, Navigation, User */}
    </aside>
    
    <div className="main-content">
      <header className="top-bar">
        {/* Breadcrumbs, Search, Actions */}
      </header>
      
      <main className="content-area">
        {/* Page Content */}
      </main>
      
      <footer className="footer">
        {/* Copyright, Links */}
      </footer>
    </div>
  </div>
)

// Content Layout
const ContentLayout = () => (
  <div className="content-layout">
    <div className="content-header">
      <h1>Page Title</h1>
      <div className="actions">
        <Button>Primary Action</Button>
      </div>
    </div>
    
    <div className="content-body">
      {/* Main Content */}
    </div>
  </div>
)

// Split Layout
const SplitLayout = () => (
  <div className="split-layout">
    <div className="split-panel left">
      {/* List/Navigation */}
    </div>
    
    <div className="split-panel right">
      {/* Detail View */}
    </div>
  </div>
)
```

### 4.3 Responsive Breakpoints

```scss
// Breakpoint Values
$breakpoint-xs: 0;
$breakpoint-sm: 640px;
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;
$breakpoint-xl: 1280px;
$breakpoint-2xl: 1536px;

// Media Query Mixins
@mixin sm {
  @media (min-width: #{$breakpoint-sm}) {
    @content;
  }
}

@mixin md {
  @media (min-width: #{$breakpoint-md}) {
    @content;
  }
}

@mixin lg {
  @media (min-width: #{$breakpoint-lg}) {
    @content;
  }
}

@mixin xl {
  @media (min-width: #{$breakpoint-xl}) {
    @content;
  }
}

// Responsive Utilities
.hidden { display: none; }
.sm\:hidden { @include sm { display: none; } }
.md\:hidden { @include md { display: none; } }
.lg\:hidden { @include lg { display: none; } }

.block { display: block; }
.sm\:block { @include sm { display: block; } }
.md\:block { @include md { display: block; } }
.lg\:block { @include lg { display: block; } }
```

---

## 5. Interaction Patterns

### 5.1 Microinteractions

```scss
// Hover Effects
.hover-lift {
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
}

.hover-scale {
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.02);
  }
}

.hover-glow {
  transition: box-shadow 0.2s ease;
  
  &:hover {
    box-shadow: 0 0 0 3px rgba(48, 125, 255, 0.1);
  }
}

// Click Feedback
.click-scale {
  transition: transform 0.1s ease;
  
  &:active {
    transform: scale(0.98);
  }
}

// Focus States
.focus-ring {
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(48, 125, 255, 0.5);
  }
  
  &:focus:not(:focus-visible) {
    box-shadow: none;
  }
}
```

### 5.2 Loading Patterns

```tsx
// Skeleton Loading
const ContentSkeleton = () => (
  <div className="space-y-4">
    <Skeleton variant="text" width="60%" />
    <Skeleton variant="rectangular" height={200} />
    <div className="flex gap-2">
      <Skeleton variant="text" width={100} />
      <Skeleton variant="text" width={100} />
    </div>
  </div>
)

// Progressive Loading
const ProgressiveList = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  
  return (
    <div>
      {items.map(item => (
        <ItemCard key={item.id} {...item} />
      ))}
      
      {loading && <LoadingSpinner />}
      
      <InfiniteScrollTrigger
        onIntersect={() => loadMore(page + 1)}
        disabled={!hasMore}
      />
    </div>
  )
}

// Optimistic Updates
const OptimisticUpdate = () => {
  const [items, setItems] = useState([])
  
  const addItem = async (newItem) => {
    // Optimistically add item
    const tempId = `temp-${Date.now()}`
    setItems([...items, { ...newItem, id: tempId, pending: true }])
    
    try {
      const savedItem = await api.createItem(newItem)
      // Replace temp item with saved item
      setItems(items => 
        items.map(item => 
          item.id === tempId ? savedItem : item
        )
      )
    } catch (error) {
      // Remove temp item on error
      setItems(items => items.filter(item => item.id !== tempId))
      showError('Failed to create item')
    }
  }
}
```

### 5.3 Navigation Patterns

```tsx
// Breadcrumb Navigation
<Breadcrumbs>
  <BreadcrumbItem href="/dashboard">Dashboard</BreadcrumbItem>
  <BreadcrumbItem href="/dashboard/brands">Brands</BreadcrumbItem>
  <BreadcrumbItem current>Acme Corp</BreadcrumbItem>
</Breadcrumbs>

// Tab Navigation
<Tabs defaultValue="content" className="w-full">
  <TabsList>
    <TabsTrigger value="content">
      <FileTextIcon className="w-4 h-4 mr-2" />
      Content
      <Badge className="ml-2">24</Badge>
    </TabsTrigger>
    <TabsTrigger value="templates">Templates</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
  </TabsList>
  
  <TabsContent value="content">
    {/* Content panel */}
  </TabsContent>
</Tabs>

// Sidebar Navigation
<nav className="sidebar-nav">
  <NavSection title="Main">
    <NavItem href="/dashboard" icon={<HomeIcon />} active>
      Dashboard
    </NavItem>
    <NavItem href="/content" icon={<FileTextIcon />} badge="12">
      Content
    </NavItem>
  </NavSection>
  
  <NavSection title="Tools">
    <NavItem 
      icon={<SparklesIcon />}
      expanded={aiToolsExpanded}
      onToggle={() => setAiToolsExpanded(!aiToolsExpanded)}
    >
      AI Tools
    </NavItem>
    {aiToolsExpanded && (
      <NavSubItems>
        <NavItem href="/ai/generate">Generate Content</NavItem>
        <NavItem href="/ai/metadata">SEO Metadata</NavItem>
      </NavSubItems>
    )}
  </NavSection>
</nav>
```

---

## 6. Content Guidelines

### 6.1 Voice & Tone

```yaml
Voice Attributes:
  Professional: Clear, accurate, trustworthy
  Friendly: Approachable, helpful, encouraging
  Confident: Decisive, knowledgeable, authoritative
  Efficient: Concise, direct, actionable

Tone Variations:
  Success Messages:
    - Celebratory but not excessive
    - "Great! Your content has been published."
    
  Error Messages:
    - Helpful and solution-oriented
    - "We couldn't save your changes. Please check your connection and try again."
    
  Empty States:
    - Encouraging and action-oriented
    - "No content yet. Create your first piece to get started!"
    
  Instructions:
    - Clear and step-by-step
    - "To add a template: 1) Click 'New Template' 2) Choose fields 3) Save"
```

### 6.2 Writing Principles

```yaml
Clarity:
  - Use simple, everyday language
  - Avoid jargon unless necessary
  - Define technical terms on first use
  - One idea per sentence

Conciseness:
  - Get to the point quickly
  - Remove unnecessary words
  - Use active voice
  - Front-load important information

Consistency:
  - Use the same terms throughout
  - Follow established patterns
  - Maintain style across all content
  - Align with brand voice

Action-Oriented:
  - Start with verbs for actions
  - Make CTAs clear and specific
  - Tell users what happens next
  - Focus on user benefits
```

### 6.3 UI Copy Patterns

```typescript
// Button Labels
const buttonLabels = {
  primary: {
    create: 'Create [Item]',
    save: 'Save Changes',
    publish: 'Publish Now',
    continue: 'Continue',
    confirm: 'Confirm'
  },
  secondary: {
    cancel: 'Cancel',
    back: 'Go Back',
    skip: 'Skip',
    later: 'Maybe Later'
  },
  danger: {
    delete: 'Delete [Item]',
    remove: 'Remove',
    revoke: 'Revoke Access'
  }
}

// Status Messages
const statusMessages = {
  loading: {
    default: 'Loading...',
    specific: 'Loading your content...',
    ai: 'Generating content with AI...'
  },
  success: {
    saved: 'Changes saved successfully',
    published: 'Content published',
    deleted: '[Item] deleted'
  },
  error: {
    generic: 'Something went wrong. Please try again.',
    network: 'Connection error. Check your internet and retry.',
    validation: 'Please fix the errors below'
  }
}

// Empty States
const emptyStates = {
  content: {
    title: 'No content yet',
    description: 'Create your first piece of content to get started.',
    action: 'Create Content'
  },
  search: {
    title: 'No results found',
    description: 'Try adjusting your filters or search terms.',
    action: 'Clear Filters'
  }
}
```

---

## 7. Accessibility Standards

### 7.1 WCAG 2.1 Compliance

```yaml
Level AA Requirements:
  Perceivable:
    - Text contrast ratio: 4.5:1 (normal), 3:1 (large)
    - Images have alt text
    - Color not sole indicator
    - Captions for video
    
  Operable:
    - Keyboard accessible
    - No keyboard traps
    - Skip links available
    - Focus indicators visible
    - Sufficient time limits
    
  Understandable:
    - Page language declared
    - Consistent navigation
    - Labels describe purpose
    - Error identification
    
  Robust:
    - Valid HTML
    - ARIA used correctly
    - Works with screen readers
    - Browser compatibility
```

### 7.2 Keyboard Navigation

```typescript
// Keyboard Shortcuts
const keyboardShortcuts = {
  global: {
    'cmd+k': 'Open command palette',
    'cmd+/': 'Toggle help',
    'esc': 'Close modal/dropdown'
  },
  navigation: {
    'g h': 'Go to home',
    'g c': 'Go to content',
    'g b': 'Go to brands',
    'g s': 'Go to settings'
  },
  actions: {
    'cmd+n': 'New content',
    'cmd+s': 'Save changes',
    'cmd+enter': 'Submit/Publish',
    'cmd+z': 'Undo',
    'cmd+shift+z': 'Redo'
  }
}

// Focus Management
const FocusTrap = ({ children, active }) => {
  const containerRef = useRef()
  
  useEffect(() => {
    if (!active) return
    
    const focusableElements = containerRef.current.querySelectorAll(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    firstElement?.focus()
    
    const handleTab = (e) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
    
    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [active])
  
  return <div ref={containerRef}>{children}</div>
}
```

### 7.3 Screen Reader Support

```tsx
// ARIA Labels and Descriptions
<button
  aria-label="Delete content"
  aria-describedby="delete-warning"
  onClick={handleDelete}
>
  <TrashIcon aria-hidden="true" />
</button>
<span id="delete-warning" className="sr-only">
  This action cannot be undone
</span>

// Live Regions
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {statusMessage}
</div>

// Semantic HTML
<main>
  <h1>Page Title</h1>
  
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/dashboard">Dashboard</a></li>
      <li aria-current="page">Current Page</li>
    </ol>
  </nav>
  
  <section aria-labelledby="content-heading">
    <h2 id="content-heading">Content List</h2>
    {/* Content */}
  </section>
</main>

// Form Accessibility
<form>
  <div className="form-group">
    <label htmlFor="title" className="required">
      Title
      <span className="sr-only">(required)</span>
    </label>
    <input
      id="title"
      type="text"
      required
      aria-describedby="title-error title-help"
      aria-invalid={errors.title ? 'true' : 'false'}
    />
    <span id="title-help" className="help-text">
      Choose a descriptive title
    </span>
    {errors.title && (
      <span id="title-error" role="alert" className="error-text">
        {errors.title}
      </span>
    )}
  </div>
</form>
```

---

## 8. Responsive Design

### 8.1 Mobile-First Approach

```scss
// Base styles (mobile)
.component {
  padding: $space-4;
  font-size: $text-sm;
  
  // Tablet and up
  @include md {
    padding: $space-6;
    font-size: $text-base;
  }
  
  // Desktop and up
  @include lg {
    padding: $space-8;
  }
}

// Responsive Grid
.content-grid {
  display: grid;
  gap: $space-4;
  grid-template-columns: 1fr;
  
  @include md {
    grid-template-columns: repeat(2, 1fr);
    gap: $space-6;
  }
  
  @include lg {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @include xl {
    grid-template-columns: repeat(4, 1fr);
    gap: $space-8;
  }
}
```

### 8.2 Responsive Components

```tsx
// Responsive Navigation
const ResponsiveNav = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  return (
    <>
      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <MenuIcon />
        </button>
        
        <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
          <nav>{/* Mobile nav items */}</nav>
        </MobileMenu>
      </div>
      
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex">
        {/* Desktop nav items */}
      </nav>
    </>
  )
}

// Responsive Table
const ResponsiveTable = ({ data }) => {
  return (
    <>
      {/* Mobile: Card Layout */}
      <div className="md:hidden space-y-4">
        {data.map(item => (
          <Card key={item.id}>
            <CardBody>
              <h3>{item.title}</h3>
              <p className="text-sm text-gray-600">{item.status}</p>
              <p className="text-sm">{item.date}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      
      {/* Desktop: Table Layout */}
      <table className="hidden md:table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td>{item.status}</td>
              <td>{item.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
```

### 8.3 Touch Interactions

```scss
// Touch-friendly targets
.touch-target {
  min-height: 44px;
  min-width: 44px;
  
  @include lg {
    min-height: 32px;
    min-width: 32px;
  }
}

// Swipe gestures
.swipeable {
  touch-action: pan-y;
  user-select: none;
  -webkit-user-drag: none;
}

// Disable hover on touch
@media (hover: hover) {
  .hover\:bg-gray-100:hover {
    background-color: $gray-100;
  }
}
```

---

## 9. Motion & Animation

### 9.1 Animation Principles

```yaml
Purpose:
  - Guide attention
  - Provide feedback
  - Create hierarchy
  - Enhance delight

Duration:
  - Micro: 100-200ms (hover, click)
  - Small: 200-300ms (fade, slide)
  - Medium: 300-500ms (modal, drawer)
  - Large: 500-700ms (page transition)

Easing:
  - ease-out: Enter animations
  - ease-in: Exit animations
  - ease-in-out: Move animations
  - spring: Playful interactions
```

### 9.2 Common Animations

```scss
// Transitions
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.transition-colors {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

// Fade animations
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

// Slide animations
@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideDown {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

// Scale animations
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

// Loading animations
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### 9.3 Motion Utilities

```tsx
// Animation hooks
const useAnimatedValue = (value, duration = 300) => {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => {
      setDisplayValue(value)
      setIsAnimating(false)
    }, duration)
    
    return () => clearTimeout(timer)
  }, [value, duration])
  
  return { displayValue, isAnimating }
}

// Stagger children
const StaggerChildren = ({ children, delay = 50 }) => {
  return Children.map(children, (child, index) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * delay / 1000 }}
    >
      {child}
    </motion.div>
  ))
}

// Page transitions
const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}
```

---

## 10. Design Tokens

### 10.1 Token Structure

```json
{
  "color": {
    "primary": {
      "50": { "value": "#E8F0FF" },
      "100": { "value": "#C4D9FF" },
      "500": { "value": "#307DFF" },
      "900": { "value": "#1B4599" }
    },
    "semantic": {
      "success": { "value": "{color.green.500}" },
      "warning": { "value": "{color.yellow.500}" },
      "error": { "value": "{color.red.500}" },
      "info": { "value": "{color.blue.500}" }
    }
  },
  
  "spacing": {
    "xs": { "value": "0.25rem" },
    "sm": { "value": "0.5rem" },
    "md": { "value": "1rem" },
    "lg": { "value": "1.5rem" },
    "xl": { "value": "2rem" }
  },
  
  "typography": {
    "fontSize": {
      "xs": { "value": "0.75rem" },
      "sm": { "value": "0.875rem" },
      "base": { "value": "1rem" },
      "lg": { "value": "1.125rem" }
    },
    "fontWeight": {
      "normal": { "value": "400" },
      "medium": { "value": "500" },
      "semibold": { "value": "600" },
      "bold": { "value": "700" }
    }
  },
  
  "borderRadius": {
    "sm": { "value": "0.25rem" },
    "md": { "value": "0.375rem" },
    "lg": { "value": "0.5rem" },
    "full": { "value": "9999px" }
  },
  
  "shadow": {
    "sm": { "value": "0 1px 2px 0 rgba(0, 0, 0, 0.05)" },
    "md": { "value": "0 4px 6px -1px rgba(0, 0, 0, 0.1)" },
    "lg": { "value": "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }
  }
}
```

### 10.2 Theme Customization

```typescript
// Brand Theme Override
interface BrandTheme {
  colors: {
    primary: string
    secondary?: string
    accent?: string
  }
  fonts?: {
    heading?: string
    body?: string
  }
  borderRadius?: 'sharp' | 'default' | 'rounded'
}

// Apply brand theme
const applyBrandTheme = (theme: BrandTheme) => {
  const root = document.documentElement
  
  // Apply colors
  root.style.setProperty('--brand-primary', theme.colors.primary)
  if (theme.colors.secondary) {
    root.style.setProperty('--brand-secondary', theme.colors.secondary)
  }
  
  // Apply fonts
  if (theme.fonts?.heading) {
    root.style.setProperty('--font-heading', theme.fonts.heading)
  }
  
  // Apply border radius
  const radiusMap = {
    sharp: '2px',
    default: '6px',
    rounded: '12px'
  }
  if (theme.borderRadius) {
    root.style.setProperty('--radius-base', radiusMap[theme.borderRadius])
  }
}
```

### 10.3 Dark Mode Support

```scss
// Dark mode tokens
[data-theme="dark"] {
  // Colors
  --color-background: #{$gray-900};
  --color-surface: #{$gray-800};
  --color-surface-secondary: #{$gray-700};
  --color-border: #{$gray-600};
  
  // Text
  --color-text-primary: #{$gray-100};
  --color-text-secondary: #{$gray-300};
  --color-text-tertiary: #{$gray-400};
  
  // Shadows (reduced opacity)
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.25);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

// Component dark mode
.card {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

// Automatic dark mode
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    @extend [data-theme="dark"];
  }
}
```

---

## 📊 Design System Checklist

### Component Development
- [ ] Follows design tokens
- [ ] Responsive behavior defined
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Touch targets adequate
- [ ] Loading states included
- [ ] Error states designed
- [ ] Empty states considered
- [ ] Dark mode supported
- [ ] Documentation complete

### Accessibility
- [ ] Color contrast passes WCAG AA
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Semantic HTML used
- [ ] Keyboard operable
- [ ] Screen reader tested
- [ ] Motion respects preferences
- [ ] Error messages clear
- [ ] Skip links available
- [ ] Language declared

### Performance
- [ ] Components lazy loaded
- [ ] Images optimized
- [ ] Animations GPU accelerated
- [ ] Bundle size monitored
- [ ] Critical CSS inlined
- [ ] Fonts optimized
- [ ] Icons SVG or icon font
- [ ] Unnecessary re-renders avoided
- [ ] Code split by route
- [ ] Tree shaking enabled

---

[← Back to API Specification](./06-API-SPECIFICATION.md) | [Next: Non-Functional Requirements →](./10-NON-FUNCTIONAL-REQUIREMENTS.md)