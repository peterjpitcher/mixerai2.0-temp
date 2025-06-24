# Content Generation Debug Implementation

This document summarizes the debugging improvements implemented based on senior developer feedback to resolve the issue where generated content wasn't appearing in the React Quill editor.

## Changes Implemented

### 1. API Response Logging (`/src/hooks/use-content-generator.ts`)

Added comprehensive logging after the API response is received (lines 273-280):

```javascript
// Log raw API response for debugging
console.log('=== API RESPONSE DATA ===');
console.log('Full response:', data);
console.log('Response keys:', Object.keys(data));
if (template?.outputFields) {
  console.log('Expected field IDs from template:', template.outputFields.map(f => f.id));
}
console.log('========================');
```

And after extracting fields (lines 291-298):

```javascript
console.log('=== EXTRACTED FIELDS ===');
console.log('Generated fields:', generatedFields);
console.log('Field IDs received:', Object.keys(generatedFields));
console.log('Field content preview:');
Object.entries(generatedFields).forEach(([fieldId, content]) => {
  console.log(`  ${fieldId}: ${typeof content === 'string' ? content.substring(0, 50) + '...' : content}`);
});
console.log('=======================');
```

### 2. State Watcher for generatedOutputs (`/src/hooks/use-content-generator.ts`)

Added a useEffect to monitor state changes (lines 184-197):

```javascript
// State watcher for generatedOutputs
useEffect(() => {
  console.log('=== generatedOutputs STATE CHANGED ===');
  console.log('New generatedOutputs:', generatedOutputs);
  console.log('Keys:', Object.keys(generatedOutputs));
  console.log('Number of fields:', Object.keys(generatedOutputs).length);
  if (Object.keys(generatedOutputs).length > 0) {
    console.log('Content preview:');
    Object.entries(generatedOutputs).forEach(([fieldId, content]) => {
      console.log(`  ${fieldId}: ${typeof content === 'string' ? content.substring(0, 30) + '...' : content}`);
    });
  }
  console.log('=====================================');
}, [generatedOutputs]);
```

### 3. Verified setGeneratedOutputs Export

Confirmed that `setGeneratedOutputs` is already exported from the hook (line 460) and properly used in the form component.

### 4. Simplified RichTextEditor (`/src/components/content/rich-text-editor.tsx`)

Removed complex state management and implemented a simple controlled component pattern:

```javascript
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  editorClassName,
  modules = defaultModules,
  formats = defaultFormats
}: RichTextEditorProps) {
  console.log('=== RichTextEditor: Render ===');
  console.log('Prop value length:', value?.length || 0);
  console.log('Prop value preview:', value?.substring(0, 100));
  console.log('=============================');
  
  return (
    <div className={className}>
      <ReactQuill 
        theme="snow"
        value={value || ''}              // Always driven by prop
        onChange={onChange}              // Always pushes up changes
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className={editorClassName}
      />
    </div>
  );
}
```

Key changes:
- Removed internal `editorValue` state
- Removed `isFirstRender` tracking
- React Quill now directly uses the `value` prop
- Moved CSS import to top level
- Simplified dynamic import

### 5. Force Remount on Content Changes (`/src/components/content/generated-content-preview.tsx`)

Added key prop to RichTextEditor to force remount when content changes (line 87):

```javascript
<RichTextEditor
  key={`${field.id}-${value?.length || 0}`} // Force remount on content changes
  value={value}
  onChange={(content) => onOutputChange(field.id, content)}
  placeholder="Generated content will appear here"
/>
```

### 6. Enhanced Debug Logging in GeneratedContentPreview

Added comprehensive logging (lines 26-35):

```javascript
// Debug logging
console.log('=== GeneratedContentPreview RENDER ===');
console.log('generatedOutputs prop:', generatedOutputs);
console.log('outputFields prop:', outputFields);
console.log('Field ID mapping:');
outputFields.forEach(field => {
  const value = generatedOutputs[field.id];
  console.log(`  ${field.id} (${field.name}): ${value ? `has content (${value.length} chars)` : 'EMPTY'}`);
});
console.log('======================================');
```

## How to Test

1. Open the browser developer console
2. Navigate to the content generation page
3. Select a brand and fill in the required fields
4. Click "Generate Content"
5. Watch the console for the following logs:
   - `=== API RESPONSE DATA ===` - Shows the raw API response
   - `=== EXTRACTED FIELDS ===` - Shows what fields were extracted
   - `=== generatedOutputs STATE CHANGED ===` - Shows state updates
   - `=== GeneratedContentPreview RENDER ===` - Shows field mapping
   - `=== RichTextEditor: Render ===` - Shows content being passed to editor

## What to Look For

1. **Field ID Mismatch**: Check if the field IDs in "Expected field IDs from template" match the "Field IDs received"
2. **Empty Content**: Look for fields marked as "EMPTY" in the GeneratedContentPreview logs
3. **State Updates**: Verify that generatedOutputs state is updating with the correct content
4. **Content Length**: Check if the content length is greater than 0

## Common Issues

1. **Field IDs don't match**: The API is returning different field IDs than what the template expects
2. **Content is empty string**: The API is returning empty strings instead of generated content
3. **State not updating**: The setGeneratedOutputs call isn't working (check for errors)
4. **HTML formatting issues**: The content might be malformed HTML that React Quill can't display

## Next Steps if Issue Persists

1. Check the API endpoint (`/api/content/generate`) to ensure it's returning the correct field structure
2. Verify that the template's outputFields have the correct IDs
3. Check for any errors in the console that might prevent state updates
4. Try the temporary debug displays (yellow and blue boxes) to see if content is present but not rendering in Quill