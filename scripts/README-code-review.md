# MixerAI Code Review Tool

A comprehensive code quality checking tool that runs multiple checks and generates detailed reports.

## Features

✅ **Dependency Check** - Verifies all npm dependencies are properly installed  
✅ **ESLint Analysis** - Finds code quality issues, unused variables, and React problems  
✅ **TypeScript Check** - Validates types across the entire codebase  
✅ **Build Readiness** - Checks for missing environment files and build artifacts  
✅ **Detailed Reports** - Generates both JSON and HTML reports  

## Usage

### Quick Start

Run the comprehensive code review:
```bash
npm run review
```

### Available Scripts

```bash
# Run ESLint and TypeScript checks only
npm run check

# Run full code review with detailed reports
npm run review

# Auto-fix ESLint issues then run full review
npm run review:fix
```

### Manual Commands

```bash
# Run individual checks
npx next lint                  # ESLint only
npx tsc --noEmit               # TypeScript only
node scripts/code-review.js     # Full review
```

## Output

The script generates two report files:

1. **code-review-report.json** - Machine-readable JSON report
2. **code-review-report.html** - Human-readable HTML report with visualizations

### Console Output

The script provides:
- Real-time progress updates
- Color-coded status messages
- Summary of all issues found
- Actionable recommendations

### Report Contents

- Total issue count
- ESLint errors and warnings breakdown
- TypeScript errors with file locations
- Build readiness status
- Timestamp and recommendations

## Setting Up Pre-commit Hooks (Optional)

To automatically run checks before commits:

1. Install husky and lint-staged:
```bash
npm install --save-dev husky lint-staged
```

2. Enable Git hooks:
```bash
npx husky install
```

3. Add to package.json:
```json
"lint-staged": {
  "**/*.{js,ts,jsx,tsx}": [
    "npm run check"
  ]
}
```

4. Set up pre-commit hook:
```bash
npx husky add .husky/pre-commit "npx lint-staged"
```

## Exit Codes

- **0** - All checks passed (may have warnings)
- **1** - Critical errors found, build will likely fail

## Troubleshooting

### "Cannot find module" errors
Run `npm install` to ensure all dependencies are installed.

### ESLint timeout
The script sets a large buffer (10MB) for ESLint output. If you still get timeouts, you may need to exclude some directories in `.eslintignore`.

### TypeScript memory issues
If TypeScript runs out of memory, add to your script:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run review
```

## Customization

Edit `scripts/code-review.js` to:
- Add more checks
- Change report format
- Modify issue thresholds
- Add custom recommendations