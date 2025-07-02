#!/bin/bash

# Script to replace fetch() calls with apiFetch() for CSRF protection
# Version 2: More reliable approach using sed

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create backup directory
BACKUP_DIR="backups/fetch-to-apifetch-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}Starting fetch() to apiFetch() migration (v2)...${NC}"
echo -e "${YELLOW}Backup directory: $BACKUP_DIR${NC}"

# Files to process
declare -a FILES=(
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

# Function to check if import already exists
has_apifetch_import() {
    local file=$1
    grep -q "import.*{.*apiFetch.*}.*from.*['\"]@/lib/api-client['\"]" "$file" 2>/dev/null || \
    grep -q "import.*apiFetch.*from.*['\"]@/lib/api-client['\"]" "$file" 2>/dev/null
}

# Function to add import statement
add_import_statement() {
    local file=$1
    local temp_file="${file}.tmp"
    
    # Find the last import line
    local last_import_line=$(grep -n "^import\|^} from" "$file" 2>/dev/null | tail -1 | cut -d: -f1)
    
    if [ -z "$last_import_line" ]; then
        # If no imports found, add at the beginning with 'use client' check
        if grep -q "^'use client'" "$file"; then
            echo "'use client';" > "$temp_file"
            echo "" >> "$temp_file"
            echo "import { apiFetch } from '@/lib/api-client';" >> "$temp_file"
            tail -n +2 "$file" >> "$temp_file"
        else
            echo "import { apiFetch } from '@/lib/api-client';" > "$temp_file"
            echo "" >> "$temp_file"
            cat "$file" >> "$temp_file"
        fi
    else
        # Add import after the last import
        head -n "$last_import_line" "$file" > "$temp_file"
        echo "import { apiFetch } from '@/lib/api-client';" >> "$temp_file"
        tail -n +$((last_import_line + 1)) "$file" >> "$temp_file"
    fi
    
    mv "$temp_file" "$file"
}

# Function to process a file
process_file() {
    local file=$1
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}File not found: $file${NC}"
        return 1
    fi
    
    echo -e "\n${BLUE}Processing: $file${NC}"
    
    # Create backup
    local backup_name="$(echo "$file" | tr '/' '_').bak"
    cp "$file" "$BACKUP_DIR/$backup_name"
    echo -e "  Backup created: $backup_name"
    
    # Check if file contains any fetch calls
    if ! grep -q "fetch(" "$file"; then
        echo -e "  ${YELLOW}No fetch calls found in file${NC}"
        return 0
    fi
    
    # Check if import exists
    local import_added=false
    if ! has_apifetch_import "$file"; then
        echo -e "  Adding apiFetch import..."
        add_import_statement "$file"
        import_added=true
    else
        echo -e "  ${GREEN}Import already exists${NC}"
    fi
    
    # Create temp file for processing
    local temp_file="${file}.processing"
    cp "$file" "$temp_file"
    
    # Count fetch calls that look like mutations
    local mutation_count=$(grep -E "fetch\([^)]*\).*method.*['\"]?(POST|PUT|DELETE|PATCH)['\"]?" "$file" | wc -l)
    
    if [ "$mutation_count" -gt 0 ]; then
        echo -e "  Found $mutation_count potential mutation fetch calls"
        
        # Replace fetch( with apiFetch( for lines containing mutation methods
        # This handles most common patterns
        sed -i.bak -E "/(fetch\([^)]*\).*method.*['\"]?(POST|PUT|DELETE|PATCH)['\"]?)/s/fetch\(/apiFetch\(/g" "$temp_file"
        
        # Also handle multiline fetch calls where method is on the next line
        # This is more complex and requires perl for multiline regex
        perl -i -pe 's/fetch\(((?:(?!fetch\().)*?)method:\s*['"'"'"]?(POST|PUT|DELETE|PATCH)['"'"'"]?/apiFetch\($1method: "$2"/gs' "$temp_file"
        
        # Count replacements made
        local new_apifetch_count=$(grep -c "apiFetch(" "$temp_file" || echo 0)
        local old_apifetch_count=$(grep -c "apiFetch(" "$file" || echo 0)
        local replacements=$((new_apifetch_count - old_apifetch_count))
        
        if [ "$replacements" -gt 0 ]; then
            mv "$temp_file" "$file"
            echo -e "  ${GREEN}Replaced $replacements fetch calls with apiFetch${NC}"
        else
            rm "$temp_file"
            echo -e "  ${YELLOW}No replacements made (might need manual review)${NC}"
        fi
    else
        rm "$temp_file"
        echo -e "  ${YELLOW}No mutation fetch calls found${NC}"
    fi
    
    # Clean up backup files created by sed
    rm -f "${file}.bak" "${temp_file}.bak" 2>/dev/null || true
    
    return 0
}

# Main execution
total_files=${#FILES[@]}
processed=0
errors=0

echo -e "\n${BLUE}Processing ${total_files} files...${NC}"

for file in "${FILES[@]}"; do
    if process_file "$file"; then
        processed=$((processed + 1))
    else
        errors=$((errors + 1))
    fi
done

echo -e "\n${GREEN}Migration complete!${NC}"
echo -e "Files processed: $processed/$total_files"
if [ "$errors" -gt 0 ]; then
    echo -e "${RED}Errors encountered: $errors${NC}"
fi
echo -e "Backups saved in: $BACKUP_DIR"

# Verify changes
echo -e "\n${YELLOW}Verification:${NC}"
echo -e "Files with apiFetch imports:"
grep -l "import.*apiFetch.*from.*@/lib/api-client" "${FILES[@]}" 2>/dev/null | wc -l

echo -e "\nTotal apiFetch calls in processed files:"
grep -h "apiFetch(" "${FILES[@]}" 2>/dev/null | wc -l

# Run checks
echo -e "\n${YELLOW}Running post-migration checks...${NC}"
npm run lint:fix
npm run check

echo -e "\n${GREEN}All done!${NC}"
echo -e "\n${YELLOW}Please review the changes and test thoroughly.${NC}"
echo -e "If you need to revert, restore from: $BACKUP_DIR"