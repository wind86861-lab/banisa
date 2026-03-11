# Railway Deployment Guide - Banisa Platform

## 🚀 Quick Deploy Steps

### 1. **Commit All Changes**

```bash
# Add all files including migrations
git add .

# Commit with descriptive message
git commit -m "feat: Add service customization system and fix deployment config

- Add migrations for ServiceCustomization and ServiceImage models
- Fix nixpacks.toml to use npm install instead of npm ci
- Remove migrations from .gitignore for deployment
- Update Railway configuration"

# Push to repository
git push origin main
```

### 2. **Railway Environment Variables**

Set these in your Railway project dashboard:

#### Required Variables:
```env
# Database (Railway will auto-provide DATABASE_URL)
DATABASE_URL=postgresql://...

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars

# Node Environment
NODE_ENV=production

# Port (Railway auto-provides)
PORT=5000

# CORS Origin (your frontend URL)
CORS_ORIGIN=https://your-frontend-domain.com

# SMS/OTP (if using Eskiz.uz or similar)
SMS_API_KEY=your-sms-api-key
SMS_API_URL=https://notify.eskiz.uz/api

# File Upload
UPLOAD_MAX_FILE_SIZE=5242880
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp,application/pdf

# Admin Defaults
DEFAULT_ADMIN_PHONE=+998901234567
DEFAULT_ADMIN_PASSWORD=change-this-in-production
```

### 3. **Railway Project Configuration**

Your project already has:
- ✅ `nixpacks.toml` - Build configuration
- ✅ `railway.json` - Deployment settings
- ✅ Migrations committed to git

#### Build Process (Automatic):
1. **Setup**: Install Node.js 18.x and OpenSSL
2. **Install**: `cd backend && npm install`
3. **Build**: 
   - `cd backend && npx prisma generate`
   - `cd backend && npm run build`
4. **Start**: 
   - `cd backend && npx prisma migrate deploy`
   - `cd backend && npm start`

### 4. **Database Setup**

Railway will automatically:
1. Create a PostgreSQL database
2. Provide `DATABASE_URL` environment variable
3. Run `prisma migrate deploy` on startup

**Manual verification** (if needed):
```bash
# Connect to Railway shell
railway shell

# Check migrations
npx prisma migrate status

# View database
npx prisma studio
```

### 5. **Deployment Checklist**

- [ ] All migrations committed to git
- [ ] `package-lock.json` committed
- [ ] Environment variables set in Railway dashboard
- [ ] `DATABASE_URL` configured
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` set
- [ ] `CORS_ORIGIN` points to frontend domain
- [ ] Build logs show successful Prisma generation
- [ ] Migrations deployed successfully
- [ ] Server starts on correct port

---

## 🔧 Configuration Files

### `nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "openssl"]

[phases.install]
cmds = ["cd backend && npm install"]

[phases.build]
cmds = ["cd backend && npx prisma generate", "cd backend && npm run build"]

[start]
cmd = "cd backend && npx prisma migrate deploy && npm start"
```

### `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd backend && npm install && npx prisma generate && npm run build"
  },
  "deploy": {
    "startCommand": "cd backend && npx prisma migrate deploy && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 🐛 Troubleshooting

### Issue: `npm ci` fails with "no package-lock.json"

**Solution**: Changed to `npm install` in `nixpacks.toml`

### Issue: Migrations not found

**Solution**: Removed `backend/prisma/migrations/` from `.gitignore` and committed migrations

### Issue: Prisma client not generated

**Solution**: Build phase includes `npx prisma generate` before `npm run build`

### Issue: Database connection fails

**Check**:
1. `DATABASE_URL` is set in Railway environment variables
2. Format: `postgresql://user:password@host:port/database?schema=public`
3. Railway auto-provides this when you add PostgreSQL service

### Issue: Port binding error

**Solution**: Railway auto-provides `PORT` env variable. Backend uses `process.env.PORT || 5000`

### Issue: CORS errors from frontend

**Solution**: Set `CORS_ORIGIN` to your frontend domain (e.g., `https://banisa.vercel.app`)

---

## 📊 Deployment Verification

### 1. Check Build Logs
```
✓ Nixpacks setup complete
✓ npm install successful
✓ Prisma client generated
✓ TypeScript compiled
✓ Build artifacts created
```

### 2. Check Deployment Logs
```
✓ Migrations deployed
✓ Server started on port 5000
✓ Database connected
✓ Routes registered
```

### 3. Test Endpoints

```bash
# Health check
curl https://your-app.railway.app/health

# API test
curl https://your-app.railway.app/api/auth/check
```

---

## 🔐 Security Checklist

- [ ] Change `DEFAULT_ADMIN_PASSWORD` from default
- [ ] Use strong `JWT_SECRET` (min 32 characters)
- [ ] Use strong `JWT_REFRESH_SECRET` (different from JWT_SECRET)
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper `CORS_ORIGIN` (not wildcard `*`)
- [ ] Review and limit file upload sizes
- [ ] Enable rate limiting in production
- [ ] Use HTTPS only (Railway provides this automatically)

---

## 📝 Post-Deployment Tasks

1. **Create Super Admin**:
   ```bash
   # Connect to Railway shell
   railway shell
   
   # Run seed script
   cd backend && npx prisma db seed
   ```

2. **Verify Database**:
   - Check all tables created
   - Verify migrations applied
   - Test admin login

3. **Frontend Deployment**:
   - Update API base URL to Railway backend URL
   - Deploy frontend to Vercel/Netlify
   - Update `CORS_ORIGIN` in Railway with frontend URL

4. **Monitor**:
   - Check Railway logs for errors
   - Monitor database connections
   - Set up error tracking (Sentry, etc.)

---

## 🚨 Common Errors & Fixes

### Error: "Cannot find module '@prisma/client'"
**Fix**: Ensure `npx prisma generate` runs in build phase

### Error: "Migration failed"
**Fix**: Check `DATABASE_URL` format and database accessibility

### Error: "Port already in use"
**Fix**: Railway manages ports automatically, ensure code uses `process.env.PORT`

### Error: "CORS policy blocked"
**Fix**: Set correct `CORS_ORIGIN` environment variable

---

## 📞 Support

- Railway Docs: https://docs.railway.app
- Prisma Docs: https://www.prisma.io/docs
- Project Issues: Check Railway deployment logs

---

## ✅ Success Indicators

Your deployment is successful when:
- ✅ Build completes without errors
- ✅ All migrations applied
- ✅ Server responds to health checks
- ✅ Database queries work
- ✅ Authentication endpoints functional
- ✅ File uploads work (if configured)
- ✅ Frontend can connect to backend

**Current Status**: Ready to deploy after committing migrations and updated config files.
