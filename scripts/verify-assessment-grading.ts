import "dotenv/config";

import { and, count, eq, like } from "drizzle-orm";

import { db } from "@/db";
import {
  applicationMembers,
  applications,
  assessmentAttempts,
  assessmentQuestions,
  assessmentResponses,
  assessmentScores,
  assessmentSections,
  assessments,
  challenges,
  offers,
  projects,
  selections,
  supervisionRequests,
  users,
} from "@/db/schema";
import {
  AssessmentError,
  getDevelopmentAssessmentActor,
  saveAssessmentResponse,
  startAssessmentAttempt,
  submitAssessmentAttempt,
} from "@/services/assessment.service";
import {
  AssessmentGradingError,
  getAssessmentGradingDetail,
  getAssessmentGradingQueue,
  gradeAssessmentAttempt,
} from "@/services/assessment-grading.service";

const QA_TITLE = "Phase 6.6.5 QA assessment";
const QA_TEAM_PREFIX = "QA 665";
const NOW = new Date("2026-09-28T08:00:00.000Z");

interface QaDefinition {
  assessmentId: bigint;
  challengeId: bigint;
  codingId: bigint;
  mcqId: bigint;
  reasoningId: bigint;
}

interface Fixture {
  applicationId: bigint;
  attemptId: bigint | null;
  attemptKey: string | null;
  publicId: string;
}

let sequence = 0;

