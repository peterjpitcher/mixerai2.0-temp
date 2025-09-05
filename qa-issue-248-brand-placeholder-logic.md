# QA Issue #248: Brand Placeholder Buttons Not Clickable

**Status:** CLOSED  
**Priority:** P1: High  
**Labels:** ready for QA

## Issue Description
On Create Template page, Insert generic brand placeholders options not getting selected within AI features Tab of both Input field and output field.

## Steps to Reproduce
1. Go to https://mixerai.orangejelly.co.uk/dashboard
2. Go to Content Template from navigations
3. Click on Create New Template
4. Try to select option from Insert generic brand placeholders section at AI Feature Tab of output Field

## Expected Behavior
Insert generic brand placeholders options should be accessible and clickable.

## Actual Behavior
Insert generic brand placeholders options not getting selected within AI features Tab of both Input field and output field.

## Screenshot
![Issue Screenshot](https://github.com/user-attachments/assets/cc528888-c33e-4377-8817-813d69342a22)

## Comprehensive Technical Analysis

### Files Investigated
1. `src/components/template/field-designer-original.tsx` (main component with button logic)
2. `src/components/template/template-form.tsx` (parent component)
3. `src/types/template.ts` (type definitions)

### Current Implementation Deep Dive

#### 1. Brand Placeholder Button UI Structure (field-designer-original.tsx)

The brand placeholder buttons are rendered conditionally within the AI Features tab (lines 927-982):

```typescript
// Lines 927-982: Brand placeholder buttons section
<div className="space-y-1 pt-3">
  <Label className="text-xs font-medium text-muted-foreground">
    Insert Generic Brand Placeholders:
  </Label>
  <div className="flex flex-wrap gap-2 mt-1">
    <Button 
      type="button" 
      size="sm" 
      variant="outline" 
      onClick={() => insertBrandDataOrPlaceholder('name')}
    >
      Brand Name
    </Button>
    <Button 
      type="button" 
      size="sm" 
      variant="outline" 
      onClick={() => insertBrandDataOrPlaceholder('identity')}
    >
      Brand Identity
    </Button>
    <Button 
      type="button" 
      size="sm" 
      variant="outline" 
      onClick={() => insertBrandDataOrPlaceholder('tone_of_voice')}
    >
      Tone of Voice
    </Button>
    <Button 
      type="button" 
      size="sm" 
      variant="outline" 
      onClick={() => insertBrandDataOrPlaceholder('guardrails')}
    >
      Guardrails
    </Button>
    <Button 
      type="button" 
      size="sm" 
      variant="outline" 
      onClick={() => insertBrandDataOrPlaceholder('summary')}
    >
      Brand Summary
    </Button>
    <Button 
      type="button" 
      size="sm" 
      variant="outline" 
      onClick={() => insertBrandDataOrPlaceholder('brandObject')}
    >
      Generic Brand Object
    </Button>
  </div>
</div>
```

#### 2. Conditional Rendering Logic

The buttons are only shown under specific conditions (line 881):

```typescript
// Line 881: Condition for showing AI prompt and placeholder buttons
{((fieldType === 'input' && inputFieldData?.aiSuggester) || fieldType === 'output') && (
  <div className="pt-3 space-y-4">
    {/* AI Prompt textarea */}
    <div className="space-y-1">
      <Label htmlFor="aiPrompt">AI Prompt</Label>
      <Textarea 
        id="aiPrompt" 
        ref={aiPromptRef}  // Critical ref for text insertion
        value={fieldData.aiPrompt || ''} 
        onChange={handleAIPromptChange}
        placeholder={fieldType === 'input' 
          ? "e.g., Suggest 3-5 relevant keywords for {{topic}}."
          : "e.g., Write an article about {{topic}} using keywords: {{keywords}}."
        }
        className="min-h-[100px] mt-1"
      />
    </div>
    
    {/* Input field placeholders section (if applicable) */}
    {/* ... */}
    
    {/* Brand placeholder buttons section */}
    {/* This is where the problematic buttons are rendered */}
  </div>
)}
```

#### 3. The insertBrandDataOrPlaceholder Function (lines 621-635)

This function creates the placeholder text and calls the insertion logic:

```typescript
const insertBrandDataOrPlaceholder = (placeholderKey: 'name' | 'identity' | 'tone_of_voice' | 'guardrails' | 'summary' | 'brandObject') => {
  let placeholder = '';
  switch (placeholderKey) {
    case 'name': placeholder = '{{brand.name}}'; break;
    case 'identity': placeholder = '{{brand.identity}}'; break;
    case 'tone_of_voice': placeholder = '{{brand.tone_of_voice}}'; break;
    case 'guardrails': placeholder = '{{brand.guardrails}}'; break;
    case 'summary': placeholder = '{{brand.summary}}'; break;
    case 'brandObject': placeholder = '{{brand}}'; break;
    default: 
      console.warn(`insertBrandDataOrPlaceholder called with unknown key: ${placeholderKey}`);
      return; // Do nothing if key is unknown
  }
  insertTextIntoPrompt(placeholder);
};
```

#### 4. The Core Text Insertion Logic (lines 590-615)

This is where the actual text insertion happens:

```typescript
const insertTextIntoPrompt = (textToInsert: string) => {
  const currentPrompt = fieldData.aiPrompt || '';
  const textarea = aiPromptRef.current;
  
  if (textarea) {
    const start = textarea.selectionStart || currentPrompt.length;
    const end = textarea.selectionEnd || currentPrompt.length;
    
    // Insert text at cursor position
    const newPrompt = 
      currentPrompt.substring(0, start) + 
      textToInsert + 
      currentPrompt.substring(end);
    
    // Update the field data
    handleAIPromptChange({ target: { value: newPrompt } } as React.ChangeEvent<HTMLTextAreaElement>);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      if (aiPromptRef.current) {
        const newCursorPosition = start + textToInsert.length;
        aiPromptRef.current.focus();
        aiPromptRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 10);
  } else {
    // Fallback: append to end if ref is not available
    const newPrompt = currentPrompt + textToInsert;
    handleAIPromptChange({ target: { value: newPrompt } } as React.ChangeEvent<HTMLTextAreaElement>);
  }
};
```

#### 5. The aiPromptRef Declaration

```typescript
// Line 433: Ref for the AI prompt textarea
const aiPromptRef = useRef<HTMLTextAreaElement>(null);
```

#### 6. The handleAIPromptChange Function (lines 534-540)

```typescript
const handleAIPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setFieldData(prev => ({
    ...prev,
    aiPrompt: e.target.value
  }));
};
```

### Root Cause Analysis

After detailed investigation, several potential issues could cause the buttons to appear non-functional:

1. **Ref Not Initialized**: The `aiPromptRef` might be `null` when buttons are clicked if:
   - The component hasn't fully rendered
   - The textarea is conditionally hidden
   - React's reconciliation has unmounted/remounted the textarea

2. **Focus/Event Issues**: 
   - The button click might blur the textarea, losing selection position
   - The `setTimeout` delay (10ms) might be insufficient in some scenarios
   - Browser focus policies might prevent programmatic focus

3. **State Update Race Condition**:
   ```typescript
   // The handleAIPromptChange creates a synthetic event
   handleAIPromptChange({ target: { value: newPrompt } } as React.ChangeEvent<HTMLTextAreaElement>);
   ```
   This synthetic event might not trigger state updates properly.

4. **Silent Failures**: 
   - If `aiPromptRef.current` is null, the fallback appends text but might not be visible
   - No error handling or user feedback when insertion fails

5. **Dialog/Modal Context**: 
   - The FieldDesigner is rendered in a Dialog component
   - Dialog focus trapping might interfere with textarea focus

### Debugging Evidence Needed

To confirm the exact issue, we need to check:

1. Console for the warning: `insertBrandDataOrPlaceholder called with unknown key`
2. Whether `aiPromptRef.current` is null when buttons are clicked
3. If the `fieldData.aiPrompt` state actually updates
4. Whether the textarea re-renders and loses the ref

### Proposed Solutions

#### Option 1: Add Robust Error Handling and Feedback

```typescript
const insertBrandDataOrPlaceholder = (placeholderKey: string) => {
  // Add visual feedback
  const button = document.activeElement as HTMLButtonElement;
  if (button) {
    button.classList.add('ring-2', 'ring-primary');
    setTimeout(() => button.classList.remove('ring-2', 'ring-primary'), 200);
  }
  
  let placeholder = '';
  switch (placeholderKey) {
    // ... existing cases
  }
  
  // Add error handling
  if (!aiPromptRef.current) {
    console.error('AI Prompt textarea ref is not available');
    toast.error('Please click in the AI Prompt field first');
    return;
  }
  
  insertTextIntoPrompt(placeholder);
  
  // Confirm insertion
  console.log(`Inserted placeholder: ${placeholder}`);
};
```

#### Option 2: Direct State Update Without Ref

```typescript
const insertBrandDataOrPlaceholder = (placeholderKey: string) => {
  let placeholder = '';
  switch (placeholderKey) {
    // ... existing cases
  }
  
  // Direct state update without relying on ref
  setFieldData(prev => {
    const currentPrompt = prev.aiPrompt || '';
    const newPrompt = currentPrompt + (currentPrompt ? ' ' : '') + placeholder;
    return {
      ...prev,
      aiPrompt: newPrompt
    };
  });
  
  // Optional: Focus the textarea after state update
  requestAnimationFrame(() => {
    if (aiPromptRef.current) {
      aiPromptRef.current.focus();
      const len = aiPromptRef.current.value.length;
      aiPromptRef.current.setSelectionRange(len, len);
    }
  });
};
```

#### Option 3: Use Uncontrolled Component with Direct DOM Manipulation

```typescript
const insertBrandDataOrPlaceholder = (placeholderKey: string) => {
  let placeholder = '';
  switch (placeholderKey) {
    // ... existing cases
  }
  
  const textarea = aiPromptRef.current;
  if (!textarea) {
    // Fallback: Find textarea by ID
    const fallbackTextarea = document.getElementById('aiPrompt') as HTMLTextAreaElement;
    if (fallbackTextarea) {
      const event = new Event('input', { bubbles: true });
      fallbackTextarea.value = fallbackTextarea.value + placeholder;
      fallbackTextarea.dispatchEvent(event);
    }
    return;
  }
  
  // Use execCommand for better browser compatibility
  textarea.focus();
  document.execCommand('insertText', false, placeholder);
};
```

### Additional Considerations for Senior Review

1. **Component Architecture**: The FieldDesigner is complex with 900+ lines. Consider splitting into smaller components.

2. **Event Handling**: Using synthetic events for form inputs can be fragile. Consider using proper React patterns.

3. **Focus Management**: In a Dialog context, focus management needs special attention. Consider using focus trap libraries.

4. **Testing Strategy**:
   - Unit tests for `insertBrandDataOrPlaceholder` and `insertTextIntoPrompt`
   - Integration tests simulating button clicks
   - E2E tests for the complete template creation flow

5. **Accessibility**: Ensure screen readers announce successful placeholder insertion.

6. **Browser Compatibility**: The current implementation might have issues in Safari or mobile browsers.

### Recommended Approach

I recommend **Option 2** (Direct State Update) because:
- It's more reliable than ref-based manipulation
- It follows React best practices
- It's easier to test
- It avoids timing issues with `setTimeout`

Additionally, we should:
1. Add console logging to diagnose the issue in production
2. Implement user feedback (toast notifications)
3. Add error boundaries to catch and report failures
4. Consider using a proper text editor library (like CodeMirror or Monaco) for better text manipulation

---

## Senior Developer Feedback

### Diagnosis (What's Really Going On)

From the snippets, the "not clickable" symptom is almost certainly a **no-op handler**, not a true click block:

* The buttons call `insertBrandDataOrPlaceholder(...)`, which defers to `insertTextIntoPrompt(...)`, which **relies on `aiPromptRef.current`** and then fakes a React change event to update state.
* In practice, any of the following makes the click appear to "do nothing":
  * `Textarea` **ref isn't the DOM node** (missing/incorrect `forwardRef` in the `Textarea` component)
  * The textarea ref is temporarily `null` due to conditional rendering in the Tab/Dialog
  * The synthetic event shape isn't what React expects (it works sometimes, but it's fragile and can be broken by Strict Mode re-renders)
  * Focus trap / re-render timing means the selection API (`selectionStart/End`) isn't available when the handler runs

