import { and, eq, inArray, isNull, ne } from "drizzle-orm";

import {
  applicationMembers,
  applications,
  assessmentAttempts,
  assessmentQuestions,
  assessmentResponses,
  assessments,
  assessmentScores,
  assessmentSections,
} from "../schema";
import type { SeedContext } from "./context";

type AssessmentQuestionType = "MULTIPLE_CHOICE" | "CODING";
type AssessmentAttemptStatus = "REVIEWED";

interface QuestionSeed {
  config: Record<string, unknown>;
  maxScore: number;
  prompt: string;
  questionType: AssessmentQuestionType;
  sequence: number;
}

interface SectionSeed {
  instructions: string | null;
  questions: QuestionSeed[];
  sequence: number;
  timeLimitMinutes: number | null;
  title: string;
}

interface AttemptSeed {
  applicationKey: string;
  applicationStatusAfterReview: "REJECTED" | "SELECTION_PENDING";
  applicationStatusUpdatedAt: Date;
  ownerStudentUserKey: string;
  reviewerUserKey: string;
  rubricScores: Record<string, unknown>;
  sourceOverallBand: string;
  sourcePassed: boolean;
  sourceSubmittedAt: string;
  status: AssessmentAttemptStatus;
  submittedAt: Date;
  minutesTaken: number;
}

interface AssessmentSeed {
  attempt: AttemptSeed;
  challengeSlug: string;
  createdByUserKey: string;
  instructions: string;
  key: string;
  scope: "INDIVIDUAL";
  sections: SectionSeed[];
  status: "ACTIVE";
  timeLimitMinutes: number;
  title: string;
}

const NOON_UTC = "T12:00:00.000Z";

function submittedAt(date: string) {
  return new Date(`${date}${NOON_UTC}`);
}

function startedAt(date: Date, minutesTaken: number) {
  return new Date(date.getTime() - minutesTaken * 60_000);
}

function mcq(
  prompt: string,
  options: string[],
  correctIndex: number,
  sequence: number
): QuestionSeed {
  return {
    config: { options, correctIndex },
    maxScore: 1,
    prompt,
    questionType: "MULTIPLE_CHOICE",
    sequence,
  };
}

function coding(
  title: string,
  statement: string[],
  language: string,
  starterCode: string,
  sampleTests: { input: string; expected: string }[],
  sequence: number
): QuestionSeed {
  return {
    config: {
      title,
      statement,
      language,
      starterCode,
      sampleTests,
    },
    maxScore: 10,
    prompt: statement.join("\n\n"),
    questionType: "CODING",
    sequence,
  };
}

const COGNITIVE_SECTIONS: SectionSeed[] = [
  {
    title: "Numerical reasoning",
    instructions: "Timed multiple-choice numerical reasoning section.",
    sequence: 1,
    timeLimitMinutes: 10,
    questions: [
      mcq(
        "A distributor ships 4,200 units in Q1 and 5,460 in Q2. What is the percentage increase?",
        ["24%", "26%", "30%", "32%"],
        2,
        1
      ),
      mcq(
        "A process takes 45 minutes and is improved to take 27 minutes. By what fraction has the time been reduced?",
        ["One third", "Two fifths", "Three fifths", "One half"],
        1,
        2
      ),
      mcq(
        "Of 850 survey responses, 34% chose option A and 22% chose option B. How many more chose A than B?",
        ["96", "102", "108", "114"],
        1,
        3
      ),
    ],
  },
  {
    title: "Logical reasoning",
    instructions: "Timed multiple-choice logical reasoning section.",
    sequence: 2,
    timeLimitMinutes: 12,
    questions: [
      mcq(
        "Every shipment that clears customs is logged. Some logged shipments are delayed. Which statement must be true?",
        [
          "Every delayed shipment cleared customs",
          "Some shipments that cleared customs may be delayed",
          "No cleared shipment is delayed",
          "All logged shipments cleared customs",
        ],
        1,
        1
      ),
      mcq(
        "In the sequence 3, 6, 11, 18, 27, what comes next?",
        ["36", "38", "40", "42"],
        1,
        2
      ),
      mcq(
        "If no warehouse in the northern region uses System A, and Warehouse 7 uses System A, what follows?",
        [
          "Warehouse 7 is not in the northern region",
          "Warehouse 7 is in the northern region",
          "System A is unused in every region",
          "Nothing can be concluded",
        ],
        0,
        3
      ),
    ],
  },
  {
    title: "Verbal reasoning",
    instructions: "Timed multiple-choice verbal reasoning section.",
    sequence: 3,
    timeLimitMinutes: 10,
    questions: [
      mcq(
        '"The pilot succeeded, though its cost per unit remained above the threshold the board had set." What does this most strongly imply?',
        [
          "The board's threshold was unreasonable",
          "Success was measured by something other than unit cost",
          "The pilot will be rolled out unchanged",
          "Unit cost was the only metric considered",
        ],
        1,
        1
      ),
      mcq(
        'Which word is closest in meaning to "provisional" as used in "a provisional finding"?',
        ["Final", "Tentative", "Detailed", "Disputed"],
        1,
        2
      ),
    ],
  },
  {
    title: "Situational judgement",
    instructions: "Timed multiple-choice situational judgement section.",
    sequence: 4,
    timeLimitMinutes: 8,
    questions: [
      mcq(
        "Two days before a milestone is due you find an error in data you received from the partner. What is the best first action?",
        [
          "Submit on time and note the issue afterwards",
          "Flag it to the partner and your supervisor immediately with what you know",
          "Correct it yourself and proceed without mentioning it",
          "Request an extension before investigating",
        ],
        1,
        1
      ),
      mcq(
        "Your faculty supervisor and the partner give you conflicting direction on scope. What do you do?",
        [
          "Follow the partner, since it is their project",
          "Follow your supervisor, since they assess you",
          "Ask them to align, setting out the trade-off you see",
          "Split the difference and do half of each",
        ],
        2,
        2
      ),
    ],
  },
];

