CREATE TABLE "challenge_candidate_access" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"challenge_id" bigint NOT NULL,
	"student_id" bigint NOT NULL,
	"granted_by" bigint NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_by" bigint,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "challenge_candidate_access_expiry_after_grant" CHECK ("challenge_candidate_access"."expires_at" > "challenge_candidate_access"."granted_at"),
	CONSTRAINT "challenge_candidate_access_revocation_pair" CHECK (("challenge_candidate_access"."revoked_at" IS NULL) = ("challenge_candidate_access"."revoked_by" IS NULL)),
	CONSTRAINT "challenge_candidate_access_revoked_after_grant" CHECK ("challenge_candidate_access"."revoked_at" IS NULL OR "challenge_candidate_access"."revoked_at" >= "challenge_candidate_access"."granted_at")
);
--> statement-breakpoint
ALTER TABLE "challenge_candidate_access" ADD CONSTRAINT "challenge_candidate_access_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenge_candidate_access" ADD CONSTRAINT "challenge_candidate_access_student_id_student_profiles_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("user_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenge_candidate_access" ADD CONSTRAINT "challenge_candidate_access_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenge_candidate_access" ADD CONSTRAINT "challenge_candidate_access_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "challenge_candidate_access_challenge_student_idx" ON "challenge_candidate_access" USING btree ("challenge_id","student_id");--> statement-breakpoint
CREATE INDEX "challenge_candidate_access_student_expiry_idx" ON "challenge_candidate_access" USING btree ("student_id","expires_at");--> statement-breakpoint
CREATE INDEX "challenge_candidate_access_granted_by_idx" ON "challenge_candidate_access" USING btree ("granted_by");--> statement-breakpoint
CREATE INDEX "challenge_candidate_access_revoked_by_idx" ON "challenge_candidate_access" USING btree ("revoked_by");