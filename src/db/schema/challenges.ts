import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { createdAt, fk, id, normalizedDecimal, timestamptz, updatedAt } from "./common";
import {
  challengeStatus,
  challengeVisibility,
  compensationType,
  eligibilityRuleType,
  facultyAssignmentStatus,
  normalizationStatus,
  reviewDecision,
  skillRequirementType,
  workMode,
} from "./enums";
import { organizations } from "./organizations";
import { skills } from "./skills";
import { facultyProfiles, users } from "./users";

export const challenges = pgTable(
  "challenges",
  {
    id: id(),
    publicId: uuid("public_id").defaultRandom().notNull(),
    slug: varchar("slug", { length: 160 }),
    ownerOrganizationId: fk("owner_organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    managingOrganizationId: fk("managing_organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    contactPersonId: fk("contact_person_id").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    subtype: varchar("subtype", { length: 120 }),
    domain: varchar("domain", { length: 255 }),
    expectedDeliverables: text("expected_deliverables"),
    /** How the partner runs the conversation after the assessment clears. */
    interviewFormat: varchar("interview_format", { length: 255 }),
    /**
     * The real problem statement, withheld until a student is selected. Lives
     * on the challenge rather than the project because the offer reveal
     * happens before any project row exists. Never serve this without going
     * through `applyChallengeDetailDisclosure`.
     */
    fullBrief: text("full_brief"),
    durationWeeks: integer("duration_weeks"),
    weeklyHours: integer("weekly_hours"),
    teamSizeMin: integer("team_size_min"),
    teamSizeMax: integer("team_size_max"),
    workMode: workMode("work_mode"),
    startDate: date("start_date", { mode: "string" }),
    compensationType: compensationType("compensation_type").default("NOT_SPECIFIED"),
    compensationDescription: text("compensation_description"),
    visibility: challengeVisibility("visibility").default("VINUNI_ONLY"),
    confidentialityLevel: varchar("confidentiality_level", { length: 80 }),
    status: challengeStatus("status").default("DRAFT"),
    applicationDeadline: timestamptz("application_deadline"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("challenges_public_id_unique").on(table.publicId),
    uniqueIndex("challenges_slug_unique").on(table.slug),
    index("challenges_owner_organization_idx").on(table.ownerOrganizationId),
    index("challenges_managing_organization_idx").on(table.managingOrganizationId),
    index("challenges_contact_person_idx").on(table.contactPersonId),
    index("challenges_status_idx").on(table.status),
    index("challenges_application_deadline_idx").on(table.applicationDeadline),
    index("challenges_marketplace_status_deadline_idx").on(
      table.status,
      table.applicationDeadline
    ),
    check("challenges_duration_weeks_positive", sql`${table.durationWeeks} IS NULL OR ${table.durationWeeks} > 0`),
    check("challenges_weekly_hours_positive", sql`${table.weeklyHours} IS NULL OR ${table.weeklyHours} > 0`),
    check("challenges_team_size_min_positive", sql`${table.teamSizeMin} IS NULL OR ${table.teamSizeMin} > 0`),
    check("challenges_team_size_max_positive", sql`${table.teamSizeMax} IS NULL OR ${table.teamSizeMax} > 0`),
    check("challenges_team_size_order", sql`${table.teamSizeMin} IS NULL OR ${table.teamSizeMax} IS NULL OR ${table.teamSizeMin} <= ${table.teamSizeMax}`),
  ]
);

export const challengeEligibilityRules = pgTable(
  "challenge_eligibility_rules",
  {
    id: id(),
    challengeId: fk("challenge_id")
      .notNull()
      .references(() => challenges.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    ruleType: eligibilityRuleType("rule_type").notNull(),
    config: jsonb("config"),
    required: boolean("required").default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("challenge_eligibility_rules_challenge_idx").on(table.challengeId),
    index("challenge_eligibility_rules_type_idx").on(table.ruleType),
  ]
);

export const challengeSkills = pgTable(
  "challenge_skills",
  {
    id: id(),
    challengeId: fk("challenge_id")
      .notNull()
      .references(() => challenges.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    skillId: fk("skill_id").references(() => skills.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    rawSkillName: varchar("raw_skill_name", { length: 255 }),
    requirementType: skillRequirementType("requirement_type").notNull(),
    weight: normalizedDecimal("weight").default(1),
    normalizationStatus: normalizationStatus("normalization_status").default("PENDING"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("challenge_skills_challenge_skill_unique")
      .on(table.challengeId, table.skillId)
      .where(sql`${table.skillId} IS NOT NULL`),
    uniqueIndex("challenge_skills_challenge_raw_skill_unique")
      .on(table.challengeId, table.rawSkillName)
      .where(sql`${table.rawSkillName} IS NOT NULL`),
    index("challenge_skills_challenge_idx").on(table.challengeId),
    index("challenge_skills_skill_idx").on(table.skillId),
    check("challenge_skills_weight_range", sql`${table.weight} IS NULL OR (${table.weight} >= 0 AND ${table.weight} <= 1)`),
  ]
);

export const challengeFacultyAssignments = pgTable(
  "challenge_faculty_assignments",
  {
    id: id(),
    challengeId: fk("challenge_id")
      .notNull()
      .references(() => challenges.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    facultyId: fk("faculty_id")
      .notNull()
      .references(() => facultyProfiles.userId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    assignedBy: fk("assigned_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    status: facultyAssignmentStatus("status").default("PENDING"),
    comments: text("comments"),
    assignedAt: timestamptz("assigned_at"),
    respondedAt: timestamptz("responded_at"),
  },
  (table) => [
    index("challenge_faculty_assignments_challenge_idx").on(table.challengeId),
    index("challenge_faculty_assignments_faculty_idx").on(table.facultyId),
    index("challenge_faculty_assignments_status_idx").on(table.status),
  ]
);

export const challengeReviews = pgTable(
  "challenge_reviews",
  {
    id: id(),
    challengeId: fk("challenge_id")
      .notNull()
      .references(() => challenges.id, {
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
    decision: reviewDecision("decision").notNull(),
    comments: text("comments"),
    createdAt: createdAt(),
  },
  (table) => [
    index("challenge_reviews_challenge_idx").on(table.challengeId),
    index("challenge_reviews_reviewer_idx").on(table.reviewerId),
    index("challenge_reviews_reviewer_organization_idx").on(
      table.reviewerOrganizationId
    ),
  ]
);
