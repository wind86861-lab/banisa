-- Clinic admin can offer a discount on the checkup package they activated.
-- Calculated off the sum of item prices (= existing clinicPrice). The
-- patient sees:
--     Boshlanish narxi: <clinicPrice> so'm
--     Chegirma -<discountPercent>%
--     Yakuniy narx: <clinicPrice * (1 - discountPercent/100)>
ALTER TABLE "ClinicCheckupPackage"
    ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER NOT NULL DEFAULT 0;
