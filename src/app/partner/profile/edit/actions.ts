"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { AccountProfileError, saveMembershipJobTitle } from "@/services/account-profile.service";

/**
 * Saves a membership's job title and returns to the record.
 *
 * Returns a message rather than throwing so the editor can show it above the
 * form with the typed value still in place.
 */
export async function savePartnerProfile(input: {
  jobTitle: string;
  membershipId: string;
}): Promise<string | null> {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") {
    return "Your session has expired. Sign in again.";
  }

  try {
    await saveMembershipJobTitle(
      { jobTitle: input.jobTitle, membershipId: BigInt(input.membershipId) },
      resolution.actor
    );
  } catch (error) {
    if (error instanceof AccountProfileError) {
      return error.details.length > 0 ? error.details.join(" ") : error.message;
    }
    throw error;
  }

  redirect("/partner/profile");
}
