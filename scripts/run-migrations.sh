#!/bin/bash

# MixerAI 2.0 - Database Migration Script
# This script runs the database migrations

# Exit on error
set -e

# Default database connection parameters
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-mixerai}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-postgres}

# Function to display help
show_help() {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  -h, --host HOST       Database host (default: $DB_HOST)"
  echo "  -p, --port PORT       Database port (default: $DB_PORT)"
  echo "  -d, --database DB     Database name (default: $DB_NAME)"
  echo "  -u, --user USER       Database user (default: $DB_USER)"
  echo "  -w, --password PASS   Database password"
  echo "  -c, --clean           Drop existing database and recreate"
  echo "  --help                Show this help message"
}

# Parse command line arguments
while [ "$1" != "" ]; do
  case $1 in
    -h | --host )        shift
                         DB_HOST=$1
                         ;;
    -p | --port )        shift
                         DB_PORT=$1
                         ;;
    -d | --database )    shift
                         DB_NAME=$1
                         ;;
    -u | --user )        shift
                         DB_USER=$1
                         ;;
    -w | --password )    shift
                         DB_PASSWORD=$1
                         ;;
    -c | --clean )       CLEAN_DB=true
                         ;;
    --help )             show_help
                         exit
                         ;;
    * )                  show_help
                         exit 1
  esac
  shift
done

# Export password for PSQL
export PGPASSWORD="$DB_PASSWORD"

# Function to run SQL
run_sql() {
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$1"
}

# Function to run SQL file
run_sql_file() {
  echo "Running SQL file: $1"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$1"
}

# Clean database if requested
if [ "$CLEAN_DB" = true ]; then
  echo "Dropping database $DB_NAME..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "DROP DATABASE IF EXISTS $DB_NAME;"
  
  echo "Creating database $DB_NAME..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "CREATE DATABASE $DB_NAME;"
fi

# Check if database exists
echo "Checking if database $DB_NAME exists..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "Database $DB_NAME does not exist. Creating..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "CREATE DATABASE $DB_NAME;"
fi

# Run the squashed migration
echo "Running migrations..."
run_sql_file "migrations/squashed_migrations.sql"

echo "Migrations completed successfully!" 