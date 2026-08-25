import { db } from "@/db";
import {
  getAssessmentAttemptForOwner,
  getAssessmentDefinitionWithQuestions,
  getLatestAssessmentScoreForAttempt,
  listActiveAssessmentsForChallenge,
  listAssessmentResponsesForAttempt,
  type AssessmentAttemptRead,
  type AssessmentAttemptStatus,
  type AssessmentDefinitionWithQuestionsRead,
  type AssessmentQuestionRead,
  type AssessmentQuestionType,
  type AssessmentResponseRead,
  type AssessmentScope,
  type AssessmentScoreRead,
  type AssessmentSectionWithQuestionsRead,
} from "@/db/queries/assessments";
import { getApplicationByPublicId } from "@/db/queries/applications";
import { assessmentTrackLabel } from "./assessment-track";
import {
  getAssessmentQuestionForWrite,
  insertAssessmentAttempt,
  insertAssessmentResponse,
  selectAssessmentResponsesForQuestion,
  updateAssessmentAttemptStatus,
  updateAssessmentResponse,
  type AssessmentMutationDatabase,
} from "@/db/mutations/assessments";
import {
  getDevelopmentApplicationActor,
  type ApplicationActorContext,
  type DevelopmentApplicationActorKey,
} from "@/services/application.service";
import type { ApplicationDetailRead, ApplicationMemberRead } from "@/db/queries/applications";

export type AssessmentErrorCode =
  | "CONFLICT"
  | "FORBIDDEN"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export class AssessmentError extends Error {
  constructor(
    public readonly code: AssessmentErrorCode,
    message: string,
    public readonly details: string[] = []
  ) {
    super(message);
    this.name = "AssessmentError";
  }
}

export type AssessmentResponseInput =
  | { kind: "CODING"; code: string }
  | { kind: "MULTIPLE_CHOICE"; selectedOptionIndex: number }
  | { kind: "TEXT"; response: string };

export interface AssessmentStudentQuestion {
  coding: {
    language: string | null;
    sampleTests: Array<{ expected: string; input: string }>;
    starterCode: string;
    statement: string[];
    title: string | null;
  } | null;
  maxScore: number | null;
  options: string[];
  prompt: string;
  questionKey: string;
  questionType: AssessmentQuestionType;
  sequence: number | null;
}

export interface AssessmentStudentSection {
  instructions: string | null;
  questions: AssessmentStudentQuestion[];
  sequence: number | null;
  timeLimitMinutes: number | null;
  title: string | null;
}

export interface AssessmentPreflight {
  application: {
    publicId: string;
    status: string;
    teamName: string | null;
  };
  assessment: {
    aiPolicy: string | null;
    instructions: string | null;
    scope: AssessmentScope;
    timeLimitMinutes: number | null;
    title: string;
  };
  challenge: {
    slug: string;
    title: string;
  };
  currentAttempt: {
    startedAt: Date | null;
    status: AssessmentAttemptStatus;
    submittedAt: Date | null;
  } | null;
  itemCountLabel: string;
  state:
    | "AVAILABLE"
    | "IN_PROGRESS"
    | "NO_ASSESSMENT"
    | "NOT_OPEN"
    | "REVIEWED"
    | "SUBMITTED";
  trackLabel: string;
}

export interface AssessmentTakingSession {
  application: {
    publicId: string;
  };
  assessment: {
    aiPolicy: string | null;
    instructions: string | null;
    scope: AssessmentScope;
    timeLimitMinutes: number | null;
    title: string;
  };
  challenge: {
    slug: string;
    title: string;
  };
  responses: Record<string, AssessmentResponseInput>;
  sections: AssessmentStudentSection[];
  trackLabel: string;
}

export interface AssessmentResult {
  application: {
    publicId: string;
    status: string;
  };
  assessment: {
    scope: AssessmentScope;
    title: string;
  };
  attempt: {
    startedAt: Date | null;
    status: AssessmentAttemptStatus;
    submittedAt: Date | null;
  } | null;
  challenge: {
    slug: string;
    title: string;
  };
  result:
    | {
        comments: string | null;
        minutesTaken: number | null;
        overallBand: string | null;
        overallScore: number | null;
        passed: boolean | null;
        sections: Array<{ band: string; name: string; note: string | null }>;
        track: string;
      }
    | null;
}

interface AssessmentServiceOptions {
  database?: AssessmentMutationDatabase;
  now?: Date;
}

