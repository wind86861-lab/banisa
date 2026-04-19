#!/bin/bash

# 🚀 Appointment Workflow Deployment Script
# Run this script on your production server

set -e  # Exit on any error

echo "🚀 Starting deployment of Appointment Workflow System..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/banisa"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/code"

echo -e "${YELLOW}📍 Project directory: $PROJECT_DIR${NC}"

# Step 1: Pull latest code
echo -e "\n${GREEN}Step 1: Pulling latest code from Git...${NC}"
cd $PROJECT_DIR
git pull origin main

# Step 2: Install backend dependencies
echo -e "\n${GREEN}Step 2: Installing backend dependencies...${NC}"
cd $BACKEND_DIR
npm install

# Step 3: Install frontend dependencies
echo -e "\n${GREEN}Step 3: Installing frontend dependencies...${NC}"
cd $FRONTEND_DIR
npm install

# Step 4: Run database migration
echo -e "\n${GREEN}Step 4: Running database migration...${NC}"
cd $BACKEND_DIR
npx prisma generate
npx prisma db push --accept-data-loss

echo -e "${YELLOW}⚠️  Migration complete. Check for any warnings above.${NC}"

# Step 5: Build backend
echo -e "\n${GREEN}Step 5: Building backend...${NC}"
cd $BACKEND_DIR
npm run build

# Step 6: Build frontend
echo -e "\n${GREEN}Step 6: Building frontend...${NC}"
cd $FRONTEND_DIR
npm run build

# Step 7: Restart PM2
echo -e "\n${GREEN}Step 7: Restarting PM2 services...${NC}"
pm2 restart banisa-backend
pm2 save

# Step 8: Verify deployment
echo -e "\n${GREEN}Step 8: Verifying deployment...${NC}"
sleep 3
pm2 status

echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "\n${YELLOW}📋 Next steps:${NC}"
echo "1. Check logs: pm2 logs banisa-backend --lines 50"
echo "2. Test admin appointments page: https://your-domain.com/admin/appointments"
echo "3. Test clinic QR scanner: https://your-domain.com/clinic/scan"
echo "4. Create a test booking and verify QR code generation"
echo ""
echo -e "${GREEN}🎉 Your appointment workflow system is now live!${NC}"
