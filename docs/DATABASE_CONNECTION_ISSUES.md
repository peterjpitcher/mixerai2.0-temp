# MixerAI 2.0 Database Connection Issues

## Problem Overview

The MixerAI 2.0 application has been experiencing issues with the front-end UI not connecting properly to the local database. The problem occurs because the application is trying to use Supabase for authentication and data storage by default, but we are attempting to use a local PostgreSQL database for development.

## Current Setup

### Database Architecture

The application can use two database connection methods:

1. **Supabase Connection** (Default)
   - Used for authentication and data storage
   - Configured through environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

2. **Direct PostgreSQL Connection** (Alternative for local development)
   - Implemented through the `db.ts` module
   - Configured through environment variables:
     - `POSTGRES_HOST`
     - `POSTGRES_PORT`
     - `POSTGRES_USER`
     - `POSTGRES_PASSWORD`
     - `POSTGRES_DB`

### API Structure

The application has API routes that use the direct PostgreSQL connection:
- `/api/brands` - Fetch all brands
- `/api/content-types` - Fetch all content types
- `/api/content` - Fetch all content

## Issue Identified

After examining the code, we found that:

1. The Brands page (`/dashboard/brands`) is correctly using the API route to fetch data
2. The Content page (`/dashboard/content`) was using hardcoded mock data instead of fetching from the API:
   ```javascript
   // Mock data for content items
   const allContentItems = [
     // ... hardcoded content items
   ];
   ```

This explained why the content page was showing dummy data even when the database had been cleaned.

## Fixes Applied

1. **Updated Content Page (`src/app/dashboard/content/page.tsx`)**:
   - Removed hardcoded mock data
   - Added fetch functionality to retrieve content from the `/api/content` API endpoint
   - Implemented loading state and error handling
   - Updated UI to display data from the API

The component now:
- Makes an API call to fetch real content data on load
- Dynamically populates filter options based on available content
- Displays appropriate error and loading states
- Formats data correctly for display

## Solutions

### Running with Local Database Configuration

To run the application with the local database configuration, use the `use-local-db.sh` script:

```bash
cd mixerai-2.0
./scripts/use-local-db.sh
```

This script:
1. Sets empty values for Supabase environment variables
2. Sets values for PostgreSQL environment variables
3. Runs the application with these environment variables

### Setting Up Local Database

To set up a local PostgreSQL database:

1. Start the Docker container:
   ```bash
   docker-compose up -d
   ```

2. Initialize the database schema:
   ```bash
   ./scripts/init-database.sh
   ```

### Cleaning Database Data

To clean dummy data from the database:

1. Reset the entire database:
   ```bash
   ./scripts/reset-database.sh
   ```

2. OR Clean existing data but keep the schema:
   ```bash
   ./scripts/clean-database.sh
   ```

3. Add a test user:
   ```bash
   ./scripts/add-test-user.sh
   ```

## Troubleshooting Steps

1. Ensure Docker is running and the PostgreSQL container is active
2. Verify database connectivity:
   ```bash
   psql -h localhost -U postgres -d mixerai
   ```
3. Check if API routes return data:
   ```
   http://localhost:3000/api/brands
   http://localhost:3000/api/content-types
   http://localhost:3000/api/content
   ```
4. Verify front-end components are using API routes instead of direct Supabase calls

## Next Steps

1. Check for any other components that might be using hardcoded data
2. Ensure proper error handling across all components
3. Add comprehensive testing for database connections
4. Consider implementing Storybook for testing UI components in isolation 