interface AssessmentContext {
  application: ApplicationDetailRead;
  assessment: AssessmentDefinitionWithQuestionsRead;
  attempt: AssessmentAttemptRead | null;
  member: ApplicationMemberRead;
  responses: AssessmentResponseRead[];
  score: AssessmentScoreRead | null;
}

const EDITABLE_ATTEMPT_STATUSES: AssessmentAttemptStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
];

export async function getDevelopmentAssessmentActor(
  key: DevelopmentApplicationActorKey,
  options: AssessmentServiceOptions = {}
): Promise<ApplicationActorContext> {
  return getDevelopmentApplicationActor(key, options);
}

export async function getAssessmentPreflight(
  applicationPublicId: string,
  actor: ApplicationActorContext,
  options: AssessmentServiceOptions = {}
): Promise<AssessmentPreflight | null> {
  const context = await loadAssessmentContext(applicationPublicId, actor, options);
  if (!context) return null;

  return toPreflight(context);
}

export async function getAssessmentTakingSession(
  applicationPublicId: string,
  actor: ApplicationActorContext,
  options: AssessmentServiceOptions = {}
): Promise<AssessmentTakingSession | null> {
  const context = await loadAssessmentContext(applicationPublicId, actor, options);
  if (!context) return null;
  if (!context.attempt || context.attempt.status !== "IN_PROGRESS") return null;

  return {
    application: { publicId: context.application.publicId },
    assessment: {
      aiPolicy: context.assessment.aiPolicy,
      instructions: context.assessment.instructions,
      scope: context.assessment.scope,
      timeLimitMinutes: context.assessment.timeLimitMinutes,
      title: assessmentTitle(context.assessment),
    },
    challenge: {
      slug: context.application.challenge.slug,
      title: context.application.challenge.title,
    },
    responses: toResponseMap(context.responses, context.assessment),
    sections: context.assessment.sections.map(toStudentSection),
    trackLabel: trackLabel(context.assessment),
  };
}

export async function getAssessmentResult(
  applicationPublicId: string,
  actor: ApplicationActorContext,
  options: AssessmentServiceOptions = {}
): Promise<AssessmentResult | null> {
  const context = await loadAssessmentContext(applicationPublicId, actor, options);
  if (!context) return null;

  return {
    application: {
      publicId: context.application.publicId,
      status: context.application.status,
    },
    assessment: {
      scope: context.assessment.scope,
      title: assessmentTitle(context.assessment),
    },
    attempt: context.attempt
      ? {
          startedAt: context.attempt.startedAt,
          status: context.attempt.status,
          submittedAt: context.attempt.submittedAt,
        }
      : null,
    challenge: {
      slug: context.application.challenge.slug,
      title: context.application.challenge.title,
    },
    result: context.score ? toReviewedResult(context.score) : null,
  };
}

export async function startAssessmentAttempt(
  applicationPublicId: string,
  actor: ApplicationActorContext,
  options: AssessmentServiceOptions = {}
): Promise<AssessmentTakingSession> {
  const database = options.database ?? db;
  const now = options.now ?? new Date();

  return withAssessmentTransaction(database, async (tx) => {
    const context = await loadAssessmentContext(applicationPublicId, actor, {
      database: tx,
      now,
    });
    if (!context) throw notFound("Assessment was not found.");

    assertIndividualRuntime(context.assessment.scope);
    assertApplicationCanStartAssessment(context);

    if (!context.attempt) {
      await insertAssessmentAttempt(tx, {
        applicationId: context.application.id,
        applicationMemberId: context.member.memberId,
        assessmentId: context.assessment.id,
        startedAt: now,
        status: "IN_PROGRESS",
      });
    } else if (context.attempt.status === "NOT_STARTED") {
      const updated = await updateAssessmentAttemptStatus(tx, {
        attemptId: context.attempt.id,
        expectedStatuses: ["NOT_STARTED"],
        nextStatus: "IN_PROGRESS",
        now,
      });
      if (!updated) throw invalidTransition("Attempt could not be started.");
    } else if (context.attempt.status !== "IN_PROGRESS") {
      throw invalidTransition("Assessment attempt is not editable.");
    }

    const started = await loadAssessmentContext(applicationPublicId, actor, {
      database: tx,
      now,
    });
    if (!started || !started.attempt) {
      throw new AssessmentError("CONFLICT", "Started attempt could not be read.");
    }

    return {
      application: { publicId: started.application.publicId },
      assessment: {
        aiPolicy: started.assessment.aiPolicy,
        instructions: started.assessment.instructions,
        scope: started.assessment.scope,
        timeLimitMinutes: started.assessment.timeLimitMinutes,
        title: assessmentTitle(started.assessment),
      },
      challenge: {
        slug: started.application.challenge.slug,
        title: started.application.challenge.title,
      },
      responses: toResponseMap(started.responses, started.assessment),
      sections: started.assessment.sections.map(toStudentSection),
      trackLabel: trackLabel(started.assessment),
    };
  });
}

