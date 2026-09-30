import "dotenv/config";

import { and, count, eq, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  applicationMembers,
  applications,
  assessmentAttempts,
  assessmentQuestions,
  assessmentResponses,
  assessmentScores,
  assessments,
  assessmentSections,
  challenges,
  agreements,
  matchResults,
  offers,
  projects,
  selections,
} from "@/db/schema";
import {
  AssessmentError,
  encodeQuestionKey,
  getAssessmentPreflight,
  getAssessmentResult,
  getAssessmentTakingSession,
  getDevelopmentAssessmentActor,
  saveAssessmentResponse,
  startAssessmentAttempt,
  submitAssessmentAttempt,
} from "@/services/assessment.service";

const APP_TRIAGE = "44444444-4444-4444-8444-000000000001";
const APP_CHURN = "44444444-4444-4444-8444-000000000003";
const DISPOSABLE_APP = "55555555-5555-5555-8555-000000000052";
const DISPOSABLE_CODING_APP = "55555555-5555-5555-8555-000000000053";
const DISPOSABLE_TEXT_APP = "55555555-5555-5555-8555-000000000054";
const ROLLBACK_SENTINEL = Symbol("rollback assessment runtime verification");
type RuntimeDatabase = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function main() {
  const before = await snapshot();

  assertCount(before.counts.assessments, 2, "assessments");
  assertCount(before.counts.assessmentSections, 5, "assessment sections");
  assertCount(before.counts.assessmentQuestions, 12, "assessment questions");
  assertCount(before.counts.assessmentAttempts, 2, "assessment attempts");
  assertCount(before.counts.assessmentResponses, 0, "assessment responses");
  assertCount(before.counts.assessmentScores, 2, "assessment scores");
  assertDistribution(before.applicationStatusDistribution);

  try {
    await db.transaction(async (tx) => {
      const jordan = await getDevelopmentAssessmentActor("JORDAN_STUDENT_DEMO", {
        database: tx,
      });
      const bao = await getDevelopmentAssessmentActor("BAO_STUDENT_DEMO", {
        database: tx,
      });
      const hoang = await getDevelopmentAssessmentActor("HOANG_STUDENT_DEMO", {
        database: tx,
      });

      const triageResult = await getAssessmentResult(APP_TRIAGE, jordan, {
        database: tx,
      });
      assert(triageResult?.attempt?.status === "REVIEWED", "app-triage reviewed attempt missing");
      assert(triageResult.result?.overallBand === "Below threshold", "app-triage band mismatch");
      assert(triageResult.result.overallScore === null, "app-triage score should be null");
      assert(triageResult.application.status === "REJECTED", "app-triage application status mismatch");

      const churnResult = await getAssessmentResult(APP_CHURN, jordan, {
        database: tx,
      });
      assert(churnResult?.attempt?.status === "REVIEWED", "app-churn reviewed attempt missing");
      assert(churnResult.result?.overallBand === "Strong", "app-churn band mismatch");
      assert(churnResult.result.overallScore === null, "app-churn score should be null");
      assert(churnResult.application.status === "SELECTION_PENDING", "app-churn application status mismatch");

      await createDisposableAssessmentApplication(
        tx,
        bao.userId,
        DISPOSABLE_APP,
        "triage-protocol-review"
      );

      await expectAssessmentError(
        "FORBIDDEN",
        () => getAssessmentPreflight(DISPOSABLE_APP, hoang, { database: tx }),
        "wrong member access should be forbidden"
      );

      // Route-boundary regression: the /assessment/[applicationId]/result page
      // (and its sibling /assessment/[applicationId] preflight page) both map
      // this same AssessmentError code to notFound(); this proves the service
      // layer still raises the FORBIDDEN code they key off of. See
      // context/post-phase-6-e2e-audit-report.md for the Playwright coverage
      // of the actual route boundary (result page 404 vs. 500).
      await expectAssessmentError(
        "FORBIDDEN",
        () => getAssessmentResult(DISPOSABLE_APP, hoang, { database: tx }),
        "wrong member access to assessment result should be forbidden"
      );

      // Route-boundary regression: /assessment/[applicationId]/take calls both
      // getAssessmentTakingSession and getAssessmentResult; this proves the
      // taking-session call also raises the same FORBIDDEN code the route
      // maps to notFound(). See context/post-phase-6-e2e-audit-report.md for
      // the Playwright coverage of the actual take-route boundary.
      await expectAssessmentError(
        "FORBIDDEN",
        () => getAssessmentTakingSession(DISPOSABLE_APP, hoang, { database: tx }),
        "wrong member access to assessment taking session should be forbidden"
      );

      const triageAssessmentId = await assessmentIdForChallenge(
        tx,
        "triage-protocol-review"
      );
      await tx
        .update(assessments)
        .set({ timeLimitMinutes: null })
        .where(eq(assessments.id, triageAssessmentId));

      const unlimitedPreflight = await getAssessmentPreflight(
        DISPOSABLE_APP,
        bao,
        { database: tx }
      );
      assert(
        unlimitedPreflight?.assessment.timeLimitMinutes === null,
        "nullable assessment timer should remain unlimited"
      );

      await tx.execute(sql`savepoint assessment_empty_definition`);
      await tx.execute(sql`
        delete from assessment_questions
        where section_id in (
          select id from assessment_sections
          where assessment_id = ${triageAssessmentId}
        )
      `);
      const emptyPreflight = await getAssessmentPreflight(DISPOSABLE_APP, bao, {
        database: tx,
      });
      assert(
        emptyPreflight?.state === "UNAVAILABLE",
        "empty assessment should be unavailable before start"
      );
      await expectAssessmentError(
        "VALIDATION_ERROR",
        () =>
          startAssessmentAttempt(DISPOSABLE_APP, bao, {
            database: tx,
            now: demoNow(),
          }),
        "empty assessment should fail before creating an attempt"
      );
      assertCount(
        await attemptCountForApplication(tx, DISPOSABLE_APP),
        0,
        "empty assessment attempt count"
      );
      await tx.execute(sql`rollback to savepoint assessment_empty_definition`);

      const started = await startAssessmentAttempt(DISPOSABLE_APP, bao, {
        database: tx,
        now: demoNow(),
      });
      assert(started.sections.length === 4, "disposable cognitive assessment sections missing");
      assert(started.assessment.timeLimitMinutes === null, "unlimited timer changed after start");
      assert(!started.assessment.title.includes("DEMO"), "student title exposed DEMO wording");
      assert(!JSON.stringify(started).includes("correctIndex"), "student model leaked correctIndex");

      const secondStart = await startAssessmentAttempt(DISPOSABLE_APP, bao, {
        database: tx,
        now: demoNow(),
      });
      assert(secondStart.sections.length === started.sections.length, "start should be idempotent while in progress");

      const firstQuestion = started.sections[0].questions[0];
      await saveAssessmentResponse(
        DISPOSABLE_APP,
        firstQuestion.questionKey,
        { kind: "MULTIPLE_CHOICE", selectedOptionIndex: 0 },
        bao,
        { database: tx, now: demoNow() }
      );
      await saveAssessmentResponse(
        DISPOSABLE_APP,
        firstQuestion.questionKey,
        { kind: "MULTIPLE_CHOICE", selectedOptionIndex: 1 },
        bao,
        { database: tx, now: demoNow() }
      );

      const attemptId = await disposableAttemptId(tx);
      assertCount(
        await responseCount(tx, attemptId, decodeQuestionKeyForScript(firstQuestion.questionKey)),
        1,
        "response upsert count"
      );

      await expectAssessmentError(
        "VALIDATION_ERROR",
        () =>
          saveAssessmentResponse(
            DISPOSABLE_APP,
            firstQuestion.questionKey,
            { kind: "MULTIPLE_CHOICE", selectedOptionIndex: 99 },
            bao,
            { database: tx, now: demoNow() }
          ),
        "invalid MCQ option should fail"
      );

      const merchantQuestionKey = await firstQuestionKeyForChallenge(
        tx,
        "merchant-churn-model"
      );
      await expectAssessmentError(
        "VALIDATION_ERROR",
        () =>
          saveAssessmentResponse(
            DISPOSABLE_APP,
            merchantQuestionKey,
            { kind: "CODING", code: "print('wrong assessment')" },
            bao,
            { database: tx, now: demoNow() }
          ),
        "cross-assessment response should fail"
      );

      await submitAssessmentAttempt(DISPOSABLE_APP, bao, {
        database: tx,
        now: demoNow(),
        responses: {
          [firstQuestion.questionKey]: {
            kind: "MULTIPLE_CHOICE",
            selectedOptionIndex: 1,
          },
        },
      });

      const pending = await getAssessmentResult(DISPOSABLE_APP, bao, {
        database: tx,
      });
      assert(pending?.attempt?.status === "SUBMITTED", "submitted attempt status mismatch");
      assert(pending.result === null, "submitted attempt should not fabricate a score");

      await expectAssessmentError(
        "INVALID_TRANSITION",
        () =>
          submitAssessmentAttempt(DISPOSABLE_APP, bao, {
            database: tx,
            now: demoNow(),
          }),
        "repeated submit should fail"
      );

      await expectAssessmentError(
        "INVALID_TRANSITION",
        () =>
          saveAssessmentResponse(
            DISPOSABLE_APP,
            firstQuestion.questionKey,
            { kind: "MULTIPLE_CHOICE", selectedOptionIndex: 2 },
            bao,
            { database: tx, now: demoNow() }
          ),
        "submitted attempt should not be editable"
      );

      const triageQuestionKey = await firstQuestionKeyForChallenge(
        tx,
        "triage-protocol-review"
      );
      await expectAssessmentError(
        "INVALID_TRANSITION",
        () =>
          saveAssessmentResponse(
            APP_TRIAGE,
            triageQuestionKey,
            { kind: "MULTIPLE_CHOICE", selectedOptionIndex: 0 },
            jordan,
            { database: tx, now: demoNow() }
          ),
        "reviewed attempt should not be editable"
      );

      await createDisposableAssessmentApplication(
        tx,
        bao.userId,
        DISPOSABLE_CODING_APP,
        "merchant-churn-model"
      );
      const codingSession = await startAssessmentAttempt(
        DISPOSABLE_CODING_APP,
        bao,
        { database: tx, now: demoNow() }
      );
      const codingQuestions = codingSession.sections.flatMap(
        (section) => section.questions
      );
      assert(codingQuestions.length === 2, "coding questions missing");
      await saveAssessmentResponse(
        DISPOSABLE_CODING_APP,
        codingQuestions[0].questionKey,
        { kind: "CODING", code: "def answer():\n    return 1" },
        bao,
        { database: tx, now: demoNow() }
      );
      const afterCodingDeadline = new Date(demoNow().getTime() + 61 * 60_000);
      await expectAssessmentError(
        "INVALID_TRANSITION",
        () =>
          saveAssessmentResponse(
            DISPOSABLE_CODING_APP,
            codingQuestions[1].questionKey,
            { kind: "CODING", code: "late response" },
            bao,
            { database: tx, now: afterCodingDeadline }
          ),
        "response save after the server deadline should fail"
      );
      await submitAssessmentAttempt(DISPOSABLE_CODING_APP, bao, {
        database: tx,
        now: afterCodingDeadline,
        responses: {
          [codingQuestions[1].questionKey]: {
            kind: "CODING",
            code: "late response",
          },
        },
      });
      assert(
        (await getAssessmentResult(DISPOSABLE_CODING_APP, bao, { database: tx }))
          ?.attempt?.status === "SUBMITTED",
        "unanswered coding item should not poison submission"
      );
      assertCount(
        await responseCount(
          tx,
          await disposableAttemptId(tx, DISPOSABLE_CODING_APP),
          decodeQuestionKeyForScript(codingQuestions[1].questionKey)
        ),
        0,
        "late response count"
      );

      await createDisposableAssessmentApplication(
        tx,
        hoang.userId,
        DISPOSABLE_TEXT_APP,
        "merchant-churn-model"
      );
      const secondCodingQuestionId = decodeQuestionKeyForScript(
        codingQuestions[1].questionKey
      );
      await tx
        .update(assessmentQuestions)
        .set({ questionType: "REASONING" })
        .where(eq(assessmentQuestions.id, secondCodingQuestionId));
      const textSession = await startAssessmentAttempt(
        DISPOSABLE_TEXT_APP,
        hoang,
        { database: tx, now: demoNow() }
      );
      const textQuestion = textSession.sections
        .flatMap((section) => section.questions)
        .find((question) => question.questionType === "REASONING");
      assert(textQuestion, "manual text question missing");
      await saveAssessmentResponse(
        DISPOSABLE_TEXT_APP,
        textQuestion.questionKey,
        { kind: "TEXT", response: "Structured manual-review response." },
        hoang,
        { database: tx, now: demoNow() }
      );
      await submitAssessmentAttempt(DISPOSABLE_TEXT_APP, hoang, {
        database: tx,
        now: demoNow(),
      });
      assert(
        (await getAssessmentResult(DISPOSABLE_TEXT_APP, hoang, { database: tx }))
          ?.attempt?.status === "SUBMITTED",
        "text response submission failed"
      );

      const inside = await snapshot(tx);
      assertCount(inside.counts.assessmentScores, 2, "assessment scores during disposable tests");
      assertCount(inside.counts.matchResults, 0, "match results during disposable tests");

      throw ROLLBACK_SENTINEL;
    });
  } catch (error) {
    if (error !== ROLLBACK_SENTINEL) throw error;
  }

  const after = await snapshot();
  assertDeepEqual(after, before, "canonical counts changed after rollback");

  console.log("Phase 6.6.5 assessment submission safety verification passed.");
  console.log(JSON.stringify(after, null, 2));
}

