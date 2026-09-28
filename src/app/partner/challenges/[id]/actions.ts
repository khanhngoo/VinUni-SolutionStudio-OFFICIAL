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
import {
  CandidateAccessError,
  grantCandidateAccess,
  revokeCandidateAccess,
} from "@/services/challenge-access.service";

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
        visibility: visibilityValue(formData),
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

export async function grantCandidateAccessAction(formData: FormData) {
  const slug = stringValue(formData, "slug");
  const candidateEmail = stringValue(formData, "candidateEmail");
  const expiresAt = campusDateTimeValue(formData, "expiresAt");
  const actor = await requirePartnerActor();

  if (!expiresAt) redirectWithAccessResult(slug, "invalid");

  try {
    await grantCandidateAccess(
      { candidateEmail, challengeSlug: slug, expiresAt },
      actor
    );
    redirectWithAccessResult(slug, "granted");
  } catch (error) {
    if (error instanceof CandidateAccessError) {
      redirectWithAccessResult(
        slug,
        error.code === "FORBIDDEN" || error.code === "NOT_FOUND"
          ? "denied"
          : error.message.includes("identity")
            ? "candidate"
            : error.code === "CONFLICT"
              ? "conflict"
              : "invalid"
      );
    }
    throw error;
  }
}

export async function revokeCandidateAccessAction(formData: FormData) {
  const slug = stringValue(formData, "slug");
  const accessIdRaw = stringValue(formData, "accessId");
  const actor = await requirePartnerActor();

  let accessId: bigint;
  try {
    accessId = BigInt(accessIdRaw);
    if (accessId < BigInt(1)) throw new RangeError();
  } catch {
    redirectWithAccessResult(slug, "invalid");
  }

  try {
    await revokeCandidateAccess({ accessId, challengeSlug: slug }, actor);
    redirectWithAccessResult(slug, "revoked");
  } catch (error) {
    if (error instanceof CandidateAccessError) {
      redirectWithAccessResult(
        slug,
        error.code === "CONFLICT" ? "application" : "denied"
      );
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

const CHALLENGE_VISIBILITIES = new Set([
  "PUBLIC_PREVIEW",
  "VINUNI_ONLY",
  "INVITE_ONLY",
  "PRIVATE",
]);
function visibilityValue(formData: FormData) {
  const value = stringValue(formData, "visibility");
  return CHALLENGE_VISIBILITIES.has(value)
    ? (value as "PUBLIC_PREVIEW" | "VINUNI_ONLY" | "INVITE_ONLY" | "PRIVATE")
    : undefined;
}

function campusDateTimeValue(formData: FormData, name: string) {
  const value = stringValue(formData, name);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function redirectWithAccessResult(slug: string, result: string): never {
  const params = new URLSearchParams({ access: result });
  redirect(`/partner/challenges/${slug}?${params.toString()}`);
}
