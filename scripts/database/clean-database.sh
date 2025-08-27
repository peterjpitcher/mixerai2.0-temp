#!/bin/bash

# Make script exit if any command fails
set -e

echo "Cleaning database and removing all dummy data..."

# Run the clean database script
PGPASSWORD=postgres psql -h localhost -U postgres -d mixerai -f scripts/clean-database.sql

echo "Database successfully cleaned! All dummy data has been removed."
echo "The database now contains only the basic schema and content types."
echo "You can now test with a clean slate." 