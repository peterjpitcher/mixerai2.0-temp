#!/bin/bash

# Script to update API routes to fix dynamic server usage errors
# Usage: ./scripts/update-api-routes.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Updating API Routes for Dynamic Rendering ====${NC}"

# Find all API route files that use withAuth
API_ROUTES=$(grep -l "withAuth\|withAuthAndMonitoring" src/app/api/**/route.ts)

# Counter for modified files
MODIFIED=0

for file in $API_ROUTES; do
  echo -e "${YELLOW}Processing: ${file}${NC}"
  
  # Check if the file already has the dynamic export
  if grep -q "export const dynamic" "$file"; then
    echo -e "${GREEN}✓ Already has dynamic export${NC}"
    continue
  fi
  
  # Get the first import line to add our line after it
  FIRST_IMPORT=$(grep -n "^import" "$file" | head -1 | cut -d: -f1)
  
  if [ -z "$FIRST_IMPORT" ]; then
    echo -e "${RED}× Could not find import line${NC}"
    continue
  fi
  
  # Create a temporary file
  TMP_FILE=$(mktemp)
  
  # Split the file and add our line after the imports
  head -n "$FIRST_IMPORT" "$file" > "$TMP_FILE"
  echo "" >> "$TMP_FILE" # Add a blank line
  echo "// Force dynamic rendering for this route" >> "$TMP_FILE"
  echo "export const dynamic = \"force-dynamic\";" >> "$TMP_FILE"
  echo "" >> "$TMP_FILE" # Add a blank line
  tail -n +$((FIRST_IMPORT + 1)) "$file" >> "$TMP_FILE"
  
  # Replace the original file
  mv "$TMP_FILE" "$file"
  
  echo -e "${GREEN}✓ Added dynamic export${NC}"
  MODIFIED=$((MODIFIED + 1))
done

echo -e "\n${BLUE}=== Summary ====${NC}"
echo -e "Modified files: ${GREEN}${MODIFIED}${NC}"
echo -e "To verify changes, run: ${YELLOW}npm run build${NC}" 