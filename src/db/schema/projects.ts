import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { applications } from "./applications";
import { createdAt, fk, id, timestamptz, updatedAt } from "./common";
import {
  deliverableType,
  feedbackType,
  feedbackVisibility,
  milestoneReviewDecision,
  milestoneReviewRole,
  milestoneStatus,
  projectStatus,
  resourceSensitivity,
} from "./enums";
import { organizations } from "./organizations";
import { facultyProfiles, studentProfiles, users } from "./users";

export const projects = pgTable(
  "projects",
  {
    id: id(),
    publicId: uuid("public_id").defaultRandom().notNull(),
    applicationId: fk("application_id")
      .notNull()
      .references(() => applications.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    facultySupervisorId: fk("faculty_supervisor_id").references(
      () => facultyProfiles.userId,
      { onDelete: "set null", onUpdate: "cascade" }
    ),
    status: projectStatus("status").default("ACTIVE"),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("projects_public_id_unique").on(table.publicId),
    uniqueIndex("projects_application_unique").on(table.applicationId),
    index("projects_faculty_supervisor_idx").on(table.facultySupervisorId),
    index("projects_status_idx").on(table.status),
    check("projects_date_order", sql`${table.startDate} IS NULL OR ${table.endDate} IS NULL OR ${table.startDate} <= ${table.endDate}`),
  ]
);

export const projectMembers = pgTable(
  "project_members",
  {
    id: id(),
    projectId: fk("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    studentId: fk("student_id")
      .notNull()
      .references(() => studentProfiles.userId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    projectRole: varchar("project_role", { length: 255 }),
    joinedAt: timestamptz("joined_at"),
  },
  (table) => [
    uniqueIndex("project_members_project_student_unique").on(
      table.projectId,
      table.studentId
    ),
    index("project_members_project_idx").on(table.projectId),
    index("project_members_student_idx").on(table.studentId),
  ]
);

export const milestones = pgTable(
  "milestones",
  {
    id: id(),
    projectId: fk("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    deadline: date("deadline", { mode: "string" }),
    status: milestoneStatus("status").default("PENDING"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("milestones_project_idx").on(table.projectId),
    index("milestones_status_idx").on(table.status),
    index("milestones_deadline_idx").on(table.deadline),
  ]
);

export const deliverables = pgTable(
  "deliverables",
  {
    id: id(),
    milestoneId: fk("milestone_id")
      .notNull()
      .references(() => milestones.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    submittedBy: fk("submitted_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    title: varchar("title", { length: 255 }),
    description: text("description"),
    deliverableType: deliverableType("deliverable_type"),
    fileUrl: text("file_url"),
    externalUrl: text("external_url"),
    submittedAt: timestamptz("submitted_at"),
  },
  (table) => [
    index("deliverables_milestone_idx").on(table.milestoneId),
    index("deliverables_submitted_by_idx").on(table.submittedBy),
  ]
);

export const milestoneReviews = pgTable(
  "milestone_reviews",
  {
    id: id(),
    milestoneId: fk("milestone_id")
      .notNull()
      .references(() => milestones.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    reviewerId: fk("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    reviewerOrganizationId: fk("reviewer_organization_id").references(
      () => organizations.id,
      { onDelete: "set null", onUpdate: "cascade" }
    ),
    reviewerRole: milestoneReviewRole("reviewer_role").notNull(),
    decision: milestoneReviewDecision("decision").notNull(),
    comments: text("comments"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("milestone_reviews_milestone_idx").on(table.milestoneId),
    index("milestone_reviews_reviewer_idx").on(table.reviewerId),
    index("milestone_reviews_reviewer_role_idx").on(table.reviewerRole),
    index("milestone_reviews_milestone_role_created_idx").on(
      table.milestoneId,
      table.reviewerRole,
      table.createdAt
    ),
  ]
);

export const feedback = pgTable(
  "feedback",
  {
    id: id(),
    projectId: fk("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    milestoneId: fk("milestone_id").references(() => milestones.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    authorId: fk("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    recipientId: fk("recipient_id").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    feedbackType: feedbackType("feedback_type").default("GENERAL"),
    visibility: feedbackVisibility("visibility").default("RECIPIENT"),
    metrics: jsonb("metrics"),
    content: text("content"),
    createdAt: createdAt(),
  },
  (table) => [
    index("feedback_project_idx").on(table.projectId),
    index("feedback_milestone_idx").on(table.milestoneId),
    index("feedback_author_idx").on(table.authorId),
    index("feedback_recipient_idx").on(table.recipientId),
    index("feedback_type_visibility_idx").on(table.feedbackType, table.visibility),
  ]
);

export const projectResources = pgTable(
  "project_resources",
  {
    id: id(),
    projectId: fk("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    resourceType: varchar("resource_type", { length: 120 }),
    storageKey: text("storage_key"),
    externalUrl: text("external_url"),
    sensitivityLevel: resourceSensitivity("sensitivity_level").default("TEAM_ONLY"),
    requiresAgreement: boolean("requires_agreement").default(false),
    createdBy: fk("created_by").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("project_resources_project_idx").on(table.projectId),
    index("project_resources_created_by_idx").on(table.createdBy),
    index("project_resources_sensitivity_idx").on(table.sensitivityLevel),
  ]
);
