#!/bin/bash

# Make script exit if any command fails
set -e

echo "Adding a test user to the database..."

# Run the SQL script
PGPASSWORD=postgres psql -h localhost -U postgres -d mixerai -f scripts/add-test-user.sql

echo "Test user added to the database."
echo "User ID: 22222222-2222-2222-2222-222222222222"
echo "Full Name: Test User"
echo ""
echo "This user can be used for basic testing without any associated dummy data." 