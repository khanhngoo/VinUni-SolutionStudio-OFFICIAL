import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  assessmentAttempts,
  assessmentQuestions,
  assessmentResponses,
  assessmentScores,
  assessmentSections,
  applications,
  assessments,
  challenges,
  supervisionRequests,
} from "@/db/schema";
import type {
  AssessmentAttemptStatus,
  AssessmentQuestionType,
} from "@/db/queries/assessments";

export type AssessmentMutationDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface AssessmentAttemptInsertValues {
  applicationId: bigint;
  applicationMemberId: bigint | null;
  assessmentId: bigint;
  startedAt: Date;
  status: Extract<AssessmentAttemptStatus, "IN_PROGRESS">;
}

export interface AssessmentAttemptMutationRead {
  applicationId: bigint;
  applicationMemberId: bigint | null;
  assessmentId: bigint;
  id: bigint;
  startedAt: Date | null;
  status: AssessmentAttemptStatus;
  submittedAt: Date | null;
}

export interface AssessmentQuestionMutationRead {
  assessmentId: bigint;
  config: unknown;
  id: bigint;
  questionType: AssessmentQuestionType;
  sectionId: bigint;
}

export interface AssessmentResponseMutationRead {
  id: bigint;
  questionId: bigint;
  response: string | null;
  responseData: unknown;
}

export interface AssessmentResponseWriteValues {
  attachmentUrl?: string | null;
  response?: string | null;
  responseData?: unknown;
  submittedAt: Date;
}

export interface AssessmentGradingSubjectMutationRead {
  applicationChallengeId: bigint;
  applicationId: bigint;
  applicationPublicId: string;
  applicationStatus: string;
  challengeTitle: string;
  assessmentChallengeId: bigint;
  assessmentId: bigint;
  assessmentScope: string;
  attemptId: bigint;
  attemptStatus: AssessmentAttemptStatus;
  passingScore: number | null;
  submittedAt: Date | null;
  teamName: string | null;
}

export interface AssessmentScoreMutationRead {
  comments: string | null;
  id: bigint;
  overallScore: number | null;
  reviewerId: bigint;
  rubricScores: unknown;
}

export async function insertAssessmentAttempt(
  database: AssessmentMutationDatabase,
  values: AssessmentAttemptInsertValues
): Promise<AssessmentAttemptMutationRead> {
  const [attempt] = await database
    .insert(assessmentAttempts)
    .values({
      applicationId: values.applicationId,
      applicationMemberId: values.applicationMemberId,
      assessmentId: values.assessmentId,
      startedAt: values.startedAt,
      status: values.status,
    })
    .returning({
      applicationId: assessmentAttempts.applicationId,
      applicationMemberId: assessmentAttempts.applicationMemberId,
      assessmentId: assessmentAttempts.assessmentId,
      id: assessmentAttempts.id,
      startedAt: assessmentAttempts.startedAt,
      status: sql<AssessmentAttemptStatus>`coalesce(${assessmentAttempts.status}, 'NOT_STARTED')`,
      submittedAt: assessmentAttempts.submittedAt,
    });

  return attempt;
}

export async function updateAssessmentAttemptStatus(
  database: AssessmentMutationDatabase,
  input: {
    attemptId: bigint;
    expectedStatuses: AssessmentAttemptStatus[];
    nextStatus: Extract<
      AssessmentAttemptStatus,
      "IN_PROGRESS" | "REVIEWED" | "SUBMITTED"
    >;
    now: Date;
  }
): Promise<AssessmentAttemptMutationRead | null> {
  const [attempt] = await database
    .update(assessmentAttempts)
    .set({
      startedAt:
        input.nextStatus === "IN_PROGRESS" ? input.now : undefined,
      status: input.nextStatus,
      submittedAt:
        input.nextStatus === "SUBMITTED" ? input.now : undefined,
    })
    .where(
      and(
        eq(assessmentAttempts.id, input.attemptId),
        inArray(assessmentAttempts.status, input.expectedStatuses)
      )
    )
    .returning({
      applicationId: assessmentAttempts.applicationId,
      applicationMemberId: assessmentAttempts.applicationMemberId,
      assessmentId: assessmentAttempts.assessmentId,
      id: assessmentAttempts.id,
      startedAt: assessmentAttempts.startedAt,
      status: sql<AssessmentAttemptStatus>`coalesce(${assessmentAttempts.status}, 'NOT_STARTED')`,
      submittedAt: assessmentAttempts.submittedAt,
    });

  return attempt ?? null;
}

