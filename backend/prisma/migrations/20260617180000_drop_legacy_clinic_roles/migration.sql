-- Drop the `*-LEGACY` ClinicRole rows that the 20260610190000 migration
-- left behind. They were renamed + flipped to isSystem=false so the UI
-- would stop offering them, on the theory that AppointmentLog /
-- ClinicAuditLog might still reference them. Both audit tables store
-- the role NAME as TEXT (no FK), so the rows are deletable now and the
-- audit history keeps resolving.
--
-- Verified before writing: every legacy row had 0 active and 0
-- inactive ClinicMembership entries — safe to delete outright.

DELETE FROM "ClinicRole"
WHERE "isSystem" = false
  AND "name" IN (
    'OWNER-LEGACY',
    'MANAGER-LEGACY',
    'RECEPTIONIST-LEGACY',
    'CASHIER-LEGACY',
    'DOCTOR-LEGACY',
    'ACCOUNTANT-LEGACY'
  );
