import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { GroupHeading } from "@/components/partner/group-heading";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { toMeeting, toMilestone } from "@/lib/apply-view";
import { formatDate } from "@/lib/dates";
import { getPartnerDashboard } from "@/services/partner.service";
import { getWorkspaceDetail } from "@/services/workspace.service";
import { toApplicationActorContext } from "@/services/application.service";

import { MilestonePanel } from "./milestone-panel";

export const dynamic = "force-dynamic";

/**
 * A live engagement from the partner's side.
 *
 * The student's workspace and this screen read the same project, but they are
 * not the same screen: the student comes here to see what they owe, the
 * partner to sign off on what has arrived. The sign-off is a button here and a
 * read-only pill there, and that difference is the reason both exist.
 */
export default async function PartnerProjectPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;

  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");

  // Ownership comes from the partner dashboard, which is scoped to the actor's
  // organization: a project belonging to another partner is indistinguishable
  // from one that does not exist.
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

  const milestones = detail.milestones.map(toMilestone);
  const meetings = detail.meetings.map(toMeeting);
  const readOnly =
    detail.projectStatus === "COMPLETED" || detail.projectStatus === "ARCHIVED";

  const awaitingYou = milestones.filter(
    (milestone) => milestone.status === "Submitted" && !milestone.posterApproved
  );
  const finished = detail.projectStatus === "COMPLETED";

  return (
    <div className="max-w-[900px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner/projects">Your projects</Link>
        <span className="mx-1.5">›</span>
        {detail.challengeTitle}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3.5">
        <div className="min-w-0">
          <h1>{detail.challengeTitle}</h1>
          <p className="text-ink-2 mt-2">
            {detail.members.length} student
            {detail.members.length === 1 ? "" : "s"}
            {detail.project.supervisorName
              ? ` · supervised by ${detail.project.supervisorName}`
              : ""}
            {detail.project.startDate
              ? ` · started ${formatDate(detail.project.startDate)}`
              : ""}
          </p>
        </div>
        <Chip variant={finished ? "ok" : "solid"}>
          {detail.projectStatus.replaceAll("_", " ")}
        </Chip>
      </div>

      <div className="mt-5">
        <ProgressBar
          approved={detail.progress.completed}
          total={detail.progress.total}
        />
      </div>

      {awaitingYou.length > 0 ? (
        <p className="mt-4 rounded-card border border-l-[3px] border-warn/35 border-l-warn bg-warn-soft px-4 py-2.5 text-ink-2">
          {awaitingYou.length} deliverable
          {awaitingYou.length === 1 ? " is" : "s are"} waiting on your sign-off.
        </p>
      ) : null}

      {finished ? (
        <p className="mt-4 rounded-card border border-l-[3px] border-ok/30 border-l-ok bg-ok-soft px-4 py-2.5 text-ink-2">
          This project is finished.{" "}
          <Link
            className="font-semibold"
            href={`/partner/projects/${applicationId}/close`}
          >
            Close it out →
          </Link>
        </p>
      ) : null}

      <Section
        title="Milestones"
        aside="Faculty and partner both sign off"
      >
        <MilestonePanel
          meetings={meetings}
          milestones={milestones}
          readOnly={readOnly}
        />
      </Section>

      <Section title="The team">
        <ul className="flex flex-col gap-2.5">
          {detail.members.map((member) => (
            <li
              key={member.fullName}
              className="bg-card border border-line rounded-card px-4 py-3 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{member.fullName}</p>
                <p className="text-meta text-ink-3 mt-0.5">
                  {member.major ?? "—"}
                  {member.studyYear ? ` · Year ${member.studyYear}` : ""}
                </p>
              </div>
              {member.projectRole ? <Chip>{member.projectRole}</Chip> : null}
            </li>
          ))}
        </ul>
      </Section>

      {detail.contactPerson ? (
        <section className="mt-7">
          <GroupHeading title="Your contact on this project" />
          <div className="bg-card border border-line rounded-card p-4">
            <p className="font-semibold text-ink">
              {detail.contactPerson.displayName}
            </p>
            <p className="text-meta text-ink-3 mt-0.5">
              {detail.contactPerson.roleLabel ?? "Contact"}
              {detail.contactPerson.email ? ` · ${detail.contactPerson.email}` : ""}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
