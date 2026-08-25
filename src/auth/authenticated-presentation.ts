import { hasActorCapability, type AuthenticatedActor } from "./authenticated-actor";

/** A serializable, display-only view of the authenticated actor for server-rendered UI. */
export interface AuthenticatedPresentation {
  displayName: string;
  initials: string;
  /**
   * Display-only: whether the shared nav should surface a "Review" link.
   * Authorization for `/review` itself never depends on this flag — every
   * page/action there re-resolves the actor and re-checks the
   * INTERNAL_UNIT_MEMBER capability independently.
   */
  isInternalUnitMember: boolean;
}

export function authenticatedPresentation(
  actor: AuthenticatedActor
): AuthenticatedPresentation {
  return {
    displayName: actor.user.fullName,
    initials: initialsForName(actor.user.fullName),
    isInternalUnitMember: hasActorCapability(actor, "INTERNAL_UNIT_MEMBER"),
  };
}

function initialsForName(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}