export async function getAssessmentQuestionForWrite(
  database: AssessmentMutationDatabase,
  questionId: bigint
): Promise<AssessmentQuestionMutationRead | null> {
  const [question] = await database
    .select({
      assessmentId: assessmentSections.assessmentId,
      config: assessmentQuestions.config,
      id: assessmentQuestions.id,
      questionType: sql<AssessmentQuestionType>`coalesce(${assessmentQuestions.questionType}, 'REASONING')`,
      sectionId: assessmentQuestions.sectionId,
    })
    .from(assessmentQuestions)
    .innerJoin(
      assessmentSections,
      eq(assessmentSections.id, assessmentQuestions.sectionId)
    )
    .where(eq(assessmentQuestions.id, questionId))
    .limit(1);

  return question ?? null;
}

export async function selectAssessmentResponsesForQuestion(
  database: AssessmentMutationDatabase,
  input: {
    attemptId: bigint;
    questionId: bigint;
  }
): Promise<AssessmentResponseMutationRead[]> {
  return database
    .select({
      id: assessmentResponses.id,
      questionId: assessmentResponses.questionId,
      response: assessmentResponses.response,
      responseData: assessmentResponses.responseData,
    })
    .from(assessmentResponses)
    .where(
      and(
        eq(assessmentResponses.attemptId, input.attemptId),
        eq(assessmentResponses.questionId, input.questionId)
      )
    );
}

export async function insertAssessmentResponse(
  database: AssessmentMutationDatabase,
  input: {
    attemptId: bigint;
    questionId: bigint;
    values: AssessmentResponseWriteValues;
  }
): Promise<AssessmentResponseMutationRead> {
  const [response] = await database
    .insert(assessmentResponses)
    .values({
      attachmentUrl: input.values.attachmentUrl ?? null,
      attemptId: input.attemptId,
      questionId: input.questionId,
      response: input.values.response ?? null,
      responseData: input.values.responseData,
      submittedAt: input.values.submittedAt,
    })
    .returning({
      id: assessmentResponses.id,
      questionId: assessmentResponses.questionId,
      response: assessmentResponses.response,
      responseData: assessmentResponses.responseData,
    });

  return response;
}

export async function upsertAssessmentResponse(
  database: AssessmentMutationDatabase,
  input: {
    attemptId: bigint;
    questionId: bigint;
    values: AssessmentResponseWriteValues;
  }
): Promise<AssessmentResponseMutationRead> {
  const [response] = await database
    .insert(assessmentResponses)
    .values({
      attachmentUrl: input.values.attachmentUrl ?? null,
      attemptId: input.attemptId,
      questionId: input.questionId,
      response: input.values.response ?? null,
      responseData: input.values.responseData,
      submittedAt: input.values.submittedAt,
    })
    .onConflictDoUpdate({
      target: [assessmentResponses.attemptId, assessmentResponses.questionId],
      set: {
        attachmentUrl: input.values.attachmentUrl ?? null,
        response: input.values.response ?? null,
        responseData: input.values.responseData,
        submittedAt: input.values.submittedAt,
      },
    })
    .returning({
      id: assessmentResponses.id,
      questionId: assessmentResponses.questionId,
      response: assessmentResponses.response,
      responseData: assessmentResponses.responseData,
    });

  return response;
}