export async function saveAssessmentResponse(
  applicationPublicId: string,
  questionKey: string,
  responseInput: AssessmentResponseInput,
  actor: ApplicationActorContext,
  options: AssessmentServiceOptions = {}
): Promise<void> {
  const database = options.database ?? db;
  const now = options.now ?? new Date();

  await withAssessmentTransaction(database, async (tx) => {
    const context = await loadAssessmentContext(applicationPublicId, actor, {
      database: tx,
      now,
    });
    if (!context) throw notFound("Assessment was not found.");
    if (!context.attempt) throw invalidTransition("Assessment has not started.");

    await saveResponseForContext(tx, context, questionKey, responseInput, now);
  });
}

export async function submitAssessmentAttempt(
  applicationPublicId: string,
  actor: ApplicationActorContext,
  options: AssessmentServiceOptions & {
    responses?: Record<string, AssessmentResponseInput>;
  } = {}
): Promise<void> {
  const database = options.database ?? db;
  const now = options.now ?? new Date();

  await withAssessmentTransaction(database, async (tx) => {
    const context = await loadAssessmentContext(applicationPublicId, actor, {
      database: tx,
      now,
    });
    if (!context) throw notFound("Assessment was not found.");
    if (!context.attempt) throw invalidTransition("Assessment has not started.");

    if (options.responses) {
      for (const [questionKey, response] of Object.entries(options.responses)) {
        await saveResponseForContext(tx, context, questionKey, response, now);
      }
    }

    if (context.attempt.status !== "IN_PROGRESS") {
      throw invalidTransition("Only in-progress attempts can be submitted.");
    }

    const submitted = await updateAssessmentAttemptStatus(tx, {
      attemptId: context.attempt.id,
      expectedStatuses: ["IN_PROGRESS"],
      nextStatus: "SUBMITTED",
      now,
    });

    if (!submitted) {
      throw invalidTransition("Assessment attempt could not be submitted.");
    }
  });
}

async function loadAssessmentContext(
  applicationPublicId: string,
  actor: ApplicationActorContext,
  options: AssessmentServiceOptions
): Promise<AssessmentContext | null> {
  assertStudentActor(actor);

  const database = options.database ?? db;
  const application = await getApplicationByPublicId(
    database,
    applicationPublicId.trim()
  );
  if (!application) return null;

  const member = application.members.find(
    (candidate) => candidate.student.userId === actor.userId
  );
  if (!member) {
    throw new AssessmentError(
      "FORBIDDEN",
      "Actor is not an application member."
    );
  }
  if (member.status !== "ACCEPTED") {
    throw new AssessmentError(
      "FORBIDDEN",
      "Only accepted application members can access assessments."
    );
  }

  const definitions = await listActiveAssessmentsForChallenge(
    database,
    application.challenge.id
  );
  if (definitions.length === 0) return null;
  if (definitions.length > 1) {
    throw new AssessmentError(
      "CONFLICT",
      "Multiple active assessments exist for this challenge."
    );
  }

  const assessment = await getAssessmentDefinitionWithQuestions(
    database,
    definitions[0].id
  );
  if (!assessment) return null;

  assertAssessmentApplicationInvariant(assessment, application);

  const attempt = await getAssessmentAttemptForOwner(database, {
    applicationId: application.id,
    applicationMemberId:
      assessment.scope === "INDIVIDUAL" ? member.memberId : null,
    assessmentId: assessment.id,
    scope: assessment.scope,
  });

  assertAttemptOwnershipInvariant(assessment.scope, attempt, application, member);

  const responses = attempt
    ? await listAssessmentResponsesForAttempt(database, attempt.id)
    : [];
  const score = attempt
    ? await getLatestAssessmentScoreForAttempt(database, attempt.id)
    : null;

  return {
    application,
    assessment,
    attempt,
    member,
    responses,
    score,
  };
}

