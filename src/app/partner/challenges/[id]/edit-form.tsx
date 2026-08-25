"use client";

import { useState } from "react";

import { INPUT_CLASS, SkillPicker, type InitialSkillSelection } from "@/components/challenge/skill-picker";
import type { CanonicalSkillOption } from "@/db/queries/skills";

import { updateChallengeDraftAction } from "./actions";

/**
 * DRAFT/REVISION_REQUESTED editing for a partner-owned challenge — only
 * fields `updateChallengeDraft` already supports are editable here (see
 * `ChallengeContentWriteInput`); managing organization is never editable
 * from this form since no reassignment semantics exist in the write
 * service.
 */
export function ChallengeEditForm({
  canonicalSkills,
  initialSkills,
  initialValues,
  slug,
}: {
  canonicalSkills: CanonicalSkillOption[];
  initialSkills: InitialSkillSelection[];
  initialValues: {
    description: string;
    domain: string | null;
    durationWeeks: number | null;
    subtype: string | null;
    summary: string;
    teamSizeMax: number | null;
    teamSizeMin: number | null;
    title: string;
    weeklyHours: number | null;
  };
  slug: string;
}) {
  const [skillCount, setSkillCount] = useState(initialSkills.length);

  return (
    <form action={updateChallengeDraftAction} className="mt-4 flex flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />

      <Field label="Title">
        <input name="title" required maxLength={255} defaultValue={initialValues.title} className={INPUT_CLASS} />
      </Field>

      <Field label="Summary">
        <textarea
          name="summary"
          required
          rows={2}
          defaultValue={initialValues.summary}
          className={`${INPUT_CLASS} h-auto py-2 min-h-16`}
        />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          required
          rows={6}
          defaultValue={initialValues.description}
          className={`${INPUT_CLASS} h-auto py-2 min-h-36`}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Subtype" hint="Optional">
          <input name="subtype" defaultValue={initialValues.subtype ?? ""} className={INPUT_CLASS} />
        </Field>
        <Field label="Domain" hint="Optional">
          <input name="domain" defaultValue={initialValues.domain ?? ""} className={INPUT_CLASS} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Duration (weeks)">
          <input
            type="number"
            min={1}
            name="durationWeeks"
            required
            defaultValue={initialValues.durationWeeks ?? undefined}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Weekly hours">
          <input
            type="number"
            min={1}
            name="weeklyHours"
            required
            defaultValue={initialValues.weeklyHours ?? undefined}
            className={INPUT_CLASS}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Team size — min">
          <input
            type="number"
            min={1}
            name="teamSizeMin"
            required
            defaultValue={initialValues.teamSizeMin ?? undefined}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Team size — max">
          <input
            type="number"
            min={1}
            name="teamSizeMax"
            required
            defaultValue={initialValues.teamSizeMax ?? undefined}
            className={INPUT_CLASS}
          />
        </Field>
      </div>

      <div>
        <label className="text-meta font-semibold text-ink-2 uppercase tracking-wide">
          Canonical skills
        </label>
        <SkillPicker
          canonicalSkills={canonicalSkills}
          hiddenFieldName="skillsJson"
          initialSelected={initialSkills}
          onSelectionCountChange={setSkillCount}
        />
      </div>

      <button
        type="submit"
        disabled={skillCount === 0}
        className="self-start inline-flex items-center justify-center h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-50"
      >
        Save changes
      </button>
    </form>
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
