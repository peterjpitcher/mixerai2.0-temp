#!/bin/bash

# Create archive directory and subdirectories if they don't exist
mkdir -p docs/archive
mkdir -p docs/archive/auth-strategy
mkdir -p docs/archive/invitation-system
mkdir -p docs/archive/deployment
mkdir -p docs/archive/ui
mkdir -p docs/archive/database
mkdir -p docs/archive/api
mkdir -p docs/archive/openai
mkdir -p docs/archive/misc

# List of files to keep in the main docs directory
KEEP_FILES=(
  "CONSOLIDATED_DOCUMENTATION.md"
  "README.md"
  "organize-docs.sh"
  "setup-local-db.sh"
  "update-supabase-config.sh"
  "fix-package-json.sh"
  "run-mixerai.sh"
  "fix-folder-structure.sh"
  "copy-all-missing-files.sh"
)

# Define categories based on filename patterns
move_to_category() {
  local file=$1
  local filename=$(basename "$file")
  
  if [[ "$filename" == *"invitation"* || "$filename" == *"USER_MANAGEMENT"* ]]; then
    echo "Moving $file to docs/archive/invitation-system/"
    mv "$file" docs/archive/invitation-system/
  elif [[ "$filename" == *"DEPLOYMENT"* || "$filename" == *"VERCEL"* || "$filename" == *"RSC"* ]]; then
    echo "Moving $file to docs/archive/deployment/"
    mv "$file" docs/archive/deployment/
  elif [[ "$filename" == *"UI"* || "$filename" == *"LAYOUT"* || "$filename" == *"CSS"* || "$filename" == *"COMPONENT"* ]]; then
    echo "Moving $file to docs/archive/ui/"
    mv "$file" docs/archive/ui/
  elif [[ "$filename" == *"DATABASE"* || "$filename" == *"SUPABASE"* ]]; then
    echo "Moving $file to docs/archive/database/"
    mv "$file" docs/archive/database/
  elif [[ "$filename" == *"API"* || "$filename" == *"WORKFLOW_API"* || "$filename" == *"ROUTING"* ]]; then
    echo "Moving $file to docs/archive/api/"
    mv "$file" docs/archive/api/
  elif [[ "$filename" == *"OPENAI"* || "$filename" == *"AZURE"* || "$filename" == *"BRAND_IDENTITY"* ]]; then
    echo "Moving $file to docs/archive/openai/"
    mv "$file" docs/archive/openai/
  else
    echo "Moving $file to docs/archive/misc/"
    mv "$file" docs/archive/misc/
  fi
}

# Move redundant documentation files to archive
for file in docs/*.md; do
  filename=$(basename "$file")
  keep=false
  
  for keepfile in "${KEEP_FILES[@]}"; do
    if [ "$filename" == "$keepfile" ]; then
      keep=true
      break
    fi
  done
  
  if [ "$keep" == "false" ]; then
    move_to_category "$file"
  fi
done

# Handle auth-strategy folder
for file in docs/auth-strategy/*.md; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    # Keep only the latest version of auth strategy
    if [ "$filename" != "AUTH_STRATEGY_PLAN_REVISED.md" ]; then
      echo "Moving $file to docs/archive/auth-strategy/"
      mv "$file" docs/archive/auth-strategy/
    fi
  fi
done

# Handle any shell scripts that are not in the keep list
for script in docs/*.sh; do
  filename=$(basename "$script")
  keep=false
  
  for keepfile in "${KEEP_FILES[@]}"; do
    if [ "$filename" == "$keepfile" ]; then
      keep=true
      break
    fi
  done
  
  if [ "$keep" == "false" ]; then
    echo "Moving $script to docs/archive/misc/"
    mv "$script" docs/archive/misc/
  fi
done

# Create a README.md in the archive folder
cat > docs/archive/README.md << EOL
# Archived Documentation

This folder contains archived documentation files that have been consolidated into the main [CONSOLIDATED_DOCUMENTATION.md](../CONSOLIDATED_DOCUMENTATION.md) file.

These files are kept for historical reference but may contain outdated information. Please refer to the consolidated documentation for the most up-to-date information.

## Folder Structure

- **auth-strategy/** - Authentication implementation documentation
- **invitation-system/** - User invitation system documentation
- **deployment/** - Vercel deployment and server component fixes
- **ui/** - UI components and layouts
- **database/** - Database and Supabase documentation
- **api/** - API endpoints and routing
- **openai/** - Azure OpenAI integration and brand identity generation
- **misc/** - Miscellaneous documentation
EOL

echo "Documentation organization complete. Redundant files moved to categorized folders in docs/archive/"
echo "Main documentation is now available in CONSOLIDATED_DOCUMENTATION.md" 