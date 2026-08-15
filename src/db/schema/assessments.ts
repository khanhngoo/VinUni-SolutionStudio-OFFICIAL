import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { applications, applicationMembers } from "./applications";
import { challenges } from "./challenges";
import { createdAt, fk, id, rubricScore, timestamptz, updatedAt } from "./common";
import {
  assessmentAiPolicy,
  assessmentAttemptStatus,
  assessmentQuestionType,
  assessmentScope,
  assessmentStatus,
} from "./enums";
import { users } from "./users";

export const assessments = pgTable(
  "assessments",
  {
    id: id(),
    challengeId: fk("challenge_id")
      .notNull()
      .references(() => challenges.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    title: varchar("title", { length: 255 }),
    instructions: text("instructions"),
    timeLimitMinutes: integer("time_limit_minutes"),
    aiPolicy: assessmentAiPolicy("ai_policy"),
    scope: assessmentScope("scope").default("INDIVIDUAL").notNull(),
    status: assessmentStatus("status").default("DRAFT"),
    createdBy: fk("created_by").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("assessments_challenge_idx").on(table.challengeId),
    index("assessments_status_idx").on(table.status),
    index("assessments_created_by_idx").on(table.createdBy),
    check("assessments_time_limit_positive", sql`${table.timeLimitMinutes} IS NULL OR ${table.timeLimitMinutes} > 0`),
  ]
);

export const assessmentSections = pgTable(
  "assessment_sections",
  {
    id: id(),
    assessmentId: fk("assessment_id")
      .notNull()
      .references(() => assessments.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    title: varchar("title", { length: 255 }),
    instructions: text("instructions"),
    sequence: integer("sequence"),
    timeLimitMinutes: integer("time_limit_minutes"),
    createdAt: createdAt(),
  },
  (table) => [
    index("assessment_sections_assessment_idx").on(table.assessmentId),
    uniqueIndex("assessment_sections_assessment_sequence_unique")
      .on(table.assessmentId, table.sequence)
      .where(sql`${table.sequence} IS NOT NULL`),
    check("assessment_sections_sequence_non_negative", sql`${table.sequence} IS NULL OR ${table.sequence} >= 0`),
    check("assessment_sections_time_limit_positive", sql`${table.timeLimitMinutes} IS NULL OR ${table.timeLimitMinutes} > 0`),
  ]
);

export const assessmentQuestions = pgTable(
  "assessment_questions",
  {
    id: id(),
    sectionId: fk("section_id")
      .notNull()
      .references(() => assessmentSections.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    questionType: assessmentQuestionType("question_type"),
    prompt: text("prompt").notNull(),
    sequence: integer("sequence"),
    maxScore: rubricScore("max_score"),
    config: jsonb("config"),
  },
  (table) => [
    index("assessment_questions_section_idx").on(table.sectionId),
    uniqueIndex("assessment_questions_section_sequence_unique")
      .on(table.sectionId, table.sequence)
      .where(sql`${table.sequence} IS NOT NULL`),
    check("assessment_questions_sequence_non_negative", sql`${table.sequence} IS NULL OR ${table.sequence} >= 0`),
    check("assessment_questions_max_score_non_negative", sql`${table.maxScore} IS NULL OR ${table.maxScore} >= 0`),
  ]
);

export const assessmentAttempts = pgTable(
  "assessment_attempts",
  {
    id: id(),
    assessmentId: fk("assessment_id")
      .notNull()
      .references(() => assessments.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    applicationId: fk("application_id")
      .notNull()
      .references(() => applications.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    applicationMemberId: fk("application_member_id").references(
      () => applicationMembers.id,
      { onDelete: "cascade", onUpdate: "cascade" }
    ),
    status: assessmentAttemptStatus("status").default("NOT_STARTED"),
    startedAt: timestamptz("started_at"),
    submittedAt: timestamptz("submitted_at"),
    aiUsageDeclared: boolean("ai_usage_declared"),
    aiUsageDescription: text("ai_usage_description"),
  },
  (table) => [
    uniqueIndex("assessment_attempts_team_unique")
      .on(table.assessmentId, table.applicationId)
      .where(sql`${table.applicationMemberId} IS NULL`),
    uniqueIndex("assessment_attempts_individual_unique")
      .on(table.assessmentId, table.applicationMemberId)
      .where(sql`${table.applicationMemberId} IS NOT NULL`),
    index("assessment_attempts_assessment_idx").on(table.assessmentId),
    index("assessment_attempts_application_idx").on(table.applicationId),
    index("assessment_attempts_application_member_idx").on(
      table.applicationMemberId
    ),
    index("assessment_attempts_status_idx").on(table.status),
  ]
);

export const assessmentResponses = pgTable(
  "assessment_responses",
  {
    id: id(),
    attemptId: fk("attempt_id")
      .notNull()
      .references(() => assessmentAttempts.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    questionId: fk("question_id")
      .notNull()
      .references(() => assessmentQuestions.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    response: text("response"),
    responseData: jsonb("response_data"),
    attachmentUrl: text("attachment_url"),
    submittedAt: timestamptz("submitted_at"),
  },
  (table) => [
    index("assessment_responses_attempt_idx").on(table.attemptId),
    index("assessment_responses_question_idx").on(table.questionId),
  ]
);

export const assessmentScores = pgTable(
  "assessment_scores",
  {
    id: id(),
    attemptId: fk("attempt_id")
      .notNull()
      .references(() => assessmentAttempts.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    reviewerId: fk("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    overallScore: rubricScore("overall_score"),
    rubricScores: jsonb("rubric_scores"),
    comments: text("comments"),
    createdAt: createdAt(),
  },
  (table) => [
    index("assessment_scores_attempt_idx").on(table.attemptId),
    index("assessment_scores_reviewer_idx").on(table.reviewerId),
    check("assessment_scores_overall_non_negative", sql`${table.overallScore} IS NULL OR ${table.overallScore} >= 0`),
  ]
);