Separately, it's still worth sanity-checking that no overlay/parent has `pointer-events: none` or a z-index mask, but given you can click other controls in the same panel, this is far less likely.

### Fix Strategy (Keep It Simple, Make It Robust)

#### 1. Stop Depending on the Ref and Synthetic Events

Make the insert buttons **update React state directly**. If the ref is present, enhance with cursor-aware insertion; if not, append to the end. No synthetic events, no fragile DOM ops.

```typescript
// Track selection (optional, for nicer UX)
const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);

const onPromptSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
  const el = e.currentTarget;
  setSelection({ start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 });
};

const insertBrandDataOrPlaceholder = (
  key: 'name' | 'identity' | 'tone_of_voice' | 'guardrails' | 'summary' | 'brandObject'
) => {
  const map = {
    name: '{{brand.name}}',
    identity: '{{brand.identity}}',
    tone_of_voice: '{{brand.tone_of_voice}}',
    guardrails: '{{brand.guardrails}}',
    summary: '{{brand.summary}}',
    brandObject: '{{brand}}',
  } as const;

  const insert = map[key];
  if (!insert) return;

  setFieldData(prev => {
    const current = prev.aiPrompt ?? '';
    if (selection) {
      const { start, end } = selection;
      const next =
        current.slice(0, start) + insert + current.slice(end);
      return { ...prev, aiPrompt: next };
    }
    // Fallback: append
    const sep = current && !current.endsWith(' ') ? ' ' : '';
    return { ...prev, aiPrompt: current + sep + insert };
  });

  // Best-effort focus + caret placement next frame
  requestAnimationFrame(() => {
    const el = aiPromptRef.current;
    if (el) {
      const caret = (selection?.start ?? (el.value?.length ?? 0)) + insert.length;
      el.focus();
      el.setSelectionRange(caret, caret);
    }
  });
};
```

