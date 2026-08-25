"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { INPUT_CLASS, SkillPicker } from "@/components/challenge/skill-picker";
import type { ReviewOrganizationOption } from "@/db/queries/review";
import type { CanonicalSkillOption } from "@/db/queries/skills";

import { createChallengeDraftAction } from "./actions";

/**
 * The `/partner/post` authoring form. Canonical skill identity is never
 * authored here — `SkillPicker` only lets the partner check existing active
 * canonical skills (read server-side from the frozen taxonomy) and mark
 * each REQUIRED/PREFERRED; there is no free-text skill input. The
 * managing-organization selector only lists real INTERNAL_UNIT
 * organizations read from PostgreSQL — no default is pre-selected, so the
 * partner must make an explicit choice.
 */
export function PartnerPostForm({
  canonicalSkills,
  managingOrganizations,
}: {
  canonicalSkills: CanonicalSkillOption[];
  managingOrganizations: ReviewOrganizationOption[];
}) {
  const [skillCount, setSkillCount] = useState(0);

  return (
    <form action={createChallengeDraftAction} className="mt-6 flex flex-col gap-6">
      <Field label="Title">
        <input name="title" required maxLength={255} className={INPUT_CLASS} />
      </Field>

      <Field label="Summary" hint="Shown to students browsing the marketplace.">
        <textarea name="summary" required rows={2} className={`${INPUT_CLASS} h-auto py-2 min-h-16`} />
      </Field>

      <Field label="Description" hint="Full brief. Shown on the challenge detail page.">
        <textarea name="description" required rows={6} className={`${INPUT_CLASS} h-auto py-2 min-h-36`} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Subtype" hint="Optional">
          <input name="subtype" className={INPUT_CLASS} />
        </Field>
        <Field label="Domain" hint="Optional">
          <input name="domain" className={INPUT_CLASS} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Application deadline">
          <input type="date" name="applicationDeadline" required className={INPUT_CLASS} />
        </Field>
        <Field label="Start date" hint="Optional">
          <input type="date" name="startDate" className={INPUT_CLASS} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Duration (weeks)">
          <input type="number" min={1} name="durationWeeks" required className={INPUT_CLASS} />
        </Field>
        <Field label="Weekly hours">
          <input type="number" min={1} name="weeklyHours" required className={INPUT_CLASS} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Team size — min">
          <input type="number" min={1} name="teamSizeMin" required className={INPUT_CLASS} />
        </Field>
        <Field label="Team size — max">
          <input type="number" min={1} name="teamSizeMax" required className={INPUT_CLASS} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Work mode">
          <select name="workMode" className={INPUT_CLASS} defaultValue="HYBRID">
            <option value="ONSITE">On-site</option>
            <option value="HYBRID">Hybrid</option>
            <option value="REMOTE">Remote</option>
          </select>
        </Field>
        <Field label="Compensation">
          <select name="compensationType" className={INPUT_CLASS} defaultValue="NOT_SPECIFIED">
            <option value="NOT_SPECIFIED">Not specified</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="CREDIT">Academic credit</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
      </div>

      <Field
        label="Managing VinUni unit"
        hint="Exactly one internal unit will review and manage this challenge."
      >
        <select name="managingOrganizationId" required className={INPUT_CLASS} defaultValue="">
          <option value="" disabled>
            Select a managing unit…
          </option>
          {managingOrganizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <label className="text-meta font-semibold text-ink-2 uppercase tracking-wide">
          Canonical skills
        </label>
        <p className="text-meta text-ink-3 mt-1">
          Pick from the existing VinUni canonical skill taxonomy — free-text
          skill creation is not available.
        </p>
        <SkillPicker
          canonicalSkills={canonicalSkills}
          hiddenFieldName="skillsJson"
          onSelectionCountChange={setSkillCount}
        />
      </div>

      <SubmitButton disabled={skillCount === 0} label="Create draft" pendingLabel="Creating draft…" />
    </form>
  );
}

function SubmitButton({
  disabled,
  label,
  pendingLabel,
}: {
  disabled: boolean;
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="self-start inline-flex items-center justify-center h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function Field({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-meta font-semibold text-ink-2 uppercase tracking-wide">{label}</span>
      {children}
      {hint ? <span className="text-meta text-ink-3">{hint}</span> : null}
    </label>
  );
}
