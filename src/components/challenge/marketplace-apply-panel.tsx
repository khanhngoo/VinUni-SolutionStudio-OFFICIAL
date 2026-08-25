import Link from "next/link";
import { SelectionTimeline } from "@/components/challenge/selection-timeline";
import { Section } from "@/components/ui/section";
import {
  challengeDeadlineKey,
  challengeDurationLabel,
  challengeSizeLabel,
  challengeWeeklyHoursLabel,
  type MarketplaceChallengeDetailModel,
} from "@/lib/challenge-marketplace";
import { deadlineLabel, isUrgent } from "@/lib/dates";

interface MarketplaceApplyPanelProps {
  challenge: MarketplaceChallengeDetailModel;
  /**
   * -1 before applying, which renders every node as a preview of the process
   * rather than pretending the student has entered it.
   */
  timelineNodeIndex?: number;
}

export function MarketplaceApplyPanel({
  challenge,
  timelineNodeIndex = -1,
}: MarketplaceApplyPanelProps) {
  const deadline = challengeDeadlineKey(challenge);
  const urgent = isUrgent(deadline);

  return (
    <>
      <div className="bg-card border border-line rounded-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p
              className={
                urgent ? "font-semibold text-warn" : "font-semibold text-ink"
              }
            >
              {challenge.applicationDeadline
                ? deadlineLabel(deadline)
                : "Application deadline TBD"}
            </p>
            <p className="text-meta text-ink-3 mt-0.5">
              {challenge.applicantCount} students have applied
            </p>
          </div>

          <div className="text-right">
            <Link
              href={`/challenges/${challenge.slug}/apply`}
              className="inline-flex items-center h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Apply to this challenge
            </Link>
            <p className="text-meta text-ink-3 mt-2">
              Teams of {challengeSizeLabel(challenge)} ·{" "}
              {challengeWeeklyHoursLabel(challenge)} ·{" "}
              {challengeDurationLabel(challenge)}
            </p>
          </div>
        </div>
      </div>

      <Section title="Selection timeline">
        <div className="bg-card border border-line rounded-card px-5 py-6">
          <SelectionTimeline currentNodeIndex={timelineNodeIndex} />
        </div>
      </Section>
    </>
  );
}
