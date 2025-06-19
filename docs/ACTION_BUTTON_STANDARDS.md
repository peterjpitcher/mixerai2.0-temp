# Action Button Standards

This document defines the standardized approach for implementing action buttons across all listing pages in the MixerAI 2.0 application.

## Standard Pattern

All action buttons in data tables and listings should follow this pattern:

### 1. Use Dropdown Menu for Compact Display

```tsx
import { MoreVertical, Eye, Pencil, Trash2 } from 'lucide-react';
import { touchFriendly } from '@/lib/utils/touch-target';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className={touchFriendly('tableAction')}>
      <span className="sr-only">Actions</span>
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>
      <Eye className="mr-2 h-4 w-4" />
      View
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Pencil className="mr-2 h-4 w-4" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem className="text-destructive">
      <Trash2 className="mr-2 h-4 w-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 2. Use ActionButtons Component

For standardized implementation, use the `ActionButtons` component:

```tsx
import { ActionButtons } from '@/components/ui/action-buttons';

<ActionButtons
  viewHref={`/dashboard/items/${item.id}`}
  editHref={`/dashboard/items/${item.id}/edit`}
  onDelete={() => handleDelete(item.id)}
  isCompact={true} // Always true for table rows
/>
```

## Icon Standards

- **View**: `Eye` icon from lucide-react
- **Edit**: `Pencil` icon from lucide-react (NOT `Edit`, `Edit3`, or `Edit2`)
- **Delete**: `Trash2` icon from lucide-react
- **Menu Trigger**: `MoreVertical` icon (NOT `MoreHorizontal`)
- **Copy/Duplicate**: `Copy` icon from lucide-react
- **Archive**: `Archive` icon from lucide-react

## Styling Standards

1. **Touch Targets**: Always use `touchFriendly('tableAction')` for the dropdown trigger
2. **Variant**: Use `variant="ghost"` for the dropdown trigger
3. **Destructive Actions**: Add `className="text-destructive"` to delete menu items
4. **Alignment**: Use `align="end"` for dropdown content
5. **Size**: The `touchFriendly` utility handles sizing appropriately

## Accessibility

1. **Screen Reader Support**: Always include `<span className="sr-only">Actions</span>`
2. **Click Handling**: Use `onClick={(e) => e.stopPropagation()}` when rows are clickable
3. **Keyboard Navigation**: Dropdown menus support keyboard navigation by default

## Implementation Examples

### Basic Implementation
```tsx
<ActionButtons
  viewHref={`/dashboard/brands/${brand.id}`}
  editHref={`/dashboard/brands/${brand.id}/edit`}
  onDelete={() => handleDelete(brand.id)}
  isCompact={true}
/>
```

### With Custom Actions
```tsx
<ActionButtons
  viewHref={`/dashboard/templates/${template.id}`}
  editHref={`/dashboard/templates/${template.id}/edit`}
  isCompact={true}
  additionalActions={[
    {
      label: 'Duplicate',
      icon: <Copy className="mr-2 h-4 w-4" />,
      onClick: () => handleDuplicate(template.id)
    }
  ]}
  deleteButton={
    <DeleteTemplateDialog template={template}>
      <DropdownMenuItem className="text-destructive">
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </DropdownMenuItem>
    </DeleteTemplateDialog>
  }
/>
```

### Conditional Actions
```tsx
<ActionButtons
  viewHref={`/dashboard/content/${content.id}`}
  editHref={canEdit ? `/dashboard/content/${content.id}/edit` : undefined}
  onDelete={canDelete ? () => handleDelete(content.id) : undefined}
  isCompact={true}
/>
```

## Migration Guide

To update existing implementations:

1. Import the ActionButtons component
2. Replace custom dropdown implementations with ActionButtons
3. Ensure using `Pencil` icon instead of `Edit` variants
4. Ensure using `MoreVertical` instead of `MoreHorizontal`
5. Apply `touchFriendly('tableAction')` to triggers
6. Test keyboard navigation and screen reader support

## Pages to Update

- [x] /dashboard/brands - Already compliant
- [x] /dashboard/templates - Already compliant  
- [x] /dashboard/workflows - Already compliant
- [x] /dashboard/content - Already compliant
- [ ] /dashboard/users - Check implementation
- [ ] /dashboard/claims - Check implementation
- [ ] Any other listing pages

This standardization ensures:
- Consistent user experience across all pages
- Improved accessibility
- Easier maintenance
- Mobile-friendly touch targets
- Reduced code duplication