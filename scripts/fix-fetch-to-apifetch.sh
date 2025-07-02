#!/bin/bash

# Script to replace fetch() calls with apiFetch() for CSRF protection
# This script processes specific files and lines to replace fetch calls for mutations (POST, PUT, DELETE, PATCH)

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory
BACKUP_DIR="backups/fetch-to-apifetch-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}Starting fetch() to apiFetch() migration...${NC}"
echo -e "${YELLOW}Backup directory: $BACKUP_DIR${NC}"

# Files to process with their specific line numbers
declare -A FILES_TO_PROCESS=(
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
    grep -q "import.*{.*apiFetch.*}.*from.*['\"]@/lib/api-client['\"]" "$file" || \
    grep -q "import.*apiFetch.*from.*['\"]@/lib/api-client['\"]" "$file"
}

# Function to add import statement after the last import
add_import_statement() {
    local file=$1
    local temp_file="${file}.tmp"
    
    # Find the last import line number
    local last_import_line=$(grep -n "^import\|^} from" "$file" | tail -1 | cut -d: -f1)
    
    if [ -z "$last_import_line" ]; then
        # If no imports found, add at the beginning
        echo "import { apiFetch } from '@/lib/api-client';" > "$temp_file"
        echo "" >> "$temp_file"
        cat "$file" >> "$temp_file"
    else
        # Add import after the last import
        head -n "$last_import_line" "$file" > "$temp_file"
        echo "import { apiFetch } from '@/lib/api-client';" >> "$temp_file"
        tail -n +$((last_import_line + 1)) "$file" >> "$temp_file"
    fi
    
    mv "$temp_file" "$file"
}

# Function to check if a fetch call is a mutation
is_mutation_fetch() {
    local line=$1
    # Check if the line contains method: with POST, PUT, DELETE, or PATCH
    if echo "$line" | grep -qE "method:\s*['\"]?(POST|PUT|DELETE|PATCH)['\"]?"; then
        return 0
    fi
    # Also check for shorthand fetch calls like fetch(url, { method: 'POST' })
    if echo "$line" | grep -qE "fetch\([^,]+,\s*{\s*method:\s*['\"]?(POST|PUT|DELETE|PATCH)['\"]?"; then
        return 0
    fi
    return 1
}

# Function to process a file
process_file() {
    local file=$1
    local line_numbers=$2
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}File not found: $file${NC}"
        return 1
    fi
    
    echo -e "\n${YELLOW}Processing: $file${NC}"
    
    # Create backup
    cp "$file" "$BACKUP_DIR/$(basename "$file").bak"
    echo -e "  Backup created"
    
    # Check if import exists
    local import_added=false
    if ! has_apifetch_import "$file"; then
        echo -e "  Adding apiFetch import..."
        add_import_statement "$file"
        import_added=true
    else
        echo -e "  Import already exists"
    fi
    
    # Process specific line numbers
    IFS=',' read -ra LINES <<< "$line_numbers"
    local changes_made=false
    
    for line_num in "${LINES[@]}"; do
        # Adjust line number if import was added
        if [ "$import_added" = true ]; then
            line_num=$((line_num + 2))  # Account for import + blank line
        fi
        
        # Get the actual line content
        local line_content=$(sed -n "${line_num}p" "$file")
        
        if echo "$line_content" | grep -q "fetch("; then
            # Create a temporary file for processing
            local temp_file="${file}.processing"
            
            # Process the file line by line
            local current_line=1
            local in_fetch_call=false
            local fetch_start_line=0
            local brace_count=0
            local fetch_call=""
            
            while IFS= read -r line; do
                if [ "$current_line" -eq "$line_num" ] && echo "$line" | grep -q "fetch("; then
                    # Start of fetch call
                    in_fetch_call=true
                    fetch_start_line=$current_line
                    fetch_call="$line"
                    brace_count=$(echo "$line" | grep -o "{" | wc -l)
                    brace_count=$((brace_count - $(echo "$line" | grep -o "}" | wc -l)))
                    
                    # Check if it's a complete one-liner
                    if [ "$brace_count" -eq 0 ] && echo "$line" | grep -q ")"; then
                        # Complete fetch call on one line
                        if is_mutation_fetch "$line"; then
                            echo "${line//fetch(/apiFetch(}"
                            changes_made=true
                            echo -e "  ${GREEN}Line $line_num: Replaced fetch with apiFetch${NC}"
                        else
                            echo "$line"
                        fi
                        in_fetch_call=false
                    else
                        echo "$line"
                    fi
                elif [ "$in_fetch_call" = true ]; then
                    # Continue collecting fetch call
                    fetch_call="$fetch_call $line"
                    brace_count=$((brace_count + $(echo "$line" | grep -o "{" | wc -l)))
                    brace_count=$((brace_count - $(echo "$line" | grep -o "}" | wc -l)))
                    
                    echo "$line"
                    
                    # Check if fetch call is complete
                    if [ "$brace_count" -eq 0 ] && echo "$fetch_call" | grep -q ")"; then
                        in_fetch_call=false
                        
                        # Now check if the complete fetch call is a mutation
                        if is_mutation_fetch "$fetch_call"; then
                            # Go back and replace fetch with apiFetch at the start line
                            sed -i "${fetch_start_line}s/fetch(/apiFetch(/" "$temp_file"
                            changes_made=true
                            echo -e "  ${GREEN}Line $line_num: Replaced fetch with apiFetch (multi-line)${NC}"
                        fi
                    fi
                else
                    echo "$line"
                fi
                
                current_line=$((current_line + 1))
            done < "$file" > "$temp_file"
            
            # Replace the original file
            mv "$temp_file" "$file"
        else
            echo -e "  ${YELLOW}Line $line_num: No fetch call found${NC}"
        fi
    done
    
    if [ "$changes_made" = true ] || [ "$import_added" = true ]; then
        echo -e "  ${GREEN}File updated successfully${NC}"
        return 0
    else
        echo -e "  ${YELLOW}No changes needed${NC}"
        return 0
    fi
}

# Process all files
total_files=${#FILES_TO_PROCESS[@]}
processed=0
errors=0

for file in "${!FILES_TO_PROCESS[@]}"; do
    if process_file "$file" "${FILES_TO_PROCESS[$file]}"; then
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

# Run checks
echo -e "\n${YELLOW}Running post-migration checks...${NC}"
npm run lint:fix
npm run check

echo -e "\n${GREEN}All done!${NC}"