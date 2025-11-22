#!/bin/bash

# Script to find API routes with mutation methods that lack CSRF protection

echo "=== Analyzing API Routes for CSRF Protection ==="
echo "Finding routes with POST, PUT, DELETE, or PATCH methods without CSRF protection..."
echo ""

# List of files to analyze
files=$(find /Users/peterpitcher/Cursor/MixerAI2.0/src/app/api -name "*.ts" -o -name "*.js" | grep -E "(route\.|/route\.)" | sort)

# Counters
total_routes=0
vulnerable_routes=0

# Function to check if a file contains mutation methods without CSRF
check_file() {
    local file=$1
    local filename=$(basename "$file")
    
    # Skip if file doesn't exist
    if [ ! -f "$file" ]; then
        return
    fi
    
    # Check if file exports POST, PUT, DELETE, or PATCH
    if grep -E "export\s+(const|async function)\s+(POST|PUT|DELETE|PATCH)" "$file" > /dev/null 2>&1; then
        total_routes=$((total_routes + 1))
        
        # Check if it uses any CSRF protection
        if ! grep -E "(withAuthAndCSRF|withRouteAuthAndCSRF|withAdminAuthAndCSRF|withAuthMonitoringAndCSRF)" "$file" > /dev/null 2>&1; then
            # Check if it uses withAuth (vulnerable) or no auth at all
            if grep -E "withAuth\s*\(" "$file" > /dev/null 2>&1; then
                echo "⚠️  VULNERABLE (withAuth without CSRF): $file"
                vulnerable_routes=$((vulnerable_routes + 1))
                
                # Show which methods are exposed
                echo -n "   Methods: "
                grep -E "export\s+(const|async function)\s+(POST|PUT|DELETE|PATCH)" "$file" | sed 's/.*\(POST\|PUT\|DELETE\|PATCH\).*/\1/' | tr '\n' ' '
                echo ""
                echo ""
            elif ! grep -E "(withAuth|requireAuth|authenticated)" "$file" > /dev/null 2>&1; then
                echo "🚨 CRITICAL (No auth at all): $file"
                vulnerable_routes=$((vulnerable_routes + 1))
                
                # Show which methods are exposed
                echo -n "   Methods: "
                grep -E "export\s+(const|async function)\s+(POST|PUT|DELETE|PATCH)" "$file" | sed 's/.*\(POST\|PUT\|DELETE\|PATCH\).*/\1/' | tr '\n' ' '
                echo ""
                echo ""
            fi
        fi
    fi
}

# Process all files
for file in $files; do
    check_file "$file"
done

echo "=== Summary ==="
echo "Total mutation routes found: $total_routes"
echo "Vulnerable routes found: $vulnerable_routes"
echo ""
echo "Note: GET routes are safe from CSRF and not included in this analysis."