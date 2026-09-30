ALTER TABLE "assessment_scores" DROP CONSTRAINT "assessment_scores_overall_non_negative";--> statement-breakpoint
DROP INDEX "assessment_responses_attempt_idx";--> statement-breakpoint
DROP INDEX "assessment_scores_attempt_idx";--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "passing_score" numeric(5, 2);--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_responses_attempt_question_unique" ON "assessment_responses" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_scores_attempt_unique" ON "assessment_scores" USING btree ("attempt_id");--> statement-breakpoint
ALTER TABLE "assessment_scores" ADD CONSTRAINT "assessment_scores_overall_range" CHECK ("assessment_scores"."overall_score" IS NULL OR ("assessment_scores"."overall_score" >= 0 AND "assessment_scores"."overall_score" <= 100));--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_passing_score_range" CHECK ("assessments"."passing_score" IS NULL OR ("assessments"."passing_score" >= 0 AND "assessments"."passing_score" <= 100));