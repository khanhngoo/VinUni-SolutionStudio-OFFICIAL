"use client";

import { useState } from "react";
import { ApplyModal } from "@/components/apply/apply-modal";
import { SelectionTimeline } from "@/components/challenge/selection-timeline";
import { Chip } from "@/components/ui/chip";
import { CheckIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/section";
import { deadlineLabel, isUrgent } from "@/lib/dates";
import type { Challenge, EligibilityResult, Faculty } from "@/lib/types";

interface ApplyPanelProps {
  challenge: Challenge;
  eligibility: EligibilityResult;
  facultyOptions: Faculty[];
  defaultHours: number;
}

/**
 * Owns the only mutable state in the app: whether this session has applied. That
 * drives both the CTA and how far the timeline has advanced. State is deliberately
 * session-only — there is no persistence layer yet.
 */
export function ApplyPanel({
  challenge,
  eligibility,
  facultyOptions,
  defaultHours,
}: ApplyPanelProps) {
  const [applied, setApplied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

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
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Apply to this challenge
            </button>
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

      {modalOpen ? (
        <ApplyModal
          challenge={challenge}
          facultyOptions={facultyOptions}
          defaultHours={defaultHours}
          onClose={() => setModalOpen(false)}
          onSubmitted={() => {
            setApplied(true);
            setModalOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
