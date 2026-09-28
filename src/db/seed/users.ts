import { eq, sql } from "drizzle-orm";

import { organizationMemberships, users } from "../schema";
import type { SeedContext } from "./context";

interface DevelopmentAdminSeed {
  email: string;
  fullName: string;
  jobTitle: string;
  key: string;
  organizationKey: string;
}

export const DEVELOPMENT_ADMIN_USERS: DevelopmentAdminSeed[] = [
  {
    key: "user:caid-admin-dev",
    email: "caid.admin.dev@example.test",
    fullName: "CAID Development Admin",
    jobTitle: "Development CAID Admin",
    organizationKey: "org:caid",
  },
  {
    key: "user:elab-admin-dev",
    email: "elab.admin.dev@example.test",
    fullName: "E-Lab Development Admin",
    jobTitle: "Development E-Lab Admin",
    organizationKey: "org:elab",
  },
];

export async function ensureDevelopmentAdminUser(
  ctx: SeedContext,
  seed: DevelopmentAdminSeed
) {
  const [existing] = await ctx.tx
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${seed.email})`)
    .limit(1);

  const [user] = existing
    ? await ctx.tx
      .update(users)
      .set({
        fullName: seed.fullName,
        status: "ACTIVE",
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning({ id: users.id })
    : await ctx.tx
      .insert(users)
      .values({
        email: seed.email,
        fullName: seed.fullName,
        status: "ACTIVE",
      })
      .returning({ id: users.id });

  ctx.setId(seed.key, user.id);
  return user.id;
}

export async function ensureDevelopmentAdminMembership(
  ctx: SeedContext,
  seed: DevelopmentAdminSeed
) {
  const userId = ctx.getId(seed.key);
  const organizationId = ctx.getId(seed.organizationKey);

  const [membership] = await ctx.tx
    .insert(organizationMemberships)
    .values({
      jobTitle: seed.jobTitle,
      organizationId,
      role: "ADMIN",
      status: "ACTIVE",
      userId,
    })
    .onConflictDoUpdate({
      target: [
        organizationMemberships.userId,
        organizationMemberships.organizationId,
        organizationMemberships.role,
      ],
      set: {
        jobTitle: seed.jobTitle,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    })
    .returning({ id: organizationMemberships.id });

  ctx.setId(`membership:${seed.key}:${seed.organizationKey}:admin`, membership.id);
  return membership.id;
}
