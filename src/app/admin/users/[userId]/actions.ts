"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import {
  PlatformAdminError,
  reactivateUserAccount,
  suspendUserAccount,
} from "@/services/platform-admin.service";

/**
 * Both actions re-resolve the current actor from the session and re-check
 * `PLATFORM_OWNER` independently of the `/admin` layout gate (Section
 * 13.3). The acting owner's ID always comes from this re-resolved session
 * actor — never from client-submitted form data.
 */
async function requirePlatformOwnerActor() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) redirect("/admin");
  return resolution.actor;
}

export async function suspendUserAction(formData: FormData) {
  const actor = await requirePlatformOwnerActor();
  const targetUserId = bigintValue(formData, "targetUserId");
  const reason = stringValue(formData, "reason");
  const confirmed = formData.get("confirm") === "on";

  if (!confirmed) {
    redirectWithError(targetUserId, "VALIDATION_ERROR", ["Confirm before suspending this account."]);
  }

  try {
    await suspendUserAccount({
      targetUserId,
      suspendedBy: actor.user.userId,
      reason,
    });
    redirect(`/admin/users/${targetUserId}?suspended=1`);
  } catch (error) {
    if (error instanceof PlatformAdminError) redirectWithError(targetUserId, error.code, [error.message]);
    throw error;
  }
}

export async function reactivateUserAction(formData: FormData) {
  const actor = await requirePlatformOwnerActor();
  const targetUserId = bigintValue(formData, "targetUserId");

  try {
    await reactivateUserAccount({
      targetUserId,
      reactivatedBy: actor.user.userId,
    });
    redirect(`/admin/users/${targetUserId}?reactivated=1`);
  } catch (error) {
    if (error instanceof PlatformAdminError) redirectWithError(targetUserId, error.code, [error.message]);
    throw error;
  }
}

function redirectWithError(targetUserId: bigint, code: string, details: string[] = []): never {
  const params = new URLSearchParams({ error: code });
  if (details.length > 0) params.set("details", details.join("|"));
  redirect(`/admin/users/${targetUserId}?${params.toString()}`);
}

function stringValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function bigintValue(formData: FormData, name: string): bigint {
  const value = stringValue(formData, name);
  if (!/^\d+$/.test(value)) redirect("/admin/users");
  return BigInt(value);
}
