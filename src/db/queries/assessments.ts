import { asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  assessmentAttempts,
  assessmentQuestions,
  assessmentResponses,
  assessments,
  assessmentScores,
  assessmentSections,
} from "@/db/schema";

export type AssessmentQueryDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

type AssessmentRow = typeof assessments.$inferSelect;
type AssessmentQuestionRow = typeof assessmentQuestions.$inferSelect;
type AssessmentAttemptRow = typeof assessmentAttempts.$inferSelect;

export type AssessmentScope = AssessmentRow["scope"];
export type AssessmentStatus = NonNullable<AssessmentRow["status"]>;
export type AssessmentQuestionType = NonNullable<AssessmentQuestionRow["questionType"]>;
export type AssessmentAttemptStatus = NonNullable<AssessmentAttemptRow["status"]>;

export interface AssessmentDefinitionRead {
  aiPolicy: AssessmentRow["aiPolicy"];
  challengeId: bigint;
  id: bigint;
  instructions: string | null;
  scope: AssessmentScope;
  status: AssessmentStatus;
  timeLimitMinutes: number | null;
  title: string | null;
}

export interface AssessmentSectionRead {
  id: bigint;
  instructions: string | null;
  sequence: number | null;
  timeLimitMinutes: number | null;
  title: string | null;
}

export interface AssessmentQuestionRead {
  config: unknown;
  id: bigint;
  maxScore: number | null;
  prompt: string;
  questionType: AssessmentQuestionType;
  sectionId: bigint;
  sequence: number | null;
}

export interface AssessmentSectionWithQuestionsRead
  extends AssessmentSectionRead {
  questions: AssessmentQuestionRead[];
}

export interface AssessmentDefinitionWithQuestionsRead
  extends AssessmentDefinitionRead {
  sections: AssessmentSectionWithQuestionsRead[];
}

export interface AssessmentAttemptRead {
  aiUsageDeclared: boolean | null;
  aiUsageDescription: string | null;
  applicationId: bigint;
  applicationMemberId: bigint | null;
  assessmentId: bigint;
  id: bigint;
  startedAt: Date | null;
  status: AssessmentAttemptStatus;
  submittedAt: Date | null;
}

export interface AssessmentResponseRead {
  attachmentUrl: string | null;
  id: bigint;
  questionId: bigint;
  response: string | null;
  responseData: unknown;
  submittedAt: Date | null;
}

export interface AssessmentScoreRead {
  comments: string | null;
  createdAt: Date | null;
  overallScore: number | null;
  reviewerId: bigint;
  rubricScores: unknown;
}

export async function listActiveAssessmentsForChallenge(
  database: AssessmentQueryDatabase,
  challengeId: bigint
): Promise<AssessmentDefinitionRead[]> {
  return database
    .select({
      aiPolicy: assessments.aiPolicy,
      challengeId: assessments.challengeId,
      id: assessments.id,
      instructions: assessments.instructions,
      scope: assessments.scope,
      status: sql<AssessmentStatus>`coalesce(${assessments.status}, 'DRAFT')`,
      timeLimitMinutes: assessments.timeLimitMinutes,
      title: assessments.title,
    })
    .from(assessments)
    .where(eq(assessments.challengeId, challengeId))
    .orderBy(asc(assessments.id))
    .then((rows) => rows.filter((row) => row.status === "ACTIVE"));
}

