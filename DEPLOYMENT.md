# 🚀 Deployment Guide — Appointment Workflow System

## Prerequisites
- Node.js 18.19.1
- PostgreSQL database running
- PM2 installed globally: `npm install -g pm2`
- Nginx configured as reverse proxy

## 🔧 Step 1: Database Migration

```bash
cd /home/user/Desktop/code/banisa/backend

# Run Prisma migration (will create new tables + enums)
npx prisma db push --accept-data-loss

# Or if you want a proper migration:
npx prisma migrate dev --name appointment_workflow_qr_discount

# Verify schema
npx prisma generate
```

**New tables created:**
- `Appointment` (updated with new fields)
- `AppointmentLog` (audit trail)

**New enums:**
- `AppointmentStatus` (12 states)
- `PaymentStatus` (UNPAID, PAID, REFUNDED)
- `PaymentMethod` (CASH, CARD, PAYME, CLICK)

## 📦 Step 2: Install Dependencies

```bash
# Backend
cd /home/user/Desktop/code/banisa/backend
npm install qrcode @types/qrcode

# Frontend (workspace root already has html5-qrcode)
cd /home/user/Desktop/code/banisa
npm install
```

## 🏗️ Step 3: Build

```bash
# Build backend
cd /home/user/Desktop/code/banisa/backend
npm run build

# Build frontend
cd /home/user/Desktop/code/banisa/code
npm run build
```

## 🚀 Step 4: Deploy to Server

### Option A: Manual Deployment (if you have SSH access)

```bash
# 1. Sync code to server (from your local machine)
rsync -avz --exclude 'node_modules' --exclude '.git' \
  /home/user/Desktop/code/banisa/ \
  user@your-server:/var/www/banisa/

# 2. SSH into server
ssh user@your-server

# 3. Install dependencies on server
cd /var/www/banisa/backend
npm install --production

cd /var/www/banisa/code
npm install --production

# 4. Run migrations on server
cd /var/www/banisa/backend
npx prisma db push --accept-data-loss

# 5. Build on server
cd /var/www/banisa/backend
npm run build

cd /var/www/banisa/code
npm run build

# 6. Restart PM2
pm2 restart banisa-backend
pm2 save
```

### Option B: Git-based Deployment (recommended)

```bash
# 1. Commit and push changes
cd /home/user/Desktop/code/banisa
git add .
git commit -m "feat: implement appointment workflow with QR codes and discount system"
git push origin main

# 2. SSH into server
ssh user@your-server

# 3. Pull latest code
cd /var/www/banisa
git pull origin main

# 4. Install dependencies
npm run install:all

# 5. Run migrations
cd backend
npx prisma db push --accept-data-loss

# 6. Build
cd ..
npm run build

# 7. Restart services
pm2 restart banisa-backend
pm2 save
```

## 🔍 Step 5: Verify Deployment

```bash
# Check backend is running
pm2 status
pm2 logs banisa-backend --lines 50

# Test API endpoints
curl http://localhost:5000/api/admin/appointments/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Check database
cd /var/www/banisa/backend
npx prisma studio
# Open http://localhost:5555 and verify Appointment, AppointmentLog tables exist
```

## 🧪 Step 6: Test Workflow

### 1. Patient Creates Booking
```bash
curl -X POST http://your-domain.com/api/user/appointments \
  -H "Authorization: Bearer PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clinicId": "clinic-uuid",
    "serviceType": "DIAGNOSTIC",
    "diagnosticServiceId": "service-uuid",
    "scheduledAt": "2026-04-20T10:00:00Z",
    "price": 150000
  }'
```

### 2. Admin Confirms (Operator)
- Login to `/admin/login`
- Navigate to `/admin/appointments`
- Click "Telefon qilish" on PENDING booking
- Set discount, add call note
- Click "Tasdiqlash va Klinikaga yuborish"

### 3. Clinic Accepts
- Login to `/login` (clinic admin)
- Navigate to `/clinic/bookings`
- Filter: "Yangi" tab
- Click "Qabul qilish"

### 4. Patient Pays & Gets QR
- Patient visits `/user/appointments/:id`
- Clicks "To'lash" → redirects to Payme
- After payment, QR code appears on detail page

### 5. Clinic Scans QR
- Navigate to `/clinic/scan`
- Click "Kamerani yoqish"
- Scan patient's QR code
- System shows discount applied + checks in patient

### 6. Complete Service
- Go back to `/clinic/bookings`
- Click "Boshlash" → "Tugatish"

## 🔐 Security Checklist

- [ ] Database credentials secured in `.env`
- [ ] JWT secrets are strong (min 32 chars)
- [ ] CORS_ORIGIN set to production domain
- [ ] Rate limiting enabled (already in code)
- [ ] HTTPS enabled via Nginx
- [ ] Firewall allows only 80/443
- [ ] PM2 running as non-root user
- [ ] Database backups scheduled

## 📊 Monitoring

```bash
# Watch logs in real-time
pm2 logs banisa-backend --lines 100

# Monitor performance
pm2 monit

# Check error logs
pm2 logs banisa-backend --err --lines 50
```

## 🐛 Troubleshooting

### Migration fails with "duplicate key"
```bash
# Check existing data
cd backend
npx prisma studio
# Manually fix duplicate bookingNumber or qrToken values
# Then re-run: npx prisma db push
```

### QR code not showing
- Check browser console for 403 errors
- Verify `paymentStatus === 'PAID'` in database
- Check `/api/user/appointments/:id/qr.png` endpoint returns 200

### Clinic can't scan QR
- Verify camera permissions in browser
- Test with manual token input
- Check `qrToken` exists in database and matches

### Discount not applied
- Check `Clinic.defaultDiscountPercent` is set
- Verify operator confirmed booking (not just patient created)
- Check `Appointment.discountPercent` and `discountAmount` columns

## 🔄 Rollback Plan

If issues arise:

```bash
# 1. Revert code
cd /var/www/banisa
git revert HEAD
npm run build
pm2 restart banisa-backend

# 2. Revert database (if needed)
cd backend
npx prisma migrate resolve --rolled-back appointment_workflow_qr_discount
# Or restore from backup
```

## 📞 Support

- Check logs: `pm2 logs banisa-backend`
- Database issues: `npx prisma studio`
- API testing: Use Postman or curl with proper auth tokens

---

**Deployment completed successfully when:**
✅ All 3 roles can login (Patient, Admin, Clinic)  
✅ Admin sees `/admin/appointments` page  
✅ Patient can create booking and see QR after payment  
✅ Clinic can scan QR and check in patient  
✅ No errors in `pm2 logs`
