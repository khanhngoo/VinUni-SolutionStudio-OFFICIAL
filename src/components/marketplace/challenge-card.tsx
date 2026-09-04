import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { LockIcon } from "@/components/ui/icons";
import { ScoreDonut } from "@/components/ui/score-donut";
import { StripedPlaceholder } from "@/components/ui/striped-placeholder";
import {
  challengeCompensationLabel,
  challengeDeadlineKey,
  challengeIsRedacted,
  challengeOrganizationLabel,
  challengeWorkModeLabel,
  type MarketplaceChallengeCardModel,
} from "@/lib/challenge-marketplace";
import { deadlineLabel, isUrgent } from "@/lib/dates";
import type { ScoreBand } from "@/lib/types";

interface ChallengeCardProps {
  challenge: MarketplaceChallengeCardModel;
  /**
   * Suitability of the signed-in student against this brief. Optional because
   * the marketplace is browsable signed-out and by non-students, and because
   * the score is a per-pairing derivation the server supplies — the card never
   * computes it, so it cannot invent one when there is no viewer.
   */
  fit?: { score: number; band: ScoreBand } | null;
}

export function ChallengeCard({ challenge, fit }: ChallengeCardProps) {
  const deadline = challengeDeadlineKey(challenge);
  const urgent = isUrgent(deadline);
  const schools = challenge.eligibilitySummary.schools ?? [];

  return (
    <Link
      href={`/challenges/${challenge.slug}`}
      className="group flex flex-col bg-card border border-line rounded-card overflow-hidden transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <div className="flex flex-col gap-2.5 p-4 flex-1">
        <div className="flex items-center gap-2 text-ink-2">
          <StripedPlaceholder className="w-8 h-8 rounded-card shrink-0" />
          <span className="text-[12px] font-semibold truncate">
            {challengeOrganizationLabel(challenge)}
          </span>
          {challengeIsRedacted(challenge) ? (
            <LockIcon className="w-3.5 h-3.5 shrink-0 text-ink-3" />
          ) : null}
          {fit ? (
            <ScoreDonut
              score={fit.score}
              band={fit.band}
              size="sm"
              label={`Your suitability: ${fit.score} out of 100 — ${fit.band} fit`}
              className="ml-auto"
            />
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Chip>{challenge.subtype ?? "Challenge"}</Chip>
            {schools.map((college) => (
              <Chip key={college}>{college}</Chip>
            ))}
          </div>
          <h2 className="text-ink group-hover:text-brand transition-colors">
            {challenge.title}
          </h2>
        </div>

        <p className="text-meta text-ink-3 leading-relaxed">
          {challengeWorkModeLabel(challenge)} · {challenge.weeklyHours ?? "TBD"} hrs/wk
          <br />
          {challengeCompensationLabel(challenge)} · {challenge.durationWeeks ?? "TBD"} weeks
        </p>

        <div className="mt-auto pt-2.5 border-t border-line-2 flex items-center justify-between gap-2">
          <span
            className={
              urgent ? "text-meta text-warn font-medium" : "text-meta text-ink-3"
            }
          >
            {challenge.applicationDeadline ? deadlineLabel(deadline) : "Deadline TBD"}
          </span>
          <span className="text-meta text-ink-3">
            {challenge.applicantCount} applied
          </span>
        </div>
      </div>
    </Link>
  );
}
