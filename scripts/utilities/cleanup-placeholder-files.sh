#!/bin/bash

# MixerAI 2.0 - Route Cleanup Phase 3: Remove Placeholder Files
# This script removes all placeholder files from the non-dashboard routes
# as part of the Phase 3 cleanup process.

echo "🧹 MixerAI 2.0 - Route Cleanup Phase 3"
echo "Removing placeholder components from non-dashboard routes..."

# List of directories to clean up
DIRS=(
  "src/app/brands"
  "src/app/workflows"
  "src/app/content"
  "src/app/users"
)

# Function to count files
count_files() {
  find "${DIRS[@]}" -type f -name "*.tsx" | wc -l
}

# Store initial count
INITIAL_COUNT=$(count_files)
echo "Found $INITIAL_COUNT placeholder files to remove"

# Remove all files from these directories
for dir in "${DIRS[@]}"; do
  echo "Removing files from $dir"
  find "$dir" -type f -name "*.tsx" -print -delete
done

# Remove empty directories
echo "Removing empty directories..."
for dir in "${DIRS[@]}"; do
  find "$dir" -type d -empty -print -delete
done

# Final count
FINAL_COUNT=$(count_files)
REMOVED=$((INITIAL_COUNT - FINAL_COUNT))

echo "✅ Cleanup complete!"
echo "Removed $REMOVED placeholder files"
echo "Remaining files: $FINAL_COUNT (should be 0)"

# Create marker file to indicate cleanup was completed
echo "$(date)" > .route-cleanup-completed

echo ""
echo "Next Steps:"
echo "1. Test with 'npm run dev' to ensure redirects work properly"
echo "2. Run 'node scripts/test-redirects.js' to verify all routes"
echo "3. Build and deploy with 'npm run build'" 