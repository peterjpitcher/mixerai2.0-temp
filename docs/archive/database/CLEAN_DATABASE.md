# MixerAI 2.0 Clean Database Guide

This document provides instructions for cleaning dummy data from the database and setting up a clean testing environment.

## Available Scripts

### 1. Reset Database (`scripts/reset-database.sh`)

This script completely resets the database by:
- Dropping the existing database
- Creating a new empty database
- Applying the clean schema without any dummy data
- Adding only the basic content types

```bash
./scripts/reset-database.sh
```

Use this script when you want to start with a completely clean slate. This is the recommended approach for testing.

### 2. Clean Existing Database (`scripts/clean-database.sh`)

This script cleans an existing database by:
- Removing all dummy data from all tables
- Preserving the database schema
- Preserving any real user accounts created through Supabase
- Re-adding only the basic content types

```bash
./scripts/clean-database.sh
```

Use this script when you want to keep your existing database but remove all dummy/sample data.

### 3. Add Test User (`scripts/add-test-user.sh`)

This script adds a simple test user to the database:
- Creates a user with ID `22222222-2222-2222-2222-222222222222`
- No associated brands, content, or permissions
- Can be used for basic authentication testing

```bash
./scripts/add-test-user.sh
```

Use this script after resetting or cleaning the database to add a basic user for testing.

## Recommended Testing Workflow

1. Reset the database to start with a clean slate:
   ```bash
   ./scripts/reset-database.sh
   ```

2. Add a test user for authentication:
   ```bash
   ./scripts/add-test-user.sh
   ```

3. (Optional) Create a Supabase auth user that matches the test user ID to enable login
   - Use the same UUID: `22222222-2222-2222-2222-222222222222`

4. Start testing your application with a clean environment:
   ```bash
   npm run dev
   ```

## Database Schema

The clean database includes the following tables:
- brands
- profiles
- user_brand_permissions
- content_types
- workflows
- content
- notifications
- analytics

Only the `content_types` table has basic data (Article, Retailer PDP, Owned PDP). All other tables are empty and ready for your testing. 