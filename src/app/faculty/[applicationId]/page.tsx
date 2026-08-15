import Link from "next/link";
import { notFound } from "next/navigation";
import { InviteDecision } from "@/components/faculty/invite-decision";
import { ProjectReview } from "@/components/faculty/project-review";
import { MemberRow } from "@/components/team/member-row";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { currentFacultyId, getFacultyById } from "@/lib/data/faculty";
import { formatDate } from "@/lib/dates";
import { getAllApplicationIds } from "@/lib/queries";
import { getPendingInvites, getSupervisedRow } from "@/lib/supervision";
import { combinedHours, teamSize } from "@/lib/teams";
import { STAGE_LABELS } from "@/lib/types";

export function generateStaticParams() {
  return getAllApplicationIds().map((applicationId) => ({ applicationId }));
}

/**
 * One application, seen by its faculty supervisor. What renders depends on the
 * relationship rather than the URL: a team that has only *nominated* this
 * faculty gets the accept/decline view with nothing from the project record,
 * because supervision hasn't been agreed and the brief is not theirs to read
 * yet. Anything else must be a confirmed supervision, or this is somebody
 * else's team and the page 404s.
 */
export default async function FacultyApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const faculty = getFacultyById(currentFacultyId);
  if (!faculty) notFound();

  const pendingInvite = getPendingInvites(currentFacultyId).find(
    (item) => item.application.id === applicationId,
  );
  const supervised = getSupervisedRow(currentFacultyId, applicationId);

  if (!pendingInvite && !supervised) notFound();

  const { application, challenge } = pendingInvite ?? supervised!;
  const atCapacity = faculty.slotsUsed >= faculty.slotsTotal;

  return (
    <div className="max-w-[980px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/faculty">Action queue</Link>
        <span className="mx-1.5">›</span>
        {challenge.title}
      </nav>

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip variant={pendingInvite ? "warn" : "ok"}>
          {pendingInvite ? "Supervision requested" : STAGE_LABELS[application.stage]}
        </Chip>
        <Chip>{challenge.orgName ?? challenge.orgCategory}</Chip>
        <Chip>{challenge.subType}</Chip>
        <Chip>{challenge.colleges.join(" · ")}</Chip>
      </div>

      <h1>{challenge.title}</h1>
      <p className="text-ink-2 mt-2">
        {challenge.durationWeeks} weeks · {challenge.hoursPerWeek} h/wk per student ·
        starts {formatDate(challenge.startDate)}
      </p>

      <Section title="The team">
        <ul className="flex flex-col gap-2.5">
          {application.team.members.map((member) => (
            <MemberRow
              key={member.studentId}
              member={member}
              trailing={<Chip>{member.role}</Chip>}
            />
          ))}
        </ul>
        <p className="text-meta text-ink-3 mt-2.5">
          {application.team.name} · {teamSize(application.team)} confirmed ·{" "}
          {combinedHours(application.team)} h/wk between them · applied{" "}
          {formatDate(application.appliedAt)}
        </p>
      </Section>

      {pendingInvite ? (
        <InviteDecision
          item={pendingInvite}
          faculty={faculty}
          atCapacity={atCapacity}
        />
      ) : (
        <ProjectReview
          application={application}
          challenge={challenge}
          supervisorName={faculty.name}
        />
      )}
    </div>
  );
}
