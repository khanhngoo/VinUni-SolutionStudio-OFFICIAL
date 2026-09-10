CREATE TYPE "public"."platform_role" AS ENUM('PLATFORM_OWNER');--> statement-breakpoint
CREATE TYPE "public"."platform_role_status" AS ENUM('ACTIVE', 'REVOKED');--> statement-breakpoint
CREATE TABLE "user_platform_roles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"role" "platform_role" NOT NULL,
	"status" "platform_role_status" DEFAULT 'ACTIVE' NOT NULL,
	"granted_by" bigint,
	"granted_at" timestamp with time zone,
	"revoked_by" bigint,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_platform_roles" ADD CONSTRAINT "user_platform_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_platform_roles" ADD CONSTRAINT "user_platform_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_platform_roles" ADD CONSTRAINT "user_platform_roles_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "user_platform_roles_user_role_unique" ON "user_platform_roles" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "user_platform_roles_role_status_idx" ON "user_platform_roles" USING btree ("role","status");