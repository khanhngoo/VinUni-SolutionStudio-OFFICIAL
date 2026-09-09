"use client";

import { Field, inputClass } from "@/components/apply/field";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import type { ApplyErrors } from "@/lib/apply-validation";
import { isAtCapacity, type Challenge, type Faculty } from "@/lib/types";

interface StepSupervisorProps {
  challenge: Challenge;
  facultyOptions: Faculty[];
  hours: string;
  facultyId: string;
  errors: ApplyErrors;
  onHours: (value: string) => void;
  onFaculty: (value: string) => void;
}

/**
 * Step three. The supervisor mentors in the workspace rather than gating entry
 * (the swimlane diagram has no faculty-approval step on an application), but
 * they still have to agree to it, so they are nominated here.
 */
export function StepSupervisor({
  challenge,
  facultyOptions,
  hours,
  facultyId,
  errors,
  onHours,
  onFaculty,
}: StepSupervisorProps) {
  const selected = facultyOptions.find((f) => f.id === facultyId);
  const suggested = new Set(challenge.suggestedFacultyIds);

  return (
    <>
      <h1 className="mt-5">Commitment and supervisor</h1>
      <p className="text-ink-2 mt-2">
        This challenge expects {challenge.hoursPerWeek} hours a week for{" "}
        {challenge.durationWeeks} weeks.
      </p>

      <Section title="Your commitment">
        <div className="bg-card border border-line rounded-card p-5 flex flex-col gap-4">
          <Field
            label="Hours per week you can commit"
            hint={`This challenge expects ${challenge.hoursPerWeek}`}
            error={errors.hours}
            htmlFor="hours"
          >
            <input
              id="hours"
              type="number"
              min={1}
              max={40}
              value={hours}
              onChange={(e) => onHours(e.target.value)}
              className={`${inputClass(Boolean(errors.hours))} w-28`}
            />
          </Field>

          <Field
            label="Faculty supervisor"
            hint="They have five working days to answer"
            error={errors.faculty}
            htmlFor="faculty"
          >
            <select
              id="faculty"
              value={facultyId}
              onChange={(e) => onFaculty(e.target.value)}
              className={inputClass(Boolean(errors.faculty))}
            >
              <option value="">Select a supervisor…</option>
              {facultyOptions.map((f) => {
                const full = isAtCapacity(f);
                return (
                  <option key={f.id} value={f.id} disabled={full}>
                    {f.name} · {f.department}
                    {suggested.has(f.id) ? " · suggested" : ""}
                    {full ? " · at capacity" : ""}
                  </option>
                );
              })}
            </select>
          </Field>

          {selected ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Chip variant="ok">{selected.name}</Chip>
              <span className="text-meta text-ink-3">
                {selected.department}
                {suggested.has(selected.id)
                  ? " · suggested by the partner for this brief"
                  : ""}
              </span>
            </div>
          ) : null}
        </div>
      </Section>
    </>
  );
}
