const fs = require('fs');
const path = require('path');

// Utility function to read file
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// Utility function to write file
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

// Fix unused imports
function removeUnusedImports(content, unused) {
  unused.forEach(item => {
    // Remove from import statement
    const importRegex = new RegExp(`import\\s+{[^}]*\\b${item}\\b[^}]*}\\s+from\\s+[^;]+;`, 'g');
    content = content.replace(importRegex, (match) => {
      let newMatch = match.replace(new RegExp(`\\b${item}\\b,?\\s*`, 'g'), '');
      // Clean up empty imports
      newMatch = newMatch.replace(/{\s*,\s*/, '{ ');
      newMatch = newMatch.replace(/,\s*}/, ' }');
      newMatch = newMatch.replace(/{\s*}/, '');
      if (newMatch.includes('import {  }')) {
        return '';
      }
      return newMatch;
    });
  });
  return content;
}

// Fix unused parameters by prefixing with underscore or removing
function fixUnusedParams(content, params) {
  params.forEach(param => {
    // If parameter is at the end, try to remove it
    content = content.replace(new RegExp(`\\b${param}\\b(?=\\s*[,)])`, 'g'), `_${param}`);
  });
  return content;
}

// Replace any with unknown
function replaceAnyWithUnknown(content) {
  // Replace : any with : unknown
  content = content.replace(/:\s*any\b/g, ': unknown');
  // Replace catch (error: any) with catch (error: unknown)
  content = content.replace(/catch\s*\(\s*([^:]+):\s*any\s*\)/g, 'catch ($1: unknown)');
  return content;
}

// Replace @ts-ignore with @ts-expect-error
function replaceTsIgnore(content) {
  content = content.replace(/@ts-ignore/g, '@ts-expect-error');
  return content;
}

// Main function to fix files
function fixFile(filePath) {
  console.log(`Fixing ${filePath}...`);
  let content = readFile(filePath);
  
  // Apply fixes
  content = replaceAnyWithUnknown(content);
  content = replaceTsIgnore(content);
  
  // Remove unused variables by prefixing with underscore
  const unusedVars = ['user', 'request', 'NextRequest', 'User', '_user', 'error', 'e', '_e', '_request'];
  
  // Fix specific issues per file
  if (filePath.includes('content-types/route.ts')) {
    content = removeUnusedImports(content, ['NextRequest']);
    content = content.replace('async (request: NextRequest, user: unknown)', 'async ()');
  }
  
  if (filePath.includes('countries/route.ts')) {
    content = removeUnusedImports(content, ['NextRequest', 'User']);
    content = content.replace('async function getCountriesHandler(request: NextRequest, user: User)', 'async function getCountriesHandler()');
  }
  
  if (filePath.includes('ingredients/route.ts')) {
    content = removeUnusedImports(content, ['User']);
  }
  
  writeFile(filePath, content);
  console.log(`Fixed ${filePath}`);
}

// List of files to fix
const filesToFix = [
  '/Users/peterpitcher/Cursor/MixerAI2.0/src/app/api/content-types/route.ts',
  '/Users/peterpitcher/Cursor/MixerAI2.0/src/app/api/countries/route.ts',
  '/Users/peterpitcher/Cursor/MixerAI2.0/src/app/api/ingredients/route.ts'
];

filesToFix.forEach(fixFile);

console.log('ESLint fixes complete!');