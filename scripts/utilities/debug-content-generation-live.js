// Quick debugging script to test content generation
// Run this in browser console while on the content generation page

console.log('%c=== CONTENT GENERATION DEBUG ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');

// Check if generatedOutputs exists in React DevTools
console.log('1. Check React DevTools for the following:');
console.log('   - Look for ContentGeneratorForm component');
console.log('   - Check the hooks section for useContentGenerator');
console.log('   - Find generatedOutputs state value');

// Monitor network requests
console.log('\n2. Monitoring network for /api/content/generate requests...');
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [url, options] = args;
  if (url.includes('/api/content/generate')) {
    console.log('%c=== CONTENT GENERATION REQUEST ===', 'background: #f39c12; color: white; padding: 3px;');
    console.log('URL:', url);
    console.log('Request Body:', options?.body ? JSON.parse(options.body) : 'No body');
    
    return originalFetch.apply(this, args).then(async (response) => {
      const clone = response.clone();
      const data = await clone.json();
      console.log('%c=== CONTENT GENERATION RESPONSE ===', 'background: #27ae60; color: white; padding: 3px;');
      console.log('Status:', response.status);
      console.log('Response Data:', data);
      console.log('Field IDs in response:', Object.keys(data).filter(k => k.startsWith('field_')));
      return response;
    });
  }
  return originalFetch.apply(this, args);
};

// Check for React Quill instances
console.log('\n3. Checking for React Quill editors...');
setTimeout(() => {
  const quillEditors = document.querySelectorAll('.ql-container');
  console.log(`Found ${quillEditors.length} Quill editor(s)`);
  quillEditors.forEach((editor, index) => {
    const content = editor.querySelector('.ql-editor')?.innerHTML;
    console.log(`Editor ${index + 1} content:`, content || 'EMPTY');
  });
}, 2000);

// Listen for state changes
console.log('\n4. To see state changes in real-time:');
console.log('   - Open React DevTools');
console.log('   - Find ContentGeneratorForm');
console.log('   - Watch the generatedOutputs value');
console.log('   - Click "Generate Content" and observe changes');

console.log('\n%c=== END DEBUG SETUP ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');