# Public demo launch runbook

This launch exposes the existing marketplace and role-specific workflows with
synthetic demo records. Phase 7 matching stays at demo scope. Real student,
faculty, or partner data must not be placed in this shared demo database.

## Platform targets

- Supabase project: `vinuni-solution-studio` (`qnrjvzvmotxmbkriffxw`),
  Singapore (`ap-southeast-1`), PostgreSQL 17.
- Vercel project: `khanhngoos-projects/vinuni-solution-studio`.
- Public URL: the Vercel production domain after deployment.

## Before deployment

1. Turn off **Enable Data API** in Supabase Integrations → Data API. The app
   connects to PostgreSQL only through its Next.js server boundary. Verify
   the API is unavailable before loading demo data.
2. Obtain Supabase's **Session pooler** URI from the project's Connect dialog.
   Put it in the git-ignored `.env.deploy.local` as
   `MIGRATION_DATABASE_URL`. Use port 5432, database `postgres`, and TLS.
   Do not commit or print the connection string.
3. Derive `DATABASE_URL` from the same pooler host and credentials using
   **Transaction pooler** port 6543. Set this value as a sensitive Vercel
   Production environment variable. Keep it in `.env.deploy.local` only while
   running the one-time provisioner, then remove the local file.
4. The Vercel Production environment needs `AUTH_SECRET`,
   `AUTH_DEMO_PASSWORD`, and `AUTH_SELF_SERVICE_ENABLED=false`. No public
   self-registration is enabled. Google and Entra sign-in remain optional
   until their real provider credentials and existing-user mapping are ready.

## Database setup

1. Run `pnpm exec drizzle-kit check` and review version-controlled SQL in
   `drizzle/`. Never use `drizzle-kit push` against this project.
2. Run `pnpm db:migrate` with `MIGRATION_DATABASE_URL` set to the Session
   pooler URI. Confirm all six migrations appear in Drizzle's migration table.
3. Run `pnpm db:provision-public-demo` once, with `DATABASE_URL` set to the
   Transaction pooler URI and both `PUBLIC_DEMO_PROJECT_REF` and
   `ALLOW_PUBLIC_DEMO_PROVISION` set to `qnrjvzvmotxmbkriffxw`. The command
   refuses a different project or any existing data in public tables and
   inserts the reviewed synthetic fixtures in a transaction.
4. Check the seeded demo student, challenge, application, and project counts.
   Run Supabase security and performance advisors; resolve relevant findings.

## Release verification

1. Build and lint the exact Git commit being deployed. Check the production
   dependency audit.
2. Deploy to Vercel. Confirm `/api/health` returns 200, marketplace pages
   load, sign-in succeeds with the prepared student password, and the student
   profile, inbox, applications, and workspace are navigable.
3. Confirm anonymous users cannot access student, faculty, partner, or review
   data. Test a wrong demo password and sign-out. Check browser console,
   Vercel runtime logs, and Supabase advisors after the live checks.
4. Connect the GitHub repository only after the live deployment's environment
   variables and database are verified, then verify a later push deploys.

## Recovery

Use Vercel's previous deployment to roll back an application-only failure.
For a demo-database failure, create a fresh Supabase project, apply the same
version-controlled migrations, provision only the synthetic demo fixtures,
update Vercel's database URL, and redeploy. Shared demo interactions are not
durable user data. A later real-user launch needs separate staging, backups,
restore drills, privacy review, account onboarding, and production matching
design before this recovery approach is appropriate.
