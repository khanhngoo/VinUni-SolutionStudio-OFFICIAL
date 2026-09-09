"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { AvailabilityEditor } from "@/components/profile/availability-editor";
import { SelfReported } from "@/components/profile/verified-mark";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/cn";
import { toTeamRoleEnum } from "@/lib/apply-view";
import {
  TEAM_ROLES,
  WORK_MODES,
  type DayAvailability,
  type Experience,
  type Student,
  type TeamRole,
  type WorkMode,
} from "@/lib/types";

import { saveProfile } from "./actions";

const MAX_ROLES = 3;

const WORK_MODE_ENUMS: Record<WorkMode, string> = {
  Hybrid: "HYBRID",
  "On-site": "ON_SITE",
  Remote: "REMOTE",
};

const AVAILABILITY_ENUMS: Record<DayAvailability, string> = {
  busy: "BUSY",
  free: "FREE",
  partly: "PARTLY",
};

/**
 * Editing happens in place — no separate form page per section, so the shape
 * of the record never changes between reading and writing it.
 *
 * Only the self-reported half is editable. Subjects, grades and experience
 * render as they do on the profile, because the registrar owns the first and
 * the second has no editing surface yet; both say so rather than offering a
 * control that would not stick.
 */
export function ProfileEditor({
  experiences,
  student,
}: {
  experiences: Experience[];
  student: Student;
}) {
  const [about, setAbout] = useState(student.about ?? "");
  const [roles, setRoles] = useState<TeamRole[]>(student.usualRoles);
  const [hours, setHours] = useState(String(student.hoursAvailable));
  const [workMode, setWorkMode] = useState<WorkMode>(student.workPreference);
  const [teamMin, setTeamMin] = useState(String(student.preferredTeamMin || 2));
  const [teamMax, setTeamMax] = useState(String(student.preferredTeamMax || 4));
  const [week, setWeek] = useState<DayAvailability[]>(student.weeklyAvailability);
  const [portfolio, setPortfolio] = useState(student.portfolioUrl ?? "");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleRole(role: TeamRole) {
    setError(null);
    setRoles((current) =>
      current.includes(role)
        ? current.filter((existing) => existing !== role)
        : current.length >= MAX_ROLES
          ? current
          : [...current, role]
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const message = await saveProfile({
        about,
        hoursAvailable: Number(hours),
        portfolioUrl: portfolio,
        preferredTeamMax: Number(teamMax),
        preferredTeamMin: Number(teamMin),
        roles: roles
          .map(toTeamRoleEnum)
          .filter((role): role is string => role !== null),
        weeklyAvailability: week.map((slot) => AVAILABILITY_ENUMS[slot]),
        workPreference: WORK_MODE_ENUMS[workMode],
      });
      if (message) setError(message);
    });
  }

  return (
    <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/profile">Profile</Link>
        <span className="mx-1.5">›</span>
        Edit
      </nav>

      <div className="flex items-center justify-between gap-4 mt-3.5">
        <h1>Edit profile</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="inline-flex items-center h-9 px-4 rounded-card border border-line text-brand font-semibold hover:border-brand hover:text-brand"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex items-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-card border border-warn/35 bg-warn-soft px-4 py-3 text-ink-2"
        >
          {error}
        </div>
      ) : null}

      <Section title="About">
        <Field label="Short introduction">
          <textarea
            value={about}
            onChange={(event) => setAbout(event.target.value)}
            className={cn(FIELD_BASE, "min-h-[68px] py-2.5 leading-relaxed")}
          />
        </Field>
      </Section>

      <Section title="How I work in teams">
        <Field
          label={`Usual roles · pick up to ${MAX_ROLES}`}
          hint="Teammates see these when they invite you."
        >
          <div className="flex flex-wrap gap-1.5">
            {TEAM_ROLES.map((role) => {
              const on = roles.includes(role);
              const full = !on && roles.length >= MAX_ROLES;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  disabled={full}
                  className="disabled:opacity-40"
                >
                  <Chip variant={on ? "solid" : "outline-dashed"}>
                    {role}
                    {on ? " ×" : ""}
                  </Chip>
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Hours per week">
            <input
              type="number"
              min={0}
              max={168}
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              className={cn(FIELD_BASE, "h-9")}
            />
          </Field>
          <Field label="Work mode">
            <select
              value={workMode}
              onChange={(event) => setWorkMode(event.target.value as WorkMode)}
              className={cn(FIELD_BASE, "h-9")}
            >
              {WORK_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Preferred team size">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={teamMin}
                onChange={(event) => setTeamMin(event.target.value)}
                className={cn(FIELD_BASE, "h-9")}
                aria-label="Smallest team"
              />
              <span className="text-ink-3">–</span>
              <input
                type="number"
                min={1}
                value={teamMax}
                onChange={(event) => setTeamMax(event.target.value)}
                className={cn(FIELD_BASE, "h-9")}
                aria-label="Largest team"
              />
            </div>
          </Field>
        </div>

        <Field
          label="Free afternoons"
          hint="Click a day to cycle free · partly · busy."
        >
          <AvailabilityEditor initial={week} onChange={setWeek} />
        </Field>
      </Section>

      <Section title="Subjects & grades">
        <div className="bg-card border border-line border-l-[3px] border-l-brand rounded-card p-4">
          <p className="text-ink-2">
            Pulled from the registrar every term and can&apos;t be edited here.
            If something looks wrong, contact the registrar.
          </p>
          {student.transcriptUrl ? (
            <a
              href={student.transcriptUrl}
              className="inline-block font-semibold mt-2"
            >
              Download transcript PDF ↓
            </a>
          ) : null}
        </div>
      </Section>

      <Section title="Experience">
        {experiences.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {experiences.map((entry) => (
              <li
                key={entry.id}
                className="bg-card border border-line rounded-card p-4"
              >
                <p className="font-semibold text-ink">{entry.role}</p>
                <p className="text-meta text-ink-3 mt-0.5">
                  {entry.organisation} · {entry.from} – {entry.to ?? "Present"}
                </p>
                {entry.summary ? (
                  <p className="text-ink-2 mt-2">{entry.summary}</p>
                ) : null}
                <div className="mt-3">
                  <SelfReported>
                    Self-reported · shown to partners as unverified
                  </SelfReported>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-3">Nothing yet.</p>
        )}
        <p className="text-meta text-ink-3 mt-2.5">
          Adding and editing experience entries isn&apos;t available here yet.
        </p>
      </Section>

      <Section title="Links">
        <Field
          label="Portfolio or GitHub"
          hint="Optional, but partners open them."
        >
          <input
            value={portfolio}
            onChange={(event) => setPortfolio(event.target.value)}
            placeholder="https://…"
            className={cn(FIELD_BASE, "h-9")}
          />
        </Field>
      </Section>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <p className="text-meta text-ink-3 uppercase tracking-[0.07em]">{label}</p>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="text-meta text-ink-3 mt-1.5">{hint}</p> : null}
    </div>
  );
}

const FIELD_BASE =
  "w-full border border-line rounded-card bg-card px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
