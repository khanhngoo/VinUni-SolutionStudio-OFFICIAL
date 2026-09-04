"use client";

import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/cn";
import { wordCount, type ApplyErrors } from "@/lib/apply-validation";
import { combinedHours, sizeLabel, teamSize } from "@/lib/teams";
import type { Challenge, Faculty, Team } from "@/lib/types";

interface StepReviewProps {
  challenge: Challenge;
  team: Team;
  supervisor: Faculty | undefined;
  motivation: string;
  experience: string;
  hours: string;
  errors: ApplyErrors;
  onJump: (step: number) => void;
}

/**
 * Step four: everything the partner will see, before they see it.
 *
 * Each block links back to the step that produced it, so a problem found here
 * is fixed where it was made rather than re-entered.
 */
export function StepReview({
  challenge,
  team,
  supervisor,
  motivation,
  experience,
  hours,
  errors,
  onJump,
}: StepReviewProps) {
  const problems = Object.values(errors).filter(Boolean);

  return (
    <>
      <h1 className="mt-5">Check it over</h1>
      <p className="text-ink-2 mt-2">
        This is what {challenge.orgName ?? challenge.orgCategory} receives.
        Nothing is sent until you submit.
      </p>

      {problems.length > 0 ? (
        <div className="mt-4 border border-warn bg-warn-soft rounded-card p-4">
          <p className="font-semibold text-warn">
            {problems.length} thing{problems.length === 1 ? "" : "s"} to fix
            first
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {problems.map((problem) => (
              <li key={problem} className="text-meta text-ink-2">
                · {problem}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Section title="Team" aside={<EditLink onClick={() => onJump(0)} />}>
        <div className="bg-card border border-line rounded-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{team.name}</span>
            <Chip>
              {teamSize(team)} of {sizeLabel(challenge)}
            </Chip>
            <Chip variant="outline-dashed">
              {combinedHours(team)} h/wk combined
            </Chip>
          </div>
          <ul className="mt-3 pt-3 border-t border-line-2 flex flex-col gap-1.5">
            {team.members.map((member) => (
              <li
                key={member.studentId}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="text-ink-2 min-w-0 truncate">
                  {member.name}{" "}
                  <span className="text-ink-3 text-meta">· {member.role}</span>
                </span>
                <span
                  className={cn(
                    "text-meta shrink-0",
                    member.status === "invited" ? "text-warn" : "text-ink-3",
                  )}
                >
                  {member.status === "leader"
                    ? "Team lead"
                    : member.status === "accepted"
                      ? "Accepted"
                      : member.status === "invited"
                        ? "Awaiting answer"
                        : "Declined"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title="Motivation" aside={<EditLink onClick={() => onJump(1)} />}>
        <div className="bg-card border border-line rounded-card p-5">
          <p className="text-ink-2 leading-relaxed whitespace-pre-wrap">
            {motivation.trim() || "Nothing written yet."}
          </p>
          <p className="text-meta text-ink-3 mt-2">
            {wordCount(motivation)} words
          </p>

          <div className="mt-4 pt-4 border-t border-line-2">
            <h3 className="text-h3 text-ink-3">Relevant experience</h3>
            <p className="text-ink-2 leading-relaxed mt-1.5 whitespace-pre-wrap">
              {experience.trim() || "Nothing written yet."}
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Commitment and supervisor"
        aside={<EditLink onClick={() => onJump(2)} />}
      >
        <div className="bg-card border border-line rounded-card p-5 grid sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-h3 text-ink-3">Your hours</h3>
            <p className="text-ink font-medium mt-1">
              {hours} h/wk{" "}
              <span className="text-meta text-ink-3">
                (asked for {challenge.hoursPerWeek})
              </span>
            </p>
          </div>
          <div>
            <h3 className="text-h3 text-ink-3">Nominated supervisor</h3>
            <p className="text-ink font-medium mt-1">
              {supervisor ? supervisor.name : "Not chosen"}
              {supervisor ? (
                <span className="text-meta text-ink-3">
                  {" "}
                  · {supervisor.department}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}

function EditLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-meta text-brand underline hover:text-brand-deep"
    >
      Edit
    </button>
  );
}
