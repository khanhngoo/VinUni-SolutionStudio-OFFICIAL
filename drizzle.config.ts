import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const migrationDatabaseUrl = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

if (!migrationDatabaseUrl) {
  throw new Error("MIGRATION_DATABASE_URL or DATABASE_URL is required for Drizzle Kit.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",

  dbCredentials: {
    url: migrationDatabaseUrl,
  },
});
