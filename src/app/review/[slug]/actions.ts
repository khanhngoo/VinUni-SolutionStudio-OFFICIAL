"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import {
  ChallengeWriteError,
  publishApprovedChallenge,
  recordChallengeReviewDecision,
  toChallengeWriteActorContext,
} from "@/services/challenge-write.service";

/**
 * Every action here: (1) re-resolves the current actor, (2) checks
 * INTERNAL_UNIT_MEMBER, (3) calls the existing challenge write service,
 * (4) leaves resource-scoped managing-organization authorization
 * authoritative inside that service (`assertManagingCanWrite`). Reviewer
 * identity always comes from the re-resolved session actor — never from
 * client input.
 */
async function requireInternalUnitActor() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "INTERNAL_UNIT_MEMBER")) redirect("/review");
  return resolution.actor;
}

const DECISIONS = new Set(["APPROVED", "REVISION_REQUESTED", "REJECTED"]);

export async function recordReviewDecisionAction(formData: FormData) {
  const slug = stringValue(formData, "slug");
  const decisionRaw = stringValue(formData, "decision");
  const comments = optionalString(formData, "comments");
  const actor = await requireInternalUnitActor();

  if (!DECISIONS.has(decisionRaw)) {
    redirectWithError(slug, "VALIDATION_ERROR", ["Select a decision (Approve, Request revision, or Reject)."]);
  }

  try {
    await recordChallengeReviewDecision(
      slug,
      {
        comments,
        decision: decisionRaw as "APPROVED" | "REVISION_REQUESTED" | "REJECTED",
      },
      toChallengeWriteActorContext(actor)
    );

    redirect(`/review/${slug}?decided=1`);
  } catch (error) {
    if (error instanceof ChallengeWriteError) {
      redirectWithError(slug, error.code, error.details);
    }
    throw error;
  }
}

export async function publishChallengeAction(formData: FormData) {
  const slug = stringValue(formData, "slug");
  const actor = await requireInternalUnitActor();

  try {
    await publishApprovedChallenge(slug, toChallengeWriteActorContext(actor));
    redirect(`/review/${slug}?published=1`);
  } catch (error) {
    if (error instanceof ChallengeWriteError) {
      redirectWithError(slug, error.code, error.details);
    }
    throw error;
  }
}

/**
 * Redirects back to the review detail page carrying both the error code and
 * `ChallengeWriteError`'s specific validation detail messages (the same gap
 * already closed on the partner authoring/edit forms and the apply form).
 */
function redirectWithError(slug: string, code: string, details: string[] = []): never {
  const params = new URLSearchParams({ error: code });
  if (details.length > 0) params.set("details", details.join("|"));
  redirect(`/review/${slug}?${params.toString()}`);
}

function stringValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(formData: FormData, name: string) {
  const value = stringValue(formData, name);
  return value || null;
}
