import Link from "next/link";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { VerifiedMark } from "@/components/profile/verified-mark";
import { initials } from "@/lib/text";
import { profileStrength, type ProfileCompleteness } from "@/lib/profile";
import { COLLEGE_NAMES, type Student } from "@/lib/types";

/**
 * Identity and the facts a teammate or partner checks first. Pinned to the
 * left so they stay put while the record below scrolls.
 */
export function ProfileRail({
  student,
  counts,
}: {
  student: Student;
  counts: ProfileCompleteness;
}) {
  const strength = profileStrength(student, counts);

  return (
    <div>
      <span className="w-14 h-14 rounded-full bg-brand text-white grid place-items-center text-[17px] font-semibold">
        {initials(student.name)}
      </span>

      <h1 className="text-h2 text-ink mt-3">{student.name}</h1>
      <p className="text-ink-2 mt-1">
        {student.major}
        <br />
        Year {student.year} · {COLLEGE_NAMES[student.college]}
      </p>

      <VerifiedMark className="mt-2.5">Enrolment verified</VerifiedMark>

      <dl className="mt-4 pt-3.5 border-t border-line">
        <Fact
          label="GPA"
          value={`${student.gpa.toFixed(2)} / ${student.gpaScale.toFixed(1)}`}
        />
        <Fact label="Available" value={`${student.hoursAvailable} h / wk`} />
        <Fact label="Work mode" value={student.workPreference} />
        <Fact label="Credits" value={String(student.creditsEarned)} />
      </dl>

      <div className="mt-4 pt-3.5 border-t border-line">
        <p className="text-meta text-ink-3">Profile strength</p>
        <ProgressBar
          approved={strength.done}
          total={strength.total}
          className="mt-2"
        />
        <p className="text-meta text-ink-3 mt-1.5">
          {strength.percent}%
          {strength.next ? ` · ${strength.next.label.toLowerCase()}` : " · complete"}
        </p>
      </div>

      <Link
        href="/profile/edit"
        className="inline-flex items-center justify-center h-9 px-4 mt-4 w-full rounded-card border border-line text-brand font-semibold hover:border-brand hover:text-brand"
      >
        Edit profile
      </Link>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <dt className="text-meta text-ink-3">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}
