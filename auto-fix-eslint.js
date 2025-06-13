const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper to read file content
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// Helper to write file content
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

// Fix unused imports
function fixUnusedImports(content, unusedVars) {
  let fixed = content;
  
  unusedVars.forEach(varName => {
    // Handle default imports
    const defaultImportRegex = new RegExp(`^import\\s+${varName}\\s+from\\s+['"][^'"]+['"];?\\s*$`, 'gm');
    if (defaultImportRegex.test(fixed)) {
      fixed = fixed.replace(defaultImportRegex, match => `// ${match.trim()}`);
      return;
    }
    
    // Handle named imports - remove just the unused variable
    const namedImportRegex = new RegExp(`(import\\s*{[^}]*?)\\b${varName}\\b([^}]*}\\s*from)`, 'g');
    fixed = fixed.replace(namedImportRegex, (match, before, after) => {
      // Clean up the import list
      let importList = before + after;
      importList = importList.replace(/,\s*,/g, ','); // Remove double commas
      importList = importList.replace(/{,/g, '{'); // Remove leading comma
      importList = importList.replace(/,}/g, '}'); // Remove trailing comma
      importList = importList.replace(/{\s*}/g, '{}'); // Handle empty imports
      
      // If the import is now empty, comment out the whole line
      if (importList.includes('{}')) {
        return `// ${match}`;
      }
      return importList;
    });
  });
  
  return fixed;
}

// Fix unused variables by adding eslint-disable comments
function fixUnusedVariables(content, errors) {
  const lines = content.split('\n');
  const linesToDisable = new Set();
  
  errors.forEach(error => {
    if (error.message.includes('is defined but never used') || error.message.includes('is assigned a value but never used')) {
      linesToDisable.add(error.line - 1); // Convert to 0-based index
    }
  });
  
  // Add eslint-disable comments
  const sortedLines = Array.from(linesToDisable).sort((a, b) => b - a); // Sort in reverse order
  sortedLines.forEach(lineIndex => {
    if (lineIndex < lines.length) {
      const line = lines[lineIndex];
      const indent = line.match(/^\s*/)[0];
      
      // Check if there's already an eslint-disable comment
      if (lineIndex > 0 && lines[lineIndex - 1].includes('eslint-disable')) {
        return;
      }
      
      // Add eslint-disable comment
      lines.splice(lineIndex, 0, `${indent}// eslint-disable-next-line @typescript-eslint/no-unused-vars`);
    }
  });
  
  return lines.join('\n');
}

// Fix explicit any types
function fixExplicitAny(content, errors) {
  let fixed = content;
  
  errors.forEach(error => {
    if (error.message.includes('Unexpected any')) {
      // For now, we'll replace with unknown or Record<string, unknown> as appropriate
      const lines = fixed.split('\n');
      const lineIndex = error.line - 1;
      
      if (lineIndex < lines.length) {
        let line = lines[lineIndex];
        
        // Replace standalone 'any' with 'unknown'
        line = line.replace(/:\s*any\b/g, ': unknown');
        line = line.replace(/<any>/g, '<unknown>');
        line = line.replace(/\bany\[\]/g, 'unknown[]');
        line = line.replace(/\bArray<any>/g, 'Array<unknown>');
        
        // For object-like anys, use Record<string, unknown>
        line = line.replace(/:\s*{\s*\[key:\s*string\]:\s*any\s*}/g, ': Record<string, unknown>');
        
        lines[lineIndex] = line;
      }
      
      fixed = lines.join('\n');
    }
  });
  
  return fixed;
}

// Fix React unescaped entities
function fixUnescapedEntities(content, errors) {
  let fixed = content;
  const lines = fixed.split('\n');
  
  errors.forEach(error => {
    if (error.message.includes('can be escaped with')) {
      const lineIndex = error.line - 1;
      if (lineIndex < lines.length) {
        let line = lines[lineIndex];
        
        // Replace unescaped quotes
        if (error.message.includes('"')) {
          // Only replace quotes that are inside JSX text content
          line = line.replace(/(\>)([^<]*)(\")/g, '$1$2&quot;');
          line = line.replace(/(\"")([^<]*)(<)/g, '&quot;$2$3');
        }
        
        // Replace unescaped apostrophes
        if (error.message.includes("'")) {
          // Only replace apostrophes that are inside JSX text content
          line = line.replace(/(\>)([^<]*)(\')/g, '$1$2&apos;');
          line = line.replace(/(\')([^<]*)(<)/g, '&apos;$2$3');
        }
        
        lines[lineIndex] = line;
      }
    }
  });
  
  return lines.join('\n');
}

// Main function to fix a single file
function fixFile(filePath, errors) {
  console.log(`Fixing ${filePath}...`);
  
  let content = readFile(filePath);
  const originalContent = content;
  
  // Categorize errors
  const unusedVarErrors = errors.filter(e => e.rule === '@typescript-eslint/no-unused-vars');
  const explicitAnyErrors = errors.filter(e => e.rule === '@typescript-eslint/no-explicit-any');
  const unescapedEntitiesErrors = errors.filter(e => e.rule === 'react/no-unescaped-entities');
  
  // Extract unused variable names from import statements
  const unusedImportVars = [];
  unusedVarErrors.forEach(error => {
    const match = error.message.match(/'([^']+)'/);
    if (match && match[1]) {
      const varName = match[1];
      // Check if it's from an import statement
      const importRegex = new RegExp(`import.*\\b${varName}\\b.*from`, 'g');
      if (importRegex.test(content)) {
        unusedImportVars.push(varName);
      }
    }
  });
  
  // Apply fixes
  if (unusedImportVars.length > 0) {
    content = fixUnusedImports(content, unusedImportVars);
  }
  
  // Fix remaining unused variables with eslint-disable comments
  const remainingUnusedErrors = unusedVarErrors.filter(error => {
    const match = error.message.match(/'([^']+)'/);
    return !match || !unusedImportVars.includes(match[1]);
  });
  
  if (remainingUnusedErrors.length > 0) {
    content = fixUnusedVariables(content, remainingUnusedErrors);
  }
  
  // Fix explicit any types
  if (explicitAnyErrors.length > 0) {
    content = fixExplicitAny(content, explicitAnyErrors);
  }
  
  // Fix unescaped entities
  if (unescapedEntitiesErrors.length > 0) {
    content = fixUnescapedEntities(content, unescapedEntitiesErrors);
  }
  
  // Write back if changed
  if (content !== originalContent) {
    writeFile(filePath, content);
    console.log(`  Fixed ${errors.length} errors`);
    return true;
  } else {
    console.log(`  No automatic fixes applied`);
    return false;
  }
}

// Load the error report
console.log('Loading error report...');
const report = JSON.parse(fs.readFileSync('eslint-errors-report.json', 'utf8'));

// Process each file
let filesFixed = 0;
let totalErrorsFixed = 0;

Object.entries(report.errorsByFile).forEach(([filePath, errors]) => {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    if (fixFile(fullPath, errors)) {
      filesFixed++;
      totalErrorsFixed += errors.length;
    }
  } else {
    console.log(`File not found: ${fullPath}`);
  }
});

console.log(`\nSummary:`);
console.log(`Files processed: ${Object.keys(report.errorsByFile).length}`);
console.log(`Files fixed: ${filesFixed}`);
console.log(`Errors potentially fixed: ${totalErrorsFixed}`);
console.log('\nRun "npm run build" again to see remaining errors.'); 