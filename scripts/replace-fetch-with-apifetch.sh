#!/bin/bash

# Simple script to replace fetch() with apiFetch() for mutation methods
# This version assumes imports are already added

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Replacing fetch() calls with apiFetch() for mutations...${NC}"

# Files to process
FILES=(
    "src/components/content/content-generator-form-refactored.tsx"
    "src/components/content/restart-workflow-button.tsx"
    "src/components/dashboard/notifications.tsx"
    "src/components/template/template-card.tsx"
    "src/components/content/regeneration-panel.tsx"
    "src/components/user-profile.tsx"
    "src/components/content/recipe-url-field.tsx"
    "src/components/content/content-approval-workflow.tsx"
    "src/components/content/content-generator-form.tsx"
    "src/components/content/article-generator-form.tsx"
    "src/app/dashboard/claims/preview/page.tsx"
    "src/app/dashboard/templates/[id]/page.tsx"
    "src/hooks/use-form-persistence.ts"
)

# Create backup directory
BACKUP_DIR="backups/fetch-replacements-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Backup directory: $BACKUP_DIR${NC}"

# Function to replace fetch with apiFetch for mutation methods
replace_mutations() {
    local file=$1
    local backup_name="$(echo "$file" | tr '/' '_').bak"
    
    # Create backup
    cp "$file" "$BACKUP_DIR/$backup_name"
    
    # Create temporary file
    local temp_file="${file}.tmp"
    
    # Use perl for multiline replacements
    # This will find fetch( followed by method: POST/PUT/DELETE/PATCH and replace with apiFetch(
    perl -0pe 's/fetch\(([^)]+)\)([^}]*?method:\s*['"'"'"]?(POST|PUT|DELETE|PATCH)['"'"'"]?)/apiFetch($1)$2/gs' "$file" > "$temp_file"
    
    # Check if changes were made
    if ! diff -q "$file" "$temp_file" >/dev/null 2>&1; then
        mv "$temp_file" "$file"
        echo -e "${GREEN}✓ $file - Replacements made${NC}"
        
        # Count the replacements
        local count=$(grep -c "apiFetch(" "$file" || echo 0)
        echo -e "  ${BLUE}Total apiFetch calls: $count${NC}"
    else
        rm "$temp_file"
        echo -e "${YELLOW}○ $file - No changes needed${NC}"
    fi
}

# Process all files
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        replace_mutations "$file"
    else
        echo -e "${YELLOW}File not found: $file${NC}"
    fi
done

echo -e "\n${GREEN}Done! Backups saved in: $BACKUP_DIR${NC}"

# Run type check
echo -e "\n${BLUE}Running type check...${NC}"
npm run check

echo -e "\n${GREEN}Complete!${NC}"