-- Collapse AppointmentStatus from 13 values to 7. The legacy enum mixed
-- payment state into the lifecycle (PAID), had three "waiting for clinic
-- accept" labels (PENDING / OPERATOR_CONFIRMED / SENT_TO_CLINIC), three
-- "clinic accepted, waiting for arrival" labels (CLINIC_ACCEPTED /
-- PENDING_ARRIVAL / PAID), and a RESCHEDULED status which is really an
-- action — the original appointment becomes CANCELLED and a new PENDING
-- one is created.
--
-- New canonical set: PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS,
-- COMPLETED, CANCELLED, NO_SHOW.
--
-- Mapping applied to existing rows:
--   PENDING              → PENDING
--   OPERATOR_CONFIRMED   → PENDING        (operator step removed)
--   SENT_TO_CLINIC       → PENDING        (still waiting for clinic accept)
--   CLINIC_ACCEPTED      → CONFIRMED
--   PENDING_ARRIVAL      → CONFIRMED      (cash flow — same semantics)
--   PAID                 → CONFIRMED      + paymentStatus stays PAID
--   CHECKED_IN           → CHECKED_IN
--   IN_PROGRESS          → IN_PROGRESS
--   COMPLETED            → COMPLETED
--   CANCELLED            → CANCELLED
--   RESCHEDULED          → CANCELLED      (a new PENDING row replaces it)
--   NO_SHOW              → NO_SHOW
--   CONFIRMED            → CONFIRMED      (unused in prod but maps cleanly)
--
-- Postgres can't drop enum values in place, so we create the new enum,
-- migrate the column with a USING clause, drop the old type, rename.

CREATE TYPE "AppointmentStatus_new" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CHECKED_IN',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
);

ALTER TABLE "Appointment"
    ALTER COLUMN "status" DROP DEFAULT,
    ALTER COLUMN "status" TYPE "AppointmentStatus_new"
    USING (
        CASE "status"::text
            WHEN 'PENDING'            THEN 'PENDING'
            WHEN 'OPERATOR_CONFIRMED' THEN 'PENDING'
            WHEN 'SENT_TO_CLINIC'     THEN 'PENDING'
            WHEN 'CLINIC_ACCEPTED'    THEN 'CONFIRMED'
            WHEN 'PENDING_ARRIVAL'    THEN 'CONFIRMED'
            WHEN 'PAID'               THEN 'CONFIRMED'
            WHEN 'CONFIRMED'          THEN 'CONFIRMED'
            WHEN 'CHECKED_IN'         THEN 'CHECKED_IN'
            WHEN 'IN_PROGRESS'        THEN 'IN_PROGRESS'
            WHEN 'COMPLETED'          THEN 'COMPLETED'
            WHEN 'CANCELLED'          THEN 'CANCELLED'
            WHEN 'RESCHEDULED'        THEN 'CANCELLED'
            WHEN 'NO_SHOW'            THEN 'NO_SHOW'
        END::"AppointmentStatus_new"
    ),
    ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "AppointmentStatus";
ALTER TYPE "AppointmentStatus_new" RENAME TO "AppointmentStatus";
