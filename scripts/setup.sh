#!/bin/bash

# Make script exit if any command fails
set -e

# Create migrations directory if it doesn't exist
mkdir -p migrations

# Make the init-database script executable
chmod +x scripts/init-database.sh

echo "Setup complete!" 