Wire the textarea:

```tsx
<Textarea
  id="aiPrompt"
  ref={aiPromptRef}               // keep, but not required for core logic
  value={fieldData.aiPrompt || ''}
  onChange={(e) => setFieldData(p => ({ ...p, aiPrompt: e.target.value }))}
  onSelect={onPromptSelect}
/>
```

**Why this works:** it's 100% React-state driven (deterministic), with optional UX polish if the ref is available. No brittle synthetic events, no reliance on DOM selection timing.

#### 2. Ensure `Textarea` Forwards Its Ref Correctly

If you're using shadcn/ui, the stock `Textarea` **does** forward its ref. If yours is wrapped/custom, confirm:

```typescript
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ ...props }, ref) => <textarea ref={ref} {...props} />
);
```

If this wasn't forwarding, your old code would silently fail; the new code won't rely on it.

#### 3. Defensive UI Guard (Optional but Helpful)

If `fieldType === 'input'` and `!inputFieldData?.aiSuggester`, disable the placeholder button group:

```tsx
<div aria-disabled={isDisabled} className={cn(isDisabled && 'opacity-50')}>
  <Button type="button" disabled={isDisabled} ...>Brand Name</Button>
  ...
</div>
```

This avoids user confusion where the panel renders but the prompt isn't actually active.

