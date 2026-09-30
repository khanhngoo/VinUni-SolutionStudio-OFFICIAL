# VinUni Solutions Studio

VinUni Solutions Studio is a database-backed challenge marketplace and project
workflow for students, faculty, partner organizations, and VinUni internal
units. The current demo supports challenge discovery, applications, team
invitations, assessments, offers, project workspaces, partner operations,
faculty supervision, and internal challenge review.

The application uses Next.js, TypeScript, Drizzle ORM, PostgreSQL with
pgvector, and Docker Compose. Phase 7 semantic matching remains deferred. The
current `main`/`preDemo` branch does not include the separate global `/admin`
console work.

## Prerequisites

- Docker Desktop or OrbStack with Docker Compose available.
- Node.js 20 or newer for host-run tooling.
- Corepack, which is included with supported Node.js installations.

The repository and development Docker image use pnpm 10. Activate it once on
each development machine so normal commands can remain `pnpm ...`:

```bash
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm --version
```

The final command should print a `10.x` version. Do not use pnpm 11 with the
current lockfile and override configuration.

## Local environment

Create `.env` only when it does not already exist:

```bash
cp .env.example .env
```

For the local Docker database, configure at least:

```dotenv
DATABASE_URL=postgresql://vinuni:vinuni_dev@localhost:5432/solution_studio
AUTH_SECRET=replace-with-a-long-random-secret
AUTH_SELF_SERVICE_ENABLED=true
AUTH_DEV_PERSONAS_ENABLED=true
```

Generate a suitable authentication secret with `openssl rand -base64 32` and
paste it into `.env`. Remove or comment out placeholder Microsoft Entra and
Google values unless real provider credentials are available.

Authentication modes are independent:

- Development identities appear automatically while `NODE_ENV` is not
  `production`. They are the easiest way to test seeded roles locally.
- `AUTH_SELF_SERVICE_ENABLED=true` enables internal-demo email/password signup
  and sign-in. With `AUTH_DEV_PERSONAS_ENABLED=true` in a non-production
  environment, signup can create a student or faculty profile, or a scoped
  membership in a server-approved development organization. Without that
  second gate, new accounts remain unprivileged.
- `AUTH_DEMO_PASSWORD` enables the shared prepared Jordan student login when
  its value is at least 24 characters.
