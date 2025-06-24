// Temporary debug script for content generation issue
// Add this to your use-content-generator.ts file temporarily

// After line 282 in use-content-generator.ts:
console.log('=== CONTENT GENERATION DEBUG ===');
console.log('API Response:', data);
console.log('Success:', data.success);
console.log('Generated Fields:', generatedFields);
console.log('Generated Field Keys:', Object.keys(generatedFields));
console.log('Template Output Field IDs:', template?.outputFields?.map(f => ({ id: f.id, name: f.name })));
console.log('Setting generatedOutputs to:', generatedFields);
console.log('================================');

// After line 43 in GeneratedContentPreview component:
console.log(`Rendering field ${field.name} (${field.id}):`, {
  value: value,
  hasContent: value && value.trim().length > 0,
  valueLength: value?.length || 0,
  firstChars: value?.substring(0, 50)
});