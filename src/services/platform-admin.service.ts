import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { userPlatformRoles, users } from "@/db/schema";
import { recordAuditEvent } from "@/services/audit.service";

export type PlatformAdminErrorCode =
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "LAST_PLATFORM_OWNER";

export class PlatformAdminError extends Error {
  constructor(
    public readonly code: PlatformAdminErrorCode,
    message: string
  ) {
    super(message);
    this.name = "PlatformAdminError";
  }
}

export interface GrantPlatformOwnerInput {
  /** The user receiving `PLATFORM_OWNER`. Must already be an ACTIVE user. */
  targetUserId: bigint;
  /**
   * The acting owner's user ID, or `null` only for the documented
   * bootstrap/recovery CLI path (see `docs/database/schema.dbml`
   * `user_platform_roles.granted_by`). A future in-app grant (Checkpoint F)
   * must always supply the acting owner's ID.
   */
  grantedBy: bigint | null;
  /**
   * Must be explicitly `true` to grant an additional owner when at least one
   * ACTIVE owner already exists for a different user. Defaults to `false` so
   * a plain grant call never silently reassigns platform authority.
   */
  allowAdditionalOwner?: boolean;
}

export interface GrantPlatformOwnerResult {
  outcome: "GRANTED" | "REACTIVATED" | "ALREADY_ACTIVE";
  platformRoleId: bigint;
  userId: bigint;
}

export interface RevokePlatformOwnerInput {
  targetUserId: bigint;
  /** The acting owner's user ID, or `null` only for the CLI recovery path. */
  revokedBy: bigint | null;
}

export interface RevokePlatformOwnerResult {
  outcome: "REVOKED" | "ALREADY_REVOKED";
  platformRoleId: bigint;
  userId: bigint;
}

/**
 * Grants `PLATFORM_OWNER` to `targetUserId`, or reactivates a previously
 * revoked assignment. Idempotent when the target already holds an ACTIVE
 * assignment. Refuses a silent second owner unless `allowAdditionalOwner`
 * is explicitly set. Re-checks the target user's current status and writes
 * the role change and its audit event in one transaction.
 */
export async function grantPlatformOwner(
  input: GrantPlatformOwnerInput
): Promise<GrantPlatformOwnerResult> {
  const allowAdditionalOwner = input.allowAdditionalOwner ?? false;

  return db.transaction(async (tx) => {
    const [targetUser] = await tx
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, input.targetUserId))
      .limit(1);

    if (!targetUser) {
      throw new PlatformAdminError("NOT_FOUND", "Target user does not exist.");
    }
    if (targetUser.status !== "ACTIVE") {
      throw new PlatformAdminError(
        "VALIDATION_ERROR",
        `Target user status is ${targetUser.status}, not ACTIVE.`
      );
    }

    const activeOwners = await tx
      .select({ userId: userPlatformRoles.userId })
      .from(userPlatformRoles)
      .where(
        and(
          eq(userPlatformRoles.role, "PLATFORM_OWNER"),
          eq(userPlatformRoles.status, "ACTIVE")
        )
      );

    const isBootstrap = activeOwners.length === 0;
    const targetAlreadyActive = activeOwners.some(
      (owner) => owner.userId === input.targetUserId
    );

    if (!isBootstrap && !targetAlreadyActive && !allowAdditionalOwner) {
      throw new PlatformAdminError(
        "CONFLICT",
        "An ACTIVE platform owner already exists. Set allowAdditionalOwner to grant a second owner."
      );
    }

    const [existingRow] = await tx
      .select({ id: userPlatformRoles.id, status: userPlatformRoles.status })
      .from(userPlatformRoles)
      .where(
        and(
          eq(userPlatformRoles.userId, input.targetUserId),
          eq(userPlatformRoles.role, "PLATFORM_OWNER")
        )
      )
      .limit(1);

    const now = new Date();

    if (existingRow?.status === "ACTIVE") {
      return {
        outcome: "ALREADY_ACTIVE",
        platformRoleId: existingRow.id,
        userId: input.targetUserId,
      };
    }

    if (existingRow) {
      await tx
        .update(userPlatformRoles)
        .set({
          status: "ACTIVE",
          grantedBy: input.grantedBy,
          grantedAt: now,
          revokedBy: null,
          revokedAt: null,
          updatedAt: now,
        })
        .where(eq(userPlatformRoles.id, existingRow.id));

      await recordAuditEvent(tx, {
        userId: input.grantedBy,
        action: "PLATFORM_OWNER_GRANTED",
        entityType: "user",
        entityId: input.targetUserId,
        details: { platformRoleId: existingRow.id.toString(), reactivated: true },
      });

      return {
        outcome: "REACTIVATED",
        platformRoleId: existingRow.id,
        userId: input.targetUserId,
      };
    }

    const [inserted] = await tx
      .insert(userPlatformRoles)
      .values({
        userId: input.targetUserId,
        role: "PLATFORM_OWNER",
        status: "ACTIVE",
        grantedBy: input.grantedBy,
        grantedAt: now,
      })
      .returning({ id: userPlatformRoles.id });

    await recordAuditEvent(tx, {
      userId: input.grantedBy,
      action: isBootstrap ? "PLATFORM_OWNER_BOOTSTRAPPED" : "PLATFORM_OWNER_GRANTED",
      entityType: "user",
      entityId: input.targetUserId,
      details: { platformRoleId: inserted.id.toString() },
    });

    return { outcome: "GRANTED", platformRoleId: inserted.id, userId: input.targetUserId };
  });
}

