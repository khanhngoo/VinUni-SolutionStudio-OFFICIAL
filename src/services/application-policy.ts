import type { ApplicationDetailRead } from "@/db/queries/applications";

export interface ApplicationActorMembership {
  organizationId: bigint;
  role: string;
  status: string;
}

export interface ApplicationAccessActor {
  memberships: ApplicationActorMembership[];
  userId: bigint;
}

const OWNER_APPLICATION_ROLES = new Set(["ADMIN", "CONTACT_PERSON"]);
const MANAGING_APPLICATION_ROLES = new Set([
  "ADMIN",
  "PROJECT_MANAGER",
  "REVIEWER",
]);

export function isApplicationMember(
  application: Pick<ApplicationDetailRead, "members">,
  actor: Pick<ApplicationAccessActor, "userId">
) {
  return application.members.some((member) =>
    sameId(member.student.userId, actor.userId)
  );
}

export function canAccessApplicationDetail(
  application: Pick<ApplicationDetailRead, "challenge" | "members">,
  actor: ApplicationAccessActor
) {
  if (isApplicationMember(application, actor)) return true;

  if (
    hasActiveMembership(
      actor,
      application.challenge.ownerOrganizationId,
      OWNER_APPLICATION_ROLES
    )
  ) {
    return true;
  }

  return hasActiveMembership(
    actor,
    application.challenge.managingOrganizationId,
    MANAGING_APPLICATION_ROLES
  );
}

export function canAccessChallengeApplications(
  challenge: Pick<
    ApplicationDetailRead["challenge"],
    "managingOrganizationId" | "ownerOrganizationId"
  >,
  actor: ApplicationAccessActor
) {
  if (
    hasActiveMembership(
      actor,
      challenge.ownerOrganizationId,
      OWNER_APPLICATION_ROLES
    )
  ) {
    return true;
  }

  return hasActiveMembership(
    actor,
    challenge.managingOrganizationId,
    MANAGING_APPLICATION_ROLES
  );
}

function hasActiveMembership(
  actor: ApplicationAccessActor,
  organizationId: bigint,
  allowedRoles: Set<string>
) {
  return actor.memberships.some(
    (membership) =>
      membership.status === "ACTIVE" &&
      sameId(membership.organizationId, organizationId) &&
      allowedRoles.has(membership.role)
  );
}

function sameId(a: bigint, b: bigint) {
  return a.toString() === b.toString();
}
