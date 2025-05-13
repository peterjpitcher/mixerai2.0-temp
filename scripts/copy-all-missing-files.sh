#!/bin/bash

# Copy All Missing Files Script for MixerAI 2.0
# This script copies all missing files from src to mixerai-2.0/src

# Make script exit if any command fails
set -e

echo "MixerAI 2.0 - Copy All Missing Files"
echo "==================================="
echo

# Check if we're in the right directory
if [ ! -d "mixerai-2.0" ] || [ ! -d "src" ]; then
  echo "Error: This script must be run from the root MixerAI 2.0a directory."
  echo "Current directory: $(pwd)"
  exit 1
fi

# Create a log file for copied files
log_file="copy_files_log.txt"
echo "Files copied on $(date)" > $log_file

# Function to copy files
copy_file() {
  local src_file=$1
  local dest_dir="mixerai-2.0/$src_file"
  local dest_dir_parent=$(dirname "$dest_dir")
  
  # Create parent directory if it doesn't exist
  mkdir -p "$dest_dir_parent"
  
  # Copy the file
  cp "$src_file" "$dest_dir"
  
  echo "✅ Copied: $src_file" | tee -a $log_file
}

# Find all TypeScript files in src
echo "Finding all TypeScript files in src..."
files_to_copy=$(find src -type f -name "*.tsx" -o -name "*.ts" | grep -v "node_modules")

# Count files
file_count=$(echo "$files_to_copy" | wc -l)
echo "Found $file_count files to check."
echo

# Count for progress
current=0
copied=0

# Check each file
for src_file in $files_to_copy; do
  # Get the relative path for the destination
  dest_file="mixerai-2.0/$src_file"
  
  # Increment counter
  current=$((current + 1))
  
  # Show progress
  if [ $((current % 10)) -eq 0 ] || [ $current -eq $file_count ]; then
    echo -ne "Progress: $current/$file_count files checked\r"
  fi
  
  # Check if file exists in destination
  if [ ! -f "$dest_file" ]; then
    # Create destination directory if it doesn't exist
    dest_dir=$(dirname "$dest_file")
    mkdir -p "$dest_dir"
    
    # Copy file
    cp "$src_file" "$dest_file"
    
    # Log
    echo "✅ Copied: $src_file" >> $log_file
    copied=$((copied + 1))
  fi
done

echo
echo "Completed! Copied $copied files out of $file_count checked."
echo "See $log_file for the list of copied files."
echo

# Check nested mixerai-2.0/mixerai-2.0 directory
if [ -d "mixerai-2.0/mixerai-2.0" ]; then
  echo "Checking nested mixerai-2.0/mixerai-2.0 directory..."
  
  nested_copied=0
  nested_count=0
  
  nested_files=$(find mixerai-2.0/mixerai-2.0 -type f -name "*.tsx" -o -name "*.ts" | grep -v "node_modules")
  
  for nested_file in $nested_files; do
    # Get the path relative to mixerai-2.0/mixerai-2.0
    rel_path=${nested_file#mixerai-2.0/mixerai-2.0/}
    dest_file="mixerai-2.0/$rel_path"
    
    nested_count=$((nested_count + 1))
    
    # Check if file exists in destination
    if [ ! -f "$dest_file" ]; then
      # Create destination directory if it doesn't exist
      dest_dir=$(dirname "$dest_file")
      mkdir -p "$dest_dir"
      
      # Copy file
      cp "$nested_file" "$dest_file"
      
      # Log
      echo "✅ Copied from nested: $rel_path" >> $log_file
      nested_copied=$((nested_copied + 1))
    fi
  done
  
  echo "Completed nested copy! Copied $nested_copied files out of $nested_count checked."
  echo
fi

echo "All missing files have been copied to mixerai-2.0/src!"
echo "Next steps:"
echo "1. Review the copied files in $log_file"
echo "2. Consider using ./fix-folder-structure.sh to clean up duplicate directories"
echo "3. Remember to always run commands from the mixerai-2.0 directory" 