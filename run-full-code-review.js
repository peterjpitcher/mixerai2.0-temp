#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 FULL CODE REVIEW STARTING...\n');

// Color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function runCommand(command, description, required = true) {
  console.log(`${colors.blue}${colors.bold}✅ ${description}${colors.reset}`);
  console.log(`Running: ${colors.yellow}${command}${colors.reset}\n`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    if (output.trim()) {
      console.log(output);
    } else {
      console.log(`${colors.green}✓ No issues found${colors.reset}`);
    }
    
    console.log(`${colors.green}${colors.bold}✓ ${description} completed successfully${colors.reset}\n`);
    console.log('─'.repeat(80) + '\n');
    return true;
    
  } catch (error) {
    console.log(`${colors.red}${colors.bold}✗ ${description} failed${colors.reset}`);
    console.log(`${colors.red}Error output:${colors.reset}`);
    console.log(error.stdout || error.message);
    console.log(error.stderr || '');
    console.log('─'.repeat(80) + '\n');
    
    if (required) {
      console.log(`${colors.red}${colors.bold}CRITICAL ERROR: ${description} must pass before proceeding${colors.reset}\n`);
      return false;
    }
    return false;
  }
}

function checkPackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log(`${colors.red}✗ package.json not found${colors.reset}\n`);
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  console.log(`${colors.blue}${colors.bold}📦 Package.json Analysis${colors.reset}\n`);
  
  // Check if check script exists
  if (packageJson.scripts && packageJson.scripts.check) {
    console.log(`${colors.green}✓ 'check' script found: ${packageJson.scripts.check}${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ 'check' script not found. Consider adding:${colors.reset}`);
    console.log(`"check": "next lint && tsc --noEmit"`);
  }
  
  // Check for linting dependencies
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const lintingTools = ['eslint', '@next/eslint-config-next', 'typescript'];
  
  lintingTools.forEach(tool => {
    if (allDeps[tool]) {
      console.log(`${colors.green}✓ ${tool} installed${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ ${tool} not found${colors.reset}`);
    }
  });
  
  console.log('─'.repeat(80) + '\n');
  return true;
}

async function main() {
  let allPassed = true;
  
  // Step 1: Check package.json
  checkPackageJson();
  
  // Step 2: Install dependencies (quick check)
  console.log(`${colors.blue}${colors.bold}📦 Checking Dependencies${colors.reset}\n`);
  if (!runCommand('npm ls --depth=0', 'Dependency Check', false)) {
    console.log(`${colors.yellow}Some dependencies may be missing, but continuing...${colors.reset}\n`);
  }
  
  // Step 3: ESLint Check
  const eslintPassed = runCommand('npx next lint', 'ESLint Code Quality Check', true);
  if (!eslintPassed) allPassed = false;
  
  // Step 4: TypeScript Check
  const tscPassed = runCommand('npx tsc --noEmit', 'TypeScript Type Check', true);
  if (!tscPassed) allPassed = false;
  
  // Step 5: Additional Next.js checks
  runCommand('npx next build --dry-run', 'Next.js Build Validation (Dry Run)', false);
  
  // Step 6: Bundle Analysis (if available)
  if (fs.existsSync(path.join(process.cwd(), 'scripts', 'analyze-bundle-sizes.sh'))) {
    runCommand('bash scripts/analyze-bundle-sizes.sh', 'Bundle Size Analysis', false);
  }
  
  // Final Summary
  console.log(`${colors.bold}🎯 FINAL SUMMARY${colors.reset}\n`);
  
  if (allPassed) {
    console.log(`${colors.green}${colors.bold}✅ ALL CRITICAL CHECKS PASSED!${colors.reset}`);
    console.log(`${colors.green}Your code is ready for build and deployment.${colors.reset}\n`);
    
    console.log(`${colors.blue}Next steps:${colors.reset}`);
    console.log(`• Run: ${colors.yellow}npm run build${colors.reset} to create production build`);
    console.log(`• Run: ${colors.yellow}npm run start${colors.reset} to test production locally`);
  } else {
    console.log(`${colors.red}${colors.bold}❌ CRITICAL ISSUES FOUND${colors.reset}`);
    console.log(`${colors.red}Please fix the issues above before proceeding with build.${colors.reset}\n`);
    
    console.log(`${colors.blue}Recommended fixes:${colors.reset}`);
    console.log(`• Fix ESLint errors: ${colors.yellow}npx next lint --fix${colors.reset}`);
    console.log(`• Check TypeScript errors: ${colors.yellow}npx tsc --noEmit${colors.reset}`);
    process.exit(1);
  }
}

main().catch(console.error);