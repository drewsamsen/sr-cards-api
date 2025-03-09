#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the API URL from command line argument or use default
API_URL=${1:-"https://sr-cards-5yzcf8lxb-drewsamsen-gmailcoms-projects.vercel.app"}

echo -e "${BLUE}Testing Vercel deployment at: ${API_URL}${NC}"

# Test health endpoint
echo -e "\n${BLUE}Testing health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s "${API_URL}/api/health")

if [[ $HEALTH_RESPONSE == *"status"*"ok"* ]]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
  echo -e "${GREEN}Response: ${HEALTH_RESPONSE}${NC}"
  echo -e "\n${GREEN}✓ Vercel deployment is up and running!${NC}"
  exit 0
else
  echo -e "${RED}✗ Health check failed${NC}"
  echo -e "${RED}Response: ${HEALTH_RESPONSE}${NC}"
  
  # Try the root API endpoint as fallback
  echo -e "\n${BLUE}Trying root API endpoint...${NC}"
  ROOT_RESPONSE=$(curl -s "${API_URL}/api")
  
  if [[ $ROOT_RESPONSE == *"Card API is running"* ]]; then
    echo -e "${GREEN}✓ Root API check passed${NC}"
    echo -e "${GREEN}Response: ${ROOT_RESPONSE}${NC}"
    echo -e "\n${GREEN}✓ Vercel deployment is up and running!${NC}"
    exit 0
  else
    echo -e "${RED}✗ Root API check failed${NC}"
    echo -e "${RED}Response: ${ROOT_RESPONSE}${NC}"
    echo -e "\n${RED}✗ Vercel deployment may be down or misconfigured${NC}"
    exit 1
  fi
fi 