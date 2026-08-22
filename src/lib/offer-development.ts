import { getDevelopmentOfferActor } from "@/services/offer.service";

export async function getTemporaryOfferViewer() {
  return getDevelopmentOfferActor("JORDAN_STUDENT_DEMO");
}
