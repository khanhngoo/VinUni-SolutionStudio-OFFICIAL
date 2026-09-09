CREATE TYPE "public"."course_source" AS ENUM('REGISTRAR', 'SELF');--> statement-breakpoint
CREATE TYPE "public"."day_availability" AS ENUM('FREE', 'PARTLY', 'BUSY');--> statement-breakpoint
CREATE TYPE "public"."experience_kind" AS ENUM('INTERNSHIP', 'RESEARCH', 'TEACHING', 'PART_TIME', 'VOLUNTEERING', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."student_work_mode" AS ENUM('ON_SITE', 'HYBRID', 'REMOTE');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('DATA_ML', 'BACKEND', 'FRONTEND', 'ANALYSIS', 'RESEARCH', 'DESIGN', 'DOMAIN_EXPERT', 'COORDINATION');--> statement-breakpoint
CREATE TABLE "student_courses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"code" varchar(40) NOT NULL,
	"title" varchar(255) NOT NULL,
	"term" varchar(60),
	"credits" integer,
	"grade" varchar(12),
	"source" "course_source" NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "student_courses_self_rows_have_no_grade" CHECK ("student_courses"."source" <> 'SELF' OR "student_courses"."grade" IS NULL),
	CONSTRAINT "student_courses_credits_non_negative" CHECK ("student_courses"."credits" IS NULL OR "student_courses"."credits" >= 0)
);
--> statement-breakpoint
CREATE TABLE "student_preferred_roles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"student_id" bigint NOT NULL,
	"role" "team_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "about" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "weekly_availability" jsonb;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "work_preference" "student_work_mode";--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "preferred_team_min" integer;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "preferred_team_max" integer;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "credits_earned" integer;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "transcript_url" text;--> statement-breakpoint
ALTER TABLE "student_projects" ADD COLUMN "kind" "experience_kind";--> statement-breakpoint
ALTER TABLE "student_projects" ADD COLUMN "organisation" varchar(255);--> statement-breakpoint
ALTER TABLE "student_courses" ADD CONSTRAINT "student_courses_student_id_student_profiles_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("user_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_preferred_roles" ADD CONSTRAINT "student_preferred_roles_student_id_student_profiles_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("user_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "student_courses_student_idx" ON "student_courses" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "student_courses_pinned_idx" ON "student_courses" USING btree ("student_id","pinned");--> statement-breakpoint
CREATE UNIQUE INDEX "student_courses_student_code_term_unique" ON "student_courses" USING btree ("student_id","code","term");--> statement-breakpoint
CREATE UNIQUE INDEX "student_preferred_roles_unique" ON "student_preferred_roles" USING btree ("student_id","role");--> statement-breakpoint
CREATE INDEX "student_preferred_roles_student_idx" ON "student_preferred_roles" USING btree ("student_id");--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_team_size_order" CHECK ("student_profiles"."preferred_team_min" IS NULL OR "student_profiles"."preferred_team_max" IS NULL OR "student_profiles"."preferred_team_min" <= "student_profiles"."preferred_team_max");--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_team_size_positive" CHECK ("student_profiles"."preferred_team_min" IS NULL OR "student_profiles"."preferred_team_min" > 0);--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_credits_non_negative" CHECK ("student_profiles"."credits_earned" IS NULL OR "student_profiles"."credits_earned" >= 0);