export async function getAssessmentDefinitionWithQuestions(
  database: AssessmentQueryDatabase,
  assessmentId: bigint
): Promise<AssessmentDefinitionWithQuestionsRead | null> {
  const [assessment] = await database
    .select({
      aiPolicy: assessments.aiPolicy,
      challengeId: assessments.challengeId,
      id: assessments.id,
      instructions: assessments.instructions,
      scope: assessments.scope,
      status: sql<AssessmentStatus>`coalesce(${assessments.status}, 'DRAFT')`,
      timeLimitMinutes: assessments.timeLimitMinutes,
      title: assessments.title,
    })
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);

  if (!assessment) return null;

  const sections = await database
    .select({
      id: assessmentSections.id,
      instructions: assessmentSections.instructions,
      sequence: assessmentSections.sequence,
      timeLimitMinutes: assessmentSections.timeLimitMinutes,
      title: assessmentSections.title,
    })
    .from(assessmentSections)
    .where(eq(assessmentSections.assessmentId, assessmentId))
    .orderBy(asc(assessmentSections.sequence), asc(assessmentSections.id));

  if (sections.length === 0) {
    return { ...assessment, sections: [] };
  }

  const sectionIds = sections.map((section) => section.id);
  const questions = await database
    .select({
      config: assessmentQuestions.config,
      id: assessmentQuestions.id,
      maxScore: assessmentQuestions.maxScore,
      prompt: assessmentQuestions.prompt,
      questionType: sql<AssessmentQuestionType>`coalesce(${assessmentQuestions.questionType}, 'REASONING')`,
      sectionId: assessmentQuestions.sectionId,
      sequence: assessmentQuestions.sequence,
    })
    .from(assessmentQuestions)
    .where(inArray(assessmentQuestions.sectionId, sectionIds))
    .orderBy(asc(assessmentQuestions.sequence), asc(assessmentQuestions.id));

  return {
    ...assessment,
    sections: sections.map((section) => ({
      ...section,
      questions: questions.filter((question) => question.sectionId === section.id),
    })),
  };
}

export async function getAssessmentAttemptForOwner(
  database: AssessmentQueryDatabase,
  input: {
    applicationId: bigint;
    applicationMemberId: bigint | null;
    assessmentId: bigint;
    scope: AssessmentScope;
  }
): Promise<AssessmentAttemptRead | null> {
  const rows = await database
    .select({
      aiUsageDeclared: assessmentAttempts.aiUsageDeclared,
      aiUsageDescription: assessmentAttempts.aiUsageDescription,
      applicationId: assessmentAttempts.applicationId,
      applicationMemberId: assessmentAttempts.applicationMemberId,
      assessmentId: assessmentAttempts.assessmentId,
      id: assessmentAttempts.id,
      startedAt: assessmentAttempts.startedAt,
      status: sql<AssessmentAttemptStatus>`coalesce(${assessmentAttempts.status}, 'NOT_STARTED')`,
      submittedAt: assessmentAttempts.submittedAt,
    })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.assessmentId, input.assessmentId));

  const ownedRows = rows.filter((row) => {
    if (row.applicationId !== input.applicationId) return false;
    if (input.scope === "TEAM") return row.applicationMemberId === null;
    return row.applicationMemberId === input.applicationMemberId;
  });

  if (ownedRows.length > 1) {
    throw new Error("Duplicate assessment attempts found for owner.");
  }

  return ownedRows[0] ?? null;
}

export async function listAssessmentResponsesForAttempt(
  database: AssessmentQueryDatabase,
  attemptId: bigint
): Promise<AssessmentResponseRead[]> {
  return database
    .select({
      attachmentUrl: assessmentResponses.attachmentUrl,
      id: assessmentResponses.id,
      questionId: assessmentResponses.questionId,
      response: assessmentResponses.response,
      responseData: assessmentResponses.responseData,
      submittedAt: assessmentResponses.submittedAt,
    })
    .from(assessmentResponses)
    .where(eq(assessmentResponses.attemptId, attemptId));
}

export async function getLatestAssessmentScoreForAttempt(
  database: AssessmentQueryDatabase,
  attemptId: bigint
): Promise<AssessmentScoreRead | null> {
  const rows = await database
    .select({
      comments: assessmentScores.comments,
      createdAt: assessmentScores.createdAt,
      overallScore: assessmentScores.overallScore,
      reviewerId: assessmentScores.reviewerId,
      rubricScores: assessmentScores.rubricScores,
    })
    .from(assessmentScores)
    .where(eq(assessmentScores.attemptId, attemptId))
    .orderBy(asc(assessmentScores.createdAt), asc(assessmentScores.id));

  return rows.at(-1) ?? null;
}
