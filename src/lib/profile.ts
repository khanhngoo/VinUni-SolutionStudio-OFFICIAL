import type { Course, Student } from "@/lib/types";

/**
 * Derivations over the student's own record.
 *
 * The split that matters here is registrar vs self-reported: the university
 * stands behind the first and nothing else, so it is computed in one place
 * rather than judged per screen. A self-added course carries no grade and is
 * excluded from any average — a database CHECK enforces the same rule.
 *
 * Everything is a function of its arguments. These used to read the transcript
 * fixture at module scope, which is what kept them from surviving the move to
 * real data.
 */

export function registrarCourses(courses: Course[]): Course[] {
  return courses.filter((course) => course.source === "registrar");
}

export function selfAddedCourses(courses: Course[]): Course[] {
  return courses.filter((course) => course.source === "self");
}

/** Registrar rows only, newest term first — what the profile previews. */
export function recentCourses(courses: Course[], limit: number): Course[] {
  return registrarCourses(courses).slice(0, limit);
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  /** Registrar-filled items are done on the student's behalf. */
  automatic: boolean;
  /** Why it matters — shown when the item is still outstanding. */
  hint?: string;
  href: string;
}

export interface ProfileCompleteness {
  courseCount: number;
  experienceCount: number;
}

/**
 * What the student still owes their own profile. Roles and availability carry
 * a hint because an empty team block blocks applying to anything, which is
 * not obvious from the label alone.
 */
export function profileChecklist(
  student: Student,
  counts: ProfileCompleteness
): ChecklistItem[] {
  return [
    {
      id: "enrolment",
      label: "Enrolment and college",
      done: true,
      automatic: true,
      href: "/profile",
    },
    {
      id: "transcript",
      label: `Subjects and grades · ${counts.courseCount} courses`,
      done: counts.courseCount > 0,
      automatic: true,
      href: "/profile",
    },
    {
      id: "about",
      label: "Write a short about",
      done: Boolean(student.about),
      automatic: false,
      href: "/profile/edit",
    },
    {
      id: "skills",
      label: "Add your skills",
      done: student.skills.length > 0,
      automatic: false,
      href: "/profile/edit",
    },
    {
      id: "experience",
      label: "Add experience",
      done: counts.experienceCount > 0,
      automatic: false,
      href: "/profile/edit",
    },
    {
      id: "team",
      label: "Roles and availability",
      done: student.usualRoles.length > 0,
      automatic: false,
      hint: "Needed before you can join a team",
      href: "/profile/edit",
    },
    {
      id: "portfolio",
      label: "Link a portfolio",
      done: Boolean(student.portfolioUrl),
      automatic: false,
      hint: "Optional, but partners open them",
      href: "/profile/edit",
    },
  ];
}

export interface ProfileStrength {
  done: number;
  total: number;
  percent: number;
  /** The first thing still worth doing, for the one-line nudge. */
  next: ChecklistItem | null;
}

export function profileStrength(
  student: Student,
  counts: ProfileCompleteness
): ProfileStrength {
  const items = profileChecklist(student, counts);
  const done = items.filter((item) => item.done).length;
  return {
    done,
    total: items.length,
    percent: Math.round((done / items.length) * 100),
    next: items.find((item) => !item.done) ?? null,
  };
}
