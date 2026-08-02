"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Milestone } from "@/lib/types";

const TYPES = [
  "Report",
  "Code repository link",
  "Dataset",
  "Prototype link",
  "Presentation",
  "Dashboard",
];

interface SubmitDeliverableProps {
  milestones: Milestone[];
}

type Errors = Partial<Record<"milestone" | "type" | "file" | "notes", string>>;

/** Diagram 5.3 — the student's one write action in the workspace. */
export function SubmitDeliverable({ milestones }: SubmitDeliverableProps) {
  const [open, setOpen] = useState(false);

  const openMilestones = milestones.filter((m) => m.status !== "Approved");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Submit a deliverable
      </button>
      {open ? (
        <SubmitDialog
          milestones={openMilestones}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function SubmitDialog({
  milestones,
  onClose,
}: {
  milestones: Milestone[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [milestoneId, setMilestoneId] = useState(milestones[0]?.id ?? "");
  const [type, setType] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const isLinkType = type.includes("link");

  function validate(): Errors {
    const next: Errors = {};
    if (milestoneId === "") next.milestone = "Pick which milestone this is for.";
    if (type === "") next.type = "Pick a deliverable type.";
    if (isLinkType) {
      if (link.trim() === "") next.file = "Paste the link.";
    } else if (fileName === null) {
      next.file = "Choose a file to attach.";
    }
    return next;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    // Nothing is uploaded — there is no storage layer behind this yet.
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 700);
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
      aria-labelledby="submit-deliverable-title"
      className="m-auto w-[min(560px,calc(100vw-32px))] max-h-[calc(100dvh-48px)] rounded-card border border-line bg-card p-0 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop:bg-ink/45"
    >
      {submitted ? (
        <div className="px-6 py-12 text-center">
          <span className="w-10 h-10 rounded-full bg-ok-soft text-ok grid place-items-center mx-auto">
            <CheckIcon className="w-5 h-5" />
          </span>
          <p className="font-semibold text-[15px] mt-3.5">Deliverable submitted</p>
          <p className="text-ink-2 mt-1.5 max-w-[42ch] mx-auto">
            Your supervisor and the partner have both been notified. Each needs
            to approve before this milestone closes.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 mt-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
          >
            Done
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col max-h-[calc(100dvh-48px)]"
        >
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-line">
            <h2 id="submit-deliverable-title">Submit a deliverable</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 shrink-0 rounded-card border border-line text-ink-3 grid place-items-center hover:text-ink"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto">
            <Field label="Milestone" htmlFor="ms" error={errors.milestone}>
              <select
                id="ms"
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className={inputClass(Boolean(errors.milestone))}
              >
                <option value="">Select a milestone…</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Type" htmlFor="type" error={errors.type}>
              <select
                id="type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setErrors((prev) => ({ ...prev, file: undefined }));
                }}
                className={inputClass(Boolean(errors.type))}
              >
                <option value="">Select a type…</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            {isLinkType ? (
              <Field label="Link" htmlFor="link" error={errors.file}>
                <input
                  id="link"
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://"
                  className={inputClass(Boolean(errors.file))}
                />
              </Field>
            ) : (
              <Field label="File" htmlFor="file" error={errors.file}>
                <label
                  htmlFor="file"
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-card border border-dashed px-4 py-7 cursor-pointer text-center",
                    errors.file ? "border-warn" : "border-line",
                  )}
                >
                  <span className="font-medium text-ink">
                    {fileName ?? "Choose a file"}
                  </span>
                  <span className="text-meta text-ink-3">
                    PDF, DOCX, ZIP or notebook · up to 50 MB
                  </span>
                  <input
                    id="file"
                    type="file"
                    className="sr-only"
                    onChange={(e) => {
                      const picked = e.target.files?.[0];
                      setFileName(picked ? picked.name : null);
                    }}
                  />
                </label>
              </Field>
            )}

            <Field label="Notes for your reviewers" htmlFor="notes">
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything they should look at first, or know about what's incomplete."
                className={inputClass(false)}
              />
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
              {submitting ? "Submitting…" : "Submit"}
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
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block font-semibold text-ink mb-1.5">
        {label}
      </label>
      {children}
      {error ? <p className="text-meta text-warn mt-1.5">{error}</p> : null}
    </div>
  );
}
