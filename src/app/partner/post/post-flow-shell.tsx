"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import type { CanonicalSkillOption } from "@/db/queries/skills";
import type { ReviewOrganizationOption } from "@/db/queries/review";

import { PartnerPostForm } from "./post-form";

type Step = "start" | "details";

/**
 * Posting a challenge, in the shape the product was designed around: start,
 * write the brief, then CAID reviews it before students ever see it.
 *
 * The prototype opened with a document upload that parsed a brief into the
 * form. There is no parser — the prototype's was a timer over a fixed sample —
 * so the affordance is shown and disabled rather than loading someone else's
 * brief and calling it yours. Everything after it is real: the form creates a
 * DRAFT, and publishing is a separate decision made by a reviewer.
 */
export function PostFlowShell({
  canonicalSkills,
  managingOrganizations,
}: {
  canonicalSkills: CanonicalSkillOption[];
  managingOrganizations: ReviewOrganizationOption[];
}) {
  const [step, setStep] = useState<Step>("start");

  return (
    <>
      <StepBar active={step === "start" ? 1 : 2} />

      {step === "start" ? (
        <div>
          <div className="mt-6 border border-dashed border-line rounded-card py-10 px-6 text-center">
            <p className="text-[20px] text-ink-3" aria-hidden>
              ✦
            </p>
            <p className="font-semibold text-ink mt-2">
              Reading a brief from a document isn&apos;t available yet
            </p>
            <p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto leading-relaxed">
              When it is, we&apos;ll show you every field we filled in, where in
              your document it came from, and what we couldn&apos;t find — so
              you can correct it before it goes anywhere.
            </p>
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center h-9 px-4 mt-5 rounded-card border border-line text-ink-3 font-semibold disabled:opacity-60"
            >
              Upload a brief
            </button>
          </div>

          <div className="flex items-center gap-3 my-6">
            <span className="flex-1 h-px bg-line" />
            <span className="text-meta text-ink-3">fill it in yourself</span>
            <span className="flex-1 h-px bg-line" />
          </div>

          <button
            type="button"
            onClick={() => setStep("details")}
            className="w-full h-10 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
          >
            Write the brief
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setStep("start")}
            className="text-meta text-ink-3 hover:text-brand mt-5"
          >
            ← Back
          </button>
          <PartnerPostForm
            canonicalSkills={canonicalSkills}
            managingOrganizations={managingOrganizations}
          />
        </>
      )}
    </>
  );
}

function StepBar({ active }: { active: 1 | 2 | 3 }) {
  const steps = ["Start", "Write the brief", "CAID review"];

  return (
    <div className="flex gap-1.5 mt-4">
      {steps.map((label, index) => (
        <div key={label} className="flex-1">
          <span
            className={cn(
              "block h-1 rounded-full",
              index + 1 <= active ? "bg-brand" : "bg-line"
            )}
          />
          <span
            className={cn(
              "block text-meta mt-1.5",
              index + 1 <= active ? "text-ink-2" : "text-ink-3"
            )}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
