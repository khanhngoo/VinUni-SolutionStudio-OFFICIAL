import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { createdAt, fk, gpaDecimal, id, timestamptz, updatedAt } from "./common";
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
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("student_profiles_study_year_positive", sql`${table.studyYear} IS NULL OR ${table.studyYear} > 0`),
    check("student_profiles_gpa_non_negative", sql`${table.gpa} IS NULL OR ${table.gpa} >= 0`),
    check("student_profiles_gpa_scale_positive", sql`${table.gpaScale} IS NULL OR ${table.gpaScale} > 0`),
    check("student_profiles_gpa_within_scale", sql`${table.gpa} IS NULL OR ${table.gpaScale} IS NULL OR ${table.gpa} <= ${table.gpaScale}`),
    check("student_profiles_available_hours_range", sql`${table.availableHoursPerWeek} IS NULL OR (${table.availableHoursPerWeek} >= 0 AND ${table.availableHoursPerWeek} <= 168)`),
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
