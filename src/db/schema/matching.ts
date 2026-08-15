import { sql } from "drizzle-orm";
import { check, index, pgTable, text } from "drizzle-orm/pg-core";

import { challengeSkills, challenges } from "./challenges";
import { createdAt, fk, id, normalizedDecimal } from "./common";
import { evidenceConfidence, skillMatchType } from "./enums";
import { studentProjects, studentSkills } from "./skills";
import { studentProfiles } from "./users";

export const matchResults = pgTable(
  "match_results",
  {
    id: id(),
    challengeId: fk("challenge_id")
      .notNull()
      .references(() => challenges.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    studentId: fk("student_id")
      .notNull()
      .references(() => studentProfiles.userId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    skillScore: normalizedDecimal("skill_score"),
    semanticExperienceScore: normalizedDecimal("semantic_experience_score"),
    domainScore: normalizedDecimal("domain_score"),
    eligibilityScore: normalizedDecimal("eligibility_score"),
    overallFitScore: normalizedDecimal("overall_fit_score"),
    evidenceConfidence: evidenceConfidence("evidence_confidence"),
    explanation: text("explanation"),
    modelVersion: text("model_version"),
    createdAt: createdAt(),
  },
  (table) => [
    index("match_results_challenge_student_idx").on(table.challengeId, table.studentId),
    index("match_results_student_idx").on(table.studentId),
    index("match_results_overall_fit_idx").on(table.overallFitScore),
    check("match_results_skill_score_range", sql`${table.skillScore} IS NULL OR (${table.skillScore} >= 0 AND ${table.skillScore} <= 1)`),
    check("match_results_semantic_score_range", sql`${table.semanticExperienceScore} IS NULL OR (${table.semanticExperienceScore} >= 0 AND ${table.semanticExperienceScore} <= 1)`),
    check("match_results_domain_score_range", sql`${table.domainScore} IS NULL OR (${table.domainScore} >= 0 AND ${table.domainScore} <= 1)`),
    check("match_results_eligibility_score_range", sql`${table.eligibilityScore} IS NULL OR (${table.eligibilityScore} >= 0 AND ${table.eligibilityScore} <= 1)`),
    check("match_results_overall_fit_score_range", sql`${table.overallFitScore} IS NULL OR (${table.overallFitScore} >= 0 AND ${table.overallFitScore} <= 1)`),
  ]
);

export const matchSkillDetails = pgTable(
  "match_skill_details",
  {
    id: id(),
    matchResultId: fk("match_result_id")
      .notNull()
      .references(() => matchResults.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    challengeSkillId: fk("challenge_skill_id")
      .notNull()
      .references(() => challengeSkills.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    matchedStudentSkillId: fk("matched_student_skill_id").references(
      () => studentSkills.id,
      { onDelete: "set null", onUpdate: "cascade" }
    ),
    similarityScore: normalizedDecimal("similarity_score"),
    matchType: skillMatchType("match_type"),
    explanation: text("explanation"),
  },
  (table) => [
    index("match_skill_details_result_idx").on(table.matchResultId),
    index("match_skill_details_challenge_skill_idx").on(table.challengeSkillId),
    index("match_skill_details_student_skill_idx").on(table.matchedStudentSkillId),
    check("match_skill_details_similarity_range", sql`${table.similarityScore} IS NULL OR (${table.similarityScore} >= 0 AND ${table.similarityScore} <= 1)`),
  ]
);

export const matchExperienceDetails = pgTable(
  "match_experience_details",
  {
    id: id(),
    matchResultId: fk("match_result_id")
      .notNull()
      .references(() => matchResults.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    studentProjectId: fk("student_project_id")
      .notNull()
      .references(() => studentProjects.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    semanticSimilarity: normalizedDecimal("semantic_similarity"),
    explanation: text("explanation"),
  },
  (table) => [
    index("match_experience_details_result_idx").on(table.matchResultId),
    index("match_experience_details_student_project_idx").on(
      table.studentProjectId
    ),
    check("match_experience_details_similarity_range", sql`${table.semanticSimilarity} IS NULL OR (${table.semanticSimilarity} >= 0 AND ${table.semanticSimilarity} <= 1)`),
  ]
);
