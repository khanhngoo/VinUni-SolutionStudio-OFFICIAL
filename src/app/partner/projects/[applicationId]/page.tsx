import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { toApplicationActorContext } from "@/services/application.service";
import { getWorkspaceDetail, WorkspaceError } from "@/services/workspace.service";

export const dynamic = "force-dynamic";

/**
 * Deliberately not a second implementation of the project detail screen.
 * `/workspace/[applicationId]` already renders the same `ProjectCoreRead`
 * record and already authorizes owner-organization members (ADMIN,
 * CONTACT_PERSON, REVIEWER) through `getWorkspaceDetail`'s policy — the same
 * pattern Cluster B used for a faculty member's confirmed supervision. This
 * route only verifies the actor can reach this project, then redirects to
 * the authoritative page instead of duplicating its access policy or
 * re-inventing milestone/close-out UI that has no backing production write.
 */
export default async function PartnerProjectRedirectPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");

  try {
    const detail = await getWorkspaceDetail(
      applicationId,
      toApplicationActorContext(resolution.actor)
    );
    if (!detail) notFound();
  } catch (error) {
    if (error instanceof WorkspaceError && error.code === "FORBIDDEN") notFound();
    throw error;
  }

  redirect(`/workspace/${applicationId}`);
}
