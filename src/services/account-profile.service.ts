import { db } from "@/db";
import { getOwnMembershipProfile, type OwnMembershipRead } from "@/db/queries/organizations";
import {
  updateOwnMembershipJobTitle,
  type OrganizationMutationDatabase,
} from "@/db/mutations/organizations";
import type { AuthenticatedActor } from "@/auth/authenticated-actor";
import type { organizations } from "@/db/schema";

const MAX_JOB_TITLE_LENGTH = 255;

export type AccountProfileErrorCode = "FORBIDDEN" | "VALIDATION_ERROR";

export class AccountProfileError extends Error {
  readonly code: AccountProfileErrorCode;
  readonly details: string[];

  constructor(code: AccountProfileErrorCode, message: string, details: string[] = []) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "AccountProfileError";
  }
}

export interface OrganizationMemberProfileView {
  email: string;
  fullName: string;
  memberships: OwnMembershipRead[];
}

type OrganizationType = (typeof organizations.$inferSelect)["organizationType"];

/**
 * A generic organization-member self-profile — deliberately not partner- or
 * review-specific, since a partner rep and an internal-unit member are the
 * same underlying shape (an active `organizationMemberships` row), just a
 * different `organizationType`. Reused by both `/partner/profile` and
 * `/review/profile`.
 */
export async function getOrganizationMemberProfile(
  actor: AuthenticatedActor,
  organizationType: OrganizationType
): Promise<OrganizationMemberProfileView> {
  const hasMembership = actor.memberships.some(
    (membership) => membership.organizationType === organizationType
  );
  if (!hasMembership) {
    throw new AccountProfileError("FORBIDDEN", "You have no active membership of that kind.");
  }

  const memberships = await getOwnMembershipProfile(db, actor.user.userId, organizationType);
  if (memberships.length === 0) {
    throw new AccountProfileError("FORBIDDEN", "You have no active membership of that kind.");
  }

  return {
    email: actor.user.email,
    fullName: actor.user.fullName,
    memberships,
  };
}

export interface AccountProfileServiceOptions {
  database?: OrganizationMutationDatabase;
}

/** Re-verifies the membership belongs to the actor before writing — the form is a convenience, this is the boundary. */
export async function saveMembershipJobTitle(
  input: { jobTitle: string; membershipId: bigint },
  actor: AuthenticatedActor,
  options: AccountProfileServiceOptions = {}
): Promise<void> {
  const owns = actor.memberships.some(
    (membership) => membership.membershipId === input.membershipId
  );
  if (!owns) {
    throw new AccountProfileError("FORBIDDEN", "That membership does not belong to you.");
  }

  const trimmed = input.jobTitle.trim();
  if (trimmed.length > MAX_JOB_TITLE_LENGTH) {
    throw new AccountProfileError("VALIDATION_ERROR", "The profile could not be saved.", [
      `Job title must be ${MAX_JOB_TITLE_LENGTH} characters or fewer.`,
    ]);
  }

  await updateOwnMembershipJobTitle(
    options.database ?? db,
    input.membershipId,
    actor.user.userId,
    trimmed || null
  );
}
