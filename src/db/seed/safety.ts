const APPROVED_LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "db",
  "host.docker.internal",
  "vinuni-solution-studio-db",
]);

const APPROVED_DATABASES = new Set(["solution_studio"]);

const DANGEROUS_NAME_PATTERN = /(^|[-_.])(prod|production|staging)([-_.]|$)/i;

export interface SeedTargetSummary {
  database: string;
  environment: string;
  host: string;
  port: string | null;
  protocol: string;
}

export function validateSeedSafety(env: NodeJS.ProcessEnv): SeedTargetSummary {
  const nodeEnv = env.NODE_ENV ?? "development";

  if (nodeEnv === "production") {
    throw new Error("REFUSED: db:seed cannot run when NODE_ENV=production.");
  }

  if (env.ALLOW_DB_SEED !== "true") {
    throw new Error(
      "REFUSED: set ALLOW_DB_SEED=true to run the non-destructive development seed."
    );
  }

  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("REFUSED: DATABASE_URL is not defined.");
  }

  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("REFUSED: DATABASE_URL is not a valid URL.");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("REFUSED: DATABASE_URL must use postgres/postgresql protocol.");
  }

  const database = parsed.pathname.replace(/^\//, "");
  const host = parsed.hostname;

  if (!APPROVED_LOCAL_HOSTS.has(host)) {
    throw new Error(
      `REFUSED: database host "${host}" is not an approved local development host.`
    );
  }

  if (!APPROVED_DATABASES.has(database)) {
    throw new Error(
      `REFUSED: database "${database}" is not an approved development database.`
    );
  }

  if (DANGEROUS_NAME_PATTERN.test(host) || DANGEROUS_NAME_PATTERN.test(database)) {
    throw new Error(
      "REFUSED: database target looks like production or staging by host/database name."
    );
  }

  return {
    database,
    environment: nodeEnv,
    host,
    port: parsed.port || null,
    protocol: parsed.protocol.replace(":", ""),
  };
}

export function formatSeedTarget(summary: SeedTargetSummary): string {
  return [
    "Seed target:",
    `  host: ${summary.host}${summary.port ? `:${summary.port}` : ""}`,
    `  database: ${summary.database}`,
    `  environment: ${summary.environment}`,
  ].join("\n");
}
