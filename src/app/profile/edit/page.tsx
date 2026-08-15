import Link from "next/link";
import { AvailabilityEditor } from "@/components/profile/availability-editor";
import { SelfReported } from "@/components/profile/verified-mark";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { currentStudent } from "@/lib/data/student";
import { experience } from "@/lib/data/transcript";
import { TEAM_ROLES, WORK_MODES } from "@/lib/types";

const MAX_ROLES = 3;

/**
 * Editing happens in place — no separate form page per section, so the shape
 * of the record never changes between reading and writing it.
 *
 * State is deliberately session-only, like the rest of the prototype: nothing
 * here persists, and the fields render their seeded values.
 */
export default function ProfileEditPage() {
  const student = currentStudent;

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
          <Link
            href="/profile"
            className="inline-flex items-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
          >
            Save
          </Link>
        </div>
      </div>

      <Section title="About">
        <Field label="Short introduction">
          <Textarea>{student.about ?? ""}</Textarea>
        </Field>
      </Section>

      <Section title="How I work in teams">
        <Field
          label={`Usual roles · pick up to ${MAX_ROLES}`}
          hint="Teammates see these when they invite you."
        >
          <div className="flex flex-wrap gap-1.5">
            {TEAM_ROLES.map((role) => {
              const on = student.usualRoles.includes(role);
              return (
                <Chip key={role} variant={on ? "solid" : "outline-dashed"}>
                  {role}
                  {on ? " ×" : ""}
                </Chip>
              );
            })}
          </div>
        </Field>

        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Hours per week">
            <Input>{String(student.hoursAvailable)}</Input>
          </Field>
          <Field label="Work mode">
            <Select>{student.workPreference}</Select>
          </Field>
          <Field label="Preferred team size">
            <Select>
              {student.preferredTeamMin} – {student.preferredTeamMax}
            </Select>
          </Field>
        </div>
        <p className="text-meta text-ink-3 -mt-1 mb-3">
          Work modes: {WORK_MODES.join(" · ")}
        </p>

        <Field label="Free afternoons" hint="Click a day to cycle free · partly · busy.">
          <AvailabilityEditor initial={student.weeklyAvailability} />
        </Field>
      </Section>

      <Section title="Subjects & grades">
        <div className="bg-card border border-line border-l-[3px] border-l-brand rounded-card p-4">
          <p className="text-ink-2">
            Pulled from the registrar every term and can&apos;t be edited here.
            If something looks wrong, contact the registrar.
          </p>
          <a
            href={student.transcriptUrl}
            className="inline-block font-semibold mt-2"
          >
            Download transcript PDF ↓
          </a>
        </div>
      </Section>

      <Section title="Experience">
        <ul className="flex flex-col gap-2.5">
          {experience.map((entry) => (
            <li
              key={entry.id}
              className="bg-card border border-line rounded-card p-4"
            >
              <Field label="Role">
                <Input>{entry.role}</Input>
              </Field>
              <div className="grid sm:grid-cols-[1fr_120px_120px] gap-3">
                <Field label="Organisation">
                  <Input>{entry.organisation}</Input>
                </Field>
                <Field label="From">
                  <Select>{entry.from}</Select>
                </Field>
                <Field label="To">
                  <Select>{entry.to ?? "Present"}</Select>
                </Field>
              </div>
              <Field label="What you did">
                <Textarea>{entry.summary ?? ""}</Textarea>
              </Field>
              <div className="flex items-center justify-between gap-3">
                <SelfReported>
                  Self-reported · shown to partners as unverified
                </SelfReported>
                <button
                  type="button"
                  className="text-meta text-ink-3 hover:text-warn"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="w-full h-9 mt-2.5 rounded-card border border-dashed border-line text-ink-3 font-semibold hover:border-brand hover:text-brand"
        >
          + Add experience
        </button>
      </Section>

      <Section title="Skills">
        <div className="flex flex-wrap gap-1.5">
          {student.skills.map((skill) => (
            <Chip key={skill}>{skill} ×</Chip>
          ))}
          <Chip variant="outline-dashed">+ add a skill</Chip>
        </div>
      </Section>

      <Section title="Links">
        <Field label="Portfolio or GitHub" hint="Optional, but partners open them.">
          <Input placeholder={!student.portfolioUrl}>
            {student.portfolioUrl ?? "https://…"}
          </Input>
        </Field>
      </Section>
    </div>
  );
}

/* ---------------------------------------------------------------- fields */

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
  "w-full border border-line rounded-card bg-card px-3 text-ink flex items-center";

function Input({
  children,
  placeholder = false,
}: {
  children: React.ReactNode;
  placeholder?: boolean;
}) {
  return (
    <div className={`${FIELD_BASE} h-9 ${placeholder ? "text-ink-3" : ""}`}>
      {children}
    </div>
  );
}

function Select({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${FIELD_BASE} h-9 justify-between`}>
      {children}
      <span aria-hidden="true" className="text-ink-3 text-[10px]">
        ▾
      </span>
    </div>
  );
}

function Textarea({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${FIELD_BASE} min-h-[68px] py-2.5 items-start leading-relaxed`}
    >
      {children}
    </div>
  );
}
