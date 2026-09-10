import { db } from "@/db";
import { auditLogs } from "@/db/schema";

/**
 * The Phase 6.6 event catalog (`context/admin-console-implementation-plan.md`
 * Section 11.3). Only add a code here for a real, implemented production
 * mutation — never fabricate an event for a flow that does not exist yet.
 */
export const AUDIT_ACTIONS = [
  // Platform access
  "PLATFORM_OWNER_BOOTSTRAPPED",
  "PLATFORM_OWNER_GRANTED",
  "PLATFORM_OWNER_REVOKED",
  "USER_SUSPENDED",
  "USER_REACTIVATED",
  // Organizations
  "ORGANIZATION_VERIFIED",
  "ORGANIZATION_REJECTED",
  "ORGANIZATION_MEMBERSHIP_ADDED",
  "ORGANIZATION_MEMBERSHIP_REACTIVATED",
  "ORGANIZATION_MEMBERSHIP_DEACTIVATED",
  // Challenges
  "CHALLENGE_CREATED",
  "CHALLENGE_SUBMITTED",
  "CHALLENGE_REVIEWED",
  "CHALLENGE_REVISION_REQUESTED",
  "CHALLENGE_APPROVED",
  "CHALLENGE_PUBLISHED",
  // Downstream workflow
  "APPLICATION_SUBMITTED",
  "APPLICATION_STATUS_CHANGED",
  "ASSESSMENT_SUBMITTED",
  "ASSESSMENT_REVIEWED",
  "SELECTION_CREATED",
  "OFFER_CREATED",
  "OFFER_ACCEPTED",
  "OFFER_DECLINED",
  "PROJECT_CREATED",
  "PROJECT_STATUS_CHANGED",
  "MILESTONE_STATUS_CHANGED",
  "PROJECT_COMPLETED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * As of this checkpoint only `"user"` (Checkpoint C) and `"challenge"`
 * (Checkpoint E) are actually written. The remaining entries name the
 * entities Section 11.3's catalog anticipates for later checkpoints so this
 * type does not need to keep widening ad hoc.
 */
export const AUDIT_ENTITY_TYPES = [
  "user",
  "organization",
  "challenge",
  "application",
  "assessment",
  "offer",
  "project",
  "milestone",
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export interface AuditEventInput {
  /** The authoritative acting user, or `null` only for an approved system/bootstrap path. */
  userId: bigint | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: bigint | null;
  /** Minimal structured context. Bigint IDs must be serialized as strings; never secrets or content fields. */
  details?: Record<string, unknown>;
}

type AuditExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The one place `audit_logs` rows are written from. Callers must pass the
 * same transaction executor their domain mutation used — this function never
 * opens its own transaction, so the audit row commits or rolls back
 * atomically with the mutation it documents (Section 11.4). Every field
 * comes from the caller's own authoritative service state, never from a
 * client-supplied actor or entity identity.
 */
export async function recordAuditEvent(
  executor: AuditExecutor,
  event: AuditEventInput
): Promise<void> {
  await executor.insert(auditLogs).values({
    userId: event.userId,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    details: event.details ?? {},
  });
}
