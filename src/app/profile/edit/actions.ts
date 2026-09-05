"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import {
  StudentProfileError,
  saveStudentProfile,
} from "@/services/student-profile.service";

/**
 * Saves the profile and returns to the record.
 *
 * Returns a message rather than throwing so the editor can show it above the
 * form with everything the student typed still in place.
 */
export async function saveProfile(input: {
  about: string;
  hoursAvailable: number;
  portfolioUrl: string;
  preferredTeamMax: number;
  preferredTeamMin: number;
  roles: string[];
  weeklyAvailability: string[];
  workPreference: string;
}): Promise<string | null> {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") {
    return "Your session has expired. Sign in again.";
  }

  try {
    await saveStudentProfile(input, resolution.actor);
  } catch (error) {
    if (error instanceof StudentProfileError) {
      return error.details.length > 0 ? error.details.join(" ") : error.message;
    }
    throw error;
  }

  redirect("/profile");
}
