import { db } from "@/db";
import {
  getAssessmentDefinitionWithQuestions,
  getLatestAssessmentScoreForAttempt,
  listAssessmentGradingQueue,
  listAssessmentResponsesForAttempt,
  type AssessmentQuestionRead,
  type AssessmentResponseRead,
} from "@/db/queries/assessments";
import {
  getAssessmentGradingSubjectForWrite,
  getAssessmentScoreForWrite,
  insertAssessmentScore,
  listAcceptedAssessmentGraderIds,
  lockAssessmentAttempt,
  updateAssessmentAttemptStatus,
  type AssessmentGradingSubjectMutationRead,
  type AssessmentMutationDatabase,
} from "@/db/mutations/assessments";
import { lockApplicationForLifecycle } from "@/db/mutations/applications";
import { progressApplicationAfterAssessmentReview } from "@/services/application-lifecycle.service";

export type AssessmentGradingErrorCode =
  | "CONFLICT"
  | "FORBIDDEN"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export class AssessmentGradingError extends Error {
  constructor(
    public readonly code: AssessmentGradingErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AssessmentGradingError";
  }
}

export interface AssessmentGradingQueueItem {
  applicationPublicId: string;
  assessmentTitle: string;
  attemptKey: string;
  challengeTitle: string;
  studentName: string;
  submittedAt: Date | null;
  teamName: string | null;
}

export interface AssessmentGradingQuestion {
  isCorrect: boolean | null;
  maxScore: number | null;
  options: string[];
  prompt: string;
  questionKey: string;
  questionType: string;
  response: string | null;
  sectionTitle: string | null;
  selectedOption: string | null;
}

export interface AssessmentGradingDetail {
  application: {
    publicId: string;
    status: string;
    teamName: string | null;
  };
  assessment: {
    passingScore: number | null;
    title: string;
  };
  attempt: {
    attemptKey: string;
    status: string;
    submittedAt: Date | null;
  };
  challengeTitle: string;
  questions: AssessmentGradingQuestion[];
  reviewedScore: {
    comments: string | null;
    overallScore: number | null;
    rubricNotes: string | null;
  } | null;
}

export interface GradeAssessmentInput {
  comments?: string | null;
  overallScore: number;
  rubricNotes?: string | null;
}

export interface GradeAssessmentResult {
  applicationStatus: string;
  idempotent: boolean;
  outcome: "FAIL" | "PASS" | "THRESHOLD_MISSING";
  overallScore: number;
  passingScore: number | null;
}

interface GradingOptions {
  database?: AssessmentMutationDatabase;
  injectFailureAfterScore?: () => Promise<void> | void;
  now?: Date;
}

export async function getAssessmentGradingQueue(
  facultyUserId: bigint,
  options: Pick<GradingOptions, "database"> = {}
): Promise<AssessmentGradingQueueItem[]> {
  const rows = await listAssessmentGradingQueue(
    options.database ?? db,
    facultyUserId
  );
  return rows.map((row) => ({
    applicationPublicId: row.applicationPublicId,
    assessmentTitle: stakeholderAssessmentTitle(row.assessmentTitle),
    attemptKey: encodeAttemptKey(row.attemptId),
    challengeTitle: row.challengeTitle,
    studentName: row.studentName,
    submittedAt: row.submittedAt,
    teamName: row.teamName,
  }));
}

export async function getAssessmentGradingDetail(
  attemptKey: string,
  facultyUserId: bigint,
  options: Pick<GradingOptions, "database"> = {}
): Promise<AssessmentGradingDetail | null> {
  const database = options.database ?? db;
  const attemptId = decodeAttemptKey(attemptKey);
  if (attemptId === null) return null;

  const subject = await getAssessmentGradingSubjectForWrite(database, attemptId);
  if (!subject) return null;
  assertSubjectInvariant(subject);
  if (!(await isAuthorizedGrader(database, subject.applicationId, facultyUserId))) {
    return null;
  }
  if (subject.assessmentScope !== "INDIVIDUAL") return null;
  if (
    subject.attemptStatus !== "SUBMITTED" &&
    subject.attemptStatus !== "REVIEWED"
  ) {
    return null;
  }

  const [assessment, responses, score] = await Promise.all([
    getAssessmentDefinitionWithQuestions(database, subject.assessmentId),
    listAssessmentResponsesForAttempt(database, attemptId),
    getLatestAssessmentScoreForAttempt(database, attemptId),
  ]);
  if (!assessment) return null;

  const responseByQuestion = new Map(
    responses.map((response) => [response.questionId, response])
  );
  return {
    application: {
      publicId: subject.applicationPublicId,
      status: subject.applicationStatus,
      teamName: subject.teamName,
    },
    assessment: {
      passingScore: assessment.passingScore,
      title: stakeholderAssessmentTitle(assessment.title),
    },
    attempt: {
      attemptKey,
      status: subject.attemptStatus,
      submittedAt: subject.submittedAt,
    },
    challengeTitle: subject.challengeTitle,
    questions: assessment.sections.flatMap((section) =>
      section.questions.map((question) =>
        toGradingQuestion(
          question,
          section.title,
          responseByQuestion.get(question.id) ?? null
        )
      )
    ),
    reviewedScore: score
      ? {
          comments: score.comments,
          overallScore: score.overallScore,
          rubricNotes: stringValue(asRecord(score.rubricScores).reviewerSummary),
        }
      : null,
  };
}

