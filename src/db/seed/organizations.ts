import { and, eq } from "drizzle-orm";

import { organizations } from "../schema";
import type { SeedContext } from "./context";

export interface OrganizationSeed {
  description: string;
  key: string;
  name: string;
}

export const BOOTSTRAP_ORGANIZATIONS: OrganizationSeed[] = [
  {
    key: "org:caid",
    name: "CAID",
    description:
      "Synthetic local-development bootstrap record for the VinUni CAID internal unit.",
  },
  {
    key: "org:elab",
    name: "E-Lab",
    description:
      "Synthetic local-development bootstrap record for the VinUni E-Lab internal unit.",
  },
];

export async function ensureBootstrapOrganization(
  ctx: SeedContext,
  seed: OrganizationSeed
) {
  const existing = await ctx.tx
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      and(
        eq(organizations.name, seed.name),
        eq(organizations.organizationType, "INTERNAL_UNIT")
      )
    )
    .limit(2);

  if (existing.length > 1) {
    throw new Error(
      `Refusing to seed ${seed.key}: multiple INTERNAL_UNIT organizations named "${seed.name}" already exist.`
    );
  }

  if (existing[0]) {
    const [updated] = await ctx.tx
      .update(organizations)
      .set({
        description: seed.description,
        organizationType: "INTERNAL_UNIT",
        updatedAt: new Date(),
        verificationStatus: "VERIFIED",
      })
      .where(eq(organizations.id, existing[0].id))
      .returning({ id: organizations.id });

    ctx.setId(seed.key, updated.id);
    return updated.id;
  }

  const [created] = await ctx.tx
    .insert(organizations)
    .values({
      description: seed.description,
      name: seed.name,
      organizationType: "INTERNAL_UNIT",
      verificationStatus: "VERIFIED",
    })
    .returning({ id: organizations.id });

  ctx.setId(seed.key, created.id);
  return created.id;
}
