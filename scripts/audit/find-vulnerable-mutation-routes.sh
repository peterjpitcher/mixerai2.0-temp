#!/bin/bash

# Script to find API routes with mutation methods that lack proper CSRF protection

echo "=== Finding Vulnerable Mutation Routes ==="
echo "Looking for routes with POST, PUT, DELETE, or PATCH that lack proper protection..."
echo ""

# Color codes
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Find all route files
routes=$(find /Users/peterpitcher/Cursor/MixerAI2.0/src/app/api -name "route.ts" -o -name "route.js" | sort)

# Arrays to store results
declare -a no_auth_routes
declare -a withAuth_no_csrf_routes
declare -a safe_routes

for route in $routes; do
    # Check if file has mutation methods
    if grep -E "export\s+(const|async function)\s+(POST|PUT|DELETE|PATCH)\s*=" "$route" > /dev/null 2>&1; then
        # Get the actual exported methods
        methods=$(grep -E "export\s+(const|async function)\s+(POST|PUT|DELETE|PATCH)\s*=" "$route" | sed 's/.*\(POST\|PUT\|DELETE\|PATCH\).*/\1/' | sort -u | tr '\n' ',' | sed 's/,$//')
        
        # Check protection level
        if grep -E "(withAuthAndCSRF|withRouteAuthAndCSRF|withAdminAuthAndCSRF|withAuthMonitoringAndCSRF)" "$route" > /dev/null 2>&1; then
            safe_routes+=("$route (Methods: $methods)")
        elif grep -E "withAuth\s*\(" "$route" > /dev/null 2>&1; then
            # Check if the mutation methods actually use withAuth
            vulnerable=false
            for method in POST PUT DELETE PATCH; do
                if grep -E "export\s+(const|async function)\s+$method\s*=\s*withAuth" "$route" > /dev/null 2>&1; then
                    vulnerable=true
                    break
                fi
            done
            if [ "$vulnerable" = true ]; then
                withAuth_no_csrf_routes+=("$route (Methods: $methods)")
            fi
        else
            # No auth at all or only withCSRF
            no_auth_routes+=("$route (Methods: $methods)")
        fi
    fi
done

# Display results
echo -e "${RED}🚨 CRITICAL - Routes with NO authentication (or only CSRF):${NC}"
if [ ${#no_auth_routes[@]} -eq 0 ]; then
    echo "  None found"
else
    for route in "${no_auth_routes[@]}"; do
        echo "  - $route"
    done
fi

echo ""
echo -e "${YELLOW}⚠️  WARNING - Routes using withAuth without CSRF protection:${NC}"
if [ ${#withAuth_no_csrf_routes[@]} -eq 0 ]; then
    echo "  None found"
else
    for route in "${withAuth_no_csrf_routes[@]}"; do
        echo "  - $route"
    done
fi

echo ""
echo -e "${GREEN}✅ SAFE - Routes with proper CSRF protection:${NC}"
echo "  Found ${#safe_routes[@]} routes with proper protection"

echo ""
echo "=== Summary ==="
echo "Critical vulnerabilities (no auth): ${#no_auth_routes[@]}"
echo "Warning vulnerabilities (withAuth no CSRF): ${#withAuth_no_csrf_routes[@]}"
echo "Safe routes: ${#safe_routes[@]}"
echo ""
echo "Total mutation routes analyzed: $((${#no_auth_routes[@]} + ${#withAuth_no_csrf_routes[@]} + ${#safe_routes[@]}))"