- Google sign-in appears only when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`
  are configured. Google must return a verified email matching an existing,
  active Solutions Studio user; it does not create accounts.
- Microsoft Entra sign-in appears only when all three Entra variables are
  configured.

Never commit `.env` or real provider/database secrets.

## First-time local setup

Start Docker Desktop or OrbStack, then run:

```bash
pnpm install --frozen-lockfile
pnpm app:up
pnpm app:migrate
pnpm app:seed
pnpm db:check
curl -f http://localhost:3000/api/health
```

Expected health response:

```json
{"status":"ok"}
```

Open [http://localhost:3000](http://localhost:3000). To watch the development
server:

```bash
pnpm app:logs
```

Press `Ctrl-C` to stop following logs; it does not stop the containers.

`pnpm app:up` builds and starts both the app and its PostgreSQL dependency.
`pnpm app:migrate` applies version-controlled migrations. `pnpm app:seed` is a
guarded, idempotent development seed and is required for the seeded test
personas and scenarios.

## Routine startup after pulling

When dependencies have not changed:

```bash
pnpm app:up
pnpm app:migrate
pnpm db:check
```

Then open [http://localhost:3000](http://localhost:3000). Migration is safe to
run after a pull and becomes a no-op when no migration is pending. Do not reset
or reseed the database during routine startup.

When `package.json` or `pnpm-lock.yaml` changed:

```bash
pnpm install --frozen-lockfile
pnpm app:up
pnpm app:install
pnpm app:restart
pnpm app:migrate
pnpm db:check
```

If the app exits before `pnpm app:install` can execute, refresh the named
dependency volume with a one-off container and then start normally:

```bash
pnpm app:build
docker compose --profile app run --rm --no-deps app pnpm install --frozen-lockfile
pnpm app:up
pnpm app:migrate
```

## Container lifecycle

```bash
pnpm app:logs       # Follow Next.js logs
pnpm app:stop       # Stop only the app; leave PostgreSQL running
pnpm app:start      # Resume the stopped app container
pnpm app:restart    # Restart the app container
pnpm app:down       # Remove app + db containers/network; preserve named volumes
pnpm app:up         # Recreate/start app + db from preserved volumes
```

Database-only commands:

```bash
pnpm db:up                  # Start only PostgreSQL
pnpm db:check               # Verify the configured database connection
pnpm db:logs                # Follow PostgreSQL logs
docker compose stop db      # Stop PostgreSQL without removing it
docker compose start db     # Resume PostgreSQL
pnpm db:down                # Remove containers/network; preserve named volumes
```

## Host app with Docker PostgreSQL

Use this alternative when Next.js should run on the host while PostgreSQL stays
in Docker:

```bash
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
ALLOW_DB_SEED=true pnpm db:seed
pnpm db:check
pnpm dev
```

On later starts, omit the seed command:

```bash
pnpm db:up
pnpm db:migrate
pnpm db:check
pnpm dev
```

## Restoring canonical demo data

Use a reset only when local changes should be discarded and the canonical demo
state restored:

```bash
pnpm db:reset
pnpm db:check
pnpm app:up
```

`pnpm db:reset` is destructive and local-development only. It deletes the
local PostgreSQL and container dependency volumes, recreates PostgreSQL,
applies migrations, and loads the canonical seed. Never use
`docker compose down -v` as part of routine startup, and never run reset or
development seed commands against staging or production.

## Product test guide

Start from `/sign-in`. Local development exposes the following one-click
seeded identities:

| Identity | Role and primary coverage |
| --- | --- |
| `JORDAN_STUDENT_DEMO` | Main student journey: profile, applications, inbox, assessments, pending offer, and three project lifecycle states. |
| `PRIYA_STUDENT_DEMO` | Student team-member visibility and leader-only action restrictions. |
| `BAO_STUDENT_DEMO` | Student leader for the partner-approval project scenario. |
| `HOANG_STUDENT_DEMO` | Student membership across internal and partner projects. |
| `FACULTY_PHAM_DEMO` | Faculty assignments, supervision request, and supervised workspaces. |
| `BENCANG_CONTACT_DEMO` | External partner challenges, applicant pipeline, students, and projects. |
| `CAID_ADMIN_DEMO` | CAID internal-unit challenge review and managed workspace scope. |
| `ELAB_ADMIN_DEMO` | E-Lab internal-unit scope and isolation from CAID-managed records. |

Sign out before changing persona so one session does not invalidate another
test.

### 1. Anonymous marketplace

1. Sign out and open `/challenges`.
2. Confirm `route-optimisation` is visible as the canonical
   `PUBLIC_PREVIEW` challenge.
3. Confirm VinUni-only and private challenges are not exposed.
4. Open the route-optimisation detail page.
5. Attempt a protected route such as `/applications`; it should redirect to
   `/sign-in`.

### 2. Self-service authentication

This flow requires `AUTH_SELF_SERVICE_ENABLED=true`.

1. Open `/sign-in` while signed out.
2. Create a new email/password account.
3. Confirm automatic sign-in succeeds.
4. With the development persona gate enabled, choose a role and confirm its
   first-use destination and scoped navigation. Without it, confirm the basic
   account sees an account-setup message and only public marketplace access.
5. Sign out and sign back in with the new credentials.

Development persona choices are unavailable in production even if the flag is
set. Partner choices are limited to the three approved seeded external partners;
CAID and E-Lab choices map only to their respective internal organizations.

### 3. Student journey

Sign in as `JORDAN_STUDENT_DEMO`.

1. Open `/profile`, edit the profile, save, and confirm the updated values.
2. Open `/challenges`; the established VinUni-visible marketplace should be
   available in addition to public preview content.
3. Open `/applications` and inspect the seeded lifecycle examples:
   - triage review: rejected after a reviewed assessment;
   - merchant churn: reviewed passing assessment;
   - route optimisation: selected with a pending offer;
   - outreach: submitted with a pending supervision request;
   - supply chain: active project;
   - campus energy: final review;
   - archive digitisation: completed project.
4. Open `/inbox`. Confirm application, assessment, and offer events are grouped
   into items needing attention and recent updates. Team-member personas such
   as Priya provide invitation-history coverage; Studio notices appear only
   when notification rows exist.
5. Open `/workspace`. Confirm invitations are no longer duplicated there and
   the page focuses on accepted work/projects.
6. Open the route-optimisation offer. Confirm the accepted team leader sees
   the response controls.
7. Inspect the supply-chain, energy, and archive workspaces to compare ACTIVE,
   FINAL_REVIEW, and COMPLETED behavior.

Offer responses, profile edits, invitation decisions, assessment submissions,
and application creation write to the local database. Run `pnpm db:reset`
after testing if the canonical fixture state is needed again.

### 4. Team-member authorization

Sign in as `PRIYA_STUDENT_DEMO`.

1. Open `/inbox` and inspect team invitation/history entries.
2. Open `/applications` and confirm only applications related to Priya are
   available.
3. Open the route-optimisation offer and confirm Priya can read the team offer
   but cannot accept or decline it because she is not the team leader.
4. Confirm unrelated applications and workspaces return a clean denial/404.

### 5. Faculty workflow

Sign in as `FACULTY_PHAM_DEMO`.

1. Open `/faculty` and verify challenge assignments, the outreach supervision
   request, supervision capacity, and supervised projects.
2. Open the outreach request detail and confirm it is presented as a pending
   supervision relationship.
3. Open an existing supervised project; it should use the authoritative
   project workspace.
4. Open `/faculty/profile`, edit the profile, and confirm persistence.
5. Confirm partner and internal-review routes are unavailable to this persona.

### 6. External partner workflow

Sign in as `BENCANG_CONTACT_DEMO`.

1. Open `/partner` and inspect Bến Cảng-owned challenges and the applicant
   pipeline.
2. Open route optimisation and inspect its teams/applications.
3. Open `/partner/students` and confirm only policy-authorized student data is
   shown.
4. Open `/partner/projects` and inspect Bến Cảng-owned project work and its
   approval state.
5. Open `/partner/profile`, edit the organization-member profile, and confirm
   persistence.
6. Optionally use `/partner/post` to exercise challenge creation. This mutates
   local demo data; reset afterward if required.
7. Open `/challenges` and confirm the ordinary marketplace remains
   `PUBLIC_PREVIEW` only for an external partner.

### 7. VinUni internal-unit review

Sign in as `CAID_ADMIN_DEMO`.

1. Open `/review` and inspect CAID-managed challenge lifecycle queues.
2. Open a managed challenge and exercise only the actions appropriate to its
   current state.
3. Confirm CAID can access CAID-managed workspace context.

Then sign out and use `ELAB_ADMIN_DEMO`:

1. Open `/review` and confirm E-Lab sees its own scoped challenge context.
2. Confirm E-Lab cannot access unrelated CAID-managed records.

Organization `ADMIN` is scoped to that organization. The current branch does
not provide a global administration console.

## Validate the September 26 update

The latest 11-commit batch can be checked as follows:

| Change | Validation |
| --- | --- |
| Shared nullable date formatting | Browse application, faculty, partner, and review pages; valid dates should be formatted consistently and absent dates should not render invalid values. |
| Student inbox | Use Jordan and Priya to inspect `/inbox`; verify invitations and updates no longer appear as a duplicate section in `/workspace`. |
| Local Poppins fonts | Load the site with browser dev tools open and confirm typography loads without a request to Google Fonts. |
| Database readiness endpoint | Run `curl -f http://localhost:3000/api/health` and expect `{"status":"ok"}`. |
| Verified Google sign-in | Configure real Google credentials, use an existing active user's verified email, and confirm sign-in. An unknown or unverified email must be rejected. Skip this check without provider credentials. |
| Separate migration connection | Local `pnpm db:migrate` should fall back to `DATABASE_URL`. Managed deployment migrations use `MIGRATION_DATABASE_URL`; do not test this against an unapproved database. |
| Google security boundary documentation | Review `docs/security/authentication-architecture.md` and `docs/security/security-baseline.md`. |
| Prepared student demo login | Set a unique `AUTH_DEMO_PASSWORD` of at least 24 characters, run `pnpm app:up` so Compose recreates the container with the changed environment, and confirm a wrong password fails while the correct password signs in as Jordan. |
| Guarded public-demo provisioning | Review `scripts/provision-public-demo.ts`; do not run it against the local database or an existing managed database. It is a one-time approved Supabase operation. |
| Dependency security update | Run `pnpm list next` and confirm Next.js `16.3.6`; `pnpm why nanoid` should include patched `3.3.18`. |
| Public-demo launch documentation | Follow `docs/deployment/public-demo-launch.md` only for the approved Supabase/Vercel demo environment. |

