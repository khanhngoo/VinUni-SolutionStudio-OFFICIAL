import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  getAuthenticatedActor,
  hasActorCapability,
} from "@/auth/authenticated-actor";
import { CloseOutForm } from "@/components/partner/close-out-form";
import { Section } from "@/components/ui/section";
import { getPartnerDashboard } from "@/services/partner.service";
import { getWorkspaceDetail } from "@/services/workspace.service";
import { toApplicationActorContext } from "@/services/application.service";

import { submitCloseoutFeedbackAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Closing an engagement out.
 *
 * Optional partner feedback, written while the project is in FINAL_REVIEW —
 * every milestone is done, so it reviews finished work, and it is stored as
 * feedback, separate from the formal final approval. Once the project is
 * COMPLETED the close-out is read-only.
 */
export default async function CloseOutPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;

  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PARTNER_REPRESENTATIVE")) notFound();

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

  const inFinalReview = detail.projectStatus === "FINAL_REVIEW";
  const completed =
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

      {inFinalReview ? (
        <>
          <p className="text-ink-2 mt-2">
            {detail.progress.completed} of {detail.progress.total} milestones
            were completed. Your notes are shown to the team and their
            supervisor in the workspace; the private note is not. Feedback is
            optional and separate from your formal final approval.
          </p>

          <div className="mt-6">
            <CloseOutForm
              action={submitCloseoutFeedbackAction.bind(null, applicationId)}
              applicationId={applicationId}
              memberNames={detail.members.map((member) => member.fullName)}
              teamName={detail.challengeTitle}
            />
          </div>
        </>
      ) : completed ? (
        <Section title="Project complete">
          <div className="bg-card border border-line rounded-card p-5">
            <p className="text-ink-2">
              This project is complete and read-only. Close-out feedback is
              written during final review.
            </p>
            <Link className="inline-block font-semibold mt-3" href={`/workspace/${applicationId}`}>
              View the workspace →
            </Link>
          </div>
        </Section>
      ) : (
        <Section title="Not finished yet">
          <div className="bg-card border border-line rounded-card p-5">
            <p className="text-ink-2">
              This project is still running. Close-out opens once every
              milestone is approved and the project enters final review.
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
