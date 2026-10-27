--
-- PostgreSQL database dump
--

\restrict z3MXbTK8GycSAECAdlyGA3SnQdXcCMgby5MNfRKF7ROfB8e042HlSjKjGDcIWcL

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.user_department_history DROP CONSTRAINT IF EXISTS "user_department_history_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.strategic_plans DROP CONSTRAINT IF EXISTS "strategic_plans_createdBy_fkey";
ALTER TABLE IF EXISTS ONLY public.sponsored_projects DROP CONSTRAINT IF EXISTS "sponsored_projects_createdBy_fkey";
ALTER TABLE IF EXISTS ONLY public.schools DROP CONSTRAINT IF EXISTS "schools_campusId_fkey";
ALTER TABLE IF EXISTS ONLY public.publications DROP CONSTRAINT IF EXISTS "publications_createdBy_fkey";
ALTER TABLE IF EXISTS ONLY public.placements DROP CONSTRAINT IF EXISTS "placements_createdBy_fkey";
ALTER TABLE IF EXISTS ONLY public.patents DROP CONSTRAINT IF EXISTS "patents_createdBy_fkey";
ALTER TABLE IF EXISTS ONLY public.parameter_data_submissions DROP CONSTRAINT IF EXISTS "parameter_data_submissions_verifiedBy_fkey";
ALTER TABLE IF EXISTS ONLY public.parameter_data_submissions DROP CONSTRAINT IF EXISTS "parameter_data_submissions_submittedBy_fkey";
ALTER TABLE IF EXISTS ONLY public.parameter_data_submissions DROP CONSTRAINT IF EXISTS "parameter_data_submissions_parameterId_fkey";
ALTER TABLE IF EXISTS ONLY public.parameter_data_submissions DROP CONSTRAINT IF EXISTS "parameter_data_submissions_evidenceDocumentId_fkey";
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS "notifications_recipientId_fkey";
ALTER TABLE IF EXISTS ONLY public.edit_requests DROP CONSTRAINT IF EXISTS "edit_requests_requestedBy_fkey";
ALTER TABLE IF EXISTS ONLY public.edit_requests DROP CONSTRAINT IF EXISTS "edit_requests_achievementId_fkey";
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS "documents_uploadedBy_fkey";
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS "departments_schoolId_fkey";
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS "departments_hodId_fkey";
ALTER TABLE IF EXISTS ONLY public.courses DROP CONSTRAINT IF EXISTS "courses_programLevelId_fkey";
ALTER TABLE IF EXISTS ONLY public.courses DROP CONSTRAINT IF EXISTS "courses_departmentId_fkey";
ALTER TABLE IF EXISTS ONLY public.consultancy_projects DROP CONSTRAINT IF EXISTS "consultancy_projects_createdBy_fkey";
ALTER TABLE IF EXISTS ONLY public.achievements DROP CONSTRAINT IF EXISTS "achievements_createdBy_fkey";
ALTER TABLE IF EXISTS ONLY public.accreditation_parameters DROP CONSTRAINT IF EXISTS "accreditation_parameters_frameworkId_fkey";
ALTER TABLE IF EXISTS ONLY public.accreditation_frameworks DROP CONSTRAINT IF EXISTS "accreditation_frameworks_createdBy_fkey";
DROP INDEX IF EXISTS public.user_department_history_user_id;
DROP INDEX IF EXISTS public.user_department_history_start_academic_year_end_academic_year;
DROP INDEX IF EXISTS public.user_department_history_is_current;
DROP INDEX IF EXISTS public.user_department_history_department_code;
DROP INDEX IF EXISTS public.students_register_academic_year_unique;
DROP INDEX IF EXISTS public.sponsored_projects_status;
DROP INDEX IF EXISTS public.sponsored_projects_principal_investigator;
DROP INDEX IF EXISTS public.sponsored_projects_funding_agency;
DROP INDEX IF EXISTS public.sponsored_projects_department;
DROP INDEX IF EXISTS public.sponsored_projects_agency_type;
DROP INDEX IF EXISTS public.sponsored_projects_academic_year;
DROP INDEX IF EXISTS public.publications_journal_type;
DROP INDEX IF EXISTS public.publications_department;
DROP INDEX IF EXISTS public.publications_created_by;
DROP INDEX IF EXISTS public.publications_academic_year;
DROP INDEX IF EXISTS public.patents_status;
DROP INDEX IF EXISTS public.patents_patent_type;
DROP INDEX IF EXISTS public.patents_department;
DROP INDEX IF EXISTS public.patents_created_by;
DROP INDEX IF EXISTS public.patents_academic_year;
DROP INDEX IF EXISTS public.parameter_data_submissions_status;
DROP INDEX IF EXISTS public.parameter_data_submissions_parameter_id;
DROP INDEX IF EXISTS public.parameter_data_submissions_department;
DROP INDEX IF EXISTS public.parameter_data_submissions_academic_year;
DROP INDEX IF EXISTS public.faculties_employee_academic_year_unique;
DROP INDEX IF EXISTS public.courses_code_dept_level_unique;
DROP INDEX IF EXISTS public.accreditation_parameters_metric_id;
DROP INDEX IF EXISTS public.accreditation_parameters_framework_id;
DROP INDEX IF EXISTS public.accreditation_parameters_criterion_number;
DROP INDEX IF EXISTS public.accreditation_frameworks_status;
DROP INDEX IF EXISTS public.accreditation_frameworks_category;
DROP INDEX IF EXISTS public.accreditation_frameworks_academic_year;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "users_employeeId_key1";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "users_employeeId_key";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key1;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.user_department_history DROP CONSTRAINT IF EXISTS user_department_history_pkey;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_pkey;
ALTER TABLE IF EXISTS ONLY public.strategic_plans DROP CONSTRAINT IF EXISTS strategic_plans_pkey;
ALTER TABLE IF EXISTS ONLY public.sponsored_projects DROP CONSTRAINT IF EXISTS sponsored_projects_pkey;
ALTER TABLE IF EXISTS ONLY public.schools DROP CONSTRAINT IF EXISTS schools_pkey;
ALTER TABLE IF EXISTS ONLY public.schools DROP CONSTRAINT IF EXISTS schools_name_key1;
ALTER TABLE IF EXISTS ONLY public.schools DROP CONSTRAINT IF EXISTS schools_name_key;
ALTER TABLE IF EXISTS ONLY public.schools DROP CONSTRAINT IF EXISTS schools_code_key1;
ALTER TABLE IF EXISTS ONLY public.schools DROP CONSTRAINT IF EXISTS schools_code_key;
ALTER TABLE IF EXISTS ONLY public.research_metrics DROP CONSTRAINT IF EXISTS research_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.publications DROP CONSTRAINT IF EXISTS publications_pkey;
ALTER TABLE IF EXISTS ONLY public.program_levels DROP CONSTRAINT IF EXISTS program_levels_pkey;
ALTER TABLE IF EXISTS ONLY public.program_levels DROP CONSTRAINT IF EXISTS program_levels_name_key;
ALTER TABLE IF EXISTS ONLY public.program_levels DROP CONSTRAINT IF EXISTS program_levels_code_key;
ALTER TABLE IF EXISTS ONLY public.placements DROP CONSTRAINT IF EXISTS placements_pkey;
ALTER TABLE IF EXISTS ONLY public.patents DROP CONSTRAINT IF EXISTS patents_pkey;
ALTER TABLE IF EXISTS ONLY public.parameter_data_submissions DROP CONSTRAINT IF EXISTS parameter_data_submissions_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.least_priv_verification_table DROP CONSTRAINT IF EXISTS least_priv_verification_table_pkey;
ALTER TABLE IF EXISTS ONLY public.faculties DROP CONSTRAINT IF EXISTS faculties_pkey;
ALTER TABLE IF EXISTS ONLY public.edit_requests DROP CONSTRAINT IF EXISTS edit_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_pkey;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_pkey;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_name_key1;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_name_key;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_code_key1;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_code_key;
ALTER TABLE IF EXISTS ONLY public.departmental_activities DROP CONSTRAINT IF EXISTS departmental_activities_pkey;
ALTER TABLE IF EXISTS ONLY public.department_lineages DROP CONSTRAINT IF EXISTS department_lineages_pkey;
ALTER TABLE IF EXISTS ONLY public.courses DROP CONSTRAINT IF EXISTS courses_pkey;
ALTER TABLE IF EXISTS ONLY public.consultancy_projects DROP CONSTRAINT IF EXISTS consultancy_projects_pkey;
ALTER TABLE IF EXISTS ONLY public.campuses DROP CONSTRAINT IF EXISTS campuses_pkey;
ALTER TABLE IF EXISTS ONLY public.campuses DROP CONSTRAINT IF EXISTS campuses_name_key1;
ALTER TABLE IF EXISTS ONLY public.campuses DROP CONSTRAINT IF EXISTS campuses_name_key;
ALTER TABLE IF EXISTS ONLY public.campuses DROP CONSTRAINT IF EXISTS campuses_code_key1;
ALTER TABLE IF EXISTS ONLY public.campuses DROP CONSTRAINT IF EXISTS campuses_code_key;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.achievements DROP CONSTRAINT IF EXISTS achievements_pkey;
ALTER TABLE IF EXISTS ONLY public.accreditation_parameters DROP CONSTRAINT IF EXISTS accreditation_parameters_pkey;
ALTER TABLE IF EXISTS ONLY public.accreditation_frameworks DROP CONSTRAINT IF EXISTS accreditation_frameworks_pkey;
ALTER TABLE IF EXISTS ONLY public.accreditation_frameworks DROP CONSTRAINT IF EXISTS accreditation_frameworks_code_key;
ALTER TABLE IF EXISTS ONLY public.__disposable_test_marker__ DROP CONSTRAINT IF EXISTS __disposable_test_marker___pkey;
ALTER TABLE IF EXISTS public.least_priv_verification_table ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.__disposable_test_marker__ ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_department_history;
DROP TABLE IF EXISTS public.students;
DROP TABLE IF EXISTS public.strategic_plans;
DROP TABLE IF EXISTS public.sponsored_projects;
DROP TABLE IF EXISTS public.schools;
DROP TABLE IF EXISTS public.research_metrics;
DROP TABLE IF EXISTS public.publications;
DROP TABLE IF EXISTS public.program_levels;
DROP TABLE IF EXISTS public.placements;
DROP TABLE IF EXISTS public.patents;
DROP TABLE IF EXISTS public.parameter_data_submissions;
DROP TABLE IF EXISTS public.notifications;
DROP SEQUENCE IF EXISTS public.least_priv_verification_table_id_seq;
DROP TABLE IF EXISTS public.least_priv_verification_table;
DROP TABLE IF EXISTS public.faculties;
DROP TABLE IF EXISTS public.edit_requests;
DROP TABLE IF EXISTS public.documents;
DROP TABLE IF EXISTS public.departments;
DROP TABLE IF EXISTS public.departmental_activities;
DROP TABLE IF EXISTS public.department_lineages;
DROP TABLE IF EXISTS public.courses;
DROP TABLE IF EXISTS public.consultancy_projects;
DROP TABLE IF EXISTS public.campuses;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.achievements;
DROP TABLE IF EXISTS public.accreditation_parameters;
DROP TABLE IF EXISTS public.accreditation_frameworks;
DROP SEQUENCE IF EXISTS public.__disposable_test_marker___id_seq;
DROP TABLE IF EXISTS public.__disposable_test_marker__;
DROP TYPE IF EXISTS public.enum_users_role;
DROP TYPE IF EXISTS public.enum_strategic_plans_status;
DROP TYPE IF EXISTS public.enum_strategic_plans_category;
DROP TYPE IF EXISTS public.enum_schools_status;
DROP TYPE IF EXISTS public.enum_program_levels_status;
DROP TYPE IF EXISTS public."enum_placements_placementType";
DROP TYPE IF EXISTS public.enum_parameter_data_submissions_status;
DROP TYPE IF EXISTS public.enum_faculties_status;
DROP TYPE IF EXISTS public.enum_faculties_gender;
DROP TYPE IF EXISTS public.enum_edit_requests_status;
DROP TYPE IF EXISTS public.enum_documents_status;
DROP TYPE IF EXISTS public.enum_documents_category;
DROP TYPE IF EXISTS public.enum_departments_status;
DROP TYPE IF EXISTS public.enum_departmental_activities_status;
DROP TYPE IF EXISTS public.enum_department_lineages_status;
DROP TYPE IF EXISTS public.enum_courses_status;
DROP TYPE IF EXISTS public.enum_consultancy_projects_status;
DROP TYPE IF EXISTS public.enum_campuses_status;
DROP TYPE IF EXISTS public.enum_achievements_status;
DROP TYPE IF EXISTS public.enum_achievements_category;
DROP TYPE IF EXISTS public."enum_achievements_achieverType";
DROP TYPE IF EXISTS public.enum_accreditation_parameters_status;
DROP TYPE IF EXISTS public."enum_accreditation_parameters_metricType";
DROP TYPE IF EXISTS public.enum_accreditation_frameworks_status;
DROP TYPE IF EXISTS public.enum_accreditation_frameworks_category;
--
-- Name: enum_accreditation_frameworks_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_accreditation_frameworks_category AS ENUM (
    'NAAC',
    'NIRF',
    'NBA',
    'QS_RANKING',
    'THE_WORLD',
    'INTERNAL_IQAC'
);


--
-- Name: enum_accreditation_frameworks_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_accreditation_frameworks_status AS ENUM (
    'Active',
    'Draft',
    'Archived'
);


--
-- Name: enum_accreditation_parameters_metricType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_accreditation_parameters_metricType" AS ENUM (
    'Quantitative',
    'Qualitative'
);


--
-- Name: enum_accreditation_parameters_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_accreditation_parameters_status AS ENUM (
    'Active',
    'Inactive'
);


--
-- Name: enum_achievements_achieverType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_achievements_achieverType" AS ENUM (
    'student',
    'scholar',
    'faculty'
);


--
-- Name: enum_achievements_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_achievements_category AS ENUM (
    'rankings',
    'accreditations',
    'awards',
    'research',
    'placements',
    'infrastructure',
    'international',
    'other'
);


--
-- Name: enum_achievements_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_achievements_status AS ENUM (
    'draft',
    'submitted',
    'under_coordinator_review',
    'returned_for_correction',
    'rejected',
    'approved',
    'under_hod_review',
    'finalized',
    'edit_requested',
    'edit_request_approved',
    'record_reopened'
);


