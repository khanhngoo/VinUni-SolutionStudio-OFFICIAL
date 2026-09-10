"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { resolveAuthenticatedUserByEmail } from "@/auth/authenticated-user";
import {
  PlatformAdminError,
  grantPlatformOwner,
  revokePlatformOwner,
} from "@/services/platform-admin.service";

/**
 * Both actions re-resolve the current actor from the session and re-check
 * `PLATFORM_OWNER` independently of the `/admin` layout gate (Section 13.3).
 * The acting owner's ID always comes from this re-resolved session actor —
 * never from client-submitted form data.
 */
async function requirePlatformOwnerActor() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) redirect("/admin");
  return resolution.actor;
}

export async function grantOwnerAction(formData: FormData) {
  const actor = await requirePlatformOwnerActor();
  const email = stringValue(formData, "email");
  const confirmed = formData.get("confirm") === "on";

  if (!confirmed) {
    redirectWithError("VALIDATION_ERROR", ["Confirm before granting platform-owner access."]);
  }
  if (!email) {
    redirectWithError("VALIDATION_ERROR", ["Enter the account's email address."]);
  }

  const resolution = await resolveAuthenticatedUserByEmail(email);
  if (resolution.status !== "RESOLVED") {
    redirectWithError("NOT_FOUND", ["No active account matches that email."]);
  }

  try {
    await grantPlatformOwner({
      targetUserId: resolution.user.userId,
      grantedBy: actor.user.userId,
      allowAdditionalOwner: true,
    });
    redirect("/admin/access?granted=1");
  } catch (error) {
    if (error instanceof PlatformAdminError) redirectWithError(error.code, [error.message]);
    throw error;
  }
}

export async function revokeOwnerAction(formData: FormData) {
  const actor = await requirePlatformOwnerActor();
  const targetUserId = bigintValue(formData, "targetUserId");
  const confirmed = formData.get("confirm") === "on";

  if (!confirmed) {
    redirectWithError("VALIDATION_ERROR", ["Confirm before revoking platform-owner access."]);
  }

  try {
    await revokePlatformOwner({ targetUserId, revokedBy: actor.user.userId });
    redirect("/admin/access?revoked=1");
  } catch (error) {
    if (error instanceof PlatformAdminError) redirectWithError(error.code, [error.message]);
    throw error;
  }
}

function redirectWithError(code: string, details: string[] = []): never {
  const params = new URLSearchParams({ error: code });
  if (details.length > 0) params.set("details", details.join("|"));
  redirect(`/admin/access?${params.toString()}`);
}

function stringValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function bigintValue(formData: FormData, name: string): bigint {
  const value = stringValue(formData, name);
  if (!/^\d+$/.test(value)) redirectWithError("VALIDATION_ERROR", ["Missing target user."]);
  return BigInt(value);
}
