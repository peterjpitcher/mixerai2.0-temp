#!/bin/bash

# Script to add force-dynamic directive to all API routes using authentication
# This fixes build issues with routes that use cookies or auth

echo "Adding force-dynamic directive to authenticated API routes..."

# Array of route files to update
ROUTE_FILES=(
  "src/app/api/test-user-permissions/route.ts"
  "src/app/api/content-types/route.ts"
  "src/app/api/content/route.ts"
  "src/app/api/workflows/route.ts"
  "src/app/api/users/route.ts"
  "src/app/api/brands/route.ts"
  "src/app/api/workflows/[id]/invitations/route.ts"
  "src/app/api/workflows/[id]/route.ts"
  "src/app/api/users/[id]/route.ts"
  "src/app/api/brands/[id]/route.ts"
)

# Counter for modified files
MODIFIED=0

for FILE in "${ROUTE_FILES[@]}"; do
  if [ ! -f "$FILE" ]; then
    echo "⚠️  Warning: File not found: $FILE"
    continue
  fi

  # Check if dynamic directive already exists
  if grep -q "export const dynamic" "$FILE"; then
    echo "✓ File already has dynamic directive: $FILE"
    continue
  fi

  # Find the line after imports to add the directive
  IMPORT_PATTERN="import.*from"
  LAST_IMPORT_LINE=$(grep -n "$IMPORT_PATTERN" "$FILE" | tail -n 1 | cut -d: -f1)

  if [ -z "$LAST_IMPORT_LINE" ]; then
    echo "⚠️  Warning: Could not find imports in $FILE"
    continue
  fi

  # Add new line after the last import
  LAST_IMPORT_LINE=$((LAST_IMPORT_LINE + 1))
  sed -i '' "${LAST_IMPORT_LINE}i\\
// Force dynamic rendering for this route\\
export const dynamic = \"force-dynamic\";\\
" "$FILE"

  echo "✓ Added dynamic directive to: $FILE"
  MODIFIED=$((MODIFIED + 1))
done

echo "✅ Completed: Modified $MODIFIED files" 