import "dotenv/config";

import { sql } from "drizzle-orm";

import { seedDemoApplications } from "../src/db/seed/applications";
import { seedDemoAssessments } from "../src/db/seed/assessments";
import { seedBootstrap } from "../src/db/seed/bootstrap";
import { seedDemoChallenges } from "../src/db/seed/challenges";
import { SeedContext } from "../src/db/seed/context";
import { seedDemo } from "../src/db/seed/demo";
import { seedDemoSelectionsOffersAgreements } from "../src/db/seed/offers";
import { seedDemoMeetings } from "../src/db/seed/meetings";
import { seedDemoProjects } from "../src/db/seed/projects";
import { seedReference } from "../src/db/seed/reference";
import { seedDemoStudentProfileDetails } from "../src/db/seed/student-profiles";

function validateTarget() {
  const projectRef = process.env.PUBLIC_DEMO_PROJECT_REF;
  const databaseUrl = process.env.DATABASE_URL;

  if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef)) {
    throw new Error("PUBLIC_DEMO_PROJECT_REF must be a Supabase project reference.");
  }
  if (process.env.ALLOW_PUBLIC_DEMO_PROVISION !== projectRef) {
    throw new Error("Set ALLOW_PUBLIC_DEMO_PROVISION to the project reference for this one-time operation.");
  }
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const parsed = new URL(databaseUrl);
  const hostname = parsed.hostname.toLowerCase();
  const username = decodeURIComponent(parsed.username).toLowerCase();
  const direct = hostname === `db.${projectRef}.supabase.co` && username === "postgres";
  const pooled = hostname.endsWith(".pooler.supabase.com") && username === `postgres.${projectRef}`;

  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    parsed.pathname !== "/postgres" ||
    (!direct && !pooled)
  ) {
    throw new Error("DATABASE_URL must target the confirmed Supabase project and postgres database.");
  }

  return projectRef;
}

async function main() {
  const projectRef = validateTarget();
  const { db } = await import("../src/db");

  const summary = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(20260926)`);

    // This is a one-time public DEMO bootstrap, never a routine production
    // seed. Refuse any project with application data already in public tables.
    await tx.execute(sql`
      DO $$
      DECLARE
        app_table text;
        has_rows boolean;
      BEGIN
        FOR app_table IN
          SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        LOOP
          EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', app_table)
            INTO has_rows;
          IF has_rows THEN
            RAISE EXCEPTION 'Public demo provisioning requires empty public tables; % contains rows', app_table;
          END IF;
        END LOOP;
      END $$;
    `);

    const ctx = new SeedContext(tx);
    await seedBootstrap(ctx);
    await seedReference(ctx);
    await seedDemo(ctx);
    await seedDemoStudentProfileDetails(ctx);
    await seedDemoChallenges(ctx);
    await seedDemoApplications(ctx);
    await seedDemoAssessments(ctx);
    await seedDemoSelectionsOffersAgreements(ctx);
    await seedDemoProjects(ctx);
    await seedDemoMeetings(ctx);
    return ctx.summary();
  });

  console.log(`Provisioned synthetic public demo data in Supabase project ${projectRef}.`);
  for (const row of summary) console.log(`${row.section}: ${row.label}: ${row.count}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
