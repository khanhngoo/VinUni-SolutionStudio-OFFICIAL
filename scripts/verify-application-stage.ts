import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  getApplicationByPublicId,
  listApplicationsForStudent,
} from "@/db/queries/applications";
import { users } from "@/db/schema";
import { deriveApplicationStage } from "@/services/application-stage";
import { STAGE_ORDER, type ApplicationStage } from "@/lib/types";

/**
 * `deriveApplicationStage` is the only place that decides what stage a student
 * sees, and it folds four independently-moving rows into one answer. This
 * exercises it against the seeded pipeline and pins the table-driven cases that
 * the seed does not happen to cover.
 */

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const OFFER_BASE = {
  compensationNote: null,
  durationWeeks: null,
  hoursPerWeek: null,
  ndaRequired: false,
  respondedAt: null,
  selectedAt: null,
  startDate: null,
};

function verifyTableDrivenCases() {
  const now = new Date("2026-07-27T00:00:00Z");
  const past = new Date("2026-07-20T00:00:00Z");
  const future = new Date("2026-08-20T00:00:00Z");

  const cases: Array<[string, ApplicationStage, Parameters<typeof deriveApplicationStage>[0]]> = [
    ["submitted", "APPLIED", { status: "SUBMITTED" }],
    ["shortlisted", "SHORTLISTED", { status: "SHORTLISTED" }],
    ["assessment, no attempt", "TEST_PENDING", { status: "ASSESSMENT" }],
    [
      "assessment, submitted attempt",
      "TEST_SUBMITTED",
      {
        status: "ASSESSMENT",
        assessmentSummaries: [
          {
            assessmentTitle: null,
            attemptStatus: "SUBMITTED",
            overallBand: null,
            submittedAt: past,
          },
        ],
      },
    ],
    ["awaiting decision", "TEST_SUBMITTED", { status: "SELECTION_PENDING" }],
    ["selected, no offer row", "INVITED", { status: "SELECTED" }],
    [
      "offer pending, in window",
      "INVITED",
      {
        status: "SELECTED",
        offerSummary: { ...OFFER_BASE, offerStatus: "PENDING", respondBy: future },
      },
    ],
    [
      "offer pending, window closed",
      "EXPIRED",
      {
        status: "SELECTED",
        offerSummary: { ...OFFER_BASE, offerStatus: "PENDING", respondBy: past },
      },
    ],
    [
      "offer accepted, project not created",
      "ACTIVE",
      {
        status: "SELECTED",
        offerSummary: { ...OFFER_BASE, offerStatus: "ACCEPTED", respondBy: future },
      },
    ],
    [
      "offer declined",
      "WITHDRAWN",
      {
        status: "SELECTED",
        offerSummary: { ...OFFER_BASE, offerStatus: "DECLINED", respondBy: past },
      },
    ],
    [
      "offer cancelled by partner",
      "NOT_SELECTED",
      {
        status: "SELECTED",
        offerSummary: { ...OFFER_BASE, offerStatus: "CANCELLED", respondBy: past },
      },
    ],
    [
      "project active outranks offer",
      "ACTIVE",
      {
        status: "SELECTED",
        offerSummary: { ...OFFER_BASE, offerStatus: "ACCEPTED", respondBy: past },
        projectSummary: { publicId: "p", status: "ACTIVE" },
      },
    ],
    [
      "project in final review",
      "IN_REVIEW",
      { status: "SELECTED", projectSummary: { publicId: "p", status: "FINAL_REVIEW" } },
    ],
    [
      "project completed",
      "COMPLETED",
      { status: "SELECTED", projectSummary: { publicId: "p", status: "COMPLETED" } },
    ],
    ["rejected", "NOT_SELECTED", { status: "REJECTED" }],
    [
      "withdrawn outranks everything",
      "WITHDRAWN",
      {
        status: "WITHDRAWN",
        projectSummary: { publicId: "p", status: "ACTIVE" },
      },
    ],
  ];

  for (const [name, expected, input] of cases) {
    const actual = deriveApplicationStage(input, now);
    assert(
      actual === expected,
      `${name}: expected ${expected}, got ${actual}`
    );
  }

  console.log(`  ${cases.length} table-driven cases passed`);
}

async function verifyAgainstSeed() {
  const [jordan] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "student.jordan-lee.demo@example.test"));

  assert(jordan, "JORDAN_STUDENT_DEMO must be seeded");

  const list = await listApplicationsForStudent(db, jordan.id);
  assert(list.length > 0, "Jordan must have seeded applications");

  for (const item of list) {
    const detail = await getApplicationByPublicId(db, item.publicId);
    assert(detail, `application ${item.publicId} must load`);

    const stage = deriveApplicationStage({
      assessmentSummaries: detail.assessmentSummaries,
      offerSummary: detail.offerSummary,
      projectSummary: detail.projectSummary,
      status: detail.status,
    });

    assert(
      STAGE_ORDER.includes(stage),
      `derived stage ${stage} is not in STAGE_ORDER`
    );

    console.log(
      `  ${detail.challenge.title.slice(0, 38).padEnd(40)}${detail.status.padEnd(20)}=> ${stage}`
    );
  }
}

async function main() {
  console.log("verify-application-stage");
  verifyTableDrivenCases();
  await verifyAgainstSeed();
  console.log("OK");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
