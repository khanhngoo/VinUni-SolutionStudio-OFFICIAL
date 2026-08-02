"use server";

import { isRevealed } from "@/lib/pipeline";
import { getApplicationById } from "@/lib/queries";

/**
 * Returns a masked credential only when the caller's application has actually
 * been revealed. Keeping this on the server means the secret never sits in the
 * page payload waiting to be read out of view-source — the request-to-reveal
 * gate (PRD §11) is enforced rather than merely drawn.
 */
export async function revealCredential(
  applicationId: string,
  resourceName: string,
): Promise<string | null> {
  const application = getApplicationById(applicationId);
  if (!application || !isRevealed(application) || !application.project) {
    return null;
  }

  const resource = application.project.resources.find(
    (r) => r.name === resourceName,
  );
  return resource?.masked ?? null;
}
