This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local Development

Use `pnpm` for repository commands. The fully containerized workflow is the
recommended path when you want the app and PostgreSQL to run together. Open
[http://localhost:3000](http://localhost:3000) after startup.

### Fully containerized: first-time setup

Create `.env` from `.env.example` and fill in the required local values before
starting the stack.

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm app:up
pnpm app:migrate
pnpm app:seed
pnpm db:check
pnpm app:logs
```

`pnpm app:up` builds and starts both the `app` service and its `db` dependency,
so a separate `pnpm db:up` is not required. `pnpm app:logs` follows the server
logs; press `Ctrl-C` to stop following the logs without stopping the containers.

### Fully containerized: routine flow after pulling

The database volume is preserved between starts. Apply pending migrations after
pulling; do not reset or reseed the database during routine startup.

```bash
pnpm install --frozen-lockfile
pnpm app:up
```

If `package.json` or `pnpm-lock.yaml` changed, refresh the container's dependency
volume and restart the app before continuing:

```bash
pnpm app:install
pnpm app:restart
```

Then finish the routine checks and follow the application logs:

```bash
pnpm app:migrate
pnpm db:check
pnpm app:logs
```

For normal lifecycle management:

```bash
pnpm app:stop       # Stop only the app; keep PostgreSQL running
pnpm app:start      # Resume a previously stopped app
pnpm app:restart    # Restart the running app
pnpm app:down       # Remove app + db containers/network; preserve named volumes
pnpm app:up         # Recreate the stack after app:down
```

### Host app with containerized PostgreSQL

Use this alternative when Next.js should run directly on the host.

First-time setup:

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
ALLOW_DB_SEED=true pnpm db:seed
pnpm db:check
pnpm dev
```

Routine flow after pulling:

```bash
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
pnpm db:check
pnpm dev
```

### Canonical clean reset

Use this only when you intentionally want to delete the local PostgreSQL volume
and recreate the canonical migrated and seeded development database:

```bash
pnpm db:reset
pnpm db:check
pnpm app:up # Fully containerized workflow
# or: pnpm dev # Host-app workflow
```

`pnpm db:reset` is destructive for local database data. It runs the local safety
checks, recreates the Docker volume, applies migrations, and loads the canonical
development seed data.

## Docker Compose Commands

```bash
pnpm db:up          # Create/start the local PostgreSQL container
docker compose stop # Temporarily stop it while preserving data
docker compose start
pnpm db:down        # Remove the container/network while preserving the volume
pnpm db:logs        # Follow PostgreSQL logs
```

Do not use `docker compose down -v` directly for the normal workflow; use the
guarded `pnpm db:reset` command when a clean reset is genuinely required.

## Containerized Command Reference

The containerized workflow runs the Next.js development server and PostgreSQL
inside Docker Compose. This is local development only, not a production image.

The `app` service lives behind an optional `app` Compose profile, so plain
`docker compose up -d` (used by `pnpm db:up` and inside `pnpm db:reset`)
continues to start only `db`.

```bash
pnpm app:build      # Build the app development image
pnpm app:up         # Build and start app + its database dependency in the background
pnpm app:logs       # Follow the Next.js development-server logs
pnpm app:stop       # Stop only the app; keep PostgreSQL running
pnpm app:start      # Start the previously stopped app container
pnpm app:restart    # Restart the app container
pnpm app:down       # Remove app + db containers/network; preserve named volumes

pnpm app:install    # Refresh the app container's node_modules volume from the lockfile
pnpm app:migrate    # Apply pending migrations from inside the app container
pnpm app:seed       # Run the guarded development seed from inside the app container
```

For attached development with logs in the current terminal, `pnpm dev:docker`
remains available.

Notes:

- The repository is bind-mounted into the container so edits on the host
  trigger hot reload; `node_modules` lives in a separate named container
  volume so host and container installs never collide. `docker compose down
  -v` (run by `pnpm db:reset`) removes that volume too — the cost is a
  dependency reinstall on the next `--build`, not data loss.
- The `app` container reaches PostgreSQL at `db:5432` (the Compose service
  hostname), not `localhost:5432`. This is set directly in
  `docker-compose.yml` and does not require changes to your local `.env`.
  See `.env.example` for both forms.
- No secrets are baked into the image; environment values are provided to
  the `app` container at runtime.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
