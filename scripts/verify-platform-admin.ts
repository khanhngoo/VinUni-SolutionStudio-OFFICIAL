import "dotenv/config";

import { spawnSync } from "node:child_process";

import { and, eq, inArray } from "drizzle-orm";

import {
  hasActorCapability,
  isOrganizationAdmin,
  resolveAuthenticatedActor,
  type AuthenticatedActor,
} from "@/auth/authenticated-actor";
import { getDevelopmentIdentity } from "@/auth/development-identities";
import { resolveAuthenticatedUserByEmail } from "@/auth/authenticated-user";
import { db } from "@/db";
import { auditLogs, organizations, userPlatformRoles, users } from "@/db/schema";
import { hasPlatformOwnerCapability } from "@/services/platform-admin-policy";
import {
  grantPlatformOwner,
  revokePlatformOwner,
  PlatformAdminError,
} from "@/services/platform-admin.service";

/**
 * Phase 6.6 Checkpoint C verifier: `PLATFORM_OWNER` capability resolution,
 * the grant/revoke service, and the CLI's environment gate. Uses seeded
 * development identities as targets and deletes every row it creates in a
 * `finally` block so the script is safely rerunnable.
 */
async function main() {
  const caidOrganization = await getSeedOrganization("CAID");
  const caid = await resolveDevelopmentActor("CAID_ADMIN_DEMO");
  const elab = await resolveDevelopmentActor("ELAB_ADMIN_DEMO");
  const jordan = await resolveDevelopmentActor("JORDAN_STUDENT_DEMO");

  await cleanupTestRows([caid.user.userId, elab.user.userId]);

  try {
    // --- Baseline: no self-service, student, or org-scoped ADMIN account
    // resolves PLATFORM_OWNER on its own. ---
    assert(!hasPlatformOwnerCapability(caid), "seeded CAID admin must not start with PLATFORM_OWNER");
    assert(!hasPlatformOwnerCapability(elab), "seeded E-Lab admin must not start with PLATFORM_OWNER");
    assert(!hasPlatformOwnerCapability(jordan), "seeded student must not have PLATFORM_OWNER");
    assert(
      isOrganizationAdmin(caid, caidOrganization.id),
      "CAID admin must retain org-scoped ADMIN authority independent of platform authority"
    );

    // --- Unknown/inactive targets are refused before any row is written. ---
    const unknown = await resolveAuthenticatedUserByEmail("no-such-owner@example.test");
    assert(unknown.status === "UNMAPPED", "an unknown email must resolve to UNMAPPED, never a created user");

    await db.update(users).set({ status: "SUSPENDED" }).where(eq(users.id, jordan.user.userId));
    await assertRejects(
      () => grantPlatformOwner({ targetUserId: jordan.user.userId, grantedBy: null }),
      "VALIDATION_ERROR",
      "granting a SUSPENDED user must be refused"
    );
    await db.update(users).set({ status: "ACTIVE" }).where(eq(users.id, jordan.user.userId));

    // --- Case-insensitive email resolution (bootstrap CLI path). ---
    const upper = await resolveAuthenticatedUserByEmail(caid.user.email.toUpperCase());
    assert(
      upper.status === "RESOLVED" && upper.user.userId === caid.user.userId,
      "email resolution for bootstrap must be case-insensitive"
    );

    // --- Bootstrap: first grant with no existing ACTIVE owner. ---
    const auditCountBefore = await countAuditEvents(caid.user.userId);
    const bootstrapGrant = await grantPlatformOwner({ targetUserId: caid.user.userId, grantedBy: null });
    assert(bootstrapGrant.outcome === "GRANTED", "first grant with no existing owner must succeed as GRANTED");
    assert(
      (await countAuditEvents(caid.user.userId, "PLATFORM_OWNER_BOOTSTRAPPED")) === auditCountBefore + 1,
      "bootstrap grant must write exactly one PLATFORM_OWNER_BOOTSTRAPPED audit event"
    );
    assert(
      (await countActiveRows(caid.user.userId)) === 1,
      "bootstrap grant must create exactly one ACTIVE user_platform_roles row"
    );

    // --- Idempotent repeat grant: no duplicate row, no duplicate audit event. ---
    const auditCountAfterBootstrap = await countAuditEvents(caid.user.userId);
    const repeatGrant = await grantPlatformOwner({ targetUserId: caid.user.userId, grantedBy: null });
    assert(repeatGrant.outcome === "ALREADY_ACTIVE", "repeat grant to an ACTIVE owner must be idempotent");
    assert(repeatGrant.platformRoleId === bootstrapGrant.platformRoleId, "repeat grant must reuse the same row");
    assert(
      (await countAuditEvents(caid.user.userId)) === auditCountAfterBootstrap,
      "an idempotent no-op grant must not write a new audit event"
    );

    // --- Silent second owner is refused; explicit recovery/second-owner mode works. ---
    await assertRejects(
      () => grantPlatformOwner({ targetUserId: elab.user.userId, grantedBy: null }),
      "CONFLICT",
      "granting a second owner without allowAdditionalOwner must be refused"
    );
    assert((await countActiveRows(elab.user.userId)) === 0, "a refused grant must not create a row");

    const secondGrant = await grantPlatformOwner({
      targetUserId: elab.user.userId,
      grantedBy: caid.user.userId,
      allowAdditionalOwner: true,
    });
    assert(secondGrant.outcome === "GRANTED", "explicit second-owner mode must succeed");

    // --- Platform and organization authority coexist without conflation. ---
    const caidAfterGrant = await resolveAuthenticatedActor(caid.user);
    const elabAfterGrant = await resolveAuthenticatedActor(elab.user);
    assertActorHasOwner(caidAfterGrant, "CAID admin must resolve PLATFORM_OWNER after being granted it");
    assertActorHasOwner(elabAfterGrant, "E-Lab admin must resolve PLATFORM_OWNER after being granted it");
    assert(
      isOrganizationAdmin(caidAfterGrant, caidOrganization.id),
      "granting PLATFORM_OWNER must not remove existing organization-scoped ADMIN authority"
    );
    const jordanAfterGrants = await resolveAuthenticatedActor(jordan.user);
    assert(
      !hasPlatformOwnerCapability(jordanAfterGrants),
      "granting other users PLATFORM_OWNER must not leak capability to an unrelated student"
    );

    // --- Last-owner protection. ---
    const firstRevoke = await revokePlatformOwner({
      targetUserId: caid.user.userId,
      revokedBy: elab.user.userId,
    });
    assert(firstRevoke.outcome === "REVOKED", "revoking one of two ACTIVE owners must succeed");

    await assertRejects(
      () => revokePlatformOwner({ targetUserId: elab.user.userId, revokedBy: elab.user.userId }),
      "LAST_PLATFORM_OWNER",
      "revoking the final ACTIVE owner (including self-revocation) must be refused"
    );
    const elabStillActive = await countActiveRows(elab.user.userId);
    assert(elabStillActive === 1, "a refused revoke must change no rows");

    // --- Idempotent revoke. ---
    const repeatRevoke = await revokePlatformOwner({ targetUserId: caid.user.userId, revokedBy: null });
    assert(repeatRevoke.outcome === "ALREADY_REVOKED", "repeat revoke of an already-REVOKED row must be idempotent");

    // --- Recovery: re-granting a previously revoked user reactivates the
    // existing row rather than violating the (user_id, role) unique index. ---
    const reactivation = await grantPlatformOwner({
      targetUserId: caid.user.userId,
      grantedBy: elab.user.userId,
      allowAdditionalOwner: true,
    });
    assert(reactivation.outcome === "REACTIVATED", "re-granting a revoked owner must reactivate the same row");
    assert(
      reactivation.platformRoleId === bootstrapGrant.platformRoleId,
      "reactivation must reuse the original row, not insert a second one"
    );
    const caidAfterReactivation = await resolveAuthenticatedActor(caid.user);
    assertActorHasOwner(caidAfterReactivation, "reactivated owner must resolve PLATFORM_OWNER again");

    // --- No credential material anywhere in what this test wrote to audit_logs. ---
    const events = await db
      .select({ details: auditLogs.details })
      .from(auditLogs)
      .where(inArray(auditLogs.entityId, [caid.user.userId, elab.user.userId]));
    for (const event of events) {
      const serialized = JSON.stringify(event.details ?? {});
      assert(
        !/password|hash|credential|secret|token/i.test(serialized),
        "audit details must never contain credential-shaped material"
      );
    }

    // --- JWT/session claims cannot manufacture authority: actor resolution
    // reads only `user_platform_roles`, never anything the caller asserts. ---
    const domainOnly = await resolveAuthenticatedActor({
      email: "platform.owner@vinuni.edu",
      fullName: "Domain Only",
      userId: BigInt(-1),
    });
    assert(
      !hasPlatformOwnerCapability(domainOnly),
      "an email domain or display name must never infer platform authority"
    );

    console.log("Phase 6.6 Checkpoint C platform-admin verification passed.");
  } finally {
    await cleanupTestRows([caid.user.userId, elab.user.userId]);
  }

  // --- CLI environment gate: refused outside a subprocess check, since the
  // in-process guard is exercised by the script's own `main()`, not by
  // calling the service directly. ---
  verifyCliEnvironmentGate(caid.user.email);
}

