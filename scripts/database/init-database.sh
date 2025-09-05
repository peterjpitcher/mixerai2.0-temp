#!/bin/bash

# Make script exit if any command fails
set -e

echo "Initializing database..."

# Wait for the database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Connect to the database and run the migrations
echo "Running migrations..."
PGPASSWORD=postgres psql -h localhost -U postgres -d mixerai -f supabase/migrations/20240101_initial_schema.sql
PGPASSWORD=postgres psql -h localhost -U postgres -d mixerai -f supabase/migrations/20240102_test_data.sql

echo "Database initialization complete!" 