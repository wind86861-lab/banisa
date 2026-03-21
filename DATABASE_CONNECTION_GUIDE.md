# 🗄️ Railway PostgreSQL Connection Guide

## 📋 Connection Details
- **Host:** `switchyard.proxy.rlwy.net`
- **Port:** `37540`
- **Database:** `railway` (default)
- **User:** `postgres` (default)
- **Password:** Check Railway dashboard

---

## 🔧 Method 1: Prisma Studio (Recommended)

### Update Your .env File
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@switchyard.proxy.rlwy.net:37540/railway?schema=public"
```

### Connect with Prisma Studio
```bash
cd /home/user/Desktop/code/banisa/backend
npx prisma studio
# Opens at http://localhost:5555
```

---

## 🔧 Method 2: psql Command Line

### Install psql (if not installed)
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install postgresql-client

# macOS
brew install postgresql

# Windows - download from postgresql.org
```

### Connect Directly
```bash
psql -h switchyard.proxy.rlwy.net -p 37540 -U postgres -d railway
# Enter password when prompted
```

### With Password in Command
```bash
PGPASSWORD=YOUR_PASSWORD psql -h switchyard.proxy.rlwy.net -p 37540 -U postgres -d railway
```

---

## 🔧 Method 3: GUI Tools

### DBeaver (Recommended GUI)
1. Download: https://dbeaver.io/download/
2. Create new connection → PostgreSQL
3. Use these settings:
   - Host: `switchyard.proxy.rlwy.net`
   - Port: `37540`
   - Database: `railway`
   - User: `postgres`
   - Password: `YOUR_PASSWORD`

### pgAdmin
1. Install pgAdmin 4
2. Add new server
3. Connection tab:
   - Host name: `switchyard.proxy.rlwy.net`
   - Port: `37540`
   - Username: `postgres`
   - Password: `YOUR_PASSWORD`

### TablePlus
1. Download: https://tableplus.com/
2. Create new PostgreSQL connection
3. Use the connection details above

---

## 🔧 Method 4: Node.js Application

### Update Backend .env
```bash
cd /home/user/Desktop/code/banisa/backend
cp .env.example .env
nano .env
```

### Add Database URL
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@switchyard.proxy.rlwy.net:37540/railway?schema=public"
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
JWT_REFRESH_SECRET="your-refresh-secret-different"
NODE_ENV="development"
PORT=5000
CORS_ORIGIN="http://localhost:5173"
```

### Test Connection
```bash
cd /home/user/Desktop/code/banisa/backend
npx prisma db push
# Should show: ✔ Database schema is in sync
```

---

## 🔧 Method 5: Python (for testing)

### Install psycopg2
```bash
pip install psycopg2-binary
```

### Test Connection Script
```python
import psycopg2

try:
    conn = psycopg2.connect(
        host="switchyard.proxy.rlwy.net",
        port="37540",
        database="railway",
        user="postgres",
        password="YOUR_PASSWORD"
    )
    print("✅ Connected successfully!")
    
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    print(f"PostgreSQL version: {cursor.fetchone()[0]}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Connection failed: {e}")
```

---

## 🔧 Method 6: Docker

### Run PostgreSQL Client in Docker
```bash
docker run -it --rm postgres:15-alpine psql \
  -h switchyard.proxy.rlwy.net \
  -p 37540 \
  -U postgres \
  -d railway
```

---

## 🔍 Finding Your Password

### In Railway Dashboard:
1. Go to your Railway project
2. Click on PostgreSQL service
3. Click "Connect" tab
4. Copy the full connection string
5. Extract password from: `postgresql://postgres:PASSWORD@host:port/db`

### Example Connection String:
```
postgresql://postgres:abc123def456@switchyard.proxy.rlwy.net:37540/railway
```
Password: `abc123def456`

---

## 🚀 Quick Setup Commands

### 1. Get Password from Railway
```bash
# Go to Railway dashboard → PostgreSQL service → Connect tab
# Copy the connection string
```

### 2. Update .env File
```bash
cd /home/user/Desktop/code/banisa/backend
nano .env
# Add: DATABASE_URL="postgresql://postgres:PASSWORD@switchyard.proxy.rlwy.net:37540/railway"
```

### 3. Test Connection
```bash
npx prisma db push
# Should succeed if connection works
```

### 4. Run Migrations
```bash
npx prisma migrate deploy
```

### 5. Seed Database
```bash
npx prisma db seed
```

---

## 🐛 Troubleshooting

### Connection Timeout
```bash
# Test basic connectivity
telnet switchyard.proxy.rlwy.net 37540
# Should show: Connected to switchyard.proxy.rlwy.net
```

### Authentication Failed
- Check password from Railway dashboard
- Ensure user is `postgres`
- Database name is usually `railway`

### SSL Issues
Add `sslmode=require` to connection string:
```env
DATABASE_URL="postgresql://postgres:PASSWORD@switchyard.proxy.rlwy.net:37540/railway?sslmode=require&schema=public"
```

### Connection Refused
- Check if Railway PostgreSQL service is running
- Verify port number (should be 37540)
- Check Railway service status

---

## 📱 Mobile Apps

### React Native
```javascript
import { Pool } from 'pg';

const pool = new Pool({
  host: 'switchyard.proxy.rlwy.net',
  port: 37540,
  database: 'railway',
  user: 'postgres',
  password: 'YOUR_PASSWORD',
  ssl: { rejectUnauthorized: false }
});
```

### Flutter
```dart
import 'package:postgres/postgres.dart';

final connection = PostgreSQLConnection(
  'switchyard.proxy.rlwy.net',
  37540,
  'railway',
  username: 'postgres',
  password: 'YOUR_PASSWORD',
  useSSL: true,
);
```

---

## 🔄 Connection String Formats

### Standard Format
```
postgresql://user:password@host:port/database
```

### With SSL
```
postgresql://user:password@host:port/database?sslmode=require
```

### With Schema
```
postgresql://user:password@host:port/database?schema=public
```

### Full Prisma Format
```
postgresql://postgres:PASSWORD@switchyard.proxy.rlwy.net:37540/railway?schema=public
```

---

## ✅ Verification Commands

### Test with Prisma
```bash
cd /home/user/Desktop/code/banisa/backend

# Check connection
npx prisma db pull

# Generate client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# View database
npx prisma studio
```

### Test with psql
```bash
# List tables
psql -h switchyard.proxy.rlwy.net -p 37540 -U postgres -d railway -c "\dt"

# List users
psql -h switchyard.proxy.rlwy.net -p 37540 -U postgres -d railway -c "\du"

# Test query
psql -h switchyard.proxy.rlwy.net -p 37540 -U postgres -d railway -c "SELECT current_database(), current_user;"
```

---

## 📞 Support

### Railway Documentation
- https://docs.railway.app/reference/postgresql

### Common Issues
1. **Wrong password** - Get from Railway dashboard
2. **Wrong port** - Should be 37540
3. **SSL required** - Add `sslmode=require`
4. **Firewall** - Ensure port 37540 is open

---

## ✅ Quick Start

1. **Get Password:** Railway dashboard → PostgreSQL → Connect
2. **Update .env:** Add DATABASE_URL with your password
3. **Test Connection:** `npx prisma db push`
4. **Run Migrations:** `npx prisma migrate deploy`
5. **View Data:** `npx prisma studio`

---

*Last Updated: March 12, 2026*  
*Host: switchyard.proxy.rlwy.net:37540*
