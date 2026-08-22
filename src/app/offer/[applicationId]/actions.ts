"use server";

import { revalidatePath } from "next/cache";

import { getTemporaryOfferViewer } from "@/lib/offer-development";
import { respondToOffer, type OfferResponse } from "@/services/offer.service";

export async function respondToOfferForDevelopmentViewer(
  applicationPublicId: string,
  response: OfferResponse
) {
  const actor = await getTemporaryOfferViewer();
  await respondToOffer(applicationPublicId, response, actor);
  revalidatePath(`/offer/${applicationPublicId}`);
}
