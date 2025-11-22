#!/bin/bash

# MixerAI 2.0 - Bundle Size Analysis Script
#
# This script builds the project and analyzes the JavaScript bundle sizes
# to measure the impact of the route cleanup implementation.
#
# Usage: ./scripts/analyze-bundle-sizes.sh

set -e

echo "🔍 MixerAI 2.0 - Bundle Size Analysis"
echo "======================================"
echo

# Check if the project has uncommitted changes
if [[ $(git status --porcelain) ]]; then
  echo "⚠️ Warning: You have uncommitted changes."
  echo "It's recommended to commit all changes before analyzing bundle sizes."
  echo
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# Function to build the project and collect bundle stats
analyze_branch() {
  local branch=$1
  local output_dir=$2
  
  echo "📦 Analyzing bundle sizes on branch: $branch"
  
  # Save current branch
  current_branch=$(git branch --show-current)
  
  # Checkout the target branch
  git checkout $branch
  
  # Install dependencies if needed
  if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
  fi
  
  # Build the project
  echo "🔨 Building the project..."
  ANALYZE=true npm run build
  
  # Create output directory if it doesn't exist
  mkdir -p $output_dir
  
  # Copy bundle stats
  echo "📊 Collecting bundle stats..."
  cp -r .next/analyze/* $output_dir/
  
  # Return to original branch
  git checkout $current_branch
  
  echo "✅ Analysis complete for branch: $branch"
  echo
}

# Create temp directory for results
mkdir -p tmp/bundle-analysis

# Analyze current branch (with route cleanup)
analyze_branch $(git branch --show-current) "tmp/bundle-analysis/after"

# Ask if user wants to analyze a different branch for comparison
echo "Would you like to analyze a different branch for comparison?"
echo "This is useful to compare bundle sizes before and after route cleanup."
read -p "Enter branch name to compare (or press Enter to skip): " compare_branch

if [[ -n "$compare_branch" ]]; then
  # Check if branch exists
  if git show-ref --verify --quiet refs/heads/$compare_branch; then
    analyze_branch $compare_branch "tmp/bundle-analysis/before"
    
    echo "📊 Comparison results:"
    echo "======================"
    
    # Calculate total size for each branch
    if [ -d "tmp/bundle-analysis/before" ] && [ -d "tmp/bundle-analysis/after" ]; then
      before_size=$(find tmp/bundle-analysis/before -name "*.html" -exec grep -o "Total Size: [0-9.]* kB" {} \; | awk '{sum += $3} END {print sum}')
      after_size=$(find tmp/bundle-analysis/after -name "*.html" -exec grep -o "Total Size: [0-9.]* kB" {} \; | awk '{sum += $3} END {print sum}')
      
      if [[ -n "$before_size" && -n "$after_size" ]]; then
        echo "Before ($compare_branch): $before_size kB"
        echo "After (current branch): $after_size kB"
        
        # Calculate difference
        diff=$(echo "$before_size - $after_size" | bc)
        percent=$(echo "scale=2; ($diff / $before_size) * 100" | bc)
        
        if (( $(echo "$diff > 0" | bc -l) )); then
          echo "📉 Reduction: $diff kB ($percent%)"
        else
          echo "📈 Increase: $(echo "$diff * -1" | bc) kB ($(echo "$percent * -1" | bc)%)"
        fi
      else
        echo "⚠️ Could not calculate comparison. Check the analysis files manually."
      fi
    fi
  else
    echo "❌ Branch '$compare_branch' does not exist."
  fi
fi

echo
echo "📂 Detailed analysis results are available in:"
echo "  - After route cleanup: tmp/bundle-analysis/after/"
if [[ -n "$compare_branch" ]]; then
  echo "  - Before route cleanup: tmp/bundle-analysis/before/"
fi
echo
echo "To view these results, open the HTML files in your browser."
echo "✅ Bundle analysis complete!" 