export async function gradeAssessmentAttempt(
  attemptKey: string,
  input: GradeAssessmentInput,
  facultyUserId: bigint,
  options: GradingOptions = {}
): Promise<GradeAssessmentResult> {
  const attemptId = decodeAttemptKey(attemptKey);
  if (attemptId === null) {
    throw new AssessmentGradingError("NOT_FOUND", "Assessment attempt was not found.");
  }
  const values = validateGradeInput(input);
  const database = options.database ?? db;
  const now = options.now ?? new Date();

  return withGradingTransaction(database, async (tx) => {
    const initial = await getAssessmentGradingSubjectForWrite(tx, attemptId);
    if (!initial) {
      throw new AssessmentGradingError("NOT_FOUND", "Assessment attempt was not found.");
    }

    await lockApplicationForLifecycle(tx, initial.applicationId);
    await lockAssessmentAttempt(tx, attemptId);
    const subject = await getAssessmentGradingSubjectForWrite(tx, attemptId);
    if (!subject) {
      throw new AssessmentGradingError("NOT_FOUND", "Assessment attempt was not found.");
    }
    assertSubjectInvariant(subject);
    if (!(await isAuthorizedGrader(tx, subject.applicationId, facultyUserId))) {
      throw new AssessmentGradingError(
        "FORBIDDEN",
        "This assessment is not assigned to you for grading."
      );
    }
    if (subject.assessmentScope !== "INDIVIDUAL") {
      throw new AssessmentGradingError(
        "VALIDATION_ERROR",
        "Only individual assessment attempts can be graded in this workflow."
      );
    }

    const existingScore = await getAssessmentScoreForWrite(tx, attemptId);
    if (subject.attemptStatus === "REVIEWED") {
      if (
        existingScore?.reviewerId === facultyUserId &&
        existingScore.overallScore === values.overallScore
      ) {
        return resultForSubject(subject, values.overallScore, true);
      }
      throw new AssessmentGradingError(
        "CONFLICT",
        "This attempt already has an authoritative reviewed result."
      );
    }
    if (subject.attemptStatus !== "SUBMITTED") {
      throw new AssessmentGradingError(
        "INVALID_TRANSITION",
        "Only submitted attempts can be graded."
      );
    }
    if (subject.applicationStatus !== "ASSESSMENT") {
      throw new AssessmentGradingError(
        "INVALID_TRANSITION",
        "The application is no longer awaiting assessment review."
      );
    }
    if (existingScore) {
      throw new AssessmentGradingError(
        "CONFLICT",
        "This attempt already has an authoritative score."
      );
    }

    await insertAssessmentScore(tx, {
      attemptId,
      comments: values.comments,
      overallScore: values.overallScore,
      reviewerId: facultyUserId,
      rubricScores: {
        reviewerSummary: values.rubricNotes,
        version: "phase-6.6.5",
      },
    });
    await options.injectFailureAfterScore?.();

    const reviewed = await updateAssessmentAttemptStatus(tx, {
      attemptId,
      expectedStatuses: ["SUBMITTED"],
      nextStatus: "REVIEWED",
      now,
    });
    if (!reviewed) {
      throw new AssessmentGradingError(
        "CONFLICT",
        "Attempt changed while the grade was being saved."
      );
    }

    const result = resultForSubject(subject, values.overallScore, false);
    if (result.outcome !== "THRESHOLD_MISSING") {
      const lifecycle = await progressApplicationAfterAssessmentReview(
        subject.applicationId,
        result.outcome,
        { database: tx, now }
      );
      result.applicationStatus = lifecycle.status;
    }
    return result;
  });
}

