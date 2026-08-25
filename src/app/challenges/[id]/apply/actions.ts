"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import {
  ApplicationError,
  createApplication,
  toApplicationActorContext,
} from "@/services/application.service";

export async function submitApplication(formData: FormData) {
  const challengeSlug = stringValue(formData, "challengeSlug");
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");

  try {
    const application = await createApplication(
      {
        challengeSlug,
        leaderAvailabilityConfirmed: formData.get("availabilityConfirmed") === "on",
        leaderCommittedHoursPerWeek: optionalInteger(formData, "committedHours"),
        leaderPreferredRole: optionalString(formData, "preferredRole"),
        members: teammateEmails(formData).map((studentEmail) => ({
          status: "INVITED" as const,
          studentEmail,
        })),
        motivation: stringValue(formData, "motivation"),
        relevantExperience: optionalString(formData, "relevantExperience"),
        teamName: optionalString(formData, "teamName"),
      },
      toApplicationActorContext(resolution.actor)
    );

    redirect(`/challenges/${challengeSlug}/apply?submitted=${application.publicId}`);
  } catch (error) {
    if (error instanceof ApplicationError) {
      redirectWithError(challengeSlug, error.code, error.details);
    }

    throw error;
  }
}

/**
 * Redirects back to the apply form carrying both the error code and
 * `ApplicationError`'s specific validation detail messages — without these,
 * a `VALIDATION_ERROR` collapsed every possible cause (missing team name,
 * team size out of range, missing motivation, ...) into one generic
 * sentence (the same gap already closed on the partner authoring forms).
 */
function redirectWithError(challengeSlug: string, code: string, details: string[] = []): never {
  const params = new URLSearchParams({ error: code });
  if (details.length > 0) params.set("details", details.join("|"));
  redirect(`/challenges/${challengeSlug}/apply?${params.toString()}`);
}

function stringValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function optionalString(formData: FormData, name: string) {
  const value = stringValue(formData, name).trim();
  return value || null;
}

function optionalInteger(formData: FormData, name: string) {
  const value = optionalString(formData, name);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function teammateEmails(formData: FormData) {
  return stringValue(formData, "teammateEmails")
    .split(/\r?\n|,/)
    .map((email) => email.trim())
    .filter(Boolean);
}
