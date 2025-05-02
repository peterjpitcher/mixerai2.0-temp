#!/bin/bash
# Ensure routes-manifest.json is copied to all required locations

# Create directories
mkdir -p .net
mkdir -p .vcl

# Try to find the routes-manifest.json file
if [ -f ".next/routes-manifest.json" ]; then
  cp .next/routes-manifest.json .net/
  cp .next/routes-manifest.json .vcl/
  echo "Copied routes-manifest.json to .net/ and .vcl/"
elif [ -f ".vercel/output/static/routes-manifest.json" ]; then
  cp .vercel/output/static/routes-manifest.json .net/
  cp .vercel/output/static/routes-manifest.json .vcl/
  echo "Copied routes-manifest.json from .vercel/output/static/ to .net/ and .vcl/"
else
  echo "Error: Could not find routes-manifest.json"
  # Create a fallback empty manifest if we can't find one
  echo '{"version":3,"basePath":"","redirects":[],"rewrites":[],"headers":[],"dynamicRoutes":[]}' > .net/routes-manifest.json
  echo '{"version":3,"basePath":"","redirects":[],"rewrites":[],"headers":[],"dynamicRoutes":[]}' > .vcl/routes-manifest.json
  echo "Created fallback routes-manifest.json"
fi 