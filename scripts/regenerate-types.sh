#!/bin/bash

# Script to regenerate Supabase types
# This script should be run when the database schema changes

echo "Regenerating Supabase types..."

# Check if Supabase is running locally
if ! npx supabase status >/dev/null 2>&1; then
    echo "Error: Supabase is not running locally."
    echo "Please start Supabase with: npx supabase start"
    exit 1
fi

# Generate types
echo "Generating types from local database..."
npx supabase gen types typescript --local > src/types/supabase.ts

if [ $? -eq 0 ]; then
    echo "✅ Types regenerated successfully at src/types/supabase.ts"
else
    echo "❌ Failed to regenerate types"
    exit 1
fi

# Add a comment at the top of the file
sed -i '' '1i\
// This file is auto-generated. Do not edit manually.\
// Regenerate using: npm run db:types or ./scripts/regenerate-types.sh\
\
' src/types/supabase.ts

echo "Done!"