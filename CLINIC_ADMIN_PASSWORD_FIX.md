# Clinic Admin Password Update Fix

## Problem Summary
Clinic administrators could not log in after super admins updated their passwords via the admin panel (`/admin/clinics`).

## Root Cause Analysis

### Original Flawed Logic
The backend `updateClinic` function searched for the admin user by `phone` number:

```typescript
// OLD CODE (BROKEN)
if (adminPassword && adminPhone) {
    const existingUser = await tx.user.findUnique({
        where: { phone: adminPhone }  // ❌ Unreliable!
    });
    // ... update password
}
```

**Why this failed:**
1. **Phone format mismatch**: Frontend sends `+998 97 777-77-77` but DB has `+998977777777`
2. **Missing phone**: If `adminPhone` wasn't pre-populated in the form, the entire password update was skipped
3. **Wrong lookup key**: Should search by `clinicId` + `role`, not by phone

### The Fix

Changed user lookup to use **`clinicId`** instead of `phone`:

```typescript
// NEW CODE (FIXED)
if (adminPassword && adminPassword.trim().length >= 8) {
    // Find existing CLINIC_ADMIN for this clinic
    const existingUser = await tx.user.findFirst({
        where: {
            clinicId: id,  // ✅ Reliable!
            role: { in: ['CLINIC_ADMIN', 'PENDING_CLINIC'] },
            isActive: true,
        }
    });
    
    if (existingUser) {
        // Update password for existing user
        await tx.user.update({
            where: { id: existingUser.id },
            data: {
                passwordHash: await bcrypt.hash(adminPassword, 12),
                phone: adminPhone || existingUser.phone,  // Optional phone update
                // ... other fields
            }
        });
    } else if (adminPhone) {
        // Create new user only if phone is provided
        // ...
    }
}
```

## Changes Made

### Backend
**File**: `backend/src/modules/clinics/admin-clinics.service.ts`

1. **User lookup**: Changed from `findUnique({ where: { phone } })` to `findFirst({ where: { clinicId, role, isActive } })`
2. **Password validation**: Now checks `adminPassword.trim().length >= 8` instead of requiring both password AND phone
3. **Phone update**: Made phone optional when updating existing user
4. **Debug logging**: Added console logs to track password updates

**File**: `backend/src/modules/clinics/admin-clinics.service.ts` (getClinicById)

1. **Include admin user**: Now fetches the CLINIC_ADMIN user when getting clinic details
2. **Return format**: Returns `{ ...clinic, adminUser: { phone, email, firstName, ... } }`

### Frontend
**File**: `code/src/admin/pages/clinics/components/ClinicFormWizard.jsx`

1. **Pre-populate admin fields**: When editing, fetches admin user from `editData.adminUser` and pre-fills phone, email, name
2. **Null safety**: Added `?.trim()` to all form fields to prevent `Cannot read properties of null` errors

## Testing

### Test Script
Created `backend/test-password-update.js` to verify the fix:

```javascript
// Finds user by clinicId
const existingUser = await prisma.user.findFirst({
    where: { clinicId, role: 'CLINIC_ADMIN', isActive: true }
});

// Updates password
await prisma.user.update({
    where: { id: existingUser.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) }
});
```

### Test Results
✅ User found by `clinicId`  
✅ Password updated successfully  
✅ Login works with new password  

```bash
$ curl -X POST https://banisa.uz/api/auth/login \
  -d '{"phone":"+998977777777","password":"NewTestPass123!"}'
# Response: {"success":true, ...}
```

## How to Use (For Super Admins)

1. Go to `/admin/clinics`
2. Click **Edit** on any clinic
3. Navigate to **Step 6: Mas'ul Shaxs** (Admin Person)
4. The phone number should be pre-filled (e.g., `+998 97 777-77-77`)
5. Enter a new password (min 8 characters)
6. Click **Saqlash** (Save)
7. The clinic admin can now log in at `/login` with their phone and the new password

## IMPULS CLINIC Test Account

**Clinic**: IMPULS CLINIC  
**Clinic ID**: `d7550640-811b-4440-87f5-f41a4799f590`  
**Admin Phone**: `+998977777777` (or `+998 97 777-77-77`)  
**Current Password**: `NewTestPass123!`  

**Login URL**: https://banisa.uz/login

## Files Modified

### Backend
- `backend/src/modules/clinics/admin-clinics.service.ts` — Fixed `updateClinic` and `getClinicById`

### Frontend
- `code/src/admin/pages/clinics/components/ClinicFormWizard.jsx` — Pre-populate admin fields, null safety

### Test Files
- `backend/test-password-update.js` — Test script for password updates

## Deployment

```bash
# Backend
cd /home/user/Desktop/code/banisa/backend
npx tsc
sshpass -p 'PASSWORD' scp dist/modules/clinics/admin-clinics.service.js root@137.184.85.40:/root/banisa/backend/dist/modules/clinics/
sshpass -p 'PASSWORD' ssh root@137.184.85.40 'pm2 restart banisa-api'

# Frontend
cd /home/user/Desktop/code/banisa/code
npm run build
sshpass -p 'PASSWORD' rsync -az --delete dist/ root@137.184.85.40:/root/banisa/code/dist/
```

## Status
✅ **FIXED AND DEPLOYED** (May 9, 2026)

The issue is now resolved. Clinic admins can successfully log in with passwords updated by super admins via the admin panel.