async function createDisposableAssessmentApplication(
  tx: RuntimeDatabase,
  studentId: bigint,
  publicId: string,
  challengeSlug: string
) {
  const [challenge] = await tx
    .select({ id: challenges.id })
    .from(challenges)
    .where(eq(challenges.slug, challengeSlug))
    .limit(1);
  if (!challenge) throw new Error(`Missing ${challengeSlug} challenge.`);

  const [application] = await tx
    .insert(applications)
    .values({
      challengeId: challenge.id,
      motivation: "Disposable Phase 5.2 assessment verification.",
      publicId,
      status: "ASSESSMENT",
      submittedAt: demoNow(),
      submittedBy: studentId,
      teamName: "Disposable Assessment Runtime",
    })
    .returning({ id: applications.id });

  await tx.insert(applicationMembers).values({
    applicationId: application.id,
    memberRole: "LEADER",
    respondedAt: demoNow(),
    status: "ACCEPTED",
    studentId,
  });
}

async function assessmentIdForChallenge(
  tx: RuntimeDatabase,
  challengeSlug: string
) {
  const [row] = await tx
    .select({ id: assessments.id })
    .from(assessments)
    .innerJoin(challenges, eq(challenges.id, assessments.challengeId))
    .where(eq(challenges.slug, challengeSlug))
    .limit(1);
  if (!row) throw new Error(`Assessment missing for ${challengeSlug}.`);
  return row.id;
}

