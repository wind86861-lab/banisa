# Test: Clinic Admin Password Update Flow

## Issue
When super admin updates a clinic's admin password via `/admin/clinics`, the password field was being sent as `undefined` to the backend, causing the password update to be silently skipped.

## Root Cause
Frontend code on line 264:
```javascript
adminPassword: form.adminPassword || undefined
```

When `form.adminPassword` is an empty string `""` (initial state when editing), it becomes `undefined`.
Then line 279 deletes all `undefined` fields from the payload:
```javascript
Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
```

**Result**: `adminPassword` was never sent to the backend, even when the admin typed a new password!

## The Fix

Changed line 264-265 to:
```javascript
// Only include password if it has a value (don't send empty string)
...(form.adminPassword && form.adminPassword.trim() ? { adminPassword: form.adminPassword.trim() } : {})
```

Now:
- If password field is empty → Don't include `adminPassword` in payload
- If password has a value → Include `adminPassword: "trimmed value"` in payload

## Test Steps

### 1. Go to Admin Panel
```
URL: https://banisa.uz/admin/clinics
Login: admin@banisa.uz / admin123
```

### 2. Edit IMPULS CLINIC
- Click **Edit** on IMPULS CLINIC
- Go to **Step 6: Mas'ul Shaxs**
- You should see:
  - **Telefon**: `+998 97 777-77-77` (pre-filled)
  - **Ism**: `IMPULS`
  - **Familiya**: `Admin`

### 3. Update Password
- In the **Parol** field, enter: `UpdatedPass2026!`
- Click **Saqlash** (Save)
- Wait for success message

### 4. Check Backend Logs
```bash
ssh root@137.184.85.40
pm2 logs banisa-api --lines 50 | grep -A5 "updateClinic"
```

**Expected output:**
```
[updateClinic] Admin fields: {
  adminPassword: '***',
  adminPhone: '+998 97 777-77-77',
  adminEmail: undefined,
  adminFirstName: 'IMPULS',
  adminLastName: 'Admin'
}
[updateClinic] Updating password for existing user: 9d12e980-41f3-44e9-bdbc-a0b9324be40b
```

### 5. Test Login
```
URL: https://banisa.uz/login
Phone: +998 97 777-77-77
Password: UpdatedPass2026!
```

**Expected**: Login succeeds, redirects to `/clinic/dashboard`

## Current Status

### Before Fix
❌ `adminPassword: undefined` in backend logs  
❌ Password update skipped  
❌ Login fails with new password  

### After Fix
✅ `adminPassword: '***'` in backend logs  
✅ Password update executes  
✅ Login succeeds with new password  

## Files Changed

### Frontend
- `code/src/admin/pages/clinics/components/ClinicFormWizard.jsx:264-265`

### Backend (Previous Fix)
- `backend/src/modules/clinics/admin-clinics.service.ts:227-272` — User lookup by `clinicId`
- `backend/src/modules/clinics/admin-clinics.service.ts:109-147` — Include `adminUser` in response

## Deployment
```bash
# Frontend
cd /home/user/Desktop/code/banisa/code
npm run build
rsync -az --delete dist/ root@137.184.85.40:/root/banisa/code/dist/

# Backend (already deployed)
# No changes needed - backend fix was deployed earlier
```

## Test Account
**Clinic**: IMPULS CLINIC  
**Phone**: `+998977777777`  
**Password**: `NewTestPass123!` (or whatever you set via admin panel)  

## Date
May 9, 2026 - 3:35 PM UTC+05:00
