import "dotenv/config";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  applicationMembers,
  applications,
  assessmentQuestions,
  assessmentSections,
  assessments,
  challenges,
  supervisionRequests,
  users,
} from "@/db/schema";

const ASSESSMENT_TITLE = "Phase 6.6.5 Browser QA assessment";
const PASS_APP = "66510000-0000-4000-8000-000000000001";
const FAIL_APP = "66510000-0000-4000-8000-000000000002";

async function main() {
  const command = process.argv[2];
  if (command === "cleanup") {
    await cleanup();
    console.log("Phase 6.6.5 browser fixtures removed.");
    return;
  }
  if (command !== "setup") {
    throw new Error("Use setup or cleanup.");
  }

  await cleanup();
  const [challenge] = await db
    .select({ id: challenges.id })
    .from(challenges)
    .where(eq(challenges.slug, "route-optimisation"))
    .limit(1);
  if (!challenge) throw new Error("Route optimisation challenge is missing.");

  const identities = await userIds([
    "student.bao-tran.demo@example.test",
    "faculty.minh-pham.demo@example.test",
    "caid.admin.dev@example.test",
  ]);
  const studentId = identities.get("student.bao-tran.demo@example.test")!;
  const facultyId = identities.get("faculty.minh-pham.demo@example.test")!;
  const createdBy = identities.get("caid.admin.dev@example.test")!;

  const [assessment] = await db
    .insert(assessments)
    .values({
      challengeId: challenge.id,
      createdBy,
      passingScore: 60,
      scope: "INDIVIDUAL",
      status: "ACTIVE",
      timeLimitMinutes: null,
      title: ASSESSMENT_TITLE,
    })
    .returning({ id: assessments.id });
  const [section] = await db
    .insert(assessmentSections)
    .values({ assessmentId: assessment.id, sequence: 1, title: "Reasoning" })
    .returning({ id: assessmentSections.id });
  await db.insert(assessmentQuestions).values({
    config: {
      correctIndex: 1,
      options: ["Ignore the persisted evidence", "Review the authoritative records", "Create a default result"],
    },
    maxScore: 1,
    prompt: "What should an assessment reviewer use to make a decision?",
    questionType: "MULTIPLE_CHOICE",
    sectionId: section.id,
    sequence: 1,
  });

  for (const [publicId, teamName] of [
    [PASS_APP, "QA 665 Browser Pass"],
    [FAIL_APP, "QA 665 Browser Fail"],
  ] as const) {
    const [application] = await db
      .insert(applications)
      .values({
        challengeId: challenge.id,
        motivation: "Disposable browser assessment verification.",
        publicId,
        status: "ASSESSMENT",
        submittedAt: new Date(),
        submittedBy: studentId,
        teamName,
      })
      .returning({ id: applications.id });
    await db.insert(applicationMembers).values({
      applicationId: application.id,
      memberRole: "LEADER",
      respondedAt: new Date(),
      status: "ACCEPTED",
      studentId,
    });
    await db.insert(supervisionRequests).values({
      applicationId: application.id,
      facultyId,
      requestedAt: new Date(),
      requestedBy: studentId,
      respondedAt: new Date(),
      respondBy: new Date(Date.now() + 86_400_000),
      status: "ACCEPTED",
    });
  }

  console.log(
    JSON.stringify({
      failApplication: FAIL_APP,
      passApplication: PASS_APP,
      studentIdentity: "BAO_STUDENT_DEMO",
      graderIdentity: "FACULTY_PHAM_DEMO",
      unrelatedFacultyIdentity: "FACULTY_PHAM_DEMO is the only accepted supervisor; use any other role for denial",
    })
  );
}

async function userIds(emails: string[]) {
  const rows = await db
    .select({ email: users.email, id: users.id })
    .from(users)
    .where(inArray(users.email, emails));
  const result = new Map(rows.map((row) => [row.email.toLowerCase(), row.id]));
  for (const email of emails) {
    if (!result.has(email)) throw new Error(`Missing identity ${email}.`);
  }
  return result;
}

async function cleanup() {
  await db.delete(applications).where(inArray(applications.publicId, [PASS_APP, FAIL_APP]));
  await db.delete(assessments).where(eq(assessments.title, ASSESSMENT_TITLE));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
