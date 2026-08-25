import type { AuthenticatedActor } from "@/auth/authenticated-actor";
import { hasOneOfActiveOrganizationRoles } from "@/auth/authenticated-actor";
import { db } from "@/db";
import {
  getReviewChallengeDetail,
  listReviewQueue,
  type ReviewChallengeDetailRead,
  type ReviewQueryDatabase,
  type ReviewQueueItem,
} from "@/db/queries/review";

export class ReviewError extends Error {
  constructor(
    public readonly code: "FORBIDDEN" | "NOT_A_REVIEWER",
    message: string
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

/** The same managing-write roles `assertManagingCanWrite` enforces in `challenge-write.service.ts`. */
const MANAGING_WRITE_ROLES = ["ADMIN", "PROJECT_MANAGER", "REVIEWER"] as const;

interface ReviewServiceOptions {
  database?: ReviewQueryDatabase;
}

/**
 * Every INTERNAL_UNIT organization the actor holds an active membership in.
 * This is the queue's read-scope boundary: CAID and E-Lab stay separate
 * organization scopes and neither can see the other's submissions through
 * this function, no matter how it is called.
 */
export function resolveInternalUnitOrganizationIds(actor: AuthenticatedActor): bigint[] {
  return Array.from(
    new Set(
      actor.memberships
        .filter((membership) => membership.organizationType === "INTERNAL_UNIT")
        .map((membership) => membership.organizationId)
    )
  );
}

export interface ReviewQueue {
  approved: ReviewQueueItem[];
  needsReview: ReviewQueueItem[];
}

/**
 * `/review` queue — scoped strictly to the actor's own active INTERNAL_UNIT
 * memberships. An actor with no INTERNAL_UNIT membership at all gets a
 * clean `ReviewError`, the same defensive pattern
 * `getPartnerDashboard`/`PartnerError` uses for `/partner`.
 */
export async function getReviewQueue(
  actor: AuthenticatedActor,
  options: ReviewServiceOptions = {}
): Promise<ReviewQueue> {
  const organizationIds = resolveInternalUnitOrganizationIds(actor);
  if (organizationIds.length === 0) {
    throw new ReviewError(
      "NOT_A_REVIEWER",
      "Actor has no active INTERNAL_UNIT organization membership."
    );
  }

  return listReviewQueue(options.database ?? db, organizationIds);
}

export interface ReviewChallengePage {
  canPublish: boolean;
  canReview: boolean;
  challenge: ReviewChallengeDetailRead;
}

/**
 * A single challenge for the review runtime. The detail read itself is
 * scoped by `managingOrganizationId` per organization membership — a
 * challenge managed by an organization the actor does not belong to
 * resolves to `null` (see `getReviewChallengeDetail`), so a direct URL
 * guess from an unrelated internal unit (e.g. E-Lab guessing a CAID-managed
 * slug) denies cleanly with no metadata leak.
 *
 * `canReview`/`canPublish` are read-side conveniences for the UI only — the
 * actual review/publish server actions re-check authorization independently
 * through `assertManagingCanWrite` inside `challenge-write.service.ts`, so
 * this flag is never authoritative on its own.
 */
export async function getReviewChallengePage(
  actor: AuthenticatedActor,
  slug: string,
  options: ReviewServiceOptions = {}
): Promise<ReviewChallengePage | null> {
  const organizationIds = resolveInternalUnitOrganizationIds(actor);
  if (organizationIds.length === 0) return null;

  const database = options.database ?? db;

  // Try each of the actor's INTERNAL_UNIT organizations — a challenge only
  // matches the one that is its actual managing organization, so this never
  // reveals whether the slug exists under an organization the actor is not
  // a member of.
  for (const organizationId of organizationIds) {
    const challenge = await getReviewChallengeDetail(database, organizationId, slug.trim());
    if (!challenge) continue;

    return {
      canPublish: hasOneOfActiveOrganizationRoles(actor, organizationId, MANAGING_WRITE_ROLES),
      canReview: hasOneOfActiveOrganizationRoles(actor, organizationId, MANAGING_WRITE_ROLES),
      challenge,
    };
  }

  return null;
}