async function main() {
  await cleanup();
  const baseline = await snapshot();

  try {
    const identities = await loadIdentities();
    const definition = await createDefinition(identities.caid);
    const baoActor = await getDevelopmentAssessmentActor("BAO_STUDENT_DEMO");

    const startFixture = await createFixture(definition, identities.bao, identities.pham, "NONE");
    const [firstStart, secondStart] = await Promise.all([
      startAssessmentAttempt(startFixture.publicId, baoActor, { now: NOW }),
      startAssessmentAttempt(startFixture.publicId, baoActor, { now: NOW }),
    ]);
    assert(firstStart.attempt.startedAt.getTime() === secondStart.attempt.startedAt.getTime(), "concurrent start returned different attempts");
    assertCount(await attemptCount(startFixture.applicationId), 1, "concurrent start attempt count");

    const questionKey = firstStart.sections[0].questions[0].questionKey;
    await Promise.all([
      saveAssessmentResponse(
        startFixture.publicId,
        questionKey,
        { kind: "MULTIPLE_CHOICE", selectedOptionIndex: 0 },
        baoActor,
        { now: NOW }
      ),
      saveAssessmentResponse(
        startFixture.publicId,
        questionKey,
        { kind: "MULTIPLE_CHOICE", selectedOptionIndex: 1 },
        baoActor,
        { now: NOW }
      ),
    ]);
    const startAttemptId = await requireAttemptId(startFixture.applicationId);
    assertCount(await responseCount(startAttemptId, definition.mcqId), 1, "concurrent response count");

    const race = await Promise.allSettled([
      saveAssessmentResponse(
        startFixture.publicId,
        questionKey,
        { kind: "MULTIPLE_CHOICE", selectedOptionIndex: 2 },
        baoActor,
        { now: NOW }
      ),
      submitAssessmentAttempt(startFixture.publicId, baoActor, { now: NOW }),
    ]);
    assert(race.some((result) => result.status === "fulfilled"), "save/submit race had no successful operation");
    assert((await attemptStatus(startAttemptId)) === "SUBMITTED", "save/submit race did not submit");
    await expectAssessmentError(
      "INVALID_TRANSITION",
      () =>
        saveAssessmentResponse(
          startFixture.publicId,
          questionKey,
          { kind: "MULTIPLE_CHOICE", selectedOptionIndex: 0 },
          baoActor,
          { now: NOW }
        ),
      "post-submit save"
    );
    assertCount(await responseCount(startAttemptId, definition.mcqId), 1, "post-submit response count");

    const authFixture = await createFixture(definition, identities.bao, identities.pham, "SUBMITTED", true);
    const queue = await getAssessmentGradingQueue(identities.pham);
    assert(queue.some((item) => item.attemptKey === authFixture.attemptKey), "authorized grading queue omitted submitted attempt");
    assert(!(await getAssessmentGradingQueue(identities.osei)).some((item) => item.attemptKey === authFixture.attemptKey), "unrelated faculty saw grading queue item");
    const gradingDetail = await getAssessmentGradingDetail(authFixture.attemptKey!, identities.pham);
    assert(gradingDetail?.questions[0].isCorrect === true, "MCQ correctness evidence mismatch");
    assert(
      gradingDetail.questions.some(
        (question) =>
          question.questionType === "CODING" &&
          question.response?.includes("def solve") &&
          question.isCorrect === null
      ),
      "manual coding response was not reviewable"
    );
    assert(
      gradingDetail.questions.some(
        (question) =>
          question.questionType === "REASONING" &&
          question.response === "Manual reasoning response." &&
          question.isCorrect === null
      ),
      "manual free response was not reviewable"
    );
    assert((await getAssessmentGradingDetail(authFixture.attemptKey!, identities.osei)) === null, "unrelated faculty opened grading detail");

    for (const unauthorized of [
      identities.osei,
      identities.bao,
      identities.partner,
      identities.caid,
      identities.elab,
    ]) {
      await expectGradingError(
        "FORBIDDEN",
        () => gradeAssessmentAttempt(authFixture.attemptKey!, { overallScore: 80 }, unauthorized),
        `unauthorized grader ${unauthorized.toString()}`
      );
    }

    const pass = await gradeAssessmentAttempt(
      authFixture.attemptKey!,
      { overallScore: 80, rubricNotes: "Manual and MCQ evidence reviewed." },
      identities.pham,
      { now: NOW }
    );
    assert(pass.outcome === "PASS" && pass.applicationStatus === "SELECTION_PENDING", "passing grade did not progress application");
    assert((await attemptStatus(authFixture.attemptId!)) === "REVIEWED", "passing attempt not reviewed");
    assertCount(await scoreCount(authFixture.attemptId!), 1, "passing score count");

    const retry = await gradeAssessmentAttempt(
      authFixture.attemptKey!,
      { overallScore: 80 },
      identities.pham,
      { now: NOW }
    );
    assert(retry.idempotent, "same grade retry was not idempotent");
    assertCount(await scoreCount(authFixture.attemptId!), 1, "retry score count");
    await expectGradingError(
      "CONFLICT",
      () => gradeAssessmentAttempt(authFixture.attemptKey!, { overallScore: 81 }, identities.pham),
      "different grade retry"
    );

    await assertOutcome(definition, identities, 40, "FAIL", "REJECTED");
    await assertOutcome(definition, identities, 60, "PASS", "SELECTION_PENDING");
    await assertOutcome(definition, identities, 0, "FAIL", "REJECTED");
    await assertOutcome(definition, identities, 100, "PASS", "SELECTION_PENDING");

    const invalidFixture = await createFixture(definition, identities.bao, identities.pham, "SUBMITTED");
    for (const invalid of [-0.01, 100.01, Number.NaN]) {
      await expectGradingError(
        "VALIDATION_ERROR",
        () => gradeAssessmentAttempt(invalidFixture.attemptKey!, { overallScore: invalid }, identities.pham),
        `invalid score ${String(invalid)}`
      );
    }
    assert((await attemptStatus(invalidFixture.attemptId!)) === "SUBMITTED", "invalid score changed attempt");
    assertCount(await scoreCount(invalidFixture.attemptId!), 0, "invalid score write count");

    const rollbackFixture = await createFixture(definition, identities.bao, identities.pham, "SUBMITTED");
    await expectError(
      () =>
        gradeAssessmentAttempt(
          rollbackFixture.attemptKey!,
          { overallScore: 75 },
          identities.pham,
          {
            injectFailureAfterScore: () => {
              throw new Error("injected grading failure");
            },
            now: NOW,
          }
        ),
      "injected grading failure"
    );
    assertCount(await scoreCount(rollbackFixture.attemptId!), 0, "rollback score count");
    assert((await attemptStatus(rollbackFixture.attemptId!)) === "SUBMITTED", "rollback attempt status");
    assert((await applicationStatus(rollbackFixture.applicationId)) === "ASSESSMENT", "rollback application status");

    const staleFixture = await createFixture(definition, identities.bao, identities.pham, "IN_PROGRESS");
    await expectGradingError(
      "INVALID_TRANSITION",
      () => gradeAssessmentAttempt(staleFixture.attemptKey!, { overallScore: 75 }, identities.pham),
      "stale attempt grade"
    );

    const concurrentFixture = await createFixture(definition, identities.bao, identities.pham, "SUBMITTED");
    const concurrent = await Promise.allSettled([
      gradeAssessmentAttempt(concurrentFixture.attemptKey!, { overallScore: 70 }, identities.pham, { now: NOW }),
      gradeAssessmentAttempt(concurrentFixture.attemptKey!, { overallScore: 30 }, identities.pham, { now: NOW }),
    ]);
    assert(concurrent.filter((result) => result.status === "fulfilled").length === 1, "concurrent grades did not choose one outcome");
    assert(concurrent.filter((result) => result.status === "rejected").length === 1, "concurrent grade conflict was not controlled");
    assertCount(await scoreCount(concurrentFixture.attemptId!), 1, "concurrent score count");
    assert((await attemptStatus(concurrentFixture.attemptId!)) === "REVIEWED", "concurrent attempt status");

    await db.update(assessments).set({ passingScore: null }).where(eq(assessments.id, definition.assessmentId));
    const missingThreshold = await createFixture(definition, identities.bao, identities.pham, "SUBMITTED");
    const unresolved = await gradeAssessmentAttempt(
      missingThreshold.attemptKey!,
      { overallScore: 99 },
      identities.pham,
      { now: NOW }
    );
    assert(unresolved.outcome === "THRESHOLD_MISSING", "missing threshold produced an outcome");
    assert((await applicationStatus(missingThreshold.applicationId)) === "ASSESSMENT", "missing threshold progressed application");
    assert((await attemptStatus(missingThreshold.attemptId!)) === "REVIEWED", "missing threshold attempt not reviewed");
    await db.update(assessments).set({ passingScore: 60 }).where(eq(assessments.id, definition.assessmentId));

    const leakage = await downstreamCounts();
    assertDeepEqual(leakage, baseline.downstream, "grading created downstream records");
  } finally {
    await cleanup();
  }

  const after = await snapshot();
  assertDeepEqual(after, baseline, "grading verifier did not restore baseline");
  console.log("Phase 6.6.5 assessment grading/concurrency verification passed.");
  console.log(JSON.stringify(after, null, 2));
}

