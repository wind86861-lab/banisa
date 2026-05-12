# Payment Methods Configuration — Clinic-Specific Online Payment

## Overview
Online payment (Payme) is now **clinic-specific**. Only clinics with `PAYME` in their `paymentMethods` field can accept online payments. Other clinics show only cash/bank transfer options.

---

## ✅ What Was Implemented

### 1. **Database Schema**
- `Clinic.paymentMethods` — JSON field storing array of payment methods
- Example: `["PAYME", "CASH", "BANK"]`

### 2. **Frontend Changes**

#### `CartCheckoutPage.jsx`
- **Fetches payment methods** for all clinics in cart on load
- **Filters payment options** based on clinic support:
  - `💵 Naqd` — always available
  - `🔵 Payme` — only if ALL clinics in cart support `PAYME`
  - `🟠 Click` — only if ALL clinics in cart support `CLICK`
- **Shows warning** if online payment not available:
  > "Onlayn to'lov hozircha faqat ba'zi klinikalarda mavjud. Naqd to'lov uchun klinikaga tashrif buyuring."

#### `PaymePage.jsx`
- **Checks clinic payment methods** before showing Payme checkout
- **Blocks payment** if clinic doesn't support `PAYME`
- Shows error: "Bu klinika onlayn to'lovni qo'llab-quvvatlamaydi"

### 3. **Admin Configuration**

#### Clinic Form (Step 8: Payment)
Admin can select payment methods when creating/editing clinics:
- `📱 Click`
- `💳 Payme`
- `💳 Uzcard`
- `💳 Humo`
- `💵 Naqd pul`
- `🏦 Bank o'tkazmasi`

---

## 🎯 Current Configuration

### Medilux Medical Center
- **ID**: `de802160-bc16-4e28-8c6c-3dbda1e7dcea`
- **Payment Methods**: `["PAYME", "CASH", "BANK"]`
- **Status**: ✅ Online payment ENABLED

### DiaLab Medical
- **ID**: `19354dbf-e979-48bc-870d-d1aa9000da8a`
- **Payment Methods**: `null` (defaults to cash only)
- **Status**: ❌ Online payment DISABLED

### Other Clinics
- Default: Cash only unless configured otherwise

---

## 📋 How It Works

### User Flow

1. **User adds services to cart** from multiple clinics
2. **Goes to checkout** (`/user/cart/checkout`)
3. **System checks** payment methods for each clinic
4. **Payment options displayed**:
   - If **all clinics** support Payme → Payme button shown
   - If **any clinic** doesn't support Payme → Payme hidden, warning shown
5. **User selects payment method**:
   - **Naqd** → Appointment created, user goes to clinic
   - **Payme** → Redirects to Payme checkout page
6. **Payme page** double-checks clinic support before showing payment form

### Admin Flow

1. **Admin creates/edits clinic** in admin panel
2. **Step 8: Payment** — selects payment methods
3. **Saves clinic** with payment configuration
4. **Frontend automatically** shows/hides payment options based on this

---

## 🛠️ Scripts

### Set Payment Methods for a Clinic
```bash
cd /root/banisa/backend
node prisma/set-meilux-payment-methods.js
```

This script:
- Finds "Medilux Medical Center"
- Sets `paymentMethods = ["PAYME", "CASH", "BANK"]`
- Enables online payment for that clinic

### Activate All Diagnostic Services
```bash
cd /root/banisa/backend
node prisma/activate-dialab-diagnostics.js
```

This script (already run):
- Activated **353 diagnostic services** for DiaLab Medical
- Set prices to `priceMin` for each service
- Created `ClinicDiagnosticService` + `ServiceCustomization` records

---

## 🔐 Security

### Payment Method Validation
- **Frontend**: Checks clinic payment methods before showing options
- **Backend**: Payme service validates transactions
- **Database**: Payment methods stored as JSON array

### Payme Integration
- **Merchant ID**: `6899d73ecab302211ad27f12`
- **Test URL**: `https://test.paycom.uz`
- **Prod URL**: `https://checkout.paycom.uz`
- **Backend**: `/api/payme` endpoint with Basic Auth

---

## 📊 Database Queries

### Check Clinic Payment Methods
```sql
SELECT id, "nameUz", "paymentMethods", status 
FROM "Clinic" 
WHERE "nameUz" ILIKE '%medilux%';
```

### Update Payment Methods
```sql
UPDATE "Clinic" 
SET "paymentMethods" = '["PAYME", "CASH", "BANK"]'::jsonb
WHERE id = 'de802160-bc16-4e28-8c6c-3dbda1e7dcea';
```

### Find Clinics with Payme
```sql
SELECT id, "nameUz", "paymentMethods"
FROM "Clinic"
WHERE "paymentMethods" @> '["PAYME"]'::jsonb;
```

---

## 🚀 Deployment

### Frontend
```bash
cd /home/user/Desktop/code/banisa/code
npm run build
rsync -az --delete dist/ root@137.184.85.40:/root/banisa/code/dist/
```

### Backend
```bash
cd /home/user/Desktop/code/banisa/backend
npx tsc
scp dist/modules/... root@137.184.85.40:/root/banisa/backend/dist/modules/...
ssh root@137.184.85.40 'pm2 restart banisa-api'
```

---

## 📝 Notes

1. **Multi-clinic carts**: If user adds services from multiple clinics, ALL must support Payme for online payment to be available
2. **Default behavior**: Clinics without `paymentMethods` configured default to cash only
3. **Admin control**: Super admins can enable/disable payment methods per clinic in admin panel
4. **Extensible**: Easy to add new payment methods (Click, Uzcard, etc.) by:
   - Adding to `PAYMENT_METHODS` constant in `ClinicFormWizard.jsx`
   - Updating frontend payment option logic
   - Implementing payment gateway integration

---

## 🎉 Result

✅ **Medilux Medical Center** now accepts online payment via Payme  
✅ **Other clinics** show cash/bank options only  
✅ **Users see clear messaging** about payment availability  
✅ **Admins can configure** payment methods per clinic  
✅ **System prevents** payment attempts for unsupported clinics  

---

**Last Updated**: 2026-05-08  
**Status**: ✅ DEPLOYED & TESTED
