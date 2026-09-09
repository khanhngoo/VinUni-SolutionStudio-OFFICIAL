import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  getAuthenticatedActor,
  hasActorCapability,
} from "@/auth/authenticated-actor";
import { Section } from "@/components/ui/section";
import { db } from "@/db";
import {
  getStudentTeamProfile,
  listFacultyOptions,
  listInvitablePeers,
} from "@/db/queries/students";
import {
  soloTeamFor,
  toApplyChallenge,
  toCollege,
  toFaculty,
  toPeer,
  toTeamRole,
  toWeek,
} from "@/lib/apply-view";
import { marketplaceContextForActor } from "@/lib/challenge-marketplace";
import {
  getMyApplicationForChallenge,
  toApplicationActorContext,
} from "@/services/application.service";
import { getMarketplaceChallengeBySlug } from "@/services/challenge.service";

import { ApplyWizardShell } from "./wizard-shell";

export const dynamic = "force-dynamic";

/**
 * Applying, in four steps: team, motivation, supervisor, review.
 *
 * A server shell over a client wizard — the page resolves the challenge, the
 * invitable peers and the faculty options, and the wizard owns the draft, since
 * a form spread over four screens has to keep its answers somewhere.
 *
 * The roster starts as a team of one. That is the honest starting point: the
 * applicant is the leader, and everyone else arrives by invitation and has to
 * accept before the team is final.
 */
export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: slug } = await params;
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "STUDENT")) notFound();

  const challenge = await getMarketplaceChallengeBySlug(
    slug,
    marketplaceContextForActor(resolution.actor)
  );
  if (!challenge) notFound();

  const actor = toApplicationActorContext(resolution.actor);
  const existing = await getMyApplicationForChallenge(challenge.slug, actor);

  const viewerId = resolution.actor.user.userId;
  const [peerRows, facultyRows, teamProfile] = await Promise.all([
    listInvitablePeers(db, viewerId),
    listFacultyOptions(db),
    getStudentTeamProfile(db, viewerId),
  ]);

  const applyChallenge = toApplyChallenge(challenge);
  const leaderName = resolution.actor.user.fullName;

  // The leader row is the applicant's real profile. Their first stated role is
  // the team role they arrive with; with none stated, Coordination is the
  // honest default for whoever is leading.
  const leaderRole = toTeamRole(teamProfile?.roles[0] ?? "") ?? "Coordination";

  const baseTeam = soloTeamFor({
    college: toCollege(teamProfile?.school),
    hoursAvailable: teamProfile?.hoursAvailable ?? 0,
    major: teamProfile?.major ?? "—",
    name: leaderName,
    role: leaderRole,
    studentId: String(viewerId),
    teamName: `${leaderName.split(" ")[0]}'s team`,
    weeklyAvailability: toWeek(teamProfile?.weeklyAvailability),
    year: teamProfile?.studyYear ?? 0,
  });

  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/challenges">Challenges</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/challenges/${challenge.slug}`}>{challenge.title}</Link>
        <span className="mx-1.5">›</span>
        Apply
      </nav>

      {existing ? (
        <>
          <h1 className="mt-5">Apply to {challenge.title}</h1>
          <Section title="Application already submitted">
            <div className="bg-card border border-line rounded-card p-5">
              <p className="font-semibold text-ink">
                You are already part of this application.
              </p>
              <p className="text-ink-2 mt-1.5">
                Status: {existing.status.replaceAll("_", " ")}
                {existing.teamName ? ` · Team ${existing.teamName}` : ""}
              </p>
              <p className="text-meta text-ink-3 mt-3">
                A second application cannot be submitted while this one is active.
              </p>
              <Link
                className="inline-block font-semibold mt-4"
                href={`/applications/${existing.publicId}`}
              >
                View application →
              </Link>
            </div>
          </Section>
        </>
      ) : (
        <ApplyWizardShell
          baseTeam={baseTeam}
          challenge={applyChallenge}
          challengeSlug={challenge.slug}
          defaultHours={Math.min(
            teamProfile?.hoursAvailable ?? challenge.weeklyHours ?? 0,
            challenge.weeklyHours ?? 0
          )}
          facultyOptions={facultyRows.map(toFaculty)}
          leaderName={leaderName}
          peers={peerRows.map(toPeer)}
        />
      )}
    </article>
  );
}
