import "dotenv/config";

import { and, eq, inArray } from "drizzle-orm";

import { resolveAuthenticatedActor } from "@/auth/authenticated-actor";
import { getDevelopmentIdentity } from "@/auth/development-identities";
import { resolveAuthenticatedUserByEmail } from "@/auth/authenticated-user";
import { db } from "@/db";
import { auditLogs, userCredentials, userPlatformRoles, users } from "@/db/schema";
import { getAdminUserDetail, listAdminPlatformOwners } from "@/db/queries/admin";
import {
  PlatformAdminError,
  grantPlatformOwner,
  reactivateUserAccount,
  suspendUserAccount,
} from "@/services/platform-admin.service";

/**
 * Phase 6.6 Checkpoint F verifier, covering only the two approved mutation
 * categories: the second-owner grant/revoke UI's underlying reads
 * (`listAdminPlatformOwners`, already-service-tested grant/revoke itself is
 * Checkpoint C's `verify-platform-admin.ts`) and account
 * suspension/reactivation end to end (`suspendUserAccount`/
 * `reactivateUserAccount`, Section 10.3). Organization verification and
 * exact-email membership assignment (Section 10.4/10.5) were not approved
 * this checkpoint and have no code to verify.
 */
async function main() {
  const caid = await resolveDevelopmentActor("CAID_ADMIN_DEMO");
  const elab = await resolveDevelopmentActor("ELAB_ADMIN_DEMO");
  const testUserIds = [caid.user.userId, elab.user.userId];

  await cleanup(testUserIds);

  try {
    // --- Validation happens before any row is touched. ---
    await assertRejects(
      () => suspendUserAccount({ targetUserId: caid.user.userId, suspendedBy: elab.user.userId, reason: "  " }),
      "VALIDATION_ERROR",
      "an empty/whitespace-only suspension reason must be refused"
    );
    await assertRejects(
      () =>
        suspendUserAccount({
          targetUserId: caid.user.userId,
          suspendedBy: elab.user.userId,
          reason: "x".repeat(501),
        }),
      "VALIDATION_ERROR",
      "a suspension reason over 500 characters must be refused"
    );
    await assertRejects(
      () => suspendUserAccount({ targetUserId: BigInt(999_999_999), suspendedBy: elab.user.userId, reason: "test" }),
      "NOT_FOUND",
      "suspending a nonexistent user must be refused"
    );

    // --- Bootstrap the sole owner, then prove suspension of the final
    // accessible owner is refused (Section 10.3, the same invariant
    // `revokePlatformOwner` already enforces). ---
    await grantPlatformOwner({ targetUserId: caid.user.userId, grantedBy: null });
    const auditCountBeforeRefusedSuspend = await countAuditEvents(caid.user.userId);
    await assertRejects(
      () =>
        suspendUserAccount({
          targetUserId: caid.user.userId,
          suspendedBy: caid.user.userId,
          reason: "Should be refused: sole owner.",
        }),
      "LAST_PLATFORM_OWNER",
      "suspending the final accessible platform owner must be refused"
    );
    assert(
      (await countAuditEvents(caid.user.userId)) === auditCountBeforeRefusedSuspend,
      "a refused suspension must not write an audit row"
    );
    const [caidStillActive] = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, caid.user.userId))
      .limit(1);
    assert(caidStillActive?.status === "ACTIVE", "a refused suspension must not change users.status");

    // --- With a second owner, suspension succeeds. ---
    await grantPlatformOwner({ targetUserId: elab.user.userId, grantedBy: caid.user.userId, allowAdditionalOwner: true });
    const credentialBefore = await hasCredential(caid.user.userId);

    const suspended = await suspendUserAccount({
      targetUserId: caid.user.userId,
      suspendedBy: elab.user.userId,
      reason: "Verification suspension.",
    });
    assert(suspended.outcome === "SUSPENDED", "suspending a non-final owner must succeed");

    const suspendEvent = await latestAuditEvent(caid.user.userId, "USER_SUSPENDED");
    assert(suspendEvent !== null, "suspension must write exactly one USER_SUSPENDED audit event");
    const suspendDetails = suspendEvent!.details as { previousStatus?: string; nextStatus?: string; reason?: string };
    assert(suspendDetails.previousStatus === "ACTIVE", "USER_SUSPENDED details.previousStatus must be ACTIVE");
    assert(suspendDetails.nextStatus === "SUSPENDED", "USER_SUSPENDED details.nextStatus must be SUSPENDED");
    assert(suspendDetails.reason === "Verification suspension.", "USER_SUSPENDED details.reason must match");

    assert((await hasCredential(caid.user.userId)) === credentialBefore, "suspension must never delete credentials");

    // --- Suspension prevents future authenticated-user resolution. ---
    const blockedResolution = await resolveAuthenticatedUserByEmail(caid.user.email);
    assert(blockedResolution.status === "INACTIVE", "a SUSPENDED account must fail authenticated-user resolution");

    // --- Idempotent re-suspend: no duplicate audit event. ---
    const auditCountAfterSuspend = await countAuditEvents(caid.user.userId);
    const repeatSuspend = await suspendUserAccount({
      targetUserId: caid.user.userId,
      suspendedBy: elab.user.userId,
      reason: "Repeat suspension attempt.",
    });
    assert(repeatSuspend.outcome === "ALREADY_SUSPENDED", "re-suspending an already-SUSPENDED account must be idempotent");
    assert(
      (await countAuditEvents(caid.user.userId)) === auditCountAfterSuspend,
      "an idempotent no-op suspension must not write a new audit event"
    );

    // --- Reactivation. ---
    const reactivated = await reactivateUserAccount({
      targetUserId: caid.user.userId,
      reactivatedBy: elab.user.userId,
    });
    assert(reactivated.outcome === "REACTIVATED", "reactivating a SUSPENDED account must succeed");

    const reactivateEvent = await latestAuditEvent(caid.user.userId, "USER_REACTIVATED");
    assert(reactivateEvent !== null, "reactivation must write exactly one USER_REACTIVATED audit event");
    const reactivateDetails = reactivateEvent!.details as { previousStatus?: string; nextStatus?: string };
    assert(reactivateDetails.previousStatus === "SUSPENDED", "USER_REACTIVATED details.previousStatus must be SUSPENDED");
    assert(reactivateDetails.nextStatus === "ACTIVE", "USER_REACTIVATED details.nextStatus must be ACTIVE");

    const restoredResolution = await resolveAuthenticatedUserByEmail(caid.user.email);
    assert(restoredResolution.status === "RESOLVED", "reactivation must restore authenticated-user resolution");

    // --- Idempotent re-reactivate: no duplicate audit event. ---
    const auditCountAfterReactivate = await countAuditEvents(caid.user.userId);
    const repeatReactivate = await reactivateUserAccount({
      targetUserId: caid.user.userId,
      reactivatedBy: elab.user.userId,
    });
    assert(repeatReactivate.outcome === "ALREADY_ACTIVE", "re-reactivating an already-ACTIVE account must be idempotent");
    assert(
      (await countAuditEvents(caid.user.userId)) === auditCountAfterReactivate,
      "an idempotent no-op reactivation must not write a new audit event"
    );

    // --- listAdminPlatformOwners: exactly the two ACTIVE owners, with the
    // grantedByName join resolved correctly. ---
    const owners = await listAdminPlatformOwners();
    const ownerIds = new Set(owners.map((owner) => owner.userId.toString()));
    assert(ownerIds.has(caid.user.userId.toString()), "listAdminPlatformOwners must include the bootstrapped owner");
    assert(ownerIds.has(elab.user.userId.toString()), "listAdminPlatformOwners must include the second owner");
    const elabRow = owners.find((owner) => owner.userId === elab.user.userId);
    assert(
      elabRow?.grantedByName === caid.user.fullName,
      "listAdminPlatformOwners must resolve grantedByName via the grantedBy join"
    );

    // --- getAdminUserDetail: identity/status/platformRole/recentAuditEvents
    // agree with what the mutations above actually did. ---
    const detail = await getAdminUserDetail(caid.user.userId);
    assert(detail !== null, "getAdminUserDetail must find an existing user");
    assert(detail!.status === "ACTIVE", "getAdminUserDetail must reflect the reactivated status");
    assert(detail!.platformRole?.role === "PLATFORM_OWNER", "getAdminUserDetail must report the platform role");
    assert(detail!.platformRole?.status === "ACTIVE", "getAdminUserDetail must report the platform role's current status");
    const detailActions = detail!.recentAuditEvents.items.map((item) => item.action);
    assert(
      detailActions.includes("USER_SUSPENDED") && detailActions.includes("USER_REACTIVATED"),
      "getAdminUserDetail's recentAuditEvents must include this user's own suspend/reactivate history"
    );

    console.log("Phase 6.6 Checkpoint F access-governance verification passed.");
  } finally {
    await cleanup(testUserIds);
  }
}

