#!/bin/bash

# Script to replace fetch() calls with apiFetch() for CSRF protection
# Final version with proper syntax

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Create backup directory
BACKUP_DIR="backups/fetch-to-apifetch-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}Starting targeted fetch() to apiFetch() migration...${NC}"
echo -e "${YELLOW}Backup directory: $BACKUP_DIR${NC}"

# Process each file individually
process_file_with_lines() {
    local file=$1
    local lines=$2
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}File not found: $file${NC}"
        return 1
    fi
    
    echo -e "\n${BLUE}Processing: $file${NC}"
    
    # Create backup
    local backup_name="$(echo "$file" | tr '/' '_').bak"
    cp "$file" "$BACKUP_DIR/$backup_name"
    echo -e "  ${MAGENTA}Backup created: $backup_name${NC}"
    
    # Check if import exists
    local import_offset=0
    if ! grep -q "import.*{.*apiFetch.*}.*from.*['\"]@/lib/api-client['\"]" "$file" 2>/dev/null; then
        echo -e "  ${YELLOW}Adding apiFetch import...${NC}"
        
        # Add import after existing imports or at the beginning
        local temp_file="${file}.tmp"
        
        # Check for 'use client' directive
        if grep -q "^'use client'" "$file"; then
            # Find last import line after 'use client'
            local last_import=$(grep -n "^import\|^} from" "$file" | tail -1 | cut -d: -f1)
            if [ -n "$last_import" ]; then
                awk -v line="$last_import" 'NR==line {print; print "import { apiFetch } from '\''@/lib/api-client'\'';"; next} {print}' "$file" > "$temp_file"
            else
                awk 'NR==2 {print "import { apiFetch } from '\''@/lib/api-client'\'';"; print ""} {print}' "$file" > "$temp_file"
            fi
        else
            # Find last import line
            local last_import=$(grep -n "^import\|^} from" "$file" | tail -1 | cut -d: -f1)
            if [ -n "$last_import" ]; then
                awk -v line="$last_import" 'NR==line {print; print "import { apiFetch } from '\''@/lib/api-client'\'';"; next} {print}' "$file" > "$temp_file"
            else
                echo "import { apiFetch } from '@/lib/api-client';" > "$temp_file"
                echo "" >> "$temp_file"
                cat "$file" >> "$temp_file"
            fi
        fi
        
        mv "$temp_file" "$file"
        import_offset=2
        echo -e "  ${GREEN}Import added${NC}"
    else
        echo -e "  ${GREEN}Import already exists${NC}"
    fi
    
    # Process each line number
    IFS=',' read -ra LINE_ARRAY <<< "$lines"
    local replacements=0
    
    echo -e "  ${BLUE}Processing ${#LINE_ARRAY[@]} line(s)...${NC}"
    
    for line_num in "${LINE_ARRAY[@]}"; do
        # Adjust line number if import was added
        local adjusted_line=$((line_num + import_offset))
        
        # Get the line content
        local line_content=$(sed -n "${adjusted_line}p" "$file")
        
        # Check if line contains fetch(
        if echo "$line_content" | grep -q "fetch("; then
            # Replace fetch( with apiFetch( on this specific line
            sed -i.bak "${adjusted_line}s/fetch(/apiFetch(/g" "$file"
            echo -e "    ${GREEN}Line $line_num (adjusted: $adjusted_line): Replaced fetch with apiFetch${NC}"
            replacements=$((replacements + 1))
        else
            echo -e "    ${YELLOW}Line $line_num (adjusted: $adjusted_line): No fetch call found${NC}"
        fi
    done
    
    # Clean up sed backup
    rm -f "${file}.bak"
    
    if [ "$replacements" -gt 0 ]; then
        echo -e "  ${GREEN}Total replacements: $replacements${NC}"
    else
        echo -e "  ${YELLOW}No replacements made${NC}"
    fi
    
    return 0
}

# Process all files
echo -e "\n${BLUE}Starting file processing...${NC}"

# Process each file with its specific lines
process_file_with_lines "src/components/content/content-generator-form-refactored.tsx" "94,145"
process_file_with_lines "src/components/content/restart-workflow-button.tsx" "39"
process_file_with_lines "src/components/dashboard/notifications.tsx" "113,130,152"
process_file_with_lines "src/components/template/template-card.tsx" "31"
process_file_with_lines "src/components/content/regeneration-panel.tsx" "69"
process_file_with_lines "src/components/user-profile.tsx" "83"
process_file_with_lines "src/components/content/recipe-url-field.tsx" "71"
process_file_with_lines "src/components/content/content-approval-workflow.tsx" "118"
process_file_with_lines "src/components/content/content-generator-form.tsx" "265,374,433,484,541,608"
process_file_with_lines "src/components/content/article-generator-form.tsx" "125,301,439,468,604,981,1067"
process_file_with_lines "src/app/dashboard/claims/preview/page.tsx" "670"
process_file_with_lines "src/app/dashboard/templates/[id]/page.tsx" "314"
process_file_with_lines "src/hooks/use-form-persistence.ts" "155"

echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Migration complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"

# Verification
echo -e "\n${BLUE}Verification Summary:${NC}"

# Count files with apiFetch import
echo -n "Files with apiFetch import: "
grep -l "import.*apiFetch.*from.*@/lib/api-client" \
    src/components/content/content-generator-form-refactored.tsx \
    src/components/content/restart-workflow-button.tsx \
    src/components/dashboard/notifications.tsx \
    src/components/template/template-card.tsx \
    src/components/content/regeneration-panel.tsx \
    src/components/user-profile.tsx \
    src/components/content/recipe-url-field.tsx \
    src/components/content/content-approval-workflow.tsx \
    src/components/content/content-generator-form.tsx \
    src/components/content/article-generator-form.tsx \
    src/app/dashboard/claims/preview/page.tsx \
    src/app/dashboard/templates/[id]/page.tsx \
    src/hooks/use-form-persistence.ts 2>/dev/null | wc -l

# Count total apiFetch calls
echo -n "Total apiFetch calls in processed files: "
grep -h "apiFetch(" \
    src/components/content/content-generator-form-refactored.tsx \
    src/components/content/restart-workflow-button.tsx \
    src/components/dashboard/notifications.tsx \
    src/components/template/template-card.tsx \
    src/components/content/regeneration-panel.tsx \
    src/components/user-profile.tsx \
    src/components/content/recipe-url-field.tsx \
    src/components/content/content-approval-workflow.tsx \
    src/components/content/content-generator-form.tsx \
    src/components/content/article-generator-form.tsx \
    src/app/dashboard/claims/preview/page.tsx \
    src/app/dashboard/templates/[id]/page.tsx \
    src/hooks/use-form-persistence.ts 2>/dev/null | wc -l

echo -e "\nBackups saved in: ${YELLOW}$BACKUP_DIR${NC}"

# Run post-migration checks
echo -e "\n${YELLOW}Running post-migration checks...${NC}"

# Check if npm run lint exists
if npm run | grep -q "lint"; then
    echo -e "${BLUE}Running lint...${NC}"
    npm run lint
fi

echo -e "\n${BLUE}Running type check...${NC}"
npm run check

echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All done!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Review the changes using: ${BLUE}git diff${NC}"
echo -e "2. Test the application thoroughly"
echo -e "3. If needed, restore from: ${BLUE}$BACKUP_DIR${NC}"