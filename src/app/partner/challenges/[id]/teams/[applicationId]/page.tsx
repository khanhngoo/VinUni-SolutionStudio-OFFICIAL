import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { PartnerTeamRoster } from "@/components/partner/partner-team-roster";
import { TeamFit } from "@/components/team/team-fit";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { db } from "@/db";
import { getApplicationByPublicId } from "@/db/queries/applications";
import { listDirectoryStudents, listStudentTeamProfiles } from "@/db/queries/students";
import { toApplyChallenge, toDirectoryStudent, toTeam } from "@/lib/apply-view";
import { marketplaceContextForActor } from "@/lib/challenge-marketplace";
import { formatDate } from "@/lib/dates";
import { countdownLabel } from "@/lib/pipeline";
import { bandChipVariant } from "@/lib/score";
import { confirmedMembers, pendingMembers } from "@/lib/teams";
import type { ScoreBand } from "@/lib/types";
import { getPartnerChallengePage } from "@/services/partner.service";
import { getMarketplaceChallengeBySlug } from "@/services/challenge.service";
import { deriveApplicationStage } from "@/services/application-stage";
import { STAGE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

const BANDS: ScoreBand[] = ["Strong", "Proficient", "Developing", "Below threshold"];

/**
 * One team, as the partner deciding about them sees it.
 *
 * The board can only afford a name and a count, which is enough to sort by and
 * not enough to choose by. This is the rest: who is actually on the roster,
 * what each of them scores against this brief, and the same fit arithmetic the
 * team itself saw while assembling — a partner and a team looking at one set of
 * numbers rather than two.
 */
export default async function PartnerTeamPage({
  params,
}: {
  params: Promise<{ id: string; applicationId: string }>;
}) {
  const { id: slug, applicationId } = await params;

  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");

  // Ownership is established by resolving the challenge through the partner
  // service, which scopes to the actor's organization. A challenge belonging
  // to another partner is indistinguishable from one that does not exist.
  const page = await getPartnerChallengePage(resolution.actor, { slug });
  if (!page || !page.canReadApplications) notFound();

  const application = await getApplicationByPublicId(db, applicationId);
  // Guard the pairing, not just the ids — a valid team under the wrong
  // challenge would otherwise render fit numbers against the wrong brief.
  if (!application || application.challenge.slug !== slug) notFound();

  const detail = await getMarketplaceChallengeBySlug(
    slug,
    marketplaceContextForActor(resolution.actor)
  );
  if (!detail) notFound();

  const memberIds = application.members.map((member) => member.student.userId);
  const [profiles, directoryRows] = await Promise.all([
    listStudentTeamProfiles(db, memberIds),
    listDirectoryStudents(db),
  ]);

  // Scored through the partner-facing view, which is the same one the sourcing
  // deck uses — so a team that applied and a candidate who was recommended are
  // read as one number rather than two incompatible ones.
  const directory = new Map(
    directoryRows.map((row) => [String(row.userId), toDirectoryStudent(row)])
  );

  const challenge = toApplyChallenge(detail);
  const team = toTeam(application.teamName, application.members, profiles);
  const confirmed = confirmedMembers(team);
  const pending = pendingMembers(team);

  const stage = deriveApplicationStage({
    assessmentSummaries: application.assessmentSummaries,
    offerSummary: application.offerSummary,
    projectSummary: application.projectSummary,
    status: application.status,
  });

  const offer = application.offerSummary;
  const offerLeft =
    offer && offer.offerStatus === "PENDING" && offer.respondBy
      ? countdownLabel(offer.respondBy.toISOString())
      : null;

  const assessment = application.assessmentSummaries.find(
    (summary) => summary.overallBand !== null
  );

  return (
    <div className="max-w-[900px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner">Your challenges</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/partner/challenges/${slug}`}>{application.challenge.title}</Link>
        <span className="mx-1.5">›</span>
        {team.name}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3.5">
        <div className="min-w-0">
          <h1>{team.name}</h1>
          <p className="text-ink-2 mt-2">
            {confirmed.length} confirmed member
            {confirmed.length === 1 ? "" : "s"}
            {pending.length > 0
              ? ` · ${pending.length} invitation${pending.length === 1 ? "" : "s"} outstanding`
              : ""}
            {application.submittedAt ? ` · applied ${formatDate(application.submittedAt.toISOString())}` : ""}
          </p>
        </div>
        <Chip variant="solid">{STAGE_LABELS[stage]}</Chip>
      </div>

      {offerLeft ? (
        <p
          className={
            offerLeft === "Expired"
              ? "text-meta text-warn font-medium mt-3"
              : "text-meta text-ink-3 mt-3"
          }
        >
          {offerLeft === "Expired"
            ? "The offer to this team has expired."
            : `${offerLeft} left for this team to respond to your offer.`}
        </p>
      ) : null}

      <Section title="Members" aside={`${team.members.length} listed`}>
        <PartnerTeamRoster challenge={challenge} directory={directory} team={team} />
      </Section>

      <Section title="Fit">
        <TeamFit team={team} challenge={challenge} />
      </Section>

      {assessment?.overallBand ? (
        <Section title="Assessment">
          <div className="bg-card border border-line rounded-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Chip variant={bandChipVariant(toBand(assessment.overallBand))}>
                {assessment.overallBand} overall
              </Chip>
              {assessment.submittedAt ? (
                <span className="text-meta text-ink-3">
                  Submitted {formatDate(assessment.submittedAt.toISOString())}
                </span>
              ) : null}
            </div>
            <p className="text-meta text-ink-3 mt-3 leading-relaxed">
              Bands only. The platform does not show a partner a numeric score
              or a rank against other applicants.
            </p>
          </div>
        </Section>
      ) : null}

      <p className="text-meta text-ink-3 mt-7 pt-4 border-t border-line leading-relaxed">
        Per-member scores are that student against this brief only. GPA and full
        transcripts stay private; showcased coursework is what each student
        chose to publish.
      </p>
    </div>
  );
}

/** Bands come back from jsonb as free text; anything unrecognised is not a band. */
function toBand(value: string): ScoreBand {
  return BANDS.find((band) => band === value) ?? "Developing";
}
