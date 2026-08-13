import { courses, experience } from "@/lib/data/transcript";
import type { Course, Student } from "@/lib/types";

/**
 * Derivations over the student's own record. The split that matters here is
 * registrar vs self-reported: the university stands behind the first and
 * nothing else, so it is computed in one place rather than judged per screen.
 */

export function registrarCourses(): Course[] {
  return courses.filter((c) => c.source === "registrar");
}

export function selfAddedCourses(): Course[] {
  return courses.filter((c) => c.source === "self");
}

/** Registrar rows only, newest term first — what the profile previews. */
export function recentCourses(limit: number): Course[] {
  return registrarCourses().slice(0, limit);
}

export function totalCourseCount(): number {
  return courses.length;
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

/**
 * What the student still owes their own profile. Roles and availability carry
 * a hint because an empty team block blocks applying to anything, which is
 * not obvious from the label alone.
 */
export function profileChecklist(student: Student): ChecklistItem[] {
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
      label: `Subjects and grades · ${registrarCourses().length} courses`,
      done: true,
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
      done: experience.length > 0,
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

export function profileStrength(student: Student): ProfileStrength {
  const items = profileChecklist(student);
  const done = items.filter((i) => i.done).length;
  return {
    done,
    total: items.length,
    percent: Math.round((done / items.length) * 100),
    next: items.find((i) => !i.done) ?? null,
  };
}

/** Full day names for the weekly grid's accessible labels. */
export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
