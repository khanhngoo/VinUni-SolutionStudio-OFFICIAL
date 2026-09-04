import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberRow } from "@/components/team/member-row";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { formatDate } from "@/lib/dates";
import { checkEligibility } from "@/lib/eligibility";
import { currentStudent } from "@/lib/data/student";
import {
  getAllApplicationIds,
  getApplicationById,
  getChallengeById,
} from "@/lib/queries";
import { leaderOf, sizeLabel } from "@/lib/teams";

export function generateStaticParams() {
  return getAllApplicationIds().map((applicationId) => ({ applicationId }));
}

/**
 * The other side of an invitation. Everything needed to answer honestly, on
 * one screen: who is asking, what it actually costs per week, who else is on
 * the team, and whether the invitee clears the challenge's own gates.
 */
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const application = getApplicationById(applicationId);
  if (!application) notFound();

  const challenge = getChallengeById(application.challengeId);
  if (!challenge) notFound();

  const team = application.team;
  const leader = leaderOf(team);
  const eligibility = checkEligibility(currentStudent, challenge);

  // The invitee's own seat on this team — the pending one.
  const seat = team.members.find((m) => m.status === "invited");

  return (
    <article className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/workspace">Your work</Link>
        <span className="mx-1.5">›</span>
        Invitations
      </nav>

      <div className="flex items-start justify-between gap-4 mt-3.5">
        <div className="min-w-0">
          <h1>
            {leader?.name ?? "A student"} invited you to join{" "}
            <em className="not-italic text-ink">{team.name}</em>
          </h1>
          <p className="text-ink-2 mt-2">
            {challenge.title} · {challenge.orgName ?? challenge.orgCategory}
          </p>
        </div>
        {application.nextActionDue ? (
          <Chip variant="warn">
            Reply by {formatDate(application.nextActionDue)}
          </Chip>
        ) : null}
      </div>

      <Section title="What you'd be signing up for">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Stat label="Your role" value={seat?.role ?? "To be agreed"} />
          <Stat label="Commitment" value={`${challenge.hoursPerWeek} h/wk`} />
          <Stat label="Duration" value={`${challenge.durationWeeks} weeks`} />
          <Stat label="Starts" value={formatDate(challenge.startDate)} />
        </dl>
      </Section>

      <Section title="The team" aside={`${sizeLabel(challenge)} for this challenge`}>
        <ul className="flex flex-col gap-2.5">
          {team.members.map((member) => (
            <MemberRow
              key={member.studentId}
              member={
                member.studentId === seat?.studentId
                  ? { ...member, name: "You" }
                  : member
              }
              trailing={<Chip>{member.role}</Chip>}
            />
          ))}
        </ul>
      </Section>

      <Section title="Your fit">
        {eligibility.eligible ? (
          <p className="rounded-card border border-l-[3px] border-ok/30 border-l-ok bg-ok-soft px-4 py-2.5 text-ink-2">
            You meet the eligibility rules for this challenge, and{" "}
            {challenge.hoursPerWeek} h/wk fits inside the{" "}
            {currentStudent.hoursAvailable} you have free.
          </p>
        ) : (
          <div className="rounded-card border border-l-[3px] border-warn/35 border-l-warn bg-warn-soft px-4 py-2.5">
            <p className="text-ink font-semibold">
              You don&apos;t meet every requirement
            </p>
            <ul className="text-ink-2 mt-1.5 list-disc pl-4">
              {eligibility.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <div className="flex flex-wrap items-center gap-2.5 mt-7">
        <Link
          href={`/challenges/${challenge.id}`}
          className="inline-flex items-center h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
        >
          Accept and join
        </Link>
        <Link
          href="/workspace"
          className="inline-flex items-center h-10 px-5 rounded-card border border-line text-brand font-semibold hover:border-brand hover:text-brand"
        >
          Decline
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