async function assertOutcome(
  definition: QaDefinition,
  identities: Awaited<ReturnType<typeof loadIdentities>>,
  score: number,
  expectedOutcome: "FAIL" | "PASS",
  expectedStatus: "REJECTED" | "SELECTION_PENDING"
) {
  const fixture = await createFixture(definition, identities.bao, identities.pham, "SUBMITTED");
  const result = await gradeAssessmentAttempt(
    fixture.attemptKey!,
    { overallScore: score },
    identities.pham,
    { now: NOW }
  );
  assert(result.outcome === expectedOutcome, `score ${score} outcome mismatch`);
  assert((await applicationStatus(fixture.applicationId)) === expectedStatus, `score ${score} application status mismatch`);
}

async function createDefinition(createdBy: bigint): Promise<QaDefinition> {
  const [challenge] = await db
    .select({ id: challenges.id })
    .from(challenges)
    .where(eq(challenges.slug, "route-optimisation"))
    .limit(1);
  if (!challenge) throw new Error("Route optimisation challenge is missing.");

  const [assessment] = await db
    .insert(assessments)
    .values({
      challengeId: challenge.id,
      createdBy,
      passingScore: 60,
      scope: "INDIVIDUAL",
      status: "ACTIVE",
      timeLimitMinutes: 30,
      title: QA_TITLE,
    })
    .returning({ id: assessments.id });
  const [section] = await db
    .insert(assessmentSections)
    .values({ assessmentId: assessment.id, sequence: 1, title: "QA questions" })
    .returning({ id: assessmentSections.id });
  const questionRows = await db
    .insert(assessmentQuestions)
    .values([
      {
        config: { correctIndex: 1, options: ["Incorrect", "Correct", "Also incorrect"] },
        maxScore: 1,
        prompt: "Select the authoritative correct option.",
        questionType: "MULTIPLE_CHOICE" as const,
        sectionId: section.id,
        sequence: 1,
      },
      {
        config: { language: "Python", starterCode: "def solve():\n    pass" },
        maxScore: 10,
        prompt: "Provide a manually reviewed implementation.",
        questionType: "CODING" as const,
        sectionId: section.id,
        sequence: 2,
      },
      {
        maxScore: 5,
        prompt: "Explain the reasoning behind the approach.",
        questionType: "REASONING" as const,
        sectionId: section.id,
        sequence: 3,
      },
    ])
    .returning({ id: assessmentQuestions.id, sequence: assessmentQuestions.sequence });

  const question = (sequence: number) => {
    const row = questionRows.find((candidate) => candidate.sequence === sequence);
    if (!row) throw new Error(`Missing QA question ${sequence}.`);
    return row.id;
  };

  return {
    assessmentId: assessment.id,
    challengeId: challenge.id,
    codingId: question(2),
    mcqId: question(1),
    reasoningId: question(3),
  };
}