function verifyCliEnvironmentGate(email: string) {
  const result = spawnSync("pnpm", ["exec", "tsx", "scripts/admin-grant-owner.ts", "--email", email], {
    encoding: "utf8",
    env: { ...process.env, ALLOW_PLATFORM_OWNER_BOOTSTRAP: "" },
  });

  assert(result.status !== 0, "the bootstrap CLI must exit non-zero without ALLOW_PLATFORM_OWNER_BOOTSTRAP=true");
  assert(
    result.stderr.includes("REFUSED"),
    "the bootstrap CLI must print a REFUSED message when the environment gate is not set"
  );
  console.log("Bootstrap CLI environment gate verified.");
}

async function cleanupTestRows(userIds: bigint[]) {
  await db.delete(auditLogs).where(inArray(auditLogs.entityId, userIds));
  await db.delete(userPlatformRoles).where(inArray(userPlatformRoles.userId, userIds));
}

async function countActiveRows(userId: bigint) {
  const rows = await db
    .select({ id: userPlatformRoles.id })
    .from(userPlatformRoles)
    .where(
      and(
        eq(userPlatformRoles.userId, userId),
        eq(userPlatformRoles.role, "PLATFORM_OWNER"),
        eq(userPlatformRoles.status, "ACTIVE")
      )
    );
  return rows.length;
}