function resultForSubject(
  subject: AssessmentGradingSubjectMutationRead,
  overallScore: number,
  idempotent: boolean
): GradeAssessmentResult {
  const outcome =
    subject.passingScore === null
      ? "THRESHOLD_MISSING"
      : overallScore >= subject.passingScore
        ? "PASS"
        : "FAIL";
  return {
    applicationStatus: subject.applicationStatus,
    idempotent,
    outcome,
    overallScore,
    passingScore: subject.passingScore,
  };
}

async function isAuthorizedGrader(
  database: AssessmentMutationDatabase,
  applicationId: bigint,
  facultyUserId: bigint
) {
  const graderIds = await listAcceptedAssessmentGraderIds(database, applicationId);
  return graderIds.some((id) => id === facultyUserId);
}

function assertSubjectInvariant(
  subject: NonNullable<
    Awaited<ReturnType<typeof getAssessmentGradingSubjectForWrite>>
  >
) {
  if (subject.applicationChallengeId !== subject.assessmentChallengeId) {
    throw new AssessmentGradingError(
      "VALIDATION_ERROR",
      "Assessment and application belong to different challenges."
    );
  }
}

function validateGradeInput(input: GradeAssessmentInput) {
  if (
    !Number.isFinite(input.overallScore) ||
    input.overallScore < 0 ||
    input.overallScore > 100 ||
    Math.round(input.overallScore * 100) !== input.overallScore * 100
  ) {
    throw new AssessmentGradingError(
      "VALIDATION_ERROR",
      "Overall score must be between 0 and 100 with at most two decimal places."
    );
  }
  const comments = normalizedOptionalText(input.comments, 5_000, "Comments");
  const rubricNotes = normalizedOptionalText(
    input.rubricNotes,
    5_000,
    "Rubric notes"
  );
  return { comments, overallScore: input.overallScore, rubricNotes };
}

function normalizedOptionalText(
  value: string | null | undefined,
  maxLength: number,
  label: string
) {
  const normalized = value?.trim() || null;
  if (normalized && normalized.length > maxLength) {
    throw new AssessmentGradingError(
      "VALIDATION_ERROR",
      `${label} must be ${maxLength.toLocaleString()} characters or fewer.`
    );
  }
  return normalized;
}

function toGradingQuestion(
  question: AssessmentQuestionRead,
  sectionTitle: string | null,
  response: AssessmentResponseRead | null
): AssessmentGradingQuestion {
  const config = asRecord(question.config);
  const options = Array.isArray(config.options)
    ? config.options.filter((option): option is string => typeof option === "string")
    : [];
  const selectedIndex = numberValue(asRecord(response?.responseData).selectedOptionIndex);
  const correctIndex = numberValue(config.correctIndex);
  const isMcq = question.questionType === "MULTIPLE_CHOICE";
  return {
    isCorrect:
      isMcq && response && selectedIndex !== null && correctIndex !== null
        ? selectedIndex === correctIndex
        : null,
    maxScore: question.maxScore,
    options,
    prompt: question.prompt,
    questionKey: `q_${question.id.toString()}`,
    questionType: question.questionType,
    response: response?.response ?? null,
    sectionTitle,
    selectedOption:
      selectedIndex !== null && selectedIndex >= 0
        ? options[selectedIndex] ?? null
        : null,
  };
}

function stakeholderAssessmentTitle(title: string | null) {
  const value = title ?? "Assessment";
  const technical = value.match(/^DEMO technical assessment for (.+)$/i);
  if (technical) return `${technical[1]} technical assessment`;
  const general = value.match(/^DEMO assessment for (.+)$/i);
  if (general) return `${general[1]} assessment`;
  return value;
}

function encodeAttemptKey(attemptId: bigint) {
  return `attempt_${attemptId.toString()}`;
}

function decodeAttemptKey(value: string) {
  if (!/^attempt_[1-9]\d*$/.test(value)) return null;
  try {
    return BigInt(value.slice("attempt_".length));
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

async function withGradingTransaction<T>(
  database: AssessmentMutationDatabase,
  callback: (tx: AssessmentMutationDatabase) => Promise<T>
) {
  if ("rollback" in database && typeof database.rollback === "function") {
    return callback(database);
  }
  return database.transaction((tx) => callback(tx));
}