#### 4. Quick CSS Check (One Minute)

In DevTools, hover the buttons and press `Esc` → "Event Listeners" / "Layout". Confirm:

* No overlay covering the buttons (look for unexpected absolutely-positioned siblings)
* No `pointer-events: none` in a parent

This is usually fine, but worth a glance.

### Minimal Patch Summary

* Replace `insertTextIntoPrompt` + synthetic event with the **direct state approach** above
* Add `onSelect` to the textarea to track caret (optional)
* Verify/restore `forwardRef` on `Textarea`
* Keep buttons `type="button"` (you already do)

### Tests (Fast Wins)

* Unit: given `aiPrompt=""`, clicking "Brand Name" → `aiPrompt === '{{brand.name}}'`
* Unit: with `aiPrompt="Hello"`, selection `[0,0]` → insertion at start; `[len,len]` → end; `[2,4]` → replace slice
* E2E: open Create Template → toggle AI prompt visible → click each placeholder → prompt updates as expected, including in Dialog/Tab context

### Acceptance Criteria for QA

* Buttons are clickable in both **Input (with AI Suggester on)** and **Output** fields
* Placeholder inserts at caret; if caret unknown, appends at end
* Focus remains on the textarea after insertion; caret lands after the new placeholder
* Behaviour consistent in Chrome, Edge, and Safari desktop

This keeps the code idiomatic React, removes timing/ref brittleness, and should resolve the "not clickable" perception by making every click deterministically update state.