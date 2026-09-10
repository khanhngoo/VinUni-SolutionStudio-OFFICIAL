# VinUni Solution Studio

VinUni Solution Studio is a workflow platform connecting VinUniversity
students and faculty with external partners and internal units such as CAID and
E-Lab. The application supports database-backed challenge discovery,
applications, assessments, offers, project workspaces, partner and faculty
operations, internal-unit review, and global platform-owner oversight.

This repository is currently configured for local development and private
internal-demo use. It is being transformed incrementally toward production;
see [PRODUCTION_TRANSFORMATION_PLAN.md](PRODUCTION_TRANSFORMATION_PLAN.md) for
phase status and scope. Phase 7 matching is deferred and must not be treated as
a production-ready ranking system.

## Technology

- Next.js 16 and React 19
- TypeScript
- Auth.js
- Drizzle ORM and Drizzle Kit
- PostgreSQL 18 with pgvector
- Docker Compose / OrbStack
- pnpm

## Recommended local workflow

The recommended workflow runs both the application and PostgreSQL in Docker
Compose. The source repository is bind-mounted for hot reload, while container
dependencies live in a separate `app_node_modules` volume.

After startup, open [http://localhost:3000](http://localhost:3000).

### Prerequisites

- Docker Desktop, OrbStack, or another Docker Compose-compatible runtime
- Node.js and pnpm available on the host
- A local `.env` file created from `.env.example`

## Environment setup

Create the local environment file once:

```bash
cp .env.example .env
```

For the repository's default local database container, set the host-facing
database URL in `.env`:

```dotenv
DATABASE_URL=postgresql://vinuni:vinuni_dev@localhost:5432/solution_studio
AUTH_SECRET=replace-with-a-long-random-secret
```

The Compose `app` service overrides `DATABASE_URL` internally so it connects to
PostgreSQL at `db:5432`. Do not change the host value to `db:5432`.

For private-demo email/password signup and sign-in, also set:

```dotenv
AUTH_SELF_SERVICE_ENABLED=true
```

Self-service signup creates an ACTIVE base account only. It does not grant a
student/faculty profile, organization membership, or platform-owner authority.
This authentication path currently has no email verification or password
recovery and must not be exposed as unrestricted public registration.

## Command flows

### 1. First setup on a new device or empty database

Run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm app:up
pnpm app:migrate
pnpm app:seed
pnpm db:check
```

Optionally follow the application logs:

```bash
pnpm app:logs
```

Press `Ctrl-C` to stop following logs. This does not stop the containers.

What these commands do:

- `app:up` builds and starts the app and its database dependency.
- `app:migrate` applies every unapplied migration under `drizzle/`.
- `app:seed` inserts the deterministic development/demo dataset.
- `db:check` confirms that the configured PostgreSQL database is reachable.

Run `app:seed` for an empty database or after an intentional reset. It is not a
routine startup command.

### 2. Routine restart after `pnpm app:down`

Named volumes preserve the database, so normally only run:

```bash
pnpm app:up
```

You do not need to migrate or seed merely because the containers were removed
and recreated.

### 3. Temporarily stopped only the application

If you previously ran `pnpm app:stop`, PostgreSQL remains running. Resume the
same app container with:

```bash
pnpm app:start
```

### 4. After pulling repository updates

Use this safe routine after `git pull`:

```bash
pnpm install --frozen-lockfile
pnpm app:up
pnpm app:migrate
pnpm db:check
```

`app:migrate` is safe to rerun; Drizzle skips migrations already recorded in
the database.

If `package.json` or `pnpm-lock.yaml` changed dependencies, refresh the
container dependency volume and restart the development server:

```bash
pnpm app:install
pnpm app:restart
```

If `package.json` changed only by adding or editing a script and the lockfile
did not change, `app:install` is normally unnecessary.

Do not run `app:seed` after every pull. Run it only when the updated seed is
explicitly required or when working with a new/empty database.

### 5. After receiving new Drizzle migrations

When new files appear under `drizzle/`, start the containers and apply them:

```bash
pnpm app:up
pnpm app:migrate
pnpm db:check
```

Migration `0005_self_service_credentials.sql` provides self-service credential
storage. Migration `0006_platform_owner_roles.sql` provides database-backed
global platform-owner assignments.

No seed is required merely because a migration was added.

### 6. Enable self-service authentication

Set the feature flag before creating the app container:

```dotenv
AUTH_SELF_SERVICE_ENABLED=true
```

If the app is already running when `.env` changes, recreate it so Compose loads
the new environment:

```bash
pnpm app:down
pnpm app:up
pnpm app:migrate
```

Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in) and create
an account. Seeding is not required for self-service registration.

### 7. Grant the first global platform owner

First create the target account through self-service signup or another
approved identity-provisioning path. Then run this command from the repository
root, replacing the email with the exact registered address:

```bash
ALLOW_PLATFORM_OWNER_BOOTSTRAP=true \
pnpm admin:grant-owner --email owner@example.com
```

Do not add an extra `--` before `--email`; with the repository's current pnpm
version that separator is passed to the script and rejected.

The command:

- never creates an account;
- requires an existing ACTIVE user;
- never accepts or displays a password;
- writes the platform-owner assignment and audit event atomically;
- refuses unsafe or ambiguous owner changes.

After a successful grant, sign out, sign in again, and open
[http://localhost:3000/admin](http://localhost:3000/admin).

If an ACTIVE platform owner already exists and a second recovery owner is
intended, make that choice explicit:

```bash
ALLOW_PLATFORM_OWNER_BOOTSTRAP=true \
pnpm admin:grant-owner --email second-owner@example.com --allow-additional-owner
```

If commands are being run only inside the app container, the equivalent is:

```bash
docker compose exec \
  -e ALLOW_PLATFORM_OWNER_BOOTSTRAP=true \
  app pnpm admin:grant-owner --email owner@example.com
```

`ALLOW_PLATFORM_OWNER_BOOTSTRAP` is a one-command safety confirmation and does
not need to be stored permanently in `.env`.

### 8. Stop or shut down the application

Choose the lifecycle command based on what should remain running:

```bash
pnpm app:stop   # Stop only the app; leave PostgreSQL running
pnpm app:start  # Resume that stopped app container
pnpm app:down   # Remove app + db containers/network; preserve named volumes
pnpm app:up     # Recreate app + db later with preserved data
```

Use `app:down` when finished with the complete local stack. Database records
survive because the PostgreSQL named volume is preserved.

### 9. Recover from a Turbopack reload loop

If the browser continually reloads and logs contain `Turbopack`,
`ChunkLoadError`, or `Next.js package not found`, mixed host/container output
may exist in the shared generated `.next` directory.

Stop only the app, delete generated Next.js output, and start it again:

```bash
pnpm app:stop
rm -rf .next
pnpm app:start
pnpm app:logs
```

Then hard-refresh the browser:

- macOS: `Cmd + Shift + R`
- Windows/Linux: `Ctrl + Shift + R`

Removing `.next` does not remove source code, PostgreSQL data, accounts,
migrations, or seed data.

If the problem persists:

```bash
pnpm app:down
rm -rf .next
pnpm app:up
pnpm app:migrate
```

Do not reset or reseed the database for a Turbopack cache problem.

### 10. Intentionally recreate a clean demo database

Use the guarded reset only when all local database data should be deleted and
the canonical migrated/seeded demo state restored:

```bash
pnpm db:reset
pnpm db:check
pnpm app:up
```

`pnpm db:reset` is destructive for local database data. It performs safety
checks, removes/recreates the Compose volumes, applies migrations, and loads
the deterministic seed.

Do not use `docker compose down -v` as a routine shutdown command.

## Alternative host application workflow

Use this when PostgreSQL should run in Docker but the Next.js development
server should run directly on the host.

First setup:

```bash
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
ALLOW_DB_SEED=true pnpm db:seed
pnpm db:check
pnpm dev
```

After pulling changes:

```bash
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
pnpm db:check
pnpm dev
```

Do not run the host and containerized Next.js servers simultaneously on port
3000.

## Command reference

### Application and full-stack commands

```bash
pnpm app:build      # Build the local-development app image
pnpm app:up         # Build/start app + database in the background
pnpm app:logs       # Follow app logs
pnpm app:stop       # Stop only the app
pnpm app:start      # Start the previously stopped app container
pnpm app:restart    # Restart the running app container
pnpm app:down       # Remove app + db containers/network; preserve volumes
pnpm app:install    # Install lockfile dependencies into app_node_modules
pnpm app:migrate    # Apply pending migrations inside the app container
pnpm app:seed       # Run the guarded deterministic development seed
pnpm dev:docker     # Run app + db attached to the current terminal
```

### Database commands

```bash
pnpm db:up          # Start only PostgreSQL
pnpm db:down        # Remove db container/network; preserve volume
pnpm db:logs        # Follow PostgreSQL logs
pnpm db:check       # Verify database connectivity
pnpm db:migrate     # Apply migrations from the host
pnpm db:seed        # Seed; requires ALLOW_DB_SEED=true
pnpm db:reset       # Destructively rebuild canonical local demo database
pnpm db:generate    # Generate a reviewed migration from Drizzle schema
pnpm db:studio      # Start Drizzle Studio
```

### Code quality and build commands

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
git diff --check
```

## Authentication and test personas

In development mode, `/sign-in` includes deterministic seeded personas for
student, faculty, partner, CAID, and E-Lab workflow verification. These
identities have no passwords and are unavailable in production mode.

Self-service accounts use email/password authentication and begin without any
role. Platform-owner authority is a separate PostgreSQL assignment and is
never inferred from signup, email domain, or organization membership.

## Architecture references

- [Production transformation roadmap](PRODUCTION_TRANSFORMATION_PLAN.md)
- [Canonical database design](docs/database/schema.dbml)
- [Database architecture notes](docs/database/README.md)
- [Authentication architecture](docs/security/authentication-architecture.md)
- [Authorization matrix](docs/security/authorization-matrix.md)
- [Global admin implementation plan](context/admin-console-implementation-plan.md)