async function attemptCountForApplication(
  tx: RuntimeDatabase,
  applicationPublicId: string
) {
  const [row] = await tx
    .select({ total: count() })
    .from(assessmentAttempts)
    .innerJoin(applications, eq(applications.id, assessmentAttempts.applicationId))
    .where(eq(applications.publicId, applicationPublicId));
  return row?.total ?? 0;
}

async function disposableAttemptId(
  tx: RuntimeDatabase,
  applicationPublicId = DISPOSABLE_APP
) {
  const [row] = await tx
    .select({ id: assessmentAttempts.id })
    .from(assessmentAttempts)
    .innerJoin(applications, eq(applications.id, assessmentAttempts.applicationId))
    .where(eq(applications.publicId, applicationPublicId))
    .limit(1);
  if (!row) throw new Error("Disposable attempt was not found.");
  return row.id;
}

async function responseCount(
  tx: RuntimeDatabase,
  attemptId: bigint,
  questionId: bigint
) {
  const [row] = await tx
    .select({ total: count() })
    .from(assessmentResponses)
    .where(
      and(
        eq(assessmentResponses.attemptId, attemptId),
        eq(assessmentResponses.questionId, questionId)
      )
    );
  return row?.total ?? 0;
}

async function firstQuestionKeyForChallenge(
  tx: RuntimeDatabase,
  challengeSlug: string
) {
  const [row] = await tx
    .select({ id: assessmentQuestions.id })
    .from(assessmentQuestions)
    .innerJoin(
      assessmentSections,
      eq(assessmentSections.id, assessmentQuestions.sectionId)
    )
    .innerJoin(assessments, eq(assessments.id, assessmentSections.assessmentId))
    .innerJoin(challenges, eq(challenges.id, assessments.challengeId))
    .where(eq(challenges.slug, challengeSlug))
    .limit(1);

  if (!row) throw new Error(`No question found for ${challengeSlug}.`);
  return encodeQuestionKey(row.id);
}

