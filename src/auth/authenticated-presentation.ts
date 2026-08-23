import type { AuthenticatedActor } from "./authenticated-actor";

/** A serializable, display-only view of the authenticated actor for server-rendered UI. */
export interface AuthenticatedPresentation {
  displayName: string;
  initials: string;
}

export function authenticatedPresentation(
  actor: AuthenticatedActor
): AuthenticatedPresentation {
  return {
    displayName: actor.user.fullName,
    initials: initialsForName(actor.user.fullName),
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
