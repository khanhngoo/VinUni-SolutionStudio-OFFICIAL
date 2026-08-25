CREATE TYPE "public"."meeting_kind" AS ENUM('KICKOFF', 'WEEKLY_SYNC', 'SUPERVISOR_ONE_ON_ONE', 'MILESTONE_REVIEW', 'FINAL_PRESENTATION');--> statement-breakpoint
CREATE TABLE "meeting_attendees" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"meeting_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"attendee_role" varchar(120),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"project_id" bigint NOT NULL,
	"milestone_id" bigint,
	"title" varchar(255) NOT NULL,
	"kind" "meeting_kind" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer,
	"join_url" text,
	"external_provider" varchar(80),
	"external_provider_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "meetings_duration_positive" CHECK ("meetings"."duration_minutes" IS NULL OR "meetings"."duration_minutes" > 0)
);
--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_attendees_meeting_user_unique" ON "meeting_attendees" USING btree ("meeting_id","user_id");--> statement-breakpoint
CREATE INDEX "meeting_attendees_user_idx" ON "meeting_attendees" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meetings_public_id_unique" ON "meetings" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "meetings_project_idx" ON "meetings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "meetings_milestone_idx" ON "meetings" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "meetings_starts_at_idx" ON "meetings" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "meetings_project_starts_at_idx" ON "meetings" USING btree ("project_id","starts_at");