async function saveResponseForContext(
  database: AssessmentMutationDatabase,
  context: AssessmentContext,
  questionKey: string,
  responseInput: AssessmentResponseInput,
  now: Date
) {
  assertIndividualRuntime(context.assessment.scope);
  assertEditableAttempt(context.attempt);

  const questionId = decodeQuestionKey(questionKey);
  const question = await getAssessmentQuestionForWrite(database, questionId);
  if (!question) throw notFound("Assessment question was not found.");
  if (question.assessmentId !== context.assessment.id) {
    throw new AssessmentError(
      "VALIDATION_ERROR",
      "Question does not belong to this assessment."
    );
  }

  const values = validateResponseShape(question, responseInput, now);
  const existing = await selectAssessmentResponsesForQuestion(database, {
    attemptId: context.attempt.id,
    questionId: question.id,
  });

  if (existing.length > 1) {
    throw new AssessmentError(
      "CONFLICT",
      "Duplicate responses exist for this attempt/question."
    );
  }

  if (existing[0]) {
    await updateAssessmentResponse(database, {
      responseId: existing[0].id,
      values,
    });
    return;
  }

  await insertAssessmentResponse(database, {
    attemptId: context.attempt.id,
    questionId: question.id,
    values,
  });
}

function assertStudentActor(actor: ApplicationActorContext) {
  if (!actor.isStudent) {
    throw new AssessmentError(
      "FORBIDDEN",
      "Only student actors can access student assessment runtime."
    );
  }
}

function assertIndividualRuntime(scope: AssessmentScope) {
  if (scope !== "INDIVIDUAL") {
    throw new AssessmentError(
      "VALIDATION_ERROR",
      "TEAM assessment runtime is deferred for Phase 5.2."
    );
  }
}

function assertApplicationCanStartAssessment(context: AssessmentContext) {
  if (context.application.status !== "ASSESSMENT" && !context.attempt) {
    throw invalidTransition("Application is not currently in assessment.");
  }
}

function assertAssessmentApplicationInvariant(
  assessment: AssessmentDefinitionWithQuestionsRead,
  application: ApplicationDetailRead
) {
  if (assessment.challengeId !== application.challenge.id) {
    throw new AssessmentError(
      "VALIDATION_ERROR",
      "Assessment and application belong to different challenges."
    );
  }
}

function assertAttemptOwnershipInvariant(
  scope: AssessmentScope,
  attempt: AssessmentAttemptRead | null,
  application: ApplicationDetailRead,
  member: ApplicationMemberRead
) {
  if (!attempt) return;
  if (attempt.applicationId !== application.id) {
    throw new AssessmentError(
      "VALIDATION_ERROR",
      "Attempt belongs to a different application."
    );
  }
  if (scope === "INDIVIDUAL" && attempt.applicationMemberId !== member.memberId) {
    throw new AssessmentError(
      "FORBIDDEN",
      "Individual attempt does not belong to this member."
    );
  }
  if (scope === "TEAM" && attempt.applicationMemberId !== null) {
    throw new AssessmentError(
      "VALIDATION_ERROR",
      "TEAM attempts must not have an application member owner."
    );
  }
}

function assertEditableAttempt(
  attempt: AssessmentAttemptRead | null
): asserts attempt is AssessmentAttemptRead {
  if (!attempt) throw invalidTransition("Assessment has not started.");
  if (!EDITABLE_ATTEMPT_STATUSES.includes(attempt.status)) {
    throw invalidTransition("Assessment attempt is no longer editable.");
  }
}

