#!/bin/bash

# Script to verify the fetch to apiFetch migration

echo "======================================"
echo "Fetch to apiFetch Migration Summary"
echo "======================================"
echo ""

# Files that were processed
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

echo "Files with apiFetch import:"
echo "============================"
for file in "${FILES[@]}"; do
    if [ -f "$file" ] && grep -q "import.*apiFetch.*from.*@/lib/api-client" "$file"; then
        echo "✓ $file"
    else
        echo "✗ $file (missing import)"
    fi
done

echo ""
echo "apiFetch usage count per file:"
echo "=============================="
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        count=$(grep -c "apiFetch(" "$file" || echo 0)
        if [ "$count" -gt 0 ]; then
            echo "$file: $count calls"
        fi
    fi
done

echo ""
echo "Remaining fetch calls (should be for GET requests only):"
echo "======================================================="
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        remaining=$(grep -n "fetch(" "$file" | grep -v "apiFetch(" || true)
        if [ -n "$remaining" ]; then
            echo ""
            echo "$file:"
            echo "$remaining"
        fi
    fi
done

echo ""
echo "Total apiFetch calls across all files:"
total=0
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        count=$(grep -c "apiFetch(" "$file" || echo 0)
        total=$((total + count))
    fi
done
echo "$total"

echo ""
echo "======================================"
echo "Migration complete!"
echo "======================================" 