const TECHNICAL_SECTIONS: SectionSeed[] = [
  {
    title: "Technical coding problems",
    instructions:
      "Two coding problems from the static technical assessment bank. No execution engine is seeded.",
    sequence: 1,
    timeLimitMinutes: 60,
    questions: [
      coding(
        "Reconcile duplicate shipment records",
        [
          "Four systems report shipments and the same physical shipment can appear in more than one of them.",
          'Given a list of records, each a string of the form "id:system:units", return the total units across unique shipment ids. When an id appears more than once, the record with the highest unit count wins.',
          "Return the total as an integer.",
        ],
        "Python",
        `def total_units(records):
    # records: list[str] like ["A1:erp:120", "A1:wms:118", "B2:erp:40"]
    # return: int
    pass
`,
        [
          {
            input: '["A1:erp:120", "A1:wms:118", "B2:erp:40"]',
            expected: "160",
          },
          { input: '["C3:erp:10", "C3:wms:10"]', expected: "10" },
          { input: "[]", expected: "0" },
        ],
        1
      ),
      coding(
        "Flag likely stockouts",
        [
          "You are given daily stock levels for one product as a list of integers, oldest first, and a lead time in days.",
          "A stockout is likely if the average daily decline over the last seven readings, projected forward by the lead time, would take the current level to zero or below.",
          "Return True if a stockout is likely, otherwise False. If there are fewer than eight readings, return False.",
        ],
        "Python",
        `def likely_stockout(levels, lead_time_days):
    # levels: list[int], oldest first
    # lead_time_days: int
    # return: bool
    pass
`,
        [
          { input: "[100, 92, 84, 76, 68, 60, 52, 44], 7", expected: "True" },
          { input: "[100, 99, 98, 97, 96, 95, 94, 93], 3", expected: "False" },
          { input: "[50, 40, 30], 5", expected: "False" },
        ],
        2
      ),
    ],
  },
];

