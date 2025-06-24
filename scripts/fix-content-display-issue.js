// Comprehensive fix for content display issue

// 1. Fix the auto-regeneration logic in content-generator-form-refactored.tsx
// Replace the useEffect at line 228 with:

useEffect(() => {
  // Add a delay to ensure content has been properly set
  if (!hasGeneratedContent || !template || hasAutoRegenerated) return;
  
  // Wait for state to settle before checking for missing fields
  const timer = setTimeout(() => {
    const checkAndRegenerateMissingFields = async () => {
      const missingFields = (template.outputFields || []).filter(field => {
        const value = generatedOutputs[field.id];
        // More robust check for content
        const isEmpty = !value || (typeof value === 'string' && value.trim().length === 0);
        console.log(`Field ${field.id} check: value="${value?.substring(0, 50)}..." isEmpty=${isEmpty}`);
        return isEmpty;
      });
      
      if (missingFields.length > 0) {
        setHasAutoRegenerated(true);
        console.log(`Found ${missingFields.length} missing fields, auto-regenerating...`);
        toast.info(`Generating ${missingFields.length} missing field${missingFields.length > 1 ? 's' : ''}...`);
        
        for (const field of missingFields) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await handleRetryField(field.id);
        }
      }
    };
    
    checkAndRegenerateMissingFields();
  }, 1000); // Wait 1 second before checking
  
  return () => clearTimeout(timer);
}, [hasGeneratedContent, template, hasAutoRegenerated, generatedOutputs]);

// 2. Fix the product name issue in use-content-generator.ts
// In the generateContent function, update the input preparation:

const input_fields_with_values = (template.inputFields || []).map(field => {
  let value = templateFieldValues[field.id] || '';
  
  // For product-selector fields, use the product name if available
  if (field.type === 'product-selector' && productContext?.productName) {
    value = productContext.productName;
  }
  
  return {
    ...field,
    value: value
  };
});

// 3. Add debugging to verify state updates
// In use-content-generator.ts, after setGeneratedOutputs:

setGeneratedOutputs(generatedFields);
console.log('Content generation complete:', {
  fieldsReceived: Object.keys(generatedFields),
  sampleContent: Object.entries(generatedFields).map(([id, content]) => ({
    id,
    preview: content?.substring(0, 100) + '...'
  }))
});

// 4. Ensure the Generated Content section renders
// In content-generator-form-refactored.tsx, add a more explicit check:

const hasGeneratedContent = generatedOutputs && Object.keys(generatedOutputs).length > 0 && 
                           Object.values(generatedOutputs).some(v => v && v.length > 0);

// 5. Fix potential RichTextEditor issues
// In GeneratedContentPreview, add a fallback for rich text fields:

{field.type === 'richText' ? (
  <div>
    <RichTextEditor
      value={value || ''}
      onChange={(content) => onOutputChange(field.id, content)}
      placeholder="Generated content will appear here"
    />
    {/* Fallback: Show raw HTML if editor fails */}
    {!value && (
      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
        <p>Debug: No content to display</p>
      </div>
    )}
    {value && (
      <details className="mt-2">
        <summary className="text-xs text-gray-500 cursor-pointer">View Raw HTML</summary>
        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">{value}</pre>
      </details>
    )}
  </div>
) : (
  // ... existing code for non-richText fields
)}