// Simple test to verify state updates work

// Replace the generateContent success handler temporarily with this:
if (data.success) {
  const { success, userId, error, ...generatedFields } = data;
  
  // Test with hardcoded content first
  const testContent = {
    "24fde8d2-d60d-4aed-82d8-922253435825": "TEST: Product Marketing Content",
    "6f069031-0132-40be-979e-1b8ff903f23a": "TEST: Brand Marketing Content",
    "6f3d81e2-6f95-443e-8dc6-dcbcfaeb0610": "TEST: Product Features Content"
  };
  
  console.log('Setting TEST content:', testContent);
  setGeneratedOutputs(testContent);
  
  // After 2 seconds, set the real content
  setTimeout(() => {
    console.log('Setting REAL content:', generatedFields);
    setGeneratedOutputs(generatedFields);
  }, 2000);
}