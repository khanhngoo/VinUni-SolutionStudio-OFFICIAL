import type { SeedContext } from "./context";
import {
  ensureCanonicalSkills,
  ensureSkillAliases,
  ensureSkillCategories,
} from "./skills";

export async function seedReference(ctx: SeedContext) {
  await ensureSkillCategories(ctx);
  await ensureCanonicalSkills(ctx);
  await ensureSkillAliases(ctx);
  ctx.record("REFERENCE", "skill relationships", 0);
}
