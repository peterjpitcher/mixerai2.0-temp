// Debug code to identify why content isn't displaying

// 1. In use-content-generator.ts, after line 283 (setGeneratedOutputs):
console.log('=== STATE UPDATE DEBUG ===');
console.log('Before setGeneratedOutputs - current state:', generatedOutputs);
console.log('Setting new generatedOutputs:', generatedFields);
console.log('Field IDs being set:', Object.keys(generatedFields));
console.log('=========================');

// Add a debug effect to monitor state changes:
useEffect(() => {
  console.log('=== generatedOutputs STATE CHANGED ===');
  console.log('New generatedOutputs:', generatedOutputs);
  console.log('Keys:', Object.keys(generatedOutputs));
  console.log('hasGeneratedContent:', Object.keys(generatedOutputs).length > 0);
  console.log('=====================================');
}, [generatedOutputs]);

// 2. In content-generator-form-refactored.tsx, modify the auto-regeneration effect (line 228):
useEffect(() => {
  console.log('=== AUTO-REGENERATION CHECK ===');
  console.log('hasGeneratedContent:', hasGeneratedContent);
  console.log('generatedOutputs:', generatedOutputs);
  console.log('template exists:', !!template);
  console.log('hasAutoRegenerated:', hasAutoRegenerated);
  
  if (!hasGeneratedContent || !template || hasAutoRegenerated) {
    console.log('Skipping auto-regeneration due to conditions');
    return;
  }
  
  const checkAndRegenerateMissingFields = async () => {
    const missingFields = (template.outputFields || []).filter(field => {
      const value = generatedOutputs[field.id];
      console.log(`Checking field ${field.id}: value = "${value}", isEmpty = ${!value || value.trim().length === 0}`);
      return !value || value.trim().length === 0;
    });
    
    console.log('Missing fields:', missingFields.map(f => f.id));
    // ... rest of the function
  };
}, [hasGeneratedContent, template, hasAutoRegenerated]);

// 3. In GeneratedContentPreview component, at the top of the component:
console.log('=== GeneratedContentPreview RENDER ===');
console.log('generatedOutputs prop:', generatedOutputs);
console.log('outputFields prop:', outputFields);
console.log('======================================');

// 4. Check if the "Generated Content" section is even rendering
// In content-generator-form-refactored.tsx, before line 467:
console.log('Should render Generated Content section:', hasGeneratedContent);
console.log('generatedOutputs at render:', generatedOutputs);