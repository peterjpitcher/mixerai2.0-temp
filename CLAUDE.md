# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
# Development
npm run dev              # Start development server on http://localhost:3000

# Building & Production
npm run build            # Build for production (includes memory optimization)
npm run start            # Start production server
vercel build --prod      # Test production build locally

# Code Quality (ALWAYS run before committing)
npm run lint             # Run ESLint
npm run check            # Run ESLint and TypeScript type checking
npm run review           # Run comprehensive code review
npm run review:fix       # Auto-fix lint issues + code review

# Testing
npm run test             # Run test suite
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:openai      # Test Azure OpenAI integration
jest path/to/test.test.ts # Run specific test file

# Key Utility Scripts
node scripts/test-azure-openai.js          # Test Azure OpenAI connectivity
node scripts/test-db-connection.js         # Test database connectivity
node scripts/diagnose-brand-generation.js  # Debug brand identity generation
node scripts/test-title-generation.js      # Test AI title generation

# Database Operations
./scripts/run-migrations.sh              # Apply database migrations
./scripts/reset-database.sh              # Reset database (CAUTION: destroys data)
./scripts/test-rls-policies.sh           # Test Row-Level Security policies
./scripts/use-local-db.sh                # Run app with local database
./scripts/clean-database.sh              # Remove dummy data, keep schema
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_description.sql  # Create new migration

# Local Development Setup
./scripts/setup-env.sh                   # Interactive environment setup
./scripts/setup-local-db.sh              # Set up local PostgreSQL
node scripts/create-local-user.js        # Create test user
node scripts/seed-superadmin.ts          # Create superadmin user
./scripts/add-test-user.sh               # Add test user for authentication
./scripts/create-sample-brands.sh        # Add sample brands
```

## Memories and Notes

### Migration Path Handling
- For migration scripts path: Directly use the full path to the migrations directory in Supabase
- If scripts cannot be run, use: `supabase/migrations/`

[Rest of the file remains unchanged...]