async function cleanup(userIds: bigint[]) {
  await db.delete(auditLogs).where(inArray(auditLogs.entityId, userIds));
  await db.delete(userPlatformRoles).where(inArray(userPlatformRoles.userId, userIds));
  await db.update(users).set({ status: "ACTIVE" }).where(inArray(users.id, userIds));
}

async function hasCredential(userId: bigint) {
  const rows = await db
    .select({ userId: userCredentials.userId })
    .from(userCredentials)
    .where(eq(userCredentials.userId, userId))
    .limit(1);
  return rows.length > 0;
}

async function countAuditEvents(userId: bigint) {
  const rows = await db.select({ id: auditLogs.id }).from(auditLogs).where(eq(auditLogs.entityId, userId));
  return rows.length;
}

async function latestAuditEvent(userId: bigint, action: string) {
  const rows = await db
    .select({ id: auditLogs.id, details: auditLogs.details })
    .from(auditLogs)
    .where(and(eq(auditLogs.entityId, userId), eq(auditLogs.action, action)))
    .orderBy(auditLogs.id);
  assert(rows.length <= 1, `expected at most one ${action} audit row before this assertion runs`);
  return rows[0] ?? null;
}

async function assertRejects(fn: () => Promise<unknown>, expectedCode: string, message: string) {
  try {
    await fn();
  } catch (error) {
    if (error instanceof PlatformAdminError && error.code === expectedCode) return;
    throw new Error(`${message} (unexpected error: ${String(error)})`);
  }
  throw new Error(`${message} (no error was thrown)`);
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
