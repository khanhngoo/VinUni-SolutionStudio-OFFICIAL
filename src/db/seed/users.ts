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
  const user = await upsertUserByLowerEmail(ctx, seed.email, seed.fullName);
  ctx.setId(seed.key, user.id);
  return user.id;
}

/**
 * `users` is keyed for conflict resolution by the `users_email_lower_unique`
 * expression index (`lower(email)`), which Drizzle's `onConflictDoUpdate`
 * cannot target directly (its `target` option only accepts a plain column).
 * Select-then-branch instead. Shared by every seed module that upserts a
 * user by email.
 */
export async function upsertUserByLowerEmail(
  ctx: SeedContext,
  email: string,
  fullName: string
) {
  const [existing] = await ctx.tx
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);

  if (existing) {
    const [updated] = await ctx.tx
      .update(users)
      .set({ fullName, status: "ACTIVE", updatedAt: new Date() })
      .where(eq(users.id, existing.id))
      .returning({ id: users.id });
    return updated;
  }

  const [inserted] = await ctx.tx
    .insert(users)
    .values({ email, fullName, status: "ACTIVE" })
    .returning({ id: users.id });
  return inserted;
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
