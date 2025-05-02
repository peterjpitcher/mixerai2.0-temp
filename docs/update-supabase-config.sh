#!/bin/bash

# Update Supabase Configuration Script
# This script updates the Supabase configuration in the .env file

# Make script exit if any command fails
set -e

echo "MixerAI 2.0 - Update Supabase Configuration"
echo "==========================================="
echo

# Check if we're in the right directory
if [ ! -d "mixerai-2.0" ]; then
  echo "Error: This script must be run from the root MixerAI 2.0a directory."
  echo "Current directory: $(pwd)"
  exit 1
fi

# Get Supabase configuration from user
read -p "Enter your Supabase URL (e.g., https://your-project.supabase.co): " supabase_url
read -p "Enter your Supabase Anon Key: " supabase_anon_key
read -p "Enter your Supabase Service Role Key: " supabase_service_role_key

# Ensure the URL starts with https://
if [[ ! $supabase_url =~ ^https:// ]]; then
  supabase_url="https://$supabase_url"
fi

# Create .env file
ENV_FILE="mixerai-2.0/.env"

cat > $ENV_FILE << EOF
# Supabase Configuration - Remote Database
NEXT_PUBLIC_SUPABASE_URL=$supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=$supabase_service_role_key

# Database Direct Connection - Not used when working with remote Supabase
# POSTGRES_HOST=localhost
# POSTGRES_PORT=5432
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=postgres
# POSTGRES_DB=mixerai

# Flag to use direct PostgreSQL connection (set to false to use Supabase)
USE_DIRECT_POSTGRES=false
EOF

echo
echo "✅ Supabase configuration updated successfully!"
echo "Configuration saved to $ENV_FILE"
echo
echo "Next steps:"
echo "1. Run the application with the updated configuration:"
echo "   cd mixerai-2.0 && npm run dev"
echo "2. Or use the launcher script:"
echo "   ./run-mixerai.sh"
echo
echo "Remember: The application will now use Supabase for authentication and data storage." 