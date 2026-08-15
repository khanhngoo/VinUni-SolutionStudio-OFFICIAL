import {
  SelfReported,
  VerifiedMark,
} from "@/components/profile/verified-mark";
import type { Course } from "@/lib/types";

/**
 * Course rows. Every row carries its source, because a Coursera certificate
 * and a registrar grade look identical once you strip the label off.
 */
export function CourseTable({ courses }: { courses: Course[] }) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {courses.map((course) => (
          <tr key={course.id} className="border-b border-line-2 last:border-b-0">
            <td className="py-2.5 pr-3 align-middle">
              <p className="font-medium text-ink">{course.title}</p>
              <p className="text-meta text-ink-3 mt-0.5">
                {course.code} · {course.term}
                {course.credits !== null ? ` · ${course.credits} cr` : ""}
              </p>
            </td>
            <td className="py-2.5 pr-3 align-middle w-[110px]">
              {course.source === "registrar" ? (
                <VerifiedMark />
              ) : (
                <SelfReported />
              )}
            </td>
            <td className="py-2.5 align-middle w-[42px] text-right">
              <span
                className={
                  course.grade
                    ? "font-semibold text-ink"
                    : "text-ink-3"
                }
              >
                {course.grade ?? "—"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
