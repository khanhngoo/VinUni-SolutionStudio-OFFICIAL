import Link from "next/link";
import { notFound } from "next/navigation";
import { InvitePicker } from "@/components/team/invite-picker";
import { MemberRow } from "@/components/team/member-row";
import { TeamFit } from "@/components/team/team-fit";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/cn";
import { peers } from "@/lib/data/peers";
import { currentStudent } from "@/lib/data/student";
import { lastMileTeam } from "@/lib/data/teams";
import {
  canAddMore,
  sizeLabel,
  teamReadiness,
  teamSize,
} from "@/lib/teams";
import { getAllChallengeIds, getChallengeById } from "@/lib/queries";

export function generateStaticParams() {
  return getAllChallengeIds().map((id) => ({ id }));
}

const STEPS = ["Your team", "Motivation", "Supervisor", "Review"];

/**
 * Step one of applying. Teams are per-application, so this is where one gets
 * assembled — and nothing downstream can start until the roster is legal and
 * every invitation has been answered.
 *
 * The roster shown is the seeded example; there is no persistence layer, so
 * invitations sent here are session-only.
 */
export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = getChallengeById(id);
  if (!challenge) notFound();

  const team = lastMileTeam;
  const readiness = teamReadiness(team, challenge);
  const takenIds = team.members.map((m) => m.studentId);

  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/challenges">Challenges</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/challenges/${challenge.id}`}>{challenge.title}</Link>
        <span className="mx-1.5">›</span>
        Apply
      </nav>

      <ol className="flex items-center flex-wrap gap-x-2 gap-y-2 mt-4">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span
              className={cn(
                "w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] font-semibold",
                i === 0
                  ? "bg-brand text-white"
                  : "border border-line text-ink-3",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "text-meta",
                i === 0 ? "text-ink font-semibold" : "text-ink-3",
              )}
            >
              {step}
            </span>
            {i < STEPS.length - 1 ? (
              <span aria-hidden="true" className="w-5 h-px bg-line mx-1" />
            ) : null}
          </li>
        ))}
      </ol>

      <h1 className="mt-5">Form your team</h1>
      <p className="text-ink-2 mt-2">
        {challenge.orgName ?? challenge.orgCategory} asks for{" "}
        <strong className="text-ink font-semibold">
          {sizeLabel(challenge)} students
        </strong>{" "}
        at {challenge.hoursPerWeek} h/wk for {challenge.durationWeeks} weeks.
      </p>

      <Section title="Team">
        <div className="bg-card border border-line rounded-card p-5">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[220px]">
              <label
                htmlFor="team-name"
                className="text-meta text-ink-3 uppercase tracking-[0.07em]"
              >
                Team name
              </label>
              <input
                id="team-name"
                defaultValue={team.name}
                className="w-full h-9 mt-1.5 px-3 rounded-card border border-line bg-card text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </div>
            <div className="w-[150px]">
              <p className="text-meta text-ink-3 uppercase tracking-[0.07em]">
                Size
              </p>
              <p className="mt-1.5 h-9 flex items-center font-semibold text-ink">
                {teamSize(team)} of {sizeLabel(challenge)}
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Members" aside={`${team.members.length} listed`}>
        <ul className="flex flex-col gap-2.5">
          {team.members.map((member) => (
            <MemberRow
              key={member.studentId}
              member={member}
              trailing={<Chip>{member.role}</Chip>}
            />
          ))}
        </ul>

        <div className="mt-2.5">
          <InvitePicker
            peers={peers}
            takenIds={takenIds}
            canInvite={canAddMore(team, challenge)}
          />
        </div>
      </Section>

      <Section title="Fit">
        <TeamFit team={team} challenge={challenge} />
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-2.5 mt-7">
        <Link
          href={`/challenges/${challenge.id}`}
          className="inline-flex items-center h-10 px-5 rounded-card border border-line text-brand font-semibold hover:border-brand hover:text-brand"
        >
          Save draft
        </Link>
        <Link
          href={`/challenges/${challenge.id}`}
          aria-disabled={!readiness.ready}
          className={cn(
            "inline-flex items-center h-10 px-5 rounded-card font-semibold",
            readiness.ready
              ? "bg-brand text-white hover:bg-brand-deep hover:text-white"
              : "bg-line-2 text-ink-3 pointer-events-none",
          )}
        >
          Next · Motivation
        </Link>
      </div>

      {!readiness.ready ? (
        <p className="text-meta text-ink-3 mt-2.5 text-right">
          You can keep drafting — the application can&apos;t be submitted until
          every invitation is answered.
        </p>
      ) : null}

      <p className="text-meta text-ink-3 mt-6">
        Applying as {currentStudent.name} · you are the team leader and the
        partner&apos;s point of contact.
      </p>
    </article>
  );
}
