# Database Migration Required

## Changes Made to Prisma Schema

1. **User Model Updates:**
   - Added `phone` field (String, unique) - primary login identifier
   - Changed `email` to optional (String?)
   - Renamed `password` to `passwordHash`
   - Added `status` field (UserStatus enum)
   - Added `clinicId` field (String?, unique)
   - Added new Role: `PENDING_CLINIC`
   - Added UserStatus enum: PENDING, IN_REVIEW, APPROVED, REJECTED, SUSPENDED

2. **ClinicRegistrationRequest Updates:**
   - Made `adminEmail` optional (String?)
   - Updated index from `adminEmail` to `adminPhone`

## Required Steps

```bash
# 1. Generate Prisma client with new schema
npx prisma generate

# 2. Create migration
npx prisma migrate dev --name phone_based_login_with_status

# 3. Apply migration
npx prisma migrate deploy
```

## Breaking Changes

- Login now uses `phone` instead of `email`
- User model field `password` renamed to `passwordHash`
- New required fields: `phone`, `status`
- Email is now optional for users

## Data Migration Script (if needed)

If you have existing users, you'll need to:
1. Add phone numbers to existing users
2. Set default status (APPROVED for existing users)
3. Migrate password field to passwordHash