export async function updateAssessmentResponse(
  database: AssessmentMutationDatabase,
  input: {
    responseId: bigint;
    values: AssessmentResponseWriteValues;
  }
): Promise<AssessmentResponseMutationRead> {
  const [response] = await database
    .update(assessmentResponses)
    .set({
      attachmentUrl: input.values.attachmentUrl ?? null,
      response: input.values.response ?? null,
      responseData: input.values.responseData,
      submittedAt: input.values.submittedAt,
    })
    .where(eq(assessmentResponses.id, input.responseId))
    .returning({
      id: assessmentResponses.id,
      questionId: assessmentResponses.questionId,
      response: assessmentResponses.response,
      responseData: assessmentResponses.responseData,
    });

  return response;
}

export async function lockAssessmentAttempt(
  database: AssessmentMutationDatabase,
  attemptId: bigint
) {
  await database.execute(
    sql`select ${assessmentAttempts.id} from ${assessmentAttempts} where ${assessmentAttempts.id} = ${attemptId} for update`
  );
}

export async function getAssessmentGradingSubjectForWrite(
  database: AssessmentMutationDatabase,
  attemptId: bigint
): Promise<AssessmentGradingSubjectMutationRead | null> {
  const [subject] = await database
    .select({
      applicationChallengeId: applications.challengeId,
      applicationId: applications.id,
      applicationPublicId: applications.publicId,
      applicationStatus: sql<string>`coalesce(${applications.status}, 'SUBMITTED')`,
      challengeTitle: challenges.title,
      assessmentChallengeId: assessments.challengeId,
      assessmentId: assessments.id,
      assessmentScope: assessments.scope,
      attemptId: assessmentAttempts.id,
      attemptStatus: sql<AssessmentAttemptStatus>`coalesce(${assessmentAttempts.status}, 'NOT_STARTED')`,
      passingScore: assessments.passingScore,
      submittedAt: assessmentAttempts.submittedAt,
      teamName: applications.teamName,
    })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
    .innerJoin(applications, eq(applications.id, assessmentAttempts.applicationId))
    .innerJoin(challenges, eq(challenges.id, applications.challengeId))
    .where(eq(assessmentAttempts.id, attemptId))
    .limit(1);

  return subject ?? null;
}

export async function listAcceptedAssessmentGraderIds(
  database: AssessmentMutationDatabase,
  applicationId: bigint
) {
  const rows = await database
    .select({ facultyId: supervisionRequests.facultyId })
    .from(supervisionRequests)
    .where(
      and(
        eq(supervisionRequests.applicationId, applicationId),
        eq(supervisionRequests.status, "ACCEPTED")
      )
    );
  return Array.from(new Set(rows.map((row) => row.facultyId.toString()))).map(
    (value) => BigInt(value)
  );
}

export async function getAssessmentScoreForWrite(
  database: AssessmentMutationDatabase,
  attemptId: bigint
): Promise<AssessmentScoreMutationRead | null> {
  const [score] = await database
    .select({
      comments: assessmentScores.comments,
      id: assessmentScores.id,
      overallScore: assessmentScores.overallScore,
      reviewerId: assessmentScores.reviewerId,
      rubricScores: assessmentScores.rubricScores,
    })
    .from(assessmentScores)
    .where(eq(assessmentScores.attemptId, attemptId))
    .limit(1);
  return score ?? null;
}

export async function insertAssessmentScore(
  database: AssessmentMutationDatabase,
  input: {
    attemptId: bigint;
    comments: string | null;
    overallScore: number;
    reviewerId: bigint;
    rubricScores: unknown;
  }
): Promise<AssessmentScoreMutationRead> {
  const [score] = await database
    .insert(assessmentScores)
    .values(input)
    .returning({
      comments: assessmentScores.comments,
      id: assessmentScores.id,
      overallScore: assessmentScores.overallScore,
      reviewerId: assessmentScores.reviewerId,
      rubricScores: assessmentScores.rubricScores,
    });
  return score;
}
