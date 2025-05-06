# MixerAI 2.0 UI Guidelines

## Page Layout

MixerAI 2.0 uses a consistent page layout pattern with the following components:

### 1. Full-Width Header

All main pages should include a full-width header with these characteristics:

```tsx
<div className="w-full bg-background border-b px-6 py-6">
  <div className="flex justify-between items-center">
    {/* Left side: title and breadcrumbs */}
    <div>
      {/* Optional: Breadcrumbs */}
      <div className="flex items-center gap-2 mb-1">
        <Link href="/parentRoute" className="text-muted-foreground hover:text-foreground">
          Parent Route
        </Link>
        <span className="text-muted-foreground">/</span>
        <span>Current Page</span>
      </div>
      {/* Required: Page Title */}
      <h1 className="text-3xl font-bold tracking-tight">Page Title</h1>
    </div>
    {/* Right side: actions */}
    <div className="flex gap-3">
      <Button variant="outline" asChild>
        <Link href="/some/route">Action Link</Link>
      </Button>
      <Button>Primary Action</Button>
    </div>
  </div>
</div>
```

### 2. Content Area

Content should be wrapped in a container with spacing between elements:

```tsx
<div className="space-y-8">
  {/* Page content here */}
</div>
```

### 3. Full Page Wrapper

All main pages should be wrapped in a flex column container:

```tsx
<div className="flex flex-col">
  {/* Header */}
  <div className="w-full bg-background border-b px-6 py-6">
    {/* Header content */}
  </div>
  
  {/* Content */}
  <div className="space-y-8">
    {/* Page content */}
  </div>
</div>
```

### 4. Layout Structure

The main layout in `root-layout-wrapper.tsx` provides:

- Full-width header navigation
- Sidebar navigation (desktop)
- Bottom navigation (mobile)
- Main content area with padding (p-6)

Page components should not add their own padding since it's already provided by the layout.

## Styling Components

### Cards

Cards should be used for distinct sections of content:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
    <CardDescription>Optional description text</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
  <CardFooter>
    {/* Optional footer content */}
  </CardFooter>
</Card>
```

### Forms

Form elements should follow this pattern:

```tsx
<div className="space-y-2">
  <Label htmlFor="field-id">Field Label{requiredField && <span className="text-red-500">*</span>}</Label>
  <Input
    id="field-id"
    name="field-name"
    placeholder="Placeholder text"
    value={value}
    onChange={handleChange}
  />
  {errorCondition && (
    <p className="text-red-500 text-sm mt-1">Error message</p>
  )}
</div>
```

## Responsive Design

- For small screens, mobile-specific navigation is provided via the bottom navigation bar
- Content should use grid layouts with responsive columns
- Use `space-y-*` and `gap-*` utilities for consistent spacing

## Color Usage

- Use `bg-background` for page and section backgrounds
- Use `text-muted-foreground` for secondary text
- Use color variants like `bg-primary/10` for subtle background colors with matching text colors
- Use badges with appropriate color schemes for status indicators

## Icons

- Use SVG icons with consistent sizing (usually 16x16 or 20x20)
- Include text labels with icons for better accessibility
- Icons in buttons should use `className="mr-2"` for consistent spacing 