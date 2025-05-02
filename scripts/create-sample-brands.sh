#!/bin/bash

# Make script exit if any command fails
set -e

echo "Creating sample brands that match what's in the screenshot..."

# Run the SQL script
PGPASSWORD=postgres psql -h localhost -U postgres -d mixerai -f scripts/create-sample-brands.sql

echo "Sample brands created successfully!"
echo "These brands match exactly what's shown in the screenshot."
echo "Make sure your application is configured to use the local database." 