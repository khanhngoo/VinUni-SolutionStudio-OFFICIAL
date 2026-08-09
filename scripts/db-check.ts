import "dotenv/config";
import { sql } from "drizzle-orm";

import { db } from "../src/db";

async function main() {
  const result = await db.execute(
    sql`SELECT current_database() AS database, version() AS version`
  );

  console.log(result.rows);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});