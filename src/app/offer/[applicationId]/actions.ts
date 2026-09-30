"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedActor } from "@/auth/authenticated-actor";
import { toApplicationActorContext } from "@/services/application.service";
import {
  acceptChallengeNda,
  OfferError,
  respondToOffer,
  type OfferResponse,
} from "@/services/offer.service";

export async function respondToOfferForAuthenticatedActor(
  applicationPublicId: string,
  response: OfferResponse
) {
  const actor = toApplicationActorContext(await requireAuthenticatedActor());
  try {
    await respondToOffer(applicationPublicId, response, actor);
  } catch (error) {
    if (error instanceof OfferError) return offerErrorMessage(error);
    throw error;
  }
  revalidatePath(`/offer/${applicationPublicId}`);
  return null;
}

export async function acceptNdaForAuthenticatedActor(
  applicationPublicId: string,
  signature: string
) {
  const actor = toApplicationActorContext(await requireAuthenticatedActor());
  try {
    await acceptChallengeNda(applicationPublicId, signature, actor);
  } catch (error) {
    if (error instanceof OfferError) return offerErrorMessage(error);
    throw error;
  }
  revalidatePath(`/offer/${applicationPublicId}`);
  return null;
}

function offerErrorMessage(error: OfferError) {
  if (error.code === "FORBIDDEN" || error.code === "NOT_FOUND") {
    return "This offer is no longer available to you.";
  }
  return error.message;
}
