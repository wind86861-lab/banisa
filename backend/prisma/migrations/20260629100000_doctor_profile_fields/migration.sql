-- Doctor profile expansion: patronymic, qualification grade, academic
-- credentials, and the two service-coverage arrays (illnesses + surgical
-- procedures). Phone/email columns kept on the model for the cross-clinic
-- attach-existing lookup; they're just removed from the public API and
-- from the new-doctor UI in the same change.

ALTER TABLE "Doctor"
    ADD COLUMN "middleName"          TEXT,
    ADD COLUMN "category"            TEXT,
    ADD COLUMN "academicDegree"      TEXT,
    ADD COLUMN "academicTitle"       TEXT,
    ADD COLUMN "treatedDiseases"     JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN "surgicalProcedures"  JSONB NOT NULL DEFAULT '[]'::jsonb;