export const DEMO_ASSESSMENTS: AssessmentSeed[] = [
  {
    key: "assessment:triage-protocol-review",
    challengeSlug: "triage-protocol-review",
    title: "DEMO assessment for Emergency triage protocol review",
    instructions:
      "Individual cognitive assessment seeded from the static cognitive bank. The domain-scenario result band is preserved in score rubric JSON because no static domain-question bank exists.",
    timeLimitMinutes: 55,
    scope: "INDIVIDUAL",
    status: "ACTIVE",
    createdByUserKey: "user:caid-admin-dev",
    sections: COGNITIVE_SECTIONS,
    attempt: {
      applicationKey: "application:app-triage",
      ownerStudentUserKey: "user:stu-jordan-lee",
      reviewerUserKey: "user:fac-osei",
      status: "REVIEWED",
      sourceSubmittedAt: "2026-07-04",
      submittedAt: submittedAt("2026-07-04"),
      minutesTaken: 41,
      sourceOverallBand: "Below threshold",
      sourcePassed: false,
      applicationStatusAfterReview: "REJECTED",
      applicationStatusUpdatedAt: submittedAt("2026-07-06"),
      rubricScores: {
        sourceOverallBand: "Below threshold",
        sourcePassed: false,
        sourceTrack: "Cognitive + Domain scenario",
        sourceMinutesTaken: 41,
        sourceScale: "qualitative-band-only",
        sections: [
          { name: "Numerical reasoning", band: "Developing" },
          { name: "Logical reasoning", band: "Proficient" },
          { name: "Verbal reasoning", band: "Developing" },
          {
            name: "Clinical scenario",
            band: "Below threshold",
            note: "No static domain-scenario question bank exists in Phase 3.6.",
          },
        ],
      },
    },
  },
  {
    key: "assessment:merchant-churn-model",
    challengeSlug: "merchant-churn-model",
    title: "DEMO technical assessment for Merchant churn model",
    instructions:
      "Individual technical assessment seeded from the static coding bank. The app-churn fixture provides qualitative reviewed bands but no response-level answers.",
    timeLimitMinutes: 60,
    scope: "INDIVIDUAL",
    status: "ACTIVE",
    createdByUserKey: "user:caid-admin-dev",
    sections: TECHNICAL_SECTIONS,
    attempt: {
      applicationKey: "application:app-churn",
      ownerStudentUserKey: "user:stu-jordan-lee",
      reviewerUserKey: "user:fac-pham",
      status: "REVIEWED",
      sourceSubmittedAt: "2026-07-21",
      submittedAt: submittedAt("2026-07-21"),
      minutesTaken: 74,
      sourceOverallBand: "Strong",
      sourcePassed: true,
      applicationStatusAfterReview: "SELECTION_PENDING",
      applicationStatusUpdatedAt: submittedAt("2026-07-21"),
      rubricScores: {
        sourceOverallBand: "Strong",
        sourcePassed: true,
        sourceTrack: "Technical",
        sourceMinutesTaken: 74,
        sourceScale: "qualitative-band-only",
        sections: [
          { name: "Problem 1 - data cleaning", band: "Strong" },
          { name: "Problem 2 - churn baseline", band: "Proficient" },
          { name: "Code quality", band: "Strong" },
        ],
        note:
          "The challenge card labels merchant churn as Cognitive + Case, while app-churn carries a Technical reviewed result; Phase 3.6 preserves the application result fixture for this attempt.",
      },
    },
  },
];

async function ensureAssessment(ctx: SeedContext, seed: AssessmentSeed) {
  const challengeId = ctx.getId(`challenge:${seed.challengeSlug}`);

  const existing = await ctx.tx
    .select({ id: assessments.id })
    .from(assessments)
    .where(and(eq(assessments.challengeId, challengeId), eq(assessments.title, seed.title)))
    .limit(2);

  if (existing.length > 1) {
    throw new Error(`Refusing to seed duplicate assessment definition ${seed.key}.`);
  }

  const values = {
    challengeId,
    createdBy: ctx.getId(seed.createdByUserKey),
    instructions: seed.instructions,
    scope: seed.scope,
    status: seed.status,
    timeLimitMinutes: seed.timeLimitMinutes,
    title: seed.title,
    updatedAt: new Date(),
  };

  if (existing[0]) {
    const [updated] = await ctx.tx
      .update(assessments)
      .set(values)
      .where(eq(assessments.id, existing[0].id))
      .returning({ id: assessments.id });

    ctx.setId(seed.key, updated.id);
    return updated.id;
  }

  const [created] = await ctx.tx
    .insert(assessments)
    .values(values)
    .returning({ id: assessments.id });

  ctx.setId(seed.key, created.id);
  return created.id;
}

async function ensureAssessmentSection(
  ctx: SeedContext,
  assessmentId: bigint,
  assessmentKey: string,
  seed: SectionSeed
) {
  const existing = await ctx.tx
    .select({ id: assessmentSections.id })
    .from(assessmentSections)
    .where(
      and(
        eq(assessmentSections.assessmentId, assessmentId),
        eq(assessmentSections.sequence, seed.sequence)
      )
    )
    .limit(2);

  if (existing.length > 1) {
    throw new Error(
      `Refusing to seed duplicate section sequence ${seed.sequence} for ${assessmentKey}.`
    );
  }

  const values = {
    assessmentId,
    instructions: seed.instructions,
    sequence: seed.sequence,
    timeLimitMinutes: seed.timeLimitMinutes,
    title: seed.title,
  };

  if (existing[0]) {
    const [updated] = await ctx.tx
      .update(assessmentSections)
      .set(values)
      .where(eq(assessmentSections.id, existing[0].id))
      .returning({ id: assessmentSections.id });

    ctx.setId(`${assessmentKey}:section:${seed.sequence}`, updated.id);
    return updated.id;
  }

  const [created] = await ctx.tx
    .insert(assessmentSections)
    .values(values)
    .returning({ id: assessmentSections.id });

  ctx.setId(`${assessmentKey}:section:${seed.sequence}`, created.id);
  return created.id;
}