## Development checks

With PostgreSQL running and migrated:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm exec drizzle-kit check
pnpm db:check
pnpm build
git diff --check
```

Focused runtime verifiers can be run with environment loading enabled:

```bash
pnpm exec tsx -r dotenv/config scripts/verify-auth-architecture.ts
pnpm exec tsx -r dotenv/config scripts/verify-authorization.ts
pnpm exec tsx -r dotenv/config scripts/verify-role-model.ts
pnpm exec tsx -r dotenv/config scripts/verify-application-runtime.ts
pnpm exec tsx -r dotenv/config scripts/verify-assessment-runtime.ts
pnpm exec tsx -r dotenv/config scripts/verify-offer-runtime.ts
pnpm exec tsx -r dotenv/config scripts/verify-workspace-runtime.ts
pnpm exec tsx -r dotenv/config scripts/verify-faculty-runtime.ts
pnpm exec tsx -r dotenv/config scripts/verify-partner-runtime.ts
```

## Troubleshooting

### Docker is unavailable

Start Docker Desktop or OrbStack, then verify:

```bash
docker compose ps
```

### Repeated reloads or a stale Turbopack route error

Stop the app, remove only the generated Next.js cache, and start it again:

```bash
pnpm app:stop
rm -rf .next
pnpm app:start
```

Use `pnpm app:up` instead of `app:start` if the container was removed rather
than stopped.

### Database errors after pulling

```bash
pnpm app:migrate
pnpm db:check
pnpm app:restart
```

### Inspect logs

```bash
pnpm app:logs
pnpm db:logs
```

## Deployment

The Dockerfile in this repository is for local development and runs
`next dev`; it is not a hardened production image. Public-demo deployment,
Supabase connection modes, one-time provisioning, environment variables,
verification, and recovery are documented in
[`docs/deployment/public-demo-launch.md`](docs/deployment/public-demo-launch.md).

Do not run `pnpm db:seed`, `pnpm db:reset`, or
`pnpm db:provision-public-demo` as a routine deployment command.

## Architecture references

- [`PRODUCTION_TRANSFORMATION_PLAN.md`](PRODUCTION_TRANSFORMATION_PLAN.md)
- [`docs/database/README.md`](docs/database/README.md)
- [`docs/database/demo-seed-manifest.md`](docs/database/demo-seed-manifest.md)
- [`docs/security/authentication-architecture.md`](docs/security/authentication-architecture.md)
- [`docs/security/authorization-matrix.md`](docs/security/authorization-matrix.md)
- [`docs/security/role-model.md`](docs/security/role-model.md)
