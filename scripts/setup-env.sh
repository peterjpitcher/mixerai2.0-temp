#!/bin/bash
# setup-env.sh - Create and configure environment variables for MixerAI 2.0

ENV_FILE=".env.local"
ENV_TEMPLATE=".env.template"

echo "🔧 MixerAI 2.0 Environment Setup"
echo "================================="

# Create a template file if it doesn't exist
if [ ! -f "$ENV_TEMPLATE" ]; then
  echo "📝 Creating environment template file..."
  cat > "$ENV_TEMPLATE" << EOL
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Application Settings
NODE_ENV=development
EOL
  echo "✅ Created $ENV_TEMPLATE file"
fi

# Check if .env.local already exists
if [ -f "$ENV_FILE" ]; then
  echo "⚠️ $ENV_FILE already exists."
  read -p "Do you want to overwrite it? (y/n): " overwrite
  if [ "$overwrite" != "y" ]; then
    echo "❌ Setup cancelled."
    exit 1
  fi
fi

# Create .env.local from template
cp "$ENV_TEMPLATE" "$ENV_FILE"
echo "✅ Created $ENV_FILE from template"

# Prompt for Supabase details
echo ""
echo "Enter your Supabase details:"
echo "------------------------"

read -p "NEXT_PUBLIC_SUPABASE_URL (e.g., https://xxxxxxxxxxxx.supabase.co): " supabase_url
read -p "NEXT_PUBLIC_SUPABASE_ANON_KEY: " supabase_anon_key
read -p "SUPABASE_SERVICE_ROLE_KEY: " supabase_service_role

# Update the .env.local file
if [ ! -z "$supabase_url" ]; then
  sed -i.bak "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$supabase_url|" "$ENV_FILE"
fi

if [ ! -z "$supabase_anon_key" ]; then
  sed -i.bak "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabase_anon_key|" "$ENV_FILE"
fi

if [ ! -z "$supabase_service_role" ]; then
  sed -i.bak "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$supabase_service_role|" "$ENV_FILE"
fi

# Clean up backup file
rm -f "$ENV_FILE.bak"

echo ""
echo "✅ Configuration updated!"
echo "🚀 You can now run the application with: npm run dev"
echo ""
echo "🧪 To test the database connection:"
echo "   export \$(grep -v '^#' $ENV_FILE | xargs) && node scripts/test-db-connection.js"

# MixerAI 2.0 Environment Setup Script
# This script helps set up the required environment variables for database connection

# Define colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}      MixerAI 2.0 Environment Setup Script        ${NC}"
echo -e "${BLUE}==================================================${NC}"
echo

# Check if .env file exists
if [ -f .env ]; then
  echo -e "${YELLOW}An .env file already exists. Do you want to overwrite it? (y/n)${NC}"
  read -r overwrite
  if [[ $overwrite != "y" && $overwrite != "Y" ]]; then
    echo -e "${YELLOW}Operation cancelled. Your .env file was not modified.${NC}"
    exit 0
  fi
fi

# Create a new .env file
echo -e "${GREEN}Creating new .env file...${NC}"
cat > .env << EOL
# MixerAI 2.0 Environment Variables
# Created: $(date)

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database Connection Method
# Set to 'true' to use direct PostgreSQL connection instead of Supabase
USE_DIRECT_POSTGRES=false

# Direct PostgreSQL Configuration (only used if USE_DIRECT_POSTGRES=true)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mixerai
POSTGRES_SSL=false

# Debug Mode
DEBUG_MODE=true
DEBUG_PANEL_ENABLED=true
EOL

echo -e "${GREEN}.env file created successfully!${NC}"
echo

# Prompt for Supabase variables
echo -e "${YELLOW}Please enter your Supabase URL (e.g., https://your-project.supabase.co):${NC}"
read -r supabase_url

echo -e "${YELLOW}Please enter your Supabase Anon Key:${NC}"
read -r supabase_anon_key

echo -e "${YELLOW}Please enter your Supabase Service Role Key:${NC}"
read -r supabase_service_role_key

# Update the .env file with the provided values
if [ -n "$supabase_url" ]; then
  sed -i '' "s|NEXT_PUBLIC_SUPABASE_URL=|NEXT_PUBLIC_SUPABASE_URL=$supabase_url|" .env
fi

if [ -n "$supabase_anon_key" ]; then
  sed -i '' "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=|NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabase_anon_key|" .env
fi

if [ -n "$supabase_service_role_key" ]; then
  sed -i '' "s|SUPABASE_SERVICE_ROLE_KEY=|SUPABASE_SERVICE_ROLE_KEY=$supabase_service_role_key|" .env
fi

echo
echo -e "${GREEN}Environment variables have been set!${NC}"
echo

# Suggest next steps
echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}                  Next Steps                      ${NC}"
echo -e "${BLUE}==================================================${NC}"
echo
echo -e "1. Test your database connection:"
echo -e "   ${YELLOW}node scripts/test-db-connection.js${NC}"
echo
echo -e "2. Start the development server with debug mode:"
echo -e "   ${YELLOW}npm run dev${NC}"
echo
echo -e "3. If you need to use a local PostgreSQL database:"
echo -e "   ${YELLOW}./scripts/use-local-db.sh${NC}"
echo
echo -e "${GREEN}Setup complete!${NC}" 