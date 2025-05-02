#!/bin/bash

# Make script exit if any command fails
set -e

echo "Creating test user in the database..."

# Run the SQL script
PGPASSWORD=postgres psql -h localhost -U postgres -d mixerai -f scripts/create-test-user.sql

echo "Test user created successfully!"
echo "User ID: 11111111-1111-1111-1111-111111111111"
echo "Full Name: Test User"
echo ""
echo "Note: This user is only created in the local database."
echo "To use with a Supabase auth system, you would need to create a matching auth user." 