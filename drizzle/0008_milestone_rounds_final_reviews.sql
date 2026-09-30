CREATE TABLE "milestone_submissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"milestone_id" bigint NOT NULL,
	"round_number" integer NOT NULL,
	"submitted_by" bigint NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "milestone_submissions_round_positive" CHECK ("milestone_submissions"."round_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "project_final_reviews" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"round_number" integer NOT NULL,
	"reviewer_id" bigint NOT NULL,
	"reviewer_organization_id" bigint,
	"reviewer_role" "milestone_review_role" NOT NULL,
	"decision" "milestone_review_decision" NOT NULL,
	"comments" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "project_final_reviews_round_positive" CHECK ("project_final_reviews"."round_number" > 0)
);
--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "submission_id" bigint;--> statement-breakpoint
ALTER TABLE "milestone_reviews" ADD COLUMN "submission_id" bigint;--> statement-breakpoint
-- Reviewed backfill: pre-existing deliverables and reviews become round 1 of
-- their milestone. A review whose milestone has no deliverable cannot be
-- attributed to a submission; SET NOT NULL below then fails the migration
-- instead of inventing a submitter.
INSERT INTO "milestone_submissions" ("milestone_id", "round_number", "submitted_by", "submitted_at", "created_at")
SELECT DISTINCT ON (d."milestone_id") d."milestone_id", 1, d."submitted_by", COALESCE(d."submitted_at", now()), COALESCE(d."submitted_at", now())
FROM "deliverables" d
ORDER BY d."milestone_id", d."submitted_at" NULLS LAST, d."id";--> statement-breakpoint
UPDATE "deliverables" d SET "submission_id" = s."id" FROM "milestone_submissions" s WHERE s."milestone_id" = d."milestone_id" AND s."round_number" = 1;--> statement-breakpoint
UPDATE "milestone_reviews" r SET "submission_id" = s."id" FROM "milestone_submissions" s WHERE s."milestone_id" = r."milestone_id" AND s."round_number" = 1;--> statement-breakpoint
ALTER TABLE "deliverables" ALTER COLUMN "submission_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "milestone_reviews" ALTER COLUMN "submission_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "milestone_submissions" ADD CONSTRAINT "milestone_submissions_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "milestone_submissions" ADD CONSTRAINT "milestone_submissions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_final_reviews" ADD CONSTRAINT "project_final_reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_final_reviews" ADD CONSTRAINT "project_final_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_final_reviews" ADD CONSTRAINT "project_final_reviews_reviewer_organization_id_organizations_id_fk" FOREIGN KEY ("reviewer_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "milestone_submissions_milestone_round_unique" ON "milestone_submissions" USING btree ("milestone_id","round_number");--> statement-breakpoint
CREATE INDEX "milestone_submissions_submitted_by_idx" ON "milestone_submissions" USING btree ("submitted_by");--> statement-breakpoint
CREATE UNIQUE INDEX "project_final_reviews_project_round_role_unique" ON "project_final_reviews" USING btree ("project_id","round_number","reviewer_role");--> statement-breakpoint
CREATE INDEX "project_final_reviews_reviewer_idx" ON "project_final_reviews" USING btree ("reviewer_id");--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_submission_id_milestone_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."milestone_submissions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "milestone_reviews" ADD CONSTRAINT "milestone_reviews_submission_id_milestone_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."milestone_submissions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "deliverables_submission_idx" ON "deliverables" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "milestone_reviews_submission_role_unique" ON "milestone_reviews" USING btree ("submission_id","reviewer_role");