async function countAuditEvents(userId: bigint, action?: string) {
  const rows = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(
      action
        ? and(eq(auditLogs.entityId, userId), eq(auditLogs.action, action))
        : eq(auditLogs.entityId, userId)
    );
  return rows.length;
}

async function assertRejects(
  fn: () => Promise<unknown>,
  expectedCode: string,
  message: string
) {
  try {
    await fn();
  } catch (error) {
    if (error instanceof PlatformAdminError && error.code === expectedCode) return;
    throw new Error(`${message} (unexpected error: ${String(error)})`);
  }
  throw new Error(`${message} (no error was thrown)`);
}

function assertActorHasOwner(actor: AuthenticatedActor, message: string) {
  assert(hasActorCapability(actor, "PLATFORM_OWNER"), message);
}

async function getSeedOrganization(name: string) {
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);
  if (!organization) throw new Error(`Seeded ${name} organization is required for verification.`);
  return organization;
}

async function resolveDevelopmentActor(key: Parameters<typeof getDevelopmentIdentity>[0]) {
  const identity = getDevelopmentIdentity(key);
  if (!identity) throw new Error(`Missing development identity ${key}.`);
  const resolution = await resolveAuthenticatedUserByEmail(identity.email);
  if (resolution.status !== "RESOLVED") throw new Error(`${identity.email} must resolve to an active seeded user.`);
  return resolveAuthenticatedActor(resolution.user);
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
