"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import {
  ChallengeWriteError,
  createChallengeDraft,
  toChallengeWriteActorContext,
  type ChallengeSkillWriteInput,
} from "@/services/challenge-write.service";
import { PartnerError, resolvePartnerOrganization } from "@/services/partner.service";

/**
 * Creates a challenge draft from `/partner/post`. Every field the actor
 * does not explicitly author server-side is re-resolved here, never trusted
 * from form input:
 *
 * - the authenticated actor is re-resolved from the session, not a hidden
 *   form field;
 * - the owner organization comes from `resolvePartnerOrganization`, which
 *   reads the actor's real active EXTERNAL_PARTNER membership — the browser
 *   never supplies `ownerOrganizationId`;
 * - `contactPersonId` is left undefined so the write service defaults it to
 *   the resolved actor's own user id (see `createChallengeDraft`'s
 *   `validateCreateOwnership`, which rejects any other value).
 *
 * The managing organization and canonical skills are form input, but both
 * are re-validated by `createChallengeDraft` itself (managing organization
 * type must be INTERNAL_UNIT; skill names must resolve to active canonical
 * skills) — this action never bypasses that.
 */
export async function createChallengeDraftAction(formData: FormData) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");

  const actor = resolution.actor;
  if (!hasActorCapability(actor, "PARTNER_REPRESENTATIVE")) {
    redirectWithError("FORBIDDEN");
  }

  const ownerResolution = resolvePartnerOrganization(actor);
  if (ownerResolution.kind !== "RESOLVED") {
    redirectWithError("FORBIDDEN");
  }

  const managingOrganizationRaw = stringValue(formData, "managingOrganizationId");
  let managingOrganizationId: bigint;
  try {
    managingOrganizationId = BigInt(managingOrganizationRaw);
  } catch {
    redirectWithError("VALIDATION_ERROR", ["Select a managing organization."]);
  }

  const skills = parseSkills(formData);

  try {
    const created = await createChallengeDraft(
      {
        applicationDeadline: dateValue(formData, "applicationDeadline"),
        compensationType: compensationTypeValue(formData),
        description: stringValue(formData, "description"),
        domain: optionalString(formData, "domain"),
        durationWeeks: optionalInteger(formData, "durationWeeks"),
        managingOrganizationId,
        ownerOrganizationId: ownerResolution.organizationId,
        skills,
        startDate: optionalString(formData, "startDate"),
        subtype: optionalString(formData, "subtype"),
        summary: stringValue(formData, "summary"),
        teamSizeMax: optionalInteger(formData, "teamSizeMax"),
        teamSizeMin: optionalInteger(formData, "teamSizeMin"),
        title: stringValue(formData, "title"),
        weeklyHours: optionalInteger(formData, "weeklyHours"),
        workMode: workModeValue(formData),
      },
      toChallengeWriteActorContext(actor)
    );

    redirect(`/partner/challenges/${created.slug}?created=1`);
  } catch (error) {
    if (error instanceof ChallengeWriteError) {
      redirectWithError(error.code, error.details);
    }
    if (error instanceof PartnerError) {
      redirectWithError("FORBIDDEN");
    }
    // Unexpected/system failures must still surface for diagnostics rather
    // than being swallowed into a friendly message (the D1 lesson, applied
    // in the other direction).
    throw error;
  }
}

/**
 * Redirects to the post form carrying both the error code (mapped to a
 * friendly headline by the page) and the specific validation detail
 * messages `ChallengeWriteError` already carries — without these, a
 * `VALIDATION_ERROR` collapsed every possible cause into one generic
 * sentence, leaving the actor unable to tell which field actually failed.
 */
function redirectWithError(code: string, details: string[] = []): never {
  const params = new URLSearchParams({ error: code });
  if (details.length > 0) params.set("details", details.join("|"));
  redirect(`/partner/post?${params.toString()}`);
}

function parseSkills(formData: FormData): ChallengeSkillWriteInput[] {
  const raw = stringValue(formData, "skillsJson");
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [{ canonicalName: "__invalid_skills_payload__", requirementType: "REQUIRED" }];
  }

  if (!Array.isArray(parsed)) return [];

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
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function dateValue(formData: FormData, name: string) {
  const value = stringValue(formData, name);
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const COMPENSATION_TYPES = new Set(["PAID", "UNPAID", "CREDIT", "OTHER", "NOT_SPECIFIED"]);
function compensationTypeValue(formData: FormData) {
  const value = stringValue(formData, "compensationType");
  return COMPENSATION_TYPES.has(value)
    ? (value as "PAID" | "UNPAID" | "CREDIT" | "OTHER" | "NOT_SPECIFIED")
    : undefined;
}

const WORK_MODES = new Set(["ONSITE", "HYBRID", "REMOTE"]);
function workModeValue(formData: FormData) {
  const value = stringValue(formData, "workMode");
  return WORK_MODES.has(value) ? (value as "ONSITE" | "HYBRID" | "REMOTE") : null;
}
