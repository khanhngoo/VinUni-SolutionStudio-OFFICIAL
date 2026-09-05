import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Chip } from "@/components/ui/chip";
import { LockIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/section";
import { MilestoneList } from "@/components/workspace/milestone-list";
import { ResourceList, type SafeResource } from "@/components/workspace/resource-list";
import { SubmitDeliverable } from "@/components/workspace/submit-deliverable";
import { toMeeting, toMilestone } from "@/lib/apply-view";
import { NextMeetingCard } from "@/components/workspace/next-meeting-card";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { parseTab, WorkspaceTabs } from "@/components/workspace/workspace-tabs";
import { daysUntil, formatDate } from "@/lib/dates";
import {
  organizationRoleLabel,
  projectStatusLabel,
} from "@/lib/labels";
import { STAGE_LABELS } from "@/lib/types";
import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import {
  getMyApplicationForChallenge,
  listMyApplications,
  toApplicationActorContext,
} from "@/services/application.service";
import { deriveApplicationStage } from "@/services/application-stage";
import {
  getWorkspaceDetail,
  WorkspaceError,
  type WorkspaceDetail,
} from "@/services/workspace.service";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { applicationId } = await params;
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  const actor = toApplicationActorContext(resolution.actor);

  let detail: WorkspaceDetail | null;
  try {
    detail = await getWorkspaceDetail(applicationId, actor);
  } catch (error) {
    // A non-member still gets nothing. The lock screen below is for the
    // applicant's own application, not for anyone who guesses a URL.
    if (error instanceof WorkspaceError && error.code === "FORBIDDEN") notFound();
    throw error;
  }

  // No project row yet: the student holds this application but has not reached
  // the stage that opens a workspace. That is a lock screen, not a 404.
  if (!detail) return <LockedWorkspace applicationPublicId={applicationId} actor={actor} />;

  const tab = parseTab((await searchParams).tab);
  const readOnly =
    detail.projectStatus === "COMPLETED" || detail.projectStatus === "ARCHIVED";
  const next = detail.milestones.find((milestone) => milestone.status !== "COMPLETED");
  const overdue = next?.deadline ? daysUntil(next.deadline) < 0 : false;

  const milestones = detail.milestones.map(toMilestone);
  const meetings = detail.meetings.map(toMeeting);

  // Credential values never reach the browser. The platform does not release
  // them itself yet, so the list renders the masked state and points at the
  // partner rather than offering a request it cannot fulfil.
  const resources: SafeResource[] = detail.resources.map((resource) => ({
    hasCredential: resource.access === "AGREEMENT_REQUIRED",
    kind: resource.resourceType ?? "Resource",
    name: resource.title,
    ndaTier: resource.access === "AGREEMENT_REQUIRED",
  }));

  return (
    <div className="max-w-[980px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/workspace">Your work</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/challenges/${detail.challengeSlug}`}>{detail.challengeTitle}</Link>
        <span className="mx-1.5">›</span>
        Workspace
      </nav>

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip variant="ok">{projectStatusLabel(detail.projectStatus)}</Chip>
        <Chip>{detail.challenge.ownerOrganizationName}</Chip>
        {detail.challenge.subtype ? <Chip>{detail.challenge.subtype}</Chip> : null}
      </div>

      <h1>{detail.challengeTitle}</h1>
      <p className="text-ink-2 mt-2">
        Started{" "}
        {detail.project.startDate
          ? formatDate(detail.project.startDate)
          : "to be confirmed"}{" "}
        · {detail.progress.completed} of {detail.progress.total} milestones approved
      </p>

      <ProgressBar
        approved={detail.progress.completed}
        total={detail.progress.total}
        className="mt-5"
      />

      <div className="mt-6">
        <WorkspaceTabs applicationId={applicationId} active={tab} />
      </div>

      {tab === "overview" ? (
        <>
          <Section title="The brief">
            <div className="bg-card border border-line rounded-card p-5 flex flex-col gap-3 text-ink-2">
              {detail.challenge.fullBrief ? (
                detail.challenge.fullBrief
                  .split("\n\n")
                  .map((para) => <p key={para.slice(0, 24)}>{para}</p>)
              ) : (
                <p>
                  The partner has not filed a written brief for this challenge.
                  Your supervisor holds the scope agreed at kickoff.
                </p>
              )}
            </div>
          </Section>

          <Section title="Where things stand">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Stat
                label="Progress"
                value={`${detail.progress.completed} / ${detail.progress.total}`}
              />
              <Stat
                label="Next due"
                value={detail.nextDeadline ? formatDate(detail.nextDeadline) : "—"}
              />
              <Stat
                label="Workload"
                value={
                  detail.challenge.weeklyHours
                    ? `${detail.challenge.weeklyHours} hrs / wk`
                    : "—"
                }
              />
              <Stat
                label="Duration"
                value={
                  detail.challenge.durationWeeks
                    ? `${detail.challenge.durationWeeks} weeks`
                    : "—"
                }
              />
            </dl>
            {next ? (
              <p
                className={
                  overdue
                    ? "text-meta text-warn font-medium mt-2.5"
                    : "text-meta text-ink-3 mt-2.5"
                }
              >
                Next up: {next.title}
                {next.description ? ` — ${next.description.toLowerCase()}` : ""}
                {overdue ? " · overdue" : ""}
              </p>
            ) : null}
          </Section>

          <Section title="Next meeting">
            <NextMeetingCard meetings={detail.meetings} />
          </Section>

          <Section title="People">
            <div className="grid sm:grid-cols-3 gap-2.5">
              {detail.members.map((member) => (
                <Person
                  key={member.fullName}
                  name={member.fullName}
                  role={[member.major, member.studyYear ? `Year ${member.studyYear}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                  note={member.projectRole ?? "Team member"}
                />
              ))}
              <Person
                name={detail.project.supervisorName ?? "To be confirmed"}
                role="Faculty supervisor"
                note="Mentors and signs off"
              />
              {detail.contactPerson ? (
                <Person
                  name={detail.contactPerson.displayName}
                  role={organizationRoleLabel(detail.contactPerson.roleLabel, "Partner contact")}
                  note={detail.contactPerson.email ?? "Contact via your supervisor"}
                />
              ) : null}
            </div>
            <p className="text-meta text-ink-3 mt-2.5">
              A CAID officer observes this workspace read-only unless something
              is escalated.
            </p>
          </Section>
        </>
      ) : null}

      {tab === "milestones" ? (
        <Section title="Milestones">
          <MilestoneList meetings={meetings} milestones={milestones} />
        </Section>
      ) : null}

      {tab === "deliverables" ? (
        <Section title="Deliverables" aside="Faculty and partner both sign off">
          <MilestoneList milestones={milestones} showSignoff />
          {readOnly ? (
            <p className="text-meta text-ink-3 mt-5">
              This challenge is closed. Submissions are archived.
            </p>
          ) : (
            <div className="mt-5">
              <SubmitDeliverable milestones={milestones} />
            </div>
          )}
        </Section>
      ) : null}

      {tab === "resources" ? (
        <Section title="Resources" aside="Released to you at selection">
          <ResourceList resources={resources} />
        </Section>
      ) : null}
    </div>
  );
}

