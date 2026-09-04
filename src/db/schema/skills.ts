import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { createdAt, fk, id, normalizedDecimal, timestamptz, updatedAt } from "./common";
import { evidenceType, experienceKind, normalizationStatus, proficiencyLevel, skillRelationshipType, skillSource, skillStatus, verificationStatus } from "./enums";
import { users, studentProfiles } from "./users";

export const skillCategories = pgTable(
  "skill_categories",
  {
    id: id(),
    name: varchar("name", { length: 255 }).notNull(),
    parentId: fk("parent_id").references(
      (): AnyPgColumn => skillCategories.id,
      { onDelete: "set null", onUpdate: "cascade" }
    ),
    description: text("description"),
  },
  (table) => [index("skill_categories_parent_idx").on(table.parentId)]
);

export const skills = pgTable(
  "skills",
  {
    id: id(),
    canonicalName: varchar("canonical_name", { length: 255 }).notNull(),
    categoryId: fk("category_id").references(() => skillCategories.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    description: text("description"),
    status: skillStatus("status").default("ACTIVE"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("skills_canonical_name_unique").on(table.canonicalName),
    index("skills_category_idx").on(table.categoryId),
    index("skills_status_idx").on(table.status),
  ]
);

export const skillAliases = pgTable(
  "skill_aliases",
  {
    id: id(),
    skillId: fk("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade", onUpdate: "cascade" }),
    alias: varchar("alias", { length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex("skill_aliases_skill_alias_unique").on(table.skillId, table.alias),
    index("skill_aliases_alias_idx").on(table.alias),
  ]
);

export const studentSkills = pgTable(
  "student_skills",
  {
    id: id(),
    studentId: fk("student_id")
      .notNull()
      .references(() => studentProfiles.userId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    skillId: fk("skill_id").references(() => skills.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    rawSkillName: varchar("raw_skill_name", { length: 255 }),
    proficiency: proficiencyLevel("proficiency"),
    source: skillSource("source"),
    confidence: normalizedDecimal("confidence"),
    normalizationStatus: normalizationStatus("normalization_status").default("PENDING"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("student_skills_student_skill_unique")
      .on(table.studentId, table.skillId)
      .where(sql`${table.skillId} IS NOT NULL`),
    uniqueIndex("student_skills_student_raw_skill_unique")
      .on(table.studentId, table.rawSkillName)
      .where(sql`${table.rawSkillName} IS NOT NULL`),
    index("student_skills_student_idx").on(table.studentId),
    index("student_skills_skill_idx").on(table.skillId),
    check("student_skills_confidence_range", sql`${table.confidence} IS NULL OR (${table.confidence} >= 0 AND ${table.confidence} <= 1)`),
  ]
);

export const studentProjects = pgTable(
  "student_projects",
  {
    id: id(),
    studentId: fk("student_id")
      .notNull()
      .references(() => studentProfiles.userId, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    roleDescription: text("role_description"),
    /**
     * What kind of work this was, and who it was for. Both nullable because
     * the table predates them: rows seeded as portfolio evidence for an
     * application carry neither, while rows a student writes on their profile
     * carry both and are what `ExperienceList` renders.
     */
    kind: experienceKind("kind"),
    organisation: varchar("organisation", { length: 255 }),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("student_projects_student_idx").on(table.studentId),
    check("student_projects_date_order", sql`${table.startDate} IS NULL OR ${table.endDate} IS NULL OR ${table.startDate} <= ${table.endDate}`),
  ]
);

export const projectSkills = pgTable(
  "project_skills",
  {
    id: id(),
    projectId: fk("project_id")
      .notNull()
      .references(() => studentProjects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    skillId: fk("skill_id").references(() => skills.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    rawSkillName: varchar("raw_skill_name", { length: 255 }),
    source: skillSource("source"),
    confidence: normalizedDecimal("confidence"),
    normalizationStatus: normalizationStatus("normalization_status").default("PENDING"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("project_skills_project_skill_unique")
      .on(table.projectId, table.skillId)
      .where(sql`${table.skillId} IS NOT NULL`),
    uniqueIndex("project_skills_project_raw_skill_unique")
      .on(table.projectId, table.rawSkillName)
      .where(sql`${table.rawSkillName} IS NOT NULL`),
    index("project_skills_project_idx").on(table.projectId),
    index("project_skills_skill_idx").on(table.skillId),
    check("project_skills_confidence_range", sql`${table.confidence} IS NULL OR (${table.confidence} >= 0 AND ${table.confidence} <= 1)`),
  ]
);

export const projectEvidence = pgTable(
  "project_evidence",
  {
    id: id(),
    projectId: fk("project_id")
      .notNull()
      .references(() => studentProjects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    evidenceType: evidenceType("evidence_type"),
    evidenceUrl: text("evidence_url"),
    verificationStatus: verificationStatus("verification_status").default("UNVERIFIED"),
    createdAt: createdAt(),
  },
  (table) => [index("project_evidence_project_idx").on(table.projectId)]
);

export const skillCandidates = pgTable(
  "skill_candidates",
  {
    id: id(),
    rawName: varchar("raw_name", { length: 255 }).notNull(),
    submittedBy: fk("submitted_by").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    sourceType: varchar("source_type", { length: 80 }),
    sourceId: fk("source_id"),
    suggestedSkillId: fk("suggested_skill_id").references(() => skills.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    status: varchar("status", { length: 80 }).default("PENDING"),
    createdAt: createdAt(),
    resolvedAt: timestamptz("resolved_at"),
  },
  (table) => [
    index("skill_candidates_status_idx").on(table.status),
    index("skill_candidates_submitted_by_idx").on(table.submittedBy),
    index("skill_candidates_suggested_skill_idx").on(table.suggestedSkillId),
  ]
);

export const skillRelationships = pgTable(
  "skill_relationships",
  {
    id: id(),
    skillId: fk("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade", onUpdate: "cascade" }),
    relatedSkillId: fk("related_skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade", onUpdate: "cascade" }),
    relationshipType: skillRelationshipType("relationship_type"),
    similarityScore: normalizedDecimal("similarity_score"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("skill_relationships_pair_unique").on(
      table.skillId,
      table.relatedSkillId
    ),
    index("skill_relationships_related_skill_idx").on(table.relatedSkillId),
    check("skill_relationships_not_self", sql`${table.skillId} <> ${table.relatedSkillId}`),
    check("skill_relationships_similarity_range", sql`${table.similarityScore} IS NULL OR (${table.similarityScore} >= 0 AND ${table.similarityScore} <= 1)`),
  ]
);
