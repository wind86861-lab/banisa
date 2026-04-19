--
-- PostgreSQL database dump
--

\restrict SvfpSfiCOPrB6miShB9q30uPbyU5J4hPOVN6dEiaEmPQkhHgoSSIctH0HY7FPng

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AnesthesiaType; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."AnesthesiaType" AS ENUM (
    'LOCAL',
    'GENERAL',
    'SPINAL',
    'SEDATION'
);


ALTER TYPE public."AnesthesiaType" OWNER TO banisa;

--
-- Name: AppointmentServiceType; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."AppointmentServiceType" AS ENUM (
    'DIAGNOSTIC',
    'SURGICAL',
    'OTHER'
);


ALTER TYPE public."AppointmentServiceType" OWNER TO banisa;

--
-- Name: AppointmentStatus; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."AppointmentStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED'
);


ALTER TYPE public."AppointmentStatus" OWNER TO banisa;

--
-- Name: CheckupCategory; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."CheckupCategory" AS ENUM (
    'BASIC',
    'SPECIALIZED',
    'AGE_BASED'
);


ALTER TYPE public."CheckupCategory" OWNER TO banisa;

--
-- Name: ClinicSource; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."ClinicSource" AS ENUM (
    'ADMIN_CREATED',
    'SELF_REGISTERED'
);


ALTER TYPE public."ClinicSource" OWNER TO banisa;

--
-- Name: ClinicStatus; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."ClinicStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'BLOCKED',
    'IN_REVIEW',
    'SUSPENDED',
    'DELETED'
);


ALTER TYPE public."ClinicStatus" OWNER TO banisa;

--
-- Name: ClinicType; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."ClinicType" AS ENUM (
    'GENERAL',
    'SPECIALIZED',
    'DIAGNOSTIC',
    'DENTAL',
    'MATERNITY',
    'REHABILITATION',
    'PHARMACY',
    'OTHER'
);


ALTER TYPE public."ClinicType" OWNER TO banisa;

--
-- Name: Complexity; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."Complexity" AS ENUM (
    'SIMPLE',
    'MEDIUM',
    'COMPLEX',
    'ADVANCED'
);


ALTER TYPE public."Complexity" OWNER TO banisa;

