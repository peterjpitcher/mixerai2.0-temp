#!/bin/bash

# Script to fix remaining fetch calls for mutations

echo "Fixing remaining fetch calls..."

# Fix restart-workflow-button.tsx (line 40 - uses template string)
sed -i.bak "s/await fetch(\`\/api\/content\/\${contentId}\/restart-workflow\`, {/await apiFetch(\`\/api\/content\/\${contentId}\/restart-workflow\`, {/g" src/components/content/restart-workflow-button.tsx

# Fix template-card.tsx (line 32 - DELETE method)
sed -i.bak "s/await fetch(\`\/api\/content-templates\/\${id}\`, {/await apiFetch(\`\/api\/content-templates\/\${id}\`, {/g" src/components/template/template-card.tsx

# Fix regeneration-panel.tsx (line 70 - POST method)
sed -i.bak "s/await fetch(\`\/api\/content\/\${contentId}\/regenerate\`, {/await apiFetch(\`\/api\/content\/\${contentId}\/regenerate\`, {/g" src/components/content/regeneration-panel.tsx

# Fix user-profile.tsx (line 84 - PUT method)
sed -i.bak "s/await fetch(\`\/api\/users\/\${user\.id}\`, {/await apiFetch(\`\/api\/users\/\${user.id}\`, {/g" src/components/user-profile.tsx

# Fix content-approval-workflow.tsx (line 119 - POST method)
sed -i.bak "s/await fetch(\`\/api\/content\/\${contentId}\/workflow-action\`, {/await apiFetch(\`\/api\/content\/\${contentId}\/workflow-action\`, {/g" src/components/content/content-approval-workflow.tsx

# Fix templates/[id]/page.tsx (line 315 - DELETE method)
sed -i.bak "s/await fetch(\`\/api\/content-templates\/\${id}\`, { method: 'DELETE' }/await apiFetch(\`\/api\/content-templates\/\${id}\`, { method: 'DELETE' }/g" "src/app/dashboard/templates/[id]/page.tsx"

# Fix claims/preview/page.tsx (lines 651, 671)
sed -i.bak "s/await fetch(url, { method, headers: { 'Content-Type': 'application\/json' }, body: JSON\.stringify(finalOverridePayload) }/await apiFetch(url, { method, headers: { 'Content-Type': 'application\/json' }, body: JSON.stringify(finalOverridePayload) }/g" src/app/dashboard/claims/preview/page.tsx
sed -i.bak2 "s/await fetch(\`\/api\/market-overrides\/\${idToDelete}\`, { method: 'DELETE' }/await apiFetch(\`\/api\/market-overrides\/\${idToDelete}\`, { method: 'DELETE' }/g" src/app/dashboard/claims/preview/page.tsx

# Fix use-form-persistence.ts (line 156 - POST method)
sed -i.bak "s/fetch('\/api\/auth\/refresh', { method: 'POST' })/apiFetch('\/api\/auth\/refresh', { method: 'POST' })/g" src/hooks/use-form-persistence.ts

# Clean up backup files
rm -f src/components/content/*.bak
rm -f src/components/template/*.bak
rm -f src/components/dashboard/*.bak
rm -f src/components/*.bak
rm -f src/app/dashboard/claims/preview/*.bak*
rm -f "src/app/dashboard/templates/[id]"/*.bak
rm -f src/hooks/*.bak

echo "Done fixing remaining fetch calls!"

# Verify the changes
echo ""
echo "Verification:"
echo "============="
echo ""
echo "Files with remaining non-GET fetch calls (should be empty):"
grep -l "fetch(" \
  src/components/content/restart-workflow-button.tsx \
  src/components/template/template-card.tsx \
  src/components/content/regeneration-panel.tsx \
  src/components/user-profile.tsx \
  src/components/content/content-approval-workflow.tsx \
  "src/app/dashboard/templates/[id]/page.tsx" \
  src/app/dashboard/claims/preview/page.tsx \
  src/hooks/use-form-persistence.ts 2>/dev/null | while read file; do
    if grep -E "fetch\(.*method:\s*['\"]?(POST|PUT|DELETE|PATCH)" "$file" >/dev/null 2>&1; then
      echo "  - $file (still has mutation fetch calls)"
    fi
done

echo ""
echo "Total apiFetch calls:"
grep -h "apiFetch(" \
  src/components/content/restart-workflow-button.tsx \
  src/components/template/template-card.tsx \
  src/components/content/regeneration-panel.tsx \
  src/components/user-profile.tsx \
  src/components/content/content-approval-workflow.tsx \
  "src/app/dashboard/templates/[id]/page.tsx" \
  src/app/dashboard/claims/preview/page.tsx \
  src/hooks/use-form-persistence.ts 2>/dev/null | wc -l