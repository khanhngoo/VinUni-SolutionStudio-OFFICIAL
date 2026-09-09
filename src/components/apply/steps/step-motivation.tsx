"use client";

import { Field, inputClass } from "@/components/apply/field";
import { Section } from "@/components/ui/section";
import { MAX_WORDS, wordCount, type ApplyErrors } from "@/lib/apply-validation";
import type { Challenge } from "@/lib/types";

interface StepMotivationProps {
  challenge: Challenge;
  motivation: string;
  experience: string;
  errors: ApplyErrors;
  onMotivation: (value: string) => void;
  onExperience: (value: string) => void;
}

/** Step two. The only part of the application nobody else can derive. */
export function StepMotivation({
  challenge,
  motivation,
  experience,
  errors,
  onMotivation,
  onExperience,
}: StepMotivationProps) {
  const words = wordCount(motivation);
  const overLimit = words > MAX_WORDS;

  return (
    <>
      <h1 className="mt-5">Why this one</h1>
      <p className="text-ink-2 mt-2">
        The partner reads this before anything else. Write it about{" "}
        {challenge.title.toLowerCase()}, not about yourself in general.
      </p>

      <Section title="Motivation">
        <div className="bg-card border border-line rounded-card p-5 flex flex-col gap-4">
          <Field
            label="Why this challenge?"
            hint={`${words}/${MAX_WORDS} words`}
            hintTone={overLimit ? "warn" : "muted"}
            error={errors.motivation}
            htmlFor="motivation"
          >
            <textarea
              id="motivation"
              rows={6}
              value={motivation}
              onChange={(e) => onMotivation(e.target.value)}
              placeholder="What draws you to this problem?"
              className={inputClass(Boolean(errors.motivation))}
            />
          </Field>

          <Field
            label="Most relevant experience"
            error={errors.experience}
            htmlFor="experience"
          >
            <textarea
              id="experience"
              rows={4}
              value={experience}
              onChange={(e) => onExperience(e.target.value)}
              placeholder="A project, course or role that prepared you for it."
              className={inputClass(Boolean(errors.experience))}
            />
          </Field>
        </div>
      </Section>

      <p className="text-meta text-ink-3 mt-3">
        Written by you as team lead, on behalf of the whole team.
      </p>
    </>
  );
}