--
-- Name: RegistrationStatus; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."RegistrationStatus" AS ENUM (
    'PENDING',
    'IN_REVIEW',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."RegistrationStatus" OWNER TO banisa;

--
-- Name: ReviewStatus; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."ReviewStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."ReviewStatus" OWNER TO banisa;

--
-- Name: RiskLevel; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."RiskLevel" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE public."RiskLevel" OWNER TO banisa;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."Role" AS ENUM (
    'SUPER_ADMIN',
    'CLINIC_ADMIN',
    'PATIENT',
    'PENDING_CLINIC'
);


ALTER TYPE public."Role" OWNER TO banisa;

--
-- Name: RoomType; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."RoomType" AS ENUM (
    'STANDARD',
    'COMFORT',
    'LUX',
    'VIP'
);


ALTER TYPE public."RoomType" OWNER TO banisa;

--
-- Name: SanatoriumServiceType; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."SanatoriumServiceType" AS ENUM (
    'ACCOMMODATION',
    'MEDICAL',
    'NUTRITION',
    'PROGRAM'
);


ALTER TYPE public."SanatoriumServiceType" OWNER TO banisa;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: banisa
--

CREATE TYPE public."UserStatus" AS ENUM (
    'PENDING',
    'IN_REVIEW',
    'APPROVED',
    'REJECTED',
    'SUSPENDED'
);


ALTER TYPE public."UserStatus" OWNER TO banisa;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Appointment; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."Appointment" (
    id text NOT NULL,
    "clinicId" text NOT NULL,
    "patientId" text NOT NULL,
    "doctorId" text,
    "serviceType" public."AppointmentServiceType" DEFAULT 'OTHER'::public."AppointmentServiceType" NOT NULL,
    "diagnosticServiceId" text,
    "surgicalServiceId" text,
    "scheduledAt" timestamp(3) without time zone NOT NULL,
    status public."AppointmentStatus" DEFAULT 'PENDING'::public."AppointmentStatus" NOT NULL,
    price integer DEFAULT 0 NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Appointment" OWNER TO banisa;

--
-- Name: CheckupPackage; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."CheckupPackage" (
    id text NOT NULL,
    "nameUz" text NOT NULL,
    "nameRu" text,
    "nameEn" text,
    slug text NOT NULL,
    category public."CheckupCategory" NOT NULL,
    "shortDescription" character varying(200),
    "fullDescription" text,
    "targetAudience" character varying(100),
    "recommendedPrice" integer NOT NULL,
    "priceMin" integer NOT NULL,
    "priceMax" integer NOT NULL,
    discount integer,
    "imageUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CheckupPackage" OWNER TO banisa;

--
-- Name: CheckupPackageItem; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."CheckupPackageItem" (
    id text NOT NULL,
    "packageId" text NOT NULL,
    "diagnosticServiceId" text NOT NULL,
    "serviceName" text NOT NULL,
    "servicePrice" integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "isRequired" boolean DEFAULT true NOT NULL,
    notes character varying(255),
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."CheckupPackageItem" OWNER TO banisa;

--
-- Name: Clinic; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."Clinic" (
    id text NOT NULL,
    "nameUz" text NOT NULL,
    "nameRu" text,
    "nameEn" text,
    type public."ClinicType" DEFAULT 'GENERAL'::public."ClinicType" NOT NULL,
    status public."ClinicStatus" DEFAULT 'PENDING'::public."ClinicStatus" NOT NULL,
    description text,
    logo text,
    "coverImage" text,
    region text NOT NULL,
    district text NOT NULL,
    street text NOT NULL,
    apartment text,
    landmark text,
    latitude double precision,
    longitude double precision,
    phones jsonb DEFAULT '[]'::jsonb NOT NULL,
    emails jsonb DEFAULT '[]'::jsonb NOT NULL,
    website text,
    "socialMedia" jsonb,
    "workingHours" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "hasEmergency" boolean DEFAULT false NOT NULL,
    "hasAmbulance" boolean DEFAULT false NOT NULL,
    "hasOnlineBooking" boolean DEFAULT true NOT NULL,
    "bedsCount" integer,
    "floorsCount" integer,
    "parkingAvailable" boolean DEFAULT false NOT NULL,
    amenities jsonb,
    "paymentMethods" jsonb,
    "insuranceAccepted" jsonb,
    "priceRange" text,
    "averageRating" double precision DEFAULT 0,
    "reviewCount" integer DEFAULT 0 NOT NULL,
    "registrationNumber" text,
    "taxId" text,
    "licenseNumber" text,
    "licenseIssuedAt" timestamp(3) without time zone,
    "licenseExpiresAt" timestamp(3) without time zone,
    "licenseIssuedBy" text,
    "adminFirstName" text,
    "adminLastName" text,
    "adminEmail" text,
    "adminPhone" text,
    "adminPosition" text,
    "rejectionReason" text,
    notes text,
    "approvedById" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "pendingPersons" jsonb,
    "reviewedAt" timestamp(3) without time zone,
    "reviewedBy" text,
    source public."ClinicSource" DEFAULT 'ADMIN_CREATED'::public."ClinicSource" NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "legalForm" text,
    "legalName" text
);


ALTER TABLE public."Clinic" OWNER TO banisa;

--
-- Name: ClinicCheckupPackage; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."ClinicCheckupPackage" (
    id text NOT NULL,
    "clinicId" text NOT NULL,
    "packageId" text NOT NULL,
    "clinicPrice" integer NOT NULL,
    "customNotes" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "bookingCount" integer DEFAULT 0 NOT NULL,
    "activatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicCheckupPackage" OWNER TO banisa;

--
-- Name: ClinicDiagnosticService; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."ClinicDiagnosticService" (
    "clinicId" text NOT NULL,
    "diagnosticServiceId" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id text NOT NULL
);


ALTER TABLE public."ClinicDiagnosticService" OWNER TO banisa;

--
-- Name: ClinicRegistrationPerson; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."ClinicRegistrationPerson" (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "middleName" text,
    "position" text NOT NULL,
    phone text NOT NULL,
    email text,
    "passwordHash" text NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ClinicRegistrationPerson" OWNER TO banisa;

--
-- Name: ClinicRegistrationRequest; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."ClinicRegistrationRequest" (
    id text NOT NULL,
    status public."RegistrationStatus" DEFAULT 'PENDING'::public."RegistrationStatus" NOT NULL,
    "nameUz" text NOT NULL,
    "nameRu" text,
    "nameEn" text,
    "clinicType" text NOT NULL,
    "foundedYear" integer,
    "descriptionUz" text NOT NULL,
    "descriptionRu" text,
    "logoUrl" text,
    "regionId" text NOT NULL,
    "districtId" text NOT NULL,
    "streetAddress" text NOT NULL,
    "addressUz" text NOT NULL,
    "addressRu" text,
    "zipCode" text,
    "googleMapsUrl" text,
    landmark text,
    latitude double precision,
    longitude double precision,
    "primaryPhone" text NOT NULL,
    "secondaryPhone" text,
    "emergencyPhone" text,
    email text NOT NULL,
    website text,
    telegram text,
    instagram text,
    facebook text,
    youtube text,
    "workingHours" jsonb NOT NULL,
    "isAlwaysOpen" boolean DEFAULT false NOT NULL,
    "lunchBreakStart" text,
    "lunchBreakEnd" text,
    "holidayNotes" text,
    "selectedServices" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "licenseUrl" text,
    "licenseNumber" text NOT NULL,
    "licenseExpiry" text NOT NULL,
    inn text NOT NULL,
    "legalName" text NOT NULL,
    "legalAddress" text NOT NULL,
    "legalForm" text,
    certificates jsonb DEFAULT '[]'::jsonb NOT NULL,
    "bankName" text NOT NULL,
    "bankAccountNumber" text NOT NULL,
    mfo text NOT NULL,
    oked text,
    "vatNumber" text,
    "paymentMethods" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "invoiceEmail" text,
    "rejectionReason" text,
    "reviewedById" text,
    "reviewedAt" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicRegistrationRequest" OWNER TO banisa;

--
-- Name: ClinicSanatoriumService; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."ClinicSanatoriumService" (
    "clinicId" text NOT NULL,
    "sanatoriumServiceId" text NOT NULL,
    "clinicPrice" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "availableFrom" timestamp(3) without time zone,
    "availableTo" timestamp(3) without time zone,
    "contactEmail" text,
    "contactPhone" text,
    "customDescription" text,
    "customNameRu" text,
    "customNameUz" text,
    "discountPercent" integer DEFAULT 0,
    "discountValidUntil" timestamp(3) without time zone,
    excludes jsonb,
    features jsonb,
    includes jsonb,
    "locationAddress" text,
    "locationCoords" text,
    "maxGuests" integer,
    "mealDescription" text,
    "mealPlan" text,
    "roomAmenities" jsonb,
    "roomImages" jsonb,
    "roomType" text,
    "updatedAt" timestamp(3) without time zone
);


ALTER TABLE public."ClinicSanatoriumService" OWNER TO banisa;

--
-- Name: ClinicSurgicalService; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."ClinicSurgicalService" (
    "clinicId" text NOT NULL,
    "surgicalServiceId" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "customizationData" jsonb,
    "serviceImages" jsonb
);


ALTER TABLE public."ClinicSurgicalService" OWNER TO banisa;

--
-- Name: DiagnosticService; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."DiagnosticService" (
    id text NOT NULL,
    "nameUz" text NOT NULL,
    "nameRu" text,
    "nameEn" text,
    "categoryId" text NOT NULL,
    "shortDescription" character varying(200),
    "fullDescription" text,
    "priceRecommended" integer DEFAULT 0 NOT NULL,
    "priceMin" integer DEFAULT 0 NOT NULL,
    "priceMax" integer DEFAULT 0 NOT NULL,
    "durationMinutes" integer DEFAULT 30 NOT NULL,
    "resultTimeHours" double precision DEFAULT 24 NOT NULL,
    preparation text,
    contraindications text,
    "sampleType" character varying(100),
    "imageUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "additionalInfo" jsonb,
    "bookingPolicy" jsonb,
    "contraindicationsJson" jsonb,
    "indicationsJson" jsonb,
    "preparationJson" jsonb,
    "processDescription" text,
    "resultFormat" character varying(200),
    "resultParameters" jsonb,
    "sampleVolume" character varying(50)
);


ALTER TABLE public."DiagnosticService" OWNER TO banisa;

--
-- Name: Doctor; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."Doctor" (
    id text NOT NULL,
    "clinicId" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    specialty text,
    bio text,
    "photoUrl" text,
    phone text,
    email text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Doctor" OWNER TO banisa;

--
-- Name: HomepageSettings; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."HomepageSettings" (
    id text NOT NULL,
    section text NOT NULL,
    content jsonb NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HomepageSettings" OWNER TO banisa;

--
-- Name: PaymeTransaction; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."PaymeTransaction" (
    id text NOT NULL,
    "paymeId" text,
    "paymeTime" bigint,
    "createTime" bigint,
    "performTime" bigint,
    "cancelTime" bigint,
    amount integer NOT NULL,
    state integer DEFAULT 1 NOT NULL,
    reason integer,
    "orderId" text NOT NULL,
    "orderType" text DEFAULT 'appointment'::text NOT NULL,
    receivers jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PaymeTransaction" OWNER TO banisa;

--
-- Name: Review; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."Review" (
    id text NOT NULL,
    "clinicId" text NOT NULL,
    "userId" text NOT NULL,
    rating double precision NOT NULL,
    comment text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Review" OWNER TO banisa;

--
-- Name: SanatoriumService; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."SanatoriumService" (
    id text NOT NULL,
    "nameUz" text NOT NULL,
    "nameRu" text,
    "nameEn" text,
    "categoryId" text NOT NULL,
    "shortDescription" character varying(200),
    "fullDescription" text,
    "imageUrl" text,
    "serviceType" public."SanatoriumServiceType" NOT NULL,
    "priceRecommended" integer DEFAULT 0 NOT NULL,
    "priceMin" integer DEFAULT 0 NOT NULL,
    "priceMax" integer DEFAULT 0 NOT NULL,
    "pricePer" text DEFAULT 'session'::text NOT NULL,
    "durationMinutes" integer DEFAULT 0 NOT NULL,
    "durationDays" integer,
    "sessionsCount" integer,
    capacity integer,
    includes jsonb,
    contraindications text,
    preparation text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SanatoriumService" OWNER TO banisa;

--
-- Name: ServiceCategory; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."ServiceCategory" (
    id text NOT NULL,
    "parentId" text,
    level integer DEFAULT 0 NOT NULL,
    "nameUz" text NOT NULL,
    "nameRu" text,
    "nameEn" text,
    slug text NOT NULL,
    icon text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceCategory" OWNER TO banisa;

--
-- Name: ServiceCustomization; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."ServiceCustomization" (
    id text NOT NULL,
    "clinicServiceId" text NOT NULL,
    "customNameUz" text,
    "customNameRu" text,
    "customDescriptionUz" text,
    "customDescriptionRu" text,
    benefits jsonb,
    "preparationUz" text,
    "preparationRu" text,
    "customCategory" text,
    tags text[],
    "estimatedDurationMinutes" integer,
    "availableDays" text[],
    "availableTimeSlots" jsonb,
    "requiresAppointment" boolean DEFAULT true NOT NULL,
    "requiresPrepayment" boolean DEFAULT false NOT NULL,
    "prepaymentPercentage" integer,
    "isHighlighted" boolean DEFAULT false NOT NULL,
    "displayOrder" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "customPrice" integer,
    "discountPercent" integer,
    accuracy character varying(50),
    "additionalInfo" jsonb,
    "bookingPolicy" jsonb,
    certifications jsonb,
    equipment character varying(200),
    "fullDescriptionRu" text,
    "fullDescriptionUz" text,
    "preparationJson" jsonb,
    "processDescription" text,
    "resultFormat" character varying(200),
    "resultTimeHours" double precision,
    "sampleVolume" character varying(50)
);


ALTER TABLE public."ServiceCustomization" OWNER TO banisa;

--
-- Name: ServiceImage; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."ServiceImage" (
    id text NOT NULL,
    "customizationId" text NOT NULL,
    url text NOT NULL,
    alt text,
    "order" integer DEFAULT 0 NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ServiceImage" OWNER TO banisa;

--
-- Name: ServiceReview; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."ServiceReview" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "diagnosticServiceId" text,
    "surgicalServiceId" text,
    "sanatoriumServiceId" text,
    rating integer NOT NULL,
    comment text,
    status public."ReviewStatus" DEFAULT 'PENDING'::public."ReviewStatus" NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceReview" OWNER TO banisa;

--
-- Name: SurgicalService; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."SurgicalService" (
    id text NOT NULL,
    "nameUz" text NOT NULL,
    "nameRu" text,
    "nameEn" text,
    "categoryId" text NOT NULL,
    "shortDescription" character varying(200),
    "fullDescription" text,
    "imageUrl" text,
    "priceRecommended" integer NOT NULL,
    "priceMin" integer NOT NULL,
    "priceMax" integer NOT NULL,
    "durationMinutes" integer DEFAULT 0 NOT NULL,
    "minDuration" integer,
    "maxDuration" integer,
    "recoveryDays" integer DEFAULT 0 NOT NULL,
    "anesthesiaType" public."AnesthesiaType" NOT NULL,
    "anesthesiaNotes" text,
    "requiresHospitalization" boolean DEFAULT true NOT NULL,
    "hospitalizationDays" integer,
    "roomType" public."RoomType",
    "requiresICU" boolean DEFAULT false NOT NULL,
    "icuDays" integer,
    "hospitalizationNotes" text,
    "requiredTests" jsonb,
    "preparationFasting" boolean DEFAULT false NOT NULL,
    "fastingHours" integer,
    "preparationMedication" text,
    "preparationRestrictions" jsonb,
    "preparationTimeline" text,
    "contraindicationsAbsolute" jsonb,
    "contraindicationsRelative" jsonb,
    complexity public."Complexity" NOT NULL,
    "riskLevel" public."RiskLevel" NOT NULL,
    "minSurgeonExperience" integer DEFAULT 0 NOT NULL,
    "surgeonQualifications" jsonb,
    "surgeonSpecialization" text,
    "requiredEquipment" jsonb,
    "operationStages" jsonb,
    "postOpImmediate" jsonb,
    "postOpHome" jsonb,
    "followUpSchedule" jsonb,
    "recoveryMilestones" jsonb,
    "packageIncluded" jsonb,
    "packageExcluded" jsonb,
    alternatives jsonb,
    faqs jsonb,
    "successRate" double precision,
    "videoUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SurgicalService" OWNER TO banisa;

--
-- Name: User; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public."User" (
    id text NOT NULL,
    phone text NOT NULL,
    email text,
    "passwordHash" text NOT NULL,
    "firstName" text,
    "lastName" text,
    role public."Role" DEFAULT 'PATIENT'::public."Role" NOT NULL,
    status public."UserStatus" DEFAULT 'PENDING'::public."UserStatus" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "clinicId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO banisa;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: banisa
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO banisa;

--
-- Data for Name: Appointment; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."Appointment" (id, "clinicId", "patientId", "doctorId", "serviceType", "diagnosticServiceId", "surgicalServiceId", "scheduledAt", status, price, notes, "createdAt", "updatedAt") FROM stdin;
7d2e0e14-a22a-4d92-95f3-55503bb52a72	f6f6e74e-e430-436f-9c53-81b2bbef53c7	17c282e6-68a9-4de7-a461-730772c1c952	\N	DIAGNOSTIC	c492c774-33a5-4585-bfd9-76503ee0b8b5	\N	2026-04-09 09:00:00	PENDING	50000	\N	2026-04-06 11:25:23.665	2026-04-06 11:25:23.665
81430ab8-1fd5-48b2-8711-34ddc4ab9aba	f6f6e74e-e430-436f-9c53-81b2bbef53c7	a3ed4b1c-f5dc-4ab5-ab44-07f2c762cf43	\N	DIAGNOSTIC	8d6a770e-a15d-40bc-9571-a3af9256e773	\N	2026-04-16 09:00:00	PENDING	85500	\N	2026-04-06 11:39:10.173	2026-04-06 11:39:10.173
e4db3074-eeb8-4017-8c80-bb5d0e1891eb	f6f6e74e-e430-436f-9c53-81b2bbef53c7	17c282e6-68a9-4de7-a461-730772c1c952	\N	DIAGNOSTIC	c492c774-33a5-4585-bfd9-76503ee0b8b5	\N	2026-04-22 09:00:00	PENDING	50000	\N	2026-04-06 12:15:10.229	2026-04-06 12:15:10.229
294ca2b3-a53b-489a-a0e4-6ec1d78e2cc0	f6f6e74e-e430-436f-9c53-81b2bbef53c7	17c282e6-68a9-4de7-a461-730772c1c952	\N	DIAGNOSTIC	8d6a770e-a15d-40bc-9571-a3af9256e773	\N	2026-04-08 09:00:00	PENDING	85500	\N	2026-04-06 15:04:38.647	2026-04-06 15:04:38.647
\.


--
-- Data for Name: CheckupPackage; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."CheckupPackage" (id, "nameUz", "nameRu", "nameEn", slug, category, "shortDescription", "fullDescription", "targetAudience", "recommendedPrice", "priceMin", "priceMax", discount, "imageUrl", "isActive", "createdById", "createdAt", "updatedAt") FROM stdin;
cmnvma2k200013ksxv1b6nayv	TIBBIY KO'RIK (HAR YILLIK)	MEDOSMOTR	\N	tibbiy-ko-rik-har-yillik-6701	BASIC	Profilaktik ko'rik bo'lib, har yil o'tish maqsadga muvofiq. O'z ichiga minimal bazaviy tekshiruvlarni oladi.	\N	\N	915000	823500	1006500	0	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 10:24:36.721	2026-04-12 10:24:36.721
cmnoyq0u4000344d3o3fnto1j	PET FULL BODY	КТ ВСЕГО ТЕЛА	\N	mx-x-3141	SPECIALIZED	ONKOLOGIK KASALLIK ANIQLANGANDA BUTUN TANANI  KT QILISHGA ASOSLANGAN TEKSHIRUV  PAKETI	\N	\N	7600000	6840000	8360000	0	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 18:38:33.148	2026-04-12 10:31:19.774
cmnw2o3jv003i3ksx3lyqck6f	ERKAK 40+ (№ 2)    	STANDART	\N	erkak-40-2-5046	AGE_BASED	HECH QANAQA SHIKOYAT  BO'LMAGANDA CHUQURROQ TEKSHIRISH  MAQSADIDA ISHLATILADIGAN PAKET (1-2 KUN)	\N	\N	1880000	1692000	2068000	0	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 18:03:25.051	2026-04-12 18:13:21.631
cmnw2kaxx003b3ksxufxrvd95	ERKAK 40+ (№ 1)    	БАЗОВЫЙ	\N	erkak-40-1-8002	AGE_BASED	SKRINING (1 KUN)	\N	\N	360000	324000	396000	0	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 18:00:28.005	2026-04-12 18:13:33.97
cmn6dkiup0000c2y4byxb2p2k	KARDIOLOGIK SKRIN №2	РАСШИРЕННЫЙ CHECK-UP	\N	bazaviy-checkup	SPECIALIZED	KENGAYTIRILGAN  KARDIOLOGIK CHECK-UP BO'LIB, YASHIRIN PATOLOGIYALAR (ISHEMIYA, ARITMIYA) NI  ANIQLASHGA  QARATILGAN  TEKSHIRUVLAR  PAKETI. PAKET - 40+, QANDLI DIABET, SEMIRISH, CHEKUVCHILARGA	\N	\N	2080000	1872000	2288000	0	\N	f	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.457	2026-04-12 11:17:44.68
cmnw33es500703ksxhdrhqaw7	ERKAK 40+ (№ 3)    	PREMIUM CHECK-UP	\N	erkak-40-3-9442	AGE_BASED	PREMIUM PAKET (BARCHA KASALLIKLARNI  ANIQLASH UCHUN QO'LLANILADI)	\N	\N	7000000	6300000	7700000	0	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 18:15:19.446	2026-04-12 18:15:19.446
cmnvoca5h002b3ksxpibdz3av	EXPERT KARDIO PAKET	УГЛУБЛЕННЫЙ МЕТОД	\N	expert-kardio-paket-9105	SPECIALIZED	BU PAKET ISHEMIK KASALLIKNI ANIQLASH UCHUN 50+ DA  HAMDA  RISK BALAND  INSONLAR UCHUNDIR (SPORTSMEN, STRESS BILAN ISHLAYDIGANLAR)	\N	\N	2180000	1962000	2398000	0	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 11:22:19.109	2026-04-12 11:28:42.182
cmn6dkiv20004c2y45nn9u2lz	KARDIOLOGIK SKRINING №1	ВЫЯВЛЕНИЕ РИСКА КАРДИОЛОГИЧЕСКИХ БОЛЕЗНЕЙ	\N	kardiologik-checkup	BASIC	YURAK-QON  TOMIR  KASALLIKLARINI  RISKINI  ANIQLASH MAQSADIDA 25-45 YOSHLILAR ORASIDA  O'TKAZISH  ZARUR	\N	\N	1260000	1134000	1386000	0	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.47	2026-04-12 11:29:55.319
cmnw1x3wt00363ksxjmuzei2s	KAPSULA ENDOSKOPIYA	КАПСУЛЬНАЯ ЭНДОСКОПИЯ	\N	kapsula-endoskopiya-5802	SPECIALIZED	O'zbekistonda yagona usul!!!	\N	\N	7000000	6300000	7700000	0	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 17:42:25.805	2026-04-12 17:43:21.817
cmn6dkiv70008c2y4p5yegf0f	Erkaklar 40+ Checkup	\N	\N	erkaklar-40-checkup	AGE_BASED	40 yoshdan oshgan erkaklar uchun maxsus paket	\N	\N	550000	450000	650000	80000	\N	f	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.475	2026-04-12 18:16:16.351
\.


--
-- Data for Name: CheckupPackageItem; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."CheckupPackageItem" (id, "packageId", "diagnosticServiceId", "serviceName", "servicePrice", quantity, "isRequired", notes, "sortOrder") FROM stdin;
cmnw30vvj00693ksxukjqpjd0	cmnw2o3jv003i3ksx3lyqck6f	364fd599-2f7d-4dcf-be32-5089d0fa6942	Videoendoskopiya yordamida oshqozon-ichak trakti yuqori qismini tekshirish (mahalliy narkoz)	300000	1	t	Endoskopiya  (gastroskopiya, kolonoskopiya, bronhoskopiya)	0
cmnw30vvj006a3ksxyk6bnx5l	cmnw2o3jv003i3ksx3lyqck6f	c492c774-33a5-4585-bfd9-76503ee0b8b5	Qon umumiy tahlili (tez skrining)	50000	1	t	Qon klinik tahlillari	1
cmnw30vvj006b3ksxw4qzfb53	cmnw2o3jv003i3ksx3lyqck6f	f8a7a25c-cfb2-4a9a-a0d6-0c83d9e62c07	Siydik umumiy tahlili	50000	1	t	Siydik Tahlillari	2
cmnw30vvj006c3ksxh3ng4pu3	cmnw2o3jv003i3ksx3lyqck6f	e797b672-5b89-4119-ac02-6c7900db9b99	Lipidogramma (past, o'ta past  va yuqori zichlikdagi holesterin, Triglecerid, umumiy holesterin va Aterogenlik indeksi)	160000	1	t	Lipid spektri (lipidogramma)	3
cmnw30vvj006d3ksxlxmigdmh	cmnw2o3jv003i3ksx3lyqck6f	06a5ec05-c02d-420b-8406-7aedf89427b8	ALAT (jigar fermetlari)	50000	1	t	Biokimyoviy qon tahlillari 	4
cmnw30vvj006e3ksxwabkzm3a	cmnw2o3jv003i3ksx3lyqck6f	8a8a5639-c9a9-49a3-8f08-042aacc323bc	ASAT (jigar fermenti)	50000	1	t	Biokimyoviy qon tahlillari 	5
cmn6dkiv70009c2y4dy0azq7s	cmn6dkiv70008c2y4p5yegf0f	c492c774-33a5-4585-bfd9-76503ee0b8b5	Qon klinik tahlillari	50000	1	t	\N	0
cmn6dkiv7000ac2y42oq7bs2l	cmn6dkiv70008c2y4p5yegf0f	de0d9af3-37db-4e73-b537-f1b0f7e5168c	Lipidogramma (yog' almashinuvi skriningi)	90000	1	t	\N	1
cmn6dkiv7000bc2y4qwojok1k	cmn6dkiv70008c2y4p5yegf0f	05998eb4-1d2e-4839-93b5-8b6f8701a5e3	Ultratovush va dopplerografiya	150000	1	t	\N	2
cmn6dkiv7000cc2y4b026a1wd	cmn6dkiv70008c2y4p5yegf0f	150142eb-c571-473e-bf59-0adea12f2706	Qondagi Gormonlarni Tekshirish	160000	1	t	\N	3
cmnw30vvj006f3ksx7ua8jn7o	cmnw2o3jv003i3ksx3lyqck6f	479eef26-c7d4-4a74-9ddd-bcf48dc390d2	Bilurubin (umumiy  va fraktciyalari) 	70000	1	t	Biokimyoviy qon tahlillari 	6
cmnw30vvj006g3ksx6cc8vp7m	cmnw2o3jv003i3ksx3lyqck6f	b8b69877-3693-47dc-98e9-84c122f5a00c	Kreatinin	50000	1	t	Biokimyoviy qon tahlillari 	7
cmnw30vvj006h3ksxkek4n7ad	cmnw2o3jv003i3ksx3lyqck6f	4b2b73e7-7f63-441d-ba46-53f575ac53fe	Mochevina (buyrak uchun)	75000	1	t	Biokimyoviy qon tahlillari 	8
cmnw30vvj006i3ksxiap60a7m	cmnw2o3jv003i3ksx3lyqck6f	620b9b9d-1507-4c91-a599-f149d79be058	Gepatit B (IXA)	60000	1	t	Ekspress diagnostika (gepatit, VICH, Troponin, COVID, sifilis, Brucellez)	9
cmnw30vvj006j3ksx86xerl1v	cmnw2o3jv003i3ksx3lyqck6f	e83a51ee-6a0b-42bc-ab45-c162aeb006bf	Gepatit C (IXA)	60000	1	t	Ekspress diagnostika (gepatit, VICH, Troponin, COVID, sifilis, Brucellez)	10
cmnw30vvk006k3ksxbflhc5wh	cmnw2o3jv003i3ksx3lyqck6f	eac11198-8afe-4395-ad62-cbb57f7379bc	Zahm (sifilis) - IXA	60000	1	t	Ekspress diagnostika (gepatit, VICH, Troponin, COVID, sifilis, Brucellez)	11
cmnvma2k200023ksx0kf6fjwr	cmnvma2k200013ksxv1b6nayv	06a5ec05-c02d-420b-8406-7aedf89427b8	ALAT (jigar fermetlari)	50000	1	t	Biokimyoviy qon tahlillari 	0
cmnvma2k200033ksxi0e82xb1	cmnvma2k200013ksxv1b6nayv	8a8a5639-c9a9-49a3-8f08-042aacc323bc	ASAT (jigar fermenti)	50000	1	t	Biokimyoviy qon tahlillari 	1
cmnvma2k200043ksxfaog9nnq	cmnvma2k200013ksxv1b6nayv	479eef26-c7d4-4a74-9ddd-bcf48dc390d2	Bilurubin (umumiy  va fraktciyalari) 	70000	1	t	Biokimyoviy qon tahlillari 	2
cmnvma2k200053ksxnhd2n7w4	cmnvma2k200013ksxv1b6nayv	b8b69877-3693-47dc-98e9-84c122f5a00c	Kreatinin	50000	1	t	Biokimyoviy qon tahlillari 	3
cmnvma2k200063ksxvm7tjna4	cmnvma2k200013ksxv1b6nayv	4b2b73e7-7f63-441d-ba46-53f575ac53fe	Mochevina (buyrak uchun)	75000	1	t	Biokimyoviy qon tahlillari 	4
cmnvma2k200073ksx889nizri	cmnvma2k200013ksxv1b6nayv	8fb28195-d40b-4bbd-a6b2-0bcaf5d1139a	Qonda glukoza (och qoringa)	50000	1	t	Qandli Diabetni va oshqozon osti bezini tekshirish 	5
cmnvma2k200083ksxs72m8tin	cmnvma2k200013ksxv1b6nayv	c492c774-33a5-4585-bfd9-76503ee0b8b5	Qon umumiy tahlili (tez skrining)	50000	1	t	Qon klinik tahlillari	6
cmnvma2k200093ksx7x1o1tjs	cmnvma2k200013ksxv1b6nayv	f8a7a25c-cfb2-4a9a-a0d6-0c83d9e62c07	Siydik umumiy tahlili	50000	1	t	Siydik Tahlillari	7
cmnvma2k2000a3ksxa06cj5cs	cmnvma2k200013ksxv1b6nayv	620b9b9d-1507-4c91-a599-f149d79be058	Gepatit B (IXA)	60000	1	t	Ekspress diagnostika (gepatit, VICH, Troponin, COVID, sifilis, Brucellez)	8
cmnvma2k2000b3ksx9rrf739k	cmnvma2k200013ksxv1b6nayv	e83a51ee-6a0b-42bc-ab45-c162aeb006bf	Gepatit C (IXA)	60000	1	t	Ekspress diagnostika (gepatit, VICH, Troponin, COVID, sifilis, Brucellez)	9
cmnvma2k2000c3ksxel2vzofe	cmnvma2k200013ksxv1b6nayv	487177bb-b804-4fb5-85b7-fa66e49bd1b9	OITS tahlili (qa'tiy passport bilan)	90000	1	t	Ekspress diagnostika (gepatit, VICH, Troponin, COVID, sifilis, Brucellez)	10
cmnvma2k2000d3ksxy2dmlwo3	cmnvma2k200013ksxv1b6nayv	eac11198-8afe-4395-ad62-cbb57f7379bc	Zahm (sifilis) - IXA	60000	1	t	Ekspress diagnostika (gepatit, VICH, Troponin, COVID, sifilis, Brucellez)	11
cmnvma2k2000e3ksx97f8lnax	cmnvma2k200013ksxv1b6nayv	ed3f1aea-b23e-48b3-9db5-f5df11ce0ac9	EKG	50000	1	t	Yurak (EKG, EHOKS va HOLTER) uchun 	12
cmnvma2k2000f3ksxgtgmmuoc	cmnvma2k200013ksxv1b6nayv	05998eb4-1d2e-4839-93b5-8b6f8701a5e3	Qorin bo'shlig'i UTT 	150000	1	t	Ultratovush tekshiruvi (UTT, UZI)	13
cmnvmipjy000h3ksx1nh8tcax	cmnoyq0u4000344d3o3fnto1j	3173bf89-c1fa-4d36-91a9-67e5edfa7550	POZITRON-EMISSION TOMOGRAFIYA (PET/KT)	7600000	1	t	PET KT (POZITRON EMISSION TOMOGRAFIYA) 	0
cmnw30vvk006l3ksxeli76m69	cmnw2o3jv003i3ksx3lyqck6f	487177bb-b804-4fb5-85b7-fa66e49bd1b9	OITS tahlili (qa'tiy passport bilan)	90000	1	t	Ekspress diagnostika (gepatit, VICH, Troponin, COVID, sifilis, Brucellez)	12
cmnw30vvk006m3ksxeg0zeicj	cmnw2o3jv003i3ksx3lyqck6f	b13dbfbf-2359-49e7-bd54-4de9f4e8a362	Koagulogramma skrining (PTV, PTI, MNO, ACHTV, fibrinogen, TV)	100000	1	t	Koagulogramma	13
cmnw30vvk006n3ksxhw6e3mzz	cmnw2o3jv003i3ksx3lyqck6f	79ca0cd0-2fe8-41e3-b4f8-c4b969a01e1e	D vitamin (25-OH, umumiy) 	210000	1	t	Suyak to'qimasi emirilishi tahlillari	14
cmnw30vvk006o3ksxexrm5lw1	cmnw2o3jv003i3ksx3lyqck6f	0d239a8e-2caf-4084-b715-e40bef5d8f1f	Tiroksin umumiy (T4)	85000	1	t	Qondagi Gormonlar Tahlili	15
cmnw30vvk006p3ksxrkzsyatl	cmnw2o3jv003i3ksx3lyqck6f	87dbd2de-b35d-4b8c-932f-236b68d06693	Tireotrop gormon (TTG)	85000	1	t	Qondagi Gormonlar Tahlili	16
cmnw30vvk006q3ksx5187otvc	cmnw2o3jv003i3ksx3lyqck6f	ac69e5b9-f09e-41d6-bff9-1aac14df41cc	Follikula stimullovchi gormon (FSG) 	85000	1	t	Qondagi Gormonlar Tahlili	17
cmnw30vvk006r3ksxcmiom3xr	cmnw2o3jv003i3ksx3lyqck6f	992b6380-8465-4e3b-9507-0851680e4552	Luteinlovchi gormon (LG)	85000	1	t	Qondagi Gormonlar Tahlili	18
cmnw30vvk006s3ksxszkl7dy1	cmnw2o3jv003i3ksx3lyqck6f	24d026bf-02ad-4048-baeb-fb5ce6f5828b	Erkin Testosteron 	105000	1	t	Qondagi Gormonlar Tahlili	19
cmnw1yb4p00393ksx0cpteq52	cmnw1x3wt00363ksxjmuzei2s	ff657026-0f58-432b-ab30-2036f72e9352	Kapsula endoskopiya	7000000	1	t	Kapsula endoskopiya 	0
cmnw315ea006u3ksxm3182qmg	cmnw2kaxx003b3ksxufxrvd95	e797b672-5b89-4119-ac02-6c7900db9b99	Lipidogramma (past, o'ta past  va yuqori zichlikdagi holesterin, Triglecerid, umumiy holesterin va Aterogenlik indeksi)	160000	1	t	Lipid spektri (lipidogramma)	0
cmnw315ea006v3ksxhg827kmt	cmnw2kaxx003b3ksxufxrvd95	8fb28195-d40b-4bbd-a6b2-0bcaf5d1139a	Qonda glukoza (och qoringa)	50000	1	t	Qandli Diabetni va oshqozon osti bezini tekshirish 	1
cmnw315ea006w3ksxjzopcft9	cmnw2kaxx003b3ksxufxrvd95	c492c774-33a5-4585-bfd9-76503ee0b8b5	Qon umumiy tahlili (tez skrining)	50000	1	t	Qon klinik tahlillari	2
cmnw315ea006x3ksxoybpxpz8	cmnw2kaxx003b3ksxufxrvd95	f8a7a25c-cfb2-4a9a-a0d6-0c83d9e62c07	Siydik umumiy tahlili	50000	1	t	Siydik Tahlillari	3
cmnw315ea006y3ksxjo4sn23t	cmnw2kaxx003b3ksxufxrvd95	ed3f1aea-b23e-48b3-9db5-f5df11ce0ac9	EKG	50000	1	t	Yurak (EKG, EHOKS va HOLTER) uchun 	4
cmnw33es500713ksx70xwx7lj	cmnw33es500703ksxhdrhqaw7	ff657026-0f58-432b-ab30-2036f72e9352	Kapsula endoskopiya	7000000	1	t	Kapsula endoskopiya 	0
cmnvo6eeg001x3ksx4e8kcrla	cmn6dkiup0000c2y4byxb2p2k	c492c774-33a5-4585-bfd9-76503ee0b8b5	Qon umumiy tahlili (tez skrining)	50000	1	t		0
cmnvo6eeg001y3ksxqvzophei	cmn6dkiup0000c2y4byxb2p2k	38f3f63e-ade2-4d85-8007-74fda178240d	Siydikning Zimnitcskiy bo'yicha tahlilli	80000	1	t		1
cmnvo6eeg001z3ksxr1k0g7br	cmn6dkiup0000c2y4byxb2p2k	05998eb4-1d2e-4839-93b5-8b6f8701a5e3	Qorin bo'shlig'i UTT 	150000	1	t		2
cmnvo6eeg00203ksx1i1ovb9q	cmn6dkiup0000c2y4byxb2p2k	df001cdd-cd73-496e-a493-44fb9e2aa49a	EHOKS	200000	1	t	Yurak (EKG, EHOKS va HOLTER) uchun 	3
cmnvo6eeg00213ksxtn7wvfc0	cmn6dkiup0000c2y4byxb2p2k	1b141a4c-41f1-495f-b20c-4268515dd447	Holter tekshiruvi 	650000	1	t	Yurak (EKG, EHOKS va HOLTER) uchun 	4
cmnvo6eeg00223ksxu3eruh33	cmn6dkiup0000c2y4byxb2p2k	93b0241b-df4a-4121-ad7d-4ed60e7494a4	Ferritin	100000	1	t	Kamqonlik (anemiya) diagnostikasi 	5
cmnvo6eeg00233ksxxrn8vkqh	cmn6dkiup0000c2y4byxb2p2k	23bff89a-c79b-4418-9554-b95debbbf7ae	Temir almashinuvi (Temir, OJCC, LJCC)	120000	1	t	Kamqonlik (anemiya) diagnostikasi 	6
cmnvo6eeg00243ksx9qidhdat	cmn6dkiup0000c2y4byxb2p2k	9da119f7-e891-47f3-9110-0280b511a445	Qon kislota-ishqor  holatini  tekshirish	300000	1	t	Qonda gazlar  va elektrolitlar  tahlili	7
cmnvo6eeg00253ksxb6h9vhtn	cmn6dkiup0000c2y4byxb2p2k	b93f0e95-a0e7-429e-8377-f5430185ccef	Glukosa (to'q qoringa)	50000	1	t	Qandli Diabetni va oshqozon osti bezini tekshirish 	8
cmnvo6eeg00263ksxxh60t7na	cmn6dkiup0000c2y4byxb2p2k	8fb28195-d40b-4bbd-a6b2-0bcaf5d1139a	Qonda glukoza (och qoringa)	50000	1	t	Qandli Diabetni va oshqozon osti bezini tekshirish 	9
cmnvo6eeg00273ksxxbb3qy2n	cmn6dkiup0000c2y4byxb2p2k	62152d80-f670-45eb-ab09-6c69257ad54b	Glikirlangan gemoglobin	110000	1	t	Qandli Diabetni va oshqozon osti bezini tekshirish 	10
cmnvo6eeg00283ksxmlze751w	cmn6dkiup0000c2y4byxb2p2k	9dc51f02-d1ca-4aef-812c-e222eb2f6740	Insulin (och qoringa)	110000	1	t	Qandli Diabetni va oshqozon osti bezini tekshirish 	11
cmnvo6eeg00293ksx8x1zzh4m	cmn6dkiup0000c2y4byxb2p2k	2db2129e-b6ef-4430-876e-7a404af00db9	Insulin (to'q qoringa) 	110000	1	t	Qandli Diabetni va oshqozon osti bezini tekshirish 	12
cmnvokhqd002k3ksxlfky7oef	cmnvoca5h002b3ksxpibdz3av	975f6fcf-8c48-48e9-a396-baa4601e88f3	Yurak MRT	500000	1	t	MRT (MAGNIT REZONANSLI TOMOGRAFIYA)	0
cmnvokhqd002l3ksxd9jshwx9	cmnvoca5h002b3ksxpibdz3av	67c3b8f7-1dd2-4cf1-8482-f94da02372fa	MSKTA KORONOROGRAFIYA	1200000	1	t	MSKT (MULTISPIRAL KOMPYUTER TOMOGRAFIYA)	1
cmnvokhqd002m3ksxk4xuwj85	cmnvoca5h002b3ksxpibdz3av	000863e2-ce21-431c-a64d-ed6864fe1f73	Apolipoprotein AI	240000	1	t	Lipid spektri (lipidogramma)	2
cmnvokhqd002n3ksx11xvufxd	cmnvoca5h002b3ksxpibdz3av	3d76101d-8a56-403b-ab2e-abaee4287527	Apolipoprotein B	240000	1	t	Lipid spektri (lipidogramma)	3
cmnvom25z002p3ksxp9aibfx2	cmn6dkiv20004c2y45nn9u2lz	de0d9af3-37db-4e73-b537-f1b0f7e5168c	Lipidogramma (yog' almashinuvi skriningi)	90000	1	t		0
cmnvom25z002q3ksx7pnrzofd	cmn6dkiv20004c2y45nn9u2lz	291afb18-da44-4dc4-929d-05511d807b71	Ko'krak qafasi rentgenografiyasi	120000	1	t		1
cmnvom25z002r3ksxml2oj0z9	cmn6dkiv20004c2y45nn9u2lz	05998eb4-1d2e-4839-93b5-8b6f8701a5e3	Qorin bo'shlig'i UTT 	150000	1	t		2
cmnvom25z002s3ksxewvp2jlv	cmn6dkiv20004c2y45nn9u2lz	a901c197-c2c0-477c-9c0f-d8efde917496	Kaliy	50000	1	t	Elektrolitlar (tuzlar)	3
cmnvom25z002t3ksxejd1qs3m	cmn6dkiv20004c2y45nn9u2lz	682fe410-025f-48fd-bd28-ec0ab7f79ed8	Natriy	50000	1	t	Elektrolitlar (tuzlar)	4
cmnvom25z002u3ksxkse7ftr9	cmn6dkiv20004c2y45nn9u2lz	e797b672-5b89-4119-ac02-6c7900db9b99	Lipidogramma (past, o'ta past  va yuqori zichlikdagi holesterin, Triglecerid, umumiy holesterin va Aterogenlik indeksi)	160000	1	t	Lipid spektri (lipidogramma)	5
cmnvom25z002v3ksx68owhqw6	cmn6dkiv20004c2y45nn9u2lz	c492c774-33a5-4585-bfd9-76503ee0b8b5	Qon umumiy tahlili (tez skrining)	50000	1	t	Qon klinik tahlillari	6
cmnvom25z002w3ksxa6dvqn2g	cmn6dkiv20004c2y45nn9u2lz	8fb28195-d40b-4bbd-a6b2-0bcaf5d1139a	Qonda glukoza (och qoringa)	50000	1	t	Qandli Diabetni va oshqozon osti bezini tekshirish 	7
cmnvom25z002x3ksxkaocwjv0	cmn6dkiv20004c2y45nn9u2lz	62152d80-f670-45eb-ab09-6c69257ad54b	Glikirlangan gemoglobin	110000	1	t	Qandli Diabetni va oshqozon osti bezini tekshirish 	8
cmnvom25z002y3ksxl6sbo7gu	cmn6dkiv20004c2y45nn9u2lz	06a5ec05-c02d-420b-8406-7aedf89427b8	ALAT (jigar fermetlari)	50000	1	t	Biokimyoviy qon tahlillari 	9
cmnvom25z002z3ksxvnuyrf2x	cmn6dkiv20004c2y45nn9u2lz	8a8a5639-c9a9-49a3-8f08-042aacc323bc	ASAT (jigar fermenti)	50000	1	t	Biokimyoviy qon tahlillari 	10
cmnvom25z00303ksx7oxfcctk	cmn6dkiv20004c2y45nn9u2lz	b8b69877-3693-47dc-98e9-84c122f5a00c	Kreatinin	50000	1	t	Biokimyoviy qon tahlillari 	11
cmnvom25z00313ksxmtu40spc	cmn6dkiv20004c2y45nn9u2lz	4b2b73e7-7f63-441d-ba46-53f575ac53fe	Mochevina (buyrak uchun)	75000	1	t	Biokimyoviy qon tahlillari 	12
cmnvom25z00323ksxbkc6po4a	cmn6dkiv20004c2y45nn9u2lz	479eef26-c7d4-4a74-9ddd-bcf48dc390d2	Bilurubin (umumiy  va fraktciyalari) 	70000	1	t	Biokimyoviy qon tahlillari 	13
cmnvom25z00333ksx8wrwnq2o	cmn6dkiv20004c2y45nn9u2lz	87dbd2de-b35d-4b8c-932f-236b68d06693	Tireotrop gormon (TTG)	85000	1	t	Qondagi Gormonlar Tahlili	14
cmnvom25z00343ksx7oxg0d3d	cmn6dkiv20004c2y45nn9u2lz	ed3f1aea-b23e-48b3-9db5-f5df11ce0ac9	EKG	50000	1	t	Yurak (EKG, EHOKS va HOLTER) uchun 	15
\.


--
-- Data for Name: Clinic; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."Clinic" (id, "nameUz", "nameRu", "nameEn", type, status, description, logo, "coverImage", region, district, street, apartment, landmark, latitude, longitude, phones, emails, website, "socialMedia", "workingHours", "hasEmergency", "hasAmbulance", "hasOnlineBooking", "bedsCount", "floorsCount", "parkingAvailable", amenities, "paymentMethods", "insuranceAccepted", "priceRange", "averageRating", "reviewCount", "registrationNumber", "taxId", "licenseNumber", "licenseIssuedAt", "licenseExpiresAt", "licenseIssuedBy", "adminFirstName", "adminLastName", "adminEmail", "adminPhone", "adminPosition", "rejectionReason", notes, "approvedById", "isActive", "createdAt", "updatedAt", "createdBy", "pendingPersons", "reviewedAt", "reviewedBy", source, "submittedAt", "legalForm", "legalName") FROM stdin;
f6f6e74e-e430-436f-9c53-81b2bbef53c7	Banisa Tibbiyot Markazi	Банisa Медицинский Центр	\N	GENERAL	APPROVED	Toshkent shahridagi zamonaviy tibbiyot markazi	\N	\N	Toshkent	Yunusobod	Amir Temur shoh kochasi 123	\N	\N	\N	\N	["+998712345678", "+998901234567"]	["info@banisa.uz"]	\N	\N	[{"to": "18:00", "day": "Dushanba", "from": "08:00"}, {"to": "18:00", "day": "Seshanba", "from": "08:00"}, {"to": "18:00", "day": "Chorshanba", "from": "08:00"}, {"to": "18:00", "day": "Payshanba", "from": "08:00"}, {"to": "18:00", "day": "Juma", "from": "08:00"}, {"to": "15:00", "day": "Shanba", "from": "09:00"}]	f	f	t	\N	\N	f	\N	\N	\N	\N	4.8	156	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	2026-03-25 19:45:30.313	2026-03-25 19:45:30.313	\N	\N	\N	\N	ADMIN_CREATED	\N	\N	\N
8586afae-77d8-4523-9255-2d7475ecc589	Real Med 	Real Med 	Real Med 	GENERAL	APPROVED	Real Med Real Med Real Med Real Med Real Med Real Med Real Med Real Med Real Med Real Med Re al Med Real Med Real Med Real Med Real Med Real Med Real Med 	\N	\N	tashkent_city	bektemir	Real Med  23	\N	Real Med  23 Real Med 	\N	\N	["+998 12 345-67-87", "+998 12 345-67-87", "+998 12 345-67-87"]	["qwer@asd.com"]		\N	{"schedule": {"friday": {"end": "18:00", "start": "08:00", "isDayOff": false}, "monday": {"end": "18:00", "start": "08:00", "isDayOff": false}, "sunday": {"end": "18:00", "start": "08:00", "isDayOff": false}, "tuesday": {"end": "18:00", "start": "08:00", "isDayOff": false}, "saturday": {"end": "18:00", "start": "08:00", "isDayOff": false}, "thursday": {"end": "18:00", "start": "08:00", "isDayOff": false}, "wednesday": {"end": "18:00", "start": "08:00", "isDayOff": false}}, "queueSettings": {"bufferMinutes": 15, "patientsPerSlot": 2, "slotDurationMinutes": 30}}	f	f	t	\N	\N	f	\N	\N	\N	\N	0	0	\N	123412312	+998 98 765-43-21aA	\N	\N	\N	Real med	Real med	qwer@asd.com	+998 98 765-43-21	bosh_vrach	\N	\N	8c994aaf-0e70-4943-ba72-c06d180815d5	t	2026-04-05 15:56:59.338	2026-04-05 19:26:53.863	\N	[{"phone": "+998 98 765-43-21", "lastName": "Real med", "position": "bosh_vrach", "firstName": "Real med", "isPrimary": true, "middleName": "Real med", "passwordHash": "$2b$12$W5VxifBbVmxWLifUAD4jOOMkzMqpZLXY/.fm5YdrRXk00QBVrzB9a"}]	2026-04-05 16:31:20.553	8c994aaf-0e70-4943-ba72-c06d180815d5	SELF_REGISTERED	2026-04-05 15:56:59.336	\N	\N
62ed84f9-b5c4-49f8-a674-31eefcd06791	Ko'k saroy hosptal	Ko'k saroy hosptal	Ko'k saroy hosptal	SPECIALIZED	APPROVED	Ko'k saroy hosptal ko'p tarmoqli klinika bo'lib Jarrohlik Travmatologiya va Diagnostik yonalishga ixtisoslashgan 	\N	\N	tashkent_city	olmazor	Белтепа 1А	\N	Yangi tashmi 	\N	\N	["+998 93 380-23-13", "+998 93 380-23-13", "+998 93 380-23-13"]	["koksaroynauz@gmail.com"]		\N	{"friday": {"isOpen": true, "openTime": "08:00", "closeTime": "18:00", "isAroundClock": false}, "monday": {"isOpen": true, "openTime": "08:00", "closeTime": "18:00", "isAroundClock": false}, "sunday": {"isOpen": false, "openTime": "09:00", "closeTime": "15:00", "isAroundClock": false}, "tuesday": {"isOpen": true, "openTime": "08:00", "closeTime": "18:00", "isAroundClock": false}, "saturday": {"isOpen": true, "openTime": "09:00", "closeTime": "15:00", "isAroundClock": false}, "thursday": {"isOpen": true, "openTime": "08:00", "closeTime": "18:00", "isAroundClock": false}, "wednesday": {"isOpen": true, "openTime": "08:00", "closeTime": "18:00", "isAroundClock": false}}	f	f	t	\N	\N	f	\N	\N	\N	\N	0	0	\N	123413422	LA-78323	\N	\N	\N	Hadicha	Gulomova	koksaroynauz@gmail.com	+998 93 380-23-13	direktor	\N	\N	8c994aaf-0e70-4943-ba72-c06d180815d5	t	2026-04-06 12:09:27.041	2026-04-06 12:10:55.961	\N	[{"phone": "+998 93 380-23-13", "lastName": "Gulomova", "position": "direktor", "firstName": "Hadicha", "isPrimary": true, "passwordHash": "$2b$12$2OpX4TrWdAkoJ3S6doYtg.NL0VC66I9uyhm.9rHrqwH8eIdHi/gpG"}]	2026-04-06 12:10:55.96	8c994aaf-0e70-4943-ba72-c06d180815d5	SELF_REGISTERED	2026-04-06 12:09:27.039	\N	\N
\.


--
-- Data for Name: ClinicCheckupPackage; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."ClinicCheckupPackage" (id, "clinicId", "packageId", "clinicPrice", "customNotes", "isActive", "bookingCount", "activatedAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicDiagnosticService; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."ClinicDiagnosticService" ("clinicId", "diagnosticServiceId", "isActive", "createdAt", id) FROM stdin;
f6f6e74e-e430-436f-9c53-81b2bbef53c7	c492c774-33a5-4585-bfd9-76503ee0b8b5	t	2026-03-25 19:45:59.089	05b946d7-855a-4ab4-bc9c-a98d99ca666e
f6f6e74e-e430-436f-9c53-81b2bbef53c7	3173bf89-c1fa-4d36-91a9-67e5edfa7550	t	2026-03-25 19:45:59.089	4aaae018-f0a5-4fec-bb63-1752e5aefb7a
f6f6e74e-e430-436f-9c53-81b2bbef53c7	0c153eac-76d9-4289-9e18-275d95b8db0a	t	2026-03-25 19:45:59.089	8a43706d-14f4-4a6a-abbe-87e7f7fcc88f
f6f6e74e-e430-436f-9c53-81b2bbef53c7	3e544ae8-e8eb-4c77-b0a9-6e7fde4f2d43	t	2026-03-25 19:45:59.089	04e1459d-f2ae-4e81-b54f-d3dcd0e8399f
f6f6e74e-e430-436f-9c53-81b2bbef53c7	de0d9af3-37db-4e73-b537-f1b0f7e5168c	t	2026-03-25 19:45:59.089	f4024d64-78f6-4053-9189-49c712bc8561
f6f6e74e-e430-436f-9c53-81b2bbef53c7	ea441afd-f78a-4d28-b6a6-c0f8939888ac	t	2026-03-25 19:45:59.089	4ca78bcc-5443-4da6-948b-164af5215774
f6f6e74e-e430-436f-9c53-81b2bbef53c7	2501fdfa-04d4-4441-88ea-f9d80af9ba26	t	2026-03-25 19:45:59.089	c03e7172-f237-425f-839d-0cf4a663d9dc
f6f6e74e-e430-436f-9c53-81b2bbef53c7	d487a539-f270-4996-84e8-1b9bce25605f	t	2026-03-25 19:45:59.089	734bb943-af9e-4c37-aba1-2064ddb3a2af
f6f6e74e-e430-436f-9c53-81b2bbef53c7	17ba0f4d-49a2-48c7-9e07-9d82b7797b82	t	2026-03-25 19:45:59.089	5ce29bb4-af76-4570-8596-a18a6826b42e
f6f6e74e-e430-436f-9c53-81b2bbef53c7	38f3f63e-ade2-4d85-8007-74fda178240d	t	2026-03-25 19:45:59.089	a4f511f4-8ea9-4049-9969-ef7f1e00f281
f6f6e74e-e430-436f-9c53-81b2bbef53c7	0d559967-f1d0-4afe-ad36-28ddeb4b7a64	t	2026-03-25 19:45:59.089	bc8c0eed-1840-4e04-93a1-3208f6642acd
f6f6e74e-e430-436f-9c53-81b2bbef53c7	68a78f14-f26f-433c-af2c-7f858d0003b1	t	2026-03-25 19:45:59.089	bc988b23-ce71-4190-85d3-06b7a887f777
f6f6e74e-e430-436f-9c53-81b2bbef53c7	6b3f838f-c8c0-40a5-bf49-7aef23dff583	t	2026-03-25 19:45:59.089	68882fe3-9846-41f4-b260-96b516b36c4f
f6f6e74e-e430-436f-9c53-81b2bbef53c7	ba735de8-62c6-4787-963f-11d63b465b4b	t	2026-03-25 19:45:59.089	a6b152a9-524a-46b1-8c3a-6c75b50d15fb
f6f6e74e-e430-436f-9c53-81b2bbef53c7	63356fbc-8909-460f-b147-0421f04c8298	t	2026-03-25 19:45:59.089	95303a05-952a-4619-909e-3f2b973aa20a
f6f6e74e-e430-436f-9c53-81b2bbef53c7	291afb18-da44-4dc4-929d-05511d807b71	t	2026-03-25 19:45:59.089	a27f9b5b-dd7c-4df6-a3ca-e945335d4487
f6f6e74e-e430-436f-9c53-81b2bbef53c7	c13be663-763f-45e3-9ba4-7e49b8b1e545	t	2026-03-25 19:45:59.089	faaf638b-f204-48cf-a354-afd5acfc2d63
f6f6e74e-e430-436f-9c53-81b2bbef53c7	8d6a770e-a15d-40bc-9571-a3af9256e773	t	2026-03-25 19:45:59.089	94aa606c-9b25-4bd0-a5d2-404e7e4fd614
f6f6e74e-e430-436f-9c53-81b2bbef53c7	35caa72f-5781-44fd-99ce-efd97ed26e49	t	2026-03-25 19:45:59.089	0a559387-b295-43df-8160-182910c8ef8e
f6f6e74e-e430-436f-9c53-81b2bbef53c7	87dbd2de-b35d-4b8c-932f-236b68d06693	t	2026-03-25 19:45:59.089	a78ddb4d-ab0a-468a-90a1-c00875738d05
f6f6e74e-e430-436f-9c53-81b2bbef53c7	35fbf9e4-06c6-4d09-910f-58c02177143b	t	2026-03-25 19:45:59.089	111c620d-d3f6-4822-a868-e51b35d1f418
f6f6e74e-e430-436f-9c53-81b2bbef53c7	012e1e9d-9bc0-4b30-a6df-e887fbe62030	t	2026-03-25 19:45:59.089	d629d495-d186-4c7e-81ff-d4a1c81c7bbf
f6f6e74e-e430-436f-9c53-81b2bbef53c7	8d6b53a5-a61b-40fd-9384-c62c3877c1b1	t	2026-03-25 19:45:59.089	acda9b29-5cc2-489b-91e4-28fdd234739f
f6f6e74e-e430-436f-9c53-81b2bbef53c7	f64ccc74-e69d-4dc2-8212-78547b5ef821	t	2026-03-25 19:45:59.089	9cd74dfa-f816-45ad-8eb8-97bce718b4ae
f6f6e74e-e430-436f-9c53-81b2bbef53c7	93977305-0841-41c8-8edd-9b23f28267c3	t	2026-03-25 19:45:59.089	bb912bff-5e00-4679-84ab-89c45eb9442d
f6f6e74e-e430-436f-9c53-81b2bbef53c7	ceb0ca40-5c06-4825-a7ec-0e9df5409198	t	2026-03-25 19:45:59.089	92277d41-b3a3-4e2c-a1cd-3cc673edc9fe
f6f6e74e-e430-436f-9c53-81b2bbef53c7	cee195ad-7e4d-4665-a4aa-47294e45593a	t	2026-03-25 19:45:59.089	4e733c6f-f2af-41d1-9999-80544e41a4c6
f6f6e74e-e430-436f-9c53-81b2bbef53c7	4ca2eefa-f62a-4e09-97f9-3d2ac23844eb	t	2026-03-25 19:45:59.089	1c2a5a88-96ca-48e2-9d4c-4654093a136a
f6f6e74e-e430-436f-9c53-81b2bbef53c7	f210bab4-99f5-46da-98be-f656d548853e	t	2026-03-25 19:45:59.089	0a74097f-444e-45de-988e-16b1dbbdb54b
f6f6e74e-e430-436f-9c53-81b2bbef53c7	f2b25a51-addb-4d6e-bf02-56bbdb5c6cce	t	2026-03-25 19:45:59.089	2a6a9829-5f78-4f96-9fc1-3eae7e8f06f7
f6f6e74e-e430-436f-9c53-81b2bbef53c7	7a8ec432-79b9-4dde-a87a-23a291697141	t	2026-03-25 19:45:59.089	1d81238e-d5b6-4eff-9627-6724eb4ea9f4
f6f6e74e-e430-436f-9c53-81b2bbef53c7	17c67514-a5e7-4ae3-9aa8-6a050a855f48	t	2026-03-25 19:45:59.089	3eaad8fd-ecf8-4ae0-aaae-45850d1b92a9
f6f6e74e-e430-436f-9c53-81b2bbef53c7	6054ac3b-ad80-425a-a902-f71fa600a846	t	2026-03-25 19:45:59.089	37cc89ff-099d-441c-b79d-63ec2ada1c58
f6f6e74e-e430-436f-9c53-81b2bbef53c7	ea6ea5b5-2109-442e-84f7-823efac4e025	t	2026-03-25 19:45:59.089	fcb617c5-7686-4c21-874f-a443b326f61d
f6f6e74e-e430-436f-9c53-81b2bbef53c7	ca1b34a9-cbb4-4cbd-9599-208a7105c7aa	t	2026-03-25 19:45:59.089	e2024342-6ceb-4c66-8c2c-ac2c4c432d6a
f6f6e74e-e430-436f-9c53-81b2bbef53c7	f8a7a25c-cfb2-4a9a-a0d6-0c83d9e62c07	t	2026-03-25 19:45:59.089	06d39361-a9b1-4c6b-ae13-a1604a72560a
f6f6e74e-e430-436f-9c53-81b2bbef53c7	0dd4fd4e-43c1-4254-8dc6-c461bbb13610	t	2026-03-25 19:45:59.089	4cd60d49-2f95-42fe-91dc-897c5457cc03
f6f6e74e-e430-436f-9c53-81b2bbef53c7	43b3d43c-c145-4969-bb9a-7e61d1ba0801	t	2026-03-25 19:45:59.089	6c15c5b7-427a-4c3e-89a0-68e98601d003
f6f6e74e-e430-436f-9c53-81b2bbef53c7	ab8885ce-2738-499c-a13a-0b97414fbbc4	t	2026-03-25 19:45:59.089	81fb62db-e456-46ea-b21b-74999b54f64a
f6f6e74e-e430-436f-9c53-81b2bbef53c7	0b0a9894-82f2-4172-91f3-2b019dac068c	t	2026-03-25 19:45:59.089	e52c530d-8b45-40ef-8d23-b027ee25061f
f6f6e74e-e430-436f-9c53-81b2bbef53c7	150142eb-c571-473e-bf59-0adea12f2706	t	2026-03-25 19:45:59.089	976a9978-bd3b-4b28-b259-7aaeb0f971fb
f6f6e74e-e430-436f-9c53-81b2bbef53c7	0954de6b-d14b-4bf5-9e52-e3ccff6594e0	t	2026-03-25 19:45:59.089	418fa1c4-8adb-42c3-980f-4c8536f70f8a
f6f6e74e-e430-436f-9c53-81b2bbef53c7	77292b95-c7f3-4b34-ac2c-ec61c11ebaa4	t	2026-03-25 19:45:59.089	9b935d25-286b-48e3-a907-46d267cfe9ab
f6f6e74e-e430-436f-9c53-81b2bbef53c7	05998eb4-1d2e-4839-93b5-8b6f8701a5e3	t	2026-03-25 19:45:59.089	41a241b5-cfac-4429-a3a7-e3c22c7946e8
f6f6e74e-e430-436f-9c53-81b2bbef53c7	de030c0c-7286-4873-834b-a61e306fc360	t	2026-03-25 19:45:59.089	c94d742b-ccd8-4291-af11-9f9c2cee746e
f6f6e74e-e430-436f-9c53-81b2bbef53c7	61c288ef-805a-46b3-a5b5-25f59af406eb	t	2026-03-25 19:45:59.089	23cc43f8-4920-49de-bdd2-f72275eba8ef
f6f6e74e-e430-436f-9c53-81b2bbef53c7	8892eef9-df6f-48f4-9bf6-cccc31ba82a9	t	2026-03-25 19:45:59.089	cc35d714-cb0c-4389-8e54-3083e5e2ecfb
8586afae-77d8-4523-9255-2d7475ecc589	8d6a770e-a15d-40bc-9571-a3af9256e773	t	2026-04-05 16:43:14.49	39acf436-4ab6-4e65-9d19-af9ca300f71b
8586afae-77d8-4523-9255-2d7475ecc589	93977305-0841-41c8-8edd-9b23f28267c3	t	2026-04-06 11:36:48.624	674645fa-6dd5-4a8f-88b8-d83a70407138
62ed84f9-b5c4-49f8-a674-31eefcd06791	8d6a770e-a15d-40bc-9571-a3af9256e773	t	2026-04-06 12:13:27.527	7caf15a9-1485-4918-a4e2-35794e010aa9
\.


--
-- Data for Name: ClinicRegistrationPerson; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."ClinicRegistrationPerson" (id, "requestId", "firstName", "lastName", "middleName", "position", phone, email, "passwordHash", "isPrimary", "createdAt") FROM stdin;
\.


--
-- Data for Name: ClinicRegistrationRequest; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."ClinicRegistrationRequest" (id, status, "nameUz", "nameRu", "nameEn", "clinicType", "foundedYear", "descriptionUz", "descriptionRu", "logoUrl", "regionId", "districtId", "streetAddress", "addressUz", "addressRu", "zipCode", "googleMapsUrl", landmark, latitude, longitude, "primaryPhone", "secondaryPhone", "emergencyPhone", email, website, telegram, instagram, facebook, youtube, "workingHours", "isAlwaysOpen", "lunchBreakStart", "lunchBreakEnd", "holidayNotes", "selectedServices", "licenseUrl", "licenseNumber", "licenseExpiry", inn, "legalName", "legalAddress", "legalForm", certificates, "bankName", "bankAccountNumber", mfo, oked, "vatNumber", "paymentMethods", "invoiceEmail", "rejectionReason", "reviewedById", "reviewedAt", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicSanatoriumService; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."ClinicSanatoriumService" ("clinicId", "sanatoriumServiceId", "clinicPrice", "isActive", "createdAt", "availableFrom", "availableTo", "contactEmail", "contactPhone", "customDescription", "customNameRu", "customNameUz", "discountPercent", "discountValidUntil", excludes, features, includes, "locationAddress", "locationCoords", "maxGuests", "mealDescription", "mealPlan", "roomAmenities", "roomImages", "roomType", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicSurgicalService; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."ClinicSurgicalService" ("clinicId", "surgicalServiceId", "isActive", "createdAt", "customizationData", "serviceImages") FROM stdin;
8586afae-77d8-4523-9255-2d7475ecc589	53587d25-ea7c-4f8f-bcc3-9e97345a0135	t	2026-04-06 04:59:27.933	{"customPrice": 6000000000, "customNameRu": "", "customNameUz": "Klinikangiz nomlanishi (ixtiyoriy)Bo'sh qoldirilsa, standart nom ishlatiladi", "postOpDietUz": "Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *", "recoveryDays": 7, "surgeryMethod": "LAPAROSCOPIC", "anesthesiaType": "", "discountPercent": 20, "durationMinutes": 50, "priceIncludesRu": "", "priceIncludesUz": "Narxga nima kiritilgan *Narxga nima kiritilgan *Narxga nima kiritilgan *Narxga nima kiritilgan *Narxga nima kiritilgan *Narxga nima kiritilgan *Narxga nima kiritilgan *Narxga nima kiritilgan *Narxga nima kiritilgan *Narxga nima kiritilgan *Narxga nima kiritilgan *", "descriptionFullRu": "", "descriptionFullUz": "Qisqacha tavsif Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *", "installmentMonths": null, "insuranceAccepted": false, "preOpFastingHours": 5, "descriptionShortRu": "", "descriptionShortUz": "Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *Qisqacha tavsif *", "insuranceProviders": "", "postOpFollowUpDays": 24, "preOpTestsRequired": "Kerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillarKerakli tahlillar", "hospitalizationDays": 5, "preOpInstructionsRu": "", "preOpInstructionsUz": "Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *Operatsiyadan oldin tayyorgarlik *", "preOpMedicationStop": "Dori-darmonlarni to'xtatish", "installmentAvailable": false, "postOpInstructionsRu": "", "postOpInstructionsUz": "Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *Operatsiyadan keyin rejim *", "postOpActivityRestrictions": "Faoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlariFaoliyat cheklovlari"}	[{"url": "/uploads/images/1775457393947_pkeg4r.webp", "order": 0, "isPrimary": true}]
\.


--
-- Data for Name: DiagnosticService; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."DiagnosticService" (id, "nameUz", "nameRu", "nameEn", "categoryId", "shortDescription", "fullDescription", "priceRecommended", "priceMin", "priceMax", "durationMinutes", "resultTimeHours", preparation, contraindications, "sampleType", "imageUrl", "isActive", "createdById", "createdAt", "updatedAt", "additionalInfo", "bookingPolicy", "contraindicationsJson", "indicationsJson", "preparationJson", "processDescription", "resultFormat", "resultParameters", "sampleVolume") FROM stdin;
0c153eac-76d9-4289-9e18-275d95b8db0a	Qon guruhi va Rezus tahlillari	Анализ группы крови и резус-фактора	Blood Group & Rh Factor	7fee35d3-47dc-4cb8-a65d-0694308a2d70	Qon guruhi va Rezus tahlillari bo'yicha laboratoriya tahlili.	\N	60000	50000	80000	20	4	\N	\N	Venoz qon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.314	2026-03-25 18:26:33.314	\N	\N	\N	\N	\N	\N	\N	\N	\N
d487a539-f270-4996-84e8-1b9bce25605f	Ovqat hazm qilish va oshqozon tizimi	Пищеварительная система	Digestive System Tests	34d79946-2e85-4a75-842c-74a1b06e0152	Ovqat hazm qilish va oshqozon tizimi bo'yicha laboratoriya tahlili.	\N	70000	55000	90000	20	4	\N	\N	Axlat	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.327	2026-03-25 18:26:33.327	\N	\N	\N	\N	\N	\N	\N	\N	\N
17ba0f4d-49a2-48c7-9e07-9d82b7797b82	Genital sistemani tekshirish (Urogen)	Урогенитальное исследование	Urogenital Examination	d2ae9f71-daba-4b44-897b-f43fb361cf01	Genital sistemani tekshirish (Urogen) bo'yicha laboratoriya tahlili.	\N	90000	75000	120000	20	4	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.329	2026-03-25 18:26:33.329	\N	\N	\N	\N	\N	\N	\N	\N	\N
6b3f838f-c8c0-40a5-bf49-7aef23dff583	Axlatning klinik tahlil	Клинический анализ кала	Clinical Stool Analysis	34d79946-2e85-4a75-842c-74a1b06e0152	Axlatning klinik tahlil bo'yicha laboratoriya tahlili.	\N	45000	35000	60000	15	2	\N	\N	Axlat	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.34	2026-03-25 18:26:33.34	\N	\N	\N	\N	\N	\N	\N	\N	\N
63356fbc-8909-460f-b147-0421f04c8298	Urug' suyuqligi tahlillari	Спермограмма	Spermogram	d2ae9f71-daba-4b44-897b-f43fb361cf01	Urug' suyuqligi tahlillari bo'yicha laboratoriya tahlili.	\N	100000	85000	130000	30	4	\N	\N	Urug' suyuqligi	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.344	2026-03-25 18:26:33.344	\N	\N	\N	\N	\N	\N	\N	\N	\N
de0d9af3-37db-4e73-b537-f1b0f7e5168c	Lipidogramma (yog' almashinuvi skriningi)	Липидограмма	Lipid Profile	7fee35d3-47dc-4cb8-a65d-0694308a2d70	Lipidogramma (yog' almashinuvi skriningi) bo'yicha laboratoriya tahlili.	\N	90000	75000	120000	20	6	\N	\N	Venoz qon	\N	f	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.318	2026-04-06 17:51:19.653	\N	\N	\N	\N	\N	\N	\N	\N	\N
ea441afd-f78a-4d28-b6a6-c0f8939888ac	Qon ivish tizimi tekshiruvlari (Koagulogramma)	Исследование системы свертывания крови	Coagulation Studies	7fee35d3-47dc-4cb8-a65d-0694308a2d70	Qon ivish tizimi tekshiruvlari (Koagulogramma) bo'yicha laboratoriya tahlili.	\N	130000	110000	170000	30	8	\N	\N	Venoz qon	\N	f	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.321	2026-04-06 18:00:11.176	\N	\N	\N	\N	\N	\N	\N	\N	\N
ba735de8-62c6-4787-963f-11d63b465b4b	Umumiy Axlat tahlili (Koprogramma)	Копрограмма	Coprogramma	34d79946-2e85-4a75-842c-74a1b06e0152	Axlat tahlili (Koprogramma) bo'yicha laboratoriya tahlili.	\N	65000	65000	90000	15	4	\N	\N	Axlat	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.342	2026-04-08 17:18:40.424	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
3e544ae8-e8eb-4c77-b0a9-6e7fde4f2d43	Koagulogramma skrining usuli (Qon Ivish tizimi)	Коагулограмма	Coagulogram	7fee35d3-47dc-4cb8-a65d-0694308a2d70	Koagulogramma (Qon Ivish Tahlillari) bo'yicha laboratoriya tahlili.	\N	120000	100000	160000	30	6	\N	\N	Venoz qon	\N	f	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.316	2026-04-08 01:58:44.971	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
38f3f63e-ade2-4d85-8007-74fda178240d	Siydikning Zimnitcskiy bo'yicha tahlilli	Анализ мочи по Зимницскому	Urine Analysis by Z	e2126e21-9b14-4d7d-b2a8-50221edd6209	Siydikning klinik tahlillari bo'yicha laboratoriya tahlili.	\N	80000	80000	120000	15	2	\N	\N	Siydik	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.331	2026-04-09 09:40:58.574	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
35fbf9e4-06c6-4d09-910f-58c02177143b	ASL-O (yarim miqdoriy)	АСЛО	ASO	f8d55b53-8c40-450e-ae56-8484d788fc28	Mikroskopik tahlillar bo'yicha laboratoriya tahlili.	\N	80000	50000	105000	20	4	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.36	2026-04-10 02:24:20.99	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
87dbd2de-b35d-4b8c-932f-236b68d06693	Tireotrop gormon (TTG)	Тиреотропный  гормон	Hormone Analysis	8df81fd5-88f7-4363-85e2-b7e9f214362b	Gormonlar tahlili (IXLA usuli) bo'yicha laboratoriya tahlili.	\N	85000	85000	180000	30	8	\N	\N	Venoz qon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.358	2026-04-10 03:47:49.413	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
c13be663-763f-45e3-9ba4-7e49b8b1e545	Funksional va instrumental diagnostika	Функциональная и инструментальная диагностика	Functional & Instrumental Diagnostics	31aa204f-13d7-4c3f-ab94-9253cd2c2740	Funksional va instrumental diagnostika bo'yicha laboratoriya tahlili.	\N	130000	110000	170000	45	1	\N	\N	\N	\N	f	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.348	2026-04-11 11:38:57.744	\N	\N	\N	\N	\N	\N	\N	\N	\N
291afb18-da44-4dc4-929d-05511d807b71	Ko'krak qafasi rentgenografiyasi	Рентгенологические исследования	X-Ray Examinations	832d1d87-baec-4228-9d6a-998a2398f11d	Rentgenologik tekshiruvlar bo'yicha laboratoriya tahlili.	\N	120000	100000	160000	30	1	\N	\N	Tana qismi	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.346	2026-04-12 03:41:01.636	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["O'pka kasalliklari"], "symptoms": ["O'pka"], "preventive": "", "mandatoryFor": ["40+"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
f64ccc74-e69d-4dc2-8212-78547b5ef821	Sperma tahlili	Анализ спермы	Semen Analysis	d2ae9f71-daba-4b44-897b-f43fb361cf01	Sperma tahlili bo'yicha laboratoriya tahlili.	\N	110000	90000	145000	30	6	\N	\N	Urug' suyuqligi	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.369	2026-03-25 18:26:33.369	\N	\N	\N	\N	\N	\N	\N	\N	\N
4ca2eefa-f62a-4e09-97f9-3d2ac23844eb	Infeksiyalar	Инфекции	Infections	6d8edd50-184c-4f4d-b155-7092e4c14fad	Infeksiyalar bo'yicha laboratoriya tahlili.	\N	95000	80000	125000	25	48	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.381	2026-03-25 18:26:33.381	\N	\N	\N	\N	\N	\N	\N	\N	\N
f210bab4-99f5-46da-98be-f656d548853e	Yuqumli kasalliklar diagnostikasi	Диагностика инфекционных болезней	Infectious Disease Diagnostics	6d8edd50-184c-4f4d-b155-7092e4c14fad	Yuqumli kasalliklar diagnostikasi bo'yicha laboratoriya tahlili.	\N	120000	100000	160000	30	48	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.384	2026-03-25 18:26:33.384	\N	\N	\N	\N	\N	\N	\N	\N	\N
17c67514-a5e7-4ae3-9aa8-6a050a855f48	Bakteriologik tekshiruvlar antibiotiklarga sezuvchanlik	Бактериологическое исследование с чувствительностью к антибиотикам	Bacteriology & Antibiotic Sensitivity	6d8edd50-184c-4f4d-b155-7092e4c14fad	Bakteriologik tekshiruvlar antibiotiklarga sezuvchanlik bo'yicha laboratoriya tahlili.	\N	150000	130000	200000	30	72	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.392	2026-03-25 18:26:33.392	\N	\N	\N	\N	\N	\N	\N	\N	\N
ea6ea5b5-2109-442e-84f7-823efac4e025	Mikroblarni o'rganish (Bakteriologiya)	Бактериология	Bacteriology	6d8edd50-184c-4f4d-b155-7092e4c14fad	Mikroblarni o'rganish (Bakteriologiya) bo'yicha laboratoriya tahlili.	\N	130000	110000	170000	30	72	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.397	2026-03-25 18:26:33.397	\N	\N	\N	\N	\N	\N	\N	\N	\N
0dd4fd4e-43c1-4254-8dc6-c461bbb13610	Genetik tahlillar	Генетические анализы	Genetic Tests	87f077d3-7029-4e42-8e5b-6e18c41e352f	Genetik tahlillar bo'yicha laboratoriya tahlili.	\N	300000	250000	400000	60	168	\N	\N	Venoz qon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.407	2026-03-25 18:26:33.407	\N	\N	\N	\N	\N	\N	\N	\N	\N
43b3d43c-c145-4969-bb9a-7e61d1ba0801	Infeksiyalarni (PCR Usulida) tahlil qilish	Исследование инфекций методом ПЦР	PCR Infection Analysis	87f077d3-7029-4e42-8e5b-6e18c41e352f	Infeksiyalarni (PCR Usulida) tahlil qilish bo'yicha laboratoriya tahlili.	\N	180000	150000	240000	30	24	\N	\N	Venoz qon / Yoqingh	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.409	2026-03-25 18:26:33.409	\N	\N	\N	\N	\N	\N	\N	\N	\N
0b0a9894-82f2-4172-91f3-2b019dac068c	Polimer zanjir reaksiyasi (PCR)	Полимеразная цепная реакция (ПЦР)	Polymerase Chain Reaction (PCR)	87f077d3-7029-4e42-8e5b-6e18c41e352f	Polimer zanjir reaksiyasi (PCR) bo'yicha laboratoriya tahlili.	\N	170000	140000	220000	30	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.416	2026-03-25 18:26:33.416	\N	\N	\N	\N	\N	\N	\N	\N	\N
ca1b34a9-cbb4-4cbd-9599-208a7105c7aa	Qonning biokimyoviy tekshiruvlari	Биохимические исследования крови	Biochemical Blood Studies	7fee35d3-47dc-4cb8-a65d-0694308a2d70	Qonning biokimyoviy tekshiruvlari bo'yicha laboratoriya tahlili.	\N	100000	85000	135000	25	8	\N	\N	Venoz qon	\N	f	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.401	2026-04-07 00:59:45.326	\N	\N	\N	\N	\N	\N	\N	\N	\N
6054ac3b-ad80-425a-a902-f71fa600a846	Biokimyoviy qon testlari	Биохимические анализы крови	Blood Biochemistry Tests	7fee35d3-47dc-4cb8-a65d-0694308a2d70	Biokimyoviy qon testlari bo'yicha laboratoriya tahlili.	\N	95000	80000	130000	25	8	\N	\N	Venoz qon	\N	f	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.394	2026-04-08 01:58:49.403	\N	\N	\N	\N	\N	\N	\N	\N	\N
0954de6b-d14b-4bf5-9e52-e3ccff6594e0	Autoimmun kasalliklar markerlari	Маркеры аутоиммунных заболеваний	Autoimmune Disease Markers	7fee35d3-47dc-4cb8-a65d-0694308a2d70	Autoimmun kasalliklar markerlari bo'yicha laboratoriya tahlili.	\N	150000	130000	200000	30	24	\N	\N	Venoz qon	\N	f	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.43	2026-04-08 01:58:58.583	\N	\N	\N	\N	\N	\N	\N	\N	\N
f2b25a51-addb-4d6e-bf02-56bbdb5c6cce	Rеvmatoid omil (RO)	Ревматоидный фактор (РФ)	Rheumatological Tests	f8d55b53-8c40-450e-ae56-8484d788fc28	Rеvmatologik tekshiruvlar bo'yicha laboratoriya tahlili.	\N	50000	50000	100000	30	24	\N	\N	Venoz qon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.387	2026-04-10 02:27:38.782	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
7a8ec432-79b9-4dde-a87a-23a291697141	Elektroencefalografiya (EEG)	Электроэнцефалография (ЭЭГ)	Electroencephalography (EEG)	31aa204f-13d7-4c3f-ab94-9253cd2c2740	Elektroensefalografiya (EEG) bo'yicha laboratoriya tahlili.	\N	180000	150000	240000	60	2	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.389	2026-04-11 11:40:06.227	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
ceb0ca40-5c06-4825-a7ec-0e9df5409198	Prenatal AFP	Aльфафетопротеин пренатальный	Prenatal Pathology Diagnostics	8f6f6fde-d883-4bd9-890e-2e3d585c7b3c	Prenatal patologiya diagnostikasi bo'yicha laboratoriya tahlili.	\N	100000	100000	150000	60	48	\N	\N	Venoz qon / Amniotik suyuqlik	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.375	2026-04-11 17:45:58.252	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
cee195ad-7e4d-4665-a4aa-47294e45593a	Limfocitotoksik test 	Перекрестная проба	Immunity Tests	01fefec1-9cce-4233-ae97-72f1430b53ac	Immunitetni tekshirish bo'yicha laboratoriya tahlili.	\N	1200000	1200000	1300000	30	24	\N	\N	Venoz qon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.377	2026-04-11 18:35:42.724	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
ab8885ce-2738-499c-a13a-0b97414fbbc4	REA (rak-embrional antigen)	РЭА	Tumor Markers	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	Onkomarkerlar bo'yicha laboratoriya tahlili.	\N	100000	100000	210000	30	24	\N	\N	Venoz qon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.412	2026-04-13 13:37:06.531	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
0e196172-f2c6-4d07-9289-4615a845088b	NOm	\N	\N	7fee35d3-47dc-4cb8-a65d-0694308a2d70	\N	\N	2	1	3	15	24	\N	\N	\N	\N	f	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-06 12:24:10.839	2026-04-06 12:24:33.294	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
8d6a770e-a15d-40bc-9571-a3af9256e773	Ajralmalar klinik tahlil	Клинический анализ выделений	Discharge Analysis	d2ae9f71-daba-4b44-897b-f43fb361cf01	Ajralmalar klinik tahlil bo'yicha laboratoriya tahlili.	\N	70000	55000	90000	20	4	\N	\N	Ajralma	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.35	2026-04-06 12:25:50.738	{"accuracy": "", "equipment": "m ", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
202258ab-bbfa-47ae-93e2-0a0a721d6c11	Kengaytirilgan umumiy qon tahlili (retikulotcit va trombotcitlar bilan) 	Развёрнутый анализ крови	Wide blood test	7fee35d3-47dc-4cb8-a65d-0694308a2d70	\N	\N	330000	280000	500000	15	24	6  soat och qoringa  topshirish kerak	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-06 17:49:02.611	2026-04-06 17:49:02.611	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
06a5ec05-c02d-420b-8406-7aedf89427b8	ALAT (jigar fermetlari)	AлаТ 	ALAT	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 01:03:42.656	2026-04-07 01:03:42.656	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["jigar"], "symptoms": ["Jigar"], "preventive": "", "mandatoryFor": ["gepatit"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
8a8a5639-c9a9-49a3-8f08-042aacc323bc	ASAT (jigar fermenti)	АсаТ	ASAT	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 01:05:24.692	2026-04-07 01:05:24.692	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["jigar"], "symptoms": ["jigar"], "preventive": "", "mandatoryFor": ["gepatit"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
479eef26-c7d4-4a74-9ddd-bcf48dc390d2	Bilurubin (umumiy  va fraktciyalari) 	Билурубин	Bilurubin	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	70000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 01:09:41.418	2026-04-07 01:09:41.418	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": [], "symptoms": ["jigar"], "preventive": "", "mandatoryFor": ["sariqlik"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
4b2b73e7-7f63-441d-ba46-53f575ac53fe	Mochevina (buyrak uchun)	Мочевина	Urea	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	75000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 01:11:50.911	2026-04-07 01:11:50.911	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": [], "symptoms": ["buyrak"], "preventive": "", "mandatoryFor": []}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
9e2b10af-1948-4bfa-bff6-1ef388c00d6e	Kengaytirilgan koagulogramma	Коагулограмма (развернутая)  	coagulogram	7fee35d3-47dc-4cb8-a65d-0694308a2d70	\N	\N	380000	300000	420000	15	24	\N	\N	\N	\N	f	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-06 18:03:53.653	2026-04-08 01:58:33.86	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
2501fdfa-04d4-4441-88ea-f9d80af9ba26	Rezus omilga antitana ni aniqlash	антитела к резус фактору	Direct Coombs Test	7fee35d3-47dc-4cb8-a65d-0694308a2d70	Anemiya diagnostika bo'yicha laboratoriya tahlili.	\N	190000	190000	250000	20	6	6-8 soat och holatda topshirish kerak	\N	Venoz qon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.324	2026-04-08 02:01:32.905	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
8892eef9-df6f-48f4-9bf6-cccc31ba82a9	Immunoglobulin A (IgA)	Immunoglobulin A (IgA)	IgA	01fefec1-9cce-4233-ae97-72f1430b53ac	Immunologik tahlillar bo'yicha laboratoriya tahlili.	\N	85000	85000	150000	30	24	\N	\N	Venoz qon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.445	2026-04-11 18:07:41.312	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
61c288ef-805a-46b3-a5b5-25f59af406eb	Immunogemogramma (Plus)	Иммулогические исследования	Immunoheamogram	01fefec1-9cce-4233-ae97-72f1430b53ac	Autoimmun tekshiruvlar bo'yicha laboratoriya tahlili.	\N	800000	800000	1000000	30	24	\N	\N	Venoz qon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.442	2026-04-11 18:33:06.233	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
b8b69877-3693-47dc-98e9-84c122f5a00c	Kreatinin	Креатинин	Сreatininе	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	50000	50000	70000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 01:13:12.448	2026-04-07 01:13:12.448	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
f5566e32-978f-4845-b6b8-cde9860f1f11	Alfa-amilaza (Diastaza)-oshqozon osti  bezi fermenti	Альфа амилаза	Alpha-Amylase	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	50000	50000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 01:19:25.253	2026-04-07 01:20:29.396	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["qorindaogriq"], "symptoms": ["pankreatit"], "preventive": "", "mandatoryFor": ["pankreatit"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
bf11b179-1d62-4a27-8d13-cc2f84aff0be	GGT (gamma-glutamiltranspeptidaza)	ГГТ (печеночный фермент)	gamma-glutamiltranspeptidaze	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 01:23:09.914	2026-04-07 01:23:09.914	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
aadbd0bb-ca78-4936-a23b-68f19d033061	Lipaza 	Липаза	Lipase	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	70000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 01:24:46.915	2026-04-07 01:24:46.915	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
5819d850-6339-4ac0-b089-48351927b479	LDG (umumiy)	ЛДГ (лактатдегидрогеназа	LDG	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	75000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 01:26:34.032	2026-04-07 01:26:34.032	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
8bd67a57-8262-4108-a076-5e98beea49d2	Ishqoriy fosfataza	Щелочная фосфатаза	alkaline phosphatase	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 01:29:23.598	2026-04-07 01:29:23.598	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
02df38f7-817d-46ac-83cd-66ce43d06766	Kreatinkinaza	Креатининкиназа	Creatinkinase	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	160000	120000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 03:15:38.074	2026-04-07 03:15:38.074	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
afb1541d-221d-4f8e-af70-5e195d5d11c9	Mioglobin	Миоглобин	Myoglobin	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	170000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 01:31:14.567	2026-04-07 03:17:57.288	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a9e5a87e-2d25-4d88-9f22-597eeed74e1b	Alfa-1 antitripsin	алфа антитрипсин	Alfa-1 antitripsin	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	450000	400000	600000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 03:19:34.607	2026-04-07 03:19:34.607	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
933445c8-56cb-47ff-9d6f-07e1a9656846	Kislotali Fosfataza	Кислая фосфатаза	Acid phosphatase	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	160000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 03:21:26.51	2026-04-07 03:21:26.51	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
d9fe6426-0c2f-4a98-a6fb-96d89a4a8768	Holinesteraza 	Холинэстераза	Cholinesterase	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	150000	120000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 03:22:57.036	2026-04-07 03:22:57.036	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
1d3a8769-b1ed-4d68-86ac-81a52aeb21ec	Siydik kislotasi	Мочевая  кислота	Uric acid	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	50000	50000	70000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 03:25:55.416	2026-04-07 03:25:55.416	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
115f24db-1df6-4d12-a584-4a87d447acf7	Qoldiq  azot 	Остаточный азот	The blood urea nitrogen 	14267afe-b73f-4a8c-b036-fc4240b1dd68	\N	\N	50000	50000	70000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 03:30:39.525	2026-04-07 03:30:39.525	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
620b9b9d-1507-4c91-a599-f149d79be058	Gepatit B (IXA)	Вирусный гепатит В	Hepatittis B	f74c1fb6-0db2-49e0-a965-cebfd3742647	\N	\N	60000	60000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 03:38:17.547	2026-04-07 03:38:17.547	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
e83a51ee-6a0b-42bc-ab45-c162aeb006bf	Gepatit C (IXA)	Вирусный гепатит С	Viral  hepatitis C	f74c1fb6-0db2-49e0-a965-cebfd3742647	\N	\N	60000	60000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 03:39:53.169	2026-04-07 03:39:53.169	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
eac11198-8afe-4395-ad62-cbb57f7379bc	Zahm (sifilis) - IXA	Сифилис	Treponema pallidum	f74c1fb6-0db2-49e0-a965-cebfd3742647	\N	\N	60000	60000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 03:42:04.967	2026-04-07 03:42:04.967	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
487177bb-b804-4fb5-85b7-fa66e49bd1b9	OITS tahlili (qa'tiy passport bilan)	СПИД	AIDS	f74c1fb6-0db2-49e0-a965-cebfd3742647	\N	\N	90000	90000	120000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 13:50:13.289	2026-04-07 13:50:13.289	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
03bf890b-546c-46e7-a429-93c79ab73cb9	COVID tahlili (IgM)	КОВИД -19	COVID	f74c1fb6-0db2-49e0-a965-cebfd3742647	\N	\N	100000	100000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 13:53:38.216	2026-04-07 13:53:38.216	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
e7199f2b-1382-4871-a4e7-ffb01295da88	СOVID tahlili (IgG)	KОВИД-19	СOVID-19	f74c1fb6-0db2-49e0-a965-cebfd3742647	\N	\N	100000	100000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 14:00:25.083	2026-04-07 14:00:25.083	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
f30e5dd6-b997-440a-80d5-dac504fc8769	Helikobakter Pilori (IXA)	Хеликобактер пилори	Helicobacter Pylori	f74c1fb6-0db2-49e0-a965-cebfd3742647	\N	\N	90000	90000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 14:36:27.595	2026-04-07 14:36:27.595	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["yarakasalligi"], "symptoms": ["oshqozon"], "preventive": "", "mandatoryFor": ["gastrit"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
3303ae28-9165-4a79-bf9c-0a445b6663eb	Troponin I (IXA)	Тропонин тест	Troponin I 	f74c1fb6-0db2-49e0-a965-cebfd3742647	\N	\N	90000	90000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 14:38:17.112	2026-04-07 14:38:17.112	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["infarkt"], "symptoms": ["Yurak"], "preventive": "", "mandatoryFor": ["qarilar"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
07ae5fe3-c355-4219-97b9-bfb152505b5d	Brutcellez (Rayt-Heddelson testi)	Бруцеллез	Brucella abortus	f74c1fb6-0db2-49e0-a965-cebfd3742647	\N	\N	110000	110000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 14:40:59.477	2026-04-07 14:40:59.477	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["bugimlar"], "symptoms": ["ogriq"], "preventive": "", "mandatoryFor": ["qassoblar"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
18e2a1b4-cce5-4ccf-bc53-3c4a6bf5595b	Gastrin -17 (bazal)  tahlili	Базальный  гастрин 	gastrin	077742fb-9cee-4637-ac82-5a92f36c195b	\N	\N	380000	380000	450000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 14:46:25.103	2026-04-07 14:46:25.103	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["yaralar"], "symptoms": ["oshqozon"], "preventive": "", "mandatoryFor": ["ogriqlar"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
debc746b-e3ab-4ebd-91a7-0a4ac46653d8	Pepsinogen I	Пепсиноген	Pepsinogen 	077742fb-9cee-4637-ac82-5a92f36c195b	\N	\N	350000	350000	450000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 14:48:28.276	2026-04-07 14:48:28.276	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["yaralar"], "symptoms": ["Oshqozon"], "preventive": "", "mandatoryFor": ["ogriqlar"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
bb7f0b99-cdc8-41fb-bfe3-7bf3b872d1b4	Pepsinogen II	Пепсиноген 2 	Pepsinogen II	077742fb-9cee-4637-ac82-5a92f36c195b	\N	\N	350000	350000	450000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 14:49:46.275	2026-04-07 14:49:46.275	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["yaralar"], "symptoms": ["oshqozon"], "preventive": "", "mandatoryFor": ["ogriqlar"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
0c5a48e4-03fc-4dad-97ab-d4b69e0ff95f	Pepsinogen I va Pepsinogen II  nisbati 	Cоотношение П1\\П2	Pepsinogen 1\\Pepsinogen 2	077742fb-9cee-4637-ac82-5a92f36c195b	\N	\N	600000	600000	700000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 14:53:39.542	2026-04-07 14:53:39.542	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["yaralar"], "symptoms": ["oshqozon"], "preventive": "", "mandatoryFor": ["gastrit"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
93b0241b-df4a-4121-ad7d-4ed60e7494a4	Ferritin	Ферритин	Ferritin	82a70a67-f245-48d3-b09c-e34eb9e4a00d	\N	\N	100000	100000	120000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 14:55:36.349	2026-04-07 14:55:36.349	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a38fb13c-8f58-47ad-ba39-b19380b2e5a0	Vitamin B 12	Витамин В 12	Cianocobalaminum	82a70a67-f245-48d3-b09c-e34eb9e4a00d	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 14:57:19.269	2026-04-07 14:57:19.269	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
23bff89a-c79b-4418-9554-b95debbbf7ae	Temir almashinuvi (Temir, OJCC, LJCC)	Обмен железа (железо, ОЖСС, ЛЖСС)  	Iron metabolizm	82a70a67-f245-48d3-b09c-e34eb9e4a00d	\N	\N	120000	120000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 15:28:55.272	2026-04-07 15:28:55.272	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
de50fa4f-1899-475e-b545-5d90bc833ccd	Transferrinning temit  bilan to'yinganlik koefficienti  	Коэффициент насыщения трансферрина железом (КНТЖ)	Transferrin +iron	82a70a67-f245-48d3-b09c-e34eb9e4a00d	\N	\N	160000	160000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:24:05.795	2026-04-07 16:24:05.795	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
438f6d29-7258-4741-b66d-589fd465e66a	Transferrin	трансферрин	Transferrin	82a70a67-f245-48d3-b09c-e34eb9e4a00d	\N	\N	200000	200000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:24:59.525	2026-04-07 16:24:59.525	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
4f5e902e-6ce8-40f2-b3e8-5a0900db32f0	Foliy kislotasi (Vit B9)	Фолиевая  кислота	Folic acid 	82a70a67-f245-48d3-b09c-e34eb9e4a00d	\N	\N	120000	120000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:26:45.417	2026-04-07 16:26:45.417	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
332197bf-d5af-499c-b35f-9585b78b57da	Eritropoetin 	Эритропоэтин	Eritropoetin 	82a70a67-f245-48d3-b09c-e34eb9e4a00d	\N	\N	350000	350000	400000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:27:36.331	2026-04-07 16:27:36.331	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
d065c27e-4e78-4579-a64e-d583c0e57226	Umumiy kalciy 	Общий кальций	total calcium	345617ac-ace1-4712-8eeb-17f631be538a	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:30:42.299	2026-04-07 16:30:42.299	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
97f8bba1-1a65-4d3d-a456-1d75a202a136	Ionlashgan kalciy	Ионизированный кальций	Ionized calcium	345617ac-ace1-4712-8eeb-17f631be538a	\N	\N	250000	250000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:34:11.69	2026-04-07 16:34:33.511	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a901c197-c2c0-477c-9c0f-d8efde917496	Kaliy	Калий	Kaliy	345617ac-ace1-4712-8eeb-17f631be538a	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:35:29.622	2026-04-07 16:35:29.622	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
2b6ae5ae-db81-47eb-9d97-5596cd86943f	Xlor	Хлор	Chloride	345617ac-ace1-4712-8eeb-17f631be538a	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:36:46.645	2026-04-07 16:36:46.645	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
682fe410-025f-48fd-bd28-ec0ab7f79ed8	Natriy	Натрий	Natrium, Potassium	345617ac-ace1-4712-8eeb-17f631be538a	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:37:42.396	2026-04-07 16:37:42.396	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
67eb56b9-4a91-4c1e-9e7b-3fb43f280a77	Magniy	Магний	Magnium	345617ac-ace1-4712-8eeb-17f631be538a	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:38:56.765	2026-04-07 16:38:56.765	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
814f2860-9b45-4176-99cb-74d4267b6b0d	Fosfor 	Фосфор	Phosphorus 	345617ac-ace1-4712-8eeb-17f631be538a	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:40:19.106	2026-04-07 16:40:19.106	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
b0da4778-ec34-4195-abc3-cd967a27f005	Temir (Fe) zardobdagi	Железо	Iron 	345617ac-ace1-4712-8eeb-17f631be538a	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:43:05.283	2026-04-07 16:43:05.283	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
5f2cacca-5931-4761-b552-a8efa4b61d44	Cink	Цинк 	Zinc	345617ac-ace1-4712-8eeb-17f631be538a	\N	\N	90000	90000	120000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:43:45.155	2026-04-07 16:43:45.155	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
92f6d7ff-2343-402d-9396-bd213bf21d33	Mis (Cu) zardobdagi	Медь	Cuprum	345617ac-ace1-4712-8eeb-17f631be538a	\N	\N	125000	125000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:45:22.229	2026-04-07 16:45:22.229	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
5bb34a54-cad8-4ec2-8d52-fc56c0ccac0f	Litiy (qonda) 	Литий	Lithium	345617ac-ace1-4712-8eeb-17f631be538a	\N	\N	240000	240000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:46:51.823	2026-04-07 16:46:51.823	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
b1fcf5f7-ebb3-4f54-8e2c-a2b4caf094c7	Yod (zardobda) 	Йод	Yodium	345617ac-ace1-4712-8eeb-17f631be538a	\N	\N	350000	350000	400000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-07 16:47:55.321	2026-04-07 16:47:55.321	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
c492c774-33a5-4585-bfd9-76503ee0b8b5	Qon umumiy tahlili (tez skrining)	Oбщий анализ крови	Complete Blood Count	7fee35d3-47dc-4cb8-a65d-0694308a2d70	Qon klinik tahlillari bo'yicha laboratoriya tahlili.	\N	50000	40000	70000	15	2	\N	\N	Venoz qon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.307	2026-04-08 01:58:07.204	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
77292b95-c7f3-4b34-ac2c-ec61c11ebaa4	Lipidlar spektri (holesterinlar) 	Анализ липидного спектра (липидограмма)	Lipid Spectrum Analysis	7fee35d3-47dc-4cb8-a65d-0694308a2d70	Lipid spektri tahlillar (biokimyoviy qon tahlil) bo'yicha laboratoriya tahlili.	\N	160000	120000	200000	25	8	\N	\N	Venoz qon	\N	f	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.433	2026-04-08 01:58:26.432	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": [], "symptoms": ["semizlik"], "preventive": "", "mandatoryFor": ["semizlik"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a017e662-4440-4042-9bf1-84bbf2fcd3b6	COVID -19	COVID -19	COVID -19	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	400000	400000	450000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 02:06:21.237	2026-04-08 02:06:21.237	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
cee3b900-d9f6-4779-af30-98b9528473ff	Virusli gepatit B (Miqdor)	Вирусный гепатит В (количественный)	Viral hepatitis B (quantity) 	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	250000	250000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 06:05:17.064	2026-04-08 06:06:19.173	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Jigar"], "symptoms": ["ogriq"], "preventive": "", "mandatoryFor": ["sargayish"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
2d8e9f0e-9606-4ed4-ab4e-45cf4bf7a21d	Hlamidiya (sifat)	Хламидия (качество)	Quality	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 07:02:54.545	2026-04-08 07:02:54.545	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
d8dd93e4-ed1b-41ea-9a82-41024bd18bdc	Neysseriya gonoreya (sifat)	Нейссерия гонорея	Neysseriya gonoreya	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	160000	160000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 17:06:32.699	2026-04-08 17:06:32.699	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
60ef0c82-58f9-4d34-8e26-cd6ecb06a589	Virusli gepatit B (Sifat)	Вирусный гепатит В (качественное определение ДНК вируса)	Viral hepatitis B (quality)	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	170000	170000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 05:59:44.506	2026-04-08 06:06:01.368	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["jigar"], "symptoms": [], "preventive": "", "mandatoryFor": ["sargayish"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
ccbfa892-e5e8-433d-8d80-8f2ec979da87	Virusli gepatit B (Genotip)	Вирусный гепатит B (Генотип)	Genotiping	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	450000	450000	500000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 06:10:00.626	2026-04-08 06:10:00.626	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
c67cae66-bc07-4591-aec9-74f1410adf36	Virusli gepatit C (Sifat)	Вирусный гепатит С (качество)	Quality	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	180000	180000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 06:13:58.188	2026-04-08 06:13:58.188	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Jigar"], "symptoms": [], "preventive": "", "mandatoryFor": ["Sariqlik"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
09e2aff5-955f-4f4a-8e57-ac993732dc7c	Virusli gepatit C (Miqdor)	Вирусный гепатит С (количество)	Quantity	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	250000	250000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 06:15:22.769	2026-04-08 06:15:22.769	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Jigar"], "symptoms": [], "preventive": "", "mandatoryFor": ["Sariqlik"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
03cd5d28-f150-429a-a90c-4a51b77ee7e2	Virusli gepatit C (Genotip)	Випусный гепатит (генотипирование) 	Genotiping	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	450000	450000	500000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 06:17:15.319	2026-04-08 06:17:15.319	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Jigar"], "symptoms": [], "preventive": "", "mandatoryFor": ["Sariqlik"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
52f38a32-f640-43e3-b1c7-29a32ff98ca4	Virusli gepatit D (Sifat)	Вирусный гепатит Д (Качество)	Quality	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	180000	180000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 06:19:33.981	2026-04-08 06:19:33.981	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Jigar"], "symptoms": [], "preventive": "", "mandatoryFor": ["Sariqlik"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
433fcae0-2879-4acf-b977-27c617583fec	Virusli gepatit D (Miqdor)	Вирусный гепатит Д (количество) 	Quantity	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	280000	280000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 06:20:58.775	2026-04-08 06:20:58.775	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Jigar"], "symptoms": [], "preventive": "", "mandatoryFor": ["Sariqlik"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a664acc9-59de-4c5a-8178-d0be1ba2637c	Oddiy gerpes virusi (1,2 tip sifati)	1,2 типы простого Герпеса (качество)	Quality	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 06:25:51.492	2026-04-08 06:25:51.492	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Toshmalar"], "symptoms": [], "preventive": "", "mandatoryFor": ["uchuqlar"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
fc9d4d24-5a01-4835-a506-3e489fe72a3f	Qizilcha (Krasnuha, sifat)	Краснуха (качество)	Quality	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 06:28:15.519	2026-04-08 06:28:15.519	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Toshmalar"], "symptoms": [], "preventive": "", "mandatoryFor": ["Isitma"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
df25f823-9578-477a-afde-4893d58c0847	Citomegalovirus (sifat)	Цитомегаловирус (качество)	Quality	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 06:30:50.97	2026-04-08 06:30:50.97	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
708a9941-3db2-4f03-aa20-73e69fb8c71d	Toksoplazma (Sifat)	Токсоплазма (качество)	Quality	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	160000	160000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 07:01:40.337	2026-04-08 07:01:40.337	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
9e4f2751-d547-4cbe-a599-31aaaeb0380d	Mikoplazma genitalium (sifat)	Микоплазма гениталия (качество)	Mikoplazma genitalium 	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 07:04:40.463	2026-04-08 07:04:40.463	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
020d198e-2341-4700-b5aa-9d0e92d389f9	Mikoplazma hominis (sifat)	Микоплазма хоминис	Mikoplazma hominis 	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 07:06:53.166	2026-04-08 07:06:53.166	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
9aae56e0-b7c4-494e-92a3-4d96f8fce1f0	Ureaplazma (sifat)	Уреаплазма (качество)	Ureaplazma (quality)	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 07:08:26.765	2026-04-08 07:08:26.765	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a33d3a1f-b694-459f-b87b-6ecf9a0f392f	Epshteyn-Bar virusi (sifat) 	Вирус Эпштейна-Барра (качество)	Epshteyn-Bar (quality)	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	180000	180000	220000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 07:10:07.673	2026-04-08 07:10:07.673	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
c8ac347f-385c-4676-9ee1-45b583b4d9eb	Gardnerella (sifat)	Гарднерелла (качество)	Gardnerella (quality)	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 07:13:58.409	2026-04-08 07:13:58.409	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
55ee3dcb-dc04-4c7e-85f8-ac8524f5ccf3	Papilloma virusi (VPCH) 16,18 tip (sifat)	ВПЧ 16,18 типы (качество) 	Quality	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 07:20:51.443	2026-04-08 07:20:51.443	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Toshmalar"], "symptoms": [], "preventive": "", "mandatoryFor": ["So'gallar"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
27157035-2161-4dda-8bc4-1cee17977203	Papiloma virusi (VPCH)  6-11 tip (sifat)	ВПЧ (6,11 типы) 	Quality	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	320000	320000	400000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 07:17:53.745	2026-04-08 07:21:47.966	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["So'gallar"], "symptoms": [], "preventive": "", "mandatoryFor": ["toshmalar"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
25bdf4d9-8e40-4835-9a74-04b3c42fd8a8	Papilloma virusi titri - 16,18,31,33,35,3945,51,52,56,58,59 (miqdor)	ВПЧ - 16,18,31,33,35,3945,51,52,56,58,59 (количество)	Papilloma - 16,18,31,33,35,3945,51,52,56,58,59 (quantity)	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	240000	240000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 07:26:02.329	2026-04-08 07:26:02.329	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
4d4d12e1-d471-47c2-bec2-f0ea04dee5db	Candida (sifat)	Кандида (качество)	Candida albikans (quality)	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 07:28:03.219	2026-04-08 07:28:03.219	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
df2275c4-9ad7-4520-ac64-08d1944d6355	Sil mikobakteriyasi (sifat) 	Туберкулез (качество)	Tuberculosis (quality)	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	320000	320000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 17:00:24.292	2026-04-08 17:00:24.292	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
2ce1fe92-03c9-4a74-b756-9636c5527a3a	Mikoplazma pnevmoniya (sifat)	Микоплазма пневмония (качество) 	Mikoplazma pnevmoniya 	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	290000	290000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 17:02:05.382	2026-04-08 17:02:05.382	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
ed9a1056-6f71-4fea-8d2f-5cb52943887d	Trihomona vaginalis (sifat) 	Трихомона (качество) 	Trihomona vaginalis 	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	160000	160000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 17:04:06.355	2026-04-08 17:04:06.355	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
7f958c04-e4e1-469d-b55f-4711e98fdf4d	Hlamidiya pnevmoniya (sifat)	Хламидия пневмония (качество) 	Hlamidiya pnevmoniya 	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	290000	290000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 17:08:04.622	2026-04-08 17:08:04.622	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
fe041cd5-f532-4f45-8ee6-f98ffebcd963	Helikobakter pilori (sifat) 	Хеликобактер пилори (качество)	Helikobakter pilory	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	290000	290000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 17:10:12.674	2026-04-08 17:10:12.674	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
64485b88-ce22-466a-87c1-181ad0b03aea	Suvchechak va o'rab oluvchi temiratki virusi  (sifat) 	Вирус ветряной  оспы и опоясывающего лишая (качество)	Quality	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	320000	320000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 17:13:16.149	2026-04-08 17:13:16.149	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
e36709b8-6cfb-4651-b9c1-bf1cd4da4a54	Gerpes, 6 -tip (sifat)	Герпес человека (качество) 	Gerpes, 6 (quality)	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	300000	300000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 17:15:17.216	2026-04-08 17:15:17.216	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
09ea130c-2e67-41d9-92a0-f533e0ea3dea	Gerpes, 8 -tip (sifat)	Герпес человека 8	Gerpes, 8	596ad7df-5e8d-4112-994e-0470f029f2d8	\N	\N	300000	300000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 17:16:15.704	2026-04-08 17:16:15.704	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
1468c1a2-b328-4706-bb72-ab5485e01189	Ahlatda gijja qurtlarining tahlili	Aнализ на яйца глистов	helminth eggs	34d79946-2e85-4a75-842c-74a1b06e0152	\N	\N	60000	60000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-08 17:21:50.638	2026-04-08 17:22:18.859	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
3d4f1309-e8ab-42e9-80f3-c18ee7181217	Ahlatda pankreatik elastaza-1 (sifat)	Панкреатическая эластаза 1	Elastaza	34d79946-2e85-4a75-842c-74a1b06e0152	\N	\N	310000	310000	400000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 01:50:08.895	2026-04-09 01:50:08.895	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
18353b8b-67fd-485e-9706-33a1fa490691	Kalprotectin 	Кальпротектин	Kalprotectin 	34d79946-2e85-4a75-842c-74a1b06e0152	\N	\N	310000	310000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 01:51:32.582	2026-04-09 01:51:32.582	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
fdfabf2f-8918-4470-99d1-3b060d690acb	Ahlatda  yashirin  qon	Скрытая  кровь в кале	Quality	34d79946-2e85-4a75-842c-74a1b06e0152	\N	\N	100000	100000	120000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 01:53:04.487	2026-04-09 01:53:04.487	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
bba8142a-6471-40bc-9d0c-efee94b67176	Helikobakter Piloriga  ahlatda  antigen (sifat)	Антиген  к HP (качество)	Quality	34d79946-2e85-4a75-842c-74a1b06e0152	\N	\N	120000	120000	120000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 01:55:24.666	2026-04-09 01:55:24.666	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
e5f2e8bb-8caa-4c11-8660-48551191aefc	Ahlatda Lactoferrin 	Лактоферрин	Lactoferrin (quality)	34d79946-2e85-4a75-842c-74a1b06e0152	\N	\N	540000	540000	580000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 01:56:50.16	2026-04-09 01:56:50.16	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
9ab4bd6d-a164-4883-89b5-396c433bbccc	Ahlatda  neytrofil elastaza-2	Нейтрофильная  эластаза 2 	Neytrofil elastaza-2 (quality)	34d79946-2e85-4a75-842c-74a1b06e0152	\N	\N	540000	540000	580000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 01:58:45.087	2026-04-09 01:58:45.087	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
5295646d-2de7-4b5b-9332-cb14ab13529f	Ahlatda transglutaminazaga antitana 	Антитела к трансглютаминазе	Quality	34d79946-2e85-4a75-842c-74a1b06e0152	\N	\N	540000	540000	580000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 02:01:06.021	2026-04-09 02:01:06.021	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
6bdc631d-9174-4a39-a04d-8e051bbe2759	Ahlatda  alfa1 antitripsin	Альфа 1  антитрипсин	alfa1 antitripsin	34d79946-2e85-4a75-842c-74a1b06e0152	\N	\N	640000	640000	680000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 02:03:32.528	2026-04-09 02:03:32.528	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
34e27ac7-c24c-470b-a843-73485f28c5db	Ahlatda  gliadinga  antitana	Антитела  к глиадину в кале	Quality	34d79946-2e85-4a75-842c-74a1b06e0152	\N	\N	480000	480000	520000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 02:04:43.273	2026-04-09 02:04:43.273	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
e786c65c-84e7-4a07-af62-c13142d82682	Zonulin 	Зонулин	Zonulin 	34d79946-2e85-4a75-842c-74a1b06e0152	\N	\N	1250000	1250000	1300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 02:06:04.707	2026-04-09 02:06:04.707	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
0575148f-9260-4921-8282-23291d3e89d9	Ahlatda  kampilobakter	Кампилобактер	Campilobakter	34d79946-2e85-4a75-842c-74a1b06e0152	\N	\N	480000	480000	520000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 02:07:36.252	2026-04-09 02:07:36.252	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
ea1dc821-538a-4139-bfef-96db155baed7	Ahlatda Eozinofil neyrotoksin	ЭН	Eozinofil neyrotoksin	34d79946-2e85-4a75-842c-74a1b06e0152	\N	\N	740000	740000	800000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 02:09:07.576	2026-04-09 02:09:07.576	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
f8a7a25c-cfb2-4a9a-a0d6-0c83d9e62c07	Siydik umumiy tahlili	Общий анализ мочи	General Urine Analysis	e2126e21-9b14-4d7d-b2a8-50221edd6209	Siydik tahlili (Umumiy Tahlillar) bo'yicha laboratoriya tahlili.	\N	50000	50000	100000	15	2	\N	\N	Siydik	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.404	2026-04-09 09:37:51.9	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
0d559967-f1d0-4afe-ad36-28ddeb4b7a64	Siydikning Nechiporenko tahlilli	Анализ мочи по Нечипоренко	Urine test by N	e2126e21-9b14-4d7d-b2a8-50221edd6209	Siydikning biokimyoviy tahlillari bo'yicha laboratoriya tahlili.	\N	60000	50000	80000	20	4	\N	\N	Siydik	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.333	2026-04-09 09:39:21.896	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
68a78f14-f26f-433c-af2c-7f858d0003b1	Siydik 2 stakanli sinamasi	2х стакановая проба мочи	2 	e2126e21-9b14-4d7d-b2a8-50221edd6209	Siydik tahlili (Sitologik Tekshiruv) bo'yicha laboratoriya tahlili.	\N	80000	60000	100000	20	24	\N	\N	Siydik	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.336	2026-04-09 09:42:53.88	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
8dcb9897-6afa-4005-b606-74b6e77b61ae	Siydik 3 stakanli sinamasi	3х стаканная проба мочи	3	e2126e21-9b14-4d7d-b2a8-50221edd6209	\N	\N	80000	80000	120000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 09:44:49.441	2026-04-09 09:44:49.441	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
2029f4b9-2819-42eb-bad3-717e34203e56	Siydikning 4 stakanli sinamasi 	4х  стакановая  проба мочи	4	e2126e21-9b14-4d7d-b2a8-50221edd6209	\N	\N	120000	120000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 09:48:01.122	2026-04-09 09:48:01.122	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
9053ce76-017f-458a-ac23-f12bb0ef5a67	Siydikda aceton	Ацетон  в моче	Ketones in urine 	e2126e21-9b14-4d7d-b2a8-50221edd6209	\N	\N	60000	60000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 09:51:55.338	2026-04-09 09:51:55.338	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
31c4095d-dd27-4465-8954-8ca6c1d9b36c	Sutkalik siydikdagi oqsil miqdori	Oбщий белок (суточная)	Total protein	e2126e21-9b14-4d7d-b2a8-50221edd6209	\N	\N	60000	60000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 12:09:30.841	2026-04-09 12:09:30.841	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
cbbeca16-cdb1-4759-87a7-46ce5dd2c5b6	Siydikdagi albumin  miqdori (1 porciya)	Альбумин в  моче (1 порция)	Quantity	e2126e21-9b14-4d7d-b2a8-50221edd6209	\N	\N	60000	60000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 12:13:41.369	2026-04-09 12:13:41.369	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
25dfa1cc-9f97-4a45-9b8c-bcf20c8941d4	Alfa-amilaza (Diastaza) 	Альфа-амилаза	Amilase	e2126e21-9b14-4d7d-b2a8-50221edd6209	\N	\N	60000	60000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 12:15:33.091	2026-04-09 12:15:33.091	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
b681d469-f2b3-4065-afbb-0132bb146222	Glukoza (sutkalik siydikda) 	Глюкоза	Quantity	e2126e21-9b14-4d7d-b2a8-50221edd6209	\N	\N	60000	60000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 12:16:54.996	2026-04-09 12:16:54.996	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
130c5567-6bad-417a-8502-cb94e51f71d1	Kreatinin (1 porciya) 	Kreatinin 	Kreatinin 	e2126e21-9b14-4d7d-b2a8-50221edd6209	\N	\N	60000	60000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 12:17:59.07	2026-04-09 12:17:59.07	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
ebc19929-7397-4a36-b0ba-7c4fb4b82595	Kalciy (1 porciya siydikda) 	Kalciy	Kalciy	e2126e21-9b14-4d7d-b2a8-50221edd6209	\N	\N	60000	60000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 12:19:35.754	2026-04-09 12:19:35.754	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
569c2e4f-4f16-49d7-88f7-08b52bf1bc20	Siydik kislotasi 	Мочевая  кислота	Quantity	e2126e21-9b14-4d7d-b2a8-50221edd6209	\N	\N	60000	60000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 12:20:38.01	2026-04-09 12:20:38.01	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a99471a7-1400-452b-9ca5-d52f96d442cb	Spermogramma (VOZ bo'yicha, 2010)	Спермограмма	Spermogramma	1c1b82ce-9dc6-49b4-b79a-bd3ca6db5307	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 12:45:32.931	2026-04-09 12:45:32.931	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
452ffd4e-74a9-4ab3-a61a-c67b69c391c5	Spermogramma (Kruger bo'yicha)	Спкрмограмма	Spermogramma 	1c1b82ce-9dc6-49b4-b79a-bd3ca6db5307	\N	\N	250000	250000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 12:47:21.723	2026-04-09 12:47:21.723	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Zaiflik"], "symptoms": ["Impotenciya"], "preventive": "", "mandatoryFor": ["Charchash"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
cf7d3fda-704c-4b23-9412-faaf63d6841a	Prostata shirasi tahlili	Анализ секрета простаты	Quantity	1c1b82ce-9dc6-49b4-b79a-bd3ca6db5307	\N	\N	80000	80000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 12:49:55.524	2026-04-09 12:49:55.524	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Farzandsiz"], "symptoms": ["40+"], "preventive": "", "mandatoryFor": ["Qariya"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
0261f667-2fd7-4ea3-9f4d-44ba16a85cc7	Spermatazoidlar  DNK fragmentaciyasi	ДНК Фрагментация сперматазоидов 	Quantity	1c1b82ce-9dc6-49b4-b79a-bd3ca6db5307	\N	\N	1300000	1300000	1500000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 12:52:54.837	2026-04-09 12:52:54.837	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Qariyalar"], "symptoms": ["40+"], "preventive": "", "mandatoryFor": ["Farzandsiz"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a027b873-88e7-46ca-aff1-9025cea67874	Mar-test IgA	Mar-test IgA	Mar-test IgA	1c1b82ce-9dc6-49b4-b79a-bd3ca6db5307	\N	\N	250000	250000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 12:54:08.636	2026-04-09 12:54:08.636	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
8bc87303-5c10-438b-8ca2-89070876ea03	Mar-test IgM	Mar-test IgM	Mar-test IgM	1c1b82ce-9dc6-49b4-b79a-bd3ca6db5307	\N	\N	250000	250000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 12:54:43.161	2026-04-09 12:54:43.161	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
b13dbfbf-2359-49e7-bd54-4de9f4e8a362	Koagulogramma skrining (PTV, PTI, MNO, ACHTV, fibrinogen, TV)	Скрининг коагулограмма	Short coagulogramm	a52815ee-83b7-48a3-b916-f8315195d3ff	\N	\N	100000	70000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 16:58:16.472	2026-04-09 16:58:16.472	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
8944ad15-a587-48c3-bfd1-bb7e88b8c918	Kengaytirilgan koagulogramma (PTV, PTI, MNO, ACHTV, fibrinogen, TV, AT III, D-dimer)	Коагулограмма расширенная	Wide coagulogramm	a52815ee-83b7-48a3-b916-f8315195d3ff	\N	\N	300000	200000	450000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 17:01:06.979	2026-04-09 17:01:06.979	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
eb2a8e4c-9e12-47e8-b428-b670aca70da1	D-dimer	D-dimer	D-dimer	a52815ee-83b7-48a3-b916-f8315195d3ff	\N	\N	155000	155000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-09 17:02:28.028	2026-04-09 17:02:28.028	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
7d17f387-c733-4c7d-a7fd-8a7c6706a433	Fibrinogen	Фибриноген	Fibrinogen	a52815ee-83b7-48a3-b916-f8315195d3ff	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 00:35:25.062	2026-04-10 00:35:25.062	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
18c79c86-a1cb-4871-8aad-7c08334c7956	Trombin  vaqti	Тромбиновое время	Thrombin time  	a52815ee-83b7-48a3-b916-f8315195d3ff	\N	\N	55000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 00:36:54.223	2026-04-10 00:36:54.223	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
8274f7b4-637c-4de6-97be-680b920849bf	ACHTV	АЧТВ	ACHTV	a52815ee-83b7-48a3-b916-f8315195d3ff	\N	\N	55000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 00:37:58.258	2026-04-10 00:37:58.258	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
d939b96b-2fc7-424f-84e8-99bdfb9c3ffd	Volchanochniy anticoagulant (LA-1, LA-2)	Volchanochniy anticoagulant (LA-1, LA-2)	Volchanochniy anticoagulant (LA-1, LA-2)	a52815ee-83b7-48a3-b916-f8315195d3ff	\N	\N	240000	240000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 00:42:07.668	2026-04-10 00:42:07.668	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
2d4b4481-2ed5-49e4-a878-d92161d3ad7a	Antitrombin III	Antitrombin III	Antitrombin III	a52815ee-83b7-48a3-b916-f8315195d3ff	\N	\N	150000	140000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 00:38:39.103	2026-04-10 00:42:40.253	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
e4aea48d-bb72-4bb5-9701-44dd1dc89996	Protein S	Protein S	Protein S	a52815ee-83b7-48a3-b916-f8315195d3ff	\N	\N	500000	480000	550000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 00:44:02.614	2026-04-10 00:44:02.614	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
62c13094-c397-4864-aa85-139e6d09e32c	Protein C	Protein C	Protein C	a52815ee-83b7-48a3-b916-f8315195d3ff	\N	\N	500000	480000	550000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 00:44:44.389	2026-04-10 00:44:44.389	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
0b330194-8efe-469f-94ce-745c60c1469d	Anti XA aktivlik 	Анти ХА активность	Anti XA aktivity	a52815ee-83b7-48a3-b916-f8315195d3ff	\N	\N	500000	480000	550000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 00:46:26.496	2026-04-10 00:46:26.496	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
877a689b-a748-4497-9977-01bbe9fa5c88	Trombocitlar  agregatciyasi	Агрегация тромбоцитов	TA	a52815ee-83b7-48a3-b916-f8315195d3ff	\N	\N	500000	480000	550000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 00:49:35.494	2026-04-10 00:49:35.494	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
b42c4e99-318c-4a3e-acfb-72c65ee0ecf6	Trigceridlar	Триглицериды	Triglycerides	4abb0c15-e25e-4111-86a4-5126c1f3faf3	\N	\N	50000	50000	60000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 00:55:34.824	2026-04-10 00:55:34.824	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a870fc4e-9d2c-4aef-a47f-6a451efa0d68	Holesterin (umumiy)	Холестерин 	Cholesterol total	4abb0c15-e25e-4111-86a4-5126c1f3faf3	\N	\N	50000	50000	60000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 00:56:45.503	2026-04-10 00:56:45.503	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
dc94c5d2-28e0-4ad5-b9a0-b17f46607daa	Yuqori zichlikdagi holesterin	Липопротеиды  высокой плотности	HDL	4abb0c15-e25e-4111-86a4-5126c1f3faf3	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 01:00:18.029	2026-04-10 01:00:18.029	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
82d3685b-0ca2-43a4-9d4e-b718a512d378	Past  zichlikdagi holesterin	Липопротеиды  низкой плотности	LDL Cholesterol	4abb0c15-e25e-4111-86a4-5126c1f3faf3	\N	\N	50000	50000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 01:01:50.521	2026-04-10 01:01:50.521	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
e797b672-5b89-4119-ac02-6c7900db9b99	Lipidogramma (past, o'ta past  va yuqori zichlikdagi holesterin, Triglecerid, umumiy holesterin va Aterogenlik indeksi)	Липидограмма (6  показателей)	Lipidogramm	4abb0c15-e25e-4111-86a4-5126c1f3faf3	\N	\N	160000	160000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 01:05:47.904	2026-04-10 01:05:47.904	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
763a14ad-316c-4a90-99a0-0924812e3563	Lipoprotein (a)	Липопротеин	Lipoprotein (a)	4abb0c15-e25e-4111-86a4-5126c1f3faf3	\N	\N	240000	240000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 01:06:58.853	2026-04-10 01:06:58.853	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
000863e2-ce21-431c-a64d-ed6864fe1f73	Apolipoprotein AI	Apolipoprotein AI	Apolipoprotein AI	4abb0c15-e25e-4111-86a4-5126c1f3faf3	\N	\N	240000	240000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 01:08:03.303	2026-04-10 01:08:03.303	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
3d76101d-8a56-403b-ab2e-abaee4287527	Apolipoprotein B	Apolipoprotein B	Apolipoprotein B	4abb0c15-e25e-4111-86a4-5126c1f3faf3	\N	\N	240000	240000	240000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 01:08:30.354	2026-04-10 01:08:30.354	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
4001e999-dbe7-4aca-b859-9d8ef24b8123	Umumiy oqlsil	Общий белок	Total protein	4879a86c-b315-40c6-a648-56d277d6137c	\N	\N	50000	50000	80000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 01:27:52.741	2026-04-10 01:27:52.741	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
d51873eb-cb1f-4111-8834-27f28c3962be	Albumin qonda	Albumin 	Albumin	4879a86c-b315-40c6-a648-56d277d6137c	\N	\N	50000	50000	80000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 01:29:10.213	2026-04-10 01:29:10.213	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
48143988-f2fe-4fad-87b0-a8e28e32b90d	Qonda kompleks oqsillar miqdori (umumiy, albumin va globulin)	Комплекс белков в крови	Quantity	4879a86c-b315-40c6-a648-56d277d6137c	\N	\N	85000	85000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 01:31:24.295	2026-04-10 01:31:24.295	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
5e7bbbe3-9bf0-412a-a1b7-65c8517aab77	Gomocistein	Gomocistein	Gomocistein	4879a86c-b315-40c6-a648-56d277d6137c	\N	\N	300000	200000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 02:17:36.486	2026-04-10 02:17:36.486	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
d69ee62f-1f9d-4782-aa40-269473708815	Timol sinamasi	Тимоловая  проба	Timol test	4879a86c-b315-40c6-a648-56d277d6137c	\N	\N	60000	60000	80000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 02:18:37.359	2026-04-10 02:18:37.359	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
542dc1b3-a305-48d9-bc12-eb887d1e3ed6	Ceruloplazmin	Цепулоплазмин	Coeruloplazmin	4879a86c-b315-40c6-a648-56d277d6137c	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 02:20:30.41	2026-04-10 02:20:30.41	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
bf8c532d-4f8d-46b7-8b9f-55a47af7c6a2	Gaptoglobin	Gaptoglobin	Haptoglobin	4879a86c-b315-40c6-a648-56d277d6137c	\N	\N	240000	240000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 02:21:06.38	2026-04-10 02:21:06.38	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
012e1e9d-9bc0-4b30-a6df-e887fbe62030	C reaktiv oqsil (CRB)	С реактивный белок (СРБ)	Half quantity	f8d55b53-8c40-450e-ae56-8484d788fc28	Mikroskopik teri tekshiruvlari bo'yicha laboratoriya tahlili.	\N	50000	50000	120000	20	4	\N	\N	Teri qirindilar	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.363	2026-04-10 02:26:10.673	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
87d435ca-b80e-4437-bf09-c3df7504a851	ASL-O (miqdoriy)	АСЛО (количественный)	Quantity	f8d55b53-8c40-450e-ae56-8484d788fc28	\N	\N	70000	70000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 02:29:28.726	2026-04-10 02:29:28.726	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
32c456de-7e8b-4d00-9126-0bdf0327ce8b	Revmatoid omil (miqdoriy)	Ревматоидный  фактор (количественный)	RF	f8d55b53-8c40-450e-ae56-8484d788fc28	\N	\N	70000	70000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 02:30:43.92	2026-04-10 02:30:43.92	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
cea35ee0-94bd-4495-91b6-d7bbf3570348	СRB oqsil (miqdoriy) 	С реактивный белок (количественный)	Quantity	f8d55b53-8c40-450e-ae56-8484d788fc28	\N	\N	70000	70000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 02:33:33.006	2026-04-10 02:33:33.006	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a44c82ac-51db-4368-b1a9-4a5f1a2c0150	Procalcitonin	Procalcitonin	Procalcitonin	f8d55b53-8c40-450e-ae56-8484d788fc28	\N	\N	250000	250000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 02:34:14.975	2026-04-10 02:34:14.975	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
79ca0cd0-2fe8-41e3-b4f8-c4b969a01e1e	D vitamin (25-OH, umumiy) 	D vitamin 	D vitamin 	43540a37-d12c-41e3-9307-b7e16f1224c7	\N	\N	210000	210000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 02:37:18.254	2026-04-10 02:37:18.254	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
fe4738d0-42d0-4530-9d3c-04683ba9962c	Osteokalcin	Osteokalcin	Osteokalcin	43540a37-d12c-41e3-9307-b7e16f1224c7	\N	\N	300000	200000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 02:38:17.542	2026-04-10 02:38:17.542	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
93a385f5-83c3-4c3b-b0ee-e86924c15f87	Beta Cross Laps 	Beta Cross Laps 	Beta Cross Laps 	43540a37-d12c-41e3-9307-b7e16f1224c7	\N	\N	300000	300000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 02:39:05.396	2026-04-10 02:39:05.396	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
bce62a90-06f1-4771-9347-9546264c2167	Vitamin A	Vitamin A	Retinol	1908bae5-f54f-459a-b526-7f3c6badf7fc	\N	\N	490000	490000	550000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 03:38:44.847	2026-04-10 03:38:44.847	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
bb3fc1cb-fa8a-4601-93fa-563f14cc14f2	Vitamin B6 (piridoksin)	Vitamin B6 	(piridoksin)	1908bae5-f54f-459a-b526-7f3c6badf7fc	\N	\N	350000	350000	400000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 03:41:37.671	2026-04-10 03:41:37.671	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
315c3181-e55e-482a-99f4-7375168c552b	Vitamin B1	Vitamin B1	Tiamin	1908bae5-f54f-459a-b526-7f3c6badf7fc	\N	\N	480000	480000	550000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 03:42:40.644	2026-04-10 03:42:40.644	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
9da119f7-e891-47f3-9110-0280b511a445	Qon kislota-ishqor  holatini  tekshirish	КЩС (кислотно-щелочное  состояние крови)	Quantity	b2ef5ee6-3564-4a6e-9c41-65053aed4bd6	\N	\N	300000	300000	400000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 03:45:43.829	2026-04-10 03:45:43.829	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
150142eb-c571-473e-bf59-0adea12f2706	Triyodtironin umumiy (T3)	Triyodtironin total (T3)	Triyodtironin  total (T3)	8df81fd5-88f7-4363-85e2-b7e9f214362b	Qondagi Gormonlarni Tekshirish bo'yicha laboratoriya tahlili.	\N	85000	85000	150000	30	8	\N	\N	Venoz qon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.426	2026-04-10 03:58:17.645	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a8e959a8-c930-4595-86a7-d03a048f6930	Erkin triyodtironin (FT3)	свободный трийодтиронин	FT3	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	85000	85000	100000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 04:00:26.611	2026-04-10 04:00:26.611	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
0d239a8e-2caf-4084-b715-e40bef5d8f1f	Tiroksin umumiy (T4)	Общий  тироксин	Tiroksin total	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	85000	85000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 04:01:32.856	2026-04-10 04:01:32.856	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
0322f270-a821-420d-bef1-0914bc52c602	Tiroksin erkin (FT4)	свободный  тироксин 	Tiroksin total (FT4)	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	85000	85000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 04:03:04.409	2026-04-10 04:03:04.409	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
bc32770f-f4b1-4358-b531-39d4af4b905a	Tireoglobulinga antitana (AT-TG)	Антитела к тиреоглобулину	A-TG	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	95000	95000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 06:01:49.505	2026-04-10 06:01:49.505	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
2fad11ef-1ec3-47c6-9f22-7be8b94d20b1	Tireoglobulin (TG)	Tireoglobulin (TG)	Tireoglobulin (TG)	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	180000	180000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 07:29:37.106	2026-04-10 07:29:37.106	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
be6eb711-0b42-4043-940f-1e1fccf8191d	TTG receptoriga antitana	Антитела  к рецепторам ТТГ	Quality	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	250000	250000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 07:31:20.398	2026-04-10 07:31:20.398	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
2c8c96d6-9ce0-4ff6-a781-b211b5962472	Calcitonin	Calcitonin	Calcitonin	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	195000	195000	195000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 07:36:01.029	2026-04-10 07:36:01.029	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
ac69e5b9-f09e-41d6-bff9-1aac14df41cc	Follikula stimullovchi gormon (FSG) 	ФСГ	FSН	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	85000	85000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 07:47:56.663	2026-04-10 07:47:56.663	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
992b6380-8465-4e3b-9507-0851680e4552	Luteinlovchi gormon (LG)	Лютеинизирующий гормон (ЛГ)	LH	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	85000	85000	120000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 07:49:29.094	2026-04-10 07:49:29.094	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
1041d9a1-0c8b-4813-91d8-9489ca224fca	Prolactin	Prolactin	Prolactin	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	85000	85000	120000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 07:50:37.661	2026-04-10 07:50:37.661	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
88ab23cb-b400-4fed-bc45-952119dcf7fa	Somatotrop gormon	Соматотропный гормон	Somatotroph hormones	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	115000	115000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 07:55:12.889	2026-04-10 07:55:12.889	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
408a4587-e255-4ef7-82b5-5d099b77290f	Somatomedin C	Somatomedin C	Somatomedin C	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	210000	210000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 07:56:14.456	2026-04-10 07:56:14.456	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
53c14069-a439-41eb-873a-38098c3e49df	Protein 3 	Protein 3	Protein 3	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	420000	420000	450000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 07:58:30.92	2026-04-10 07:58:30.92	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
88c6b3f8-eb06-4401-a014-b3c26dc1c0ec	Progesteron 	Progesteron 	Progesteron 	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	85000	85000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 08:03:08.992	2026-04-10 08:03:08.992	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
02403d8c-abb9-432f-a59d-0e32be70718f	Estradiol	Estradiol	Estradiol	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	85000	85000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 11:30:47.904	2026-04-10 11:30:47.904	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
2019efe2-ba35-456f-8479-be0c7e42f1d6	Testosteron 	Testosteron 	Testosterone	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	95000	95000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 11:32:06.995	2026-04-10 11:32:06.995	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
24d026bf-02ad-4048-baeb-fb5ce6f5828b	Erkin Testosteron 	Testosteron 	Free Testosterone	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	105000	105000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 11:32:43.098	2026-04-10 11:32:43.098	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
8788e71d-b7a7-4f2e-87a0-55227ecf3fe9	Degidroepiandrocteron-sulfat (DEA-S04)	Degidroepiandrocteron-sulfat 	DEA-S04	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	105000	105000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 11:35:21.318	2026-04-10 11:35:21.318	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
66637186-2627-4026-a3ba-5b34e5f6ea02	Globulin (jinsiy gormonlarni bog'lovchi) 	Глобулин связывающий половые гормоны	Globulin 	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	100000	100000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 11:38:15.411	2026-04-10 11:38:15.411	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
e267210e-60e0-4aba-9224-6669daf6b885	17-OH Progesteron	17-OH Progesteron	17-OH Progesteron	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	100000	100000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 11:40:06.423	2026-04-10 11:40:06.423	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
24b7d471-eb13-431f-9dc5-3cabb2c8274b	Androstendion	Androstendion	Androstendion	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	240000	240000	280000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 11:40:54.323	2026-04-10 11:40:54.323	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
9d452607-2226-4cdc-8c3f-7a3534939cd6	Digidrotestosteron	Digidrotestosteron 	Digidrotestosteron (DHT)	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	180000	180000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 11:42:14.577	2026-04-10 11:42:14.577	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
0828046f-b475-43d8-ad7d-26b46a780e9a	Erkin androgenlar indeksi	Индекс свободных андрогенов	Index free androgens	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	215000	215000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:25:32.505	2026-04-10 15:25:32.505	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
f1d6456d-6ab8-4108-893e-220ae513adc5	Adrenokortikotrop gormoni 	АКТГ	Adrenokortikotropic hormons	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	125000	125000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:27:06.785	2026-04-10 15:27:06.785	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
ae7293f2-4ad3-4ed6-9d86-9a26180429d1	Qonda Kortizol 	Кортизол	Сortizol	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	100000	100000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:29:38.933	2026-04-10 15:29:38.933	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
bb7c7d87-5d9f-44ab-9e71-c81160855031	Erkin Kortizol  (sutkalik siydikda) 	Свободный кортизол	Free cortizol	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	105000	105000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:31:59.418	2026-04-10 15:31:59.418	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
4c40be83-1ae0-49a1-b0f3-c9238b8ab7c2	Antimuller gormoni	Антимюллеров гормон	AMH	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	250000	250000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:37:16.234	2026-04-10 15:37:16.234	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
39ffc7de-3dee-47c6-82ef-9c83b4204aa6	Ingibin B	Ingibin B	Ingibin B	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	350000	350000	400000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:38:11.839	2026-04-10 15:38:11.839	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
de951e7c-c901-46ad-b761-43dd8f0d32ab	Paratireoid (Paratgormon) gormon	Paratireoid gormon	Parathireoid hormons	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	170000	170000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:40:10.439	2026-04-10 15:40:10.439	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
f7891d1d-48eb-4185-a765-bed0ccda3626	Qonda renin (aktiv, bevosita)	Активный  ренин	Renin 	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	170000	170000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:41:30.633	2026-04-10 15:41:30.633	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
882e271e-6031-4506-a138-11722f66e430	Aldosteron	Aldosteron	Aldosteron	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	170000	170000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:42:11.383	2026-04-10 15:42:11.383	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
f96545ed-791f-49d9-9a30-62ae7e556592	Angiotenzin I	Angiotenzin I	Angiotenzin I	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	450000	450000	500000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:42:56.478	2026-04-10 15:42:56.478	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
1e7f5856-1cd7-4f75-8519-5e614e14700a	Angiotenzin II	Angiotenzin II	Angiotenzin II	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	450000	450000	500000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:43:24.304	2026-04-10 15:43:24.304	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
7df69d4c-0429-4df5-b157-a69d58ddbf21	Metanefrin 	Metanefrin 	Metanefrin 	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	460000	460000	500000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:56:28.999	2026-04-10 15:56:28.999	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
382f0350-1f97-4246-8803-3e791f3d3625	Normetanefrin 	Normetanefrin 	Normetanefrin 	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	460000	460000	500000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:56:58.399	2026-04-10 15:56:58.399	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
d9fa188b-7b0b-4608-b8fa-2b84142b0914	Adrenalin	Adrenalin	Adrenalin	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	460000	460000	500000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:57:41.657	2026-04-10 15:57:41.657	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
39c50141-c976-4a7d-a385-8a3c076ca281	Noradrenalin	Noradrenalin	Noradrenalin	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	460000	460000	500000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:58:16.578	2026-04-10 15:58:16.578	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a0a20245-bc0e-4f00-af9c-ea2532544405	Dofamin 	Dofamin 	Dofamin 	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	460000	460000	500000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:58:54.475	2026-04-10 15:58:54.475	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a9b13970-4a1f-4285-8d2a-d7ba040e5756	Serotonin	Serotonin	Serotonin	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	500000	500000	550000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 15:59:38.707	2026-04-10 15:59:38.707	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
ac5b8c83-8028-486b-831f-fe070ca7d6af	Melatonin plazmada 	Melatonin 	Melatonin 	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	550000	550000	600000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 16:00:31.068	2026-04-10 16:00:31.068	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
28f114d9-169f-4f9e-a0e4-6c6037762f31	Leptin 	Leptin 	Leptin 	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	250000	250000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 16:01:01.455	2026-04-10 16:01:01.455	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
bf497a83-4437-4cf6-bab6-2ab1ac36fdb0	Antidiuretik  gormon (vazopressin)	Антидиуретический гормон	ADH	8df81fd5-88f7-4363-85e2-b7e9f214362b	\N	\N	550000	550000	600000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 16:02:42.608	2026-04-10 16:02:42.608	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
9dc51f02-d1ca-4aef-812c-e222eb2f6740	Insulin (och qoringa)	Инсулин натощак	Insulin	4bf2b086-8aff-4731-84a3-35e2270a7a22	\N	\N	110000	110000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 16:08:48.048	2026-04-10 16:08:48.048	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
2db2129e-b6ef-4430-876e-7a404af00db9	Insulin (to'q qoringa) 	Insulin (после нагрузки	Insulin	4bf2b086-8aff-4731-84a3-35e2270a7a22	\N	\N	110000	110000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 16:10:04.023	2026-04-10 16:10:04.023	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
8fb28195-d40b-4bbd-a6b2-0bcaf5d1139a	Qonda glukoza (och qoringa)	Глюкоза натощак 	glucose 	4bf2b086-8aff-4731-84a3-35e2270a7a22	\N	\N	50000	50000	80000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 16:12:04.425	2026-04-10 16:12:04.425	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
b93f0e95-a0e7-429e-8377-f5430185ccef	Glukosa (to'q qoringa)	Глюкоза после нагрузки	Glucose	4bf2b086-8aff-4731-84a3-35e2270a7a22	\N	\N	50000	50000	70000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 16:13:44.194	2026-04-10 16:13:44.194	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
9a002a1c-45db-4719-915a-8a7e6d594c42	Insulinrezistentlikni baholash (glukoza va insulin och qoringa, HOMA-ir indeksi)	Инсулинорезистентность	Инсулинорезистентность	4bf2b086-8aff-4731-84a3-35e2270a7a22	\N	\N	140000	140000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 16:16:27.64	2026-04-10 16:16:27.64	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
62152d80-f670-45eb-ab09-6c69257ad54b	Glikirlangan gemoglobin	Гликированный гемоглобин	Glicated hemoglobin	4bf2b086-8aff-4731-84a3-35e2270a7a22	\N	\N	110000	110000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 16:18:42.666	2026-04-10 16:18:42.666	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
4eb8e003-2015-42be-a3ea-48f02afea768	C-Peptid (och qoringa)	C-peptid (натощак)	С-peptid	4bf2b086-8aff-4731-84a3-35e2270a7a22	\N	\N	120000	120000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 16:20:38.141	2026-04-10 16:20:38.141	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a5101156-9cf5-4477-8de1-aa9a1c688895	C-peptid (to'q qoringa)	C-peptid 	C-peptid 	4bf2b086-8aff-4731-84a3-35e2270a7a22	\N	\N	120000	120000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-10 16:21:55.593	2026-04-10 16:21:55.593	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
3173bf89-c1fa-4d36-91a9-67e5edfa7550	POZITRON-EMISSION TOMOGRAFIYA (PET/KT)	Позитронно-эмиссионная томография (ПЭТ/КТ)	Positron Emission Tomography (PET/CT)	f0260cec-b802-4898-8264-f337b0536e4e	POZITRON-EMISSION TOMOGRAFIYA (PET/KT) bo'yicha laboratoriya tahlili.	\N	7600000	7600000	10000000	90	24	\N	\N	Butun tanani  tekshiruvi 	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.312	2026-04-11 06:44:56.93	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["onkologik  kasalliklar "], "symptoms": ["Onkologiya"], "preventive": "", "mandatoryFor": ["Qariyalar", "onkologik  kasalliklar "]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
36fb0529-a8f8-475e-bfab-d3ccf3744735	Qorin  bo'shligi yuqori qavati MSKT	МСКТ верхнего этажа брюшной полости	KT	9b557738-0632-4ee4-8926-ee5f766d3fac	\N	\N	300000	300000	10000000	15	24	\N	\N	Tana qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 07:02:08.009	2026-04-11 07:02:08.009	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Turli kasalliklar "], "symptoms": ["Turli  sabablar"], "preventive": "", "mandatoryFor": ["Travma", "hirurgik  kasalliklar "]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
26d4e3db-018f-436e-b399-e59afcc43de8	Qorin bo'shlig'i pastki  qavati MSKT	МСКТ нижнего этажа брюшной полости	KT	9b557738-0632-4ee4-8926-ee5f766d3fac	\N	\N	300000	300000	500000	15	24	\N	\N	Tana  qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 07:04:05.703	2026-04-11 07:04:05.703	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Turli kasalliklar "], "symptoms": ["Turli sabablar"], "preventive": "", "mandatoryFor": ["Travma", "hirurgik  kasalliklar "]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
35215959-949f-4771-a2fc-a2be5900d06f	Ko'krak qafasi MSKT	МСКТ грудной  клетки	KT	9b557738-0632-4ee4-8926-ee5f766d3fac	\N	\N	300000	300000	500000	15	24	\N	\N	Tana qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 07:11:02.645	2026-04-11 07:11:02.645	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Travma va hirurgik  kasalliklar"], "symptoms": ["Turli  sabablar"], "preventive": "", "mandatoryFor": ["Ko'krak  qafasi  kasalliklari mavjud  bemorlar "]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
0b382f17-3401-4dda-a0e5-8479663d3c29	PIVKA-2	PIVKA-2	PIVKA-2	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	420000	420000	500000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:54:28.543	2026-04-13 13:54:28.543	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
b18e0f9f-ce17-4d4a-bdcf-0aee330a5bb8	Bosh miya MSKT	МСКТ головного  мозга	KT	9b557738-0632-4ee4-8926-ee5f766d3fac	\N	\N	350000	350000	550000	15	24	Ahamiyatsiz	\N	Bosh qismi 	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 07:13:26.956	2026-04-11 07:13:26.956	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Miya  o'smalari", "travma"], "symptoms": ["Bosh  aylanishi", "og'rishi"], "preventive": "", "mandatoryFor": ["Bemorlar "]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
a2d9a075-eb09-4795-8113-8e66e83bf9b6	Kichik chanoq MSKT	МСКТ малого таза	KT	9b557738-0632-4ee4-8926-ee5f766d3fac	\N	\N	300000	300000	500000	15	24	\N	\N	Tana qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 07:15:51.856	2026-04-11 07:15:51.856	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Siyish va  najas  qilishda muammolar "], "symptoms": ["ginekologik va urologik  kasalliklar "], "preventive": "", "mandatoryFor": ["50+"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
9c22cfe5-83ff-4895-9162-6b64bccd0fc1	Qorin orti bo'shlig'i MSKT	МСКТ забрюшинного пространства	KT	9b557738-0632-4ee4-8926-ee5f766d3fac	\N	\N	300000	300000	500000	15	24	\N	\N	Tana qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 07:18:15.114	2026-04-11 07:18:15.114	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Ozib ketish"], "symptoms": ["Ogriq", "siyishdagi  muammolar "], "preventive": "", "mandatoryFor": ["50+"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
98d765e7-6351-4c4d-9abc-b316f769334f	Bo'yin sohasi MSKT	МСКТ шейной области	KT	9b557738-0632-4ee4-8926-ee5f766d3fac	\N	\N	300000	300000	500000	15	24	\N	\N	Tana qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 07:20:58.076	2026-04-11 07:20:58.076	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["og'riqlar "], "symptoms": ["Bo'rtma "], "preventive": "", "mandatoryFor": ["50+"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
364fd599-2f7d-4dcf-be32-5089d0fa6942	Videoendoskopiya yordamida oshqozon-ichak trakti yuqori qismini tekshirish (mahalliy narkoz)	Видеоэндоскопия	VideoEndoscopy	ae5de035-8b3a-4b90-8d32-4f58ac03f2c1	\N	\N	300000	300000	500000	15	24	\N	\N	Oshqozon ichak trakti	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 07:33:00.169	2026-04-11 07:33:48.596	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Yara va o'sma  kasalliklari"], "symptoms": ["Turli sabablar"], "preventive": "", "mandatoryFor": ["20+"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
6d8d8bfa-892e-4903-b8a2-7c70e48cac4c	Videoendoskopiya yordamida oshqozon-ichak trakti yuqori qismini tekshirish (umumiy narkoz)	Видеоэндоскопия	Videoendoscopy	ae5de035-8b3a-4b90-8d32-4f58ac03f2c1	\N	\N	450000	450000	1000000	15	24	\N	\N	Oshqozon ichak trakti	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 07:36:12.928	2026-04-11 07:36:12.928	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["turli kasalliklar "], "symptoms": ["Qon  ketish", "oshqozonda  ogriq"], "preventive": "", "mandatoryFor": ["20+"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
a05657c0-3611-403d-9ce2-dd64894954ea	Videoendoskopiya yordamida biopsiya olish (umumiy narkoz)	Эндоскопическая биопсия из желудка, пищевода и ДПК	Endoscopy	ae5de035-8b3a-4b90-8d32-4f58ac03f2c1	\N	\N	500000	500000	1200000	15	24	\N	\N	Oshqozon-ichak trakti	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 07:51:44.765	2026-04-11 07:51:44.765	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["turli  kasalliklar "], "symptoms": ["O'smalar "], "preventive": "", "mandatoryFor": ["50+"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
a59ac203-ed61-499c-a1cd-1f544ca61206	Videokolonoskopya - yo'g'on ichakni  tekshirish (umumiy narkoz) 	Видеоколоноскопия 	Colonoskopy	ae5de035-8b3a-4b90-8d32-4f58ac03f2c1	\N	\N	500000	500000	1200000	15	24	1 kun oldin soat 16:00 dan boshlab 3 ta Fortrans kukunini 3  litr qaynatilgan iliq  suv bilan arlashtirib, 2-3 soat davomida  ichiladi, ich ketadi,  keyingi kun 2 ta klinenema bilan vaqtini kelishib och qoringa kelish zarur 	\N	Yo'g'on ichak	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 07:59:21.485	2026-04-11 07:59:21.485	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Turli kasalliklar "], "symptoms": ["Ich ketishi", "ich qotishi", "o'sma mavjudligiga gumon hollarda"], "preventive": "", "mandatoryFor": ["45+"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
61fc4e26-9780-4ce0-ae18-78046600e0fa	Videokolonoskopiya orqali  biopsiya  olish	Видеоколоноскопия 	Videokolonoscopy	ae5de035-8b3a-4b90-8d32-4f58ac03f2c1	\N	\N	700000	700000	1500000	15	24	1 kun oldin soat 16:00 dan boshlab 3 ta Fortrans kukunini 3  litr qaynatilgan iliq  suv bilan arlashtirib, 2-3 soat davomida  ichiladi, ich ketadi,  keyingi kun 2 ta klinenema bilan vaqtini kelishib och qoringa kelish zarur 	\N	Ichak	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 08:01:51.085	2026-04-11 08:01:51.085	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Turli kasalliklar"], "symptoms": ["O'sma va  boshqa  kasalliklar "], "preventive": "", "mandatoryFor": ["50+"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
35a5a7f7-3225-4d32-9e62-947232821b34	MTR-holangiografiya (rekonstrukciya bilan)	МРТ холангиография	MRC	2da2ff01-0d45-483a-93a3-8d999cead760	\N	\N	300000	300000	500000	15	24	O't yo'llari  kasalliklari	\N	O't  yo'llari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 08:06:16.204	2026-04-11 08:06:16.204	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Turli  kasalliklar"], "symptoms": ["Turli sabablar"], "preventive": "", "mandatoryFor": ["sarg'aygan", "qorinda og'riqlari  mavjud bemorlar "]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
d431a2d8-107a-4565-83ec-6dd3e5014639	Qo'l panja sohasi MRT (1 tomon)	МРТ кисти	MRC	2da2ff01-0d45-483a-93a3-8d999cead760	\N	\N	300000	300000	300000	15	24	\N	\N	Tana qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 09:12:29.313	2026-04-11 09:12:29.313	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
b7c94c71-7dd5-4bef-b0a6-0854cca04916	Elka bo'g'imi MRT 	МРТ плечевого сустава	MRC	2da2ff01-0d45-483a-93a3-8d999cead760	\N	\N	300000	300000	500000	15	24	\N	\N	tana qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 09:14:26.111	2026-04-11 09:14:26.111	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
d35e0a70-ccf6-4b76-ad51-16a7b103b649	Son-chanoq  bo'g'imi MRT	МРТ 	MRC	2da2ff01-0d45-483a-93a3-8d999cead760	\N	\N	300000	300000	500000	15	24	\N	\N	Tana  qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 09:44:52.109	2026-04-11 09:44:52.109	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
aa3ffd82-3c67-47bd-b7c6-eb55f8534a54	Bo'yin umurtqalari MRT	МРТ шейных позвонков	MRC	2da2ff01-0d45-483a-93a3-8d999cead760	\N	\N	300000	300000	500000	15	24	\N	\N	Tana  qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 09:46:42.291	2026-04-11 09:46:42.291	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": [], "symptoms": ["Churra", "grija "], "preventive": "", "mandatoryFor": []}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
a2b99ae8-48b5-4c27-a1cf-3050abda9c34	Ko'krak umurtqalari MRT	МРТ грудных позвонков	MRC	2da2ff01-0d45-483a-93a3-8d999cead760	\N	\N	300000	300000	500000	15	24	\N	\N	Tana qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 09:52:00.253	2026-04-11 09:52:00.253	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": [], "symptoms": ["Churra "], "preventive": "", "mandatoryFor": []}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
ef368847-fbb6-48b3-b206-6c16cd6d04b9	Bel umurtqalari MRT	МРТ поясничных позвонков	MRC	2da2ff01-0d45-483a-93a3-8d999cead760	\N	\N	300000	300000	500000	15	24	\N	\N	Tana qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 09:53:10.442	2026-04-11 09:53:10.442	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
c64b32cb-1d56-42de-bdb6-adc93fe4dcc1	Dumg'aza umurtqalari  MRT	МРТ cакральных позвонков	MRC	2da2ff01-0d45-483a-93a3-8d999cead760	\N	\N	300000	300000	500000	15	24	\N	\N	Tana  qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 09:54:52.381	2026-04-11 09:54:52.381	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": [], "symptoms": ["Churra"], "preventive": "", "mandatoryFor": []}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
77138eb1-9ec0-4d47-958c-e6bffa1b7217	Bosh miya  va bosh  suyagi  MRT 	МРТ головного  мозга	MRC	2da2ff01-0d45-483a-93a3-8d999cead760	\N	\N	300000	300000	500000	15	24	\N	\N	Tana qismi 	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 09:56:27.066	2026-04-11 09:56:27.066	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": [], "symptoms": ["Bosh  miya  o'smasi"], "preventive": "", "mandatoryFor": []}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
4bf78c2b-c6d1-42bb-96a1-15a864e72ee0	Bilak sohasi MRT (bir tomon)	МРТ область предплечья	MRC	2da2ff01-0d45-483a-93a3-8d999cead760	\N	\N	300000	300000	500000	15	24	\N	\N	Tana  qismi 	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 10:02:28.752	2026-04-11 10:02:28.752	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["travmalar"], "symptoms": ["Qo'ldagi  muammolar"], "preventive": "", "mandatoryFor": ["Travma"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
e91ef15a-0ca2-45a5-a2af-5735dcb44d2a	Son sohasi MRT (bir tomon) 	МРТ область бедра 	MRC	2da2ff01-0d45-483a-93a3-8d999cead760	\N	\N	300000	300000	500000	15	24	\N	\N	Tana qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 10:04:43.035	2026-04-11 10:04:43.035	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Travma "], "symptoms": ["Sonda  travma "], "preventive": "", "mandatoryFor": []}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
449c8cc0-6c74-4904-9f11-cb32d2825d0e	Immunoglobulin G (IgG)	Immunoglobulin G	 IgG	01fefec1-9cce-4233-ae97-72f1430b53ac	\N	\N	85000	85000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:13:38.733	2026-04-11 18:13:38.733	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
f9e4941b-8294-40d4-925d-1a47130d15b0	Elka  sohasi  MRT (bir tomon) 	МРТ плечевой  области 	MRC	2da2ff01-0d45-483a-93a3-8d999cead760	\N	\N	300000	300000	500000	15	24	\N	\N	Tana  qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 10:06:56.089	2026-04-11 10:06:56.089	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Turli  kasalliklar "], "symptoms": ["Qo'l  sohasi  travmasi "], "preventive": "", "mandatoryFor": ["Turli sabablar "]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
f535f147-474a-447c-adbd-f501dc1ec504	MSKT peroral kontrast bilan (diafragma churrasini tekshirish) 	МСКТ  с пероральным контрастированием пищевода и желудка	MRC	9b557738-0632-4ee4-8926-ee5f766d3fac	\N	\N	500000	500000	1200000	15	24	\N	\N	Qizilo'ngach 	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 10:16:32.286	2026-04-11 10:16:32.286	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Churra "], "symptoms": ["Qizilo'ngach churrasi "], "preventive": "", "mandatoryFor": ["qusish  va kekirish belgilari  mavjud  bemorlar "]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
8ad100cb-a0de-4614-a431-529e6ced2a48	Qorin bo'shlig'ini  3  fazali MSKT	Трехфазная МСКТ брюшной полости	MRC	9b557738-0632-4ee4-8926-ee5f766d3fac	\N	\N	800000	800000	1500000	15	24	\N	\N	Qorin bo'shlig'i	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 10:23:09.011	2026-04-11 10:23:09.011	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": [], "symptoms": ["O'sma "], "preventive": "", "mandatoryFor": []}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
05998eb4-1d2e-4839-93b5-8b6f8701a5e3	Qorin bo'shlig'i UTT 	Ультразвуковое исследование живота	Ultrasound 	0679a97e-b5cf-42e6-b2ba-5a8f072b4285	Ultratovush va dopplerografiya bo'yicha laboratoriya tahlili.	\N	150000	120000	200000	40	0.5	\N	\N	Tana  qismlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.436	2026-04-11 11:17:39.733	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Og'riq", "qusish"], "symptoms": ["Qorinda og'riq "], "preventive": "", "mandatoryFor": ["20+"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
350f96f3-0a56-4d6a-8d4e-7955bade07f2	Jigar va o't qopi UTT	УЗИ печени и желчного пузыря	USI	0679a97e-b5cf-42e6-b2ba-5a8f072b4285	\N	\N	60000	50000	100000	15	24	\N	\N	Jigar	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 11:22:57.441	2026-04-11 11:22:57.441	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Qusish"], "symptoms": ["cirroz", "gepatit"], "preventive": "", "mandatoryFor": ["Qusish", "ich  qotishi "]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
0649eb17-35c5-4512-85dd-9a1cd0a89f3f	Bachadon va ortiqlari UTT	УЗИ матки с придатками	USI	0679a97e-b5cf-42e6-b2ba-5a8f072b4285	\N	\N	60000	50000	100000	15	24	\N	\N	Bachadon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 11:25:40.538	2026-04-11 11:25:40.538	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Ginekologiya"], "symptoms": ["Ginekologiya"], "preventive": "", "mandatoryFor": ["Ginekologiya"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
aad1b7c7-14ee-49fc-a08c-210081fba936	Qorataloq UTT	УЗИ селезенки	USI	0679a97e-b5cf-42e6-b2ba-5a8f072b4285	\N	\N	50000	50000	100000	15	24	\N	\N	Taloq	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 11:27:25.169	2026-04-11 11:27:25.169	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Taloq kattalashishi"], "symptoms": ["Taloq"], "preventive": "", "mandatoryFor": ["Taloq"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
5a3f256d-d3fe-4492-9356-8f3fc644f37d	Qalqonsimon bez UTT	УЗИ щитовидной железы	USI	0679a97e-b5cf-42e6-b2ba-5a8f072b4285	\N	\N	100000	50000	200000	15	24	\N	\N	Qalqonsimon  bez	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 11:28:47.839	2026-04-11 11:28:47.839	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": [], "symptoms": [], "preventive": "", "mandatoryFor": ["Bo'qoq"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
f5c56222-980c-4a76-9b6c-b2de98126be0	Oshqozon osti bezi UTT	УЗИ поджелудочной железы	USI	0679a97e-b5cf-42e6-b2ba-5a8f072b4285	\N	\N	60000	50000	100000	15	24	\N	\N	Oshqozon osti bezi	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 11:34:04.584	2026-04-11 11:34:04.584	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["qusish"], "symptoms": ["og'riqlar"], "preventive": "", "mandatoryFor": ["Pankreatit"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
f0e47afa-804f-4976-930d-eed354eb6dab	Buyraklar va Siydik yo'llari UTT	УЗИ почек и МВС	USI	0679a97e-b5cf-42e6-b2ba-5a8f072b4285	\N	\N	60000	50000	100000	15	24	\N	\N	Buyraklar	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 11:36:05.065	2026-04-11 11:36:05.065	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["siydik qizarishi"], "symptoms": ["Buyrak og'rigi"], "preventive": "", "mandatoryFor": ["30+"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
63b68f45-2658-4bfd-9323-7c33ca72d3cb	Plevra bo'lig'i UTT	УЗИ плевры	USI	0679a97e-b5cf-42e6-b2ba-5a8f072b4285	\N	\N	60000	50000	100000	15	24	\N	\N	Plevra	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 11:38:00.551	2026-04-11 11:38:00.551	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Yo'talish"], "symptoms": ["Nafas  siqishi"], "preventive": "", "mandatoryFor": ["O'pka"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
ed3f1aea-b23e-48b3-9db5-f5df11ce0ac9	EKG	ЭКГ	EKG	8f19fecb-8e6b-49f8-b6d0-efcdb2e2b522	\N	\N	50000	50000	100000	15	24	\N	\N	Yurak	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 11:42:32.634	2026-04-11 11:42:32.634	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["yurakda og'riq "], "symptoms": [], "preventive": "", "mandatoryFor": ["25+"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
df001cdd-cd73-496e-a493-44fb9e2aa49a	EHOKS	ЭХОКС	Heart investigation	8f19fecb-8e6b-49f8-b6d0-efcdb2e2b522	\N	\N	200000	200000	350000	15	24	\N	\N	Yurak	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 11:55:02.2	2026-04-11 11:55:02.2	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Yurak infarkti "], "symptoms": [], "preventive": "", "mandatoryFor": ["og'riqlar "]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
1b141a4c-41f1-495f-b20c-4268515dd447	Holter tekshiruvi 	Исследование  сердца по Холтеру	Holter's test	8f19fecb-8e6b-49f8-b6d0-efcdb2e2b522	\N	\N	650000	600000	1200000	15	24	\N	\N	Yurak aritmiya	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 11:57:06.077	2026-04-11 11:57:06.077	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Yurak  etishmovchiligi"], "symptoms": [], "preventive": "", "mandatoryFor": ["Og'riq "]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
4c94886d-6d4a-4804-b742-b64293b6795f	Uyqu arteriyani dupleks  skanerlash	Дуплексное  исследование сонных сосудов	Duplex scanning	34f43fd9-1e7b-4983-b91f-98f665a782a1	\N	\N	150000	150000	300000	15	24	\N	\N	Uyqu tomirlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 12:00:50.658	2026-04-11 12:00:50.658	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Insult"], "symptoms": [], "preventive": "", "mandatoryFor": ["bosh  aylanishi"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
25ee1ac5-df23-47f9-9d2f-2c121a92096a	Umurtqa  arteriyalarini duplex  skanerlash	Дуплексное  исследование позвоночных артерий	Duplex of Verteblar arteries	34f43fd9-1e7b-4983-b91f-98f665a782a1	\N	\N	150000	150000	300000	15	24	\N	\N	Umutqa arteriyasi	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 12:04:37.052	2026-04-11 12:04:37.052	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Bosh  aylanishi"], "symptoms": [], "preventive": "", "mandatoryFor": ["Insult"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
b28d4021-4e3f-4af3-842d-e37abcd47ce5	Oyoq  vena tomirlarini  dupleks  skanerlash	Дуплексное  исследование вен нижних  конечностей 	Duplex of  the lower  extremities 	34f43fd9-1e7b-4983-b91f-98f665a782a1	\N	\N	150000	150000	300000	15	24	\N	\N	Oyoq tomirlari	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 12:19:24.683	2026-04-11 12:19:24.683	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["Shish"], "symptoms": ["OYOqda  shish"], "preventive": "", "mandatoryFor": ["Yurish qiyinlashishi"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
35af10ef-62c4-49d1-888a-5da04a839979	Oyoq arteriyalarini  dupleks  skanerlash	Дуплексное  исследование aртерий нижних  конечностей 	Duplex	34f43fd9-1e7b-4983-b91f-98f665a782a1	\N	\N	150000	150000	300000	15	24	\N	\N	Tomirlar	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 12:21:11.098	2026-04-11 12:21:11.098	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
0c84f11c-2d8c-4a3e-8196-2d86dd0fa981	Bo'yinturuq va o'mrov  osti venalarini dupleks  skanerlash	Дуплексное  исследование яремных  и полключичных вен	Duplex	34f43fd9-1e7b-4983-b91f-98f665a782a1	\N	\N	150000	150000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 12:23:07.249	2026-04-11 12:23:07.249	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
8c74f3f4-5320-4764-8d02-2d09a4808f9a	Jigar va taloq  tomirlarini dupleks skanerlash	Исследование сосудов печени  и селезенки	Duplex	34f43fd9-1e7b-4983-b91f-98f665a782a1	\N	\N	150000	150000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 12:24:31.851	2026-04-11 12:24:31.851	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a2a1431d-60f6-4233-91b5-8810fbc7b417	Kompliment 3 	Kompliment 3 	Compliment 3 	01fefec1-9cce-4233-ae97-72f1430b53ac	\N	\N	130000	130000	180000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:15:30.767	2026-04-11 18:15:30.767	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
ff657026-0f58-432b-ab30-2036f72e9352	Kapsula endoskopiya	Капсульная эндоскопия	Capsul endoscopy	e84af75a-3af8-4c12-bd50-152f7554ecdf	\N	\N	7000000	7000000	12000000	15	24	1 kun oldin 3 ta Fortrans kukunini qaynatilgan sovutilgan  suvda eritib kechga 2-3 davomida ichiladi, oqibatda ichaklar tozalanadi, ertalab och qoringa  kelinadi	\N	Oshqozon-ichak  trakti	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 17:33:29.844	2026-04-11 17:33:29.844	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	{"diseases": ["og'riq"], "symptoms": ["Oshqozon-ichak"], "preventive": "", "mandatoryFor": ["45+"]}	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
3993bace-dce0-42fb-8956-49ac8ec050ef	VideoBronhoskopiya 	VideoBronhoskopiya 	VideoBronhoskopy	ae5de035-8b3a-4b90-8d32-4f58ac03f2c1	\N	\N	1000000	1000000	1500000	15	24	\N	\N	O'pka	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 17:35:03.908	2026-04-11 17:35:03.908	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
2f72e9ef-558e-4efa-a07f-b8ff128ccb58	Videoduadenoskopiya	Дуоденоскопия	Videoduadenoskopy	ae5de035-8b3a-4b90-8d32-4f58ac03f2c1	\N	\N	800000	800000	1200000	15	24	\N	\N	Ichak	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 17:36:47.657	2026-04-11 17:36:47.657	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": false, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
257eb5f5-91cb-46d8-95fb-5dcd801ab658	Troponin I	Troponin I	Troponin I	4879a86c-b315-40c6-a648-56d277d6137c	\N	\N	160000	160000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 17:43:31.322	2026-04-11 17:43:31.322	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a0ab3ed9-594c-4653-ab0f-0beb4da5f6b8	B-HGCH (В-ХГЧ)	(В-ХГЧ)	B-HCG	8f6f6fde-d883-4bd9-890e-2e3d585c7b3c	\N	\N	100000	100000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 17:48:08.593	2026-04-11 17:48:08.593	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
07ec22cb-34b7-452a-b03b-a42a0ca1c07d	Erkin B-ХГЧ	Свободный B-ХГЧ	Quality	8f6f6fde-d883-4bd9-890e-2e3d585c7b3c	\N	\N	110000	110000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 17:49:38.027	2026-04-11 17:49:38.027	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
c7354ee3-d546-45ae-a312-d055cc1d081c	Erkin Estriol (E3)	Свободный эстриол	Free estriol	8f6f6fde-d883-4bd9-890e-2e3d585c7b3c	\N	\N	100000	90000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 17:51:06.203	2026-04-11 17:51:06.203	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
05e2f431-7a41-43d0-bdc6-c56a16d84d6c	PAPP-A	PAPP-A	PAPP-A	8f6f6fde-d883-4bd9-890e-2e3d585c7b3c	\N	\N	120000	120000	120000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 17:51:54.819	2026-04-11 17:51:54.819	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
35702247-a9d2-41c9-a647-d637cadf140b	PRISCA I (I TRIMESTRDA 1 TALIK HOMILADA)	PRISCA I  	PRISCA I 	8f6f6fde-d883-4bd9-890e-2e3d585c7b3c	\N	\N	645000	645000	750000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:01:51.67	2026-04-11 18:01:51.67	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
0215c0b4-7a1e-4a45-b43f-ea454ae14714	PRISCA I (I TIMESTRDA EGIZAK HOMILADA)	PRISCA I 	PRISCA I 	8f6f6fde-d883-4bd9-890e-2e3d585c7b3c	\N	\N	645000	645000	750000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:02:42.614	2026-04-11 18:02:42.614	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
e8fcca86-82f2-4bfd-a03f-7da9a303e26a	PRISCA II (II TRIMESTRDA 1 TALIK HOMILADA)	PRISCA II	PRISCA II	8f6f6fde-d883-4bd9-890e-2e3d585c7b3c	\N	\N	645000	645000	750000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:03:37.948	2026-04-11 18:03:37.948	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
cb6cc73f-ccd4-4441-bfc2-3cb9f219e909	PRISCA II (II TRIMESTRDA EGIZAK HOMILADA)	PRISCA II	PRISCA II	8f6f6fde-d883-4bd9-890e-2e3d585c7b3c	\N	\N	730000	730000	800000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:04:22.435	2026-04-11 18:04:22.435	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
6fd6ffbb-cc4a-4240-9697-77b12fc4fe17	Immunoglobulin M (IgM)	Immunoglobulin M 	IgM	01fefec1-9cce-4233-ae97-72f1430b53ac	\N	\N	85000	85000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:11:44.827	2026-04-11 18:11:44.827	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
edf71aaf-2571-4019-a8e0-5482f60cdb8d	Kompliment 4	Kompliment 4	Compliment 4	01fefec1-9cce-4233-ae97-72f1430b53ac	\N	\N	130000	130000	180000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:16:05.034	2026-04-11 18:16:05.034	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
c7b85f87-a306-458a-847a-d33b0293f795	Interleykin-1	Interleykin-1	Interleykin-1	01fefec1-9cce-4233-ae97-72f1430b53ac	\N	\N	280000	280000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:17:23.276	2026-04-11 18:17:23.276	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
64294741-af40-425b-b257-3a4935b85a12	Interleykin-2	Interleykin-2	Interleykin-2	01fefec1-9cce-4233-ae97-72f1430b53ac	\N	\N	280000	280000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:17:53.385	2026-04-11 18:17:53.385	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
af3fb8fc-a1a6-478c-a4d8-347973c02f17	Interleykin-4	Interleykin-4	Interleykin-4	01fefec1-9cce-4233-ae97-72f1430b53ac	\N	\N	280000	280000	330000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:18:22.153	2026-04-11 18:18:54.965	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
6c4a9987-93b2-40e5-804d-447cfade7c24	Interleykin-6	Interleykin-6	Interleykin-6	01fefec1-9cce-4233-ae97-72f1430b53ac	\N	\N	280000	280000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:19:28.075	2026-04-11 18:19:28.075	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
c78ad53c-975a-4861-9b79-dc84e284352b	Interleykin-8	Interleykin-8	Interleykin-8	01fefec1-9cce-4233-ae97-72f1430b53ac	\N	\N	280000	280000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:19:53.988	2026-04-11 18:19:53.988	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
ec68bdd9-c728-4a6e-8a96-44ca672f6912	Interleykin-10	Interleykin-10	Interleykin-10	01fefec1-9cce-4233-ae97-72f1430b53ac	\N	\N	280000	280000	350000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:20:22.427	2026-04-11 18:20:22.427	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
2d966c8a-7ae7-4482-9fc6-82c6fe6b146f	Interleykin-17	Interleykin-17	Interleykin-17	01fefec1-9cce-4233-ae97-72f1430b53ac	\N	\N	850000	850000	900000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:22:29.788	2026-04-11 18:22:29.788	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
31438b9b-2b67-4ebd-a36b-d402deef221d	Interleykin-18	Interleykin-18	Interleykin-18	01fefec1-9cce-4233-ae97-72f1430b53ac	\N	\N	350000	350000	400000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:23:16.187	2026-04-11 18:23:16.187	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a9d3a199-ca45-41bc-bbcd-331a4ac4709d	O'sma nekrozi omili (FNO-alfa)	Фактор некроза опухоли	Factor tumor necrosis	01fefec1-9cce-4233-ae97-72f1430b53ac	\N	\N	250000	250000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:25:13.476	2026-04-11 18:25:13.476	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
93977305-0841-41c8-8edd-9b23f28267c3	Immunogramma (kengaytirilgan)	Развернутая 	Allergy Tests	01fefec1-9cce-4233-ae97-72f1430b53ac	Allergologik tahlillar bo'yicha laboratoriya tahlili.	\N	1100000	1100000	1300000	30	24	\N	\N	Venoz qon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.371	2026-04-11 18:27:52.609	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
de030c0c-7286-4873-834b-a61e306fc360	Immunogemogramma (Vir)	Экспресс-диагностика 	Express Diagnostics 	01fefec1-9cce-4233-ae97-72f1430b53ac	Ekspress diagnostika (IFA) bo'yicha laboratoriya tahlili.	\N	700000	649000	700000	20	2	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.44	2026-04-11 18:34:16.676	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
7aa21d36-7c51-4eea-a8a4-78caf8ca499f	Molekulyar allergodiagnostika (300 ta  allergen)	Молекулярная диагностика	Quality	5dd51a11-4665-4586-8012-dc557c1a5c75	\N	\N	2700000	2700000	3500000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-11 18:39:09.831	2026-04-11 18:39:09.831	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
cb4d21ee-036f-4add-a034-c7aa7e6f677e	Ko'krak bezlari UTT	УЗИ молочных желез	USI	0679a97e-b5cf-42e6-b2ba-5a8f072b4285	\N	\N	200000	200000	250000	15	24	\N	\N	Tana qismi	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 03:33:36.176	2026-04-12 03:33:36.176	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
f3a9f603-f3ba-488e-885a-b5494c0df6d3	Elka bo'g'imi rentgenografiyasi (1 tomon, 2 proekciyada)	Рентген плечевого сустава	X-ray	832d1d87-baec-4228-9d6a-998a2398f11d	\N	\N	200000	200000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 07:35:12.352	2026-04-12 07:35:12.352	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
ad831dab-13ef-486e-b4b1-811418c8dc99	Burun yondosh bo'shliqlari rentgenografiyasi (2 proekciyada)	Рентген придаточных пазух	X-ray	832d1d87-baec-4228-9d6a-998a2398f11d	\N	\N	200000	200000	250000	15	24	\N	\N	Tana qismi 	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 03:49:05.92	2026-04-12 03:49:05.92	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
ef9f323a-de86-474c-9b02-bd5a794c0ff2	Bosh suyagi rentgenografiyasi (yon va old tomondan)	Рентген черепа	X ray	832d1d87-baec-4228-9d6a-998a2398f11d	\N	\N	200000	200000	250000	15	24	\N	\N	Tana  qismi 	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 03:42:27.564	2026-04-12 03:50:00.56	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
e65648ca-c95d-4d51-b665-f198baec782e	Burun suyaklari  rentgenografiyasi (yon va old tomondan)	Рентген носа в 2х проекции	X-ray	832d1d87-baec-4228-9d6a-998a2398f11d	\N	\N	210000	200000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 03:44:06.319	2026-04-12 03:51:27.618	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
93ea1cb8-6f16-40da-bb27-9f14aea545bb	Ko'krak umurtqalari rentgenografiyasi (2 proekciyada)	Рентген грудных позвонков	X-ray	832d1d87-baec-4228-9d6a-998a2398f11d	\N	\N	200000	200000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 03:53:11.787	2026-04-12 03:53:11.787	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
fa103ec3-36ec-4959-abfc-ea9be593c6f7	Bo'yin umurtqalari rentgenografiyasi (2 proekciyada)	Рентген шейных позвонков	X-ray	832d1d87-baec-4228-9d6a-998a2398f11d	\N	\N	200000	200000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 03:54:27.961	2026-04-12 03:54:27.961	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
d7c671f5-e563-4cfc-b44b-d925b6928379	Bel umurtqalari rentgenografiyasi (2 proekciyada)	Рентген поясничных позвонков	X-raY	832d1d87-baec-4228-9d6a-998a2398f11d	\N	\N	200000	200000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 03:55:35.847	2026-04-12 03:55:35.847	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
4393b96c-1616-44dd-a3d0-41a635aa82e1	Umurtqa Dumg'aza-dum qismi rentgenografiyasi (2 proekciyada)	Рентген крестцово-копчивого отдела позвоночника	X-ray	832d1d87-baec-4228-9d6a-998a2398f11d	\N	\N	200000	200000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 07:32:12.484	2026-04-12 07:32:12.484	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
1a6fb8b1-19d7-476e-bf82-289eeb826e98	Elka suyagi rentgenografiyasi (1 tomon, 2 proekciyada)	Рентген плечевой области 	X-ray	832d1d87-baec-4228-9d6a-998a2398f11d	\N	\N	200000	200000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 07:33:48.942	2026-04-12 07:33:48.942	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
67c3b8f7-1dd2-4cf1-8482-f94da02372fa	MSKTA KORONOROGRAFIYA	ИССЛЕДОВАНИЕ  СЕРДЦА	MSKTA KORONOROGRAFIYA	9b557738-0632-4ee4-8926-ee5f766d3fac	\N	\N	1200000	1200000	2000000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 11:24:40.048	2026-04-12 11:24:40.048	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
975f6fcf-8c48-48e9-a396-baa4601e88f3	Yurak MRT	МРТ сердца	Heart	2da2ff01-0d45-483a-93a3-8d999cead760	\N	\N	500000	500000	700000	15	24	\N	\N	Yurak	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-12 11:26:33.607	2026-04-12 11:26:33.607	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	1
35caa72f-5781-44fd-99ce-efd97ed26e49	AFP 	АФП	Alfafetoprotein	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	Gistologik tekshiruv bo'yicha laboratoriya tahlili.	\N	100000	100000	150000	60	72	\N	\N	Biomaterial	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.352	2026-04-13 13:33:50.028	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
8d6b53a5-a61b-40fd-9384-c62c3877c1b1	B-HGCH (ХГЧ)	ХГЧ	Oncological Markers	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	Onkologik markerlar diagnostikasi bo'yicha laboratoriya tahlili.	\N	100000	100000	150000	30	24	\N	\N	Venoz qon	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-03-25 18:26:33.366	2026-04-13 13:36:11.971	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
196ba639-e807-48bf-a7dc-f737488e3da5	СА-19-9 (uglevod antigen)	СА-19-9	СА-19-9	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	100000	100000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:38:12.35	2026-04-13 13:38:12.35	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
9f8c7270-71cb-40dd-950c-c80db7264f5e	СА-15-3	СА-15-3	СА-15-3	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	100000	100000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:38:47.934	2026-04-13 13:38:47.934	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
95c2150d-be1c-4153-b4f6-04b88e7aa12c	СА-72-4	СА-72-4	СА-72-4	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	140000	140000	180000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:39:45.619	2026-04-13 13:39:45.619	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
028e7d53-f0f7-4110-9585-d914cec9b90d	Cyfra 21-1 (Citokeratin 19  fragmentlari)	Cyfra 21-1	Cyfra 21-1	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	120000	120000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:43:24.017	2026-04-13 13:43:24.017	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
381ad0f9-1d5a-45db-a23c-21d29910367a	NSE (neyrospecifik enolaza) 	НСЭ	NSE	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	150000	150000	200000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:44:58.323	2026-04-13 13:44:58.323	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
193c3da8-1fb0-4c79-a722-673f85b203df	PSA (Prostata specifik  antigen)	PSA 	PSA 	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	100000	100000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:45:49.221	2026-04-13 13:45:49.221	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
cd8c50d9-79b3-4d58-ae0e-422a081bcd8b	PSA erkin va umumiy nisbati	Соотношение ПСА свободный и общий	Quantity	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	200000	200000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:47:30.995	2026-04-13 13:47:30.995	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
a3bb8ec2-e89b-4a30-911f-82c228a55df3	CA-242	CA-242	CA-242	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	200000	200000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:48:08.039	2026-04-13 13:48:08.039	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
c92578bb-7d06-424f-9a3c-f9a7819b7dd5	SCC Ag (yassi karcinoma antigeni)	SCC Ag 	SCC Ag 	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	210000	210000	250000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:49:38.411	2026-04-13 13:49:38.411	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
4d40a4a8-a248-43b3-a387-41ab186d679f	S 100 Protein	S 100 Protein	S 100 Protein	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	290000	290000	290000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:50:31.659	2026-04-13 13:50:31.659	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
15b043eb-3252-4cf1-a14b-827e0f8c0d90	CA -125	CA -125	CA -125	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	100000	100000	150000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:51:03.674	2026-04-13 13:51:03.674	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
84b4f34c-06db-45c0-a525-505e0f7e10ae	HE4 (Human epididymis protein 4)	HE4 (Human epididymis protein 4)	HE4 (Human epididymis protein 4)	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	250000	250000	300000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:52:21.171	2026-04-13 13:52:21.171	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
35d8b2a6-1978-45db-a2d4-b7bee7de307a	ROMA indeksi	индекс ROMA 	ROMA index	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	340000	340000	400000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:53:40.84	2026-04-13 13:53:40.84	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
1156e5f2-7418-4ddf-a068-4856891b0669	BMG (Betta 2-mikroglobulin)	BMG (Betta 2-mikroglobulin)	BMG (Betta 2-mikroglobulin)	3787aa0f-ec3c-404a-85a1-cdbaab1fc913	\N	\N	480000	480000	550000	15	24	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-13 13:55:28.474	2026-04-13 13:55:28.474	{"accuracy": "", "equipment": "", "experience": "", "certifications": []}	{"cancellationPolicy": "", "modificationPolicy": "", "prepaymentRequired": false}	\N	\N	{"bestTime": "", "documents": [], "specialDiet": "", "waterAllowed": true, "womenWarnings": "", "stopMedications": "", "exerciseRestriction": ""}	\N	\N	\N	\N
\.


--
-- Data for Name: Doctor; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."Doctor" (id, "clinicId", "firstName", "lastName", specialty, bio, "photoUrl", phone, email, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HomepageSettings; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."HomepageSettings" (id, section, content, "updatedAt") FROM stdin;
c1926d4f-e815-4876-a889-e72cabb9baa4	navigation	{"logoUrl": "/uploads/images/1775450714665_qe7jtc.png", "siteName": "BANISA", "logoColor": "#6a6c6c", "siteTagline": "Hospital Booking System"}	2026-04-06 04:45:53.034
27373f9a-9f28-46f3-85c8-68f36e134ac1	stats	{"awards": "150", "avatars": [{"0": "/", "1": "i", "2": "m", "3": "a", "4": "g", "5": "e", "6": "s", "7": "/", "8": "1", "9": "7", "10": "5", "11": "1", "12": "4", "13": "6", "14": "3", "15": "9", "16": "3", "17": "2", "18": "_", "19": "i", "20": "m", "21": "g", "22": "2", "23": ".", "24": "p", "25": "n", "26": "g", "url": "/uploads/images/1775450832091_5anxrz.png"}, {"0": "/", "1": "i", "2": "m", "3": "a", "4": "g", "5": "e", "6": "s", "7": "/", "8": "1", "9": "7", "10": "5", "11": "1", "12": "4", "13": "6", "14": "3", "15": "8", "16": "7", "17": "0", "18": "_", "19": "i", "20": "m", "21": "g", "22": "1", "23": ".", "24": "p", "25": "n", "26": "g", "url": "/uploads/images/1775450848977_12nq8f.png"}, {"0": "/", "1": "i", "2": "m", "3": "a", "4": "g", "5": "e", "6": "s", "7": "/", "8": "1", "9": "7", "10": "5", "11": "1", "12": "4", "13": "6", "14": "3", "15": "9", "16": "6", "17": "5", "18": "_", "19": "i", "20": "m", "21": "g", "22": "3", "23": ".", "24": "p", "25": "n", "26": "g", "url": "/uploads/images/1775450853850_050xx3.webp"}, {"0": "/", "1": "i", "2": "m", "3": "a", "4": "g", "5": "e", "6": "s", "7": "/", "8": "1", "9": "7", "10": "5", "11": "1", "12": "4", "13": "6", "14": "3", "15": "9", "16": "9", "17": "6", "18": "_", "19": "i", "20": "m", "21": "g", "22": "4", "23": ".", "24": "p", "25": "n", "26": "g", "url": "/uploads/images/1775450859792_o2xjxd.png"}], "bgImage": "", "patients": "45k", "bookingText": "300+ Appointment Booking Confirm for this Week", "specialists": "200"}	2026-04-06 04:48:03.76
c19c5f47-20f3-466b-8705-8066274644ea	why_choose_us	{"badge": "Why Us", "image": "/uploads/images/1775450936263_umyfq4.webp", "title": "Why Choose Us for Your Healthcare Needs", "bgImage": "/images/1752043088.bg1.webp", "reasons": [{"desc": "We offer a wide range of health services to meet all your needs.", "title": "More Experience"}, {"desc": "We offer a wide range of health services to meet all your needs.", "title": "Seamless Care"}, {"desc": "We offer a wide range of health services to meet all your needs.", "title": "The Right Answers"}, {"desc": "We offer a wide range of health services to meet all your needs.", "title": "Unparalleled Expertise"}], "yearsExperienced": "20"}	2026-04-06 04:49:00.374
bc998de1-b157-4bf7-b57d-c4c5444c9dc9	testimonials	{"badge": "Testimonials", "image": "/uploads/images/1775451047014_e9jwmd.png", "title": "What Our Patients Say", "reviews": [{"img": "/uploads/images/1775451007905_eazzss.jpeg", "name": "Sarah Johnson", "role": "Patient", "rating": 5, "comment": "Excellent service and professional staff. Highly recommend BANISA for all healthcare needs."}, {"img": "/images/1752123672_img2.png", "name": "Mike Davis", "role": "Patient", "rating": 5, "comment": "Outstanding medical care. The doctors are knowledgeable and caring."}, {"img": "/images/1752124093_img3.png", "name": "Emily Chen", "role": "Patient", "rating": 5, "comment": "Best hospital experience I have had. Clean, professional, and efficient."}, {"img": "/images/1752124220_img4.png", "name": "James Wilson", "role": "Patient", "rating": 5, "comment": "World-class facilities and amazing doctors. Will definitely return."}]}	2026-04-06 04:50:58.52
b459ca95-7ce2-4492-acb1-6f310124f23b	how_it_works	{"badge": "Process", "image": "/uploads/images/1775451114509_lsrgnd.webp", "steps": [{"title": "Book an Appointment"}, {"title": "Conduct Checkup"}, {"title": "Perform Treatment"}, {"title": "Prescribe & Payment"}], "title": "How It Works", "patients": "45k", "description": "Getting quality healthcare at BANISA is simple. Follow these easy steps to book your appointment and receive world-class treatment.", "specialists": "180"}	2026-04-06 04:51:56.702
48bf9c5d-9ff8-437c-9a9c-fb4a177c92e9	faq	{"faqs": [{"a": "You can book an appointment by calling our helpline, sending an email, or using the online appointment form on our website.", "q": "How do I book an appointment at BANISA?"}, {"a": "BANISA offers a wide range of specialties including Cardiology, Dermatology, Neurology, Pediatrics, and more.", "q": "What medical specialties do your doctors cover?"}, {"a": "We provide both outpatient and inpatient services including diagnostics, surgical procedures, and rehabilitation.", "q": "What types of treatments and procedures do you offer?"}, {"a": "Yes. You can cancel or reschedule your appointment up to 2 hours before the scheduled time.", "q": "Can I cancel or reschedule my appointment?"}], "badge": "FAQ", "image": "/uploads/images/1775451147467_tvobtn.jpg", "phone": "+998 71 123 45 67", "title": "Frequently Asked Questions", "bgImage": "", "description": "Have questions about our services or how to book an appointment? We have answered the most common questions below to help you get started."}	2026-04-06 04:52:31.041
d5a0d732-090c-43e1-bd43-ad29351c93f4	topbar	{"email": "info@banisa.uz", "phone": "+998 71 123 45 66", "workingHours": "Dush–Juma: 09:00–18:00", "appointmentLabel": "Onlayn Navbat", "appointmentValue": "Hozir Oling"}	2026-04-06 11:49:15.475
\.


--
-- Data for Name: PaymeTransaction; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."PaymeTransaction" (id, "paymeId", "paymeTime", "createTime", "performTime", "cancelTime", amount, state, reason, "orderId", "orderType", receivers, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Review; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."Review" (id, "clinicId", "userId", rating, comment, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SanatoriumService; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."SanatoriumService" (id, "nameUz", "nameRu", "nameEn", "categoryId", "shortDescription", "fullDescription", "imageUrl", "serviceType", "priceRecommended", "priceMin", "priceMax", "pricePer", "durationMinutes", "durationDays", "sessionsCount", capacity, includes, contraindications, preparation, "isActive", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ServiceCategory; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."ServiceCategory" (id, "parentId", level, "nameUz", "nameRu", "nameEn", slug, icon, "sortOrder", "createdAt", "updatedAt") FROM stdin;
f4aeef29-c440-4cdd-bbc1-914a9c181a70	\N	0	Diagnostika Xizmatlari	Диагностические услуги	Diagnostic Services	diagnostics	🔬	0	2026-03-25 18:26:33.252	2026-03-25 18:26:33.252
401c9eae-9bbe-4d60-8248-85c4fbb8a54b	f4aeef29-c440-4cdd-bbc1-914a9c181a70	1	Laboratoriya Diagnostikasi	Лабораторная диагностика	Laboratory Diagnostics	laboratory	🧪	1	2026-03-25 18:26:33.261	2026-03-25 18:26:33.261
3fdbcf9f-c792-4a11-ac96-dd8312d7f02f	f4aeef29-c440-4cdd-bbc1-914a9c181a70	1	Instrumental Diagnostika	Инструментальная диагностика	Instrumental Diagnostics	instrumental	🩺	2	2026-03-25 18:26:33.268	2026-03-25 18:26:33.268
e2126e21-9b14-4d7d-b2a8-50221edd6209	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Siydik Tahlillari	Анализы мочи	Urine Tests	urine-tests	💧	2	2026-03-25 18:26:33.275	2026-03-25 18:26:33.275
d2ae9f71-daba-4b44-897b-f43fb361cf01	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Reproduktiv Tizim Tahlillari	Репродуктивная система	Reproductive System	reproductive	🔬	4	2026-03-25 18:26:33.28	2026-03-25 18:26:33.28
6d8edd50-184c-4f4d-b155-7092e4c14fad	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Mikrobiologiya va Infeksiya	Микробиология и инфекции	Microbiology & Infections	microbiology	🦠	5	2026-03-25 18:26:33.283	2026-03-25 18:26:33.283
87f077d3-7029-4e42-8e5b-6e18c41e352f	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Genetik va Molekulyar Diagnostika	Генетика и молекулярная диагностика	Genetic & Molecular	genetics	🧬	6	2026-03-25 18:26:33.286	2026-03-25 18:26:33.286
01fefec1-9cce-4233-ae97-72f1430b53ac	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Immunologiya	Иммунология	Immunology	immunology	🛡️	8	2026-03-25 18:26:33.291	2026-03-25 18:26:33.291
3787aa0f-ec3c-404a-85a1-cdbaab1fc913	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Onkologiya	Онкология	Oncology	oncology	🧬	9	2026-03-25 18:26:33.293	2026-03-25 18:26:33.293
8f6f6fde-d883-4bd9-890e-2e3d585c7b3c	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Prenatal Diagnostika	Пренатальная диагностика	Prenatal Diagnostics	prenatal	🤰	11	2026-03-25 18:26:33.298	2026-03-25 18:26:33.298
f1efc773-2d07-4e87-ac59-29e1aaffd1dd	\N	0	Operatsiyalar	Операции	\N	operations	📊	1	2026-04-05 14:24:19.159	2026-04-05 14:24:19.159
6ba8a2d7-c816-41a6-8759-61c8529a6b8f	f1efc773-2d07-4e87-ac59-29e1aaffd1dd	1	Ko'z Xirurgiyasi	\N	\N	eye-surgery	👁️	1	2026-04-05 14:24:19.169	2026-04-05 14:24:19.169
ac58d28d-0535-4895-b454-b140e4cffcf7	f1efc773-2d07-4e87-ac59-29e1aaffd1dd	1	Ginekologiya	\N	\N	gynecology	🤰	2	2026-04-05 14:24:19.172	2026-04-05 14:24:19.172
f7a2fc0e-791a-432f-8275-0b3f47bad30b	f1efc773-2d07-4e87-ac59-29e1aaffd1dd	1	Travmatologiya-Ortopediya	\N	\N	orthopedics	🦴	3	2026-04-05 14:24:19.175	2026-04-05 14:24:19.175
05bf5686-7ad7-4324-a85c-1587e8a29ca7	f1efc773-2d07-4e87-ac59-29e1aaffd1dd	1	Reproduktiv Texnologiyalar	\N	\N	repro-tech	👶	4	2026-04-05 14:24:19.178	2026-04-05 14:24:19.178
9a7541b8-3ca7-4f2e-9631-477269720aec	f1efc773-2d07-4e87-ac59-29e1aaffd1dd	1	Umumiy Xirurgiya	\N	\N	general-surgery	🏥	5	2026-04-05 14:24:19.181	2026-04-05 14:24:19.181
7e6b8cca-9799-4d3f-9ae3-74544595b062	6ba8a2d7-c816-41a6-8759-61c8529a6b8f	2	Katarakta	\N	\N	cataract	•	1	2026-04-05 14:24:19.184	2026-04-05 14:24:19.184
41ea5024-72be-4711-b943-a03eb8352c9e	6ba8a2d7-c816-41a6-8759-61c8529a6b8f	2	Refraktiv xirurgiya	\N	\N	refractive	•	2	2026-04-05 14:24:19.187	2026-04-05 14:24:19.187
d8d8ac55-097b-42af-a6cc-0149d48b3194	6ba8a2d7-c816-41a6-8759-61c8529a6b8f	2	Glaukoma	\N	\N	glaucoma	•	3	2026-04-05 14:24:19.189	2026-04-05 14:24:19.189
ea16ea07-d76c-44fc-bb38-19240c294066	6ba8a2d7-c816-41a6-8759-61c8529a6b8f	2	Retinal xirurgiya	\N	\N	retinal	•	4	2026-04-05 14:24:19.191	2026-04-05 14:24:19.191
27f40736-4d5a-4647-937a-f08747f30752	6ba8a2d7-c816-41a6-8759-61c8529a6b8f	2	Boshqa ko'z operatsiyalari	\N	\N	other-eye	•	5	2026-04-05 14:24:19.192	2026-04-05 14:24:19.192
12d7fddc-c8b4-41d6-8063-1a0cb9a5cba2	ac58d28d-0535-4895-b454-b140e4cffcf7	2	Laparoskopik operatsiyalar	\N	\N	lap-gyn	•	1	2026-04-05 14:24:19.195	2026-04-05 14:24:19.195
c848e2b1-8abf-4844-8f89-02eda59c77ea	ac58d28d-0535-4895-b454-b140e4cffcf7	2	Gisteroskopik operatsiyalar	\N	\N	hysteroscopic	•	2	2026-04-05 14:24:19.196	2026-04-05 14:24:19.196
edc85463-11d4-4d45-b2e6-97eaefaa59a8	ac58d28d-0535-4895-b454-b140e4cffcf7	2	Reproduktiv xirurgiya	\N	\N	repro-surg	•	3	2026-04-05 14:24:19.198	2026-04-05 14:24:19.198
f9dff4c2-92b4-432a-8974-619c2838816d	ac58d28d-0535-4895-b454-b140e4cffcf7	2	Onkogynekologiya	\N	\N	onco-gyn	•	4	2026-04-05 14:24:19.199	2026-04-05 14:24:19.199
8d461cb0-f603-41b5-8875-646f8f6ad467	ac58d28d-0535-4895-b454-b140e4cffcf7	2	Obstetrik operatsiyalar	\N	\N	obstetric	•	5	2026-04-05 14:24:19.202	2026-04-05 14:24:19.202
f9b029dd-503b-4c93-b150-6f196a8fe8ac	f7a2fc0e-791a-432f-8275-0b3f47bad30b	2	Tizza operatsiyalari	\N	\N	knee	•	1	2026-04-05 14:24:19.203	2026-04-05 14:24:19.203
6c3dccfe-d0ef-4f5c-b06a-09f72b36d848	f7a2fc0e-791a-432f-8275-0b3f47bad30b	2	Elka operatsiyalari	\N	\N	shoulder	•	2	2026-04-05 14:24:19.205	2026-04-05 14:24:19.205
89b5f497-8d2b-4ba5-b27f-d57dba82c949	f7a2fc0e-791a-432f-8275-0b3f47bad30b	2	Umurtqa operatsiyalari	\N	\N	spine	•	3	2026-04-05 14:24:19.207	2026-04-05 14:24:19.207
e4cb4fd7-e966-4c47-be57-12a41fd91878	f7a2fc0e-791a-432f-8275-0b3f47bad30b	2	Bo'g'im protezlash	\N	\N	joint-replace	•	4	2026-04-05 14:24:19.209	2026-04-05 14:24:19.209
d8a40794-52a9-4a2d-a18c-5a0d75093165	f7a2fc0e-791a-432f-8275-0b3f47bad30b	2	Qo'l xirurgiyasi	\N	\N	hand-surg	•	5	2026-04-05 14:24:19.211	2026-04-05 14:24:19.211
1df2dd9f-7ae0-45e9-9e59-35dcbd38c4c6	f7a2fc0e-791a-432f-8275-0b3f47bad30b	2	Siniq davolash	\N	\N	fracture	•	6	2026-04-05 14:24:19.213	2026-04-05 14:24:19.213
d9460ecf-81b3-4a24-a759-c96011647643	05bf5686-7ad7-4324-a85c-1587e8a29ca7	2	IVF jarayonlari	\N	\N	ivf	•	1	2026-04-05 14:24:19.215	2026-04-05 14:24:19.215
0a8cf290-2bde-43d7-a35d-4aca7a7fdae6	05bf5686-7ad7-4324-a85c-1587e8a29ca7	2	Embrion proceduralar	\N	\N	embryo	•	2	2026-04-05 14:24:19.217	2026-04-05 14:24:19.217
34d79946-2e85-4a75-842c-74a1b06e0152	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Axlat tahlillari	Кал и пищеварение	Stool & Digestion	axlat-tahlillari	💩	3	2026-03-25 18:26:33.277	2026-04-08 17:17:35.508
f8d55b53-8c40-450e-ae56-8484d788fc28	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Yallig'lanish markerlari	Специальные анализы	Special Tests	yallig'lanish-markerlari	🦴	10	2026-03-25 18:26:33.296	2026-04-10 02:22:32.2
f0260cec-b802-4898-8264-f337b0536e4e	3fdbcf9f-c792-4a11-ac96-dd8312d7f02f	2	PET KT (POZITRON EMISSION TOMOGRAFIYA) 	Томография	Tomography	pet-kt-(pozitron-emission-tomografiya)-	🧲	1	2026-03-25 18:26:33.3	2026-04-11 06:38:38.759
0679a97e-b5cf-42e6-b2ba-5a8f072b4285	3fdbcf9f-c792-4a11-ac96-dd8312d7f02f	2	Ultratovush tekshiruvi (UTT, UZI)	Ультразвук	Ultrasound	ultratovush-tekshiruvi-(utt,-uzi)	🔊	3	2026-03-25 18:26:33.304	2026-04-11 11:15:51.666
31aa204f-13d7-4c3f-ab94-9253cd2c2740	3fdbcf9f-c792-4a11-ac96-dd8312d7f02f	2	Elektroencefalografiya (EEG)	Функциональная диагностика	Functional Diagnostics	elektroencefalografiya-(eeg)	📈	4	2026-03-25 18:26:33.305	2026-04-11 11:40:19.368
832d1d87-baec-4228-9d6a-998a2398f11d	3fdbcf9f-c792-4a11-ac96-dd8312d7f02f	2	Rentgen tekshiruvlari	Рентгенология	Radiology	rentgen-tekshiruvlari	☢️	2	2026-03-25 18:26:33.302	2026-04-11 18:42:16.314
3490cb3b-3915-41aa-9170-df99805789dd	05bf5686-7ad7-4324-a85c-1587e8a29ca7	2	Donor dasturlari	\N	\N	donor	•	3	2026-04-05 14:24:19.222	2026-04-05 14:24:19.222
ee4b30ac-db05-4394-bdbd-f0a9dce8d8d9	05bf5686-7ad7-4324-a85c-1587e8a29ca7	2	Qo'shimcha protseduralar	\N	\N	add-repro	•	4	2026-04-05 14:24:19.228	2026-04-05 14:24:19.228
63873ed5-acf0-4a34-bbd0-5fed3af9d950	9a7541b8-3ca7-4f2e-9631-477269720aec	2	Qorin xirurgiyasi	\N	\N	abdominal	•	1	2026-04-05 14:24:19.231	2026-04-05 14:24:19.231
d989bac1-6cc8-4409-a779-7d4714515adc	9a7541b8-3ca7-4f2e-9631-477269720aec	2	Laparoskopik operatsiyalar	\N	\N	lap-gen	•	2	2026-04-05 14:24:19.234	2026-04-05 14:24:19.234
4c02f545-395e-4825-a211-60a1174e88e9	9a7541b8-3ca7-4f2e-9631-477269720aec	2	Ko'krak xirurgiyasi	\N	\N	breast	•	3	2026-04-05 14:24:19.236	2026-04-05 14:24:19.236
afb04743-eb8e-4502-b0f8-6af25a525e96	9a7541b8-3ca7-4f2e-9631-477269720aec	2	Qalqonsimon bez	\N	\N	thyroid	•	4	2026-04-05 14:24:19.237	2026-04-05 14:24:19.237
1fe31233-9b43-4002-9ae7-1c1498261bb7	9a7541b8-3ca7-4f2e-9631-477269720aec	2	Gemorroi va kolorektal	\N	\N	colorectal	•	5	2026-04-05 14:24:19.239	2026-04-05 14:24:19.239
14267afe-b73f-4a8c-b036-fc4240b1dd68	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Biokimyoviy qon tahlillari 	\N	\N	biokimyoviy-qon-tahlillari-	•	0	2026-04-07 00:59:03.935	2026-04-07 00:59:03.935
077742fb-9cee-4637-ac82-5a92f36c195b	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Gastrit va yaralar diagnostikasi	\N	\N	gastrit-va-yaralar-diagnostikasi	•	0	2026-04-07 14:43:57.271	2026-04-07 14:43:57.271
82a70a67-f245-48d3-b09c-e34eb9e4a00d	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Kamqonlik (anemiya) diagnostikasi 	\N	\N	kamqonlik-(anemiya)-diagnostikasi-	•	0	2026-04-07 14:54:31.574	2026-04-07 14:54:31.574
345617ac-ace1-4712-8eeb-17f631be538a	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Elektrolitlar (tuzlar)	\N	\N	elektrolitlar-(tuzlar)	•	0	2026-04-07 16:28:53.878	2026-04-07 16:28:53.878
7fee35d3-47dc-4cb8-a65d-0694308a2d70	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Qon klinik tahlillari	Анализы крови	Blood Tests	qon-klinik-tahlillari	🩸	1	2026-03-25 18:26:33.272	2026-04-08 01:55:51.639
596ad7df-5e8d-4112-994e-0470f029f2d8	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	PCR (ПЦР)  diagnostika	\N	\N	pcr-(пцр)-diagnostika	🩸	0	2026-04-08 02:04:13.075	2026-04-08 02:04:48.408
f74c1fb6-0db2-49e0-a965-cebfd3742647	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Ekspress diagnostika (gepatit, VICH, Troponin, COVID, sifilis, Brucellez)	\N	\N	ekspress-diagnostika-(gepatit,-vich,-troponin,-covid,-sifilis,-brucellez)	🩸	0	2026-04-07 03:35:45.296	2026-04-08 02:05:07.715
e36bc5b3-7537-400b-915b-cb829ea303a2	9a7541b8-3ca7-4f2e-9631-477269720aec	2	Qon tomirlari xirurgiyasi	\N	\N	qon-tomirlari-xirurgiyasi	⚕️	6	2026-04-05 14:24:19.241	2026-04-09 06:42:33.543
308d2159-0ad9-42bf-bb23-bea05fa770e5	f1efc773-2d07-4e87-ac59-29e1aaffd1dd	1	Test	\N	\N	test	:)	0	2026-04-09 07:34:03.444	2026-04-09 07:34:03.444
1c1b82ce-9dc6-49b4-b79a-bd3ca6db5307	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Spermogramma	\N	\N	spermogramma	🔬	0	2026-04-09 12:42:47.677	2026-04-09 12:43:36.481
a52815ee-83b7-48a3-b916-f8315195d3ff	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Koagulogramma	\N	\N	koagulogramma	•	0	2026-04-09 16:54:35.776	2026-04-09 16:54:35.776
4abb0c15-e25e-4111-86a4-5126c1f3faf3	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Lipid spektri (lipidogramma)	\N	\N	lipid-spektri-(lipidogramma)	•	0	2026-04-10 00:53:45.903	2026-04-10 00:53:45.903
4879a86c-b315-40c6-a648-56d277d6137c	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Qondagi oqsillar	\N	\N	qondagi-oqsillar	•	0	2026-04-10 01:09:14.458	2026-04-10 01:09:14.458
43540a37-d12c-41e3-9307-b7e16f1224c7	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Suyak to'qimasi emirilishi tahlillari	\N	\N	suyak-to'qimasi-emirilishi-tahlillari	•	0	2026-04-10 02:35:47.926	2026-04-10 02:35:47.926
1908bae5-f54f-459a-b526-7f3c6badf7fc	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Vitaminlar	\N	\N	vitaminlar	•	0	2026-04-10 03:37:19.074	2026-04-10 03:37:19.074
b2ef5ee6-3564-4a6e-9c41-65053aed4bd6	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Qonda gazlar  va elektrolitlar  tahlili	\N	\N	qonda-gazlar-va-elektrolitlar-tahlili	•	0	2026-04-10 03:43:44.998	2026-04-10 03:43:44.998
8df81fd5-88f7-4363-85e2-b7e9f214362b	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Qondagi Gormonlar Tahlili	Анализы гормонов	Hormone Tests	qondagi-gormonlar-tahlili	🔬	7	2026-03-25 18:26:33.288	2026-04-10 07:46:22.258
4bf2b086-8aff-4731-84a3-35e2270a7a22	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Qandli Diabetni va oshqozon osti bezini tekshirish 	\N	\N	qandli-diabetni-va-oshqozon-osti-bezini-tekshirish-	•	0	2026-04-10 16:06:01.514	2026-04-10 16:06:01.514
9b557738-0632-4ee4-8926-ee5f766d3fac	3fdbcf9f-c792-4a11-ac96-dd8312d7f02f	2	MSKT (MULTISPIRAL KOMPYUTER TOMOGRAFIYA)	\N	\N	mskt-(multispiral-kompyuter-tomografiya)	•	0	2026-04-11 06:39:32.899	2026-04-11 06:39:32.899
4f46d731-d3a6-4168-8a6d-00643b732e5f	f4aeef29-c440-4cdd-bbc1-914a9c181a70	1	Endoskopik tekshiruvlar 	\N	\N	endoskopik-tekshiruvlar-	•	0	2026-04-11 07:25:26.232	2026-04-11 07:25:26.232
2da2ff01-0d45-483a-93a3-8d999cead760	3fdbcf9f-c792-4a11-ac96-dd8312d7f02f	2	MRT (MAGNIT REZONANSLI TOMOGRAFIYA)	\N	\N	mrt-(magnit-rezonansli-tomografiya)	•	0	2026-04-11 07:22:14.556	2026-04-11 08:03:11.438
8f19fecb-8e6b-49f8-b6d0-efcdb2e2b522	3fdbcf9f-c792-4a11-ac96-dd8312d7f02f	2	Yurak (EKG, EHOKS va HOLTER) uchun 	\N	\N	yurak-(ekg,-ehoks-va-holter)-uchun-	•	0	2026-04-11 11:40:55.428	2026-04-11 11:46:09.492
34f43fd9-1e7b-4983-b91f-98f665a782a1	3fdbcf9f-c792-4a11-ac96-dd8312d7f02f	2	Tomirlar doplerografiyasi hamda Dupleks   skanerlash usuli  	\N	\N	tomirlar-doplerografiyasi-hamda-dupleks-skanerlash-usuli-	•	0	2026-04-11 11:44:12.868	2026-04-11 11:57:40.751
ae5de035-8b3a-4b90-8d32-4f58ac03f2c1	4f46d731-d3a6-4168-8a6d-00643b732e5f	2	Endoskopiya  (gastroskopiya, kolonoskopiya, bronhoskopiya)	\N	\N	endoskopiya-(gastroskopiya,-kolonoskopiya,-bronhoskopiya)	•	0	2026-04-11 07:27:08.111	2026-04-11 17:28:49.619
e84af75a-3af8-4c12-bd50-152f7554ecdf	4f46d731-d3a6-4168-8a6d-00643b732e5f	2	Kapsula endoskopiya 	\N	\N	kapsula-endoskopiya-	•	0	2026-04-11 17:29:36.698	2026-04-11 17:29:36.698
5dd51a11-4665-4586-8012-dc557c1a5c75	401c9eae-9bbe-4d60-8248-85c4fbb8a54b	2	Allergologiya	\N	\N	allergologiya	•	0	2026-04-11 18:37:15.492	2026-04-11 18:37:15.492
8ca439fa-8cc8-40c0-8edc-ea02c9fdff5e	f1efc773-2d07-4e87-ac59-29e1aaffd1dd	1	LOR operatciyalari 	\N	\N	lor-operatciyalari-	•	0	2026-04-13 10:58:26.168	2026-04-13 10:58:26.168
ffe173ee-47b7-4e6a-add6-f44dac12be89	f1efc773-2d07-4e87-ac59-29e1aaffd1dd	1	EKO qilish	\N	\N	eko-qilish	•	0	2026-04-13 10:58:50.652	2026-04-13 10:58:50.652
\.


--
-- Data for Name: ServiceCustomization; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."ServiceCustomization" (id, "clinicServiceId", "customNameUz", "customNameRu", "customDescriptionUz", "customDescriptionRu", benefits, "preparationUz", "preparationRu", "customCategory", tags, "estimatedDurationMinutes", "availableDays", "availableTimeSlots", "requiresAppointment", "requiresPrepayment", "prepaymentPercentage", "isHighlighted", "displayOrder", "createdAt", "updatedAt", "customPrice", "discountPercent", accuracy, "additionalInfo", "bookingPolicy", certifications, equipment, "fullDescriptionRu", "fullDescriptionUz", "preparationJson", "processDescription", "resultFormat", "resultTimeHours", "sampleVolume") FROM stdin;
8bca5e5e-3ec9-4267-89a5-4a16d4ef44bc	94aa606c-9b25-4bd0-a5d2-404e7e4fd614	Deploy Test - Qon Tahlillari	\N	Zamonaviy uskunalar bilan tezkor va aniq qon tahlillari	\N	[{"uz": "Tezkor natijalar (2 soat ichida)"}, {"uz": "Yuqori aniqlik (99.5%+)"}, {"uz": "Xalqaro sertifikatlangan"}, {"uz": "Qulay vaqt tanlash"}]	Tong soat 8:00 dan boshlab och qorin bo'lishi kerak. Suv ichish mumkin emas.	\N	\N	{"qon tahlili",laboratoriya,tezkor,aniq}	15	{monday,tuesday,wednesday,thursday,friday,saturday}	{"friday": [{"end": "12:00", "start": "08:00"}, {"end": "18:00", "start": "14:00"}], "monday": [{"end": "12:00", "start": "08:00"}, {"end": "18:00", "start": "14:00"}], "tuesday": [{"end": "12:00", "start": "08:00"}, {"end": "18:00", "start": "14:00"}], "saturday": [{"end": "13:00", "start": "08:00"}], "thursday": [{"end": "12:00", "start": "08:00"}, {"end": "18:00", "start": "14:00"}], "wednesday": [{"end": "12:00", "start": "08:00"}, {"end": "18:00", "start": "14:00"}]}	t	t	12	t	\N	2026-03-25 20:30:39.19	2026-03-26 16:34:22.037	90000	5	99.5% dan yuqori	{"experience": "15 yillik tajriba", "dailyCapacity": 200, "specialFeatures": ["Uyga chaqirish xizmati", "Tezkor natijalar", "Shifokor maslahati"]}	{"cancellationPolicy": "24 soat oldin bekor qilinsa to'liq qaytariladi", "prepaymentRequired": false}	["ISO 15189", "CAP akkreditatsiyasi"]	Updated equipment list	\N	Updated after deployment verification	{"bestTime": "Tong 8:00-10:00", "documents": "Shifokor yo'llanmasi", "fastingHours": 8, "waterAllowed": false}	Updated process from API test	PDF formatida, elektron va qog'oz nusxada	2	5-10 ml venoz qon
270c97ac-c460-4688-87b3-12d727d927c9	39acf436-4ab6-4e65-9d19-af9ca300f71b	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	f	\N	f	\N	2026-04-05 16:47:43.042	2026-04-05 16:47:43.042	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
18c5dfbf-f9f5-467e-a9cb-848e3e55d6cd	674645fa-6dd5-4a8f-88b8-d83a70407138	\N	\N	Maxsus tavsif Maxsus tavsif Maxsus tavsif Maxsus tavsif Maxsus tavsif Maxsus tavsif	Maxsus tavsif (Maxsus tavsif (Maxsus tavsif (Maxsus tavsif (	\N	Tayyorgarlik ko'rsatmalariTayyorgarlik ko'rsatmalariTayyorgarlik ko'rsatmalariTayyorgarlik ko'rsatmalariTayyorgarlik ko'rsatmalariTayyorgarlik ko'rsatmalari	\N	Standard	{aniq,og'riqsiz,professional}	40	{monday,tuesday,wednesday,thursday,friday,saturday,sunday}	{"friday": [{"end": "18:00", "start": "08:00"}], "monday": [{"end": "18:00", "start": "08:00"}], "sunday": [{"end": "18:00", "start": "08:00"}], "tuesday": [{"end": "18:00", "start": "08:00"}], "saturday": [{"end": "18:00", "start": "08:00"}], "thursday": [{"end": "20:00", "start": "08:00"}], "wednesday": [{"end": "18:00", "start": "08:00"}]}	t	f	\N	f	\N	2026-04-06 11:36:49.573	2026-04-06 11:36:49.573	200000	10	\N	null	{"bookingMethods": [], "cancellationPolicy": "Buyurtma siyosati", "modificationPolicy": "O'zgartirish shartlari", "prepaymentRequired": true}	null	\N	\N	\N	{"bestTime": "08;00", "documents": " Olib kelish kerak bo'lgan hujjatlar Olib kelish kerak bo'lgan hujjatlar", "specialDiet": "Ovqatlanish bo'yicha cheklovlarOvqatlanish bo'yicha cheklovlarOvqatlanish bo'yicha cheklovlar", "fastingHours": 5}	Jarayon tavsifi\n\nSizning klinikangizda jarayon qanday bosqichlardan iborat\nJarayon tavsifi (qadamma-qadam)\nBemor klinikaga kelganidan boshlab natija olguncha bo'lgan jarayonni bosqichma-bosqich yozing.	\N	24	\N
\.


--
-- Data for Name: ServiceImage; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."ServiceImage" (id, "customizationId", url, alt, "order", "isPrimary", "uploadedAt") FROM stdin;
a8d5ac44-7db6-427a-9521-96817054d7ed	8bca5e5e-3ec9-4267-89a5-4a16d4ef44bc	/uploads/services/service-1774470653087-499527665.webp		1	f	2026-03-25 20:30:53.095
13eb75df-dc42-474a-a027-a09cf8295502	8bca5e5e-3ec9-4267-89a5-4a16d4ef44bc	/uploads/services/service-1774541617890-484620459.jpeg		2	t	2026-03-26 16:13:37.904
6c216234-06f2-4d58-a10d-ec0830e008b0	270c97ac-c460-4688-87b3-12d727d927c9	/uploads/services/service-1775407663036-346763652.webp		1	t	2026-04-05 16:47:43.048
\.


--
-- Data for Name: ServiceReview; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."ServiceReview" (id, "userId", "diagnosticServiceId", "surgicalServiceId", "sanatoriumServiceId", rating, comment, status, "reviewedBy", "reviewedAt", "rejectionReason", "createdAt", "updatedAt") FROM stdin;
868d0eea-b840-4ed2-8bfc-7b618ebc8330	a3ed4b1c-f5dc-4ab5-ab44-07f2c762cf43	3e544ae8-e8eb-4c77-b0a9-6e7fde4f2d43	\N	\N	5	+998 98 765-43-21aA+998 98 765-43-21aA+998 98 765-43-21aA+998 98 765-43-21aA+998 98 765-43-21aA+998 98 765-43-21aA+998 98 765-43-21aA+998 98 765-43-21aA+998 98 765-43-21aA+998 98 765-43-21aA+998 98 765-43-21aA	APPROVED	\N	\N	\N	2026-04-06 07:05:42.806	2026-04-06 07:05:42.806
3f82900b-9982-4ad4-a36e-1e72df22a107	a3ed4b1c-f5dc-4ab5-ab44-07f2c762cf43	2501fdfa-04d4-4441-88ea-f9d80af9ba26	\N	\N	4	goa dsa adu  nads	APPROVED	\N	\N	\N	2026-04-06 11:29:08.476	2026-04-06 11:29:08.476
\.


--
-- Data for Name: SurgicalService; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."SurgicalService" (id, "nameUz", "nameRu", "nameEn", "categoryId", "shortDescription", "fullDescription", "imageUrl", "priceRecommended", "priceMin", "priceMax", "durationMinutes", "minDuration", "maxDuration", "recoveryDays", "anesthesiaType", "anesthesiaNotes", "requiresHospitalization", "hospitalizationDays", "roomType", "requiresICU", "icuDays", "hospitalizationNotes", "requiredTests", "preparationFasting", "fastingHours", "preparationMedication", "preparationRestrictions", "preparationTimeline", "contraindicationsAbsolute", "contraindicationsRelative", complexity, "riskLevel", "minSurgeonExperience", "surgeonQualifications", "surgeonSpecialization", "requiredEquipment", "operationStages", "postOpImmediate", "postOpHome", "followUpSchedule", "recoveryMilestones", "packageIncluded", "packageExcluded", alternatives, faqs, "successRate", "videoUrl", "isActive", "createdById", "createdAt", "updatedAt") FROM stdin;
b725a638-3b5c-4e11-ad71-4439ee017e76	Standart katarakta operatsiyasi	\N	\N	7e6b8cca-9799-4d3f-9ae3-74544595b062	\N	\N	\N	3000000	2500000	4000000	0	\N	\N	7	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.263	2026-04-05 14:24:19.263
9d08025a-0809-44a8-ae5e-f648ba27cde9	Premium katarakta (Trifocal linza)	\N	\N	7e6b8cca-9799-4d3f-9ae3-74544595b062	\N	\N	\N	8000000	7000000	10000000	0	\N	\N	7	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.272	2026-04-05 14:24:19.272
7540af87-4e61-4c28-a726-6b0da72f7ec4	Murakkab katarakta	\N	\N	7e6b8cca-9799-4d3f-9ae3-74544595b062	\N	\N	\N	5000000	4000000	7000000	0	\N	\N	14	LOCAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.276	2026-04-05 14:24:19.276
7e88f5df-c7a0-4f66-9a6a-abce44fda51a	LASIK	\N	\N	41ea5024-72be-4711-b943-a03eb8352c9e	\N	\N	\N	6000000	5000000	8000000	0	\N	\N	3	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.281	2026-04-05 14:24:19.281
c97fca76-6121-466e-834d-c0c456f70691	PRK (Photorefractive Keratectomy)	\N	\N	41ea5024-72be-4711-b943-a03eb8352c9e	\N	\N	\N	5000000	4000000	7000000	0	\N	\N	7	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.284	2026-04-05 14:24:19.284
0ea334cb-3a30-4a46-a18e-8b6ec8f9fe25	SMILE	\N	\N	41ea5024-72be-4711-b943-a03eb8352c9e	\N	\N	\N	8000000	7000000	10000000	0	\N	\N	2	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.289	2026-04-05 14:24:19.289
e30252d9-06bc-42e0-87be-f06e7afe38a4	ICL (Implantable Contact Lens)	\N	\N	41ea5024-72be-4711-b943-a03eb8352c9e	\N	\N	\N	12000000	10000000	15000000	0	\N	\N	7	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.293	2026-04-05 14:24:19.293
f5a86a84-285c-497b-ba7f-e742f6cfe7ad	Trabekulektomiya	\N	\N	d8d8ac55-097b-42af-a6cc-0149d48b3194	\N	\N	\N	4000000	3500000	5500000	0	\N	\N	14	LOCAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.297	2026-04-05 14:24:19.297
f50b1d4d-6cf2-4e6e-9c3e-d8322b3f28fd	Shunt implantatsiya	\N	\N	d8d8ac55-097b-42af-a6cc-0149d48b3194	\N	\N	\N	6000000	5000000	8000000	0	\N	\N	21	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.301	2026-04-05 14:24:19.301
8f28e308-7911-4b22-acc0-4448b1985ba4	Lazer trabekuloplastika	\N	\N	d8d8ac55-097b-42af-a6cc-0149d48b3194	\N	\N	\N	2000000	1500000	3000000	0	\N	\N	1	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	SIMPLE	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.305	2026-04-05 14:24:19.305
bd0d5a6d-3b37-4dd1-ae27-4d8103647b1d	Vitrektomiya	\N	\N	ea16ea07-d76c-44fc-bb38-19240c294066	\N	\N	\N	8000000	7000000	12000000	0	\N	\N	30	GENERAL	\N	t	3	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.309	2026-04-05 14:24:19.309
006ae26d-7789-40b7-8509-f454d4dbbca5	Retinal detachment repair	\N	\N	ea16ea07-d76c-44fc-bb38-19240c294066	\N	\N	\N	10000000	8000000	15000000	0	\N	\N	45	GENERAL	\N	t	5	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.312	2026-04-05 14:24:19.312
92a1f4c1-613e-48a3-90d6-5fd36ea436f4	Makulyar teshik operatsiyasi	\N	\N	ea16ea07-d76c-44fc-bb38-19240c294066	\N	\N	\N	9000000	7500000	13000000	0	\N	\N	30	GENERAL	\N	t	3	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.316	2026-04-05 14:24:19.316
fef2101f-8c45-46fb-aa95-b8ca97ab1e3e	Diabetik retinopatiya	\N	\N	ea16ea07-d76c-44fc-bb38-19240c294066	\N	\N	\N	7000000	6000000	10000000	0	\N	\N	21	LOCAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.321	2026-04-05 14:24:19.321
3c1f65a0-2d0f-47e0-af69-fc7250077364	Pterygium olib tashlash	\N	\N	27f40736-4d5a-4647-937a-f08747f30752	\N	\N	\N	1500000	1000000	2500000	0	\N	\N	7	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	SIMPLE	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.327	2026-04-05 14:24:19.327
81c07cde-d05a-48bd-bd24-902ca3661e77	Strabismus tuzatish	\N	\N	27f40736-4d5a-4647-937a-f08747f30752	\N	\N	\N	3500000	3000000	5000000	0	\N	\N	14	GENERAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.331	2026-04-05 14:24:19.331
90b145cc-02ba-4446-b876-ba21f036d1f3	Oculoplastic surgery	\N	\N	27f40736-4d5a-4647-937a-f08747f30752	\N	\N	\N	5000000	4000000	7000000	0	\N	\N	21	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.335	2026-04-05 14:24:19.335
d4fe8c27-add3-4401-a25b-e0025102e141	Laparoskopik kist olib tashlash	\N	\N	12d7fddc-c8b4-41d6-8063-1a0cb9a5cba2	\N	\N	\N	5000000	4000000	7000000	0	\N	\N	7	GENERAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.339	2026-04-05 14:24:19.339
2d70c296-07cd-4fa3-a297-57c70f717cef	Laparoskopik mioma olib tashlash	\N	\N	12d7fddc-c8b4-41d6-8063-1a0cb9a5cba2	\N	\N	\N	8000000	7000000	12000000	0	\N	\N	14	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.343	2026-04-05 14:24:19.343
d5bff513-cd69-4d03-b79a-b864e302c982	Laparoskopik endometrioz davolash	\N	\N	12d7fddc-c8b4-41d6-8063-1a0cb9a5cba2	\N	\N	\N	7000000	6000000	10000000	0	\N	\N	14	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.347	2026-04-05 14:24:19.347
03933536-90d5-464e-92fc-c953268abd24	Laparoskopik gisterektomiya	\N	\N	12d7fddc-c8b4-41d6-8063-1a0cb9a5cba2	\N	\N	\N	12000000	10000000	18000000	0	\N	\N	21	GENERAL	\N	t	3	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.351	2026-04-05 14:24:19.351
75cbf8ac-8f29-4cce-b6f5-a91ca4241de7	Gisteroskopik polip olib tashlash	\N	\N	c848e2b1-8abf-4844-8f89-02eda59c77ea	\N	\N	\N	2500000	2000000	4000000	0	\N	\N	3	GENERAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	SIMPLE	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.355	2026-04-05 14:24:19.355
e07dce6c-6a43-455d-a689-93372eaf809f	Gisteroskopik myomectomy	\N	\N	c848e2b1-8abf-4844-8f89-02eda59c77ea	\N	\N	\N	5000000	4000000	7000000	0	\N	\N	7	GENERAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.359	2026-04-05 14:24:19.359
ce7f45f8-2781-4267-9052-019d69031fba	Gisteroskopik septum resection	\N	\N	c848e2b1-8abf-4844-8f89-02eda59c77ea	\N	\N	\N	4500000	3500000	6500000	0	\N	\N	7	GENERAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.362	2026-04-05 14:24:19.362
ca8972e3-8027-4136-a090-5bd6f6e2dd4e	Tubal ligation reversal	\N	\N	edc85463-11d4-4d45-b2e6-97eaefaa59a8	\N	\N	\N	8000000	7000000	12000000	0	\N	\N	21	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.365	2026-04-05 14:24:19.365
903f08c1-dbf9-47dd-af86-0ac608136690	Ovarian drilling	\N	\N	edc85463-11d4-4d45-b2e6-97eaefaa59a8	\N	\N	\N	4000000	3000000	6000000	0	\N	\N	7	GENERAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.368	2026-04-05 14:24:19.368
d604acd6-9a80-48ff-b035-c74b77cb1fe1	Salpingectomy	\N	\N	edc85463-11d4-4d45-b2e6-97eaefaa59a8	\N	\N	\N	5000000	4000000	7500000	0	\N	\N	14	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.37	2026-04-05 14:24:19.37
9a17f668-9e6d-4bda-9795-c3475912d291	Bachadon operatsiyasi (Hysterectomy)	\N	\N	f9dff4c2-92b4-432a-8974-619c2838816d	\N	\N	\N	15000000	12000000	22000000	0	\N	\N	42	GENERAL	\N	t	5	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.374	2026-04-05 14:24:19.374
dd420cba-6088-43fc-a762-dbf108279b2f	Tuxumdon operatsiyasi (Oophorectomy)	\N	\N	f9dff4c2-92b4-432a-8974-619c2838816d	\N	\N	\N	12000000	10000000	18000000	0	\N	\N	30	GENERAL	\N	t	4	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.377	2026-04-05 14:24:19.377
b4042060-5f0f-4c47-9592-1fe0cdf70e2e	Lymph node dissection	\N	\N	f9dff4c2-92b4-432a-8974-619c2838816d	\N	\N	\N	18000000	15000000	25000000	0	\N	\N	42	GENERAL	\N	t	5	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.381	2026-04-05 14:24:19.381
53c7c040-a840-464b-9cf5-c28f88eb08fb	Kesariya kesma (C-section)	\N	\N	8d461cb0-f603-41b5-8875-646f8f6ad467	\N	\N	\N	8000000	6000000	12000000	0	\N	\N	42	SPINAL	\N	t	5	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.384	2026-04-05 14:24:19.384
5008201b-f776-4b6c-964b-47d3b9a49870	Emergency C-section	\N	\N	8d461cb0-f603-41b5-8875-646f8f6ad467	\N	\N	\N	12000000	10000000	18000000	0	\N	\N	42	GENERAL	\N	t	5	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.386	2026-04-05 14:24:19.386
c1f32a25-b50b-4c79-8726-82071e6ac0bd	VBAC support surgery	\N	\N	8d461cb0-f603-41b5-8875-646f8f6ad467	\N	\N	\N	10000000	8000000	15000000	0	\N	\N	42	SPINAL	\N	t	5	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.389	2026-04-05 14:24:19.389
b148686f-50ca-430f-b54a-9b2f89cb2994	ACL reconstruction	\N	\N	f9b029dd-503b-4c93-b150-6f196a8fe8ac	\N	\N	\N	15000000	12000000	20000000	0	\N	\N	180	SPINAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.394	2026-04-05 14:24:19.394
18ab9e42-0f45-49a3-ac36-22e6977ccd5c	Meniscus repair	\N	\N	f9b029dd-503b-4c93-b150-6f196a8fe8ac	\N	\N	\N	8000000	6000000	12000000	0	\N	\N	90	SPINAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.4	2026-04-05 14:24:19.4
16615d9d-08dc-41e3-a596-dfef328f5188	Tizza protezlash (Total knee replacement)	\N	\N	f9b029dd-503b-4c93-b150-6f196a8fe8ac	\N	\N	\N	35000000	30000000	50000000	0	\N	\N	180	SPINAL	\N	t	7	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.404	2026-04-05 14:24:19.404
768f79fb-e8a0-47a5-84f2-4379649c54bd	Artroskopik debridement	\N	\N	f9b029dd-503b-4c93-b150-6f196a8fe8ac	\N	\N	\N	6000000	5000000	9000000	0	\N	\N	30	SPINAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.407	2026-04-05 14:24:19.407
e6974503-12e5-4ba5-b4dc-4158c96a4dfb	Rotator cuff repair	\N	\N	6c3dccfe-d0ef-4f5c-b06a-09f72b36d848	\N	\N	\N	12000000	10000000	18000000	0	\N	\N	180	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.41	2026-04-05 14:24:19.41
f477052c-434e-4894-868d-bb1ba738e783	Elka protezlash	\N	\N	6c3dccfe-d0ef-4f5c-b06a-09f72b36d848	\N	\N	\N	30000000	25000000	45000000	0	\N	\N	180	GENERAL	\N	t	5	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.413	2026-04-05 14:24:19.413
349392f7-9d91-4182-b515-bcdb699745c1	Bankart repair	\N	\N	6c3dccfe-d0ef-4f5c-b06a-09f72b36d848	\N	\N	\N	10000000	8000000	15000000	0	\N	\N	90	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.416	2026-04-05 14:24:19.416
e787d8b7-83db-46e2-9685-2a8312d8533b	Acromioplasty	\N	\N	6c3dccfe-d0ef-4f5c-b06a-09f72b36d848	\N	\N	\N	8000000	6000000	12000000	0	\N	\N	60	GENERAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.419	2026-04-05 14:24:19.419
e751db25-67af-4321-a9e8-d0f320e28cd3	Disk herniya operatsiyasi (Microdiscectomy)	\N	\N	89b5f497-8d2b-4ba5-b27f-d57dba82c949	\N	\N	\N	18000000	15000000	25000000	0	\N	\N	42	GENERAL	\N	t	3	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.421	2026-04-05 14:24:19.421
6ff761a2-d4c9-4f28-bb89-867976b5bf56	Spinal fusion	\N	\N	89b5f497-8d2b-4ba5-b27f-d57dba82c949	\N	\N	\N	35000000	28000000	50000000	0	\N	\N	180	GENERAL	\N	t	7	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.425	2026-04-05 14:24:19.425
32feaf05-5d5e-41d1-adfd-bab6e25c43b7	Laminektomiya	\N	\N	89b5f497-8d2b-4ba5-b27f-d57dba82c949	\N	\N	\N	20000000	16000000	28000000	0	\N	\N	90	GENERAL	\N	t	5	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.427	2026-04-05 14:24:19.427
02775d94-137a-44fe-b5ed-820fe29c7848	Vertebroplasty	\N	\N	89b5f497-8d2b-4ba5-b27f-d57dba82c949	\N	\N	\N	12000000	10000000	18000000	0	\N	\N	14	LOCAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.43	2026-04-05 14:24:19.43
81fe653b-8784-4cf8-a0e4-d5cd71f9c7fb	Son bo'g'imi protezlash (Hip replacement)	\N	\N	e4cb4fd7-e966-4c47-be57-12a41fd91878	\N	\N	\N	40000000	32000000	60000000	0	\N	\N	180	SPINAL	\N	t	7	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.432	2026-04-05 14:24:19.432
e2fe86bc-5cff-480e-abc1-4848f55938a2	Tizza protezlash	\N	\N	e4cb4fd7-e966-4c47-be57-12a41fd91878	\N	\N	\N	35000000	30000000	50000000	0	\N	\N	180	SPINAL	\N	t	7	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.435	2026-04-05 14:24:19.435
53587d25-ea7c-4f8f-bcc3-9e97345a0135	Elka protezlash	\N	\N	e4cb4fd7-e966-4c47-be57-12a41fd91878	\N	\N	\N	30000000	25000000	45000000	0	\N	\N	180	GENERAL	\N	t	5	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.438	2026-04-05 14:24:19.438
b0aa75d9-0143-4232-b25c-c3414b54f6db	Tovon protezlash	\N	\N	e4cb4fd7-e966-4c47-be57-12a41fd91878	\N	\N	\N	28000000	22000000	40000000	0	\N	\N	180	SPINAL	\N	t	5	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.441	2026-04-05 14:24:19.441
9ac78cac-ff95-4639-b4f4-887bba58af97	Carpal tunnel release	\N	\N	d8a40794-52a9-4a2d-a18c-5a0d75093165	\N	\N	\N	3000000	2500000	5000000	0	\N	\N	21	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	SIMPLE	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.444	2026-04-05 14:24:19.444
ab7a9b55-ec7e-44eb-903f-840609e5d20d	Trigger finger release	\N	\N	d8a40794-52a9-4a2d-a18c-5a0d75093165	\N	\N	\N	2000000	1500000	3500000	0	\N	\N	14	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	SIMPLE	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.448	2026-04-05 14:24:19.448
8bd07c3d-b171-4e9d-9ef1-d064e5ef5f18	Dupuytren contracture	\N	\N	d8a40794-52a9-4a2d-a18c-5a0d75093165	\N	\N	\N	5000000	4000000	8000000	0	\N	\N	42	GENERAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.453	2026-04-05 14:24:19.453
0e01309d-70f3-44ab-827b-668ac7af2858	Tendon repair	\N	\N	d8a40794-52a9-4a2d-a18c-5a0d75093165	\N	\N	\N	6000000	5000000	9000000	0	\N	\N	60	GENERAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.456	2026-04-05 14:24:19.456
1b105a14-3782-4348-9db9-6b743f6f6c83	ORIF (Open reduction internal fixation)	\N	\N	1df2dd9f-7ae0-45e9-9e59-35dcbd38c4c6	\N	\N	\N	10000000	8000000	15000000	0	\N	\N	90	GENERAL	\N	t	3	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.459	2026-04-05 14:24:19.459
26c3aee7-ac0c-4a39-8810-1471d8d65e30	External fixation	\N	\N	1df2dd9f-7ae0-45e9-9e59-35dcbd38c4c6	\N	\N	\N	6000000	5000000	9000000	0	\N	\N	60	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.462	2026-04-05 14:24:19.462
43127673-946d-4d93-ba62-ed48e35b2ca2	Intramedullary nailing	\N	\N	1df2dd9f-7ae0-45e9-9e59-35dcbd38c4c6	\N	\N	\N	8000000	6000000	12000000	0	\N	\N	90	GENERAL	\N	t	3	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.465	2026-04-05 14:24:19.465
c2798d11-d5c8-41b0-9455-68a23676bce8	IVF (In-vitro fertilization)	\N	\N	d9460ecf-81b3-4a24-a759-c96011647643	\N	\N	\N	15000000	12000000	20000000	0	\N	\N	1	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.468	2026-04-05 14:24:19.468
5d8eca39-bde7-4c9d-a437-08de0b8e154e	ICSI (Intracytoplasmic sperm injection)	\N	\N	d9460ecf-81b3-4a24-a759-c96011647643	\N	\N	\N	18000000	15000000	25000000	0	\N	\N	1	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.472	2026-04-05 14:24:19.472
2f5994c8-2915-4a35-92eb-e761d56cbf3d	IMSI (Intracytoplasmic morphologically selected sperm injection)	\N	\N	d9460ecf-81b3-4a24-a759-c96011647643	\N	\N	\N	22000000	18000000	30000000	0	\N	\N	1	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.475	2026-04-05 14:24:19.475
d949c31f-9251-4974-89a2-7bd83f71486c	PGT (Preimplantation genetic testing)	\N	\N	d9460ecf-81b3-4a24-a759-c96011647643	\N	\N	\N	25000000	20000000	35000000	0	\N	\N	1	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.479	2026-04-05 14:24:19.479
a513c8fd-32fe-4a27-a286-dbd9b15395e9	Embrion muzlatish	\N	\N	0a8cf290-2bde-43d7-a35d-4aca7a7fdae6	\N	\N	\N	5000000	4000000	8000000	0	\N	\N	0	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	SIMPLE	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.483	2026-04-05 14:24:19.483
bf9f781b-2777-4965-9182-658ded407d63	Embrion transfer	\N	\N	0a8cf290-2bde-43d7-a35d-4aca7a7fdae6	\N	\N	\N	4000000	3000000	6000000	0	\N	\N	1	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	SIMPLE	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.486	2026-04-05 14:24:19.486
850e938f-4c4d-44c5-acca-b5d0e148317c	Assisted hatching	\N	\N	0a8cf290-2bde-43d7-a35d-4aca7a7fdae6	\N	\N	\N	3000000	2000000	5000000	0	\N	\N	1	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.488	2026-04-05 14:24:19.488
7628325d-b423-4ae3-9408-46fd7bb8e8d7	Blastocyst culture	\N	\N	0a8cf290-2bde-43d7-a35d-4aca7a7fdae6	\N	\N	\N	6000000	5000000	9000000	0	\N	\N	1	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.492	2026-04-05 14:24:19.492
6da59e4f-1b58-4e18-8281-e029c34653bd	Donor tuxumdon	\N	\N	3490cb3b-3915-41aa-9170-df99805789dd	\N	\N	\N	30000000	25000000	40000000	0	\N	\N	7	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.494	2026-04-05 14:24:19.494
1def5a1e-af50-4fad-9d85-9ef8d34fc689	Donor sperma	\N	\N	3490cb3b-3915-41aa-9170-df99805789dd	\N	\N	\N	5000000	4000000	8000000	0	\N	\N	0	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	SIMPLE	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.497	2026-04-05 14:24:19.497
61067f66-3516-4295-895d-969053e870c3	Donor embrion	\N	\N	3490cb3b-3915-41aa-9170-df99805789dd	\N	\N	\N	20000000	15000000	30000000	0	\N	\N	1	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.5	2026-04-05 14:24:19.5
70679a39-923f-4bd3-9f88-9132788a7069	Tuxumdon stimulyatsiya	\N	\N	ee4b30ac-db05-4394-bdbd-f0a9dce8d8d9	\N	\N	\N	3000000	2000000	5000000	0	\N	\N	0	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	SIMPLE	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.505	2026-04-05 14:24:19.505
26b77121-9608-497d-adf8-e49fd60a9265	Oocyte retrieval	\N	\N	ee4b30ac-db05-4394-bdbd-f0a9dce8d8d9	\N	\N	\N	5000000	4000000	8000000	0	\N	\N	1	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.508	2026-04-05 14:24:19.508
3003b65a-c7d7-41fb-82bf-a027ce06e69c	Sperma yo'llari biopsy	\N	\N	ee4b30ac-db05-4394-bdbd-f0a9dce8d8d9	\N	\N	\N	4000000	3000000	6000000	0	\N	\N	3	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.511	2026-04-05 14:24:19.511
8ead1c20-2988-4da1-bb5f-b2c3dddc7665	Surrogacy support	\N	\N	ee4b30ac-db05-4394-bdbd-f0a9dce8d8d9	\N	\N	\N	15000000	12000000	22000000	0	\N	\N	1	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.514	2026-04-05 14:24:19.514
97260771-bae6-4871-888c-c9a879333ff4	Appendektomiya	\N	\N	63873ed5-acf0-4a34-bbd0-5fed3af9d950	\N	\N	\N	4000000	3000000	6000000	0	\N	\N	14	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.518	2026-04-05 14:24:19.518
8fa435f2-acdd-43a0-828e-356ac7616204	Cholecystectomy (O't pufagi)	\N	\N	63873ed5-acf0-4a34-bbd0-5fed3af9d950	\N	\N	\N	6000000	5000000	9000000	0	\N	\N	14	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.521	2026-04-05 14:24:19.521
98282d36-deea-45dc-a4a9-d765bd49d759	Herniya tuzatish	\N	\N	63873ed5-acf0-4a34-bbd0-5fed3af9d950	\N	\N	\N	5000000	4000000	8000000	0	\N	\N	21	SPINAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.524	2026-04-05 14:24:19.524
96fdd69c-d93e-4bf3-85b9-2cfa56df405b	Oshqozon operatsiyasi	\N	\N	63873ed5-acf0-4a34-bbd0-5fed3af9d950	\N	\N	\N	18000000	15000000	25000000	0	\N	\N	42	GENERAL	\N	t	7	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.527	2026-04-05 14:24:19.527
4ae5723f-f6a7-48e0-b4a2-292a018a1ff7	Ichak operatsiyasi	\N	\N	63873ed5-acf0-4a34-bbd0-5fed3af9d950	\N	\N	\N	20000000	16000000	30000000	0	\N	\N	42	GENERAL	\N	t	7	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.53	2026-04-05 14:24:19.53
fa768f46-627a-45ed-92f9-8fe454c5a78f	Laparoskopik cholecystectomy	\N	\N	d989bac1-6cc8-4409-a779-7d4714515adc	\N	\N	\N	5000000	4000000	8000000	0	\N	\N	7	GENERAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.532	2026-04-05 14:24:19.532
cda4d8ac-a589-45f7-86a2-c84f11b0e39b	Laparoskopik appendektomiya	\N	\N	d989bac1-6cc8-4409-a779-7d4714515adc	\N	\N	\N	4000000	3000000	7000000	0	\N	\N	7	GENERAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.537	2026-04-05 14:24:19.537
2e4ee85e-77cb-49b0-8c2b-e8fe9223e0cd	Laparoskopik herniya	\N	\N	d989bac1-6cc8-4409-a779-7d4714515adc	\N	\N	\N	5000000	4000000	8000000	0	\N	\N	14	GENERAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.54	2026-04-05 14:24:19.54
e5ba759f-d5c6-4cf9-b79f-91970928cdc3	Laparoskopik fundoplastika	\N	\N	d989bac1-6cc8-4409-a779-7d4714515adc	\N	\N	\N	10000000	8000000	15000000	0	\N	\N	21	GENERAL	\N	t	3	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.542	2026-04-05 14:24:19.542
55c42bf2-5968-4743-9423-a073e05acae5	Mastektomiya	\N	\N	4c02f545-395e-4825-a211-60a1174e88e9	\N	\N	\N	20000000	16000000	28000000	0	\N	\N	42	GENERAL	\N	t	5	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.545	2026-04-05 14:24:19.545
c3d87450-af45-4317-b89c-4ed3f1efa5a4	Lumpectomy	\N	\N	4c02f545-395e-4825-a211-60a1174e88e9	\N	\N	\N	8000000	6000000	12000000	0	\N	\N	21	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.549	2026-04-05 14:24:19.549
c9dfa3f9-a4dc-4c3b-83fb-46935d822696	Biopsy	\N	\N	4c02f545-395e-4825-a211-60a1174e88e9	\N	\N	\N	2000000	1500000	3500000	0	\N	\N	3	LOCAL	\N	t	0	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	SIMPLE	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.551	2026-04-05 14:24:19.551
e01f9de1-5ecd-49b7-b57d-ab20f489edfd	Rekonstruktiv operatsiya	\N	\N	4c02f545-395e-4825-a211-60a1174e88e9	\N	\N	\N	35000000	28000000	50000000	0	\N	\N	90	GENERAL	\N	t	7	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.555	2026-04-05 14:24:19.555
673a8d0d-3640-4ba7-89cd-e4c97906f337	Thyroidectomy (to'liq)	\N	\N	afb04743-eb8e-4502-b0f8-6af25a525e96	\N	\N	\N	10000000	8000000	15000000	0	\N	\N	21	GENERAL	\N	t	3	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.558	2026-04-05 14:24:19.558
5c03debf-71be-4838-b1b0-2c8a43212848	Partial thyroidectomy	\N	\N	afb04743-eb8e-4502-b0f8-6af25a525e96	\N	\N	\N	7000000	6000000	10000000	0	\N	\N	14	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.561	2026-04-05 14:24:19.561
0332a184-c7c8-4433-820e-49bf58d00039	Parathyroidectomy	\N	\N	afb04743-eb8e-4502-b0f8-6af25a525e96	\N	\N	\N	9000000	7000000	13000000	0	\N	\N	14	GENERAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	COMPLEX	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.565	2026-04-05 14:24:19.565
36b4856f-a383-4a34-8dc3-105be0a5914d	Gemorroi operatsiyasi	\N	\N	1fe31233-9b43-4002-9ae7-1c1498261bb7	\N	\N	\N	3000000	2000000	5000000	0	\N	\N	14	SPINAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	SIMPLE	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.579	2026-04-05 14:24:19.579
3d1f58fe-4ee4-4ffe-9df7-70793c5fbecb	Fistula repair	\N	\N	1fe31233-9b43-4002-9ae7-1c1498261bb7	\N	\N	\N	5000000	4000000	8000000	0	\N	\N	21	SPINAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.589	2026-04-05 14:24:19.589
29936a0d-e0a2-46fa-9911-ddb3ae31cd8c	Anal fissure surgery	\N	\N	1fe31233-9b43-4002-9ae7-1c1498261bb7	\N	\N	\N	3000000	2500000	5000000	0	\N	\N	14	SPINAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	SIMPLE	LOW	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.604	2026-04-05 14:24:19.604
97df13d7-a480-482a-bb9e-b861bc9d3978	Kolorektal rezektsiya	\N	\N	1fe31233-9b43-4002-9ae7-1c1498261bb7	\N	\N	\N	25000000	20000000	35000000	0	\N	\N	90	GENERAL	\N	t	7	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.612	2026-04-05 14:24:19.612
4c10ef02-e6d2-471e-aede-fb310c6d9c4d	Varikoz operatsiyasi	\N	\N	e36bc5b3-7537-400b-915b-cb829ea303a2	\N	\N	\N	6000000	5000000	9000000	0	\N	\N	21	SPINAL	\N	t	1	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.621	2026-04-05 14:24:19.621
c58a9408-a911-45d0-ba05-2598ace32afb	AV fistula yaratish	\N	\N	e36bc5b3-7537-400b-915b-cb829ea303a2	\N	\N	\N	8000000	6000000	12000000	0	\N	\N	21	LOCAL	\N	t	2	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	MEDIUM	MEDIUM	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.632	2026-04-05 14:24:19.632
0b20237d-375f-4c5f-bdc9-9f92dcd2a9f3	Aneurysm repair	\N	\N	e36bc5b3-7537-400b-915b-cb829ea303a2	\N	\N	\N	40000000	32000000	55000000	0	\N	\N	180	GENERAL	\N	t	10	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.639	2026-04-05 14:24:19.639
31e0d737-a753-473a-884e-d62af6469d1f	Bypass surgery	\N	\N	e36bc5b3-7537-400b-915b-cb829ea303a2	\N	\N	\N	45000000	35000000	65000000	0	\N	\N	180	GENERAL	\N	t	10	\N	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	ADVANCED	HIGH	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	8c994aaf-0e70-4943-ba72-c06d180815d5	2026-04-05 14:24:19.642	2026-04-05 14:24:19.642
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public."User" (id, phone, email, "passwordHash", "firstName", "lastName", role, status, "isActive", "clinicId", "createdAt", "updatedAt") FROM stdin;
f2a77162-e038-419d-b9a6-cbb635416c82	+998991234567	\N	$2b$10$ROe3egvbkHExVKQS/nUi4.68gCKlA6uHg98WCZPINyiz4aIKqg2D2	Clinic	Admin	CLINIC_ADMIN	APPROVED	t	f6f6e74e-e430-436f-9c53-81b2bbef53c7	2026-03-25 19:58:55.486	2026-03-25 20:27:55.805
8c994aaf-0e70-4943-ba72-c06d180815d5	+998901234567	admin@medicare.uz	$2b$10$9w2QPvHTLoro6dq/08o5t.WIin5YjH4DZCx1LyBw5VYR9AVLqINga	Super	Admin	SUPER_ADMIN	APPROVED	t	\N	2026-03-25 18:26:33.226	2026-04-05 16:00:51.136
08f85c73-ff5e-46ee-9ba6-2bf341cac2e9	+998 98 765-43-21	\N	$2b$12$W5VxifBbVmxWLifUAD4jOOMkzMqpZLXY/.fm5YdrRXk00QBVrzB9a	Real med	Real med	CLINIC_ADMIN	APPROVED	t	8586afae-77d8-4523-9255-2d7475ecc589	2026-04-05 15:56:59.345	2026-04-05 16:31:20.56
a3ed4b1c-f5dc-4ab5-ab44-07f2c762cf43	+998987654327	\N	$2b$12$jZ/u2LONZ5YOfShzyimzEObKEq/HmVWc7vKd1kljftALNLjmilmG6	user	AFm	PATIENT	PENDING	t	\N	2026-04-06 04:40:08.682	2026-04-06 04:40:08.682
17c282e6-68a9-4de7-a461-730772c1c952	+998974032339	\N	$2b$12$2/bM5/XSj2Vllg9Kz.tHX.heScebkjBRCmMaXhOPNsq/CL3unExmi	sheroz	ashurov	PATIENT	PENDING	t	\N	2026-04-06 11:23:09.777	2026-04-06 11:23:09.777
1317c9fa-73d4-4adf-9601-1608bcca60c8	+998 93 380-23-13	\N	$2b$12$2OpX4TrWdAkoJ3S6doYtg.NL0VC66I9uyhm.9rHrqwH8eIdHi/gpG	Hadicha	Gulomova	CLINIC_ADMIN	APPROVED	t	62ed84f9-b5c4-49f8-a674-31eefcd06791	2026-04-06 12:09:27.048	2026-04-06 12:10:55.968
a602e644-c0fe-4ca2-8b3a-37653adb0fa9	+998977046462	gulruxermatova12345@gmail.com	$2b$12$.DMZYdpAibAvjQyi1f48l.AXwFxroQ3bd1hWXtNy2r3xMljHD5uo.	Gulruh	Ermatova	PATIENT	PENDING	t	\N	2026-04-07 16:59:19.897	2026-04-07 16:59:19.897
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: banisa
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
3ad9a98f-cf2f-4fd0-b3d4-5874f7d0aae6	fa61512a0db0ed166cdce580a8b576293445cf049933b8c4c7e7a1a8c10da965	2026-03-25 18:23:50.558252+00	20260308110501_init_complete_schema	\N	\N	2026-03-25 18:23:50.390777+00	1
98973aa5-8a82-4a20-b1f8-fbd63d74839a	5c1633c71fe76272f01431ab855aa1ed13148b278ac58030ca16da332448458a	2026-03-25 18:23:50.569967+00	20260308211001_clinic_unified_model	\N	\N	2026-03-25 18:23:50.559913+00	1
610c6da6-b3b6-4b0b-8adb-16e2e6c5f400	59d22e31f5ab3f5268622ed024c095efd5475c3c64816f6700d6367560d67936	2026-03-25 18:23:50.603883+00	20260309065340_add_service_customization	\N	\N	2026-03-25 18:23:50.571469+00	1
3b9b960c-a17f-4b1a-b9d9-454529d35566	c9c20ccbfb89a33a58381f22a640480ed8c030763baa3544d4e7e79b7e0f9ed0	2026-03-25 18:23:50.609802+00	20260313014814_add_price_discount_to_customization	\N	\N	2026-03-25 18:23:50.605263+00	1
9eb2eb04-dc83-42f6-b662-bfe7d9bedca1	59d63d4d5d0a52dc5de945b9290c96f79af6f5c735d15d408a7027ebb3a6a435	2026-03-25 19:04:48.602686+00	20260318074446_add_sanatorium_services	\N	\N	2026-03-25 19:04:48.519678+00	1
e6803791-4792-4eed-8d31-68f774459f61	109d0f6275b23891662b8a5c849b699ac408ba1145eff554ff9b75031f17561d	2026-03-25 19:04:48.609837+00	20260318103028_add_sanatorium_clinic_fields	\N	\N	2026-03-25 19:04:48.603811+00	1
7ecc40a2-e956-47a2-9b59-e5b86c56b0ca	9b9218ff256f622c6ded24f5e00e03f5ce71af74abac2a11b7b66a667839b720	2026-03-25 19:50:08.25673+00	20260324062133_add_diagnostic_detail_fields	\N	\N	2026-03-25 19:50:08.242399+00	1
b7e4a72b-6a9d-4bbb-80ee-c0845681c85f	7b7af302eea42849d0b41213a7380053e82c332d873aa4eb33b1668adb3cb858	2026-03-25 19:50:08.265888+00	20260324125827_add_clinic_specific_service_fields	\N	\N	2026-03-25 19:50:08.258125+00	1
\.


--
-- Name: Appointment Appointment_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_pkey" PRIMARY KEY (id);


--
-- Name: CheckupPackageItem CheckupPackageItem_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."CheckupPackageItem"
    ADD CONSTRAINT "CheckupPackageItem_pkey" PRIMARY KEY (id);


--
-- Name: CheckupPackage CheckupPackage_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."CheckupPackage"
    ADD CONSTRAINT "CheckupPackage_pkey" PRIMARY KEY (id);


--
-- Name: ClinicCheckupPackage ClinicCheckupPackage_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicCheckupPackage"
    ADD CONSTRAINT "ClinicCheckupPackage_pkey" PRIMARY KEY (id);


--
-- Name: ClinicDiagnosticService ClinicDiagnosticService_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicDiagnosticService"
    ADD CONSTRAINT "ClinicDiagnosticService_pkey" PRIMARY KEY (id);


--
-- Name: ClinicRegistrationPerson ClinicRegistrationPerson_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicRegistrationPerson"
    ADD CONSTRAINT "ClinicRegistrationPerson_pkey" PRIMARY KEY (id);


--
-- Name: ClinicRegistrationRequest ClinicRegistrationRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicRegistrationRequest"
    ADD CONSTRAINT "ClinicRegistrationRequest_pkey" PRIMARY KEY (id);


--
-- Name: ClinicSanatoriumService ClinicSanatoriumService_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicSanatoriumService"
    ADD CONSTRAINT "ClinicSanatoriumService_pkey" PRIMARY KEY ("clinicId", "sanatoriumServiceId");


--
-- Name: ClinicSurgicalService ClinicSurgicalService_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicSurgicalService"
    ADD CONSTRAINT "ClinicSurgicalService_pkey" PRIMARY KEY ("clinicId", "surgicalServiceId");


--
-- Name: Clinic Clinic_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."Clinic"
    ADD CONSTRAINT "Clinic_pkey" PRIMARY KEY (id);


--
-- Name: DiagnosticService DiagnosticService_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."DiagnosticService"
    ADD CONSTRAINT "DiagnosticService_pkey" PRIMARY KEY (id);


--
-- Name: Doctor Doctor_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."Doctor"
    ADD CONSTRAINT "Doctor_pkey" PRIMARY KEY (id);


--
-- Name: HomepageSettings HomepageSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."HomepageSettings"
    ADD CONSTRAINT "HomepageSettings_pkey" PRIMARY KEY (id);


--
-- Name: HomepageSettings HomepageSettings_section_key; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."HomepageSettings"
    ADD CONSTRAINT "HomepageSettings_section_key" UNIQUE (section);


--
-- Name: PaymeTransaction PaymeTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."PaymeTransaction"
    ADD CONSTRAINT "PaymeTransaction_pkey" PRIMARY KEY (id);


--
-- Name: Review Review_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_pkey" PRIMARY KEY (id);


--
-- Name: SanatoriumService SanatoriumService_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."SanatoriumService"
    ADD CONSTRAINT "SanatoriumService_pkey" PRIMARY KEY (id);


--
-- Name: ServiceCategory ServiceCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ServiceCategory"
    ADD CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY (id);


--
-- Name: ServiceCustomization ServiceCustomization_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ServiceCustomization"
    ADD CONSTRAINT "ServiceCustomization_pkey" PRIMARY KEY (id);


--
-- Name: ServiceImage ServiceImage_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ServiceImage"
    ADD CONSTRAINT "ServiceImage_pkey" PRIMARY KEY (id);


--
-- Name: ServiceReview ServiceReview_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ServiceReview"
    ADD CONSTRAINT "ServiceReview_pkey" PRIMARY KEY (id);


--
-- Name: SurgicalService SurgicalService_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."SurgicalService"
    ADD CONSTRAINT "SurgicalService_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Appointment_clinicId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Appointment_clinicId_idx" ON public."Appointment" USING btree ("clinicId");


--
-- Name: Appointment_doctorId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Appointment_doctorId_idx" ON public."Appointment" USING btree ("doctorId");


--
-- Name: Appointment_patientId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Appointment_patientId_idx" ON public."Appointment" USING btree ("patientId");


--
-- Name: Appointment_scheduledAt_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Appointment_scheduledAt_idx" ON public."Appointment" USING btree ("scheduledAt");


--
-- Name: Appointment_status_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Appointment_status_idx" ON public."Appointment" USING btree (status);


--
-- Name: CheckupPackageItem_diagnosticServiceId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "CheckupPackageItem_diagnosticServiceId_idx" ON public."CheckupPackageItem" USING btree ("diagnosticServiceId");


--
-- Name: CheckupPackageItem_packageId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "CheckupPackageItem_packageId_idx" ON public."CheckupPackageItem" USING btree ("packageId");


--
-- Name: CheckupPackage_category_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "CheckupPackage_category_idx" ON public."CheckupPackage" USING btree (category);


--
-- Name: CheckupPackage_isActive_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "CheckupPackage_isActive_idx" ON public."CheckupPackage" USING btree ("isActive");


--
-- Name: CheckupPackage_slug_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "CheckupPackage_slug_idx" ON public."CheckupPackage" USING btree (slug);


--
-- Name: CheckupPackage_slug_key; Type: INDEX; Schema: public; Owner: banisa
--

CREATE UNIQUE INDEX "CheckupPackage_slug_key" ON public."CheckupPackage" USING btree (slug);


--
-- Name: ClinicCheckupPackage_clinicId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicCheckupPackage_clinicId_idx" ON public."ClinicCheckupPackage" USING btree ("clinicId");


--
-- Name: ClinicCheckupPackage_clinicId_packageId_key; Type: INDEX; Schema: public; Owner: banisa
--

CREATE UNIQUE INDEX "ClinicCheckupPackage_clinicId_packageId_key" ON public."ClinicCheckupPackage" USING btree ("clinicId", "packageId");


--
-- Name: ClinicCheckupPackage_isActive_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicCheckupPackage_isActive_idx" ON public."ClinicCheckupPackage" USING btree ("isActive");


--
-- Name: ClinicCheckupPackage_packageId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicCheckupPackage_packageId_idx" ON public."ClinicCheckupPackage" USING btree ("packageId");


--
-- Name: ClinicDiagnosticService_clinicId_diagnosticServiceId_key; Type: INDEX; Schema: public; Owner: banisa
--

CREATE UNIQUE INDEX "ClinicDiagnosticService_clinicId_diagnosticServiceId_key" ON public."ClinicDiagnosticService" USING btree ("clinicId", "diagnosticServiceId");


--
-- Name: ClinicDiagnosticService_clinicId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicDiagnosticService_clinicId_idx" ON public."ClinicDiagnosticService" USING btree ("clinicId");


--
-- Name: ClinicDiagnosticService_diagnosticServiceId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicDiagnosticService_diagnosticServiceId_idx" ON public."ClinicDiagnosticService" USING btree ("diagnosticServiceId");


--
-- Name: ClinicDiagnosticService_isActive_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicDiagnosticService_isActive_idx" ON public."ClinicDiagnosticService" USING btree ("isActive");


--
-- Name: ClinicRegistrationPerson_phone_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicRegistrationPerson_phone_idx" ON public."ClinicRegistrationPerson" USING btree (phone);


--
-- Name: ClinicRegistrationPerson_requestId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicRegistrationPerson_requestId_idx" ON public."ClinicRegistrationPerson" USING btree ("requestId");


--
-- Name: ClinicRegistrationRequest_status_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicRegistrationRequest_status_idx" ON public."ClinicRegistrationRequest" USING btree (status);


--
-- Name: ClinicSanatoriumService_clinicId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicSanatoriumService_clinicId_idx" ON public."ClinicSanatoriumService" USING btree ("clinicId");


--
-- Name: ClinicSanatoriumService_isActive_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicSanatoriumService_isActive_idx" ON public."ClinicSanatoriumService" USING btree ("isActive");


--
-- Name: ClinicSanatoriumService_sanatoriumServiceId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicSanatoriumService_sanatoriumServiceId_idx" ON public."ClinicSanatoriumService" USING btree ("sanatoriumServiceId");


--
-- Name: ClinicSurgicalService_clinicId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicSurgicalService_clinicId_idx" ON public."ClinicSurgicalService" USING btree ("clinicId");


--
-- Name: ClinicSurgicalService_isActive_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicSurgicalService_isActive_idx" ON public."ClinicSurgicalService" USING btree ("isActive");


--
-- Name: ClinicSurgicalService_surgicalServiceId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ClinicSurgicalService_surgicalServiceId_idx" ON public."ClinicSurgicalService" USING btree ("surgicalServiceId");


--
-- Name: Clinic_createdAt_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Clinic_createdAt_idx" ON public."Clinic" USING btree ("createdAt");


--
-- Name: Clinic_region_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Clinic_region_idx" ON public."Clinic" USING btree (region);


--
-- Name: Clinic_source_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Clinic_source_idx" ON public."Clinic" USING btree (source);


--
-- Name: Clinic_status_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Clinic_status_idx" ON public."Clinic" USING btree (status);


--
-- Name: Clinic_type_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Clinic_type_idx" ON public."Clinic" USING btree (type);


--
-- Name: DiagnosticService_categoryId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "DiagnosticService_categoryId_idx" ON public."DiagnosticService" USING btree ("categoryId");


--
-- Name: DiagnosticService_isActive_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "DiagnosticService_isActive_idx" ON public."DiagnosticService" USING btree ("isActive");


--
-- Name: DiagnosticService_priceRecommended_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "DiagnosticService_priceRecommended_idx" ON public."DiagnosticService" USING btree ("priceRecommended");


--
-- Name: Doctor_clinicId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Doctor_clinicId_idx" ON public."Doctor" USING btree ("clinicId");


--
-- Name: Doctor_isActive_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Doctor_isActive_idx" ON public."Doctor" USING btree ("isActive");


--
-- Name: PaymeTransaction_orderId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "PaymeTransaction_orderId_idx" ON public."PaymeTransaction" USING btree ("orderId");


--
-- Name: PaymeTransaction_paymeId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "PaymeTransaction_paymeId_idx" ON public."PaymeTransaction" USING btree ("paymeId");


--
-- Name: PaymeTransaction_paymeId_key; Type: INDEX; Schema: public; Owner: banisa
--

CREATE UNIQUE INDEX "PaymeTransaction_paymeId_key" ON public."PaymeTransaction" USING btree ("paymeId");


--
-- Name: PaymeTransaction_state_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "PaymeTransaction_state_idx" ON public."PaymeTransaction" USING btree (state);


--
-- Name: Review_clinicId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Review_clinicId_idx" ON public."Review" USING btree ("clinicId");


--
-- Name: Review_clinicId_userId_key; Type: INDEX; Schema: public; Owner: banisa
--

CREATE UNIQUE INDEX "Review_clinicId_userId_key" ON public."Review" USING btree ("clinicId", "userId");


--
-- Name: Review_isActive_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Review_isActive_idx" ON public."Review" USING btree ("isActive");


--
-- Name: Review_rating_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Review_rating_idx" ON public."Review" USING btree (rating);


--
-- Name: Review_userId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "Review_userId_idx" ON public."Review" USING btree ("userId");


--
-- Name: SanatoriumService_categoryId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "SanatoriumService_categoryId_idx" ON public."SanatoriumService" USING btree ("categoryId");


--
-- Name: SanatoriumService_isActive_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "SanatoriumService_isActive_idx" ON public."SanatoriumService" USING btree ("isActive");


--
-- Name: SanatoriumService_serviceType_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "SanatoriumService_serviceType_idx" ON public."SanatoriumService" USING btree ("serviceType");


--
-- Name: ServiceCategory_slug_key; Type: INDEX; Schema: public; Owner: banisa
--

CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON public."ServiceCategory" USING btree (slug);


--
-- Name: ServiceCustomization_clinicServiceId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceCustomization_clinicServiceId_idx" ON public."ServiceCustomization" USING btree ("clinicServiceId");


--
-- Name: ServiceCustomization_clinicServiceId_key; Type: INDEX; Schema: public; Owner: banisa
--

CREATE UNIQUE INDEX "ServiceCustomization_clinicServiceId_key" ON public."ServiceCustomization" USING btree ("clinicServiceId");


--
-- Name: ServiceCustomization_customCategory_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceCustomization_customCategory_idx" ON public."ServiceCustomization" USING btree ("customCategory");


--
-- Name: ServiceCustomization_displayOrder_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceCustomization_displayOrder_idx" ON public."ServiceCustomization" USING btree ("displayOrder");


--
-- Name: ServiceCustomization_isHighlighted_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceCustomization_isHighlighted_idx" ON public."ServiceCustomization" USING btree ("isHighlighted");


--
-- Name: ServiceImage_customizationId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceImage_customizationId_idx" ON public."ServiceImage" USING btree ("customizationId");


--
-- Name: ServiceImage_isPrimary_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceImage_isPrimary_idx" ON public."ServiceImage" USING btree ("isPrimary");


--
-- Name: ServiceImage_order_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceImage_order_idx" ON public."ServiceImage" USING btree ("order");


--
-- Name: ServiceReview_createdAt_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceReview_createdAt_idx" ON public."ServiceReview" USING btree ("createdAt");


--
-- Name: ServiceReview_diagnosticServiceId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceReview_diagnosticServiceId_idx" ON public."ServiceReview" USING btree ("diagnosticServiceId");


--
-- Name: ServiceReview_rating_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceReview_rating_idx" ON public."ServiceReview" USING btree (rating);


--
-- Name: ServiceReview_sanatoriumServiceId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceReview_sanatoriumServiceId_idx" ON public."ServiceReview" USING btree ("sanatoriumServiceId");


--
-- Name: ServiceReview_status_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceReview_status_idx" ON public."ServiceReview" USING btree (status);


--
-- Name: ServiceReview_surgicalServiceId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceReview_surgicalServiceId_idx" ON public."ServiceReview" USING btree ("surgicalServiceId");


--
-- Name: ServiceReview_userId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "ServiceReview_userId_idx" ON public."ServiceReview" USING btree ("userId");


--
-- Name: SurgicalService_categoryId_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "SurgicalService_categoryId_idx" ON public."SurgicalService" USING btree ("categoryId");


--
-- Name: SurgicalService_complexity_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "SurgicalService_complexity_idx" ON public."SurgicalService" USING btree (complexity);


--
-- Name: SurgicalService_isActive_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "SurgicalService_isActive_idx" ON public."SurgicalService" USING btree ("isActive");


--
-- Name: SurgicalService_riskLevel_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "SurgicalService_riskLevel_idx" ON public."SurgicalService" USING btree ("riskLevel");


--
-- Name: User_clinicId_key; Type: INDEX; Schema: public; Owner: banisa
--

CREATE UNIQUE INDEX "User_clinicId_key" ON public."User" USING btree ("clinicId");


--
-- Name: User_phone_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "User_phone_idx" ON public."User" USING btree (phone);


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: banisa
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: User_status_idx; Type: INDEX; Schema: public; Owner: banisa
--

CREATE INDEX "User_status_idx" ON public."User" USING btree (status);


--
-- Name: Appointment Appointment_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Appointment Appointment_diagnosticServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_diagnosticServiceId_fkey" FOREIGN KEY ("diagnosticServiceId") REFERENCES public."DiagnosticService"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Appointment Appointment_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Appointment Appointment_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Appointment Appointment_surgicalServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_surgicalServiceId_fkey" FOREIGN KEY ("surgicalServiceId") REFERENCES public."SurgicalService"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CheckupPackageItem CheckupPackageItem_packageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."CheckupPackageItem"
    ADD CONSTRAINT "CheckupPackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES public."CheckupPackage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClinicCheckupPackage ClinicCheckupPackage_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicCheckupPackage"
    ADD CONSTRAINT "ClinicCheckupPackage_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClinicCheckupPackage ClinicCheckupPackage_packageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicCheckupPackage"
    ADD CONSTRAINT "ClinicCheckupPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES public."CheckupPackage"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClinicDiagnosticService ClinicDiagnosticService_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicDiagnosticService"
    ADD CONSTRAINT "ClinicDiagnosticService_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClinicDiagnosticService ClinicDiagnosticService_diagnosticServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicDiagnosticService"
    ADD CONSTRAINT "ClinicDiagnosticService_diagnosticServiceId_fkey" FOREIGN KEY ("diagnosticServiceId") REFERENCES public."DiagnosticService"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClinicRegistrationPerson ClinicRegistrationPerson_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicRegistrationPerson"
    ADD CONSTRAINT "ClinicRegistrationPerson_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."ClinicRegistrationRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClinicSanatoriumService ClinicSanatoriumService_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicSanatoriumService"
    ADD CONSTRAINT "ClinicSanatoriumService_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClinicSanatoriumService ClinicSanatoriumService_sanatoriumServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicSanatoriumService"
    ADD CONSTRAINT "ClinicSanatoriumService_sanatoriumServiceId_fkey" FOREIGN KEY ("sanatoriumServiceId") REFERENCES public."SanatoriumService"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClinicSurgicalService ClinicSurgicalService_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicSurgicalService"
    ADD CONSTRAINT "ClinicSurgicalService_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClinicSurgicalService ClinicSurgicalService_surgicalServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ClinicSurgicalService"
    ADD CONSTRAINT "ClinicSurgicalService_surgicalServiceId_fkey" FOREIGN KEY ("surgicalServiceId") REFERENCES public."SurgicalService"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DiagnosticService DiagnosticService_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."DiagnosticService"
    ADD CONSTRAINT "DiagnosticService_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ServiceCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DiagnosticService DiagnosticService_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."DiagnosticService"
    ADD CONSTRAINT "DiagnosticService_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Doctor Doctor_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."Doctor"
    ADD CONSTRAINT "Doctor_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Review Review_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Review Review_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SanatoriumService SanatoriumService_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."SanatoriumService"
    ADD CONSTRAINT "SanatoriumService_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ServiceCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SanatoriumService SanatoriumService_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."SanatoriumService"
    ADD CONSTRAINT "SanatoriumService_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ServiceCategory ServiceCategory_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ServiceCategory"
    ADD CONSTRAINT "ServiceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."ServiceCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceCustomization ServiceCustomization_clinicServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ServiceCustomization"
    ADD CONSTRAINT "ServiceCustomization_clinicServiceId_fkey" FOREIGN KEY ("clinicServiceId") REFERENCES public."ClinicDiagnosticService"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceImage ServiceImage_customizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ServiceImage"
    ADD CONSTRAINT "ServiceImage_customizationId_fkey" FOREIGN KEY ("customizationId") REFERENCES public."ServiceCustomization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceReview ServiceReview_diagnosticServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ServiceReview"
    ADD CONSTRAINT "ServiceReview_diagnosticServiceId_fkey" FOREIGN KEY ("diagnosticServiceId") REFERENCES public."DiagnosticService"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceReview ServiceReview_sanatoriumServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ServiceReview"
    ADD CONSTRAINT "ServiceReview_sanatoriumServiceId_fkey" FOREIGN KEY ("sanatoriumServiceId") REFERENCES public."SanatoriumService"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceReview ServiceReview_surgicalServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ServiceReview"
    ADD CONSTRAINT "ServiceReview_surgicalServiceId_fkey" FOREIGN KEY ("surgicalServiceId") REFERENCES public."SurgicalService"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceReview ServiceReview_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."ServiceReview"
    ADD CONSTRAINT "ServiceReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SurgicalService SurgicalService_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."SurgicalService"
    ADD CONSTRAINT "SurgicalService_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ServiceCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SurgicalService SurgicalService_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: banisa
--

ALTER TABLE ONLY public."SurgicalService"
    ADD CONSTRAINT "SurgicalService_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict SvfpSfiCOPrB6miShB9q30uPbyU5J4hPOVN6dEiaEmPQkhHgoSSIctH0HY7FPng

