"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import {
  ChallengeWriteError,
  submitChallengeForReview,
  toChallengeWriteActorContext,
  updateChallengeDraft,
  type ChallengeSkillWriteInput,
} from "@/services/challenge-write.service";

/**
 * Every submit re-resolves the actor and re-checks the capability
 * independently — this action never trusts that a layout/page gate already
 * ran, and it never accepts an actor/owner/role identity from form input.
 * Cross-organization write authorization is still enforced authoritatively
 * inside `updateChallengeDraft`/`submitChallengeForReview`
 * (`assertOwnerCanWrite`).
 */
async function requirePartnerActor() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PARTNER_REPRESENTATIVE")) redirect("/partner");
  return resolution.actor;
}

export async function updateChallengeDraftAction(formData: FormData) {
  const slug = stringValue(formData, "slug");
  const actor = await requirePartnerActor();

  try {
    await updateChallengeDraft(
      slug,
      {
        description: stringValue(formData, "description"),
        domain: optionalString(formData, "domain"),
        durationWeeks: optionalInteger(formData, "durationWeeks"),
        skills: parseSkills(formData),
        subtype: optionalString(formData, "subtype"),
        summary: stringValue(formData, "summary"),
        teamSizeMax: optionalInteger(formData, "teamSizeMax"),
        teamSizeMin: optionalInteger(formData, "teamSizeMin"),
        title: stringValue(formData, "title"),
        weeklyHours: optionalInteger(formData, "weeklyHours"),
      },
      toChallengeWriteActorContext(actor)
    );

    redirect(`/partner/challenges/${slug}?updated=1`);
  } catch (error) {
    if (error instanceof ChallengeWriteError) {
      redirectWithError(slug, error.code, error.details);
    }
    throw error;
  }
}

export async function submitChallengeForReviewAction(formData: FormData) {
  const slug = stringValue(formData, "slug");
  const actor = await requirePartnerActor();

  try {
    await submitChallengeForReview(slug, toChallengeWriteActorContext(actor));
    redirect(`/partner/challenges/${slug}?submitted=1`);
  } catch (error) {
    if (error instanceof ChallengeWriteError) {
      redirectWithError(slug, error.code, error.details);
    }
    throw error;
  }
}

/**
 * Redirects back to the challenge detail page carrying both the error code
 * and `ChallengeWriteError`'s specific validation detail messages — without
 * these, a `VALIDATION_ERROR` collapsed every possible cause into one
 * generic sentence (the same gap already closed on `/partner/post`).
 */
function redirectWithError(slug: string, code: string, details: string[] = []): never {
  const params = new URLSearchParams({ error: code });
  if (details.length > 0) params.set("details", details.join("|"));
  redirect(`/partner/challenges/${slug}?${params.toString()}`);
}

function parseSkills(formData: FormData): ChallengeSkillWriteInput[] | undefined {
  const raw = formData.get("skillsJson");
  if (typeof raw !== "string" || !raw) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [{ canonicalName: "__invalid_skills_payload__", requirementType: "REQUIRED" }];
  }

  if (!Array.isArray(parsed)) return undefined;

  return parsed
    .filter(
      (item): item is { canonicalName: string; requirementType: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).canonicalName === "string" &&
        typeof (item as Record<string, unknown>).requirementType === "string"
    )
    .map((item) => ({
      canonicalName: item.canonicalName,
      requirementType: item.requirementType === "PREFERRED" ? "PREFERRED" : "REQUIRED",
    }));
}

function stringValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(formData: FormData, name: string) {
  const value = stringValue(formData, name);
  return value || null;
}

function optionalInteger(formData: FormData, name: string) {
  const value = stringValue(formData, name);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}
