CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."agreement_type" AS ENUM('NDA', 'CONFIDENTIALITY', 'DATA_ACCESS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."application_member_role" AS ENUM('LEADER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."application_member_status" AS ENUM('INVITED', 'ACCEPTED', 'DECLINED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('SUBMITTED', 'SHORTLISTED', 'ASSESSMENT', 'SELECTION_PENDING', 'SELECTED', 'REJECTED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."assessment_ai_policy" AS ENUM('ALLOWED', 'ALLOWED_WITH_DISCLOSURE', 'RESTRICTED');--> statement-breakpoint
CREATE TYPE "public"."assessment_attempt_status" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED');--> statement-breakpoint
CREATE TYPE "public"."assessment_question_type" AS ENUM('MULTIPLE_CHOICE', 'CODING', 'PRACTICAL_TASK', 'REASONING', 'ADAPTIVE_FOLLOWUP');--> statement-breakpoint
CREATE TYPE "public"."assessment_scope" AS ENUM('TEAM', 'INDIVIDUAL');--> statement-breakpoint
CREATE TYPE "public"."assessment_status" AS ENUM('DRAFT', 'REVIEW', 'APPROVED', 'ACTIVE', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."challenge_status" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'AWAITING_FACULTY', 'FACULTY_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'PUBLISHED', 'APPLICATIONS_OPEN', 'MATCHING', 'SHORTLISTING', 'ASSESSMENT', 'SELECTION_PENDING', 'SELECTED', 'ACTIVE', 'FINAL_REVIEW', 'COMPLETED', 'ARCHIVED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."challenge_visibility" AS ENUM('PUBLIC_PREVIEW', 'VINUNI_ONLY', 'INVITE_ONLY', 'PRIVATE');--> statement-breakpoint
CREATE TYPE "public"."compensation_type" AS ENUM('PAID', 'UNPAID', 'CREDIT', 'OTHER', 'NOT_SPECIFIED');--> statement-breakpoint
CREATE TYPE "public"."deliverable_type" AS ENUM('FILE', 'LINK', 'TEXT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."eligibility_rule_type" AS ENUM('MIN_GPA', 'STUDY_YEAR', 'SCHOOL', 'MAJOR', 'AVAILABLE_HOURS', 'MAX_ACTIVE_PROJECTS');--> statement-breakpoint
CREATE TYPE "public"."evidence_confidence" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."evidence_type" AS ENUM('GITHUB', 'PORTFOLIO', 'REPORT', 'DEMO', 'COURSE_PROJECT', 'CERTIFICATE', 'FACULTY_VERIFICATION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."faculty_assignment_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('GENERAL', 'FACULTY_CLOSEOUT', 'PARTNER_CLOSEOUT');--> statement-breakpoint
CREATE TYPE "public"."feedback_visibility" AS ENUM('RECIPIENT', 'PROJECT_TEAM', 'FACULTY', 'PARTNER', 'MANAGING_ORGANIZATION', 'PRIVATE_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('ADMIN', 'PROJECT_MANAGER', 'CONTACT_PERSON', 'REVIEWER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."milestone_review_decision" AS ENUM('APPROVED', 'REVISION_REQUESTED');--> statement-breakpoint
CREATE TYPE "public"."milestone_review_role" AS ENUM('FACULTY', 'PARTNER', 'MANAGING_ORGANIZATION');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."normalization_status" AS ENUM('PENDING', 'NORMALIZED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('INTERNAL_UNIT', 'EXTERNAL_PARTNER');--> statement-breakpoint
CREATE TYPE "public"."organization_verification_status" AS ENUM('PENDING', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."proficiency_level" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('ACTIVE', 'PAUSED', 'FINAL_REVIEW', 'COMPLETED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."resource_sensitivity" AS ENUM('PUBLIC', 'TEAM_ONLY', 'CONFIDENTIAL', 'RESTRICTED');--> statement-breakpoint
CREATE TYPE "public"."review_decision" AS ENUM('APPROVED', 'REVISION_REQUESTED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."skill_match_type" AS ENUM('EXACT', 'RELATED', 'TRANSFERABLE', 'NO_MATCH');--> statement-breakpoint
CREATE TYPE "public"."skill_relationship_type" AS ENUM('RELATED', 'TRANSFERABLE', 'PREREQUISITE', 'ECOSYSTEM');--> statement-breakpoint
CREATE TYPE "public"."skill_requirement_type" AS ENUM('REQUIRED', 'PREFERRED', 'OPTIONAL');--> statement-breakpoint
CREATE TYPE "public"."skill_source" AS ENUM('SELF_DECLARED', 'PROJECT', 'COURSE', 'PORTFOLIO', 'FACULTY_VERIFIED', 'ASSESSMENT', 'AI_EXTRACTED');--> statement-breakpoint
CREATE TYPE "public"."skill_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."supervision_request_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('UNVERIFIED', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('ONSITE', 'HYBRID', 'REMOTE');--> statement-breakpoint
CREATE TABLE "faculty_profiles" (
	"user_id" bigint PRIMARY KEY NOT NULL,
	"school" varchar(255),
	"department" varchar(255),
	"academic_title" varchar(255),
	"max_active_supervisions" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "faculty_profiles_max_supervisions_non_negative" CHECK ("faculty_profiles"."max_active_supervisions" IS NULL OR "faculty_profiles"."max_active_supervisions" >= 0)
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"user_id" bigint PRIMARY KEY NOT NULL,
	"school" varchar(255),
	"major" varchar(255),
	"study_year" integer,
	"gpa" numeric(4, 2),
	"gpa_scale" numeric(4, 2),
	"academic_data_verified_at" timestamp with time zone,
	"interests" text,
	"available_hours_per_week" integer,
	"profile_visibility" varchar(80) DEFAULT 'VINUNI_ONLY',
	"ai_matching_consent" boolean DEFAULT false,
	"cv_url" text,
	"portfolio_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "student_profiles_study_year_positive" CHECK ("student_profiles"."study_year" IS NULL OR "student_profiles"."study_year" > 0),
	CONSTRAINT "student_profiles_gpa_non_negative" CHECK ("student_profiles"."gpa" IS NULL OR "student_profiles"."gpa" >= 0),
	CONSTRAINT "student_profiles_gpa_scale_positive" CHECK ("student_profiles"."gpa_scale" IS NULL OR "student_profiles"."gpa_scale" > 0),
	CONSTRAINT "student_profiles_gpa_within_scale" CHECK ("student_profiles"."gpa" IS NULL OR "student_profiles"."gpa_scale" IS NULL OR "student_profiles"."gpa" <= "student_profiles"."gpa_scale"),
	CONSTRAINT "student_profiles_available_hours_range" CHECK ("student_profiles"."available_hours_per_week" IS NULL OR ("student_profiles"."available_hours_per_week" >= 0 AND "student_profiles"."available_hours_per_week" <= 168))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"organization_id" bigint NOT NULL,
	"role" "membership_role" NOT NULL,
	"status" "membership_status" DEFAULT 'ACTIVE',
	"job_title" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"organization_type" "organization_type" NOT NULL,
	"description" text,
	"industry" varchar(255),
	"verification_status" "organization_verification_status" DEFAULT 'PENDING',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_evidence" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"evidence_type" "evidence_type",
	"evidence_url" text,
	"verification_status" "verification_status" DEFAULT 'UNVERIFIED',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_skills" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"skill_id" bigint,
	"raw_skill_name" varchar(255),
	"source" "skill_source",
	"confidence" numeric(6, 5),
	"normalization_status" "normalization_status" DEFAULT 'PENDING',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "project_skills_confidence_range" CHECK ("project_skills"."confidence" IS NULL OR ("project_skills"."confidence" >= 0 AND "project_skills"."confidence" <= 1))
);
--> statement-breakpoint
CREATE TABLE "skill_aliases" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"skill_id" bigint NOT NULL,
	"alias" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_candidates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"raw_name" varchar(255) NOT NULL,
	"submitted_by" bigint,
	"source_type" varchar(80),
	"source_id" bigint,
	"suggested_skill_id" bigint,
	"status" varchar(80) DEFAULT 'PENDING',
	"created_at" timestamp with time zone DEFAULT now(),
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "skill_categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_id" bigint,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "skill_relationships" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"skill_id" bigint NOT NULL,
	"related_skill_id" bigint NOT NULL,
	"relationship_type" "skill_relationship_type",
	"similarity_score" numeric(6, 5),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "skill_relationships_not_self" CHECK ("skill_relationships"."skill_id" <> "skill_relationships"."related_skill_id"),
	CONSTRAINT "skill_relationships_similarity_range" CHECK ("skill_relationships"."similarity_score" IS NULL OR ("skill_relationships"."similarity_score" >= 0 AND "skill_relationships"."similarity_score" <= 1))
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"canonical_name" varchar(255) NOT NULL,
	"category_id" bigint,
	"description" text,
	"status" "skill_status" DEFAULT 'ACTIVE',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_projects" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"role_description" text,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "student_projects_date_order" CHECK ("student_projects"."start_date" IS NULL OR "student_projects"."end_date" IS NULL OR "student_projects"."start_date" <= "student_projects"."end_date")
);
--> statement-breakpoint
CREATE TABLE "student_skills" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"skill_id" bigint,
	"raw_skill_name" varchar(255),
	"proficiency" "proficiency_level",
	"source" "skill_source",
	"confidence" numeric(6, 5),
	"normalization_status" "normalization_status" DEFAULT 'PENDING',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "student_skills_confidence_range" CHECK ("student_skills"."confidence" IS NULL OR ("student_skills"."confidence" >= 0 AND "student_skills"."confidence" <= 1))
);
--> statement-breakpoint
CREATE TABLE "challenge_eligibility_rules" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"challenge_id" bigint NOT NULL,
	"rule_type" "eligibility_rule_type" NOT NULL,
	"config" jsonb,
	"required" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "challenge_faculty_assignments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"challenge_id" bigint NOT NULL,
	"faculty_id" bigint NOT NULL,
	"assigned_by" bigint NOT NULL,
	"status" "faculty_assignment_status" DEFAULT 'PENDING',
	"comments" text,
	"assigned_at" timestamp with time zone,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "challenge_reviews" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"challenge_id" bigint NOT NULL,
	"reviewer_id" bigint NOT NULL,
	"reviewer_organization_id" bigint,
	"decision" "review_decision" NOT NULL,
	"comments" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "challenge_skills" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"challenge_id" bigint NOT NULL,
	"skill_id" bigint,
	"raw_skill_name" varchar(255),
	"requirement_type" "skill_requirement_type" NOT NULL,
	"weight" numeric(6, 5) DEFAULT 1,
	"normalization_status" "normalization_status" DEFAULT 'PENDING',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "challenge_skills_weight_range" CHECK ("challenge_skills"."weight" IS NULL OR ("challenge_skills"."weight" >= 0 AND "challenge_skills"."weight" <= 1))
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160),
	"owner_organization_id" bigint NOT NULL,
	"managing_organization_id" bigint NOT NULL,
	"contact_person_id" bigint,
	"title" varchar(255) NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"subtype" varchar(120),
	"domain" varchar(255),
	"expected_deliverables" text,
	"duration_weeks" integer,
	"weekly_hours" integer,
	"team_size_min" integer,
	"team_size_max" integer,
	"work_mode" "work_mode",
	"start_date" date,
	"compensation_type" "compensation_type" DEFAULT 'NOT_SPECIFIED',
	"compensation_description" text,
	"visibility" "challenge_visibility" DEFAULT 'VINUNI_ONLY',
	"confidentiality_level" varchar(80),
	"status" "challenge_status" DEFAULT 'DRAFT',
	"application_deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "challenges_duration_weeks_positive" CHECK ("challenges"."duration_weeks" IS NULL OR "challenges"."duration_weeks" > 0),
	CONSTRAINT "challenges_weekly_hours_positive" CHECK ("challenges"."weekly_hours" IS NULL OR "challenges"."weekly_hours" > 0),
	CONSTRAINT "challenges_team_size_min_positive" CHECK ("challenges"."team_size_min" IS NULL OR "challenges"."team_size_min" > 0),
	CONSTRAINT "challenges_team_size_max_positive" CHECK ("challenges"."team_size_max" IS NULL OR "challenges"."team_size_max" > 0),
	CONSTRAINT "challenges_team_size_order" CHECK ("challenges"."team_size_min" IS NULL OR "challenges"."team_size_max" IS NULL OR "challenges"."team_size_min" <= "challenges"."team_size_max")
);
--> statement-breakpoint
CREATE TABLE "agreements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"challenge_id" bigint NOT NULL,
	"application_id" bigint,
	"agreement_type" "agreement_type" NOT NULL,
	"agreement_version" varchar(80),
	"document_url" text,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "agreements_revocation_after_acceptance" CHECK ("agreements"."accepted_at" IS NULL OR "agreements"."revoked_at" IS NULL OR "agreements"."accepted_at" <= "agreements"."revoked_at")
);
--> statement-breakpoint
CREATE TABLE "application_members" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"application_id" bigint NOT NULL,
	"student_id" bigint NOT NULL,
	"member_role" "application_member_role" NOT NULL,
	"status" "application_member_status" DEFAULT 'INVITED',
	"preferred_role" varchar(255),
	"committed_hours_per_week" integer,
	"availability_confirmed" boolean,
	"invited_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "application_members_committed_hours_range" CHECK ("application_members"."committed_hours_per_week" IS NULL OR ("application_members"."committed_hours_per_week" >= 0 AND "application_members"."committed_hours_per_week" <= 168))
);
--> statement-breakpoint
CREATE TABLE "application_projects" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"application_id" bigint NOT NULL,
	"student_project_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" bigint NOT NULL,
	"submitted_by" bigint NOT NULL,
	"team_name" varchar(255),
	"motivation" text,
	"relevant_experience" text,
	"status" "application_status" DEFAULT 'SUBMITTED',
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"selection_id" bigint NOT NULL,
	"respond_by" timestamp with time zone,
	"hours_per_week" integer,
	"duration_weeks" integer,
	"start_date" date,
	"compensation_note" text,
	"nda_required" boolean DEFAULT false,
	"status" "offer_status" DEFAULT 'PENDING',
	"responded_by" bigint,
	"created_at" timestamp with time zone DEFAULT now(),
	"responded_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "offers_hours_per_week_positive" CHECK ("offers"."hours_per_week" IS NULL OR "offers"."hours_per_week" > 0),
	CONSTRAINT "offers_duration_weeks_positive" CHECK ("offers"."duration_weeks" IS NULL OR "offers"."duration_weeks" > 0)
);
--> statement-breakpoint
CREATE TABLE "selections" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"application_id" bigint NOT NULL,
	"selected_by" bigint NOT NULL,
	"selected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supervision_requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"application_id" bigint NOT NULL,
	"faculty_id" bigint NOT NULL,
	"requested_by" bigint NOT NULL,
	"status" "supervision_request_status" DEFAULT 'PENDING',
	"comments" text,
	"requested_at" timestamp with time zone,
	"respond_by" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assessment_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"assessment_id" bigint NOT NULL,
	"application_id" bigint NOT NULL,
	"application_member_id" bigint,
	"status" "assessment_attempt_status" DEFAULT 'NOT_STARTED',
	"started_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"ai_usage_declared" boolean,
	"ai_usage_description" text
);
--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"section_id" bigint NOT NULL,
	"question_type" "assessment_question_type",
	"prompt" text NOT NULL,
	"sequence" integer,
	"max_score" numeric(8, 2),
	"config" jsonb,
	CONSTRAINT "assessment_questions_sequence_non_negative" CHECK ("assessment_questions"."sequence" IS NULL OR "assessment_questions"."sequence" >= 0),
	CONSTRAINT "assessment_questions_max_score_non_negative" CHECK ("assessment_questions"."max_score" IS NULL OR "assessment_questions"."max_score" >= 0)
);
--> statement-breakpoint
CREATE TABLE "assessment_responses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"attempt_id" bigint NOT NULL,
	"question_id" bigint NOT NULL,
	"response" text,
	"response_data" jsonb,
	"attachment_url" text,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "assessment_scores" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"attempt_id" bigint NOT NULL,
	"reviewer_id" bigint NOT NULL,
	"overall_score" numeric(8, 2),
	"rubric_scores" jsonb,
	"comments" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "assessment_scores_overall_non_negative" CHECK ("assessment_scores"."overall_score" IS NULL OR "assessment_scores"."overall_score" >= 0)
);
--> statement-breakpoint
CREATE TABLE "assessment_sections" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"assessment_id" bigint NOT NULL,
	"title" varchar(255),
	"instructions" text,
	"sequence" integer,
	"time_limit_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "assessment_sections_sequence_non_negative" CHECK ("assessment_sections"."sequence" IS NULL OR "assessment_sections"."sequence" >= 0),
	CONSTRAINT "assessment_sections_time_limit_positive" CHECK ("assessment_sections"."time_limit_minutes" IS NULL OR "assessment_sections"."time_limit_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"challenge_id" bigint NOT NULL,
	"title" varchar(255),
	"instructions" text,
	"time_limit_minutes" integer,
	"ai_policy" "assessment_ai_policy",
	"scope" "assessment_scope" DEFAULT 'INDIVIDUAL' NOT NULL,
	"status" "assessment_status" DEFAULT 'DRAFT',
	"created_by" bigint,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "assessments_time_limit_positive" CHECK ("assessments"."time_limit_minutes" IS NULL OR "assessments"."time_limit_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "match_experience_details" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"match_result_id" bigint NOT NULL,
	"student_project_id" bigint NOT NULL,
	"semantic_similarity" numeric(6, 5),
	"explanation" text,
	CONSTRAINT "match_experience_details_similarity_range" CHECK ("match_experience_details"."semantic_similarity" IS NULL OR ("match_experience_details"."semantic_similarity" >= 0 AND "match_experience_details"."semantic_similarity" <= 1))
);
--> statement-breakpoint
CREATE TABLE "match_results" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"challenge_id" bigint NOT NULL,
	"student_id" bigint NOT NULL,
	"skill_score" numeric(6, 5),
	"semantic_experience_score" numeric(6, 5),
	"domain_score" numeric(6, 5),
	"eligibility_score" numeric(6, 5),
	"overall_fit_score" numeric(6, 5),
	"evidence_confidence" "evidence_confidence",
	"explanation" text,
	"model_version" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "match_results_skill_score_range" CHECK ("match_results"."skill_score" IS NULL OR ("match_results"."skill_score" >= 0 AND "match_results"."skill_score" <= 1)),
	CONSTRAINT "match_results_semantic_score_range" CHECK ("match_results"."semantic_experience_score" IS NULL OR ("match_results"."semantic_experience_score" >= 0 AND "match_results"."semantic_experience_score" <= 1)),
	CONSTRAINT "match_results_domain_score_range" CHECK ("match_results"."domain_score" IS NULL OR ("match_results"."domain_score" >= 0 AND "match_results"."domain_score" <= 1)),
	CONSTRAINT "match_results_eligibility_score_range" CHECK ("match_results"."eligibility_score" IS NULL OR ("match_results"."eligibility_score" >= 0 AND "match_results"."eligibility_score" <= 1)),
	CONSTRAINT "match_results_overall_fit_score_range" CHECK ("match_results"."overall_fit_score" IS NULL OR ("match_results"."overall_fit_score" >= 0 AND "match_results"."overall_fit_score" <= 1))
);
--> statement-breakpoint
CREATE TABLE "match_skill_details" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"match_result_id" bigint NOT NULL,
	"challenge_skill_id" bigint NOT NULL,
	"matched_student_skill_id" bigint,
	"similarity_score" numeric(6, 5),
	"match_type" "skill_match_type",
	"explanation" text,
	CONSTRAINT "match_skill_details_similarity_range" CHECK ("match_skill_details"."similarity_score" IS NULL OR ("match_skill_details"."similarity_score" >= 0 AND "match_skill_details"."similarity_score" <= 1))
);
--> statement-breakpoint
CREATE TABLE "deliverables" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"milestone_id" bigint NOT NULL,
	"submitted_by" bigint NOT NULL,
	"title" varchar(255),
	"description" text,
	"deliverable_type" "deliverable_type",
	"file_url" text,
	"external_url" text,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"milestone_id" bigint,
	"author_id" bigint NOT NULL,
	"recipient_id" bigint,
	"feedback_type" "feedback_type" DEFAULT 'GENERAL',
	"visibility" "feedback_visibility" DEFAULT 'RECIPIENT',
	"metrics" jsonb,
	"content" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "milestone_reviews" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"milestone_id" bigint NOT NULL,
	"reviewer_id" bigint NOT NULL,
	"reviewer_organization_id" bigint,
	"reviewer_role" "milestone_review_role" NOT NULL,
	"decision" "milestone_review_decision" NOT NULL,
	"comments" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"deadline" date,
	"status" "milestone_status" DEFAULT 'PENDING',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"student_id" bigint NOT NULL,
	"project_role" varchar(255),
	"joined_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_resources" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"resource_type" varchar(120),
	"storage_key" text,
	"external_url" text,
	"sensitivity_level" "resource_sensitivity" DEFAULT 'TEAM_ONLY',
	"requires_agreement" boolean DEFAULT false,
	"created_by" bigint,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"application_id" bigint NOT NULL,
	"faculty_supervisor_id" bigint,
	"status" "project_status" DEFAULT 'ACTIVE',
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "projects_date_order" CHECK ("projects"."start_date" IS NULL OR "projects"."end_date" IS NULL OR "projects"."start_date" <= "projects"."end_date")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"action" varchar(160) NOT NULL,
	"entity_type" varchar(120),
	"entity_id" bigint,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"consent_type" varchar(120),
	"granted" boolean NOT NULL,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"notification_type" varchar(120),
	"title" varchar(255),
	"message" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"read_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "faculty_profiles" ADD CONSTRAINT "faculty_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_evidence" ADD CONSTRAINT "project_evidence_project_id_student_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."student_projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_project_id_student_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."student_projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "skill_aliases" ADD CONSTRAINT "skill_aliases_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "skill_candidates" ADD CONSTRAINT "skill_candidates_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "skill_candidates" ADD CONSTRAINT "skill_candidates_suggested_skill_id_skills_id_fk" FOREIGN KEY ("suggested_skill_id") REFERENCES "public"."skills"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "skill_categories" ADD CONSTRAINT "skill_categories_parent_id_skill_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."skill_categories"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "skill_relationships" ADD CONSTRAINT "skill_relationships_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "skill_relationships" ADD CONSTRAINT "skill_relationships_related_skill_id_skills_id_fk" FOREIGN KEY ("related_skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_id_skill_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."skill_categories"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_projects" ADD CONSTRAINT "student_projects_student_id_student_profiles_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("user_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_student_id_student_profiles_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("user_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenge_eligibility_rules" ADD CONSTRAINT "challenge_eligibility_rules_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenge_faculty_assignments" ADD CONSTRAINT "challenge_faculty_assignments_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenge_faculty_assignments" ADD CONSTRAINT "challenge_faculty_assignments_faculty_id_faculty_profiles_user_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty_profiles"("user_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenge_faculty_assignments" ADD CONSTRAINT "challenge_faculty_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenge_reviews" ADD CONSTRAINT "challenge_reviews_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenge_reviews" ADD CONSTRAINT "challenge_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenge_reviews" ADD CONSTRAINT "challenge_reviews_reviewer_organization_id_organizations_id_fk" FOREIGN KEY ("reviewer_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenge_skills" ADD CONSTRAINT "challenge_skills_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenge_skills" ADD CONSTRAINT "challenge_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_owner_organization_id_organizations_id_fk" FOREIGN KEY ("owner_organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_managing_organization_id_organizations_id_fk" FOREIGN KEY ("managing_organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_contact_person_id_users_id_fk" FOREIGN KEY ("contact_person_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "application_members" ADD CONSTRAINT "application_members_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "application_members" ADD CONSTRAINT "application_members_student_id_student_profiles_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("user_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "application_projects" ADD CONSTRAINT "application_projects_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "application_projects" ADD CONSTRAINT "application_projects_student_project_id_student_projects_id_fk" FOREIGN KEY ("student_project_id") REFERENCES "public"."student_projects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_selection_id_selections_id_fk" FOREIGN KEY ("selection_id") REFERENCES "public"."selections"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "selections" ADD CONSTRAINT "selections_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "selections" ADD CONSTRAINT "selections_selected_by_users_id_fk" FOREIGN KEY ("selected_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervision_requests" ADD CONSTRAINT "supervision_requests_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervision_requests" ADD CONSTRAINT "supervision_requests_faculty_id_faculty_profiles_user_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty_profiles"("user_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervision_requests" ADD CONSTRAINT "supervision_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_application_member_id_application_members_id_fk" FOREIGN KEY ("application_member_id") REFERENCES "public"."application_members"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_section_id_assessment_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."assessment_sections"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_scores" ADD CONSTRAINT "assessment_scores_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_scores" ADD CONSTRAINT "assessment_scores_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_sections" ADD CONSTRAINT "assessment_sections_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "match_experience_details" ADD CONSTRAINT "match_experience_details_match_result_id_match_results_id_fk" FOREIGN KEY ("match_result_id") REFERENCES "public"."match_results"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "match_experience_details" ADD CONSTRAINT "match_experience_details_student_project_id_student_projects_id_fk" FOREIGN KEY ("student_project_id") REFERENCES "public"."student_projects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_student_id_student_profiles_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("user_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "match_skill_details" ADD CONSTRAINT "match_skill_details_match_result_id_match_results_id_fk" FOREIGN KEY ("match_result_id") REFERENCES "public"."match_results"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "match_skill_details" ADD CONSTRAINT "match_skill_details_challenge_skill_id_challenge_skills_id_fk" FOREIGN KEY ("challenge_skill_id") REFERENCES "public"."challenge_skills"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "match_skill_details" ADD CONSTRAINT "match_skill_details_matched_student_skill_id_student_skills_id_fk" FOREIGN KEY ("matched_student_skill_id") REFERENCES "public"."student_skills"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "milestone_reviews" ADD CONSTRAINT "milestone_reviews_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "milestone_reviews" ADD CONSTRAINT "milestone_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "milestone_reviews" ADD CONSTRAINT "milestone_reviews_reviewer_organization_id_organizations_id_fk" FOREIGN KEY ("reviewer_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_student_id_student_profiles_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("user_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_resources" ADD CONSTRAINT "project_resources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_resources" ADD CONSTRAINT "project_resources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_faculty_supervisor_id_faculty_profiles_user_id_fk" FOREIGN KEY ("faculty_supervisor_id") REFERENCES "public"."faculty_profiles"("user_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_memberships_user_org_role_unique" ON "organization_memberships" USING btree ("user_id","organization_id","role");--> statement-breakpoint
CREATE INDEX "organization_memberships_user_idx" ON "organization_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_memberships_organization_idx" ON "organization_memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_memberships_org_role_status_idx" ON "organization_memberships" USING btree ("organization_id","role","status");--> statement-breakpoint
CREATE INDEX "organizations_type_idx" ON "organizations" USING btree ("organization_type");--> statement-breakpoint
CREATE INDEX "organizations_verification_status_idx" ON "organizations" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "project_evidence_project_idx" ON "project_evidence" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_skills_project_skill_unique" ON "project_skills" USING btree ("project_id","skill_id") WHERE "project_skills"."skill_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_skills_project_raw_skill_unique" ON "project_skills" USING btree ("project_id","raw_skill_name") WHERE "project_skills"."raw_skill_name" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "project_skills_project_idx" ON "project_skills" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_skills_skill_idx" ON "project_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_aliases_skill_alias_unique" ON "skill_aliases" USING btree ("skill_id","alias");--> statement-breakpoint
CREATE INDEX "skill_aliases_alias_idx" ON "skill_aliases" USING btree ("alias");--> statement-breakpoint
CREATE INDEX "skill_candidates_status_idx" ON "skill_candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "skill_candidates_submitted_by_idx" ON "skill_candidates" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "skill_candidates_suggested_skill_idx" ON "skill_candidates" USING btree ("suggested_skill_id");--> statement-breakpoint
CREATE INDEX "skill_categories_parent_idx" ON "skill_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_relationships_pair_unique" ON "skill_relationships" USING btree ("skill_id","related_skill_id");--> statement-breakpoint
CREATE INDEX "skill_relationships_related_skill_idx" ON "skill_relationships" USING btree ("related_skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_canonical_name_unique" ON "skills" USING btree ("canonical_name");--> statement-breakpoint
CREATE INDEX "skills_category_idx" ON "skills" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "skills_status_idx" ON "skills" USING btree ("status");--> statement-breakpoint
CREATE INDEX "student_projects_student_idx" ON "student_projects" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_skills_student_skill_unique" ON "student_skills" USING btree ("student_id","skill_id") WHERE "student_skills"."skill_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "student_skills_student_raw_skill_unique" ON "student_skills" USING btree ("student_id","raw_skill_name") WHERE "student_skills"."raw_skill_name" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "student_skills_student_idx" ON "student_skills" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "student_skills_skill_idx" ON "student_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "challenge_eligibility_rules_challenge_idx" ON "challenge_eligibility_rules" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "challenge_eligibility_rules_type_idx" ON "challenge_eligibility_rules" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "challenge_faculty_assignments_challenge_idx" ON "challenge_faculty_assignments" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "challenge_faculty_assignments_faculty_idx" ON "challenge_faculty_assignments" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "challenge_faculty_assignments_status_idx" ON "challenge_faculty_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "challenge_reviews_challenge_idx" ON "challenge_reviews" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "challenge_reviews_reviewer_idx" ON "challenge_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "challenge_reviews_reviewer_organization_idx" ON "challenge_reviews" USING btree ("reviewer_organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_skills_challenge_skill_unique" ON "challenge_skills" USING btree ("challenge_id","skill_id") WHERE "challenge_skills"."skill_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_skills_challenge_raw_skill_unique" ON "challenge_skills" USING btree ("challenge_id","raw_skill_name") WHERE "challenge_skills"."raw_skill_name" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "challenge_skills_challenge_idx" ON "challenge_skills" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "challenge_skills_skill_idx" ON "challenge_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenges_public_id_unique" ON "challenges" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenges_slug_unique" ON "challenges" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "challenges_owner_organization_idx" ON "challenges" USING btree ("owner_organization_id");--> statement-breakpoint
CREATE INDEX "challenges_managing_organization_idx" ON "challenges" USING btree ("managing_organization_id");--> statement-breakpoint
CREATE INDEX "challenges_contact_person_idx" ON "challenges" USING btree ("contact_person_id");--> statement-breakpoint
CREATE INDEX "challenges_status_idx" ON "challenges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "challenges_application_deadline_idx" ON "challenges" USING btree ("application_deadline");--> statement-breakpoint
CREATE INDEX "challenges_marketplace_status_deadline_idx" ON "challenges" USING btree ("status","application_deadline");--> statement-breakpoint
CREATE INDEX "agreements_user_idx" ON "agreements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agreements_challenge_idx" ON "agreements" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "agreements_application_idx" ON "agreements" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "application_members_application_student_unique" ON "application_members" USING btree ("application_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "application_members_one_leader_per_application" ON "application_members" USING btree ("application_id") WHERE "application_members"."member_role" = 'LEADER';--> statement-breakpoint
CREATE INDEX "application_members_application_idx" ON "application_members" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "application_members_student_idx" ON "application_members" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "application_members_role_status_idx" ON "application_members" USING btree ("application_id","member_role","status");--> statement-breakpoint
CREATE UNIQUE INDEX "application_projects_application_project_unique" ON "application_projects" USING btree ("application_id","student_project_id");--> statement-breakpoint
CREATE INDEX "application_projects_application_idx" ON "application_projects" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "application_projects_student_project_idx" ON "application_projects" USING btree ("student_project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_public_id_unique" ON "applications" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "applications_challenge_idx" ON "applications" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "applications_submitted_by_idx" ON "applications" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "applications_submitted_at_idx" ON "applications" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "applications_challenge_status_idx" ON "applications" USING btree ("challenge_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_selection_unique" ON "offers" USING btree ("selection_id");--> statement-breakpoint
CREATE INDEX "offers_status_idx" ON "offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "offers_respond_by_idx" ON "offers" USING btree ("respond_by");--> statement-breakpoint
CREATE INDEX "offers_responded_by_idx" ON "offers" USING btree ("responded_by");--> statement-breakpoint
CREATE UNIQUE INDEX "selections_application_unique" ON "selections" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "selections_selected_by_idx" ON "selections" USING btree ("selected_by");--> statement-breakpoint
CREATE INDEX "supervision_requests_application_idx" ON "supervision_requests" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "supervision_requests_faculty_idx" ON "supervision_requests" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "supervision_requests_status_idx" ON "supervision_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_attempts_team_unique" ON "assessment_attempts" USING btree ("assessment_id","application_id") WHERE "assessment_attempts"."application_member_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_attempts_individual_unique" ON "assessment_attempts" USING btree ("assessment_id","application_member_id") WHERE "assessment_attempts"."application_member_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "assessment_attempts_assessment_idx" ON "assessment_attempts" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "assessment_attempts_application_idx" ON "assessment_attempts" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "assessment_attempts_application_member_idx" ON "assessment_attempts" USING btree ("application_member_id");--> statement-breakpoint
CREATE INDEX "assessment_attempts_status_idx" ON "assessment_attempts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessment_questions_section_idx" ON "assessment_questions" USING btree ("section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_questions_section_sequence_unique" ON "assessment_questions" USING btree ("section_id","sequence") WHERE "assessment_questions"."sequence" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "assessment_responses_attempt_idx" ON "assessment_responses" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "assessment_responses_question_idx" ON "assessment_responses" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "assessment_scores_attempt_idx" ON "assessment_scores" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "assessment_scores_reviewer_idx" ON "assessment_scores" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "assessment_sections_assessment_idx" ON "assessment_sections" USING btree ("assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_sections_assessment_sequence_unique" ON "assessment_sections" USING btree ("assessment_id","sequence") WHERE "assessment_sections"."sequence" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "assessments_challenge_idx" ON "assessments" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "assessments_status_idx" ON "assessments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessments_created_by_idx" ON "assessments" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "match_experience_details_result_idx" ON "match_experience_details" USING btree ("match_result_id");--> statement-breakpoint
CREATE INDEX "match_experience_details_student_project_idx" ON "match_experience_details" USING btree ("student_project_id");--> statement-breakpoint
CREATE INDEX "match_results_challenge_student_idx" ON "match_results" USING btree ("challenge_id","student_id");--> statement-breakpoint
CREATE INDEX "match_results_student_idx" ON "match_results" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "match_results_overall_fit_idx" ON "match_results" USING btree ("overall_fit_score");--> statement-breakpoint
CREATE INDEX "match_skill_details_result_idx" ON "match_skill_details" USING btree ("match_result_id");--> statement-breakpoint
CREATE INDEX "match_skill_details_challenge_skill_idx" ON "match_skill_details" USING btree ("challenge_skill_id");--> statement-breakpoint
CREATE INDEX "match_skill_details_student_skill_idx" ON "match_skill_details" USING btree ("matched_student_skill_id");--> statement-breakpoint
CREATE INDEX "deliverables_milestone_idx" ON "deliverables" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "deliverables_submitted_by_idx" ON "deliverables" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "feedback_project_idx" ON "feedback" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "feedback_milestone_idx" ON "feedback" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "feedback_author_idx" ON "feedback" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "feedback_recipient_idx" ON "feedback" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "feedback_type_visibility_idx" ON "feedback" USING btree ("feedback_type","visibility");--> statement-breakpoint
CREATE INDEX "milestone_reviews_milestone_idx" ON "milestone_reviews" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "milestone_reviews_reviewer_idx" ON "milestone_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "milestone_reviews_reviewer_role_idx" ON "milestone_reviews" USING btree ("reviewer_role");--> statement-breakpoint
CREATE INDEX "milestone_reviews_milestone_role_created_idx" ON "milestone_reviews" USING btree ("milestone_id","reviewer_role","created_at");--> statement-breakpoint
CREATE INDEX "milestones_project_idx" ON "milestones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "milestones_status_idx" ON "milestones" USING btree ("status");--> statement-breakpoint
CREATE INDEX "milestones_deadline_idx" ON "milestones" USING btree ("deadline");--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_project_student_unique" ON "project_members" USING btree ("project_id","student_id");--> statement-breakpoint
CREATE INDEX "project_members_project_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_student_idx" ON "project_members" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "project_resources_project_idx" ON "project_resources" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_resources_created_by_idx" ON "project_resources" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "project_resources_sensitivity_idx" ON "project_resources" USING btree ("sensitivity_level");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_public_id_unique" ON "projects" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_application_unique" ON "projects" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "projects_faculty_supervisor_idx" ON "projects" USING btree ("faculty_supervisor_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "consent_records_user_idx" ON "consent_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consent_records_type_idx" ON "consent_records" USING btree ("consent_type");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_created_idx" ON "notifications" USING btree ("user_id","is_read","created_at");
