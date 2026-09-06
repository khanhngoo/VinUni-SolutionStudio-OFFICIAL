"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import {
  FacultyProfileError,
  saveFacultyMaxSupervisions,
} from "@/services/faculty-profile.service";

/**
 * Saves supervision capacity and returns to the record.
 *
 * Returns a message rather than throwing so the editor can show it above the
 * form with the typed value still in place.
 */
export async function saveFacultyProfile(input: {
  maxActiveSupervisions: number;
}): Promise<string | null> {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") {
    return "Your session has expired. Sign in again.";
  }

  try {
    await saveFacultyMaxSupervisions(input, resolution.actor);
  } catch (error) {
    if (error instanceof FacultyProfileError) {
      return error.details.length > 0 ? error.details.join(" ") : error.message;
    }
    throw error;
  }

  redirect("/faculty/profile");
}
