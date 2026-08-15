import Link from "next/link";
import { VerifiedMark } from "@/components/profile/verified-mark";
import { CheckIcon } from "@/components/ui/icons";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { cn } from "@/lib/cn";
import { profileChecklist, profileStrength } from "@/lib/profile";
import type { Student } from "@/lib/types";

/**
 * What the profile still owes. Shown only while something is outstanding —
 * a permanent 100% checklist is furniture.
 *
 * The two registrar rows are ticked on arrival on purpose: it makes the whole
 * verification rule legible in one glance on a student's first visit.
 */
export function CompletenessPanel({ student }: { student: Student }) {
  const strength = profileStrength(student);
  if (strength.next === null) return null;

  const items = profileChecklist(student);

  return (
    <div className="bg-card border border-line rounded-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-ink">Finish your profile</p>
        <span className="text-meta text-ink-3">
          {strength.done} of {strength.total}
        </span>
      </div>

      <ProgressBar
        approved={strength.done}
        total={strength.total}
        className="mt-3"
      />

      <ul className="mt-3.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2.5 py-1.5 border-b border-line-2 last:border-b-0"
          >
            <span
              aria-hidden="true"
              className={cn(
                "w-3.5 h-3.5 rounded-[2px] border grid place-items-center shrink-0",
                item.done
                  ? "bg-brand border-brand text-white"
                  : "bg-card border-line",
              )}
            >
              {item.done ? <CheckIcon className="w-2 h-2" /> : null}
            </span>

            <span className={cn("flex-1 min-w-0", item.done && "text-ink-3")}>
              {item.label}
              {!item.done && item.hint ? (
                <span className="text-meta text-ink-3 block mt-0.5">
                  {item.hint}
                </span>
              ) : null}
            </span>

            {item.automatic ? (
              <VerifiedMark />
            ) : item.done ? null : (
              <Link
                href={item.href}
                className="text-meta font-semibold text-brand hover:text-brand-deep"
              >
                Add
              </Link>
            )}
          </li>
        ))}
      </ul>

      <p className="text-ink-2 mt-3.5">
        Challenges are team-based. Teammates see your roles and free time when
        they invite you.
      </p>
    </div>
  );
}