async function ensureAssessmentQuestion(
  ctx: SeedContext,
  sectionId: bigint,
  assessmentKey: string,
  sectionSequence: number,
  seed: QuestionSeed
) {
  const existing = await ctx.tx
    .select({ id: assessmentQuestions.id })
    .from(assessmentQuestions)
    .where(
      and(
        eq(assessmentQuestions.sectionId, sectionId),
        eq(assessmentQuestions.sequence, seed.sequence)
      )
    )
    .limit(2);

  if (existing.length > 1) {
    throw new Error(
      `Refusing to seed duplicate question sequence ${seed.sequence} for ${assessmentKey} section ${sectionSequence}.`
    );
  }

  const values = {
    config: seed.config,
    maxScore: seed.maxScore,
    prompt: seed.prompt,
    questionType: seed.questionType,
    sectionId,
    sequence: seed.sequence,
  };

  if (existing[0]) {
    await ctx.tx
      .update(assessmentQuestions)
      .set(values)
      .where(eq(assessmentQuestions.id, existing[0].id));
    return;
  }

  await ctx.tx.insert(assessmentQuestions).values(values);
}

async function findApplicationMemberForAttempt(
  ctx: SeedContext,
  applicationId: bigint,
  studentUserKey: string
) {
  const studentId = ctx.getId(studentUserKey);

  const rows = await ctx.tx
    .select({ id: applicationMembers.id })
    .from(applicationMembers)
    .where(
      and(
        eq(applicationMembers.applicationId, applicationId),
        eq(applicationMembers.studentId, studentId)
      )
    )
    .limit(2);

  if (rows.length !== 1) {
    throw new Error(
      `Refusing to seed assessment attempt: expected exactly one application member for ${studentUserKey}.`
    );
  }

  return rows[0].id;
}

async function ensureAttemptAndScore(
  ctx: SeedContext,
  assessmentId: bigint,
  seed: AssessmentSeed
) {
  const applicationId = ctx.getId(seed.attempt.applicationKey);
  const applicationMemberId = await findApplicationMemberForAttempt(
    ctx,
    applicationId,
    seed.attempt.ownerStudentUserKey
  );

  const existingAttempt = await ctx.tx
    .select({ id: assessmentAttempts.id })
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.assessmentId, assessmentId),
        eq(assessmentAttempts.applicationMemberId, applicationMemberId)
      )
    )
    .limit(2);

  if (existingAttempt.length > 1) {
    throw new Error(`Refusing to seed duplicate assessment attempt for ${seed.key}.`);
  }

  const attemptValues = {
    aiUsageDeclared: null,
    aiUsageDescription: null,
    applicationId,
    applicationMemberId,
    assessmentId,
    startedAt: startedAt(seed.attempt.submittedAt, seed.attempt.minutesTaken),
    status: seed.attempt.status,
    submittedAt: seed.attempt.submittedAt,
  };

  const [attempt] = existingAttempt[0]
    ? await ctx.tx
        .update(assessmentAttempts)
        .set(attemptValues)
        .where(eq(assessmentAttempts.id, existingAttempt[0].id))
        .returning({ id: assessmentAttempts.id })
    : await ctx.tx
        .insert(assessmentAttempts)
        .values(attemptValues)
        .returning({ id: assessmentAttempts.id });

  ctx.setId(`${seed.key}:attempt:${seed.attempt.applicationKey}`, attempt.id);

  const reviewerId = ctx.getId(seed.attempt.reviewerUserKey);
  const existingScore = await ctx.tx
    .select({ id: assessmentScores.id })
    .from(assessmentScores)
    .where(
      and(
        eq(assessmentScores.attemptId, attempt.id),
        eq(assessmentScores.reviewerId, reviewerId)
      )
    )
    .limit(2);

  if (existingScore.length > 1) {
    throw new Error(`Refusing to seed duplicate assessment score for ${seed.key}.`);
  }

  const scoreValues = {
    attemptId: attempt.id,
    comments: seed.attempt.sourcePassed
      ? `${seed.attempt.sourceOverallBand} reviewed result from static ${seed.attempt.applicationKey} fixture. No numeric score or response-level answers are available.`
      : `${seed.attempt.sourceOverallBand} reviewed result from static ${seed.attempt.applicationKey} fixture. This supports the Phase 3.6 assessment-driven rejection transition.`,
    overallScore: null,
    reviewerId,
    rubricScores: seed.attempt.rubricScores,
  };

  if (existingScore[0]) {
    await ctx.tx
      .update(assessmentScores)
      .set(scoreValues)
      .where(eq(assessmentScores.id, existingScore[0].id));
  } else {
    await ctx.tx.insert(assessmentScores).values(scoreValues);
  }

  await ctx.tx
    .update(applications)
    .set({
      status: seed.attempt.applicationStatusAfterReview,
      updatedAt: seed.attempt.applicationStatusUpdatedAt,
    })
    .where(eq(applications.id, applicationId));
}

