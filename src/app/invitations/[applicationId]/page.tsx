import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  getAuthenticatedActor,
  hasActorCapability,
} from "@/auth/authenticated-actor";
import { MemberRow } from "@/components/team/member-row";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { db } from "@/db";
import { getApplicationByPublicId } from "@/db/queries/applications";
import {
  getStudentEligibilityProfile,
  getPublishedChallengeBySlug,
} from "@/db/queries/challenges";
import { listStudentTeamProfiles } from "@/db/queries/students";
import { toTeam } from "@/lib/apply-view";
import { eligibilityReasons } from "@/lib/challenge-marketplace";
import { formatDate } from "@/lib/dates";
import { evaluateChallengeEligibility } from "@/services/challenge-policy";

import { InvitationDecision } from "./invitation-decision";

export const dynamic = "force-dynamic";

/**
 * The other side of an invitation. Everything needed to answer honestly, on
 * one screen: who is asking, what it actually costs per week, who else is on
 * the team, and whether the invitee clears the challenge's own gates.
 *
 * The page resolves the invitee from the session rather than the URL, so the
 * seat shown is always the reader's own and there is no id to swap.
 */
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;

  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "STUDENT")) notFound();

  const viewerId = resolution.actor.user.userId;
  const application = await getApplicationByPublicId(db, applicationId);
  if (!application) notFound();

  // Not being on this team reads the same as the team not existing: an
  // invitation is not a public object.
  const seat = application.members.find(
    (member) => member.student.userId === viewerId
  );
  if (!seat) notFound();

  const [profiles, eligibilityProfile, challenge] = await Promise.all([
    listStudentTeamProfiles(
      db,
      application.members.map((member) => member.student.userId)
    ),
    getStudentEligibilityProfile(viewerId),
    getPublishedChallengeBySlug(application.challenge.slug),
  ]);

  const team = toTeam(application.teamName, application.members, profiles);
  const leader = application.members.find(
    (member) => member.memberRole === "LEADER"
  );

  const evaluation =
    challenge && eligibilityProfile
      ? evaluateChallengeEligibility(challenge.eligibilityRules, eligibilityProfile)
      : null;
  // Failed rules are why they cannot join; unknown ones are what the record
  // does not say yet. Both belong on the list, because neither is a pass.
  const reasons = evaluation
    ? [...eligibilityReasons(evaluation).failed, ...eligibilityReasons(evaluation).unknown]
    : [];

  const answered = seat.status !== "INVITED";

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
            {leader?.fullName ?? "A student"} invited you to join{" "}
            <em className="not-italic text-ink">{team.name}</em>
          </h1>
          <p className="text-ink-2 mt-2">
            {application.challenge.title} ·{" "}
            {application.challenge.ownerOrganization.name}
          </p>
        </div>
        {application.challenge.applicationDeadline ? (
          <Chip variant="warn">
            Reply by {formatDate(application.challenge.applicationDeadline.toISOString())}
          </Chip>
        ) : null}
      </div>

      <Section title="What you'd be signing up for">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Stat label="Your role" value={seat.preferredRole ?? "To be agreed"} />
          <Stat
            label="Commitment"
            value={`${application.challenge.weeklyHours ?? "—"} h/wk`}
          />
          <Stat
            label="Duration"
            value={challenge?.durationWeeks ? `${challenge.durationWeeks} weeks` : "—"}
          />
          <Stat
            label="Starts"
            value={challenge?.startDate ? formatDate(challenge.startDate) : "—"}
          />
        </dl>
      </Section>

      <Section
        title="The team"
        aside={`Teams of ${application.challenge.teamSizeMin ?? "—"}–${application.challenge.teamSizeMax ?? "—"} for this challenge`}
      >
        <ul className="flex flex-col gap-2.5">
          {team.members.map((member) => (
            <MemberRow
              key={member.studentId}
              member={
                member.studentId === String(viewerId)
                  ? { ...member, name: "You" }
                  : member
              }
              trailing={<Chip>{member.role}</Chip>}
            />
          ))}
        </ul>
      </Section>

      <Section title="Your fit">
        {evaluation === null ? (
          <p className="text-ink-3">
            This challenge&apos;s eligibility rules could not be read.
          </p>
        ) : evaluation.status === "ELIGIBLE" ? (
          <p className="rounded-card border border-l-[3px] border-ok/30 border-l-ok bg-ok-soft px-4 py-2.5 text-ink-2">
            You meet the eligibility rules for this challenge, and{" "}
            {application.challenge.weeklyHours ?? "—"} h/wk fits inside the{" "}
            {eligibilityProfile?.availableHoursPerWeek ?? "—"} you have free.
          </p>
        ) : (
          <div className="rounded-card border border-l-[3px] border-warn/35 border-l-warn bg-warn-soft px-4 py-2.5">
            <p className="text-ink font-semibold">
              You don&apos;t meet every requirement
            </p>
            <ul className="text-ink-2 mt-1.5 list-disc pl-4">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {answered ? (
        <p className="mt-7 rounded-card border border-line bg-card px-4 py-3 text-ink-2">
          You already {seat.status === "ACCEPTED" ? "accepted" : "declined"} this
          invitation.{" "}
          <Link className="font-semibold" href="/workspace">
            Back to your work
          </Link>
        </p>
      ) : (
        <InvitationDecision
          applicationPublicId={applicationId}
          teamName={team.name}
        />
      )}
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
