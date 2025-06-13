const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run the build and capture ESLint errors
console.log('Running build to capture ESLint errors...');
let buildOutput;
try {
  buildOutput = execSync('npm run build 2>&1', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
} catch (error) {
  buildOutput = error.stdout || error.output?.join('\n') || '';
}

// Parse errors from the output - Next.js format
const lines = buildOutput.split('\n');
const errorsByFile = {};
let currentFile = null;

lines.forEach(line => {
  // Detect file headers (e.g., "./src/app/api/test-azure-openai/route.ts")
  if (line.match(/^\.\/src\/.+\.(ts|tsx|js|jsx)$/)) {
    currentFile = line.trim();
    if (!errorsByFile[currentFile]) {
      errorsByFile[currentFile] = [];
    }
  }
  // Parse error lines (e.g., "10:41  Error: '_req' is defined but never used.  @typescript-eslint/no-unused-vars")
  else if (currentFile && line.match(/^\d+:\d+\s+Error:/)) {
    const match = line.match(/^(\d+):(\d+)\s+Error:\s+(.+?)\s+([@\w-]+\/[\w-]+)$/);
    if (match) {
      const [, lineNum, colNum, errorMsg, rule] = match;
      errorsByFile[currentFile].push({
        line: parseInt(lineNum),
        column: parseInt(colNum),
        message: errorMsg,
        rule: rule
      });
    }
  }
  // Also handle warnings
  else if (currentFile && line.match(/^\d+:\d+\s+Warning:/)) {
    const match = line.match(/^(\d+):(\d+)\s+Warning:\s+(.+?)\s+([@\w-]+\/[\w-]+)$/);
    if (match) {
      const [, lineNum, colNum, errorMsg, rule] = match;
      errorsByFile[currentFile].push({
        line: parseInt(lineNum),
        column: parseInt(colNum),
        message: errorMsg,
        rule: rule,
        severity: 'warning'
      });
    }
  }
});

// Remove files with no errors
Object.keys(errorsByFile).forEach(file => {
  if (errorsByFile[file].length === 0) {
    delete errorsByFile[file];
  }
});

// Categorize errors
const errorCategories = {
  unusedVars: [],
  explicitAny: [],
  emptyObjectType: [],
  banTsComment: [],
  preferAsConst: [],
  unescapedEntities: [],
  reactHooks: [],
  other: []
};

Object.entries(errorsByFile).forEach(([file, errors]) => {
  errors.forEach(error => {
    const errorWithFile = { file, ...error };
    if (error.rule === '@typescript-eslint/no-unused-vars') {
      errorCategories.unusedVars.push(errorWithFile);
    } else if (error.rule === '@typescript-eslint/no-explicit-any') {
      errorCategories.explicitAny.push(errorWithFile);
    } else if (error.rule === '@typescript-eslint/no-empty-object-type') {
      errorCategories.emptyObjectType.push(errorWithFile);
    } else if (error.rule === '@typescript-eslint/ban-ts-comment') {
      errorCategories.banTsComment.push(errorWithFile);
    } else if (error.rule === '@typescript-eslint/prefer-as-const') {
      errorCategories.preferAsConst.push(errorWithFile);
    } else if (error.rule === 'react/no-unescaped-entities') {
      errorCategories.unescapedEntities.push(errorWithFile);
    } else if (error.rule === 'react-hooks/exhaustive-deps') {
      errorCategories.reactHooks.push(errorWithFile);
    } else {
      errorCategories.other.push(errorWithFile);
    }
  });
});

// Output summary
console.log('\n=== ESLint Error Summary ===');
console.log(`Total files with errors: ${Object.keys(errorsByFile).length}`);
console.log(`Unused variables: ${errorCategories.unusedVars.length}`);
console.log(`Explicit any types: ${errorCategories.explicitAny.length}`);
console.log(`Empty object types: ${errorCategories.emptyObjectType.length}`);
console.log(`Ban TS comment: ${errorCategories.banTsComment.length}`);
console.log(`Prefer as const: ${errorCategories.preferAsConst.length}`);
console.log(`Unescaped entities: ${errorCategories.unescapedEntities.length}`);
console.log(`React hooks: ${errorCategories.reactHooks.length}`);
console.log(`Other errors: ${errorCategories.other.length}`);
console.log(`Total errors: ${Object.values(errorCategories).reduce((sum, cat) => sum + cat.length, 0)}`);

// Show top files with most errors
console.log('\n=== Files with Most Errors ===');
const fileErrorCounts = Object.entries(errorsByFile)
  .map(([file, errors]) => ({ file, count: errors.length }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 10);

fileErrorCounts.forEach(({ file, count }) => {
  console.log(`${count} errors: ${file}`);
});

// Save detailed report
const report = {
  summary: {
    totalFiles: Object.keys(errorsByFile).length,
    totalErrors: Object.values(errorCategories).reduce((sum, cat) => sum + cat.length, 0),
    unusedVars: errorCategories.unusedVars.length,
    explicitAny: errorCategories.explicitAny.length,
    emptyObjectType: errorCategories.emptyObjectType.length,
    banTsComment: errorCategories.banTsComment.length,
    preferAsConst: errorCategories.preferAsConst.length,
    unescapedEntities: errorCategories.unescapedEntities.length,
    reactHooks: errorCategories.reactHooks.length,
    other: errorCategories.other.length
  },
  errorsByFile,
  errorCategories
};

fs.writeFileSync('eslint-errors-report.json', JSON.stringify(report, null, 2));
console.log('\nDetailed report saved to eslint-errors-report.json'); 