import Link from "next/link";
import { notFound } from "next/navigation";
import { revealCredential } from "@/app/workspace/[applicationId]/actions";
import { MilestoneList } from "@/components/workspace/milestone-list";
import { NextMeetingCard } from "@/components/workspace/next-meeting-card";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { ResourceList } from "@/components/workspace/resource-list";
import { SubmitDeliverable } from "@/components/workspace/submit-deliverable";
import {
  parseTab,
  WorkspaceTabs,
} from "@/components/workspace/workspace-tabs";
import { Chip } from "@/components/ui/chip";
import { LockIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/section";
import { currentStudent } from "@/lib/data/student";
import { daysUntil, formatDate } from "@/lib/dates";
import type { RawSearchParams } from "@/lib/filters";
import { isRevealed } from "@/lib/pipeline";
import {
  getAllApplicationIds,
  getApplicationById,
  getChallengeById,
  getFacultyById,
} from "@/lib/queries";
import { STAGE_LABELS, type Application, type Challenge } from "@/lib/types";

export function generateStaticParams() {
  return getAllApplicationIds().map((applicationId) => ({ applicationId }));
}

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { applicationId } = await params;
  const application = getApplicationById(applicationId);
  if (!application) notFound();

  const challenge = getChallengeById(application.challengeId);
  if (!challenge) notFound();

  // The product's core invariant (PRD §5): T3 content only from ACTIVE onward.
  // Nothing below this gate may render the brief, datasets or poster contact.
  if (!isRevealed(application) || !application.project) {
    return <LockedWorkspace application={application} challenge={challenge} />;
  }

  const tab = parseTab((await searchParams).tab);
  const project = application.project;
  const supervisor = getFacultyById(application.facultySupervisorId);

  const approved = project.milestones.filter(
    (m) => m.status === "Approved",
  ).length;
  const total = project.milestones.length;
  const next = project.milestones.find((m) => m.status !== "Approved");
  const readOnly = application.stage === "COMPLETED";

  return (
    <div className="max-w-[980px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/workspace">Your work</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/challenges/${challenge.id}`}>{challenge.title}</Link>
        <span className="mx-1.5">›</span>
        Workspace
      </nav>

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip variant={readOnly ? "ok" : "ok"}>
          {STAGE_LABELS[application.stage]}
        </Chip>
        <Chip>{challenge.orgName ?? challenge.orgCategory}</Chip>
        <Chip>{challenge.subType}</Chip>
      </div>

      <h1>{challenge.title}</h1>
      <p className="text-ink-2 mt-2">
        Started {formatDate(project.startedAt)} · {approved} of {total}{" "}
        milestones approved
      </p>

      <ProgressBar approved={approved} total={total} className="mt-5" />

      <div className="mt-6">
        <WorkspaceTabs applicationId={application.id} active={tab} />
      </div>

      {tab === "overview" ? (
        <>
          <Section title="The brief">
            <div className="bg-card border border-line rounded-card p-5 flex flex-col gap-3 text-ink-2">
              {project.fullBrief.map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
            </div>
          </Section>

          <Section title="Where things stand">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Stat label="Progress" value={`${approved} / ${total}`} />
              <Stat
                label="Next due"
                value={next ? formatDate(next.dueDate) : "—"}
              />
              <Stat
                label="Workload"
                value={`${challenge.hoursPerWeek} hrs / wk`}
              />
              <Stat
                label="Duration"
                value={`${challenge.durationWeeks} weeks`}
              />
            </dl>
            {next ? (
              <p
                className={
                  daysUntil(next.dueDate) < 0
                    ? "text-meta text-warn font-medium mt-2.5"
                    : "text-meta text-ink-3 mt-2.5"
                }
              >
                Next up: {next.title} — {next.deliverable.toLowerCase()}.
              </p>
            ) : null}
          </Section>

          <Section title="Next meeting">
            <NextMeetingCard project={project} />
          </Section>

          <Section title="People">
            <div className="grid sm:grid-cols-3 gap-2.5">
              <Person
                name={currentStudent.name}
                role={`${currentStudent.major} · Year ${currentStudent.year}`}
                note="You"
              />
              <Person
                name={supervisor?.name ?? "To be confirmed"}
                role={supervisor ? supervisor.title : "Faculty supervisor"}
                note="Mentors and signs off"
              />
              <Person
                name={project.posterContact.name}
                role={project.posterContact.role}
                note={project.posterContact.email}
              />
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
          <div className="bg-card border border-line rounded-card p-5">
            <MilestoneList
              milestones={project.milestones}
              meetings={project.meetings}
            />
          </div>
        </Section>
      ) : null}

      {tab === "deliverables" ? (
        <Section
          title="Deliverables"
          aside="Faculty and partner both sign off"
        >
          <div className="bg-card border border-line rounded-card p-5">
            <MilestoneList
              milestones={project.milestones}
              meetings={project.meetings}
              showSignoff
            />
            {!readOnly ? (
              <div className="mt-5 pt-4 border-t border-line-2">
                <SubmitDeliverable milestones={project.milestones} />
              </div>
            ) : (
              <p className="text-meta text-ink-3 mt-5 pt-4 border-t border-line-2">
                This challenge is closed. Submissions are archived and
                read-only.
              </p>
            )}
          </div>
        </Section>
      ) : null}

      {tab === "resources" ? (
        <Section title="Resources" aside="Released to you at selection">
          <ResourceList
            resources={project.resources.map((r) => ({
              name: r.name,
              kind: r.kind,
              ndaTier: r.ndaTier,
              hasCredential: r.masked !== undefined,
            }))}
            revealCredential={async (resourceName: string) => {
              "use server";
              return revealCredential(application.id, resourceName);
            }}
          />
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
function LockedWorkspace({
  application,
  challenge,
}: {
  application: Application;
  challenge: Challenge;
}) {
  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/workspace">Your work</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/challenges/${challenge.id}`}>{challenge.title}</Link>
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
          Your application is currently{" "}
          <strong className="text-ink font-semibold">
            {STAGE_LABELS[application.stage].toLowerCase()}
          </strong>
          .
        </p>
        <Link
          href={`/challenges/${challenge.id}`}
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
