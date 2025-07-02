#!/bin/bash

# Script to replace fetch() calls with apiFetch() for CSRF protection
# Targeted version: Works with specific line numbers

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

# Define files and their specific lines to process
declare -A FILES_AND_LINES=(
    ["src/components/content/content-generator-form-refactored.tsx"]="94,145"
    ["src/components/content/restart-workflow-button.tsx"]="39"
    ["src/components/dashboard/notifications.tsx"]="113,130,152"
    ["src/components/template/template-card.tsx"]="31"
    ["src/components/content/regeneration-panel.tsx"]="69"
    ["src/components/user-profile.tsx"]="83"
    ["src/components/content/recipe-url-field.tsx"]="71"
    ["src/components/content/content-approval-workflow.tsx"]="118"
    ["src/components/content/content-generator-form.tsx"]="265,374,433,484,541,608"
    ["src/components/content/article-generator-form.tsx"]="125,301,439,468,604,981,1067"
    ["src/app/dashboard/claims/preview/page.tsx"]="670"
    ["src/app/dashboard/templates/[id]/page.tsx"]="314"
    ["src/hooks/use-form-persistence.ts"]="155"
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
    
    # Check for 'use client' directive
    local has_use_client=$(grep -n "^'use client'" "$file" 2>/dev/null | head -1 | cut -d: -f1)
    
    # Find the last import line
    local last_import_line=$(grep -n "^import\|^} from" "$file" 2>/dev/null | tail -1 | cut -d: -f1)
    
    if [ -n "$has_use_client" ] && [ -n "$last_import_line" ] && [ "$has_use_client" -lt "$last_import_line" ]; then
        # Add after last import
        awk -v line="$last_import_line" -v import="import { apiFetch } from '@/lib/api-client';" \
            'NR==line {print; print import; next} {print}' "$file" > "$temp_file"
    elif [ -n "$has_use_client" ]; then
        # Add after 'use client'
        awk -v line="$has_use_client" -v import="import { apiFetch } from '@/lib/api-client';" \
            'NR==line {print; print ""; print import; next} {print}' "$file" > "$temp_file"
    elif [ -n "$last_import_line" ]; then
        # Add after last import
        awk -v line="$last_import_line" -v import="import { apiFetch } from '@/lib/api-client';" \
            'NR==line {print; print import; next} {print}' "$file" > "$temp_file"
    else
        # Add at beginning
        echo "import { apiFetch } from '@/lib/api-client';" > "$temp_file"
        echo "" >> "$temp_file"
        cat "$file" >> "$temp_file"
    fi
    
    mv "$temp_file" "$file"
}

# Function to replace fetch on specific line
replace_fetch_on_line() {
    local file=$1
    local line_num=$2
    local import_offset=$3
    
    # Adjust line number if import was added
    local adjusted_line=$((line_num + import_offset))
    
    # Get the line content
    local line_content=$(sed -n "${adjusted_line}p" "$file")
    
    # Check if line contains fetch(
    if echo "$line_content" | grep -q "fetch("; then
        # Check if it's likely a mutation (contains method: POST/PUT/DELETE/PATCH)
        local next_lines=$(sed -n "${adjusted_line},$((adjusted_line + 10))p" "$file" | tr '\n' ' ')
        
        if echo "$next_lines" | grep -qE "method:\s*['\"]?(POST|PUT|DELETE|PATCH)['\"]?"; then
            # Replace fetch( with apiFetch( on this specific line
            sed -i "${adjusted_line}s/fetch(/apiFetch(/g" "$file"
            echo -e "    ${GREEN}Line $line_num (adjusted: $adjusted_line): Replaced fetch with apiFetch${NC}"
            return 0
        else
            echo -e "    ${YELLOW}Line $line_num (adjusted: $adjusted_line): fetch found but no mutation method detected${NC}"
            return 1
        fi
    else
        echo -e "    ${YELLOW}Line $line_num (adjusted: $adjusted_line): No fetch call found${NC}"
        return 1
    fi
}

# Function to process a file
process_file() {
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
    
    # Check and add import if needed
    local import_offset=0
    if ! has_apifetch_import "$file"; then
        echo -e "  ${YELLOW}Adding apiFetch import...${NC}"
        add_import_statement "$file"
        import_offset=2  # Account for import line + blank line
        echo -e "  ${GREEN}Import added${NC}"
    else
        echo -e "  ${GREEN}Import already exists${NC}"
    fi
    
    # Process each line number
    IFS=',' read -ra LINE_ARRAY <<< "$lines"
    local replacements=0
    
    echo -e "  ${BLUE}Processing ${#LINE_ARRAY[@]} line(s)...${NC}"
    
    for line_num in "${LINE_ARRAY[@]}"; do
        if replace_fetch_on_line "$file" "$line_num" "$import_offset"; then
            replacements=$((replacements + 1))
        fi
    done
    
    if [ "$replacements" -gt 0 ]; then
        echo -e "  ${GREEN}Total replacements: $replacements${NC}"
    else
        echo -e "  ${YELLOW}No replacements made${NC}"
    fi
    
    return 0
}

# Main execution
total_files=${#FILES_AND_LINES[@]}
processed=0
errors=0
total_replacements=0

echo -e "\n${BLUE}Processing ${total_files} files...${NC}"

for file in "${!FILES_AND_LINES[@]}"; do
    if process_file "$file" "${FILES_AND_LINES[$file]}"; then
        processed=$((processed + 1))
    else
        errors=$((errors + 1))
    fi
done

echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Migration Summary:${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "Files processed: ${GREEN}$processed${NC}/${total_files}"
if [ "$errors" -gt 0 ]; then
    echo -e "Errors encountered: ${RED}$errors${NC}"
fi
echo -e "Backups saved in: ${YELLOW}$BACKUP_DIR${NC}"

# Verification
echo -e "\n${BLUE}Verification:${NC}"
echo -n "Files with apiFetch import: "
import_count=0
for file in "${!FILES_AND_LINES[@]}"; do
    if [ -f "$file" ] && has_apifetch_import "$file"; then
        import_count=$((import_count + 1))
    fi
done
echo -e "${GREEN}$import_count${NC}"

echo -n "Total apiFetch calls: "
apifetch_count=0
for file in "${!FILES_AND_LINES[@]}"; do
    if [ -f "$file" ]; then
        count=$(grep -c "apiFetch(" "$file" 2>/dev/null || echo 0)
        apifetch_count=$((apifetch_count + count))
    fi
done
echo -e "${GREEN}$apifetch_count${NC}"

# Run post-migration checks
echo -e "\n${YELLOW}Running post-migration checks...${NC}"
echo -e "${BLUE}Running lint:fix...${NC}"
npm run lint:fix

echo -e "\n${BLUE}Running type check...${NC}"
npm run check

echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Migration complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Review the changes using: ${BLUE}git diff${NC}"
echo -e "2. Test the application thoroughly"
echo -e "3. If needed, restore from: ${BLUE}$BACKUP_DIR${NC}"