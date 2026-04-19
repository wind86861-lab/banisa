# ⚡ Quick Deployment Guide

## 🎯 One-Command Deployment

SSH into your server and run:

```bash
cd /var/www/banisa && bash deploy-to-server.sh
```

## 📋 Manual Steps (if script fails)

### 1. Pull Code
```bash
cd /var/www/banisa
git pull origin main
```

### 2. Install Dependencies
```bash
cd backend && npm install
cd ../code && npm install
```

### 3. Database Migration
```bash
cd /var/www/banisa/backend
npx prisma generate
npx prisma db push --accept-data-loss
```

### 4. Build
```bash
cd /var/www/banisa/backend && npm run build
cd /var/www/banisa/code && npm run build
```

### 5. Restart
```bash
pm2 restart banisa-backend
pm2 save
```

## ✅ Verification Checklist

After deployment, verify:

- [ ] `pm2 status` shows banisa-backend running
- [ ] `pm2 logs banisa-backend --lines 20` shows no errors
- [ ] Admin can access `/admin/appointments`
- [ ] Clinic can access `/clinic/scan`
- [ ] Patient can see appointment details with QR code

## 🧪 Quick Test

```bash
# Check backend health
curl http://localhost:5000/api/health

# Check database connection
cd /var/www/banisa/backend
npx prisma studio
# Open http://localhost:5555 and verify Appointment, AppointmentLog tables
```

## 🐛 Troubleshooting

### Build fails
```bash
# Clear cache and rebuild
cd /var/www/banisa/backend
rm -rf dist node_modules
npm install
npm run build
```

### Migration fails
```bash
# Check database connection
cd /var/www/banisa/backend
npx prisma db pull
npx prisma generate
npx prisma db push --accept-data-loss
```

### PM2 won't restart
```bash
pm2 delete banisa-backend
pm2 start ecosystem.config.js
pm2 save
```

## 📞 Support Commands

```bash
# View logs
pm2 logs banisa-backend --lines 100

# Monitor performance
pm2 monit

# Check error logs only
pm2 logs banisa-backend --err --lines 50

# Database GUI
cd /var/www/banisa/backend && npx prisma studio
```

## 🔄 Rollback (if needed)

```bash
cd /var/www/banisa
git log --oneline -5  # Find previous commit
git revert HEAD       # Or git reset --hard <commit-hash>
bash deploy-to-server.sh
```

---

**🎉 Deployment complete when all checkboxes above are ✅**
