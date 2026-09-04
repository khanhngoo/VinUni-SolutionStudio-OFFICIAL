"use client";

import { useState } from "react";
import Link from "next/link";
import { ParsingScreen } from "@/components/partner/parsing-screen";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import {
  filledCount,
  gapsIn,
  parseStages,
  type ParseConfidence,
  type ParsedBrief,
  type ParsedField,
} from "@/lib/data/brief-parse";
import { COLLEGES, COMPENSATIONS, SUB_TYPES, WORK_MODES } from "@/lib/types";

type Step = "upload" | "parsing" | "review" | "published";

/**
 * Upload → parse → review → publish.
 *
 * The parse is a fixture on a timer, not a model. What is real is the review
 * step's shape: every machine-filled field is marked as such, carries the
 * sentence it came from, and stays editable — and the fields the document
 * never mentioned are shown as gaps rather than guesses. A parser that
 * invents a compensation figure is worse than one that admits it did not find
 * one, and the UI has to make that difference visible.
 */
export function PostFlow({ brief }: { brief: ParsedBrief }) {
  const [step, setStep] = useState<Step>("upload");

  if (step === "published") return <Published />;

  if (step === "parsing") {
    return (
      <ParsingScreen
        brief={brief}
        stages={parseStages}
        onDone={() => setStep("review")}
      />
    );
  }

  if (step === "review") {
    return (
      <ReviewStep
        brief={brief}
        onBack={() => setStep("upload")}
        onPublish={() => setStep("published")}
      />
    );
  }

  return <UploadStep onParse={() => setStep("parsing")} />;
}

function StepBar({ active }: { active: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1.5 mt-4">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "h-[5px] flex-1 rounded-full",
            n <= active ? "bg-brand" : "bg-line",
          )}
        />
      ))}
    </div>
  );
}