async function validateDemoAssessments(ctx: SeedContext) {
  const assessmentIds = DEMO_ASSESSMENTS.map((seed) => ctx.getId(seed.key));

  const invalidIndividualAttempts = await ctx.tx
    .select({ id: assessmentAttempts.id })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
    .where(
      and(
        inArray(assessmentAttempts.assessmentId, assessmentIds),
        eq(assessments.scope, "INDIVIDUAL"),
        isNull(assessmentAttempts.applicationMemberId)
      )
    );

  if (invalidIndividualAttempts.length > 0) {
    throw new Error("Seed validation failed: INDIVIDUAL attempts must have owners.");
  }

  const attempts = await ctx.tx
    .select({
      applicationChallengeId: applications.challengeId,
      applicationId: assessmentAttempts.applicationId,
      applicationMemberApplicationId: applicationMembers.applicationId,
      assessmentChallengeId: assessments.challengeId,
      id: assessmentAttempts.id,
    })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
    .innerJoin(applications, eq(assessmentAttempts.applicationId, applications.id))
    .leftJoin(
      applicationMembers,
      eq(assessmentAttempts.applicationMemberId, applicationMembers.id)
    )
    .where(inArray(assessmentAttempts.assessmentId, assessmentIds));

  for (const attempt of attempts) {
    if (attempt.applicationChallengeId !== attempt.assessmentChallengeId) {
      throw new Error(
        `Seed validation failed: assessment/application challenge mismatch for attempt ${attempt.id}.`
      );
    }

    if (attempt.applicationMemberApplicationId !== attempt.applicationId) {
      throw new Error(
        `Seed validation failed: attempt ${attempt.id} points to a member from another application.`
      );
    }
  }

  const responseMismatches = await ctx.tx
    .select({ id: assessmentResponses.id })
    .from(assessmentResponses)
    .innerJoin(assessmentAttempts, eq(assessmentResponses.attemptId, assessmentAttempts.id))
    .innerJoin(assessmentQuestions, eq(assessmentResponses.questionId, assessmentQuestions.id))
    .innerJoin(
      assessmentSections,
      eq(assessmentQuestions.sectionId, assessmentSections.id)
    )
    .where(
      and(
        inArray(assessmentAttempts.assessmentId, assessmentIds),
        ne(assessmentSections.assessmentId, assessmentAttempts.assessmentId)
      )
    );

  if (responseMismatches.length !== 0) {
    throw new Error(
      "Seed validation failed: response question/attempt assessment mismatch detected."
    );
  }
}

export async function seedDemoAssessments(ctx: SeedContext) {
  for (const seed of DEMO_ASSESSMENTS) {
    const assessmentId = await ensureAssessment(ctx, seed);

    for (const section of seed.sections) {
      const sectionId = await ensureAssessmentSection(
        ctx,
        assessmentId,
        seed.key,
        section
      );

      for (const question of section.questions) {
        await ensureAssessmentQuestion(
          ctx,
          sectionId,
          seed.key,
          section.sequence,
          question
        );
      }
    }

    await ensureAttemptAndScore(ctx, assessmentId, seed);
  }

  await validateDemoAssessments(ctx);

  ctx.record("DEMO", "assessments", DEMO_ASSESSMENTS.length);
  ctx.record(
    "DEMO",
    "assessment sections",
    DEMO_ASSESSMENTS.reduce((total, seed) => total + seed.sections.length, 0)
  );
  ctx.record(
    "DEMO",
    "assessment questions",
    DEMO_ASSESSMENTS.reduce(
      (assessmentTotal, seed) =>
        assessmentTotal +
        seed.sections.reduce(
          (sectionTotal, section) => sectionTotal + section.questions.length,
          0
        ),
      0
    )
  );
  ctx.record("DEMO", "assessment attempts", DEMO_ASSESSMENTS.length);
  ctx.record("DEMO", "assessment responses", 0);
  ctx.record("DEMO", "assessment scores", DEMO_ASSESSMENTS.length);
}
