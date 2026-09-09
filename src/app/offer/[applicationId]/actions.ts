"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedActor } from "@/auth/authenticated-actor";
import { toApplicationActorContext } from "@/services/application.service";
import { acceptChallengeNda, respondToOffer, type OfferResponse } from "@/services/offer.service";

export async function respondToOfferForAuthenticatedActor(
  applicationPublicId: string,
  response: OfferResponse
) {
  const actor = toApplicationActorContext(await requireAuthenticatedActor());
  await respondToOffer(applicationPublicId, response, actor);
  revalidatePath(`/offer/${applicationPublicId}`);
}

export async function acceptNdaForAuthenticatedActor(
  applicationPublicId: string,
  signature: string
) {
  const actor = toApplicationActorContext(await requireAuthenticatedActor());
  await acceptChallengeNda(applicationPublicId, signature, actor);
  revalidatePath(`/offer/${applicationPublicId}`);
}