function validateResponseShape(
  question: {
    config: unknown;
    questionType: AssessmentQuestionType;
  },
  input: AssessmentResponseInput,
  now: Date
) {
  if (question.questionType === "MULTIPLE_CHOICE") {
    if (input.kind !== "MULTIPLE_CHOICE") {
      throw new AssessmentError(
        "VALIDATION_ERROR",
        "Multiple-choice questions require a selected option."
      );
    }
    const options = safeOptions(question.config);
    if (
      !Number.isInteger(input.selectedOptionIndex) ||
      input.selectedOptionIndex < 0 ||
      input.selectedOptionIndex >= options.length
    ) {
      throw new AssessmentError(
        "VALIDATION_ERROR",
        "Selected option is not valid for this question."
      );
    }
    return {
      response: options[input.selectedOptionIndex],
      responseData: {
        selectedOptionIndex: input.selectedOptionIndex,
      },
      submittedAt: now,
    };
  }

  if (question.questionType === "CODING") {
    if (input.kind !== "CODING") {
      throw new AssessmentError(
        "VALIDATION_ERROR",
        "Coding questions require a code response."
      );
    }
    const code = input.code.trimEnd();
    if (code.length === 0) {
      throw new AssessmentError("VALIDATION_ERROR", "Code response is empty.");
    }
    if (code.length > 20_000) {
      throw new AssessmentError(
        "VALIDATION_ERROR",
        "Code response is too long."
      );
    }
    return {
      response: code,
      responseData: {
        language: safeCodingConfig(question.config).language,
      },
      submittedAt: now,
    };
  }

  if (input.kind !== "TEXT") {
    throw new AssessmentError(
      "VALIDATION_ERROR",
      "This question requires a text response."
    );
  }
  const response = input.response.trim();
  if (response.length === 0) {
    throw new AssessmentError("VALIDATION_ERROR", "Response is empty.");
  }
  return {
    response,
    responseData: null,
    submittedAt: now,
  };
}

function toPreflight(context: AssessmentContext): AssessmentPreflight {
  return {
    application: {
      publicId: context.application.publicId,
      status: context.application.status,
      teamName: context.application.teamName,
    },
    assessment: {
      aiPolicy: context.assessment.aiPolicy,
      instructions: context.assessment.instructions,
      scope: context.assessment.scope,
      timeLimitMinutes: context.assessment.timeLimitMinutes,
      title: assessmentTitle(context.assessment),
    },
    challenge: {
      slug: context.application.challenge.slug,
      title: context.application.challenge.title,
    },
    currentAttempt: context.attempt
      ? {
          startedAt: context.attempt.startedAt,
          status: context.attempt.status,
          submittedAt: context.attempt.submittedAt,
        }
      : null,
    itemCountLabel: itemCountLabel(context.assessment),
    state: preflightState(context),
    trackLabel: trackLabel(context.assessment),
  };
}

function preflightState(context: AssessmentContext): AssessmentPreflight["state"] {
  if (!context.assessment) return "NO_ASSESSMENT";
  if (!context.attempt) {
    return context.application.status === "ASSESSMENT" ? "AVAILABLE" : "NOT_OPEN";
  }
  if (context.attempt.status === "IN_PROGRESS") return "IN_PROGRESS";
  if (context.attempt.status === "SUBMITTED") return "SUBMITTED";
  if (context.attempt.status === "REVIEWED") return "REVIEWED";
  return "AVAILABLE";
}

function toStudentSection(
  section: AssessmentSectionWithQuestionsRead
): AssessmentStudentSection {
  return {
    instructions: section.instructions,
    questions: section.questions.map(toStudentQuestion),
    sequence: section.sequence,
    timeLimitMinutes: section.timeLimitMinutes,
    title: section.title,
  };
}

function toStudentQuestion(
  question: AssessmentQuestionRead
): AssessmentStudentQuestion {
  const coding =
    question.questionType === "CODING"
      ? safeCodingConfig(question.config)
      : null;

  return {
    coding,
    maxScore: question.maxScore,
    options:
      question.questionType === "MULTIPLE_CHOICE"
        ? safeOptions(question.config)
        : [],
    prompt: question.prompt,
    questionKey: encodeQuestionKey(question.id),
    questionType: question.questionType,
    sequence: question.sequence,
  };
}

function toResponseMap(
  responses: AssessmentResponseRead[],
  assessment: AssessmentDefinitionWithQuestionsRead
): Record<string, AssessmentResponseInput> {
  const questionById = new Map<bigint, AssessmentQuestionRead>();
  for (const section of assessment.sections) {
    for (const question of section.questions) {
      questionById.set(question.id, question);
    }
  }

  const result: Record<string, AssessmentResponseInput> = {};
  for (const response of responses) {
    const question = questionById.get(response.questionId);
    if (!question) continue;
    const key = encodeQuestionKey(response.questionId);
    if (question.questionType === "MULTIPLE_CHOICE") {
      const selectedOptionIndex = selectedOptionIndexFromData(response.responseData);
      if (selectedOptionIndex !== null) {
        result[key] = { kind: "MULTIPLE_CHOICE", selectedOptionIndex };
      }
    } else if (question.questionType === "CODING") {
      result[key] = { kind: "CODING", code: response.response ?? "" };
    } else {
      result[key] = { kind: "TEXT", response: response.response ?? "" };
    }
  }
  return result;
}

