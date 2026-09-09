import { eq } from "drizzle-orm";

import {
  hasOneOfActiveOrganizationRoles,
  type AuthenticatedActor,
} from "@/auth/authenticated-actor";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import {
  getOwnedChallengeDetail,
  listApplicationsForOwnerOrganization,
  listOwnedChallenges,
  type PartnerApplicationRead,
  type PartnerChallengeDetailRead,
  type PartnerOwnedChallengeRead,
  type PartnerQueryDatabase,
} from "@/db/queries/partner";
import { toApplicationActorContext } from "@/services/application.service";
import { listWorkspaceProjects, type WorkspaceListItem } from "@/services/workspace.service";

export class PartnerError extends Error {
  constructor(
    public readonly code: "AMBIGUOUS_MEMBERSHIP" | "FORBIDDEN" | "NOT_A_PARTNER",
    message: string
  ) {
    super(message);
    this.name = "PartnerError";
  }
}

/** Roles that may read applications for their own organization's challenges. */
const OWNER_APPLICATION_READ_ROLES = ["ADMIN", "CONTACT_PERSON"] as const;

interface PartnerServiceOptions {
  database?: PartnerQueryDatabase;
}

export type PartnerOrganizationResolution =
  | { kind: "NONE" }
  | { kind: "RESOLVED"; organizationId: bigint }
  | { kind: "AMBIGUOUS"; organizationIds: bigint[] };

/**
 * Resolves the actor's real active EXTERNAL_PARTNER organization membership —
 * never from a display name, email domain, client-selected org, or route
 * parameter. If the actor somehow holds more than one active EXTERNAL_PARTNER
 * membership, this deliberately refuses to guess: no org-switching rule
 * exists yet, so the caller must surface an explicit gap rather than picking
 * one silently.
 */
export function resolvePartnerOrganization(
  actor: AuthenticatedActor
): PartnerOrganizationResolution {
  const organizationIds = Array.from(
    new Set(
      actor.memberships
        .filter((membership) => membership.organizationType === "EXTERNAL_PARTNER")
        .map((membership) => membership.organizationId)
    )
  );

  if (organizationIds.length === 0) return { kind: "NONE" };
  if (organizationIds.length > 1) return { kind: "AMBIGUOUS", organizationIds };
  return { kind: "RESOLVED", organizationId: organizationIds[0] };
}

export interface PartnerOrganizationProfile {
  description: string | null;
  id: bigint;
  industry: string | null;
  name: string;
}

async function getPartnerOrganizationProfile(
  database: PartnerServiceOptions["database"],
  organizationId: bigint
): Promise<PartnerOrganizationProfile> {
  const [row] = await (database ?? db)
    .select({
      description: organizations.description,
      id: organizations.id,
      industry: organizations.industry,
      name: organizations.name,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!row) {
    throw new PartnerError("NOT_A_PARTNER", "Partner organization record was not found.");
  }

  return row;
}

export interface PartnerDashboard {
  applications: PartnerApplicationRead[];
  canReadApplications: boolean;
  challenges: PartnerOwnedChallengeRead[];
  organization: PartnerOrganizationProfile;
  projects: WorkspaceListItem[];
}

/**
 * The whole `/partner` dashboard, scoped strictly to the actor's own
 * EXTERNAL_PARTNER organization membership. Applications reuse the exact
 * owner-role predicate the Phase 5 application policy uses
 * (`hasOneOfActiveOrganizationRoles` with ADMIN/CONTACT_PERSON) rather than
 * granting read access merely because the actor carries the
 * PARTNER_REPRESENTATIVE capability. Projects reuse
 * `listWorkspaceProjects`/its `canAccessProject` policy unmodified.
 */
export async function getPartnerDashboard(
  actor: AuthenticatedActor,
  options: PartnerServiceOptions = {}
): Promise<PartnerDashboard> {
  const database = options.database ?? db;
  const resolution = resolvePartnerOrganization(actor);
  if (resolution.kind === "NONE") {
    throw new PartnerError(
      "NOT_A_PARTNER",
      "Actor has no active EXTERNAL_PARTNER organization membership."
    );
  }
  if (resolution.kind === "AMBIGUOUS") {
    throw new PartnerError(
      "AMBIGUOUS_MEMBERSHIP",
      "Actor holds more than one active EXTERNAL_PARTNER membership; no org-switching rule exists yet."
    );
  }

  const { organizationId } = resolution;
  const canReadApplications = hasOneOfActiveOrganizationRoles(
    actor,
    organizationId,
    OWNER_APPLICATION_READ_ROLES
  );

  const [organization, challenges, applications, projects] = await Promise.all([
    getPartnerOrganizationProfile(database, organizationId),
    listOwnedChallenges(database, organizationId),
    canReadApplications
      ? listApplicationsForOwnerOrganization(database, organizationId)
      : Promise.resolve([]),
    listWorkspaceProjects(toApplicationActorContext(actor), { database }),
  ]);

  return { applications, canReadApplications, challenges, organization, projects };
}

export interface PartnerChallengePage {
  applications: PartnerApplicationRead[];
  canReadApplications: boolean;
  challenge: PartnerChallengeDetailRead;
}

/**
 * A single owned challenge's pipeline view. `getOwnedChallengeDetail` filters
 * by `ownerOrganizationId` in the query itself, so a challenge owned by a
 * different organization simply resolves to `null` here — the same shape as
 * "not found", with no metadata leak.
 */
export async function getPartnerChallengePage(
  actor: AuthenticatedActor,
  identifier: { publicId?: string; slug?: string },
  options: PartnerServiceOptions = {}
): Promise<PartnerChallengePage | null> {
  const database = options.database ?? db;
  const resolution = resolvePartnerOrganization(actor);
  if (resolution.kind !== "RESOLVED") return null;

  const { organizationId } = resolution;
  const challenge = await getOwnedChallengeDetail(database, organizationId, identifier);
  if (!challenge) return null;

  const canReadApplications = hasOneOfActiveOrganizationRoles(
    actor,
    organizationId,
    OWNER_APPLICATION_READ_ROLES
  );
  const applications = canReadApplications
    ? await listApplicationsForOwnerOrganization(database, organizationId, {
        challengeSlug: challenge.slug ?? undefined,
      })
    : [];

  return { applications, canReadApplications, challenge };
}
