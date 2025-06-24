# Content Display Issue - Diagnostic Plan

## Overview
Generated content is successfully returned from the API but not displaying in the UI. This diagnostic plan will help identify the exact cause without making any code changes initially.

## Step-by-Step Diagnostic Instructions

### Step 1: Add Diagnostic Console Logging

Add the following console.log statements to track the flow of data:

#### 1.1 In `/src/hooks/use-content-generator.ts`

**After line 282** (already added, but verify it's there):
```javascript
console.log('=== CONTENT GENERATION SUCCESS ===');
console.log('Fields received:', Object.keys(generatedFields));
console.log('Sample content:', Object.entries(generatedFields).map(([id, content]) => ({
  id,
  preview: typeof content === 'string' ? content.substring(0, 100) + '...' : content
})));
console.log('=================================');
```

**Add a new useEffect to monitor state changes** (after line 410, before the return statement):
```javascript
// Diagnostic: Monitor generatedOutputs state changes
useEffect(() => {
  console.log('=== generatedOutputs STATE UPDATED ===');
  console.log('Current generatedOutputs:', generatedOutputs);
  console.log('Keys:', Object.keys(generatedOutputs));
  console.log('Is empty?', Object.keys(generatedOutputs).length === 0);
  console.log('====================================');
}, [generatedOutputs]);
```

#### 1.2 In `/src/components/content/content-generator-form-refactored.tsx`

**At the very top of the component function** (after line 28):
```javascript
console.log('=== ContentGeneratorForm RENDER ===');
console.log('generatedOutputs:', generatedOutputs);
console.log('hasGeneratedContent:', Object.keys(generatedOutputs).length > 0);
console.log('=================================');
```

**Inside the auto-regeneration useEffect** (line 229, at the beginning):
```javascript
console.log('=== AUTO-REGENERATION EFFECT ===');
console.log('Conditions:', {
  hasGeneratedContent,
  hasTemplate: !!template,
  hasAutoRegenerated,
  generatedOutputs: generatedOutputs
});
```

**Before checking for missing fields** (line 232):
```javascript
console.log('Checking for missing fields...');
console.log('Current generatedOutputs:', generatedOutputs);
```

**Inside the missing fields check** (line 234):
```javascript
const value = generatedOutputs[field.id];
console.log(`Field ${field.id}: value="${value}", isEmpty=${!value || value.trim().length === 0}`);
```

**Before the Generated Content section** (line 467):
```javascript
console.log('=== RENDERING DECISION ===');
console.log('hasGeneratedContent:', hasGeneratedContent);
console.log('Should show Generated Content section:', hasGeneratedContent);
console.log('========================');
```

#### 1.3 In `/src/components/content/generated-content-preview.tsx`

**At the top of the component** (after line 25):
```javascript
console.log('=== GeneratedContentPreview RENDER ===');
console.log('Props received:');
console.log('- generatedOutputs:', generatedOutputs);
console.log('- outputFields:', outputFields.map(f => ({ id: f.id, name: f.name })));
console.log('====================================');
```

**Inside the map function** (after line 43):
```javascript
console.log(`Rendering field ${field.name} (${field.id}):`, {
  value: value,
  valueLength: value?.length || 0,
  hasContent: value && value.trim().length > 0
});
```

### Step 2: Add Debug UI Elements

Add these temporary debug elements to visualize the state:

#### 2.1 In `content-generator-form-refactored.tsx`, after the main Card (around line 464):
```javascript
{/* DEBUG: Show raw state */}
<Card className="mt-4 border-red-500">
  <CardHeader>
    <CardTitle className="text-red-500">DEBUG: Raw State</CardTitle>
  </CardHeader>
  <CardContent>
    <pre className="text-xs overflow-auto bg-gray-100 p-2">
      {JSON.stringify({
        hasGeneratedContent,
        generatedOutputsKeys: Object.keys(generatedOutputs),
        generatedOutputs: generatedOutputs,
        templateOutputFields: template?.outputFields?.map(f => ({ id: f.id, name: f.name }))
      }, null, 2)}
    </pre>
  </CardContent>
</Card>
```

### Step 3: Temporarily Disable Auto-Regeneration

To isolate if auto-regeneration is the issue, comment out the effect:

```javascript
// Temporarily disable auto-regeneration for debugging
/*
useEffect(() => {
  if (!hasGeneratedContent || !template || hasAutoRegenerated) return;
  // ... rest of the effect
}, [hasGeneratedContent, template, hasAutoRegenerated]);
*/
```

### Step 4: Test Procedure

1. **Clear browser console**
2. **Navigate to** `/dashboard/content/new?template=c21b9928-edbe-4204-9aa8-770e2b43b0be`
3. **Select a brand**
4. **Select a product**
5. **Click "Generate Content"**
6. **Save the console output**
7. **Take a screenshot** showing:
   - The UI state
   - The DEBUG card content
   - Whether the "Generated Content" section appears

### Step 5: What to Look For

#### Expected Console Output Flow:
1. `=== CONTENT GENERATION SUCCESS ===` - Shows API returned data
2. `=== generatedOutputs STATE UPDATED ===` - Shows state was updated
3. `=== ContentGeneratorForm RENDER ===` - Shows component re-rendered
4. `=== AUTO-REGENERATION EFFECT ===` - Shows if/when this runs
5. `=== RENDERING DECISION ===` - Shows if Generated Content section should render
6. `=== GeneratedContentPreview RENDER ===` - Shows if preview component renders

#### Red Flags to Watch For:
- ❌ Auto-regeneration effect runs immediately after state update
- ❌ "Field isEmpty=true" for fields that should have content  
- ❌ generatedOutputs becomes empty after being populated
- ❌ Generated Content section never renders
- ❌ Field IDs don't match between template and API response

### Step 6: Additional Checks

1. **React DevTools** (if available):
   - Install React Developer Tools browser extension
   - Find `ContentGeneratorForm` component
   - Check `generatedOutputs` state value
   - Check `hasGeneratedContent` value

2. **Network Tab**:
   - Verify the `/api/content/generate` response contains field data
   - Check if any additional API calls clear the content

### Step 7: Likely Issues and Quick Tests

#### Issue A: Auto-regeneration clearing content
**Test**: With auto-regeneration disabled, does content display?

#### Issue B: State not updating
**Test**: Does the DEBUG card show content in `generatedOutputs`?

#### Issue C: UI not re-rendering
**Test**: After generation, manually change something else (like the title field) - does content appear?

#### Issue D: RichTextEditor not loading
**Test**: Do non-richText fields display content?

## Next Steps

After running these diagnostics, provide:

1. **Full console output** from the test
2. **Screenshot** of the UI with DEBUG card
3. **Answers** to the test questions above
4. **Any error messages** in the console

Based on the findings, we'll create a targeted fix that addresses the specific issue.

## Quick Fix to Test (Product Name Issue)

While we're diagnosing the display issue, here's a quick fix for the product name problem that you mentioned. Add this to `/src/hooks/use-content-generator.ts` around line 250:

```javascript
// Prepare input fields with values for the API
const input_fields_with_values = (template.inputFields || []).map(field => {
  let fieldValue = templateFieldValues[field.id] || '';
  
  // For product-selector fields, try to use product name if available
  if (field.type === 'product-selector' && productContext?.productName) {
    fieldValue = productContext.productName;
  }
  
  return {
    ...field,
    value: fieldValue
  };
});
```

---

## Ready to Test!

The diagnostic plan is ready. Please:
1. Add the console.log statements listed above
2. Add the DEBUG card UI element
3. Temporarily comment out the auto-regeneration effect
4. Run the test procedure
5. Share the results

This will give us exactly what we need to identify and fix the issue.