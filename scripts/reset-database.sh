#!/bin/bash

# Make script exit if any command fails
set -e

echo "Resetting database and initializing with clean schema..."

# Drop and recreate the database
PGPASSWORD=postgres psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS mixerai;"
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE mixerai;"

# Initialize with clean schema
PGPASSWORD=postgres psql -h localhost -U postgres -d mixerai -f migrations/001_clean_schema.sql

echo "Database reset complete! The database has been recreated with a clean schema."
echo "No dummy data has been added - you have a completely clean environment for testing." 