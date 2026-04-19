#!/bin/bash
# Server Status Check Script
# Run this on your server to check current state

echo "🔍 Checking server status..."
echo "=============================="

# Check if project directory exists
if [ -d "/var/www/banisa" ]; then
    echo "✅ Project directory exists: /var/www/banisa"
    cd /var/www/banisa
    
    # Check git status
    echo -e "\n📋 Git Status:"
    git log --oneline -3
    
    # Check PM2 status
    echo -e "\n🚀 PM2 Status:"
    pm2 status
    
    # Check backend
    echo -e "\n🔧 Backend:"
    if [ -d "backend/dist" ]; then
        echo "  ✅ Build exists"
    else
        echo "  ❌ No build found (need to run npm run build)"
    fi
    
    # Check frontend
    echo -e "\n🎨 Frontend:"
    if [ -d "code/dist" ]; then
        echo "  ✅ Build exists"
    else
        echo "  ❌ No build found (need to run npm run build)"
    fi
    
    # Check database
    echo -e "\n🗄️  Database Connection:"
    cd backend && npx prisma db pull --force 2>&1 | head -5
    
    # Check disk space
    echo -e "\n💾 Disk Space:"
    df -h /var/www | tail -1
    
    # Check memory
    echo -e "\n🧠 Memory:"
    free -h | grep Mem
    
else
    echo "❌ Project directory NOT found at /var/www/banisa"
    echo "   You may need to clone the repository first:"
    echo "   git clone https://github.com/wind86861-lab/banisa.git /var/www/banisa"
fi

echo -e "\n=============================="
echo "🎯 Ready for deployment: Run 'bash deploy-to-server.sh' in /var/www/banisa"
