#!/bin/bash

# Script to configure MixerAI 2.0 for the production domain
# Usage: ./update-domain-config.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="mixerai.orangejely.co.uk"

echo -e "${BLUE}=== MixerAI 2.0 Domain Configuration ====${NC}"
echo -e "Setting up configuration for domain: ${GREEN}${DOMAIN}${NC}\n"

# Check if Vercel CLI is installed
if command -v vercel &> /dev/null; then
  echo -e "${GREEN}✓ Vercel CLI detected${NC}"
  
  # Ask if the user wants to set the domain in Vercel
  read -p "Do you want to set up the domain in Vercel? (y/n): " setup_vercel
  if [[ "$setup_vercel" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Adding domain to Vercel project...${NC}"
    vercel domains add $DOMAIN
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ Domain added to Vercel project${NC}"
    else
      echo -e "${RED}× Failed to add domain to Vercel project${NC}"
      echo -e "${YELLOW}You may need to add the domain manually in the Vercel dashboard${NC}"
    fi
  fi
else
  echo -e "${YELLOW}⚠ Vercel CLI not found. Install with 'npm i -g vercel' if needed${NC}"
  echo -e "You will need to add the domain manually in the Vercel dashboard"
fi

# Create/update .env file with the new domain
echo -e "\n${YELLOW}Updating environment configuration...${NC}"

# Check if .env exists
if [ -f .env ]; then
  # Update APP_URL in .env if it exists
  if grep -q "NEXT_PUBLIC_APP_URL" .env; then
    sed -i '' "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://${DOMAIN}|g" .env
  else
    echo "NEXT_PUBLIC_APP_URL=https://${DOMAIN}" >> .env
  fi
  echo -e "${GREEN}✓ Updated NEXT_PUBLIC_APP_URL in .env${NC}"
else
  echo -e "${YELLOW}⚠ .env file not found. Creating a new one...${NC}"
  echo "NEXT_PUBLIC_APP_URL=https://${DOMAIN}" > .env
  echo -e "${GREEN}✓ Created .env with NEXT_PUBLIC_APP_URL${NC}"
  echo -e "${YELLOW}⚠ Please add your other environment variables to .env${NC}"
fi

# Create/update .vercel.json to ensure domain is configured
echo -e "\n${YELLOW}Updating Vercel configuration...${NC}"

# Create or update .vercel.json
cat > .vercel.json << EOL
{
  "crons": [],
  "github": {
    "silent": true
  },
  "rewrites": []
}
EOL

echo -e "${GREEN}✓ Updated .vercel.json${NC}"

# Create Supabase configuration instructions
echo -e "\n${BLUE}=== Supabase Configuration Instructions ====${NC}"
echo -e "${YELLOW}Please complete these steps in the Supabase dashboard:${NC}"
echo -e "1. Go to Authentication > URL Configuration"
echo -e "2. Set Site URL to: ${GREEN}https://${DOMAIN}${NC}"
echo -e "3. Add Redirect URLs:"
echo -e "   - ${GREEN}https://${DOMAIN}/auth/callback${NC}"
echo -e "   - ${GREEN}https://${DOMAIN}/api/auth/callback${NC}"
echo -e "\n4. Go to Authentication > Email Templates"
echo -e "5. Edit the 'Invitation' template"
echo -e "6. Update all links to use ${GREEN}https://${DOMAIN}${NC}"
echo -e "7. Save changes"

# Update instructions for DNS
echo -e "\n${BLUE}=== DNS Configuration ====${NC}"
echo -e "${YELLOW}Add these DNS records to your domain:${NC}"
echo -e "1. Add a CNAME record for ${GREEN}${DOMAIN}${NC}"
echo -e "   - Point to your Vercel deployment URL"
echo -e "2. If using Vercel, follow their instructions to verify the domain"

# Final instructions
echo -e "\n${BLUE}=== Final Steps ====${NC}"
echo -e "1. Deploy your application with updated environment variables"
echo -e "2. Test all authentication features on the new domain"
echo -e "3. Verify all invitation emails are working correctly"
echo -e "4. Check that Supabase authentication is properly configured"

echo -e "\n${GREEN}Domain configuration setup complete!${NC}"
echo -e "For more details, see ${YELLOW}docs/domain-configuration.md${NC}" 