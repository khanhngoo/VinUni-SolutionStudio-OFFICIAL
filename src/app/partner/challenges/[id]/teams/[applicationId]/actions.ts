"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { issueSelectionOffer, OfferError } from "@/services/offer.service";

/**
 * Every submit re-resolves the actor and re-checks the capability
 * independently, matching the sibling `/partner/challenges/[id]` actions.
 * Cross-organization write authorization is still enforced authoritatively
 * inside `issueSelectionOffer` (`assertOwnerCanSelect`).
 */
async function requirePartnerActor() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PARTNER_REPRESENTATIVE")) redirect("/partner");
  return resolution.actor;
}

export async function issueSelectionOfferAction(formData: FormData) {
  const slug = stringValue(formData, "slug");
  const applicationId = stringValue(formData, "applicationId");
  const actor = await requirePartnerActor();

  try {
    await issueSelectionOffer(
      applicationId,
      {
        compensationNote: optionalString(formData, "compensationNote"),
        durationWeeks: optionalInteger(formData, "durationWeeks"),
        hoursPerWeek: optionalInteger(formData, "hoursPerWeek"),
        ndaRequired: formData.get("ndaRequired") === "on",
        respondByWorkingDays: optionalInteger(formData, "respondByWorkingDays") ?? 5,
        startDate: optionalString(formData, "startDate"),
      },
      actor
    );
    redirect(`/partner/challenges/${slug}/teams/${applicationId}?offer=issued`);
  } catch (error) {
    if (error instanceof OfferError) {
      redirect(
        `/partner/challenges/${slug}/teams/${applicationId}?offer=error&code=${error.code}`
      );
    }
    throw error;
  }
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