async function snapshot(database: RuntimeDatabase = db) {
  const applicationsTotal = await countRows(database, applications);
  const applicationMembersTotal = await countRows(database, applicationMembers);
  const assessmentsTotal = await countRows(database, assessments);
  const assessmentSectionsTotal = await countRows(database, assessmentSections);
  const assessmentQuestionsTotal = await countRows(database, assessmentQuestions);
  const assessmentAttemptsTotal = await countRows(database, assessmentAttempts);
  const assessmentResponsesTotal = await countRows(database, assessmentResponses);
  const assessmentScoresTotal = await countRows(database, assessmentScores);
  const selectionsTotal = await countRows(database, selections);
  const offersTotal = await countRows(database, offers);
  const agreementsTotal = await countRows(database, agreements);
  const projectsTotal = await countRows(database, projects);
  const matchResultsTotal = await countRows(database, matchResults);
  const statusDistribution = await applicationStatusDistribution(database);

  return {
    applicationStatusDistribution: statusDistribution,
    counts: {
      agreements: agreementsTotal,
      applicationMembers: applicationMembersTotal,
      applications: applicationsTotal,
      assessmentAttempts: assessmentAttemptsTotal,
      assessmentQuestions: assessmentQuestionsTotal,
      assessmentResponses: assessmentResponsesTotal,
      assessmentScores: assessmentScoresTotal,
      assessmentSections: assessmentSectionsTotal,
      assessments: assessmentsTotal,
      matchResults: matchResultsTotal,
      offers: offersTotal,
      projects: projectsTotal,
      selections: selectionsTotal,
    },
  };
}

