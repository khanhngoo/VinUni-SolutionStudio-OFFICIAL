"use client";

import { useState } from "react";
import Link from "next/link";
import { SelectionTimeline } from "@/components/challenge/selection-timeline";
import { Chip } from "@/components/ui/chip";
import { CheckIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/section";
import { deadlineLabel, isUrgent } from "@/lib/dates";
import { sizeLabel } from "@/lib/teams";
import type { Challenge, EligibilityResult } from "@/lib/types";

interface ApplyPanelProps {
  challenge: Challenge;
  eligibility: EligibilityResult;
}

/**
 * The pre-application state of a challenge: the deadline, whether this student
 * is eligible, and the way in.
 *
 * Applying is four steps and a team, so it lives at `/challenges/[id]/apply`
 * rather than in a modal here. `applied` stays as session-only state for the
 * timeline's benefit — there is no persistence layer yet.
 */
export function ApplyPanel({ challenge, eligibility }: ApplyPanelProps) {
  const [applied] = useState(false);

  const urgent = isUrgent(challenge.deadline);

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
              {deadlineLabel(challenge.deadline)}
            </p>
            <p className="text-meta text-ink-3 mt-0.5">
              {challenge.applicantCount} students have applied
            </p>
          </div>

          {applied ? (
            <Chip variant="ok" className="px-3 py-2 text-[12px]">
              <CheckIcon className="w-3.5 h-3.5" />
              Applied · pending faculty
            </Chip>
          ) : eligibility.eligible ? (
            <div className="text-right">
              <Link
                href={`/challenges/${challenge.id}/apply`}
                className="inline-flex items-center h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Apply to this challenge
              </Link>
              <p className="text-meta text-ink-3 mt-2">
                Teams of {sizeLabel(challenge)} · you&apos;ll invite teammates
                first
              </p>
            </div>
          ) : (
            <div className="text-right">
              <button
                type="button"
                disabled
                className="h-10 px-5 rounded-card bg-line-2 border border-line text-ink-3 font-semibold cursor-not-allowed"
              >
                Apply to this challenge
              </button>
              <p className="text-meta text-warn mt-2 max-w-[38ch]">
                {eligibility.reasons[0]}{" "}
                <a href="#" className="text-ink-2 underline">
                  Request an exception
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      <Section title="Selection timeline">
        <div className="bg-card border border-line rounded-card px-5 py-6">
          <SelectionTimeline currentNodeIndex={applied ? 0 : -1} />
        </div>
      </Section>
    </>
  );
}