function UploadStep({ onParse }: { onParse: () => void }) {
  return (
    <div>
      <h1 className="mt-3.5">Post a challenge</h1>
      <p className="text-ink-2 mt-2">Step 1 of 3 · Start from a brief or a blank form.</p>
      <StepBar active={1} />

      <div className="mt-6 border border-dashed border-accent rounded-card bg-accent-soft/40 py-10 px-6 text-center">
        <p className="text-[20px] text-accent" aria-hidden>
          ✦
        </p>
        <p className="font-semibold text-ink mt-2">Drop your project brief</p>
        <p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto">
          PDF, Word or plain text. We read it into the form and show you what we
          found — you correct anything we got wrong before it goes anywhere.
        </p>
        <div className="flex flex-wrap gap-2 justify-center mt-5">
          <button
            type="button"
            onClick={onParse}
            className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
          >
            Choose a file
          </button>
          <button
            type="button"
            onClick={onParse}
            className="inline-flex items-center justify-center h-9 px-4 rounded-card border border-line text-ink-2 font-medium hover:border-brand hover:text-brand"
          >
            Paste text instead
          </button>
        </div>
        <p className="text-meta text-ink-3 mt-4">
          Demo — either button loads the same sample brief.
        </p>
      </div>

      <div className="flex items-center gap-3 my-6">
        <span className="flex-1 h-px bg-line" />
        <span className="text-meta text-ink-3">or fill it in yourself</span>
        <span className="flex-1 h-px bg-line" />
      </div>

      <div className="bg-card border border-line rounded-card p-5 flex flex-col gap-4">
        <Field label="Title">
          <input
            className="w-full border border-line rounded-card px-3 py-2 text-body"
            placeholder="e.g. Warehouse throughput and picking-route analysis"
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Type">
            <Select options={[...SUB_TYPES]} />
          </Field>
          <Field label="Compensation">
            <Select options={[...COMPENSATIONS]} />
          </Field>
        </div>
        <Field label="Summary students will see">
          <textarea
            rows={3}
            className="w-full border border-line rounded-card px-3 py-2 text-body resize-y"
            placeholder="What the problem is, in language a student outside your industry can follow."
          />
        </Field>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onParse}
            className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  brief,
  onBack,
  onPublish,
}: {
  brief: ParsedBrief;
  onBack: () => void;
  onPublish: () => void;
}) {
  const gaps = gapsIn(brief);
  const filled = filledCount(brief);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mt-3.5">
        <div>
          <h1>Review what we read</h1>
          <p className="text-ink-2 mt-2">
            {brief.fileName} · {filled} fields filled
            {gaps.length > 0 ? ` · ${gaps.length} need you` : ""}
          </p>
        </div>
        <Chip variant="accent">✦ Parsed</Chip>
      </div>
      <StepBar active={2} />

      <div className="mt-5 border border-accent rounded-card bg-accent-soft/40 px-4 py-3">
        <p className="text-ink-2 leading-relaxed">
          Highlighted fields came from your document. Everything stays editable,
          and nothing publishes until you confirm. Hover a confidence chip to see
          the sentence it was read from.
        </p>
      </div>

      {gaps.length > 0 ? (
        <div className="mt-4 border border-warn rounded-card bg-warn-soft px-4 py-3">
          <p className="text-ink font-semibold">
            {gaps.length} thing{gaps.length === 1 ? "" : "s"} your document did
            not mention
          </p>
          <p className="text-ink-2 mt-1 leading-relaxed">
            {gaps.join(", ")}. These are left blank on purpose — a parser
            guessing at your budget or your deadline is worse than one telling
            you it did not find them.
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-4">
        <ParsedText label="Title" field={brief.title} />

        <div className="grid sm:grid-cols-2 gap-4">
          <ParsedText label="Type" field={brief.subType} />
          <ParsedText label="Work mode" field={brief.workMode} />
        </div>

        <ParsedTextarea label="Summary students will see" field={brief.summary} />

        <ParsedList label="Responsibilities" field={brief.responsibilities} />

        <div>
          <Label>
            Skills
            <Confidence field={brief.skills} />
          </Label>
          <div
            className={cn(
              "border rounded-card px-3 py-2.5 flex flex-wrap gap-1.5",
              fieldClass(brief.skills),
            )}
          >
            {(brief.skills.value ?? []).map((skill) => (
              <Chip
                key={skill.name}
                variant={skill.level === "must" ? "default" : "outline-dashed"}
              >
                {skill.name} · {skill.level}
              </Chip>
            ))}
            <Chip variant="outline-dashed">+ add</Chip>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <ParsedText label="Duration (weeks)" field={brief.durationWeeks} />
          <ParsedText label="Hours per week" field={brief.hoursPerWeek} />
          <div>
            <Label>
              Team size
              <Confidence field={brief.teamSize} />
            </Label>
            <div
              className={cn(
                "border rounded-card px-3 py-2 text-body",
                fieldClass(brief.teamSize),
              )}
            >
              {brief.teamSize.value
                ? `${brief.teamSize.value.min}–${brief.teamSize.value.max} students`
                : "—"}
            </div>
          </div>
        </div>

        <div>
          <Label>
            Eligible colleges
            <Confidence field={brief.colleges} />
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {COLLEGES.map((college) => (
              <Chip
                key={college}
                variant={
                  (brief.colleges.value ?? []).includes(college)
                    ? "solid"
                    : "outline-dashed"
                }
              >
                {college}
              </Chip>
            ))}
          </div>
        </div>

        {/* The gaps. Warn treatment, empty value, no guess. */}
        <div className="grid sm:grid-cols-2 gap-4">
          <GapField label="Compensation">
            <Select options={[...COMPENSATIONS]} placeholder="Choose one" warn />
          </GapField>
          <GapField label="Application deadline">
            <input
              type="date"
              className="w-full border border-warn bg-warn-soft rounded-card px-3 py-2 text-body"
            />
          </GapField>
          <GapField label="Start date">
            <input
              type="date"
              className="w-full border border-warn bg-warn-soft rounded-card px-3 py-2 text-body"
            />
          </GapField>
          <GapField label="Assessment track">
            <Select
              options={[
                "Cognitive",
                "Technical",
                "Cognitive + Case",
                "Cognitive + Domain scenario",
              ]}
              placeholder="Choose one"
              warn
            />
          </GapField>
        </div>

        <div>
          <Label>Work mode</Label>
          <div className="flex flex-wrap gap-1.5">
            {WORK_MODES.map((mode) => (
              <Chip
                key={mode}
                variant={brief.workMode.value === mode ? "solid" : "outline-dashed"}
              >
                {mode}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-7 pt-5 border-t border-line">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center h-9 px-4 rounded-card border border-line text-ink-2 font-medium hover:border-brand hover:text-brand"
        >
          ← Start over
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center h-9 px-4 rounded-card border border-line text-ink-2 font-medium hover:border-brand hover:text-brand"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={onPublish}
            className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
          >
            Send for review →
          </button>
        </div>
      </div>
    </div>
  );
}

function Published() {
  return (
    <div className="mt-3.5">
      <h1>Sent for review</h1>
      <StepBar active={3} />
      <div className="mt-6 bg-card border border-line rounded-card p-8 text-center">
        <span className="w-9 h-9 rounded-full bg-ok-soft text-ok grid place-items-center mx-auto text-[16px]">
          ✓
        </span>
        <p className="font-semibold text-ink mt-3">
          Your challenge is with CAID for compliance review
        </p>
        <p className="text-ink-2 mt-1.5 max-w-[52ch] mx-auto leading-relaxed">
          A CAID officer checks every posting before it reaches students. You
          will be notified when it is published, or if they need a change.
        </p>
        <div className="flex flex-wrap gap-2 justify-center mt-5">
          <Link
            href="/partner"
            className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
          >
            Back to your challenges
          </Link>
        </div>
        <p className="text-meta text-ink-3 mt-5">
          Nothing was saved — this demo has no persistence layer.
        </p>
      </div>
    </div>
  );
}

// --- field primitives ------------------------------------------------------

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-[12px] font-semibold text-ink-2 mb-1.5">
      {children}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/** Machine-filled fields get a tint so they are distinguishable at a glance. */
function fieldClass<T>(field: ParsedField<T>): string {
  return field.value === null
    ? "border-warn bg-warn-soft"
    : "border-accent bg-accent-soft/30";
}

function Confidence<T>({ field }: { field: ParsedField<T> }) {
  if (field.value === null) return null;
  const label: Record<ParseConfidence, string> = {
    high: "high confidence",
    medium: "medium confidence",
    low: "low confidence",
  };

  return (
    <span
      title={field.evidence ?? "No supporting sentence found."}
      className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded-card cursor-help",
        field.confidence === "high" && "bg-ok-soft text-ok",
        field.confidence === "medium" && "bg-warn-soft text-warn",
        field.confidence === "low" && "bg-line-2 text-ink-3",
      )}
    >
      {label[field.confidence]}
    </span>
  );
}

function ParsedText<T extends string | number>({
  label,
  field,
}: {
  label: string;
  field: ParsedField<T>;
}) {
  return (
    <div>
      <Label>
        {label}
        <Confidence field={field} />
      </Label>
      <input
        defaultValue={field.value === null ? "" : String(field.value)}
        className={cn(
          "w-full border rounded-card px-3 py-2 text-body",
          fieldClass(field),
        )}
      />
    </div>
  );
}

function ParsedTextarea({
  label,
  field,
}: {
  label: string;
  field: ParsedField<string>;
}) {
  return (
    <div>
      <Label>
        {label}
        <Confidence field={field} />
      </Label>
      <textarea
        rows={4}
        defaultValue={field.value ?? ""}
        className={cn(
          "w-full border rounded-card px-3 py-2 text-body resize-y leading-relaxed",
          fieldClass(field),
        )}
      />
    </div>
  );
}

function ParsedList({
  label,
  field,
}: {
  label: string;
  field: ParsedField<string[]>;
}) {
  return (
    <div>
      <Label>
        {label}
        <Confidence field={field} />
      </Label>
      <div
        className={cn(
          "border rounded-card px-3 py-2.5 flex flex-col gap-1.5",
          fieldClass(field),
        )}
      >
        {(field.value ?? []).map((item) => (
          <span key={item} className="text-ink-2 flex gap-2">
            <span aria-hidden className="text-ink-3">
              ·
            </span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function GapField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>
        <span className="text-warn">{label}</span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-card bg-warn-soft text-warn">
          not in your document
        </span>
      </Label>
      {children}
    </div>
  );
}

function Select({
  options,
  placeholder,
  warn,
}: {
  options: string[];
  placeholder?: string;
  warn?: boolean;
}) {
  return (
    <select
      defaultValue=""
      className={cn(
        "w-full border rounded-card px-3 py-2 text-body",
        warn ? "border-warn bg-warn-soft" : "border-line",
      )}
    >
      <option value="" disabled>
        {placeholder ?? "Choose one"}
      </option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
