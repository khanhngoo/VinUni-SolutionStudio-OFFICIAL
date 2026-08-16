import "dotenv/config";

import { count, sql } from "drizzle-orm";

import { seedBootstrap } from "./seed/bootstrap";
import { SeedContext } from "./seed/context";
import { seedReference } from "./seed/reference";
import { formatSeedTarget, validateSeedSafety } from "./seed/safety";

type Database = typeof import("./index")["db"];
type Schema = typeof import("./schema");

async function readCounts(db: Database, schema: Schema) {
  const {
    organizationMemberships,
    organizations,
    skillAliases,
    skillCategories,
    skillRelationships,
    skills,
    users,
  } = schema;

  const [
    organizationCount,
    userCount,
    membershipCount,
    categoryCount,
    skillCount,
    aliasCount,
    relationshipCount,
  ] = await Promise.all([
    db.select({ count: count() }).from(organizations),
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(organizationMemberships),
    db.select({ count: count() }).from(skillCategories),
    db.select({ count: count() }).from(skills),
    db.select({ count: count() }).from(skillAliases),
    db.select({ count: count() }).from(skillRelationships),
  ]);

  return {
    aliases: aliasCount[0].count,
    categories: categoryCount[0].count,
    memberships: membershipCount[0].count,
    organizations: organizationCount[0].count,
    skillRelationships: relationshipCount[0].count,
    skills: skillCount[0].count,
    users: userCount[0].count,
  };
}

function printSummary(ctx: SeedContext) {
  const rows = ctx.summary();

  for (const section of ["BOOTSTRAP", "REFERENCE"] as const) {
    console.log(section);

    for (const row of rows.filter((entry) => entry.section === section)) {
      console.log(`  ${row.label}: ${row.count}`);
    }
  }
}

async function main() {
  const target = validateSeedSafety(process.env);
  const [{ db }, schema] = await Promise.all([import("./index"), import("./schema")]);

  console.log(formatSeedTarget(target));
  console.log("");

  const before = await readCounts(db, schema);

  const ctx = await db.transaction(async (tx) => {
    const seedContext = new SeedContext(tx);

    await seedBootstrap(seedContext);
    await seedReference(seedContext);

    return seedContext;
  });

  printSummary(ctx);

  const after = await readCounts(db, schema);

  console.log("");
  console.log("Database row counts:");
  console.log(`  organizations: ${before.organizations} -> ${after.organizations}`);
  console.log(`  users: ${before.users} -> ${after.users}`);
  console.log(`  organization memberships: ${before.memberships} -> ${after.memberships}`);
  console.log(`  skill categories: ${before.categories} -> ${after.categories}`);
  console.log(`  canonical skills: ${before.skills} -> ${after.skills}`);
  console.log(`  skill aliases: ${before.aliases} -> ${after.aliases}`);
  console.log(
    `  skill relationships: ${before.skillRelationships} -> ${after.skillRelationships}`
  );

  if (after.skillRelationships !== 0) {
    throw new Error(
      "Phase 3.1 does not seed skill_relationships, but existing rows are present."
    );
  }

  await db.execute(sql`select 1`);

  console.log("");
  console.log("Seed completed.");
  process.exit(0);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
