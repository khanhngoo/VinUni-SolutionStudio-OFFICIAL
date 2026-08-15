import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "@/components/ui/chip";
import { GroupHeading } from "@/components/partner/group-heading";
import { PartnerMilestoneList } from "@/components/partner/partner-milestone-list";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { formatDate, formatDateTime } from "@/lib/dates";
import {
  getOrgApplicationById,
  milestoneProgress,
  orgApplications,
  partnerFeedbackOf,
} from "@/lib/provider";
import { getChallengeById, getFacultyById } from "@/lib/queries";
import { confirmedMembers, pendingMembers } from "@/lib/teams";

export function generateStaticParams() {
  return orgApplications()
    .filter((a) => a.project !== null)
    .map((a) => ({ applicationId: a.id }));
}

/**
 * The partner's face of a live project.
 *
 * The same `ProjectRecord` the student's workspace renders, with one
 * difference that matters: `posterApproved` is a button here and a read-only
 * pill there. Everything else — milestones, the dual sign-off, the meetings —
 * is one record shown to the other party.
 */
export default async function PartnerProjectPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const application = getOrgApplicationById(applicationId);
  if (!application?.project) notFound();

  const challenge = getChallengeById(application.challengeId);
  if (!challenge) notFound();

  const project = application.project;
  const progress = milestoneProgress(project);
  const supervisor = getFacultyById(application.facultySupervisorId);
  const feedback = partnerFeedbackOf(project);
  const confirmed = confirmedMembers(application.team);
  const pending = pendingMembers(application.team);

  const complete = application.stage === "COMPLETED";

  return (
    <div className="max-w-[980px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner/projects">Projects</Link>
        <span className="mx-1.5">›</span>
        {challenge.title}
      </nav>

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip variant={complete ? "ok" : "ok"}>
          {complete ? "Completed" : "In progress"}
        </Chip>
        <Chip>{application.team.name}</Chip>
        <Chip>{challenge.subType}</Chip>
      </div>

      <h1>{challenge.title}</h1>
      <p className="text-ink-2 mt-2">
        Started {formatDate(project.startedAt)} · {progress.approved} of{" "}
        {progress.total} milestones approved
      </p>

      <ProgressBar
        approved={progress.approved}
        total={progress.total}
        className="mt-5"
      />

      {complete && !feedback ? (
        <div className="mt-6 border border-warn rounded-card bg-warn-soft px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-ink">
              This project is finished and waiting on your review
            </p>
            <p className="text-ink-2 mt-1">
              The team sees your feedback, and so does their supervisor.
            </p>
          </div>
          <Link
            href={`/partner/projects/${application.id}/close`}
            className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white shrink-0"
          >
            Close out →
          </Link>
        </div>
      ) : null}

      <section className="mt-7">
        <GroupHeading title="Milestones" />
        <div className="bg-card border border-line rounded-card p-5">
          <PartnerMilestoneList
            milestones={project.milestones}
            meetings={project.meetings}
            readOnly={complete}
          />
        </div>
        <p className="text-meta text-ink-3 mt-2.5 leading-relaxed">
          Both you and the faculty supervisor sign off each milestone. Your
          approval alone does not close it, and neither does theirs.
        </p>
      </section>

      {feedback ? (
        <section className="mt-7">
          <GroupHeading title="Your close-out review" />
          <div className="bg-card border border-line rounded-card p-5">
            <div className="grid sm:grid-cols-3 gap-2.5">
              <Stat label="Quality" value={feedback.qualityBand} />
              <Stat label="Reliability" value={feedback.reliabilityBand} />
              <Stat label="Host again" value={feedback.wouldHostAgain} />
            </div>
            <p className="text-ink-2 mt-4 leading-relaxed">{feedback.note}</p>
            <p className="text-meta text-ink-3 mt-3">
              Submitted {formatDate(feedback.submittedAt)}
            </p>
          </div>
        </section>
      ) : null}

      <section className="mt-7">
        <GroupHeading title="The team" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {confirmed.map((member) => (
            <div
              key={member.studentId}
              className="bg-card border border-line rounded-card px-4 py-3.5"
            >
              <p className="font-semibold text-ink">{member.name}</p>
              <p className="text-meta text-ink-3 mt-0.5">
                {member.major} · Year {member.year} · {member.college}
              </p>
              <p className="text-meta text-ink-2 mt-1.5">
                {member.role} · {member.hoursAvailable} hrs/wk
              </p>
            </div>
          ))}
        </div>
        {pending.length > 0 ? (
          <p className="text-meta text-ink-3 mt-2.5">
            {pending.length} invitation{pending.length === 1 ? "" : "s"} still
            outstanding.
          </p>
        ) : null}
      </section>

      <section className="mt-7">
        <GroupHeading title="Supervision & contact" />
        <div className="grid sm:grid-cols-2 gap-2.5">
          <div className="bg-card border border-line rounded-card px-4 py-3.5">
            <p className="font-semibold text-ink">
              {supervisor?.name ?? "To be confirmed"}
            </p>
            <p className="text-meta text-ink-3 mt-0.5">
              {supervisor ? supervisor.title : "Faculty supervisor"}
            </p>
            <p className="text-meta text-ink-2 mt-1.5">
              Mentors the team and signs off milestones
            </p>
          </div>
          <div className="bg-card border border-line rounded-card px-4 py-3.5">
            <p className="font-semibold text-ink">
              {project.posterContact.name}
            </p>
            <p className="text-meta text-ink-3 mt-0.5">
              {project.posterContact.role}
            </p>
            <p className="text-meta text-ink-2 mt-1.5 break-words">
              {project.posterContact.email}
            </p>
          </div>
        </div>
      </section>

      {project.meetings.length > 0 ? (
        <section className="mt-7">
          <GroupHeading title="Meetings" count={project.meetings.length} />
          <div className="flex flex-col gap-2">
            {project.meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="bg-card border border-line rounded-card px-4 py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{meeting.title}</p>
                  <p className="text-meta text-ink-3 mt-0.5">
                    {formatDateTime(meeting.startsAt)} ·{" "}
                    {meeting.durationMinutes} min
                  </p>
                </div>
                <Link
                  href={`/meeting/${meeting.id}`}
                  className="text-meta font-semibold text-brand hover:text-brand-deep shrink-0"
                >
                  Open →
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-line-2 rounded-card px-3.5 py-3">
      <p className="text-meta text-ink-3">{label}</p>
      <p className="font-semibold text-[15px] text-brand mt-1">{value}</p>
    </div>
  );
}