/**
 * Revokes `targetUserId`'s ACTIVE `PLATFORM_OWNER` assignment. Refuses to
 * revoke the final ACTIVE owner (`LAST_PLATFORM_OWNER`), which also covers
 * self-revocation by the final owner. Locks the full set of ACTIVE owner
 * rows for the invariant check and writes the role change and its audit
 * event in one transaction. Idempotent when the assignment is already
 * REVOKED.
 */
export async function revokePlatformOwner(
  input: RevokePlatformOwnerInput
): Promise<RevokePlatformOwnerResult> {
  return db.transaction(async (tx) => {
    const activeOwners = await tx
      .select({ id: userPlatformRoles.id, userId: userPlatformRoles.userId })
      .from(userPlatformRoles)
      .where(
        and(
          eq(userPlatformRoles.role, "PLATFORM_OWNER"),
          eq(userPlatformRoles.status, "ACTIVE")
        )
      )
      .for("update");

    const target = activeOwners.find((owner) => owner.userId === input.targetUserId);

    if (!target) {
      const [existingRow] = await tx
        .select({ id: userPlatformRoles.id, status: userPlatformRoles.status })
        .from(userPlatformRoles)
        .where(
          and(
            eq(userPlatformRoles.userId, input.targetUserId),
            eq(userPlatformRoles.role, "PLATFORM_OWNER")
          )
        )
        .limit(1);

      if (existingRow?.status === "REVOKED") {
        return {
          outcome: "ALREADY_REVOKED",
          platformRoleId: existingRow.id,
          userId: input.targetUserId,
        };
      }

      throw new PlatformAdminError(
        "NOT_FOUND",
        "Target user does not hold an ACTIVE platform-owner assignment."
      );
    }

    if (activeOwners.length <= 1) {
      throw new PlatformAdminError(
        "LAST_PLATFORM_OWNER",
        "Refusing to revoke the final ACTIVE platform owner."
      );
    }

    const now = new Date();

    await tx
      .update(userPlatformRoles)
      .set({ status: "REVOKED", revokedBy: input.revokedBy, revokedAt: now, updatedAt: now })
      .where(eq(userPlatformRoles.id, target.id));

    await recordAuditEvent(tx, {
      userId: input.revokedBy,
      action: "PLATFORM_OWNER_REVOKED",
      entityType: "user",
      entityId: input.targetUserId,
      details: { platformRoleId: target.id.toString() },
    });

    return { outcome: "REVOKED", platformRoleId: target.id, userId: input.targetUserId };
  });
}

const MAX_SUSPENSION_REASON_LENGTH = 500;

export interface SuspendUserAccountInput {
  targetUserId: bigint;
  /** The acting owner's user ID. Always required — unlike bootstrap grant/revoke, suspension has no unattended path. */
  suspendedBy: bigint;
  reason: string;
}

export interface SuspendUserAccountResult {
  outcome: "SUSPENDED" | "ALREADY_SUSPENDED";
  userId: bigint;
}