async function createFixture(
  definition: QaDefinition,
  studentId: bigint,
  facultyId: bigint,
  attemptStatus: "IN_PROGRESS" | "NONE" | "SUBMITTED",
  correctResponse = false
): Promise<Fixture> {
  sequence += 1;
  const publicId = `66500000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
  const [application] = await db
    .insert(applications)
    .values({
      challengeId: definition.challengeId,
      motivation: "Disposable Phase 6.6.5 grading verification.",
      publicId,
      status: "ASSESSMENT",
      submittedAt: NOW,
      submittedBy: studentId,
      teamName: `${QA_TEAM_PREFIX} ${sequence}`,
    })
    .returning({ id: applications.id });
  const [member] = await db
    .insert(applicationMembers)
    .values({
      applicationId: application.id,
      memberRole: "LEADER",
      respondedAt: NOW,
      status: "ACCEPTED",
      studentId,
    })
    .returning({ id: applicationMembers.id });
  await db.insert(supervisionRequests).values({
    applicationId: application.id,
    facultyId,
    requestedAt: NOW,
    requestedBy: studentId,
    respondedAt: NOW,
    respondBy: new Date(NOW.getTime() + 86_400_000),
    status: "ACCEPTED",
  });

  if (attemptStatus === "NONE") {
    return { applicationId: application.id, attemptId: null, attemptKey: null, publicId };
  }
  const [attempt] = await db
    .insert(assessmentAttempts)
    .values({
      applicationId: application.id,
      applicationMemberId: member.id,
      assessmentId: definition.assessmentId,
      startedAt: NOW,
      status: attemptStatus,
      submittedAt: attemptStatus === "SUBMITTED" ? NOW : null,
    })
    .returning({ id: assessmentAttempts.id });
  if (correctResponse) {
    await db.insert(assessmentResponses).values([
      {
        attemptId: attempt.id,
        questionId: definition.mcqId,
        response: "Correct",
        responseData: { selectedOptionIndex: 1 },
        submittedAt: NOW,
      },
      {
        attemptId: attempt.id,
        questionId: definition.codingId,
        response: "def solve():\n    return 42",
        responseData: { language: "Python" },
        submittedAt: NOW,
      },
      {
        attemptId: attempt.id,
        questionId: definition.reasoningId,
        response: "Manual reasoning response.",
        submittedAt: NOW,
      },
    ]);
  }
  return {
    applicationId: application.id,
    attemptId: attempt.id,
    attemptKey: `attempt_${attempt.id.toString()}`,
    publicId,
  };
}

async function loadIdentities() {
  const emails = {
    bao: "student.bao-tran.demo@example.test",
    caid: "caid.admin.dev@example.test",
    elab: "elab.admin.dev@example.test",
    osei: "faculty.diane-osei.demo@example.test",
    partner: "contact.bencang.demo@example.test",
    pham: "faculty.minh-pham.demo@example.test",
  };
  const rows = await db
    .select({ email: users.email, id: users.id })
    .from(users);
  return Object.fromEntries(
    Object.entries(emails).map(([key, email]) => {
      const user = rows.find((row) => row.email.toLowerCase() === email);
      if (!user) throw new Error(`Missing QA identity ${email}.`);
      return [key, user.id];
    })
  ) as Record<keyof typeof emails, bigint>;
}

async function cleanup() {
  await db.delete(applications).where(like(applications.teamName, `${QA_TEAM_PREFIX}%`));
  await db.delete(assessments).where(eq(assessments.title, QA_TITLE));
}

async function snapshot() {
  return {
    applications: await tableCount(applications),
    assessmentAttempts: await tableCount(assessmentAttempts),
    assessmentResponses: await tableCount(assessmentResponses),
    assessmentScores: await tableCount(assessmentScores),
    assessments: await tableCount(assessments),
    downstream: await downstreamCounts(),
  };
}

async function downstreamCounts() {
  return {
    offers: await tableCount(offers),
    projects: await tableCount(projects),
    selections: await tableCount(selections),
  };
}

async function tableCount(table: typeof applications | typeof assessmentAttempts | typeof assessmentResponses | typeof assessmentScores | typeof assessments | typeof offers | typeof projects | typeof selections) {
  const [row] = await db.select({ total: count() }).from(table);
  return row?.total ?? 0;
}

async function attemptCount(applicationId: bigint) {
  const [row] = await db
    .select({ total: count() })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.applicationId, applicationId));
  return row?.total ?? 0;
}

async function requireAttemptId(applicationId: bigint) {
  const [row] = await db
    .select({ id: assessmentAttempts.id })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.applicationId, applicationId))
    .limit(1);
  if (!row) throw new Error("QA attempt was not found.");
  return row.id;
}

async function responseCount(attemptId: bigint, questionId: bigint) {
  const [row] = await db
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

async function scoreCount(attemptId: bigint) {
  const [row] = await db
    .select({ total: count() })
    .from(assessmentScores)
    .where(eq(assessmentScores.attemptId, attemptId));
  return row?.total ?? 0;
}

async function attemptStatus(attemptId: bigint) {
  const [row] = await db
    .select({ status: assessmentAttempts.status })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.id, attemptId))
    .limit(1);
  return row?.status ?? null;
}

async function applicationStatus(applicationId: bigint) {
  const [row] = await db
    .select({ status: applications.status })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  return row?.status ?? null;
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

async function expectGradingError(
  code: AssessmentGradingError["code"],
  action: () => Promise<unknown>,
  label: string
) {
  try {
    await action();
  } catch (error) {
    if (error instanceof AssessmentGradingError && error.code === code) return;
    throw error;
  }
  throw new Error(`${label}: expected ${code}.`);
}

async function expectError(action: () => Promise<unknown>, message: string) {
  try {
    await action();
  } catch (error) {
    if (error instanceof Error && error.message === message) return;
    throw error;
  }
  throw new Error(`Expected error: ${message}.`);
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function assertCount(actual: number, expected: number, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}.`);
  }
}

function assertDeepEqual(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
