# ReactQuill Content Display Fixes

## Current Issue
ReactQuill is receiving HTML content but displaying blank editors. The content is confirmed present in the value prop.

## Solution Options

### Option 1: Use Controlled Component Pattern with State
```javascript
export function RichTextEditor({ value, onChange, ...props }) {
  const [editorHtml, setEditorHtml] = React.useState('');
  
  React.useEffect(() => {
    setEditorHtml(value || '');
  }, [value]);
  
  const handleChange = (html) => {
    setEditorHtml(html);
    onChange(html);
  };
  
  return (
    <ReactQuill 
      theme="snow"
      value={editorHtml}
      onChange={handleChange}
      {...props}
    />
  );
}
```

### Option 2: Use ref and dangerouslyPasteHTML
```javascript
export function RichTextEditor({ value, onChange, ...props }) {
  const quillRef = React.useRef(null);
  
  React.useEffect(() => {
    if (quillRef.current && value) {
      const editor = quillRef.current.getEditor();
      const currentContents = editor.getText();
      
      // Only update if empty to avoid cursor issues
      if (!currentContents || currentContents.trim() === '') {
        editor.clipboard.dangerouslyPasteHTML(value);
      }
    }
  }, [value]);
  
  return (
    <ReactQuill 
      ref={quillRef}
      theme="snow"
      onChange={onChange}
      {...props}
    />
  );
}
```

### Option 3: Ensure Client-Side Only Rendering
```javascript
export function RichTextEditor({ value, onChange, ...props }) {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <div className="h-40 bg-muted animate-pulse rounded-md" />;
  }
  
  return (
    <ReactQuill 
      theme="snow"
      value={value || ''}
      onChange={onChange}
      {...props}
    />
  );
}
```

### Option 4: Delay Initial Value
```javascript
export function RichTextEditor({ value, onChange, ...props }) {
  const [editorValue, setEditorValue] = React.useState('');
  const [isReady, setIsReady] = React.useState(false);
  
  React.useEffect(() => {
    // Delay setting value to ensure Quill is ready
    const timer = setTimeout(() => {
      setEditorValue(value || '');
      setIsReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [value]);
  
  return (
    <ReactQuill 
      theme="snow"
      value={editorValue}
      onChange={onChange}
      placeholder={!isReady ? "Loading..." : props.placeholder}
      {...props}
    />
  );
}
```

### Option 5: Use defaultValue Instead
```javascript
// In GeneratedContentPreview.tsx
const [fieldValues, setFieldValues] = React.useState({});

React.useEffect(() => {
  const newValues = {};
  outputFields.forEach(field => {
    if (generatedOutputs[field.id] && !fieldValues[field.id]) {
      newValues[field.id] = generatedOutputs[field.id];
    }
  });
  setFieldValues(prev => ({ ...prev, ...newValues }));
}, [generatedOutputs]);

// Then use:
<RichTextEditor
  defaultValue={fieldValues[field.id] || ''}
  onChange={(content) => onOutputChange(field.id, content)}
/>
```

## Recommended Approach
Start with Option 3 (ensure client-side rendering) combined with Option 1 (controlled component with local state). This addresses both the SSR issue and potential state synchronization problems.

## Known Issues with ReactQuill
1. SSR conflicts - ReactQuill doesn't work with server-side rendering
2. Dynamic imports can cause timing issues
3. The `value` prop doesn't always update the editor content
4. Initial HTML content sometimes requires special handling