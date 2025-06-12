#!/bin/bash

# Code Quality Issues
echo "Creating individual code quality issues..."

# Issue 1: Widespread use of 'any' type
gh issue create --title "[Code Quality] 154 Files Using 'any' Type" --body "## Priority: 🔴 CRITICAL

**Description:** Extensive use of TypeScript 'any' type defeats type safety.

**Statistics:** 
- 154 files contain 'any'
- 500+ instances total
- Critical in API routes and data handling

**Examples:**
- \`catch (error: any)\` throughout codebase
- \`data: any\` in API responses
- Function parameters typed as \`any\`

**Fix:** Replace with proper types, unknown, or specific error types"

# Issue 2: No Unit Tests
gh issue create --title "[Code Quality] No Unit Tests in Entire Codebase" --body "## Priority: 🔴 CRITICAL

**Description:** Zero test coverage across the application.

**Impact:**
- No regression protection
- Refactoring is risky
- No confidence in changes
- Can't verify bug fixes

**Action Required:**
- Set up Jest and React Testing Library
- Add unit tests for critical paths
- Implement minimum 60% coverage target"

# Issue 3: Inconsistent Error Handling
gh issue create --title "[Code Quality] Inconsistent Error Handling Patterns" --body "## Priority: 🟡 HIGH

**Description:** Different error handling approaches throughout codebase.

**Issues:**
- Some use try/catch, others don't
- Console.error vs toast vs silent fail
- No centralized error handling
- Errors swallowed in many places

**Fix:** Implement consistent error handling strategy with error boundaries"

# Issue 4: Code Duplication
gh issue create --title "[Code Quality] Significant Code Duplication" --body "## Priority: 🟡 HIGH

**Description:** Similar code patterns repeated across multiple files.

**Examples:**
- API error handling repeated 20+ times
- Form validation logic duplicated
- Date formatting code in 10+ places
- Auth check logic repeated

**Fix:** Extract common utilities and custom hooks"

# Issue 5: Magic Numbers and Strings
gh issue create --title "[Code Quality] Magic Numbers and Hardcoded Values" --body "## Priority: 🟠 MEDIUM

**Description:** Hardcoded values throughout code without explanation.

**Examples:**
- \`setTimeout(() => {}, 3000)\` - why 3000?
- \`if (items.length > 50)\` - why 50?
- Hardcoded URLs and endpoints
- Magic status strings

**Fix:** Extract to named constants with clear intent"

# Issue 6: Poor Naming Conventions
gh issue create --title "[Code Quality] Inconsistent and Unclear Naming" --body "## Priority: 🟠 MEDIUM

**Description:** Variable and function names don't clearly express intent.

**Issues:**
- Single letter variables (x, y, i outside loops)
- Unclear abbreviations (usr, cfg, resp)
- Inconsistent casing (userId vs user_id)
- Generic names (data, item, obj)

**Fix:** Establish and enforce naming conventions"

# Issue 7: Commented Out Code
gh issue create --title "[Code Quality] Large Blocks of Commented Code" --body "## Priority: 🟠 MEDIUM

**Description:** Dead code left as comments throughout codebase.

**Issues:**
- Confuses developers
- Increases file size
- Often outdated
- Version control handles this better

**Action:** Remove all commented code blocks, use git history instead"

# Issue 8: No Code Documentation
gh issue create --title "[Code Quality] Missing JSDoc and Code Comments" --body "## Priority: 🟠 MEDIUM

**Description:** Complex functions and components lack documentation.

**Missing Documentation:**
- API route purposes and parameters
- Complex business logic
- Component props and usage
- Utility function purposes

**Fix:** Add JSDoc comments for public APIs and complex logic"

# Issue 9: Inconsistent Formatting
gh issue create --title "[Code Quality] Inconsistent Code Formatting" --body "## Priority: 🟢 LOW

**Description:** Code style varies between files despite Prettier.

**Issues:**
- Mixed quotes (single vs double)
- Inconsistent indentation
- Variable declaration styles
- Import ordering

**Fix:** 
- Enforce Prettier configuration
- Add pre-commit hooks
- Run format on save"

# Issue 10: Unused Dependencies
gh issue create --title "[Code Quality] Multiple Unused Dependencies" --body "## Priority: 🟢 LOW

**Description:** Package.json contains dependencies that aren't used.

**Impact:**
- Larger bundle size
- Security vulnerabilities
- Confusion about what's actually used
- Slower install times

**Action Required:**
- Audit dependencies with depcheck
- Remove unused packages
- Document why each dependency is needed"

echo "Code quality issues created successfully!"