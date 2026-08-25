import "dotenv/config";

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const CONTAINER_NAME = "vinuni-solution-studio-db";
const DATABASE_NAME = "solution_studio";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DANGEROUS_NAME_PATTERN = /(^|[-_.])(prod|production|staging)([-_.]|$)/i;

function run(command: string, args: string[], env: Partial<NodeJS.ProcessEnv> = {}) {
  console.log(`\n$ ${[command, ...args].join(" ")}`);

  const result = spawnSync(command, args, {
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(
      `Command failed with exit code ${result.status ?? "unknown"}: ${command} ${args.join(" ")}`
    );
  }
}

function output(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

function assertLocalResetTarget() {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  if (nodeEnv === "production") {
    throw new Error("REFUSED: db:reset cannot run when NODE_ENV=production.");
  }

  if (process.argv.length > 2) {
    throw new Error("REFUSED: db:reset does not accept database target arguments.");
  }

  if (!existsSync("docker-compose.yml")) {
    throw new Error("REFUSED: docker-compose.yml was not found in the current directory.");
  }

  const compose = readFileSync("docker-compose.yml", "utf8");

  if (!compose.includes(`container_name: ${CONTAINER_NAME}`)) {
    throw new Error(`REFUSED: docker-compose.yml does not define ${CONTAINER_NAME}.`);
  }

  if (!compose.includes(`POSTGRES_DB: ${DATABASE_NAME}`)) {
    throw new Error(`REFUSED: docker-compose.yml does not define ${DATABASE_NAME}.`);
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("REFUSED: DATABASE_URL is not defined.");
  }

  const parsed = new URL(databaseUrl);
  const database = parsed.pathname.replace(/^\//, "");
  const host = parsed.hostname;

  if ((parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") || database !== DATABASE_NAME) {
    throw new Error("REFUSED: db:reset only supports the local solution_studio PostgreSQL database.");
  }

  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `REFUSED: db:reset only supports localhost targets, not "${host}".`
    );
  }

  if (DANGEROUS_NAME_PATTERN.test(host) || DANGEROUS_NAME_PATTERN.test(database)) {
    throw new Error("REFUSED: reset target looks like production or staging.");
  }

  console.log("LOCAL DEVELOPMENT ONLY: this will delete the local PostgreSQL Docker volume.");
  console.log(`Reset target: ${host}${parsed.port ? `:${parsed.port}` : ""}/${database}`);
}

function waitForDatabaseHealth() {
  const maxAttempts = 30;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const health = output("docker", [
      "inspect",
      "-f",
      "{{.State.Health.Status}}",
      CONTAINER_NAME,
    ]);

    if (health === "healthy") {
      console.log(`\nDatabase container is healthy after ${attempt} check(s).`);
      return;
    }

    console.log(`Waiting for database health (${attempt}/${maxAttempts}): ${health ?? "not ready"}`);
    spawnSync("sleep", ["2"], { stdio: "ignore" });
  }

  throw new Error("Database container did not become healthy in time.");
}

async function main() {
  assertLocalResetTarget();

  run("docker", ["compose", "down", "-v"]);
  run("docker", ["compose", "up", "-d"]);
  waitForDatabaseHealth();
  run("pnpm", ["db:migrate"]);
  run("pnpm", ["db:seed"], { ALLOW_DB_SEED: "true" });

  console.log("\nLocal database reset completed.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
