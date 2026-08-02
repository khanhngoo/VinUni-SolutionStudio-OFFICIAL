"use client";

import { useEffect, useRef, useState } from "react";
import { ApplySuccess } from "@/components/apply/apply-success";
import { CloseIcon } from "@/components/ui/icons";
import { isAtCapacity } from "@/lib/data/faculty";
import type { ApplicationDraft, Challenge, Faculty } from "@/lib/types";

const MAX_WORDS = 300;

interface ApplyModalProps {
  challenge: Challenge;
  facultyOptions: Faculty[];
  defaultHours: number;
  onClose: () => void;
  onSubmitted: (draft: ApplicationDraft) => void;
}

type Errors = Partial<Record<"motivation" | "experience" | "hours" | "faculty", string>>;

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

export function ApplyModal({
  challenge,
  facultyOptions,
  defaultHours,
  onClose,
  onSubmitted,
}: ApplyModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");
  const [hours, setHours] = useState(String(defaultHours));
  const [facultyId, setFacultyId] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // showModal() gives focus trapping, ::backdrop and Escape-to-close for free.
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const words = wordCount(motivation);
  const overLimit = words > MAX_WORDS;
  const selectedFaculty = facultyOptions.find((f) => f.id === facultyId);

  function validate(): Errors {
    const next: Errors = {};
    if (motivation.trim() === "") next.motivation = "Tell them why this one.";
    else if (overLimit) next.motivation = `${words} words — the limit is ${MAX_WORDS}.`;
    if (experience.trim() === "") next.experience = "Name something you've done.";
    const hoursNum = Number(hours);
    if (!Number.isFinite(hoursNum) || hoursNum < 1 || hoursNum > 40) {
      next.hours = "Between 1 and 40 hours.";
    }
    if (facultyId === "") next.faculty = "Pick a supervisor to nominate.";
    return next;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    // Fake the round-trip a real submission would take.
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      window.setTimeout(() => {
        onSubmitted({
          challengeId: challenge.id,
          motivation,
          relevantExperience: experience,
          hoursPerWeek: Number(hours),
          facultySupervisorId: facultyId,
        });
      }, 1300);
    }, 600);
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="apply-title"
      className="m-auto w-[min(560px,calc(100vw-32px))] max-h-[calc(100dvh-48px)] rounded-card border border-line bg-card p-0 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop:bg-ink/45"
    >
      {submitted ? (
        <ApplySuccess supervisorName={selectedFaculty?.name ?? "Your supervisor"} />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(100dvh-48px)]">
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-line">
            <div>
              <h2 id="apply-title">Apply to this challenge</h2>
              <p className="text-meta text-ink-3 mt-1">{challenge.title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 shrink-0 rounded-md border border-line text-ink-3 grid place-items-center hover:text-ink"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto">
            <Field
              label="Why this challenge?"
              hint={`${words}/${MAX_WORDS} words`}
              hintTone={overLimit ? "warn" : "muted"}
              error={errors.motivation}
              htmlFor="motivation"
            >
              <textarea
                id="motivation"
                rows={4}
                autoFocus
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
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
                rows={3}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="A project, course or role that prepared you for it."
                className={inputClass(Boolean(errors.experience))}
              />
            </Field>

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
                onChange={(e) => setHours(e.target.value)}
                className={`${inputClass(Boolean(errors.hours))} w-28`}
              />
            </Field>

            <Field
              label="Faculty supervisor"
              hint="They must accept before CAID review begins"
              error={errors.faculty}
              htmlFor="faculty"
            >
              <select
                id="faculty"
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                className={inputClass(Boolean(errors.faculty))}
              >
                <option value="">Select a supervisor…</option>
                {facultyOptions.map((f) => {
                  const full = isAtCapacity(f);
                  return (
                    <option key={f.id} value={f.id} disabled={full}>
                      {f.name} · {f.department}
                      {full ? " · at capacity" : ""}
                    </option>
                  );
                })}
              </select>
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

function inputClass(hasError: boolean): string {
  return [
    "w-full rounded-card border bg-paper px-3 py-2 text-ink",
    "placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
    hasError ? "border-warn" : "border-line",
  ].join(" ");
}

function Field({
  label,
  hint,
  hintTone = "muted",
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  hintTone?: "muted" | "warn";
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <label htmlFor={htmlFor} className="font-semibold text-ink">
          {label}
        </label>
        {hint ? (
          <span
            className={
              hintTone === "warn" ? "text-meta text-warn" : "text-meta text-ink-3"
            }
          >
            {hint}
          </span>
        ) : null}
      </div>
      {children}
      {error ? <p className="text-meta text-warn mt-1.5">{error}</p> : null}
    </div>
  );
}