--
-- Name: enum_campuses_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_campuses_status AS ENUM (
    'Active',
    'Inactive'
);


--
-- Name: enum_consultancy_projects_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_consultancy_projects_status AS ENUM (
    'draft',
    'submitted',
    'under_coordinator_review',
    'returned_for_correction',
    'rejected',
    'approved',
    'under_hod_review',
    'finalized',
    'edit_requested',
    'edit_request_approved',
    'record_reopened'
);


--
-- Name: enum_courses_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_courses_status AS ENUM (
    'Active',
    'Inactive'
);


--
-- Name: enum_department_lineages_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_department_lineages_status AS ENUM (
    'Active',
    'Historical'
);


--
-- Name: enum_departmental_activities_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_departmental_activities_status AS ENUM (
    'Completed',
    'Pending',
    'In Progress'
);


--
-- Name: enum_departments_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_departments_status AS ENUM (
    'Active',
    'Inactive'
);


--
-- Name: enum_documents_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_documents_category AS ENUM (
    'course-files',
    'naac',
    'nba',
    'policies',
    'reports',
    'certificates',
    'other'
);


--
-- Name: enum_documents_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_documents_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: enum_edit_requests_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_edit_requests_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: enum_faculties_gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_faculties_gender AS ENUM (
    'Male',
    'Female',
    'Other'
);


--
-- Name: enum_faculties_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_faculties_status AS ENUM (
    'Active',
    'On Sabbatical',
    'Relieved'
);


--
-- Name: enum_parameter_data_submissions_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_parameter_data_submissions_status AS ENUM (
    'Draft',
    'Submitted',
    'UnderReview',
    'Approved',
    'Rejected'
);


--
-- Name: enum_placements_placementType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_placements_placementType" AS ENUM (
    'placement',
    'internship'
);


--
-- Name: enum_program_levels_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_program_levels_status AS ENUM (
    'Active',
    'Inactive'
);


--
-- Name: enum_schools_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_schools_status AS ENUM (
    'Active',
    'Inactive'
);


--
-- Name: enum_strategic_plans_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_strategic_plans_category AS ENUM (
    'academic-excellence',
    'research-innovation',
    'infrastructure',
    'student-development',
    'faculty-development',
    'industry-collaboration',
    'international-relations',
    'quality-assurance'
);


--
-- Name: enum_strategic_plans_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_strategic_plans_status AS ENUM (
    'planned',
    'in-progress',
    'completed',
    'delayed',
    'cancelled'
);


