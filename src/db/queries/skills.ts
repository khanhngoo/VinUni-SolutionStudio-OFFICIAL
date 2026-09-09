import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { skillCategories, skills } from "@/db/schema";

export type SkillQueryDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CanonicalSkillOption {
  canonicalName: string;
  categoryName: string | null;
  id: string;
}

/**
 * UI-safe read of the frozen canonical skill taxonomy for authoring pickers
 * (e.g. `/partner/post`). Deliberately excludes embeddings, aliases, and any
 * other internal matching metadata — only what a picker needs to render and
 * submit a selection. The `id` is stringified because challenge write inputs
 * key skills by canonical name, not internal id; it is included only for UI
 * plumbing (e.g. stable React keys), not as an authoritative identifier a
 * form can submit in place of the name.
 */
export async function listActiveCanonicalSkills(
  database: SkillQueryDatabase = db
): Promise<CanonicalSkillOption[]> {
  const rows = await database
    .select({
      canonicalName: skills.canonicalName,
      categoryName: skillCategories.name,
      id: skills.id,
    })
    .from(skills)
    .leftJoin(skillCategories, eq(skillCategories.id, skills.categoryId))
    .where(eq(skills.status, "ACTIVE"))
    .orderBy(asc(skillCategories.name), asc(skills.canonicalName));

  return rows.map((row) => ({
    canonicalName: row.canonicalName,
    categoryName: row.categoryName,
    id: row.id.toString(),
  }));
}
