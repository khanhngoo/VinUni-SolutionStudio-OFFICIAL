import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { CloseOutForm } from "@/components/partner/close-out-form";
import { Section } from "@/components/ui/section";
import { getPartnerDashboard } from "@/services/partner.service";
import { getWorkspaceDetail } from "@/services/workspace.service";
import { toApplicationActorContext } from "@/services/application.service";

export const dynamic = "force-dynamic";

/**
 * Closing an engagement out.
 *
 * The last thing a partner does, and the only place the platform asks them
 * what the work was actually worth. Reachable only once the project is
 * finished — a close-out written mid-project would be a review of an unfinished
 * thing.
 */
export default async function CloseOutPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;

  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");

  // Scoped to the actor's own organization, so another partner's project is
  // indistinguishable from one that does not exist.
  const dashboard = await getPartnerDashboard(resolution.actor);
  if (!dashboard) notFound();

  const owned = dashboard.projects.find(
    (project) => project.applicationPublicId === applicationId
  );
  if (!owned) notFound();

  const detail = await getWorkspaceDetail(
    applicationId,
    toApplicationActorContext(resolution.actor)
  );
  if (!detail) notFound();

  const finished =
    detail.projectStatus === "COMPLETED" || detail.projectStatus === "ARCHIVED";

  return (
    <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner/projects">Your projects</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/partner/projects/${applicationId}`}>
          {detail.challengeTitle}
        </Link>
        <span className="mx-1.5">›</span>
        Close out
      </nav>

      <h1 className="mt-3.5">Close out {detail.challengeTitle}</h1>

      {finished ? (
        <>
          <p className="text-ink-2 mt-2">
            {detail.progress.completed} of {detail.progress.total} milestones
            were completed. Your notes go to the team and their supervisor; the
            private note does not.
          </p>

          <div className="mt-6">
            <CloseOutForm
              applicationId={applicationId}
              memberNames={detail.members.map((member) => member.fullName)}
              teamName={detail.challengeTitle}
            />
          </div>
        </>
      ) : (
        <Section title="Not finished yet">
          <div className="bg-card border border-line rounded-card p-5">
            <p className="text-ink-2">
              This project is still running. Close-out opens once the work is
              complete.
            </p>
            <Link
              className="inline-block font-semibold mt-3"
              href={`/partner/projects/${applicationId}`}
            >
              Back to the project →
            </Link>
          </div>
        </Section>
      )}
    </div>
  );
}
