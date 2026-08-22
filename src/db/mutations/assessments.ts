import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  assessmentAttempts,
  assessmentQuestions,
  assessmentResponses,
  assessmentSections,
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
    nextStatus: Extract<AssessmentAttemptStatus, "IN_PROGRESS" | "SUBMITTED">;
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
