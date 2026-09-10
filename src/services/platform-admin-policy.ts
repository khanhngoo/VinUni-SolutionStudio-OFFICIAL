import {
  hasActorCapability,
  type AuthenticatedActor,
} from "@/auth/authenticated-actor";

/**
 * Phase 6.6 global platform authority checks.
 *
 * `PLATFORM_OWNER` is never a universal authorization bypass: existing
 * domain policies (challenge, application, offer, workspace, faculty,
 * partner, review) keep their current logic unchanged. Each global admin
 * console query or mutation must call one of these helpers explicitly and
 * define its own read/write scope — do not add
 * `if (hasPlatformOwnerCapability(actor)) return true` to an unrelated
 * domain policy.
 */
export function hasPlatformOwnerCapability(actor: AuthenticatedActor) {
  return hasActorCapability(actor, "PLATFORM_OWNER");
}

export class PlatformOwnerRequiredError extends Error {
  constructor() {
    super("Platform owner authority is required for this operation.");
    this.name = "PlatformOwnerRequiredError";
  }
}

export function requirePlatformOwner(actor: AuthenticatedActor) {
  if (!hasPlatformOwnerCapability(actor)) {
    throw new PlatformOwnerRequiredError();
  }
}