function toReviewedResult(score: AssessmentScoreRead): NonNullable<AssessmentResult["result"]> {
  const rubric = asRecord(score.rubricScores);
  const sections = Array.isArray(rubric.sections)
    ? rubric.sections.flatMap((item) => {
        const section = asRecord(item);
        const name = stringValue(section.name);
        const band = stringValue(section.band);
        if (!name || !band) return [];
        return [{ band, name, note: stringValue(section.note) }];
      })
    : [];

  return {
    comments: score.comments,
    minutesTaken: numberValue(rubric.sourceMinutesTaken),
    overallBand: stringValue(rubric.sourceOverallBand),
    overallScore: score.overallScore,
    passed: booleanValue(rubric.sourcePassed),
    sections,
    track: stringValue(rubric.sourceTrack) ?? "Assessment",
  };
}

function assessmentTitle(assessment: AssessmentDefinitionWithQuestionsRead) {
  return assessment.title ?? "Assessment";
}

function trackLabel(assessment: AssessmentDefinitionWithQuestionsRead) {
  return assessmentTrackLabel(
    assessment.sections.flatMap((section) =>
      section.questions.map((question) => question.questionType)
    )
  );
}

function itemCountLabel(assessment: AssessmentDefinitionWithQuestionsRead) {
  const questionCount = assessment.sections.reduce(
    (total, section) => total + section.questions.length,
    0
  );
  const codingCount = assessment.sections.reduce(
    (total, section) =>
      total +
      section.questions.filter((question) => question.questionType === "CODING")
        .length,
    0
  );
  if (codingCount === questionCount) {
    return `${questionCount} ${questionCount === 1 ? "problem" : "problems"}`;
  }
  return `${questionCount} ${questionCount === 1 ? "question" : "questions"} across ${assessment.sections.length} ${assessment.sections.length === 1 ? "section" : "sections"}`;
}

function safeOptions(config: unknown): string[] {
  const options = asRecord(config).options;
  if (!Array.isArray(options)) return [];
  return options.filter((option): option is string => typeof option === "string");
}

function safeCodingConfig(config: unknown): NonNullable<AssessmentStudentQuestion["coding"]> {
  const record = asRecord(config);
  const sampleTests = Array.isArray(record.sampleTests)
    ? record.sampleTests.flatMap((item) => {
        const test = asRecord(item);
        const input = stringValue(test.input);
        const expected = stringValue(test.expected);
        if (!input || !expected) return [];
        return [{ expected, input }];
      })
    : [];

  return {
    language: stringValue(record.language),
    sampleTests,
    starterCode: stringValue(record.starterCode) ?? "",
    statement: Array.isArray(record.statement)
      ? record.statement.filter(
          (paragraph): paragraph is string => typeof paragraph === "string"
        )
      : [],
    title: stringValue(record.title),
  };
}

export function encodeQuestionKey(questionId: bigint) {
  return `q_${questionId.toString()}`;
}

function decodeQuestionKey(questionKey: string) {
  if (!questionKey.startsWith("q_")) {
    throw new AssessmentError("VALIDATION_ERROR", "Invalid question key.");
  }
  try {
    return BigInt(questionKey.slice(2));
  } catch {
    throw new AssessmentError("VALIDATION_ERROR", "Invalid question key.");
  }
}

function selectedOptionIndexFromData(value: unknown) {
  const selected = asRecord(value).selectedOptionIndex;
  return typeof selected === "number" && Number.isInteger(selected)
    ? selected
    : null;
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
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function notFound(message: string) {
  return new AssessmentError("NOT_FOUND", message);
}

function invalidTransition(message: string) {
  return new AssessmentError("INVALID_TRANSITION", message);
}

async function withAssessmentTransaction<T>(
  database: AssessmentMutationDatabase,
  callback: (tx: AssessmentMutationDatabase) => Promise<T>
) {
  if (!isTransaction(database)) {
    return database.transaction((tx) => callback(tx));
  }

  return callback(database);
}

function isTransaction(
  database: AssessmentMutationDatabase
): database is Parameters<Parameters<typeof db.transaction>[0]>[0] {
  return "rollback" in database && typeof database.rollback === "function";
}
