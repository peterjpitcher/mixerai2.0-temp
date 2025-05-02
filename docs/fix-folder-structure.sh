#!/bin/bash

# Fix folder structure script for MixerAI 2.0
# This script consolidates the duplicate directory structure

# Make script exit if any command fails
set -e

echo "MixerAI 2.0 Folder Structure Fix"
echo "================================"
echo

# Check if we're in the right directory
if [ ! -d "mixerai-2.0" ] || [ ! -d "src" ]; then
  echo "Error: This script must be run from the root MixerAI 2.0a directory."
  echo "Current directory: $(pwd)"
  exit 1
fi

# Create backup
echo "Creating backups..."
cp -r src src_backup
if [ -d "mixerai-2.0/mixerai-2.0" ]; then
  cp -r mixerai-2.0/mixerai-2.0 mixerai2_nested_backup
fi
echo "Backups created: src_backup/ and mixerai2_nested_backup/ (if applicable)"
echo

# Step 1: Copy any missing files from root src to mixerai-2.0/src
echo "Copying missing files from root src to mixerai-2.0/src..."

# Workflows page
if [ -f "src/app/dashboard/workflows/page.tsx" ]; then
  echo "- Copying workflows page..."
  mkdir -p mixerai-2.0/src/app/dashboard/workflows
  cp src/app/dashboard/workflows/page.tsx mixerai-2.0/src/app/dashboard/workflows/
fi

# Generate API route
if [ -f "src/app/api/content/generate/route.ts" ]; then
  echo "- Copying content generate API route..."
  mkdir -p mixerai-2.0/src/app/api/content/generate
  cp src/app/api/content/generate/route.ts mixerai-2.0/src/app/api/content/generate/
fi

# UI components
if [ -d "src/components/ui" ]; then
  echo "- Copying UI components..."
  for file in src/components/ui/*.tsx; do
    if [ -f "$file" ]; then
      filename=$(basename "$file")
      mkdir -p mixerai-2.0/src/components/ui
      cp "$file" mixerai-2.0/src/components/ui/
      echo "  - Copied $filename"
    fi
  done
fi

echo "File copying completed."
echo

# Step 2: Check for any additional files that might need copying
echo "Checking for additional files that might need to be copied..."

# Find files in src that don't exist in mixerai-2.0/src
additional_files=$(find src -type f -name "*.tsx" -o -name "*.ts" | while read srcfile; do
  # Get the relative path within src
  relpath=${srcfile#src/}
  
  # Check if the same file exists in mixerai-2.0/src
  if [ ! -f "mixerai-2.0/src/$relpath" ]; then
    echo "  - $srcfile (missing)"
  fi
done)

if [ -n "$additional_files" ]; then
  echo "The following files might need to be manually copied:"
  echo "$additional_files"
  echo "You should review these files and copy them if needed."
else
  echo "No additional files found that need copying."
fi

echo

# Step 3: Check for files in the nested mixerai-2.0/mixerai-2.0 directory
if [ -d "mixerai-2.0/mixerai-2.0" ]; then
  echo "Checking for files in the nested mixerai-2.0/mixerai-2.0 directory..."
  
  nested_files=$(find mixerai-2.0/mixerai-2.0 -type f -name "*.tsx" -o -name "*.ts" | while read nestedfile; do
    # Get the relative path within mixerai-2.0/mixerai-2.0
    relpath=${nestedfile#mixerai-2.0/mixerai-2.0/}
    
    # Check if the same file exists in mixerai-2.0
    if [ ! -f "mixerai-2.0/$relpath" ]; then
      echo "  - $nestedfile (missing)"
    fi
  done)
  
  if [ -n "$nested_files" ]; then
    echo "The following files in the nested directory might need to be manually copied:"
    echo "$nested_files"
    echo "You should review these files and copy them if needed."
  else
    echo "No additional files found in the nested directory that need copying."
  fi
else
  echo "No nested mixerai-2.0/mixerai-2.0 directory found."
fi

echo

# Step 4: Prompt user to confirm deletion of duplicate directories
echo "WARNING: The next step will delete duplicate directories."
echo "Make sure you've reviewed the output above and that all necessary files have been copied."
read -p "Do you want to proceed with removing duplicate directories? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Removing duplicate directories..."
  
  # Remove root src directory
  if [ -d "src" ]; then
    rm -rf src
    echo "- Removed root src/ directory"
  fi
  
  # Remove nested mixerai-2.0/mixerai-2.0 directory
  if [ -d "mixerai-2.0/mixerai-2.0" ]; then
    rm -rf mixerai-2.0/mixerai-2.0
    echo "- Removed nested mixerai-2.0/mixerai-2.0/ directory"
  fi
  
  echo "Cleanup complete."
else
  echo "Cleanup cancelled. No directories were deleted."
fi

echo
echo "Script completed. If you encounter any issues, you can restore from the backups:"
echo "- src_backup/ (to restore root src/)"
echo "- mixerai2_nested_backup/ (to restore mixerai-2.0/mixerai-2.0/)"
echo
echo "Remember to always run commands from within the mixerai-2.0 directory:"
echo "cd mixerai-2.0"
echo "npm run dev"
echo 