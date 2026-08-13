import { SelfReported } from "@/components/profile/verified-mark";
import { Chip } from "@/components/ui/chip";
import type { Experience } from "@/lib/types";

/**
 * Experience is always the student's own account of themselves — there is no
 * registrar record of an internship — so every entry carries the same
 * self-reported mark rather than leaving a reader to assume.
 */
export function ExperienceList({ entries }: { entries: Experience[] }) {
  if (entries.length === 0) {
    return (
      <div className="border border-dashed border-line rounded-card px-5 py-8 text-center">
        <p className="text-ink-2">
          Internships, research, teaching, part-time work — anything you&apos;ve
          done.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="bg-card border border-line rounded-card p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-ink">{entry.role}</p>
              <p className="text-ink-2 mt-0.5">{entry.organisation}</p>
              <p className="text-meta text-ink-3 mt-1">
                {entry.from} – {entry.to ?? "present"} · {entry.kind}
              </p>
            </div>
            <SelfReported />
          </div>

          {entry.summary ? (
            <p className="text-ink-2 mt-2.5">{entry.summary}</p>
          ) : null}

          {entry.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {entry.skills.map((skill) => (
                <Chip key={skill}>{skill}</Chip>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
