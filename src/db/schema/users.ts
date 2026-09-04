import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { createdAt, fk, gpaDecimal, id, timestamptz, updatedAt } from "./common";
import { courseSource, dayAvailability, studentWorkMode, teamRole } from "./enums";

/** The vocabulary of one weekly-availability slot, taken from the pgEnum so
 * the jsonb payload and the database type cannot drift apart. */
export type DayAvailability = (typeof dayAvailability.enumValues)[number];
import { userStatus } from "./enums";

export const users = pgTable(
  "users",
  {
    id: id(),
    email: varchar("email", { length: 320 }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    status: userStatus("status").default("ACTIVE"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_status_idx").on(table.status),
  ]
);

export const studentProfiles = pgTable(
  "student_profiles",
  {
    userId: fk("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    school: varchar("school", { length: 255 }),
    major: varchar("major", { length: 255 }),
    studyYear: integer("study_year"),
    gpa: gpaDecimal("gpa"),
    gpaScale: gpaDecimal("gpa_scale"),
    academicDataVerifiedAt: timestamptz("academic_data_verified_at"),
    interests: text("interests"),
    availableHoursPerWeek: integer("available_hours_per_week"),
    profileVisibility: varchar("profile_visibility", { length: 80 }).default("VINUNI_ONLY"),
    aiMatchingConsent: boolean("ai_matching_consent").default(false),
    cvUrl: text("cv_url"),
    portfolioUrl: text("portfolio_url"),
    about: text("about"),
    /**
     * Seven slots, Monday first, each a `day_availability` value. Kept as jsonb
     * rather than seven columns or a child table because it is always read and
     * written as one whole shape — `sharedFreeDays()` in `src/lib/teams.ts`
     * intersects the arrays of every confirmed member at once.
     */
    weeklyAvailability: jsonb("weekly_availability").$type<DayAvailability[]>(),
    workPreference: studentWorkMode("work_preference"),
    preferredTeamMin: integer("preferred_team_min"),
    preferredTeamMax: integer("preferred_team_max"),
    creditsEarned: integer("credits_earned"),
    transcriptUrl: text("transcript_url"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("student_profiles_team_size_order", sql`${table.preferredTeamMin} IS NULL OR ${table.preferredTeamMax} IS NULL OR ${table.preferredTeamMin} <= ${table.preferredTeamMax}`),
    check("student_profiles_team_size_positive", sql`${table.preferredTeamMin} IS NULL OR ${table.preferredTeamMin} > 0`),
    check("student_profiles_credits_non_negative", sql`${table.creditsEarned} IS NULL OR ${table.creditsEarned} >= 0`),
    check("student_profiles_study_year_positive", sql`${table.studyYear} IS NULL OR ${table.studyYear} > 0`),
    check("student_profiles_gpa_non_negative", sql`${table.gpa} IS NULL OR ${table.gpa} >= 0`),
    check("student_profiles_gpa_scale_positive", sql`${table.gpaScale} IS NULL OR ${table.gpaScale} > 0`),
    check("student_profiles_gpa_within_scale", sql`${table.gpa} IS NULL OR ${table.gpaScale} IS NULL OR ${table.gpa} <= ${table.gpaScale}`),
    check("student_profiles_available_hours_range", sql`${table.availableHoursPerWeek} IS NULL OR (${table.availableHoursPerWeek} >= 0 AND ${table.availableHoursPerWeek} <= 168)`),
  ]
);

/**
 * A course on a student's record.
 *
 * `source` is the whole point of the table. REGISTRAR rows are transcript
 * facts and carry a grade; SELF rows are context a student added and carry
 * none, which is why `grade` is nullable and why GPA must never be computed
 * across both. `pinned` is the student's own disclosure choice — a partner
 * sees pinned courses and nothing else, so it is the only column here that
 * crosses the profile boundary.
 */
export const studentCourses = pgTable(
  "student_courses",
  {
    id: id(),
    studentId: fk("student_id")
      .notNull()
      .references(() => studentProfiles.userId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    code: varchar("code", { length: 40 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    term: varchar("term", { length: 60 }),
    credits: integer("credits"),
    grade: varchar("grade", { length: 12 }),
    source: courseSource("source").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("student_courses_student_idx").on(table.studentId),
    index("student_courses_pinned_idx").on(table.studentId, table.pinned),
    uniqueIndex("student_courses_student_code_term_unique").on(table.studentId, table.code, table.term),
    check("student_courses_self_rows_have_no_grade", sql`${table.source} <> 'SELF' OR ${table.grade} IS NULL`),
    check("student_courses_credits_non_negative", sql`${table.credits} IS NULL OR ${table.credits} >= 0`),
  ]
);

/** Profile-level default roles. The per-application commitment lives on
 * `application_members.preferred_role` and wins wherever a team exists. */
export const studentPreferredRoles = pgTable(
  "student_preferred_roles",
  {
    id: id(),
    studentId: fk("student_id")
      .notNull()
      .references(() => studentProfiles.userId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    role: teamRole("role").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("student_preferred_roles_unique").on(table.studentId, table.role),
    index("student_preferred_roles_student_idx").on(table.studentId),
  ]
);

export const facultyProfiles = pgTable(
  "faculty_profiles",
  {
    userId: fk("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    school: varchar("school", { length: 255 }),
    department: varchar("department", { length: 255 }),
    academicTitle: varchar("academic_title", { length: 255 }),
    maxActiveSupervisions: integer("max_active_supervisions"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("faculty_profiles_max_supervisions_non_negative", sql`${table.maxActiveSupervisions} IS NULL OR ${table.maxActiveSupervisions} >= 0`),
  ]
);
