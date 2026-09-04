import Link from "next/link";
import { notFound } from "next/navigation";
import { PartnerTeamRoster } from "@/components/partner/partner-team-roster";
import { TeamFit } from "@/components/team/team-fit";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { formatDate } from "@/lib/dates";
import { countdownLabel } from "@/lib/pipeline";
import {
  applicationsForChallenge,
  getOrgApplicationById,
  getOrgChallengeById,
  orgChallenges,
} from "@/lib/provider";
import { bandChipVariant } from "@/lib/score";
import { confirmedMembers, pendingMembers } from "@/lib/teams";
import { STAGE_LABELS } from "@/lib/types";

export function generateStaticParams() {
  return orgChallenges().flatMap((challenge) =>
    applicationsForChallenge(challenge.id).map((application) => ({
      id: challenge.id,
      applicationId: application.id,
    })),
  );
}

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
  const { id, applicationId } = await params;

  const challenge = getOrgChallengeById(id);
  const application = getOrgApplicationById(applicationId);
  // Guard the pairing, not just the ids — a valid team under the wrong
  // challenge would otherwise render fit numbers against the wrong brief.
  if (!challenge || !application || application.challengeId !== id) notFound();

  const confirmed = confirmedMembers(application.team);
  const pending = pendingMembers(application.team);
  const offerLeft = application.offer
    ? countdownLabel(application.offer.respondBy)
    : null;

  return (
    <div className="max-w-[900px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner">Your challenges</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/partner/challenges/${challenge.id}`}>
          {challenge.title}
        </Link>
        <span className="mx-1.5">›</span>
        {application.team.name}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3.5">
        <div className="min-w-0">
          <h1>{application.team.name}</h1>
          <p className="text-ink-2 mt-2">
            {confirmed.length} confirmed member
            {confirmed.length === 1 ? "" : "s"}
            {pending.length > 0
              ? ` · ${pending.length} invitation${pending.length === 1 ? "" : "s"} outstanding`
              : ""}{" "}
            · applied {formatDate(application.appliedAt)}
          </p>
        </div>
        <Chip variant="solid">{STAGE_LABELS[application.stage]}</Chip>
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

      <Section title="Members" aside={`${application.team.members.length} listed`}>
        <PartnerTeamRoster team={application.team} challenge={challenge} />
      </Section>

      <Section title="Fit">
        <TeamFit team={application.team} challenge={challenge} />
      </Section>

      {application.testResult ? (
        <Section
          title="Assessment"
          aside={`${application.testResult.minutesTaken} min`}
        >
          <div className="bg-card border border-line rounded-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Chip variant={bandChipVariant(application.testResult.overallBand)}>
                {application.testResult.overallBand} overall
              </Chip>
              <Chip
                variant={application.testResult.passed ? "ok" : "outline-dashed"}
              >
                {application.testResult.passed ? "Passed" : "Did not pass"}
              </Chip>
              <span className="text-meta text-ink-3">
                Submitted {formatDate(application.testResult.submittedAt)}
              </span>
            </div>

            <ul className="mt-4 pt-4 border-t border-line-2 flex flex-col gap-2">
              {application.testResult.sections.map((section) => (
                <li
                  key={section.name}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="text-ink-2 min-w-0 truncate">
                    {section.name}
                  </span>
                  <Chip variant={bandChipVariant(section.band)}>
                    {section.band}
                  </Chip>
                </li>
              ))}
            </ul>
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
