# QA Issue #247: Brand Context for AI Checkbox Not Persisting

**Status:** CLOSED  
**Priority:** P1: High  
**Labels:** ready for QA

## Issue Description
On the Create Template page, the 'Brand Context for AI' checkbox under the AI Features tab (within the Output field) appears deselected when the template is viewed or edited, even if it was selected during creation.

## Steps to Reproduce
1. Go to https://mixerai.orangejelly.co.uk/dashboard
2. Go to Content Template from navigations
3. Click on Create New Template
4. Select all check boxes for 'Brand Context for AI' at AI Feature Tab of output Field
5. After submit open same template in edit mode and check for 'Brand Context for AI' at AI Feature Tab of output Field

## Expected Behavior
The checkbox should retain its selected state if it was enabled during template creation.

## Actual Behavior
The 'Brand Context for AI' checkbox appears deselected when the template is viewed or edited, even if it was selected during creation.

## Screenshot
![Issue Screenshot](https://github.com/user-attachments/assets/72efd445-f0fc-4d55-a89a-bb6c6999f226)

## Comprehensive Technical Analysis

### Files Investigated
1. `src/components/template/field-designer-original.tsx` (main component)
2. `src/components/template/field-designer.tsx` (re-export wrapper)
3. `src/components/template/template-form.tsx` (parent component)
4. `src/types/template.ts` (type definitions)

### Current Implementation Deep Dive

#### 1. The Brand Context UI Structure (field-designer-original.tsx)

The AI Features tab contains brand context checkboxes for output fields, found in the `renderAiPanel` function (lines 756-832):

```typescript
// Line 779-828: Output field brand context checkboxes
if (fieldType === 'output' && outputFieldData) {
  return (
    <>
      <div className="pt-2">
        <Label className="font-medium">Brand Context for AI (Output Fields)</Label>
        <p className="text-xs text-muted-foreground pb-2">
          Allow AI to use specific brand elements when generating content for this field.
        </p>
        <div className="space-y-1.5 pl-1">
          {/* Individual checkboxes */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="useBrandIdentity"
              checked={outputFieldData.useBrandIdentity || false}
              onCheckedChange={(checked) => handleAIFeatureChange('useBrandIdentity', !!checked)}
            />
            <Label htmlFor="useBrandIdentity">Use Brand Identity</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="useToneOfVoice"
              checked={outputFieldData.useToneOfVoice || false}
              onCheckedChange={(checked) => handleAIFeatureChange('useToneOfVoice', !!checked)}
            />
            <Label htmlFor="useToneOfVoice">Use Tone of Voice</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="useGuardrails"
              checked={outputFieldData.useGuardrails || false}
              onCheckedChange={(checked) => handleAIFeatureChange('useGuardrails', !!checked)}
            />
            <Label htmlFor="useGuardrails">Use Guardrails</Label>
          </div>
          
          {/* Combined "Enable All" checkbox - Line 814-823 */}
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox 
              id="useCombinedBrandContext"
              checked={!!outputFieldData.useBrandIdentity && 
                       !!outputFieldData.useToneOfVoice && 
                       !!outputFieldData.useGuardrails}
              onCheckedChange={(checked) => {
                const newCheckedState = !!checked;
                handleAIFeatureChange('useBrandIdentity', newCheckedState);
                handleAIFeatureChange('useToneOfVoice', newCheckedState);
                handleAIFeatureChange('useGuardrails', newCheckedState);
              }}
            />
            <Label htmlFor="useCombinedBrandContext">Enable All Brand Context</Label>
          </div>
        </div>
      </div>
    </>
  );
}
```

#### 2. State Management and Data Flow

The field data is managed through state (lines 436-462):

```typescript
// Initial state setup
const [fieldData, setFieldData] = useState<Field>(() => {
  if (field) {
    return { ...field };
  }
  const baseField = {
    id: uuidv4(),
    name: '',
    type: fieldType === 'input' ? 'shortText' : 'plainText',
    required: false,
  };
  
  if (fieldType === 'output') {
    return {
      ...baseField,
      type: 'plainText',
      useBrandIdentity: false,
      useToneOfVoice: false,
      useGuardrails: false,
    } as OutputField;
  }
  return baseField as InputField;
});
```

#### 3. The handleAIFeatureChange Function (lines 563-588)

```typescript
const handleAIFeatureChange = (feature: string, value: boolean) => {
  setFieldData(prev => {
    if (fieldType === 'input') {
      const inputField = prev as InputField;
      return {
        ...inputField,
        [feature]: value,
        // Clear AI prompt if disabling AI features
        aiPrompt: feature === 'aiSuggester' && !value ? '' : inputField.aiPrompt
      } as InputField;
    } else {
      const outputField = prev as OutputField;
      return {
        ...outputField,
        [feature]: value
      } as OutputField;
    }
  });
};
```

#### 4. Save Handler (lines 644-684)

```typescript
const handleSave = () => {
  // Validation logic...
  
  // Convert type for field-specific options
  let optionsForType: any = {};
  switch (fieldData.type) {
    // ... type-specific options
  }
  
  const finalFieldData: Field = {
    ...fieldData,
    options: optionsForType
  };
  
  onSave(finalFieldData, isNew);
};
```

### Root Cause Analysis

After thorough investigation, the issue appears to be multi-faceted:

1. **State Derivation Issue**: The "Enable All Brand Context" checkbox state is **derived** rather than stored:
   ```typescript
   checked={!!outputFieldData.useBrandIdentity && 
            !!outputFieldData.useToneOfVoice && 
            !!outputFieldData.useGuardrails}
   ```
   This means its state is recalculated every render based on the three individual flags.

2. **Data Persistence Chain**: 
   - Field data flows from `FieldDesigner` → `onSave` callback → `TemplateForm` component
   - The template form stores fields in `templateData.outputFields` array
   - When saving to backend, the data might not properly preserve these boolean flags

3. **Type Definition Investigation** (from `src/types/template.ts`):
   ```typescript
   export interface OutputField extends BaseField {
     type: 'plainText' | 'richText' | 'html' | 'image';
     options?: PlainTextOutputOptions | HtmlOutputOptions | RichTextOptions | ImageOutputOptions;
     aiPrompt?: string;
     useBrandIdentity?: boolean;
     useToneOfVoice?: boolean;
     useGuardrails?: boolean;
   }
   ```
   The flags are optional, which might cause them to be stripped during serialization.

4. **Initialization Problem**: When loading an existing field (line 436), the spread operator is used:
   ```typescript
   if (field) {
     return { ...field };
   }
   ```
   If the saved field doesn't have these properties, they won't be initialized.

### Proposed Solution

#### Option 1: Explicit Default Values on Load
```typescript
const [fieldData, setFieldData] = useState<Field>(() => {
  if (field) {
    if (fieldType === 'output') {
      const outputField = field as OutputField;
      return {
        ...outputField,
        useBrandIdentity: outputField.useBrandIdentity ?? false,
        useToneOfVoice: outputField.useToneOfVoice ?? false,
        useGuardrails: outputField.useGuardrails ?? false,
      };
    }
    return { ...field };
  }
  // ... rest of initialization
});
```

#### Option 2: Add Explicit Combined State
```typescript
export interface OutputField extends BaseField {
  // ... existing fields
  enableAllBrandContext?: boolean; // New field
}

// In handleAIFeatureChange when handling the combined checkbox:
if (feature === 'enableAllBrandContext') {
  return {
    ...outputField,
    enableAllBrandContext: value,
    useBrandIdentity: value,
    useToneOfVoice: value,
    useGuardrails: value
  };
}
```

#### Option 3: Ensure Backend Persistence
Verify the API endpoint that saves templates properly handles these boolean fields:
1. Check `/api/templates` POST/PUT endpoints
2. Ensure database schema includes these columns
3. Verify no stripping of "undefined" or "false" values during save

### Additional Considerations for Senior Review

1. **Database Schema**: Need to verify if the `templates` table properly stores the outputFields JSON with all boolean flags intact.

2. **API Serialization**: Check if the API layer properly serializes/deserializes boolean values, especially when they're `false`.

3. **React Rendering**: The derived state pattern for the combined checkbox might cause unexpected behavior with React's reconciliation.

4. **Testing Requirements**: 
   - Unit tests for the handleAIFeatureChange function
   - Integration tests for template save/load cycle
   - E2E tests for the complete flow

5. **Migration Concerns**: If we add new fields, existing templates might need migration.

6. **Performance**: Multiple setState calls in the combined checkbox handler might cause unnecessary re-renders.

### Recommended Approach

I recommend **Option 1** (Explicit Default Values) combined with backend verification because:
- It's the least invasive change
- It maintains backward compatibility
- It explicitly handles the undefined case
- It doesn't require database schema changes

However, we should also verify the complete data flow from UI → API → Database → API → UI to ensure no data loss at any stage.

---

## Senior Developer Feedback

### TL;DR
This isn't a React state problem; it's almost certainly **data loss on save/load**. The checkboxes render from `outputFieldData.* || false`. If those keys are missing when the field is re-loaded, they'll render unchecked. The most common causes:

* A server/API "sanitiser" that drops **falsy** values (`false`) via `omitBy`, `filter(Boolean)`, `JSON.parse(JSON.stringify())`, or custom `compact` util.
* Narrow type/DTO mapping that doesn't include the three flags.
* Defaulting during (de)serialisation that doesn't re-apply falsey defaults.

Option 1 (explicit defaults on load) is good, but you should also **stop the API from dropping `false`**.

### Immediate Fixes (Do These)

#### 1. Preserve false in your save path
Search your API layer for anything like:
* `omitBy(obj, Boolean)` / `compactObject` / `filter(Boolean)` / `pickBy(v => v)`
* manual `for...in` that skips falsy
* schema `refine` that strips keys when `false`

Replace with a "strip only `undefined`/`null`" helper:

```typescript
export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  ) as T;
}
```

Use that before persisting JSON, not a truthiness filter.

#### 2. Assert the three flags survive round-trip
Add a unit/integration test on the endpoint(s) that:
* POST a template with `{ useBrandIdentity: true, useToneOfVoice: true, useGuardrails: true }`
* GET it back and **expect exactly those three booleans** (including when `false`)

If you're using Zod on the API, make the flags **explicit with defaults**:

```typescript
import { z } from 'zod';

export const OutputFieldSchema = z.object({
  // ...
  useBrandIdentity: z.boolean().default(false),
  useToneOfVoice: z.boolean().default(false),
  useGuardrails: z.boolean().default(false),
});
```

When parsing inbound JSON, call `.parse()` so defaults fill **only when missing** (not overriding explicit `false`).

#### 3. Initialise defaults on the client when loading an existing field
Option 1 is the right guardrail:

```typescript
if (fieldType === 'output' && field) {
  const f = field as OutputField;
  return {
    ...f,
    useBrandIdentity: f.useBrandIdentity ?? false,
    useToneOfVoice:   f.useToneOfVoice   ?? false,
    useGuardrails:    f.useGuardrails    ?? false,
  };
}
```

This allows legacy data (without keys) to render correctly.

### Nice-to-have Hardening

* **TemplateForm mapping:** if you "normalise" fields before save (e.g., `mapOutputField`), ensure it returns these three keys **always**, even when `false`.
* **DB shape:** if you store `outputFields` as JSONB, no schema change is needed; just ensure the three keys are present in the JSON you persist.
* **Combined toggle performance:** multiple `setFieldData` calls are batched, but you can do one update:

```typescript
onCheckedChange((checked) => {
  const v = !!checked;
  setFieldData(prev => ({
    ...(prev as OutputField),
    useBrandIdentity: v,
    useToneOfVoice: v,
    useGuardrails: v,
  }) as OutputField);
});
```

* **Rendering:** the derived `checked={a && b && c}` for "Enable All" is fine and keeps it a pure aggregator (no extra state).

### Quick Verification Checklist

- [ ] Network tab shows the three booleans present in the **save** payload and the **fetch** response
- [ ] No object "compactors" that remove `false`
- [ ] Zod (or DTO) includes the three fields with defaults; `.parse()` applied at API boundary
- [ ] Client initialiser backfills `?? false` for legacy items
- [ ] Edit form shows correct states after save → reload

### Optional: Even Cleaner Model

Nest the flags under a single object so you can default once:

```typescript
type OutputField = {
  // ...
  brandContext?: {
    identity?: boolean;
    tone?: boolean;
    guardrails?: boolean;
  };
};

// On load:
const bc = field.brandContext ?? {};
brandContext: {
  identity:   bc.identity   ?? false,
  tone:       bc.tone       ?? false,
  guardrails: bc.guardrails ?? false,
}
```

This reduces "key sprawl" and makes future brand context options easier.

**Verdict:** ✅ Close as fixed when you (1) stop dropping `false` in the API, and (2) add the client-side `?? false` fallback for backwards compatibility.