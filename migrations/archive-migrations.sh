#!/bin/bash

# Create a timestamp for the archive subfolder
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
ARCHIVE_DIR="migrations/archive/$TIMESTAMP"

# Create archive directory
mkdir -p "$ARCHIVE_DIR"

# List of files to keep in the main migrations directory
KEEP_FILES=(
  "consolidated_migrations.sql"
  "archive-migrations.sh"
)

# Move SQL migration files to archive
for file in migrations/*.sql; do
  filename=$(basename "$file")
  keep=false
  
  for keepfile in "${KEEP_FILES[@]}"; do
    if [ "$filename" == "$keepfile" ]; then
      keep=true
      break
    fi
  done
  
  if [ "$keep" == "false" ]; then
    echo "Moving $file to $ARCHIVE_DIR/"
    mv "$file" "$ARCHIVE_DIR/"
  fi
done

# Create a README.md in the archive folder with the list of moved files
echo "# Archived Migration Files - $TIMESTAMP" > "$ARCHIVE_DIR/README.md"
echo "" >> "$ARCHIVE_DIR/README.md"
echo "These migration files have been consolidated into \`consolidated_migrations.sql\` and are kept for reference purposes only." >> "$ARCHIVE_DIR/README.md"
echo "" >> "$ARCHIVE_DIR/README.md"
echo "## Files Archived" >> "$ARCHIVE_DIR/README.md"
echo "" >> "$ARCHIVE_DIR/README.md"

# List all files in the archive directory
for file in "$ARCHIVE_DIR"/*.sql; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    
    # Extract first line as description
    description=$(head -n 1 "$file" | sed 's/--\s*//')
    
    # If no description is found, provide a generic one
    if [[ "$description" == "" || "$description" == "--" ]]; then
      description="SQL migration file"
    fi
    
    echo "- \`$filename\` - $description" >> "$ARCHIVE_DIR/README.md"
  fi
done

echo "" >> "$ARCHIVE_DIR/README.md"
echo "All these migrations have been consolidated into a single file: \`migrations/consolidated_migrations.sql\`." >> "$ARCHIVE_DIR/README.md"

# Update the main migrations README.md if it exists
if [ -f "migrations/README.md" ]; then
  mv "migrations/README.md" "migrations/README.md.bak"
fi

# Create a new README.md in the migrations folder
cat > "migrations/README.md" << EOL
# MixerAI 2.0 Database Migrations

This directory contains the database migrations for the MixerAI 2.0 application.

## Consolidated Migrations

For simplicity and ease of deployment, we now use a single consolidated migration file that contains all necessary SQL statements:

- [consolidated_migrations.sql](./consolidated_migrations.sql) - Complete database schema and base data

This approach makes it easier to set up new environments and ensures consistency across deployments.

## Running Migrations

To apply the migrations, use the script:

```bash
./scripts/run-migrations.sh
```

You can specify custom database connection parameters:

```bash
./scripts/run-migrations.sh --host localhost --port 5432 --database mixerai --user postgres --password your_password
```

For a clean database reset, use the \`--clean\` flag:

```bash
./scripts/run-migrations.sh --clean
```

## Archive

Previous migration files are archived in the [archive](./archive) directory for reference purposes. These files are no longer used in the application.

Each archive includes a README.md file with descriptions of the archived migrations and when they were consolidated.
EOL

# Update the script that runs migrations to use the consolidated file
if [ -f "scripts/run-migrations.sh" ]; then
  echo "Updating scripts/run-migrations.sh to use consolidated_migrations.sql"
  sed -i '' 's/squashed_migrations.sql/consolidated_migrations.sql/g' "scripts/run-migrations.sh"
else
  echo "Warning: Could not find scripts/run-migrations.sh to update"
fi

echo "Migration consolidation complete."
echo "Old migration files have been moved to $ARCHIVE_DIR/"
echo "The main migrations file is now: migrations/consolidated_migrations.sql" 