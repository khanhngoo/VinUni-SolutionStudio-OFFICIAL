import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { challenges } from "./challenges";
import { createdAt, fk, id, timestamptz, updatedAt } from "./common";
import {
  agreementType,
  applicationMemberRole,
  applicationMemberStatus,
  applicationStatus,
  offerStatus,
  supervisionRequestStatus,
} from "./enums";
import { studentProjects } from "./skills";
import { facultyProfiles, studentProfiles, users } from "./users";

export const applications = pgTable(
  "applications",
  {
    id: id(),
    publicId: uuid("public_id").defaultRandom().notNull(),
    challengeId: fk("challenge_id")
      .notNull()
      .references(() => challenges.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    submittedBy: fk("submitted_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    teamName: varchar("team_name", { length: 255 }),
    motivation: text("motivation"),
    relevantExperience: text("relevant_experience"),
    status: applicationStatus("status").default("SUBMITTED"),
    submittedAt: timestamptz("submitted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("applications_public_id_unique").on(table.publicId),
    index("applications_challenge_idx").on(table.challengeId),
    index("applications_submitted_by_idx").on(table.submittedBy),
    index("applications_status_idx").on(table.status),
    index("applications_submitted_at_idx").on(table.submittedAt),
    index("applications_challenge_status_idx").on(table.challengeId, table.status),
  ]
);

export const applicationMembers = pgTable(
  "application_members",
  {
    id: id(),
    applicationId: fk("application_id")
      .notNull()
      .references(() => applications.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    studentId: fk("student_id")
      .notNull()
      .references(() => studentProfiles.userId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    memberRole: applicationMemberRole("member_role").notNull(),
    status: applicationMemberStatus("status").default("INVITED"),
    preferredRole: varchar("preferred_role", { length: 255 }),
    committedHoursPerWeek: integer("committed_hours_per_week"),
    availabilityConfirmed: boolean("availability_confirmed"),
    invitedAt: timestamptz("invited_at"),
    respondedAt: timestamptz("responded_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("application_members_application_student_unique").on(
      table.applicationId,
      table.studentId
    ),
    uniqueIndex("application_members_one_leader_per_application")
      .on(table.applicationId)
      .where(sql`${table.memberRole} = 'LEADER'`),
    index("application_members_application_idx").on(table.applicationId),
    index("application_members_student_idx").on(table.studentId),
    index("application_members_role_status_idx").on(
      table.applicationId,
      table.memberRole,
      table.status
    ),
    check("application_members_committed_hours_range", sql`${table.committedHoursPerWeek} IS NULL OR (${table.committedHoursPerWeek} >= 0 AND ${table.committedHoursPerWeek} <= 168)`),
  ]
);

export const applicationProjects = pgTable(
  "application_projects",
  {
    id: id(),
    applicationId: fk("application_id")
      .notNull()
      .references(() => applications.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    studentProjectId: fk("student_project_id")
      .notNull()
      .references(() => studentProjects.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    uniqueIndex("application_projects_application_project_unique").on(
      table.applicationId,
      table.studentProjectId
    ),
    index("application_projects_application_idx").on(table.applicationId),
    index("application_projects_student_project_idx").on(table.studentProjectId),
  ]
);

export const supervisionRequests = pgTable(
  "supervision_requests",
  {
    id: id(),
    applicationId: fk("application_id")
      .notNull()
      .references(() => applications.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    facultyId: fk("faculty_id")
      .notNull()
      .references(() => facultyProfiles.userId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    requestedBy: fk("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    status: supervisionRequestStatus("status").default("PENDING"),
    comments: text("comments"),
    requestedAt: timestamptz("requested_at"),
    respondBy: timestamptz("respond_by"),
    respondedAt: timestamptz("responded_at"),
    createdAt: createdAt(),
  },
  (table) => [
    index("supervision_requests_application_idx").on(table.applicationId),
    index("supervision_requests_faculty_idx").on(table.facultyId),
    index("supervision_requests_status_idx").on(table.status),
  ]
);

export const selections = pgTable(
  "selections",
  {
    id: id(),
    applicationId: fk("application_id")
      .notNull()
      .references(() => applications.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    selectedBy: fk("selected_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    selectedAt: timestamptz("selected_at"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("selections_application_unique").on(table.applicationId),
    index("selections_selected_by_idx").on(table.selectedBy),
  ]
);

export const offers = pgTable(
  "offers",
  {
    id: id(),
    selectionId: fk("selection_id")
      .notNull()
      .references(() => selections.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    respondBy: timestamptz("respond_by"),
    hoursPerWeek: integer("hours_per_week"),
    durationWeeks: integer("duration_weeks"),
    startDate: date("start_date", { mode: "string" }),
    compensationNote: text("compensation_note"),
    ndaRequired: boolean("nda_required").default(false),
    status: offerStatus("status").default("PENDING"),
    respondedBy: fk("responded_by").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: createdAt(),
    respondedAt: timestamptz("responded_at"),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("offers_selection_unique").on(table.selectionId),
    index("offers_status_idx").on(table.status),
    index("offers_respond_by_idx").on(table.respondBy),
    index("offers_responded_by_idx").on(table.respondedBy),
    check("offers_hours_per_week_positive", sql`${table.hoursPerWeek} IS NULL OR ${table.hoursPerWeek} > 0`),
    check("offers_duration_weeks_positive", sql`${table.durationWeeks} IS NULL OR ${table.durationWeeks} > 0`),
  ]
);

export const agreements = pgTable(
  "agreements",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    challengeId: fk("challenge_id")
      .notNull()
      .references(() => challenges.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    applicationId: fk("application_id").references(() => applications.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    agreementType: agreementType("agreement_type").notNull(),
    agreementVersion: varchar("agreement_version", { length: 80 }),
    documentUrl: text("document_url"),
    acceptedAt: timestamptz("accepted_at"),
    revokedAt: timestamptz("revoked_at"),
    createdAt: createdAt(),
  },
  (table) => [
    index("agreements_user_idx").on(table.userId),
    index("agreements_challenge_idx").on(table.challengeId),
    index("agreements_application_idx").on(table.applicationId),
    check("agreements_revocation_after_acceptance", sql`${table.acceptedAt} IS NULL OR ${table.revokedAt} IS NULL OR ${table.acceptedAt} <= ${table.revokedAt}`),
  ]
);