export interface ReactivateUserAccountInput {
  targetUserId: bigint;
  reactivatedBy: bigint;
}

export interface ReactivateUserAccountResult {
  outcome: "REACTIVATED" | "ALREADY_ACTIVE";
  userId: bigint;
}

/**
 * Suspends a user account (Section 10.3): moves `users.status` to
 * `SUSPENDED`, which already causes `resolveAuthenticatedUserByEmail` to
 * reject future sign-in (`status !== "ACTIVE"` → `INACTIVE` resolution) —
 * no separate session-kill mechanism is needed. Refuses to suspend the
 * final ACTIVE platform owner, the same invariant `revokePlatformOwner`
 * enforces, locked the same way. Idempotent when already SUSPENDED. Never
 * touches credentials. Requires a non-empty, bounded reason.
 */
export async function suspendUserAccount(
  input: SuspendUserAccountInput
): Promise<SuspendUserAccountResult> {
  const reason = input.reason.trim();
  if (reason.length === 0) {
    throw new PlatformAdminError("VALIDATION_ERROR", "A suspension reason is required.");
  }
  if (reason.length > MAX_SUSPENSION_REASON_LENGTH) {
    throw new PlatformAdminError(
      "VALIDATION_ERROR",
      `Suspension reason must be ${MAX_SUSPENSION_REASON_LENGTH} characters or fewer.`
    );
  }

  return db.transaction(async (tx) => {
    const [targetUser] = await tx
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, input.targetUserId))
      .limit(1);

    if (!targetUser) {
      throw new PlatformAdminError("NOT_FOUND", "Target user does not exist.");
    }
    if (targetUser.status === "SUSPENDED") {
      return { outcome: "ALREADY_SUSPENDED", userId: input.targetUserId };
    }

    const activeOwners = await tx
      .select({ userId: userPlatformRoles.userId })
      .from(userPlatformRoles)
      .where(
        and(
          eq(userPlatformRoles.role, "PLATFORM_OWNER"),
          eq(userPlatformRoles.status, "ACTIVE")
        )
      )
      .for("update");

    const targetIsActiveOwner = activeOwners.some(
      (owner) => owner.userId === input.targetUserId
    );
    if (targetIsActiveOwner && activeOwners.length <= 1) {
      throw new PlatformAdminError(
        "LAST_PLATFORM_OWNER",
        "Refusing to suspend the final accessible platform owner."
      );
    }

    const previousStatus = targetUser.status;
    const now = new Date();

    await tx
      .update(users)
      .set({ status: "SUSPENDED", updatedAt: now })
      .where(eq(users.id, input.targetUserId));

    await recordAuditEvent(tx, {
      userId: input.suspendedBy,
      action: "USER_SUSPENDED",
      entityType: "user",
      entityId: input.targetUserId,
      details: { previousStatus, nextStatus: "SUSPENDED", reason },
    });

    return { outcome: "SUSPENDED", userId: input.targetUserId };
  });
}

/**
 * Reactivates a suspended (or otherwise non-ACTIVE) user account back to
 * `ACTIVE`. Idempotent when already ACTIVE. Symmetric with
 * `suspendUserAccount` — same transaction shape, same audit action pairing
 * (`USER_REACTIVATED`).
 */
export async function reactivateUserAccount(
  input: ReactivateUserAccountInput
): Promise<ReactivateUserAccountResult> {
  return db.transaction(async (tx) => {
    const [targetUser] = await tx
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, input.targetUserId))
      .limit(1);

    if (!targetUser) {
      throw new PlatformAdminError("NOT_FOUND", "Target user does not exist.");
    }
    if (targetUser.status === "ACTIVE") {
      return { outcome: "ALREADY_ACTIVE", userId: input.targetUserId };
    }

    const previousStatus = targetUser.status;
    const now = new Date();

    await tx
      .update(users)
      .set({ status: "ACTIVE", updatedAt: now })
      .where(eq(users.id, input.targetUserId));

    await recordAuditEvent(tx, {
      userId: input.reactivatedBy,
      action: "USER_REACTIVATED",
      entityType: "user",
      entityId: input.targetUserId,
      details: { previousStatus, nextStatus: "ACTIVE" },
    });

    return { outcome: "REACTIVATED", userId: input.targetUserId };
  });
}
