# Auto-Save Implementation Guide

This document describes how to implement auto-save functionality with status indicators in MixerAI 2.0 forms.

## Overview

The auto-save system consists of three main components:
1. **useAutoSave Hook** - Manages auto-save logic and state
2. **SaveStatusIndicator Component** - Displays save status to users
3. **Form Integration** - Tracking changes and triggering saves

## Components

### 1. useAutoSave Hook (`/src/hooks/use-auto-save.ts`)

```typescript
const {
  isSaving,
  lastSaved,
  error,
  save,
  hasUnsavedChanges
} = useAutoSave({
  data: formData,
  onSave: async () => { /* save logic */ },
  debounceMs: 3000,
  enabled: true,
  onError: (error) => { /* handle error */ },
  onSuccess: () => { /* handle success */ }
});
```

**Features:**
- Debounced auto-saving
- Unsaved changes detection
- Browser unload warning
- Error handling
- Manual save trigger

### 2. SaveStatusIndicator Component (`/src/components/ui/save-status.tsx`)

```tsx
<SaveStatusIndicator
  status={status} // 'idle' | 'saving' | 'saved' | 'error'
  lastSaved={lastSaved}
  error={errorMessage}
  onRetry={triggerSave}
  showTimestamp={true}
/>
```

**Visual States:**
- **Idle**: Hidden (no indicator)
- **Saving**: Spinner + "Saving..."
- **Saved**: Checkmark + "Saved" + timestamp
- **Error**: Alert icon + error message + retry button

### 3. AutoSaveIndicator Component

Alternative component that automatically determines status based on form state:

```tsx
<AutoSaveIndicator
  isDirty={hasUnsavedChanges}
  lastSaved={lastSaved}
  saveError={error?.message}
  onRetry={triggerSave}
/>
```

## Implementation Examples

### Content Editor (`/src/app/dashboard/content/[id]/edit/page.tsx`)

```typescript
// 1. Import required components
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/ui/save-status';

// 2. Track unsaved changes
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// 3. Update change handlers
const handleInputChange = (e) => {
  const { name, value } = e.target;
  setContent(prev => ({ ...prev, [name]: value }));
  setHasUnsavedChanges(true);
};

// 4. Configure auto-save
const {
  isSaving: isAutoSaving,
  lastSaved,
  error: saveError,
  save: triggerSave,
} = useAutoSave({
  data: content,
  onSave: async () => {
    const success = await handleSave();
    if (!success) {
      throw new Error('Failed to save content');
    }
  },
  debounceMs: 3000,
  enabled: isAllowedToEdit && !isLoading,
});

// 5. Add status indicator to UI
<PageHeader
  title="Edit Content"
  actions={
    <div className="flex items-center gap-4">
      <SaveStatusIndicator
        status={isAutoSaving || isSaving ? 'saving' : 
                saveError ? 'error' : 
                lastSaved ? 'saved' : 'idle'}
        lastSaved={lastSaved}
        error={saveError?.message}
        onRetry={triggerSave}
      />
      <Button>View Content</Button>
    </div>
  }
/>
```

### Brand Editor (`/src/app/dashboard/brands/[id]/edit/page.tsx`)

Similar implementation with additional considerations:
- Don't redirect on auto-save (only on manual save)
- Handle form validation errors gracefully
- Track changes across multiple tabs

## Best Practices

### 1. Change Detection
- Set `hasUnsavedChanges` flag in ALL input handlers
- Include date pickers, selects, and rich text editors
- Reset flag after successful save

### 2. Debounce Timing
- **3000ms** (3 seconds) - Recommended for most forms
- **5000ms** (5 seconds) - For forms with heavy typing (rich text)
- **1000ms** (1 second) - For simple forms with few fields

### 3. Error Handling
- Show auto-save errors subtly (don't interrupt user)
- Provide retry mechanism
- Fall back to manual save if auto-save fails

### 4. UI Placement
- Place indicator in header near action buttons
- Keep it visible but not distracting
- Show timestamp for user confidence

### 5. Performance
- Only auto-save when data actually changes
- Use proper dependencies in hooks
- Avoid saving on every keystroke

## Troubleshooting

### Common Issues

1. **Auto-save triggers too frequently**
   - Increase debounce time
   - Check for unnecessary re-renders
   - Ensure proper dependency arrays

2. **Changes not detected**
   - Verify all input handlers set `hasUnsavedChanges`
   - Check data comparison logic
   - Ensure form data is properly structured

3. **Save errors not shown**
   - Verify error is thrown from save function
   - Check error message extraction
   - Ensure SaveStatusIndicator receives error prop

## Future Enhancements

1. **Conflict Resolution**
   - Handle concurrent edits
   - Show diff when conflicts occur
   - Merge changes intelligently

2. **Offline Support**
   - Queue saves when offline
   - Sync when connection restored
   - Show offline indicator

3. **Granular Saves**
   - Save individual fields
   - Reduce payload size
   - Faster save operations

4. **User Preferences**
   - Allow users to disable auto-save
   - Configurable save intervals
   - Save drafts vs. publish