--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_users_role AS ENUM (
    'admin',
    'authority',
    'hod',
    'coordinator',
    'faculty'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __disposable_test_marker__; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.__disposable_test_marker__ (
    id integer NOT NULL,
    marker_id character varying(64) NOT NULL,
    environment character varying(32) NOT NULL,
    status character varying(64) NOT NULL,
    provisioned_at timestamp with time zone DEFAULT now()
);


--
-- Name: __disposable_test_marker___id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.__disposable_test_marker___id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __disposable_test_marker___id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.__disposable_test_marker___id_seq OWNED BY public.__disposable_test_marker__.id;


--
-- Name: accreditation_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accreditation_frameworks (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    category public.enum_accreditation_frameworks_category DEFAULT 'NAAC'::public.enum_accreditation_frameworks_category NOT NULL,
    "academicYear" character varying(20) DEFAULT '2024-2025'::character varying NOT NULL,
    "totalWeightage" integer DEFAULT 1000 NOT NULL,
    status public.enum_accreditation_frameworks_status DEFAULT 'Active'::public.enum_accreditation_frameworks_status,
    description text,
    "createdBy" uuid,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: COLUMN accreditation_frameworks.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accreditation_frameworks.code IS 'Unique identifier code e.g. NAAC_SSR_2024, NIRF_ENGG_2025, NBA_TIER1';


--
-- Name: accreditation_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accreditation_parameters (
    id uuid NOT NULL,
    "frameworkId" uuid NOT NULL,
    "criterionNumber" character varying(50) NOT NULL,
    "criterionTitle" character varying(255) NOT NULL,
    "metricId" character varying(50) NOT NULL,
    "metricTitle" text NOT NULL,
    "metricType" public."enum_accreditation_parameters_metricType" DEFAULT 'Quantitative'::public."enum_accreditation_parameters_metricType" NOT NULL,
    weightage numeric(6,2) DEFAULT 10 NOT NULL,
    "benchmarkValue" numeric(10,2),
    "unitOfMeasure" character varying(50) DEFAULT 'Count'::character varying,
    "isDepartmentSpecific" boolean DEFAULT true,
    "guidelinesUrl" character varying(1000),
    status public.enum_accreditation_parameters_status DEFAULT 'Active'::public.enum_accreditation_parameters_status,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: COLUMN accreditation_parameters."criterionNumber"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accreditation_parameters."criterionNumber" IS 'e.g. Criterion 1 / TLR / Pillar 2';


--
-- Name: COLUMN accreditation_parameters."metricId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accreditation_parameters."metricId" IS 'e.g. 1.1.1, 3.2.1, TLR-SS';


--
-- Name: COLUMN accreditation_parameters."benchmarkValue"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accreditation_parameters."benchmarkValue" IS 'Target benchmark value';


--
-- Name: COLUMN accreditation_parameters."unitOfMeasure"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accreditation_parameters."unitOfMeasure" IS 'Count, Percentage, LPA, Ratio, Scale';


--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category public.enum_achievements_category NOT NULL,
    subcategory character varying(255),
    "achieverType" public."enum_achievements_achieverType" DEFAULT 'faculty'::public."enum_achievements_achieverType",
    department character varying(255),
    date date NOT NULL,
    year character varying(255) NOT NULL,
    rank character varying(255),
    score numeric(10,2),
    organization character varying(255),
    location character varying(255),
    participants text,
    impact character varying(255),
    status public.enum_achievements_status DEFAULT 'draft'::public.enum_achievements_status,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    "recordId" uuid,
    "achievementTitle" character varying(255),
    "userName" character varying(255) NOT NULL,
    "userRole" character varying(255) NOT NULL,
    department character varying(255),
    action character varying(255) NOT NULL,
    "previousValue" json,
    "updatedValue" json,
    "ipAddress" character varying(255),
    remarks text,
    "createdAt" timestamp with time zone NOT NULL
);


--
-- Name: campuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campuses (
    id uuid NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status public.enum_campuses_status DEFAULT 'Active'::public.enum_campuses_status,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: consultancy_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultancy_projects (
    id uuid NOT NULL,
    "teacherConsultant" character varying(255) NOT NULL,
    "projectName" character varying(255) NOT NULL,
    "sponsoringAgency" text NOT NULL,
    year character varying(255) NOT NULL,
    "revenueInLakhs" numeric(15,2) DEFAULT 0 NOT NULL,
    department character varying(255),
    status public.enum_consultancy_projects_status DEFAULT 'draft'::public.enum_consultancy_projects_status,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    "departmentId" uuid NOT NULL,
    "programLevelId" uuid NOT NULL,
    duration character varying(255),
    status public.enum_courses_status DEFAULT 'Active'::public.enum_courses_status,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: COLUMN courses."programLevelId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courses."programLevelId" IS 'FK to program_levels table — UG, PG, PhD';


--
-- Name: COLUMN courses.duration; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courses.duration IS 'e.g. 4 Years, 2 Years';


--
-- Name: department_lineages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department_lineages (
    id uuid NOT NULL,
    "domainGroup" character varying(100) NOT NULL,
    "parentDepartment" character varying(100) NOT NULL,
    "childDepartment" character varying(100) NOT NULL,
    "splitAcademicYear" character varying(20) NOT NULL,
    "splitDate" date NOT NULL,
    status public.enum_department_lineages_status DEFAULT 'Active'::public.enum_department_lineages_status,
    description text,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: COLUMN department_lineages."domainGroup"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.department_lineages."domainGroup" IS 'e.g. Computing Domain, Mechanical & Automotive Sciences';


--
-- Name: COLUMN department_lineages."parentDepartment"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.department_lineages."parentDepartment" IS 'e.g. Computer Science and Engineering';


--
-- Name: COLUMN department_lineages."childDepartment"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.department_lineages."childDepartment" IS 'e.g. Artificial Intelligence and Data Science';


--
-- Name: COLUMN department_lineages."splitAcademicYear"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.department_lineages."splitAcademicYear" IS 'First academic year of the new entity, e.g. 2024-25';


--
-- Name: departmental_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departmental_activities (
    id uuid NOT NULL,
    "academicYear" character varying(255) DEFAULT '2024-2025'::character varying NOT NULL,
    campus character varying(255) DEFAULT 'Bangalore Kengeri Campus'::character varying NOT NULL,
    school character varying(255) DEFAULT 'School of Engineering and Technology'::character varying NOT NULL,
    department character varying(255) NOT NULL,
    "activityCategory" character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    "reportDetails" character varying(255) DEFAULT 'Reports 2025'::character varying,
    "reportYear" character varying(255),
    "eventDate" date,
    "resourcePersons" character varying(255),
    "participantsCount" integer DEFAULT 0,
    "documentUrl" character varying(255),
    status public.enum_departmental_activities_status DEFAULT 'Completed'::public.enum_departmental_activities_status,
    "pendingNotes" text,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: COLUMN departmental_activities."activityCategory"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departmental_activities."activityCategory" IS 'e.g. Faculty Development Activities, Seminar / Talks / Training Program, Club Association, MoUs, Industrial Visit, etc.';


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    "shortName" character varying(20),
    "schoolId" uuid,
    "hodId" uuid,
    "hodName" character varying(255),
    "hodEmail" character varying(255),
    "establishedYear" integer,
    phone character varying(255),
    description text,
    status public.enum_departments_status DEFAULT 'Active'::public.enum_departments_status,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: COLUMN departments."shortName"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments."shortName" IS 'Short display name, e.g. CSE, ECE, MECH';


--
-- Name: COLUMN departments."schoolId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments."schoolId" IS 'FK to schools table. Nullable for backward compat during migration.';


--
-- Name: COLUMN departments."hodId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments."hodId" IS 'FK to users table — the Head of Department';


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category public.enum_documents_category NOT NULL,
    subcategory character varying(255),
    department character varying(255),
    "academicYear" character varying(255),
    semester character varying(255),
    "courseCode" character varying(255),
    "courseName" character varying(255),
    "fileName" character varying(255) NOT NULL,
    "filePath" character varying(255) NOT NULL,
    "fileSize" integer NOT NULL,
    "fileType" character varying(255) NOT NULL,
    "uploadedBy" uuid NOT NULL,
    status public.enum_documents_status DEFAULT 'approved'::public.enum_documents_status,
    tags character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: edit_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edit_requests (
    id uuid NOT NULL,
    "achievementId" uuid NOT NULL,
    reason text NOT NULL,
    status public.enum_edit_requests_status DEFAULT 'pending'::public.enum_edit_requests_status NOT NULL,
    "coordinatorRemarks" text,
    "hodRemarks" text,
    "requestedBy" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: faculties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faculties (
    id uuid NOT NULL,
    "sNo" integer,
    "employeeId" character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    designation character varying(255) NOT NULL,
    department character varying(255) NOT NULL,
    "academicYear" character varying(255) DEFAULT '2024-2025'::character varying,
    gender public.enum_faculties_gender,
    "dateOfBirth" date,
    "panCardNo" character varying(255),
    "dateOfJoining" date,
    "prevTeachingExpYears" character varying(255) DEFAULT '0'::character varying,
    "prevTeachingExpMonths" character varying(255) DEFAULT '0'::character varying,
    "prevIndustryExpYears" character varying(255) DEFAULT '0'::character varying,
    "prevIndustryExpMonths" character varying(255) DEFAULT '0'::character varying,
    "qualificationLevel" character varying(255),
    "highestQualification" character varying(255),
    "cuExpYears" character varying(255) DEFAULT '0'::character varying,
    "cuExpMonths" character varying(255) DEFAULT '0'::character varying,
    email character varying(255),
    phone character varying(255),
    qualifications jsonb,
    specialization character varying(255),
    status public.enum_faculties_status DEFAULT 'Active'::public.enum_faculties_status,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: least_priv_verification_table; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.least_priv_verification_table (
    id integer NOT NULL,
    payload character varying(255)
);


--
-- Name: least_priv_verification_table_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.least_priv_verification_table_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: least_priv_verification_table_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.least_priv_verification_table_id_seq OWNED BY public.least_priv_verification_table.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    "recipientId" uuid NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    type character varying(255) DEFAULT 'info'::character varying NOT NULL,
    "createdAt" timestamp with time zone NOT NULL
);


--
-- Name: parameter_data_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parameter_data_submissions (
    id uuid NOT NULL,
    "parameterId" uuid NOT NULL,
    department character varying(100) NOT NULL,
    "academicYear" character varying(20) NOT NULL,
    "actualValue" numeric(12,2) DEFAULT 0,
    "qualitativeResponse" text,
    "calculatedScore" numeric(8,2) DEFAULT 0,
    status public.enum_parameter_data_submissions_status DEFAULT 'Draft'::public.enum_parameter_data_submissions_status,
    "reviewerComments" text,
    "evidenceDocumentId" uuid,
    "submittedBy" uuid NOT NULL,
    "verifiedBy" uuid,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: patents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patents (
    id uuid NOT NULL,
    title text NOT NULL,
    inventors text NOT NULL,
    "applicationNo" character varying(255),
    "patentNo" character varying(255),
    status character varying(100) DEFAULT 'published'::character varying,
    "patentType" character varying(100) DEFAULT 'National (Indian)'::character varying,
    department character varying(255),
    "academicYear" character varying(50) DEFAULT '2024-2025'::character varying,
    "filedDate" date,
    "publishedDate" date,
    "grantedDate" date,
    "licenseDate" date,
    partner character varying(255),
    revenue numeric(15,2) DEFAULT 0,
    "patentUrl" text,
    description text,
    "approvalStatus" character varying(50) DEFAULT 'approved'::character varying,
    "createdBy" uuid,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: COLUMN patents.inventors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patents.inventors IS 'Comma-separated inventor names or array string';


--
-- Name: COLUMN patents.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patents.status IS 'filed, published, granted, commercialized, under_examination';


--
-- Name: COLUMN patents."patentType"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patents."patentType" IS 'National (Indian), International (PCT), USPTO (USA), EPO (Europe), Other';


--
-- Name: COLUMN patents.partner; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patents.partner IS 'Commercializing agency or industry licensee';


--
-- Name: COLUMN patents.revenue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patents.revenue IS 'Revenue or royalty generated in INR';


--
-- Name: COLUMN patents."patentUrl"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patents."patentUrl" IS 'Official patent URL / gazette link / Google Patents link';


--
-- Name: COLUMN patents.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patents.description IS 'Abstract / Claims summary';


--
-- Name: placements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placements (
    id uuid NOT NULL,
    "studentName" character varying(255) NOT NULL,
    "studentId" character varying(255) NOT NULL,
    department character varying(255) NOT NULL,
    course character varying(255),
    batch character varying(255) NOT NULL,
    company character varying(255) NOT NULL,
    role character varying(255),
    package numeric(10,2) NOT NULL,
    "placementType" public."enum_placements_placementType" DEFAULT 'placement'::public."enum_placements_placementType",
    "placementDate" date,
    location character varying(255),
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: program_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_levels (
    id uuid NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status public.enum_program_levels_status DEFAULT 'Active'::public.enum_program_levels_status,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: publications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publications (
    id uuid NOT NULL,
    "authorName" text NOT NULL,
    title text NOT NULL,
    "journalName" character varying(255) NOT NULL,
    "journalType" character varying(255) DEFAULT 'Scopus'::character varying NOT NULL,
    department character varying(255),
    "academicYear" character varying(255) DEFAULT '2024-2025'::character varying NOT NULL,
    "publicationDate" date,
    doi character varying(255),
    issn character varying(255),
    volume character varying(255),
    issue character varying(255),
    "pageNumber" character varying(255),
    "impactFactor" numeric(6,3),
    "citationCount" integer DEFAULT 0,
    "paperUrl" text,
    abstract text,
    status character varying(50) DEFAULT 'approved'::character varying,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: COLUMN publications."journalType"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publications."journalType" IS 'Scopus, WoS (Web of Science), or others as needed';


--
-- Name: research_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_metrics (
    id uuid NOT NULL,
    "academicYear" character varying(255) NOT NULL,
    "periodType" character varying(50) DEFAULT 'academic_year'::character varying NOT NULL,
    "periodValue" character varying(255) NOT NULL,
    department character varying(255) NOT NULL,
    books integer DEFAULT 0,
    chapters integer DEFAULT 0,
    "scopusJournals" integer DEFAULT 0,
    "nationalJournals" integer DEFAULT 0,
    "internationalJournals" integer DEFAULT 0,
    citations integer DEFAULT 0,
    "patentsIndian" integer DEFAULT 0,
    "patentsInternational" integer DEFAULT 0,
    "conferencesNational" integer DEFAULT 0,
    "conferencesInternational" integer DEFAULT 0,
    "consultancyCount" integer DEFAULT 0,
    "consultancyAmount" numeric(15,2) DEFAULT 0,
    "seedMoneyCount" integer DEFAULT 0,
    "seedMoneyAmount" numeric(15,2) DEFAULT 0,
    "externalProjectsCount" integer DEFAULT 0,
    "externalProjectsAmount" numeric(15,2) DEFAULT 0,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: schools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schools (
    id uuid NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    "campusId" uuid NOT NULL,
    status public.enum_schools_status DEFAULT 'Active'::public.enum_schools_status,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: sponsored_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsored_projects (
    id uuid NOT NULL,
    title text NOT NULL,
    "principalInvestigator" character varying(255) NOT NULL,
    "coInvestigators" text,
    "fundingAgency" character varying(255) NOT NULL,
    scheme character varying(255),
    "agencyType" character varying(255) DEFAULT 'Government (National)'::character varying NOT NULL,
    "sanctionOrderNo" character varying(255),
    "sanctionDate" date,
    "startDate" date,
    "endDate" date,
    "sanctionedAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "amountReceived" numeric(15,2) DEFAULT 0,
    status character varying(255) DEFAULT 'Ongoing'::character varying NOT NULL,
    "progressPercentage" integer DEFAULT 0,
    department character varying(255),
    "academicYear" character varying(255) DEFAULT '2024-2025'::character varying NOT NULL,
    "projectUrl" character varying(1000),
    description text,
    "approvalStatus" character varying(255) DEFAULT 'approved'::character varying NOT NULL,
    "createdBy" uuid,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: COLUMN sponsored_projects.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects.title IS 'Title of the sponsored research project';


--
-- Name: COLUMN sponsored_projects."principalInvestigator"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects."principalInvestigator" IS 'Lead researcher / Principal Investigator (PI)';


--
-- Name: COLUMN sponsored_projects."coInvestigators"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects."coInvestigators" IS 'Co-Principal Investigators (Co-PI) and research team members';


--
-- Name: COLUMN sponsored_projects."fundingAgency"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects."fundingAgency" IS 'Funding Agency / Sponsor (e.g., DST, SERB, DBT, ICMR, AICTE, Industry)';


--
-- Name: COLUMN sponsored_projects.scheme; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects.scheme IS 'Specific funding scheme or program (e.g., CRG, FIST, RPS, Seed Money)';


--
-- Name: COLUMN sponsored_projects."agencyType"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects."agencyType" IS 'Government (National), Government (State), International Agency, Industry / Corporate, University Seed Money / Internal, NGO / Other';


--
-- Name: COLUMN sponsored_projects."sanctionOrderNo"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects."sanctionOrderNo" IS 'Official Sanction Order Number / Project ID';


--
-- Name: COLUMN sponsored_projects."sanctionDate"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects."sanctionDate" IS 'Date of grant award / sanction order';


--
-- Name: COLUMN sponsored_projects."startDate"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects."startDate" IS 'Project commencement date';


--
-- Name: COLUMN sponsored_projects."endDate"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects."endDate" IS 'Project expected / actual completion date';


--
-- Name: COLUMN sponsored_projects."sanctionedAmount"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects."sanctionedAmount" IS 'Total Sanctioned Grant Amount in INR';


--
-- Name: COLUMN sponsored_projects."amountReceived"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects."amountReceived" IS 'Funds received / released to date in INR';


--
-- Name: COLUMN sponsored_projects.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects.status IS 'Ongoing, Completed, Sanctioned, Proposal Submitted, Terminated';


--
-- Name: COLUMN sponsored_projects."progressPercentage"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects."progressPercentage" IS 'Milestone / progress completion percentage (0 - 100)';


--
-- Name: COLUMN sponsored_projects.department; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects.department IS 'Host department';


--
-- Name: COLUMN sponsored_projects."projectUrl"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects."projectUrl" IS 'Link to sanction letter, progress report, or research portal';


--
-- Name: COLUMN sponsored_projects.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects.description IS 'Project summary, objectives, and deliverables';


--
-- Name: COLUMN sponsored_projects."approvalStatus"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sponsored_projects."approvalStatus" IS 'approved, pending, rejected';


--
-- Name: strategic_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategic_plans (
    id uuid NOT NULL,
    department character varying(255) NOT NULL,
    "academicYear" character varying(255) NOT NULL,
    category public.enum_strategic_plans_category NOT NULL,
    objective character varying(255) NOT NULL,
    description text,
    "targetDate" date NOT NULL,
    status public.enum_strategic_plans_status DEFAULT 'planned'::public.enum_strategic_plans_status,
    progress integer DEFAULT 0,
    budget numeric(12,2),
    responsible character varying(255),
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid NOT NULL,
    "registerNumber" character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(255),
    course character varying(255),
    department character varying(255),
    "previousSchool" character varying(255),
    gender character varying(255) DEFAULT 'Male'::character varying,
    dob date,
    "bloodGroup" character varying(255),
    batch character varying(255),
    "admissionDate" date,
    status character varying(255) DEFAULT 'Active'::character varying,
    "guardianName" character varying(255),
    "guardianPhone" character varying(255),
    address text,
    "className" character varying(255),
    "applicationNo" character varying(255),
    "mobileNo" character varying(255),
    nationality character varying(255),
    caste character varying(255),
    "currentCity" character varying(255),
    "currentState" character varying(255),
    "permanentCity" character varying(255),
    "permanentState" character varying(255),
    "parentMobileNo" character varying(255),
    handicapped character varying(255),
    "handicappedDescription" text DEFAULT 'NIL'::text,
    campus character varying(255),
    school character varying(255),
    "programLevel" character varying(255),
    "academicYear" character varying(20) DEFAULT '2024-2025'::character varying,
    disability character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: user_department_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_department_history (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    department character varying(100) NOT NULL,
    "departmentCode" character varying(20) NOT NULL,
    designation character varying(100),
    "startAcademicYear" character varying(20) NOT NULL,
    "endAcademicYear" character varying(20),
    "effectiveFrom" date NOT NULL,
    "effectiveTo" date,
    "isCurrent" boolean DEFAULT true,
    "transferReason" character varying(255) DEFAULT 'Department Bifurcation / Split'::character varying,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: COLUMN user_department_history.department; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_department_history.department IS 'e.g. Computer Science and Engineering, AI and Data Science';


--
-- Name: COLUMN user_department_history."departmentCode"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_department_history."departmentCode" IS 'e.g. CSE, ADSE';


--
-- Name: COLUMN user_department_history."startAcademicYear"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_department_history."startAcademicYear" IS 'e.g. 2020-2021';


--
-- Name: COLUMN user_department_history."endAcademicYear"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_department_history."endAcademicYear" IS 'NULL indicates currently active affiliation';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role public.enum_users_role DEFAULT 'faculty'::public.enum_users_role NOT NULL,
    department character varying(255),
    "employeeId" character varying(255),
    phone character varying(255),
    "isActive" boolean DEFAULT true,
    "lastLogin" timestamp with time zone,
    "mustChangePassword" boolean DEFAULT false,
    "passwordChangedAt" timestamp with time zone,
    "tokenVersion" integer DEFAULT 0,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: __disposable_test_marker__ id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.__disposable_test_marker__ ALTER COLUMN id SET DEFAULT nextval('public.__disposable_test_marker___id_seq'::regclass);


--
-- Name: least_priv_verification_table id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.least_priv_verification_table ALTER COLUMN id SET DEFAULT nextval('public.least_priv_verification_table_id_seq'::regclass);


--
-- Data for Name: __disposable_test_marker__; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.__disposable_test_marker__ (id, marker_id, environment, status, provisioned_at) FROM stdin;
1	CHRIST_IQAC_DISPOSABLE_TEST_MARKER_V1	test	APPROVED_FOR_DESTRUCTIVE_SECURITY_TESTING	2026-10-19 23:58:02.534066+05:30
\.


--
-- Data for Name: accreditation_frameworks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accreditation_frameworks (id, code, name, category, "academicYear", "totalWeightage", status, description, "createdBy", "createdAt", "updatedAt") FROM stdin;
9133b5a7-aeec-47f1-a32c-34dcf47f9fe7	NAAC_SSR_UNIV_2025	NAAC Institutional SSR (University)	NAAC	2024-2025	1000	Active	Standard NAAC 7-Criteria Assessment Manual for Deemed Universities.	\N	2026-10-20 17:31:37.682+05:30	2026-10-20 17:31:37.682+05:30
3b34d274-aac1-4b97-bec5-bc51a383f25f	NIRF_ENGG_2025	NIRF National Ranking (Engineering)	NIRF	2024-2025	100	Active	NIRF 5 Pillar Evaluation (TLR, RPC, GO, OI, PR).	\N	2026-10-20 17:31:37.685+05:30	2026-10-20 17:31:37.685+05:30
\.


--
-- Data for Name: accreditation_parameters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accreditation_parameters (id, "frameworkId", "criterionNumber", "criterionTitle", "metricId", "metricTitle", "metricType", weightage, "benchmarkValue", "unitOfMeasure", "isDepartmentSpecific", "guidelinesUrl", status, "createdAt", "updatedAt") FROM stdin;
ea2e0c1c-016b-4d60-b512-53525f5e21fc	9133b5a7-aeec-47f1-a32c-34dcf47f9fe7	Criterion 1	Curricular Aspects	1.1.1	Curricula developed and implemented have relevance to local, national, regional and global developmental needs.	Qualitative	20.00	20.00	Score	t	\N	Active	2026-10-20 17:31:37.686+05:30	2026-10-20 17:31:37.686+05:30
6dee33c1-ccd5-47d9-953a-38362d1dddcd	9133b5a7-aeec-47f1-a32c-34dcf47f9fe7	Criterion 2	Teaching-Learning and Evaluation	2.1.2	Percentage of seats filled against reserved categories during the last five years.	Quantitative	25.00	100.00	Percentage	t	\N	Active	2026-10-20 17:31:37.686+05:30	2026-10-20 17:31:37.686+05:30
a7f20a11-c090-4745-bfe2-851d554bedf0	9133b5a7-aeec-47f1-a32c-34dcf47f9fe7	Criterion 3	Research, Innovations and Extension	3.2.1	Extramural funding for Research (Grants sponsored by the non-government sources).	Quantitative	35.00	50.00	Lakhs (INR)	t	\N	Active	2026-10-20 17:31:37.686+05:30	2026-10-20 17:31:37.686+05:30
69ae8244-1020-48f9-b6d0-0e48d9cf8ef5	9133b5a7-aeec-47f1-a32c-34dcf47f9fe7	Criterion 5	Student Support and Progression	5.2.1	Percentage of placement of outgoing students and students progressing to higher education.	Quantitative	40.00	90.00	Percentage	t	\N	Active	2026-10-20 17:31:37.686+05:30	2026-10-20 17:31:37.686+05:30
05ad452b-75f8-415d-912d-340e677f888a	3b34d274-aac1-4b97-bec5-bc51a383f25f	Pillar 1	Teaching, Learning & Resources (TLR)	TLR-SS	Student Strength including Doctoral Students (Approved Intake vs Enrolled).	Quantitative	20.00	1.00	Ratio	t	\N	Active	2026-10-20 17:31:37.686+05:30	2026-10-20 17:31:37.686+05:30
66eb5fd2-be0a-4cb6-a550-06f77a543ce5	3b34d274-aac1-4b97-bec5-bc51a383f25f	Pillar 2	Research and Professional Practice (RPC)	RPC-PU	Combined metric for Publications in Scopus & Web of Science indexed journals.	Quantitative	35.00	200.00	Count	t	\N	Active	2026-10-20 17:31:37.686+05:30	2026-10-20 17:31:37.686+05:30
\.


--
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.achievements (id, title, description, category, subcategory, "achieverType", department, date, year, rank, score, organization, location, participants, impact, status, "createdBy", "createdAt", "updatedAt") FROM stdin;
88d0d3f8-93c3-45a2-aa1b-9e09d76e8af3	Best Research Paper 2026	\N	research	\N	faculty	Computer Science and Engineering	2026-02-15	2025-2026	\N	\N	\N	\N	\N	\N	edit_requested	220126e4-3199-483e-bbcb-04f499af0f7c	2026-10-21 11:40:28.479+05:30	2026-10-21 11:40:28.513+05:30
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, "recordId", "achievementTitle", "userName", "userRole", department, action, "previousValue", "updatedValue", "ipAddress", remarks, "createdAt") FROM stdin;
8151ff99-04f8-4022-9737-50454b163af0	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 20:59:01.704+05:30
a01c3dc4-26b0-45ee-bc18-94f52a01a9d7	\N	Cleared student records: All University Departments	E2E Administrator	admin	All	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: All University Departments	2026-10-19 20:59:01.722+05:30
cf9ad43e-e755-4474-afb0-62ce0628abad	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 20:59:01.785+05:30
f7ab64e9-1511-446c-911b-d3f5c1d299b5	\N	Failed Reset Re-Authentication	E2E Administrator	admin	All	FAILED_ADMIN_REAUTH_DURING_RESET	\N	\N	127.0.0.1	Invalid administrator password supplied during database wipe request.	2026-10-19 20:59:01.858+05:30
cd6119f6-9069-4ebd-9829-33def208ef8f	\N	Failed Reset Re-Authentication	E2E Administrator	admin	All	FAILED_ADMIN_REAUTH_DURING_RESET	\N	\N	127.0.0.1	Invalid administrator password supplied during database wipe request.	2026-10-19 20:59:01.923+05:30
2d78d51b-2994-4d55-ae42-b0a661da4a7a	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 21:00:43.166+05:30
e7bc1c9a-f50a-4282-93c4-90a8f8ac13f4	\N	Cleared student records: All University Departments	E2E Administrator	admin	All	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: All University Departments	2026-10-19 21:00:43.183+05:30
62ed2041-6193-4dbc-971c-29e68c8689b1	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 21:00:43.25+05:30
390663f3-4887-4736-92ad-cf253e47b04d	\N	Failed Reset Re-Authentication	E2E Administrator	admin	All	FAILED_ADMIN_REAUTH_DURING_RESET	\N	\N	127.0.0.1	Invalid administrator password supplied during database wipe request.	2026-10-19 21:00:43.328+05:30
d132e3ec-2847-48ab-a5f8-16039bfade6e	\N	Disposable Database Reset	E2E Administrator	admin	All	DISPOSABLE_DATABASE_RESET_COMPLETED	\N	\N	127.0.0.1	Transactional tables cleared on verified disposable development database.	2026-10-19 21:00:43.396+05:30
c1f00504-6d66-4b6a-9c1b-bfc96ac1f190	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 21:01:31.945+05:30
7b2f97bb-4bc7-4191-bf31-0b0eab5e068d	\N	Cleared student records: All University Departments	E2E Administrator	admin	All	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: All University Departments	2026-10-19 21:01:31.964+05:30
5ff40c8b-5001-4803-9c6c-9f5ce1147610	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 21:01:32.035+05:30
cab468c9-0404-4cef-9bde-2d1424be11c5	\N	Failed Reset Re-Authentication	E2E Administrator	admin	All	FAILED_ADMIN_REAUTH_DURING_RESET	\N	\N	127.0.0.1	Invalid administrator password supplied during database wipe request.	2026-10-19 21:01:32.109+05:30
e8cfaed1-7757-41bd-8b15-7e4618fa09ca	\N	Disposable Database Reset	E2E Administrator	admin	All	DISPOSABLE_DATABASE_RESET_COMPLETED	\N	\N	127.0.0.1	Transactional tables cleared on verified disposable development database.	2026-10-19 21:01:32.179+05:30
103d41b3-adca-4082-b972-464256b7f37b	\N	Cleared student records: Department: Computer Science and Engineering	HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 21:06:40.357+05:30
48495a2c-aee2-4363-9a29-b840a2b80743	\N	Cleared student records: Department: Computer Science and Engineering	HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 21:16:49.21+05:30
7c587837-14ed-4d6c-90da-90bad12c254f	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 21:17:21.887+05:30
d0d332f5-d147-4cfb-b5cd-9ea778d5363b	\N	Cleared student records: All University Departments	E2E Administrator	admin	All	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: All University Departments	2026-10-19 21:17:21.905+05:30
95dd2e11-5f05-4402-8032-a000b07bf602	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 21:17:21.993+05:30
f361c76e-ef0c-42f8-bfc5-260138ec9cad	\N	Failed Reset Re-Authentication	E2E Administrator	admin	All	FAILED_ADMIN_REAUTH_DURING_RESET	\N	\N	127.0.0.1	Invalid administrator password supplied during database wipe request.	2026-10-19 21:17:22.08+05:30
8be36a4f-38cd-4b66-baff-9f5e13e3e18d	\N	Disposable Database Reset	E2E Administrator	admin	All	DISPOSABLE_DATABASE_RESET_COMPLETED	\N	\N	127.0.0.1	Transactional tables cleared on verified disposable development database.	2026-10-19 21:17:22.155+05:30
bdd9e733-f3bc-4c27-b1e9-2ddbe86d4035	\N	Cleared student records: Department: Computer Science and Engineering	HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 21:34:42.454+05:30
b388023c-60d7-4359-8514-ac09853a7d47	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 21:34:59.923+05:30
9230dbea-a0c4-49f6-9eb8-af8f391a7bac	\N	Cleared student records: All University Departments	E2E Administrator	admin	All	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: All University Departments	2026-10-19 21:34:59.939+05:30
39b32535-98f2-443b-a11a-8f7807395ba2	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 21:35:00.013+05:30
12e77a91-cc08-47d3-8352-5c086b586c5d	\N	Failed Reset Re-Authentication	E2E Administrator	admin	All	FAILED_ADMIN_REAUTH_DURING_RESET	\N	\N	127.0.0.1	Invalid administrator password supplied during database wipe request.	2026-10-19 21:35:00.091+05:30
b5836d5d-87d2-4a23-a88a-f1215e0a8401	\N	Disposable Database Reset	E2E Administrator	admin	All	DISPOSABLE_DATABASE_RESET_COMPLETED	\N	\N	127.0.0.1	Transactional tables cleared on verified disposable development database.	2026-10-19 21:35:00.161+05:30
cd64d0aa-72fa-4e8c-80f3-4e25b458f10e	\N	Login Rate Limit Exceeded	Authentication Rate Limiter	system	Cybersecurity	LOGIN_RATE_LIMIT_EXCEEDED	\N	\N	127.0.0.1	Too many failed login attempts for account 'ratelimit_user@christuniversity.in' from IP 127.0.0.1. Request throttled.	2026-10-19 21:53:35.9+05:30
e5989705-4282-4f03-aa27-eb409a7ef32c	\N	Login Rate Limit Exceeded	Authentication Rate Limiter	system	Cybersecurity	LOGIN_RATE_LIMIT_EXCEEDED	\N	\N	127.0.0.1	Too many failed login attempts for account 'ratelimit_user@christuniversity.in' from IP 127.0.0.1. Request throttled.	2026-10-19 21:53:35.91+05:30
dd2ad813-4a36-4a0a-be81-a2bb5575a6ca	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-19 22:17:51.021+05:30
99afbf94-5535-41f5-a186-2deee69d7212	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-19 22:17:51.035+05:30
d3021c37-5853-42b4-9e82-dee211a59924	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-19 22:17:51.045+05:30
c60e19ea-db2a-444d-aa7d-3c22e9082ab7	\N	Bulk uploaded faculty records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-19 22:17:51.068+05:30
ea14a56e-0c73-4c94-a711-d92feabba016	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-19 22:17:51.089+05:30
bb224301-3a2c-445d-99b3-1387b225ac9e	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-19 22:17:51.094+05:30
df88075a-7d35-4855-98a9-c104530239bd	\N	Created document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	CREATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-19 22:45:24.824+05:30
91471753-c387-46e6-9618-f631dc68f2b8	\N	Updated document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-19 22:45:24.835+05:30
d52f5107-28f3-45f2-bc19-4ef45a9319ed	\N	Updated document: Security Test Document B6	B4 Admin User	admin	All	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-19 22:45:24.842+05:30
23ff91d8-5ca8-4081-8748-254e6179a21b	\N	Created document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	CREATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-19 22:47:33.27+05:30
57a33570-7033-4e9f-90e4-74d87a0bd988	\N	Updated document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-19 22:47:33.287+05:30
0e6af8d8-55b6-4824-b021-09380545f918	\N	Updated document: Security Test Document B6	B4 Admin User	admin	All	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-19 22:47:33.295+05:30
ffd29633-14b5-4170-8550-c0fa5d97e555	\N	Bulk uploaded student records	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-19 23:15:05.42+05:30
5221ed14-0279-40fb-bfff-1439a22a584d	\N	Cleared student records: Department: Computer Science and Engineering	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: Department: Computer Science and Engineering	2026-10-19 23:15:05.431+05:30
fbfab09f-a217-44b7-aa60-167e83eb0035	\N	Cleared student records: Department: Computer Science and Engineering	HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 23:36:30.446+05:30
91f79731-7547-4a08-9e5a-0a277f4cbba4	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 23:36:45.515+05:30
f52d968c-a7e7-4ffd-a716-4bb5dad0c42f	\N	Cleared student records: All University Departments	E2E Administrator	admin	All	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: All University Departments	2026-10-19 23:36:45.533+05:30
e208588e-034a-4826-be82-8dc576aefd65	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 23:36:45.608+05:30
cde02c9a-6948-46bf-b3f5-50420c7eb9bf	\N	Failed Reset Re-Authentication	E2E Administrator	admin	All	FAILED_ADMIN_REAUTH_DURING_RESET	\N	\N	127.0.0.1	Invalid administrator password supplied during database wipe request.	2026-10-19 23:36:45.689+05:30
e4d923fc-89f2-42a9-a8af-950248bd47f0	\N	Disposable Database Reset	E2E Administrator	admin	All	DISPOSABLE_DATABASE_RESET_COMPLETED	\N	\N	127.0.0.1	Transactional tables cleared on verified disposable development database.	2026-10-19 23:36:45.76+05:30
3c6391b1-de12-43e1-be20-15fff931e3b5	\N	Bulk uploaded student records	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-19 23:58:12.65+05:30
f7233679-653b-49ae-9776-96572e0a8939	\N	Cleared student records: Department: Computer Science and Engineering	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: Department: Computer Science and Engineering	2026-10-19 23:58:12.662+05:30
52a466e3-193d-4b7b-b26c-3c34bfb8f482	\N	Login Rate Limit Exceeded	Authentication Rate Limiter	system	Cybersecurity	LOGIN_RATE_LIMIT_EXCEEDED	\N	\N	127.0.0.1	Too many failed login attempts for account 'ratelimit_user@christuniversity.in' from IP 127.0.0.1. Request throttled.	2026-10-19 23:58:42.236+05:30
ae3998ba-10ad-4650-9c3f-08749fdc906b	\N	Login Rate Limit Exceeded	Authentication Rate Limiter	system	Cybersecurity	LOGIN_RATE_LIMIT_EXCEEDED	\N	\N	127.0.0.1	Too many failed login attempts for account 'ratelimit_user@christuniversity.in' from IP 127.0.0.1. Request throttled.	2026-10-19 23:58:42.246+05:30
a89e9a54-bc53-4046-949d-cb5d96394c51	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-19 23:58:43.18+05:30
69bda78f-c8d2-45ce-be5f-189be42e51e4	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-19 23:58:43.195+05:30
fd20def7-0470-489d-a431-bd7a0d667847	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-19 23:58:43.203+05:30
adea3afd-23db-4288-bbbf-800cf33c73a7	\N	Bulk uploaded faculty records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-19 23:58:43.225+05:30
655aa349-4556-429d-8180-bfd00b2f60a0	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-19 23:58:43.247+05:30
344639e7-accb-4667-86ee-6a3857902807	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-19 23:58:43.252+05:30
bd821007-a76b-4427-9aa4-d45f96564432	\N	Created document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	CREATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-19 23:58:54.945+05:30
9cf4cb2c-de3b-48a2-b1c4-4fdac0a321e4	\N	Updated document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-19 23:58:54.955+05:30
571299af-52cd-4f51-a559-54dc391b20a1	\N	Updated document: Security Test Document B6	B4 Admin User	admin	All	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-19 23:58:54.961+05:30
ced70b6b-e119-4ac2-8696-a84db42e84d1	\N	Bulk uploaded student records	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-19 23:59:06.805+05:30
b006a896-cc0c-43ab-a75f-e4583ca8a0cc	\N	Cleared student records: Department: Computer Science and Engineering	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: Department: Computer Science and Engineering	2026-10-19 23:59:06.817+05:30
f4a18cea-aef1-4c67-973b-253f33d9b2fe	\N	Cleared student records: Department: Computer Science and Engineering	HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 23:59:18.564+05:30
a360e3c3-f383-4641-a41a-e22aa60e4024	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 23:59:20.349+05:30
794af506-9438-4f2e-a9fc-8c9309e0b2a3	\N	Cleared student records: All University Departments	E2E Administrator	admin	All	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: All University Departments	2026-10-19 23:59:20.364+05:30
3be0ce45-4bd8-4d64-b2f1-188b1dda6759	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-19 23:59:20.429+05:30
887bb81f-66f9-4c01-86d0-9a0cb8524880	\N	Failed Reset Re-Authentication	E2E Administrator	admin	All	FAILED_ADMIN_REAUTH_DURING_RESET	\N	\N	127.0.0.1	Invalid administrator password supplied during database wipe request.	2026-10-19 23:59:20.503+05:30
4628118a-6207-4384-927a-b3162f120bf7	\N	Disposable Database Reset	E2E Administrator	admin	All	DISPOSABLE_DATABASE_RESET_COMPLETED	\N	\N	127.0.0.1	Transactional tables cleared on verified disposable development database.	2026-10-19 23:59:20.573+05:30
229fa739-aa10-4ec5-837c-0011ae364845	\N	Login Rate Limit Exceeded	Authentication Rate Limiter	system	Cybersecurity	LOGIN_RATE_LIMIT_EXCEEDED	\N	\N	127.0.0.1	Too many failed login attempts for account 'ratelimit_user@christuniversity.in' from IP 127.0.0.1. Request throttled.	2026-10-20 14:15:53.742+05:30
f039836f-72b9-42dd-a51a-ea153d2acec2	\N	Login Rate Limit Exceeded	Authentication Rate Limiter	system	Cybersecurity	LOGIN_RATE_LIMIT_EXCEEDED	\N	\N	127.0.0.1	Too many failed login attempts for account 'ratelimit_user@christuniversity.in' from IP 127.0.0.1. Request throttled.	2026-10-20 14:15:53.761+05:30
12f52772-60fb-48f4-9b16-b99c0895cf71	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:15:54.943+05:30
fa484011-9e1a-473c-8e26-edf8fa63764f	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:15:54.956+05:30
07806208-0e67-4078-866e-61bb0fe95833	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:15:54.964+05:30
929fb277-f1ca-4da1-8bff-6be4537c8d53	\N	Bulk uploaded faculty records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-20 14:15:54.983+05:30
27f73c7e-a601-40e9-82f9-38e52c7de83a	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:15:55.004+05:30
7da02451-c2f0-45a8-a7c7-625d4a91130f	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:15:55.009+05:30
cae0dee1-2044-428f-9269-2bb8d2b05d2d	\N	Created document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	CREATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-20 14:16:06.595+05:30
50117a27-f35c-455a-b886-288879a68aa9	\N	Updated document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-20 14:16:06.605+05:30
71c41871-1f9d-4c70-8340-0de6bdde8632	\N	Updated document: Security Test Document B6	B4 Admin User	admin	All	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-20 14:16:06.612+05:30
38175507-81e5-48ba-b86c-aab4b9184a3f	\N	Bulk uploaded student records	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:16:18.664+05:30
861efde3-e2df-4cac-84e5-a19bbc497d35	\N	Cleared student records: Department: Computer Science and Engineering	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: Department: Computer Science and Engineering	2026-10-20 14:16:18.675+05:30
77099b34-62a6-4a9d-97d9-4341632e1d31	\N	Cleared student records: Department: Computer Science and Engineering	HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-20 14:16:30.346+05:30
124005e5-d2a8-4899-9617-474a9bf602db	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-20 14:16:32.006+05:30
d24cc1bd-765e-4d4e-a7c1-7b82adcbedf7	\N	Cleared student records: All University Departments	E2E Administrator	admin	All	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: All University Departments	2026-10-20 14:16:32.023+05:30
7afaa956-3e3d-4260-8ebd-2d92680bf7dc	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-20 14:16:32.096+05:30
bba44976-bc09-4633-aa17-4fbe630a6a69	\N	Failed Reset Re-Authentication	E2E Administrator	admin	All	FAILED_ADMIN_REAUTH_DURING_RESET	\N	\N	127.0.0.1	Invalid administrator password supplied during database wipe request.	2026-10-20 14:16:32.169+05:30
4130d28f-e521-4c42-bbcd-d5104833dc91	\N	Disposable Database Reset	E2E Administrator	admin	All	DISPOSABLE_DATABASE_RESET_COMPLETED	\N	\N	127.0.0.1	Transactional tables cleared on verified disposable development database.	2026-10-20 14:16:32.24+05:30
58c102ee-e9c0-4bbc-bc17-73cbc0ffdc03	\N	Bulk uploaded student records	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:27:41.383+05:30
790d1e4a-f383-4e9d-a848-2ed9b8ad8893	\N	Cleared student records: Department: Computer Science and Engineering	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: Department: Computer Science and Engineering	2026-10-20 14:27:41.398+05:30
72299a03-5967-44d6-98d7-f262b7a9519b	\N	Bulk uploaded student records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:47:03.835+05:30
20ed6a96-b04e-4209-b7f7-1e8971c21b32	\N	Bulk uploaded student records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:47:03.841+05:30
830e8d66-b8c0-46ec-9d20-ea1b3839d337	\N	Publication	fc22df60-d83e-4fcc-95ab-189f57a3e712	system	\N	CREATE_PUBLICATION	\N	\N	\N	d398d9f0-13ee-463e-b2ff-d15fcc168d23	2026-10-20 14:47:03.893+05:30
3e51b1c3-e3b0-47bf-9278-501979962f73	\N	Patent	fc22df60-d83e-4fcc-95ab-189f57a3e712	system	\N	CREATE_PATENT	\N	\N	\N	e7a91f58-50b2-4314-aad6-6d88e23b3717	2026-10-20 14:47:03.903+05:30
d2b62d28-b517-42c3-bc94-4345e02a376d	\N	\N	System	system	\N	CREATE	\N	\N	\N	Created sponsored research grant: "National AI Security Research Grant" funded by DST SERB (₹5000000.00)	2026-10-20 14:47:03.914+05:30
6d4ca20f-62e0-4274-a178-249bfda6a9c0	\N	Bulk uploaded student records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:52:26.567+05:30
eaed56ae-f8ca-4da3-a4b9-f0b3e7be8f77	\N	Bulk uploaded student records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:52:26.573+05:30
f065838b-94fc-4419-88eb-2954d954634b	\N	Bulk uploaded faculty records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-20 14:52:26.586+05:30
cad9fdf0-1829-4db6-9de8-6e2a78a191a4	\N	Bulk uploaded faculty records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-20 14:52:26.589+05:30
c4ccd441-9dd0-48be-8123-196ea0151433	\N	Publication	640345e2-9222-42bf-89ab-3c0abbcb519b	system	\N	CREATE_PUBLICATION	\N	\N	\N	85810889-cd16-440b-80e1-f194428585dc	2026-10-20 14:52:26.624+05:30
e3225399-7f60-4f2d-b974-800e9b3985ed	\N	Patent	640345e2-9222-42bf-89ab-3c0abbcb519b	system	\N	CREATE_PATENT	\N	\N	\N	4866df9d-757e-4f40-a650-4fc3c107a40b	2026-10-20 14:52:26.631+05:30
ad86066c-effa-44d4-baac-0a1639592b49	\N	\N	System	system	\N	CREATE	\N	\N	\N	Created sponsored research grant: "National AI Security Research Grant" funded by DST SERB (₹5000000.00)	2026-10-20 14:52:26.639+05:30
54ef3cc1-adf9-40da-8279-c0ae25ba8dff	\N	Bulk uploaded student records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:53:54.489+05:30
9824da73-db74-48ab-a9a1-5ccee20a3ee0	\N	Bulk uploaded faculty records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-20 14:53:54.507+05:30
38a4aee4-94c0-4304-a111-59eee82f659e	\N	Bulk uploaded faculty records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-20 14:53:54.511+05:30
b3942c5f-1c40-48f5-8244-a71b5518cb04	\N	Publication	e7ec3b28-3a72-44d2-a3ca-f7a1bd2166d0	system	\N	CREATE_PUBLICATION	\N	\N	\N	0c47311e-bc7c-4557-bcca-d55e4e85945f	2026-10-20 14:53:54.543+05:30
15bd751d-5fb6-40be-b8a9-6e8bbde09fd4	\N	Patent	e7ec3b28-3a72-44d2-a3ca-f7a1bd2166d0	system	\N	CREATE_PATENT	\N	\N	\N	e8e0f801-9bd9-4b16-97cf-53986278ba1d	2026-10-20 14:53:54.55+05:30
0c1340e5-9daa-4e57-9fcf-f72fe87e1d0d	\N	\N	System	system	\N	CREATE	\N	\N	\N	Created sponsored research grant: "National AI Security Research Grant" funded by DST SERB (₹5000000.00)	2026-10-20 14:53:54.557+05:30
6cb4f7f6-4cab-4828-bb0c-773c17fbab7e	\N	Bulk uploaded student records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:58:56.161+05:30
570f3536-e576-4492-8dd0-d2ce1ee8cb7f	\N	Bulk uploaded student records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 14:58:56.166+05:30
e7ff6eb5-4f37-4b88-a6b1-c34fffdacfec	\N	Bulk uploaded faculty records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-20 14:58:56.183+05:30
b9ab30ce-bba1-4063-99b5-a52783368398	\N	Bulk uploaded faculty records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-20 14:58:56.187+05:30
225d0854-1ee2-4820-a47b-d0e18c5b345f	bb87dc7c-5877-416c-b1c8-f8b41e0c66f2	International Best Paper Award	Faculty Dept A	faculty	Computer Science	ACHIEVEMENT_CREATED	\N	{"id":"bb87dc7c-5877-416c-b1c8-f8b41e0c66f2","achieverType":"faculty","title":"International Best Paper Award","category":"awards","date":"2024-10-15","year":"2024-2025","department":"Computer Science","status":"submitted","createdBy":"ade9e26d-0e3a-4669-8527-65b3cd7643bb","updatedAt":"2026-10-20T09:28:56.209Z","createdAt":"2026-10-20T09:28:56.209Z","description":null,"subcategory":null,"rank":null,"score":null,"organization":null,"location":null,"participants":null,"impact":null}	\N	\N	2026-10-20 14:58:56.212+05:30
b6746b69-376f-4e8f-afd7-060259c8055c	\N	Publication	ade9e26d-0e3a-4669-8527-65b3cd7643bb	system	\N	CREATE_PUBLICATION	\N	\N	\N	46a8637f-6f1e-4fd6-b52d-fbc9b8ee4d21	2026-10-20 14:58:56.224+05:30
38b1d00a-cee4-4dc8-91af-bd197999e9c1	\N	Patent	ade9e26d-0e3a-4669-8527-65b3cd7643bb	system	\N	CREATE_PATENT	\N	\N	\N	60d34a80-12cd-4e0e-886a-2c65eb85f535	2026-10-20 14:58:56.231+05:30
64b18dd8-4d57-4019-ab0b-808e424346cc	\N	\N	System	system	\N	CREATE	\N	\N	\N	Created sponsored research grant: "National AI Security Research Grant" funded by DST SERB (₹5000000.00)	2026-10-20 14:58:56.238+05:30
5116958e-c80a-49ff-b9fa-47376a43ec5d	870c64ff-9369-467d-a2bd-59b07b562e37	Neural Architecture Best Paper	Prof. Faculty CS	faculty	Computer Science	EDIT_REQUEST_CREATED	{"status":"submitted"}	{"status":"edit_requested"}	\N	Reason: Update conference venue details	2026-10-20 15:13:15.364+05:30
12717a58-e69d-4f43-87eb-91783e1ec173	6752bc7e-6f93-446b-8159-908eee6e8a7f	Quantum Machine Learning Discovery	Prof. Coordinator CS	coordinator	Computer Science	EDIT_REQUEST_APPROVED	{"status":"submitted"}	{"status":"record_reopened"}	\N	\N	2026-10-20 15:13:15.4+05:30
55917b40-5b79-4b5f-a499-c7c53698272f	3f9b36ca-eb98-4440-970f-a250ccd57363	Neural Architecture Best Paper	Prof. Faculty CS	faculty	Computer Science	EDIT_REQUEST_CREATED	{"status":"submitted"}	{"status":"edit_requested"}	\N	Reason: Update conference venue details	2026-10-20 15:15:00.719+05:30
71e80d76-d434-4948-b512-dcbd75e2169d	4d9c7e02-ce05-4dce-af6d-2ec4a24418e6	Quantum Machine Learning Discovery	Prof. Coordinator CS	coordinator	Computer Science	EDIT_REQUEST_APPROVED	{"status":"submitted"}	{"status":"record_reopened"}	\N	\N	2026-10-20 15:15:00.753+05:30
009f44ce-c325-4915-8d95-94ce10591f2e	\N	Created document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	CREATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-20 15:16:04.13+05:30
7646b0a3-58b9-48c6-a1f3-f737cd610b7a	\N	Updated document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-20 15:16:04.141+05:30
f438383c-3d04-498f-88f2-48f27f0fde05	\N	Updated document: Security Test Document B6	B4 Admin User	admin	All	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-20 15:16:04.148+05:30
52f407e0-828e-4990-b038-acf1eaed20e3	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 15:16:04.174+05:30
36cd14ce-5172-44b3-a9a2-644efc4486bf	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 15:16:04.189+05:30
a1e9e988-8e5a-479d-a6b5-be919a135fc1	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 15:16:04.199+05:30
049b0bc6-359c-41f9-8016-b8b32449b9fe	\N	Bulk uploaded faculty records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-20 15:16:04.224+05:30
8cbaeef2-f7e8-4860-9f90-b0a161720481	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 15:16:04.248+05:30
84cfef21-c80e-401d-8b59-32cad66eec8a	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 15:16:04.253+05:30
5dc817b9-aa5d-48b9-a27f-448f2dfe5308	\N	Bulk uploaded student records	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 15:16:04.386+05:30
dc08e14d-6247-42a4-ab7c-06e5b251fcd4	\N	Cleared student records: Department: Computer Science and Engineering	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: Department: Computer Science and Engineering	2026-10-20 15:16:04.398+05:30
d42c58c6-2af4-4a02-890b-c2a3ab86a3b3	\N	Login Rate Limit Exceeded	Authentication Rate Limiter	system	Cybersecurity	LOGIN_RATE_LIMIT_EXCEEDED	\N	\N	127.0.0.1	Too many failed login attempts for account 'ratelimit_user@christuniversity.in' from IP 127.0.0.1. Request throttled.	2026-10-20 15:16:04.403+05:30
1c0f6928-20c1-424b-acb3-5d8c24dbcab3	\N	Login Rate Limit Exceeded	Authentication Rate Limiter	system	Cybersecurity	LOGIN_RATE_LIMIT_EXCEEDED	\N	\N	127.0.0.1	Too many failed login attempts for account 'ratelimit_user@christuniversity.in' from IP 127.0.0.1. Request throttled.	2026-10-20 15:16:04.413+05:30
6c215f5e-64e3-45e7-85a4-fa9a0f666abb	\N	Cleared student records: Department: Computer Science and Engineering	HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-20 15:16:40.26+05:30
6dc5ac8e-4d86-441d-a9c1-ccea20765343	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-20 15:21:25.267+05:30
061430b5-8bc4-4004-8afe-2a90ed92f88f	\N	Cleared student records: All University Departments	E2E Administrator	admin	All	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: All University Departments	2026-10-20 15:21:25.291+05:30
7f54fb2f-832b-4eb1-a556-dfbedf58c944	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-20 15:21:25.385+05:30
c4cb83a7-858e-4444-8e8d-542ceabb1abf	\N	Failed Reset Re-Authentication	E2E Administrator	admin	All	FAILED_ADMIN_REAUTH_DURING_RESET	\N	\N	127.0.0.1	Invalid administrator password supplied during database wipe request.	2026-10-20 15:21:25.466+05:30
8d8a488d-5803-4c40-abc2-66fe5ddd6ae7	\N	Disposable Database Reset	E2E Administrator	admin	All	DISPOSABLE_DATABASE_RESET_COMPLETED	\N	\N	127.0.0.1	Transactional tables cleared on verified disposable development database.	2026-10-20 15:21:25.532+05:30
4884c6d5-654d-4ad4-a2c3-06cde514afb0	\N	Cleared student records: Department: Computer Science and Engineering	HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-20 17:16:19.171+05:30
18bdacdb-f916-4cd6-9d11-5d3eed917cfa	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-20 17:16:19.716+05:30
375a9874-bc01-42d3-afa1-7beda92af50a	\N	Cleared student records: All University Departments	E2E Administrator	admin	All	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: All University Departments	2026-10-20 17:16:19.735+05:30
4e52f3bf-a80a-47e4-bf39-23ede4cb3347	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-20 17:16:19.832+05:30
b86eb8cb-58a6-4ad6-976a-232a61b1e6e6	\N	Failed Reset Re-Authentication	E2E Administrator	admin	All	FAILED_ADMIN_REAUTH_DURING_RESET	\N	\N	127.0.0.1	Invalid administrator password supplied during database wipe request.	2026-10-20 17:16:19.92+05:30
ea04f724-5e07-4007-ba5a-47822e6bb28c	\N	Disposable Database Reset	E2E Administrator	admin	All	DISPOSABLE_DATABASE_RESET_COMPLETED	\N	\N	127.0.0.1	Transactional tables cleared on verified disposable development database.	2026-10-20 17:16:19.986+05:30
4e259a62-8486-4918-a07a-32649715d473	\N	Cleared student records: Department: Computer Science and Engineering	HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-20 17:17:18.396+05:30
7f96f8b9-636d-43b7-9328-36c347c4ab98	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-20 17:26:36.34+05:30
6670fee1-8cd8-4dc5-a288-bb65460cde58	\N	Cleared student records: All University Departments	E2E Administrator	admin	All	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: All University Departments	2026-10-20 17:26:36.359+05:30
15311f54-36d0-4467-8ccb-55e6d29f7a15	\N	Cleared student records: Department: Computer Science and Engineering	E2E HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-20 17:26:36.436+05:30
fc721200-afc5-4b80-9459-12688d093bed	\N	Failed Reset Re-Authentication	E2E Administrator	admin	All	FAILED_ADMIN_REAUTH_DURING_RESET	\N	\N	127.0.0.1	Invalid administrator password supplied during database wipe request.	2026-10-20 17:26:36.512+05:30
b02727da-b554-41c8-917c-e276612cf6cc	\N	Disposable Database Reset	E2E Administrator	admin	All	DISPOSABLE_DATABASE_RESET_COMPLETED	\N	\N	127.0.0.1	Transactional tables cleared on verified disposable development database.	2026-10-20 17:26:36.578+05:30
f0986c9b-8f33-4ecc-9819-58becd14afff	\N	Cleared student records: Department: Computer Science and Engineering	HOD Dept A	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-20 17:26:48.361+05:30
f8a5b85f-fca9-405d-8213-70f46b20bd4b	\N	Bulk uploaded student records	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:27:33.365+05:30
6a86f9c1-92d8-47a7-a350-e2a11791dbef	\N	Cleared student records: Department: Computer Science and Engineering	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: Department: Computer Science and Engineering	2026-10-20 17:27:33.377+05:30
e554de3f-dc28-411f-ad2c-e461d60c9984	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:27:44.738+05:30
f934c66e-97a0-49df-8969-e45233d3e535	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:27:44.754+05:30
d4ebeded-2048-4dd2-ae64-12f638e7ee12	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:27:44.764+05:30
4d152794-ccc5-4aad-a781-493b385248c1	\N	Bulk uploaded faculty records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-20 17:27:44.788+05:30
da064ba6-2ffb-403a-bbbd-b16753c4726e	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:27:44.816+05:30
c95a188b-89af-462a-b1b4-64d2a13270e2	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:27:44.824+05:30
cac4b5f7-469f-4ac3-b991-0add141e4698	\N	Login Rate Limit Exceeded	Authentication Rate Limiter	system	Cybersecurity	LOGIN_RATE_LIMIT_EXCEEDED	\N	\N	127.0.0.1	Too many failed login attempts for account 'ratelimit_user@christuniversity.in' from IP 127.0.0.1. Request throttled.	2026-10-20 17:27:56.515+05:30
6faab05b-59b1-4d79-b7f2-f8e3f9a78a20	\N	Login Rate Limit Exceeded	Authentication Rate Limiter	system	Cybersecurity	LOGIN_RATE_LIMIT_EXCEEDED	\N	\N	127.0.0.1	Too many failed login attempts for account 'ratelimit_user@christuniversity.in' from IP 127.0.0.1. Request throttled.	2026-10-20 17:27:56.524+05:30
d16ac92c-ac62-4d1e-ad99-9d2119e5f64b	\N	Created document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	CREATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-20 17:27:57.352+05:30
2fdcd9ce-2ef7-4cc1-a0e6-982f6021b236	\N	Updated document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-20 17:27:57.363+05:30
6a776e48-bfd7-49c9-ac25-4809c6ba2813	\N	Updated document: Security Test Document B6	B4 Admin User	admin	All	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-20 17:27:57.37+05:30
330e108c-0e41-430e-9979-d6a4a92f733c	\N	Bulk uploaded student records	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:29:59.151+05:30
d1e52dda-b449-4546-a1e5-ed6555eca47d	\N	Cleared student records: Department: Computer Science and Engineering	Matrix Coordinator CSE	coordinator	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 2 student records. Scope: Department: Computer Science and Engineering	2026-10-20 17:29:59.168+05:30
4a12652f-ddb8-46d2-bb9c-e8500354de66	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:30:10.523+05:30
a12ef4c4-dcd1-4114-8e6f-176d43ab2999	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:30:10.537+05:30
bf45ff27-7377-4480-b9f9-2ebce8d843be	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:30:10.547+05:30
630a249b-8aae-48ff-adcb-be01341e710c	\N	Bulk uploaded faculty records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-20 17:30:10.572+05:30
1cb09151-eded-4faa-aea3-c4ea0a8da3d1	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:30:10.594+05:30
6495d84b-7265-4e57-b501-93114ad60b58	\N	Bulk uploaded student records	CSE Coordinator	coordinator	Computer Science and Engineering	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:30:10.6+05:30
d5697c7c-3e05-4ff3-99a4-2ad2e1be4bb9	\N	Login Rate Limit Exceeded	Authentication Rate Limiter	system	Cybersecurity	LOGIN_RATE_LIMIT_EXCEEDED	\N	\N	127.0.0.1	Too many failed login attempts for account 'ratelimit_user@christuniversity.in' from IP 127.0.0.1. Request throttled.	2026-10-20 17:30:22.289+05:30
1ac54742-6260-44d3-bc73-695f1e525f85	\N	Login Rate Limit Exceeded	Authentication Rate Limiter	system	Cybersecurity	LOGIN_RATE_LIMIT_EXCEEDED	\N	\N	127.0.0.1	Too many failed login attempts for account 'ratelimit_user@christuniversity.in' from IP 127.0.0.1. Request throttled.	2026-10-20 17:30:22.299+05:30
471d2ea8-476a-44b4-843e-6bac9c053750	\N	Created document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	CREATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-20 17:30:33.656+05:30
653c804f-1dee-465f-a58a-3949fb9366c2	\N	Updated document: Security Test Document B6	B4 Faculty User	faculty	Computer Science and Engineering	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-20 17:30:33.666+05:30
0ada49cd-f167-45d8-948c-6675998d7aae	\N	Updated document: Security Test Document B6	B4 Admin User	admin	All	UPDATE_DOCUMENT	\N	\N	127.0.0.1	\N	2026-10-20 17:30:33.673+05:30
ae7fa4b0-a52b-4856-a92e-3f35330164a4	0f18b612-8b87-489f-80eb-a4beb261c4b0	Neural Architecture Best Paper	Prof. Faculty CS	faculty	Computer Science	EDIT_REQUEST_CREATED	{"status":"submitted"}	{"status":"edit_requested"}	\N	Reason: Update conference venue details	2026-10-20 17:31:14.554+05:30
8fb0893b-a153-491c-a64c-ae89acf81e1f	a4bb3747-2f18-4f1e-a543-7e3f187c359b	Quantum Machine Learning Discovery	Prof. Coordinator CS	coordinator	Computer Science	EDIT_REQUEST_APPROVED	{"status":"submitted"}	{"status":"record_reopened"}	\N	\N	2026-10-20 17:31:14.585+05:30
7c163d2f-b5ab-43d3-ba63-e0d81be29033	\N	Bulk uploaded student records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:31:25.961+05:30
9b4e5e7d-2a65-492a-aa1b-a798e4e42594	\N	Bulk uploaded student records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_STUDENTS	\N	\N	127.0.0.1	Processed 1 students with 0 errors.	2026-10-20 17:31:25.969+05:30
7cd87457-b070-43c1-aec8-1004c1eba616	\N	Bulk uploaded faculty records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-20 17:31:25.983+05:30
640078b7-8f8a-41db-bcb6-13c29ef1b123	\N	Bulk uploaded faculty records	Coordinator Dept A	coordinator	Computer Science	BULK_UPLOAD_FACULTY	\N	\N	127.0.0.1	Processed 1 faculty members with 0 errors.	2026-10-20 17:31:25.986+05:30
b3f775ec-617f-46e5-bcee-fed4e17047b9	11b844c8-f8af-4eb9-a325-31604f197f8a	International Best Paper Award	Faculty Dept A	faculty	Computer Science	ACHIEVEMENT_CREATED	\N	{"id":"11b844c8-f8af-4eb9-a325-31604f197f8a","achieverType":"faculty","title":"International Best Paper Award","category":"awards","date":"2024-10-15","year":"2024-2025","department":"Computer Science","status":"submitted","createdBy":"6d2b2a71-4ba9-4fa0-9c90-218d8aecf287","updatedAt":"2026-10-20T12:01:26.007Z","createdAt":"2026-10-20T12:01:26.007Z","description":null,"subcategory":null,"rank":null,"score":null,"organization":null,"location":null,"participants":null,"impact":null}	\N	\N	2026-10-20 17:31:26.011+05:30
898f894f-c63a-4739-810b-50dbaa408d9a	\N	Publication	6d2b2a71-4ba9-4fa0-9c90-218d8aecf287	system	\N	CREATE_PUBLICATION	\N	\N	\N	0696175a-a57f-4b20-9a46-431eaa880958	2026-10-20 17:31:26.024+05:30
32071da9-2fbc-4196-990b-e6426b1b8628	\N	Patent	6d2b2a71-4ba9-4fa0-9c90-218d8aecf287	system	\N	CREATE_PATENT	\N	\N	\N	b3d497a1-558d-4717-9618-e6954db54534	2026-10-20 17:31:26.035+05:30
4509970e-6522-4d3f-a433-aeedd53020c4	\N	\N	System	system	\N	CREATE	\N	\N	\N	Created sponsored research grant: "National AI Security Research Grant" funded by DST SERB (₹5000000.00)	2026-10-20 17:31:26.046+05:30
2f9296b0-3b94-4ed7-86e6-a6efdc7ed473	\N	Cleared student records: Department: Computer Science and Engineering	Matrix HOD CSE	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 0 student records. Scope: Department: Computer Science and Engineering	2026-10-21 11:36:42.369+05:30
613e4830-4724-4070-b5e1-b410348ac387	617d337e-ee93-45af-b4f0-7f84049724cf	Updated Title	Matrix Faculty CSE	faculty	Computer Science and Engineering	ACHIEVEMENT_UPDATED	{"id":"617d337e-ee93-45af-b4f0-7f84049724cf","title":"Best Research Paper 2026","description":null,"category":"research","subcategory":null,"achieverType":"faculty","department":"Computer Science and Engineering","date":"2026-02-15","year":"2025-2026","rank":null,"score":null,"organization":null,"location":null,"participants":null,"impact":null,"status":"draft","createdBy":"0395f790-e240-4db0-9eac-885a00347b0d","createdAt":"2026-10-21T06:06:42.081Z","updatedAt":"2026-10-21T06:06:42.081Z"}	{"id":"617d337e-ee93-45af-b4f0-7f84049724cf","title":"Updated Title","description":null,"category":"research","subcategory":null,"achieverType":"faculty","department":"Computer Science and Engineering","date":"2026-02-15","year":"2025-2026","rank":null,"score":null,"organization":null,"location":null,"participants":null,"impact":null,"status":"draft","createdBy":"0395f790-e240-4db0-9eac-885a00347b0d","createdAt":"2026-10-21T06:06:42.081Z","updatedAt":"2026-10-21T06:06:42.407Z"}	\N	\N	2026-10-21 11:36:42.409+05:30
5e8cc34b-a3c6-45e0-9652-280cd34ad1b9	88d0d3f8-93c3-45a2-aa1b-9e09d76e8af3	Best Research Paper 2026	Matrix Faculty CSE	faculty	Computer Science and Engineering	EDIT_REQUEST_CREATED	{"status":"draft"}	{"status":"edit_requested"}	\N	Reason: Correction in date	2026-10-21 11:40:28.515+05:30
139b76f3-0026-4bca-a485-b1f265fb2ce1	\N	Cleared student records: Department: Computer Science and Engineering	Matrix HOD CSE	hod	Computer Science and Engineering	CLEAR_ALL_STUDENTS	\N	\N	127.0.0.1	Deleted 1 student records. Scope: Department: Computer Science and Engineering	2026-10-21 11:40:28.656+05:30
823f3f0e-7db6-4be8-9430-90efc0b91b6f	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_1	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
0103e52b-ce61-4d8d-9cd3-0127dd896fc9	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_2	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
3e757556-7c07-4a68-861f-6fc07192a7af	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_3	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
fccba64e-6041-4878-8c94-04fac1847056	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_4	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
35d46091-642e-4c3b-93f0-675faa291f6c	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_5	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
3a6b6c34-e567-4ce8-99b5-41a3c36e9a72	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_6	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
be13cd0f-bf51-40bb-9a3b-2bda302fc809	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_7	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
28d5ec3b-cd1c-404f-8ceb-d3a97e4d7db7	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_8	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
62d3bb05-a4e2-46fc-a1d1-88622aa3e92c	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_9	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
cef1ab0d-e1f0-4232-b8f7-37736a84cb66	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_10	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
52365cb3-d462-4c39-bb67-b2a2106d1f0b	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_11	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
f7349b23-a3a1-4ea9-a32e-512c80680cc7	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_12	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
3a4538b3-c484-4026-8663-29e3eff21fa3	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_13	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
05d371a7-fa88-4ac4-95aa-49be2003737b	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_14	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
d4a4064c-cdbc-4355-a5aa-84b105258a1f	\N	\N	DR Admin	admin	All	DR_ACTION_AUDIT_15	\N	\N	127.0.0.1	Automated DR Benchmark Test	2026-10-21 11:44:53.797+05:30
\.


--
-- Data for Name: campuses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.campuses (id, code, name, description, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: consultancy_projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consultancy_projects (id, "teacherConsultant", "projectName", "sponsoringAgency", year, "revenueInLakhs", department, status, "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courses (id, code, name, description, "departmentId", "programLevelId", duration, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: department_lineages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.department_lineages (id, "domainGroup", "parentDepartment", "childDepartment", "splitAcademicYear", "splitDate", status, description, "createdAt", "updatedAt") FROM stdin;
e4000d7c-27eb-4989-85cb-b87c56957fd4	Computing Domain	Computer Science and Engineering	Artificial Intelligence and Data Science	2024-25	2024-06-01	Active	Bifurcation of Computing Sciences into CSE and ADSE.	2026-10-20 16:58:33.139+05:30	2026-10-20 16:58:33.139+05:30
\.


--
-- Data for Name: departmental_activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departmental_activities (id, "academicYear", campus, school, department, "activityCategory", title, "reportDetails", "reportYear", "eventDate", "resourcePersons", "participantsCount", "documentUrl", status, "pendingNotes", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departments (id, code, name, "shortName", "schoolId", "hodId", "hodName", "hodEmail", "establishedYear", phone, description, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, title, description, category, subcategory, department, "academicYear", semester, "courseCode", "courseName", "fileName", "filePath", "fileSize", "fileType", "uploadedBy", status, tags, "createdAt", "updatedAt") FROM stdin;
9c6b0267-e105-4ff1-8e22-8da0701e7a49	CSE Accreditation Document	\N	naac	\N	Computer Science and Engineering	2025-2026	\N	\N	\N	cse-naac.pdf	/uploads/cse-naac.pdf	1024	application/pdf	37a3f31c-31ea-420d-8bab-93565016b501	approved	{}	2026-10-21 11:40:28.473+05:30	2026-10-21 11:40:28.473+05:30
\.


--
-- Data for Name: edit_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.edit_requests (id, "achievementId", reason, status, "coordinatorRemarks", "hodRemarks", "requestedBy", "createdAt", "updatedAt") FROM stdin;
a241a817-0dbb-4401-9106-312322c7dfe1	88d0d3f8-93c3-45a2-aa1b-9e09d76e8af3	Correction in date	pending	\N	\N	220126e4-3199-483e-bbcb-04f499af0f7c	2026-10-21 11:40:28.512+05:30	2026-10-21 11:40:28.512+05:30
\.


--
-- Data for Name: faculties; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.faculties (id, "sNo", "employeeId", name, designation, department, "academicYear", gender, "dateOfBirth", "panCardNo", "dateOfJoining", "prevTeachingExpYears", "prevTeachingExpMonths", "prevIndustryExpYears", "prevIndustryExpMonths", "qualificationLevel", "highestQualification", "cuExpYears", "cuExpMonths", email, phone, qualifications, specialization, status, "createdAt", "updatedAt") FROM stdin;
8c067f05-8e80-4040-a04f-5fa7fc905b5d	\N	DR_EMP_0001	DR Faculty 1	Associate Professor	Computer Science and Engineering	2025-2026	\N	\N	ABCDE1231F	\N	0	0	0	0	\N	\N	0	0	dr_fac_1@christ.in	\N	\N	\N	Active	2026-10-21 11:44:53.794+05:30	2026-10-21 11:44:53.794+05:30
f64e6bc7-daaa-4678-9630-969ad6845380	\N	DR_EMP_0002	DR Faculty 2	Associate Professor	Computer Science and Engineering	2025-2026	\N	\N	ABCDE1232F	\N	0	0	0	0	\N	\N	0	0	dr_fac_2@christ.in	\N	\N	\N	Active	2026-10-21 11:44:53.794+05:30	2026-10-21 11:44:53.794+05:30
2d024eee-a71c-4464-8c3c-ad5dd1634779	\N	DR_EMP_0003	DR Faculty 3	Associate Professor	Computer Science and Engineering	2025-2026	\N	\N	ABCDE1233F	\N	0	0	0	0	\N	\N	0	0	dr_fac_3@christ.in	\N	\N	\N	Active	2026-10-21 11:44:53.794+05:30	2026-10-21 11:44:53.794+05:30
52b1b2f8-f3e0-4f53-996e-e0fd1230c64c	\N	DR_EMP_0004	DR Faculty 4	Associate Professor	Computer Science and Engineering	2025-2026	\N	\N	ABCDE1234F	\N	0	0	0	0	\N	\N	0	0	dr_fac_4@christ.in	\N	\N	\N	Active	2026-10-21 11:44:53.794+05:30	2026-10-21 11:44:53.794+05:30
ed383c3f-dabd-4169-8c4f-fdcad3014fc7	\N	DR_EMP_0005	DR Faculty 5	Associate Professor	Computer Science and Engineering	2025-2026	\N	\N	ABCDE1235F	\N	0	0	0	0	\N	\N	0	0	dr_fac_5@christ.in	\N	\N	\N	Active	2026-10-21 11:44:53.794+05:30	2026-10-21 11:44:53.794+05:30
e145d80e-dd2e-4033-bea5-cae25c244113	\N	DR_EMP_0006	DR Faculty 6	Associate Professor	Computer Science and Engineering	2025-2026	\N	\N	ABCDE1236F	\N	0	0	0	0	\N	\N	0	0	dr_fac_6@christ.in	\N	\N	\N	Active	2026-10-21 11:44:53.794+05:30	2026-10-21 11:44:53.794+05:30
1cc668f2-a18d-435c-9c1d-98060e6d5159	\N	DR_EMP_0007	DR Faculty 7	Associate Professor	Computer Science and Engineering	2025-2026	\N	\N	ABCDE1237F	\N	0	0	0	0	\N	\N	0	0	dr_fac_7@christ.in	\N	\N	\N	Active	2026-10-21 11:44:53.794+05:30	2026-10-21 11:44:53.794+05:30
20504de0-cc57-42a9-9663-3e06859551df	\N	DR_EMP_0008	DR Faculty 8	Associate Professor	Computer Science and Engineering	2025-2026	\N	\N	ABCDE1238F	\N	0	0	0	0	\N	\N	0	0	dr_fac_8@christ.in	\N	\N	\N	Active	2026-10-21 11:44:53.794+05:30	2026-10-21 11:44:53.794+05:30
14e91985-a86e-4202-a700-5c72ea08202f	\N	DR_EMP_0009	DR Faculty 9	Associate Professor	Computer Science and Engineering	2025-2026	\N	\N	ABCDE1239F	\N	0	0	0	0	\N	\N	0	0	dr_fac_9@christ.in	\N	\N	\N	Active	2026-10-21 11:44:53.794+05:30	2026-10-21 11:44:53.794+05:30
8f81500f-7266-4319-b7b5-dde5ac58e466	\N	DR_EMP_0010	DR Faculty 10	Associate Professor	Computer Science and Engineering	2025-2026	\N	\N	ABCDE12310F	\N	0	0	0	0	\N	\N	0	0	dr_fac_10@christ.in	\N	\N	\N	Active	2026-10-21 11:44:53.794+05:30	2026-10-21 11:44:53.794+05:30
\.


--
-- Data for Name: least_priv_verification_table; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.least_priv_verification_table (id, payload) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, "recipientId", title, message, "isRead", type, "createdAt") FROM stdin;
\.


--
-- Data for Name: parameter_data_submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.parameter_data_submissions (id, "parameterId", department, "academicYear", "actualValue", "qualitativeResponse", "calculatedScore", status, "reviewerComments", "evidenceDocumentId", "submittedBy", "verifiedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: patents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patents (id, title, inventors, "applicationNo", "patentNo", status, "patentType", department, "academicYear", "filedDate", "publishedDate", "grantedDate", "licenseDate", partner, revenue, "patentUrl", description, "approvalStatus", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: placements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.placements (id, "studentName", "studentId", department, course, batch, company, role, package, "placementType", "placementDate", location, "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: program_levels; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.program_levels (id, code, name, description, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: publications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.publications (id, "authorName", title, "journalName", "journalType", department, "academicYear", "publicationDate", doi, issn, volume, issue, "pageNumber", "impactFactor", "citationCount", "paperUrl", abstract, status, "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: research_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.research_metrics (id, "academicYear", "periodType", "periodValue", department, books, chapters, "scopusJournals", "nationalJournals", "internationalJournals", citations, "patentsIndian", "patentsInternational", "conferencesNational", "conferencesInternational", "consultancyCount", "consultancyAmount", "seedMoneyCount", "seedMoneyAmount", "externalProjectsCount", "externalProjectsAmount", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: schools; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schools (id, code, name, description, "campusId", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: sponsored_projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sponsored_projects (id, title, "principalInvestigator", "coInvestigators", "fundingAgency", scheme, "agencyType", "sanctionOrderNo", "sanctionDate", "startDate", "endDate", "sanctionedAmount", "amountReceived", status, "progressPercentage", department, "academicYear", "projectUrl", description, "approvalStatus", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: strategic_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.strategic_plans (id, department, "academicYear", category, objective, description, "targetDate", status, progress, budget, responsible, notes, "createdBy", "createdAt", "updatedAt") FROM stdin;
b870faed-8254-42cf-9e8d-b8b9ed323a5c	Computer Science and Engineering	2025-2026	academic-excellence	CSE Strategic Roadmap Objective	CSE Strategic Roadmap Description	2026-12-31	planned	0	\N	\N	\N	294d0a13-d31d-44d0-bb6f-fb96075e0fa2	2026-10-21 11:40:28.476+05:30	2026-10-21 11:40:28.476+05:30
5462307d-e8bc-4874-8532-4555c3a1521b	Electronics and Communication Engineering	2025-2026	academic-excellence	ECE Strategic Roadmap Objective	ECE Strategic Roadmap Description	2026-12-31	planned	0	\N	\N	\N	4e31e01d-eb7f-43b0-92b3-caa712b603c5	2026-10-21 11:40:28.478+05:30	2026-10-21 11:40:28.478+05:30
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.students (id, "registerNumber", name, email, phone, course, department, "previousSchool", gender, dob, "bloodGroup", batch, "admissionDate", status, "guardianName", "guardianPhone", address, "className", "applicationNo", "mobileNo", nationality, caste, "currentCity", "currentState", "permanentCity", "permanentState", "parentMobileNo", handicapped, "handicappedDescription", campus, school, "programLevel", "academicYear", disability, "createdAt", "updatedAt") FROM stdin;
97e934ef-d9f4-46ec-bbe3-37f66bcb9901	DR_REG_0001	DR Student 1	dr_student_1@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
1df640f7-f5ee-4c55-be9f-8574b4d16aec	DR_REG_0002	DR Student 2	dr_student_2@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
d1690aed-171b-46d2-af17-8ddc837d29d1	DR_REG_0003	DR Student 3	dr_student_3@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
b343fc4a-9961-4cea-99a1-3830f39978db	DR_REG_0004	DR Student 4	dr_student_4@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
323c9f51-e9c3-4fa8-b18a-16ee456d4fec	DR_REG_0005	DR Student 5	dr_student_5@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
20ef126e-35ff-4fd2-85e7-9a2410e73456	DR_REG_0006	DR Student 6	dr_student_6@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
6102b81d-df4f-490b-b060-12b2b821022f	DR_REG_0007	DR Student 7	dr_student_7@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
76cd6a17-90bc-4181-8fa0-a76cfdf35725	DR_REG_0008	DR Student 8	dr_student_8@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
09169b5a-fe7b-4b0d-93eb-22d97f5d27e3	DR_REG_0009	DR Student 9	dr_student_9@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
4c628b85-fce6-40c4-b7e9-183c40fcfc9c	DR_REG_0010	DR Student 10	dr_student_10@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
a6201dd6-5541-4ae0-8c36-4903f2d67ad2	DR_REG_0011	DR Student 11	dr_student_11@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
3912991c-991a-4463-8cc2-e4c64d303206	DR_REG_0012	DR Student 12	dr_student_12@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
79c15a30-cf38-4052-a03b-d57b06eed33f	DR_REG_0013	DR Student 13	dr_student_13@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
bde9fdd7-0c76-4d68-a747-c1ef8ca7b049	DR_REG_0014	DR Student 14	dr_student_14@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
6e8a5c6d-c875-4c96-ac10-653f0fe0f7e6	DR_REG_0015	DR Student 15	dr_student_15@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
d1b8bb06-7bbb-411a-b1f3-329e8b504fd5	DR_REG_0016	DR Student 16	dr_student_16@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
37f0db90-41df-481c-9d5a-217b78fecfe4	DR_REG_0017	DR Student 17	dr_student_17@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
d72a49db-b26a-4502-8095-fe6a4438b121	DR_REG_0018	DR Student 18	dr_student_18@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
fbde8b1d-8f73-4b33-b57c-f9cce1caaa1e	DR_REG_0019	DR Student 19	dr_student_19@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
b1659e5c-a46e-4984-b4d9-18263aa1fea6	DR_REG_0020	DR Student 20	dr_student_20@christ.in	\N	\N	Computer Science and Engineering	\N	Male	\N	\N	\N	\N	Active	\N	\N	\N	8 BTech CSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NIL	\N	\N	\N	2025-2026	\N	2026-10-21 11:44:53.79+05:30	2026-10-21 11:44:53.79+05:30
\.


--
-- Data for Name: user_department_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_department_history (id, "userId", department, "departmentCode", designation, "startAcademicYear", "endAcademicYear", "effectiveFrom", "effectiveTo", "isCurrent", "transferReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password, role, department, "employeeId", phone, "isActive", "lastLogin", "mustChangePassword", "passwordChangedAt", "tokenVersion", "createdAt", "updatedAt") FROM stdin;
b5c2907e-366d-4145-95bf-c447b5506f2c	Matrix Admin	e_matrix_admin@christ.in	$2a$10$ITKK1mIQGABOW/xEzPlDPuNf7kPQ1tndmModeqrBfzuNufUuAd0J6	admin	All	\N	\N	t	\N	f	\N	1	2026-10-21 11:40:28.089+05:30	2026-10-21 11:40:28.089+05:30
51eae5da-0ffd-4744-902b-73b621e1d169	Matrix Authority	e_matrix_auth@christ.in	$2a$10$r/H4Urq7TJF6Ebn4pwAoOukU3kjSu9uIm8W4Ffq3tFivLSjelpuFC	authority	All	\N	\N	t	\N	f	\N	1	2026-10-21 11:40:28.161+05:30	2026-10-21 11:40:28.161+05:30
294d0a13-d31d-44d0-bb6f-fb96075e0fa2	Matrix HOD CSE	e_matrix_hod@christ.in	$2a$10$Q9TSz/hi1.gEUAV/bUBZbuEl1q5dOpUC5zcEjwYZjy/xSC96SAJzy	hod	Computer Science and Engineering	\N	\N	t	\N	f	\N	1	2026-10-21 11:40:28.222+05:30	2026-10-21 11:40:28.222+05:30
37a3f31c-31ea-420d-8bab-93565016b501	Matrix Coord CSE	e_matrix_coord@christ.in	$2a$10$vIQzJvKt60rpiT/5fDGOw.ABXGFmkjsM0lw802jyZecXwoYUzfhRK	coordinator	Computer Science and Engineering	\N	\N	t	\N	f	\N	1	2026-10-21 11:40:28.282+05:30	2026-10-21 11:40:28.282+05:30
220126e4-3199-483e-bbcb-04f499af0f7c	Matrix Faculty CSE	e_matrix_fac_cse@christ.in	$2a$10$2oyTnnTohsz9GanVZSgYlO6s1pxMTZgmEgGxo6DlzLyxvYODm63Je	faculty	Computer Science and Engineering	\N	\N	t	\N	f	\N	1	2026-10-21 11:40:28.345+05:30	2026-10-21 11:40:28.345+05:30
4e31e01d-eb7f-43b0-92b3-caa712b603c5	Matrix Faculty ECE	e_matrix_fac_ece@christ.in	$2a$10$CAcKl76GG97.Gqb.lQhmN.ZT03Oo8ludPdyrHZUzeQ4aHWLYJAL/W	faculty	Electronics and Communication Engineering	\N	\N	t	\N	f	\N	1	2026-10-21 11:40:28.409+05:30	2026-10-21 11:40:28.409+05:30
43155f19-0fc3-456d-9bb1-7ae525269a6b	DR User 1	dr_benchmark_user_1@christ.in	BenchmarkPassword@2026!	admin	Computer Science and Engineering	\N	\N	t	\N	f	\N	1	2026-10-21 11:44:53.785+05:30	2026-10-21 11:44:53.785+05:30
c732d704-530e-4963-b627-722a7bcb0d39	DR User 2	dr_benchmark_user_2@christ.in	BenchmarkPassword@2026!	hod	Computer Science and Engineering	\N	\N	t	\N	f	\N	1	2026-10-21 11:44:53.785+05:30	2026-10-21 11:44:53.785+05:30
1d2d0fea-d112-4ab7-b908-f0b043ddf10a	DR User 3	dr_benchmark_user_3@christ.in	BenchmarkPassword@2026!	faculty	Computer Science and Engineering	\N	\N	t	\N	f	\N	1	2026-10-21 11:44:53.785+05:30	2026-10-21 11:44:53.785+05:30
662eb595-3798-4fa6-bfc5-207ad612cb93	DR User 4	dr_benchmark_user_4@christ.in	BenchmarkPassword@2026!	faculty	Computer Science and Engineering	\N	\N	t	\N	f	\N	1	2026-10-21 11:44:53.785+05:30	2026-10-21 11:44:53.785+05:30
0f975dac-c994-4e88-9540-86b534e239c0	DR User 5	dr_benchmark_user_5@christ.in	BenchmarkPassword@2026!	faculty	Computer Science and Engineering	\N	\N	t	\N	f	\N	1	2026-10-21 11:44:53.785+05:30	2026-10-21 11:44:53.785+05:30
\.


--
-- Name: __disposable_test_marker___id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.__disposable_test_marker___id_seq', 1, true);


--
-- Name: least_priv_verification_table_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.least_priv_verification_table_id_seq', 1, true);


--
-- Name: __disposable_test_marker__ __disposable_test_marker___pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.__disposable_test_marker__
    ADD CONSTRAINT __disposable_test_marker___pkey PRIMARY KEY (id);


--
-- Name: accreditation_frameworks accreditation_frameworks_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accreditation_frameworks
    ADD CONSTRAINT accreditation_frameworks_code_key UNIQUE (code);


--
-- Name: accreditation_frameworks accreditation_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accreditation_frameworks
    ADD CONSTRAINT accreditation_frameworks_pkey PRIMARY KEY (id);


--
-- Name: accreditation_parameters accreditation_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accreditation_parameters
    ADD CONSTRAINT accreditation_parameters_pkey PRIMARY KEY (id);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: campuses campuses_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campuses
    ADD CONSTRAINT campuses_code_key UNIQUE (code);


--
-- Name: campuses campuses_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campuses
    ADD CONSTRAINT campuses_code_key1 UNIQUE (code);


--
-- Name: campuses campuses_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campuses
    ADD CONSTRAINT campuses_name_key UNIQUE (name);


--
-- Name: campuses campuses_name_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campuses
    ADD CONSTRAINT campuses_name_key1 UNIQUE (name);


--
-- Name: campuses campuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campuses
    ADD CONSTRAINT campuses_pkey PRIMARY KEY (id);


--
-- Name: consultancy_projects consultancy_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultancy_projects
    ADD CONSTRAINT consultancy_projects_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: department_lineages department_lineages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_lineages
    ADD CONSTRAINT department_lineages_pkey PRIMARY KEY (id);


--
-- Name: departmental_activities departmental_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departmental_activities
    ADD CONSTRAINT departmental_activities_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- Name: departments departments_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key1 UNIQUE (code);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_name_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key1 UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: edit_requests edit_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edit_requests
    ADD CONSTRAINT edit_requests_pkey PRIMARY KEY (id);


--
-- Name: faculties faculties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculties
    ADD CONSTRAINT faculties_pkey PRIMARY KEY (id);


--
-- Name: least_priv_verification_table least_priv_verification_table_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.least_priv_verification_table
    ADD CONSTRAINT least_priv_verification_table_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: parameter_data_submissions parameter_data_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_data_submissions
    ADD CONSTRAINT parameter_data_submissions_pkey PRIMARY KEY (id);


--
-- Name: patents patents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patents
    ADD CONSTRAINT patents_pkey PRIMARY KEY (id);


--
-- Name: placements placements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_pkey PRIMARY KEY (id);


--
-- Name: program_levels program_levels_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_levels
    ADD CONSTRAINT program_levels_code_key UNIQUE (code);


--
-- Name: program_levels program_levels_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_levels
    ADD CONSTRAINT program_levels_name_key UNIQUE (name);


--
-- Name: program_levels program_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_levels
    ADD CONSTRAINT program_levels_pkey PRIMARY KEY (id);


--
-- Name: publications publications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publications
    ADD CONSTRAINT publications_pkey PRIMARY KEY (id);


--
-- Name: research_metrics research_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_metrics
    ADD CONSTRAINT research_metrics_pkey PRIMARY KEY (id);


--
-- Name: schools schools_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_code_key UNIQUE (code);


--
-- Name: schools schools_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_code_key1 UNIQUE (code);


--
-- Name: schools schools_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_name_key UNIQUE (name);


--
-- Name: schools schools_name_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_name_key1 UNIQUE (name);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: sponsored_projects sponsored_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsored_projects
    ADD CONSTRAINT sponsored_projects_pkey PRIMARY KEY (id);


--
-- Name: strategic_plans strategic_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_plans
    ADD CONSTRAINT strategic_plans_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: user_department_history user_department_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_department_history
    ADD CONSTRAINT user_department_history_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_email_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key1 UNIQUE (email);


--
-- Name: users users_employeeId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_employeeId_key" UNIQUE ("employeeId");


--
-- Name: users users_employeeId_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_employeeId_key1" UNIQUE ("employeeId");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: accreditation_frameworks_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accreditation_frameworks_academic_year ON public.accreditation_frameworks USING btree ("academicYear");


--
-- Name: accreditation_frameworks_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accreditation_frameworks_category ON public.accreditation_frameworks USING btree (category);


--
-- Name: accreditation_frameworks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accreditation_frameworks_status ON public.accreditation_frameworks USING btree (status);


--
-- Name: accreditation_parameters_criterion_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accreditation_parameters_criterion_number ON public.accreditation_parameters USING btree ("criterionNumber");


--
-- Name: accreditation_parameters_framework_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accreditation_parameters_framework_id ON public.accreditation_parameters USING btree ("frameworkId");


--
-- Name: accreditation_parameters_metric_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accreditation_parameters_metric_id ON public.accreditation_parameters USING btree ("metricId");


--
-- Name: courses_code_dept_level_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX courses_code_dept_level_unique ON public.courses USING btree (code, "departmentId", "programLevelId");


--
-- Name: faculties_employee_academic_year_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX faculties_employee_academic_year_unique ON public.faculties USING btree ("employeeId", "academicYear");


--
-- Name: parameter_data_submissions_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX parameter_data_submissions_academic_year ON public.parameter_data_submissions USING btree ("academicYear");


--
-- Name: parameter_data_submissions_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX parameter_data_submissions_department ON public.parameter_data_submissions USING btree (department);


--
-- Name: parameter_data_submissions_parameter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX parameter_data_submissions_parameter_id ON public.parameter_data_submissions USING btree ("parameterId");


--
-- Name: parameter_data_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX parameter_data_submissions_status ON public.parameter_data_submissions USING btree (status);


--
-- Name: patents_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patents_academic_year ON public.patents USING btree ("academicYear");


--
-- Name: patents_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patents_created_by ON public.patents USING btree ("createdBy");


--
-- Name: patents_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patents_department ON public.patents USING btree (department);


--
-- Name: patents_patent_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patents_patent_type ON public.patents USING btree ("patentType");


--
-- Name: patents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patents_status ON public.patents USING btree (status);


--
-- Name: publications_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX publications_academic_year ON public.publications USING btree ("academicYear");


--
-- Name: publications_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX publications_created_by ON public.publications USING btree ("createdBy");


--
-- Name: publications_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX publications_department ON public.publications USING btree (department);


--
-- Name: publications_journal_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX publications_journal_type ON public.publications USING btree ("journalType");


--
-- Name: sponsored_projects_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sponsored_projects_academic_year ON public.sponsored_projects USING btree ("academicYear");


--
-- Name: sponsored_projects_agency_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sponsored_projects_agency_type ON public.sponsored_projects USING btree ("agencyType");


--
-- Name: sponsored_projects_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sponsored_projects_department ON public.sponsored_projects USING btree (department);


--
-- Name: sponsored_projects_funding_agency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sponsored_projects_funding_agency ON public.sponsored_projects USING btree ("fundingAgency");


--
-- Name: sponsored_projects_principal_investigator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sponsored_projects_principal_investigator ON public.sponsored_projects USING btree ("principalInvestigator");


--
-- Name: sponsored_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sponsored_projects_status ON public.sponsored_projects USING btree (status);


--
-- Name: students_register_academic_year_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX students_register_academic_year_unique ON public.students USING btree ("registerNumber", "academicYear");


--
-- Name: user_department_history_department_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_department_history_department_code ON public.user_department_history USING btree ("departmentCode");


--
-- Name: user_department_history_is_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_department_history_is_current ON public.user_department_history USING btree ("isCurrent");


--
-- Name: user_department_history_start_academic_year_end_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_department_history_start_academic_year_end_academic_year ON public.user_department_history USING btree ("startAcademicYear", "endAcademicYear");


--
-- Name: user_department_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_department_history_user_id ON public.user_department_history USING btree ("userId");


--
-- Name: accreditation_frameworks accreditation_frameworks_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accreditation_frameworks
    ADD CONSTRAINT "accreditation_frameworks_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: accreditation_parameters accreditation_parameters_frameworkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accreditation_parameters
    ADD CONSTRAINT "accreditation_parameters_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES public.accreditation_frameworks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: achievements achievements_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT "achievements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: consultancy_projects consultancy_projects_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultancy_projects
    ADD CONSTRAINT "consultancy_projects_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: courses courses_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT "courses_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: courses courses_programLevelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT "courses_programLevelId_fkey" FOREIGN KEY ("programLevelId") REFERENCES public.program_levels(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: departments departments_hodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "departments_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: departments departments_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "departments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: documents documents_uploadedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: edit_requests edit_requests_achievementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edit_requests
    ADD CONSTRAINT "edit_requests_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES public.achievements(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: edit_requests edit_requests_requestedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edit_requests
    ADD CONSTRAINT "edit_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_recipientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: parameter_data_submissions parameter_data_submissions_evidenceDocumentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_data_submissions
    ADD CONSTRAINT "parameter_data_submissions_evidenceDocumentId_fkey" FOREIGN KEY ("evidenceDocumentId") REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: parameter_data_submissions parameter_data_submissions_parameterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_data_submissions
    ADD CONSTRAINT "parameter_data_submissions_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES public.accreditation_parameters(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: parameter_data_submissions parameter_data_submissions_submittedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_data_submissions
    ADD CONSTRAINT "parameter_data_submissions_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: parameter_data_submissions parameter_data_submissions_verifiedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_data_submissions
    ADD CONSTRAINT "parameter_data_submissions_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES public.users(id);


--
-- Name: patents patents_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patents
    ADD CONSTRAINT "patents_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: placements placements_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT "placements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: publications publications_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publications
    ADD CONSTRAINT "publications_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: schools schools_campusId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT "schools_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES public.campuses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sponsored_projects sponsored_projects_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsored_projects
    ADD CONSTRAINT "sponsored_projects_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: strategic_plans strategic_plans_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_plans
    ADD CONSTRAINT "strategic_plans_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_department_history user_department_history_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_department_history
    ADD CONSTRAINT "user_department_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict z3MXbTK8GycSAECAdlyGA3SnQdXcCMgby5MNfRKF7ROfB8e042HlSjKjGDcIWcL

