# Form Button Positioning Standards

This document defines the standardized approach for positioning form buttons across all forms in the MixerAI 2.0 application.

## Core Principles

1. **Primary actions** (Save, Create, Update) - Always positioned on the **right**
2. **Secondary actions** (Cancel, Back) - Always positioned on the **left** 
3. **Consistent spacing** - Use `gap-2` between buttons
4. **Proper hierarchy** - Primary buttons use default variant, secondary use outline/ghost

## Standard Implementation

### Basic Form Footer

```tsx
<CardFooter className="flex justify-end gap-2 border-t pt-6">
  <Button variant="outline" onClick={handleCancel}>
    Cancel
  </Button>
  <Button onClick={handleSave} disabled={isLoading}>
    {isLoading ? 'Saving...' : 'Save Changes'}
  </Button>
</CardFooter>
```

### Using FormFooter Component

```tsx
import { FormFooter } from '@/components/ui/form-footer';

<FormFooter
  primaryLabel="Save Changes"
  onPrimaryClick={handleSave}
  secondaryLabel="Cancel"
  onSecondaryClick={handleCancel}
  isLoading={isLoading}
  loadingText="Saving..."
/>
```

### Sticky Footer for Long Forms

For forms that extend beyond the viewport, use a sticky footer:

```tsx
<FormFooter
  isSticky={true}
  primaryLabel="Create Brand"
  onPrimaryClick={handleCreate}
  onSecondaryClick={() => router.push('/dashboard/brands')}
  isLoading={isSaving}
/>
```

## Button Variants

- **Primary actions**: `variant="default"` (filled button)
- **Secondary actions**: `variant="outline"` or `variant="ghost"`
- **Destructive actions**: `variant="destructive"` (for delete operations)

## Loading States

Always show loading feedback:

```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Saving...
    </>
  ) : (
    'Save Changes'
  )}
</Button>
```

## Special Cases

### Single Action Forms

When there's only one action (e.g., Save without Cancel):

```tsx
<CardFooter className="flex justify-end border-t pt-6">
  <Button onClick={handleSave}>Save Changes</Button>
</CardFooter>
```

### Multiple Actions

When there are more than two actions:

```tsx
<CardFooter className="flex justify-between border-t pt-6">
  <Button variant="ghost" onClick={handleReset}>
    Reset Form
  </Button>
  <div className="flex gap-2">
    <Button variant="outline" onClick={handleCancel}>
      Cancel
    </Button>
    <Button onClick={handleSave}>
      Save Changes
    </Button>
  </div>
</CardFooter>
```

### Dialog Forms

In dialogs, use DialogFooter:

```tsx
<DialogFooter>
  <Button variant="outline" onClick={onClose}>
    Cancel
  </Button>
  <Button onClick={handleConfirm}>
    Confirm
  </Button>
</DialogFooter>
```

## When to Use Sticky Footers

Implement sticky footers for:
- Forms with multiple sections/tabs
- Forms that typically exceed viewport height
- Forms with expandable/collapsible sections
- Any form where users might lose sight of action buttons

## Accessibility

- Ensure Tab order goes from Cancel to Primary action
- Include proper ARIA labels for screen readers
- Disable buttons during loading to prevent double submission
- Show clear loading indicators

## Migration Checklist

When updating existing forms:

1. ✓ Primary button on the right
2. ✓ Secondary button on the left
3. ✓ Using `justify-end` for alignment
4. ✓ Proper gap spacing (`gap-2`)
5. ✓ Loading states implemented
6. ✓ Consider if sticky footer is needed
7. ✓ Consistent button variants

## Current Implementation Status

All major forms in the application already follow these standards:
- ✅ Brands (New/Edit)
- ✅ Templates (New/Edit)
- ✅ Workflows (New/Edit) - includes sticky footer
- ✅ Content (Edit)
- ✅ Users (Edit)
- ✅ Claims (New/Edit)
- ✅ Account Settings

No forms currently violate the button positioning standards.