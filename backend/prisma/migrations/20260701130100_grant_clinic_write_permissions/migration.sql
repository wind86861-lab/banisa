-- Grant the four new write permissions to every clinic's CLINIC_ADMIN system
-- role (never DIRECTOR — that stays read-only). Strictly additive: we append
-- only the values that are missing, guarded so re-running is a no-op. No row
-- is deleted and no existing permission is removed.

UPDATE "ClinicRole"
SET permissions = permissions || ARRAY[
        'SERVICE_MANAGE',
        'DOCTOR_MANAGE',
        'AMBULANCE_MANAGE',
        'CLINIC_SETTINGS_EDIT'
    ]::"ClinicPermission"[],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'CLINIC_ADMIN'
  AND "isSystem" = true
  -- Idempotency guard: skip rows that already carry the new set.
  AND NOT (permissions @> ARRAY['SERVICE_MANAGE']::"ClinicPermission"[]);
