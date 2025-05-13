#!/bin/bash

# Fix package.json script
# This script updates the package.json file to remove circular references

cat > mixerai-2.0/package.json << 'EOF'
{
  "name": "mixerai-2.0",
  "private": true,
  "version": "0.1.0",
  "description": "MixerAI 2.0 - AI-powered content generation platform",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "keywords": ["wrapper"],
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

echo "Package.json updated successfully!" 