/**
 * The gated view. Deliberately renders nothing from the project record — a
 * workspace URL for an application that has not reached ACTIVE must not leak
 * the brief, the datasets or the poster's contact details.
 */
async function LockedWorkspace({
  applicationPublicId,
  actor,
}: {
  applicationPublicId: string;
  actor: Awaited<ReturnType<typeof toApplicationActorContext>>;
}) {
  const mine = (await listMyApplications(actor)).find(
    (application) => application.publicId === applicationPublicId
  );
  if (!mine) notFound();

  const detail = await getMyApplicationForChallenge(mine.challenge.slug, actor);
  const stage = detail
    ? deriveApplicationStage({
        assessmentSummaries: detail.assessmentSummaries,
        offerSummary: detail.offerSummary,
        projectSummary: detail.projectSummary,
        status: detail.status,
      })
    : null;

  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/workspace">Your work</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/challenges/${mine.challenge.slug}`}>{mine.challenge.title}</Link>
        <span className="mx-1.5">›</span>
        Workspace
      </nav>

      <h1 className="mt-3.5">Workspace locked</h1>

      <div className="mt-6 bg-card border border-line rounded-card p-6 text-center">
        <span className="w-[26px] h-[26px] rounded-card bg-line-2 border border-line grid place-items-center text-ink-2 mx-auto">
          <LockIcon className="w-3.5 h-3.5" />
        </span>
        <p className="font-semibold text-ink mt-3">
          This workspace opens when you&apos;re selected and accept
        </p>
        <p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto">
          The full brief, datasets and partner contact stay sealed until then.
          {stage ? (
            <>
              {" "}
              Your application is currently{" "}
              <strong className="text-ink font-semibold">
                {STAGE_LABELS[stage].toLowerCase()}
              </strong>
              .
            </>
          ) : null}
        </p>
        <Link
          href={`/challenges/${mine.challenge.slug}`}
          className="inline-grid place-items-center h-9 px-4 mt-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
        >
          Back to challenge
        </Link>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-line-2 rounded-card px-3.5 py-3">
      <dt className="text-meta text-ink-3">{label}</dt>
      <dd className="font-semibold text-[15px] text-brand mt-1">{value}</dd>
    </div>
  );
}

function Person({
  name,
  role,
  note,
}: {
  name: string;
  role: string;
  note: string;
}) {
  return (
    <div className="bg-card border border-line rounded-card px-4 py-3.5">
      <p className="font-semibold text-ink">{name}</p>
      <p className="text-meta text-ink-3 mt-0.5">{role}</p>
      <p className="text-meta text-ink-2 mt-1.5 break-words">{note}</p>
    </div>
  );
}
