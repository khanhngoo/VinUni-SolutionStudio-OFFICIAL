import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";

/**
 * An optional first gate for `/review` — mirrors `PartnerLayout`/
 * `FacultyLayout`. This is NOT the sole authorization boundary: every page
 * and server action under `/review` independently re-resolves the actor
 * and re-checks INTERNAL_UNIT_MEMBER before any sensitive read, and every
 * resource action still relies on the challenge write service's
 * managing-organization authorization (`assertManagingCanWrite`). A Server
 * Component tree can start rendering a page before a sibling layout's
 * `notFound()` is observed (the exact defect Cluster C's D1 fix addressed
 * for `/assessment`), so this layout alone must never be trusted as
 * sufficient.
 */
export default async function ReviewLayout({ children }: { children: React.ReactNode }) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "INTERNAL_UNIT_MEMBER")) notFound();
  return children;
}