async function countRows(
  database: RuntimeDatabase,
  table: PgTable
) {
  const [row] = await database.select({ total: count() }).from(table);
  return row?.total ?? 0;
}

async function applicationStatusDistribution(
  database: RuntimeDatabase
) {
  return database
    .select({
      count: sql<number>`count(*)::int`,
      status: applications.status,
    })
    .from(applications)
    .groupBy(applications.status)
    .orderBy(applications.status);
}

async function expectAssessmentError(
  code: AssessmentError["code"],
  action: () => Promise<unknown>,
  label: string
) {
  try {
    await action();
  } catch (error) {
    if (error instanceof AssessmentError && error.code === code) return;
    throw error;
  }
  throw new Error(`${label}: expected ${code}.`);
}

function decodeQuestionKeyForScript(questionKey: string) {
  return BigInt(questionKey.replace(/^q_/, ""));
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function assertCount(actual: number, expected: number, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}.`);
  }
}

function assertDistribution(
  distribution: Array<{ count: number; status: string | null }>
) {
  const expected = {
    REJECTED: 1,
    SELECTED: 5,
    SELECTION_PENDING: 1,
    SUBMITTED: 1,
  };
  const actual = Object.fromEntries(
    distribution.map((row) => [row.status, row.count])
  );
  for (const [status, expectedCount] of Object.entries(expected)) {
    if (actual[status] !== expectedCount) {
      throw new Error(
        `application status distribution mismatch for ${status}: expected ${expectedCount}, received ${actual[status]}.`
      );
    }
  }
}

function assertDeepEqual(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}.\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

function demoNow() {
  return new Date("2026-08-20T08:00:00.000Z");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
