import { getDirectoryStudentById } from "@/lib/data/directory";
import type {
  Application,
  Milestone,
  ProjectRecord,
  Team,
  TeamMember,
  TeamRole,
} from "@/lib/types";

/**
 * Applications from teams other than Jordan's.
 *
 * The student fixture in `applications.ts` is one student's view: eleven
 * applications, each the only one on its challenge. A partner's view is the
 * transpose — one challenge, many competing teams — and none of that existed,
 * so a pipeline board rendered against the student fixture would show a single
 * card per column.
 *
 * Kept in its own file rather than appended to `applications.ts` for two
 * reasons: that file is explicitly Jordan's fixture and documents itself as
 * such, and these records are only ever read through the provider portal.
 *
 * The teams here are built from the directory rather than `teams.ts`, whose
 * `leader()` helper hard-codes Jordan as every team's leader.
 */

function memberOf(
  studentId: string,
  role: TeamRole,
  status: TeamMember["status"],
  invitedAt: string | null,
): TeamMember {
  const student = getDirectoryStudentById(studentId);
  if (!student) throw new Error(`Unknown directory student: ${studentId}`);

  return {
    studentId: student.id,
    name: student.name,
    major: student.major,
    year: student.year,
    college: student.college,
    role,
    hoursAvailable: student.hoursAvailable,
    weeklyAvailability: student.weeklyAvailability,
    status,
    invitedAt,
  };
}

function team(name: string, members: TeamMember[]): Team {
  return { name, members };
}

/** Every field an Application needs that these fixtures never vary. */
function base(
  id: string,
  challengeId: string,
  stage: Application["stage"],
  appliedAt: string,
  stageEnteredAt: string,
  facultySupervisorId: string,
  applicantTeam: Team,
): Application {
  return {
    id,
    challengeId,
    stage,
    appliedAt,
    stageEnteredAt,
    facultySupervisorId,
    team: applicantTeam,
    // The partner's board reads stage, not the student's to-do line.
    nextAction: null,
    nextActionDue: null,
    testResult: null,
    offer: null,
    project: null,
  };
}

function milestone(
  id: string,
  title: string,
  dueDate: string,
  status: Milestone["status"],
  deliverable: string,
  facultyApproved: boolean,
  posterApproved: boolean,
): Milestone {
  return {
    id,
    title,
    dueDate,
    status,
    deliverable,
    facultyApproved,
    posterApproved,
  };
}

// ---------------------------------------------------------------------------
// merchant-churn-model — the challenge in selection. Every column of the
// pipeline board is populated from here, which is the point of the fixture.
// ---------------------------------------------------------------------------

const churnSignal = team("Churn Signal", [
  memberOf("stu-an-nguyen", "Data & ML", "leader", null),
  memberOf("stu-kien-pham", "Analysis", "accepted", "2026-07-06"),
]);

const retentionLab = team("Retention Lab", [
  memberOf("stu-priya-raman", "Backend", "leader", null),
  memberOf("stu-mai-anh-ngo", "Data & ML", "accepted", "2026-07-09"),
]);

const cohortTwo = team("Cohort Two", [
  memberOf("stu-minh-anh", "Analysis", "leader", null),
  memberOf("stu-thao-ha", "Domain expert", "accepted", "2026-07-11"),
]);

const firstNinety = team("First Ninety", [
  memberOf("stu-mai-anh-ngo", "Data & ML", "leader", null),
]);

const baselineTeam = team("Baseline", [
  memberOf("stu-kien-pham", "Analysis", "leader", null),
  memberOf("stu-hoang-tran", "Coordination", "invited", "2026-07-20"),
]);

/**
 * Teams the partner has not looked at yet. The board's first column is the
 * one that generates work — without anything in it there is no decision to
 * make and the "review applicants" prompt never fires.
 */
const churnRateTeam = team("Churn Rate", [
  memberOf("stu-linh-pham", "Design", "leader", null),
  memberOf("stu-mai-anh-ngo", "Data & ML", "accepted", "2026-07-22"),
]);

const secondLookTeam = team("Second Look", [
  memberOf("stu-thao-ha", "Research", "leader", null),
]);

const winbackTeam = team("Winback", [
  memberOf("stu-hoang-tran", "Coordination", "leader", null),
  memberOf("stu-kien-pham", "Analysis", "invited", "2026-07-24"),
]);

// ---------------------------------------------------------------------------
// route-optimisation — a second live project, so the approvals queue has more
// than one thing in it and the projects list is not a list of one.
// ---------------------------------------------------------------------------

const depotTeam = team("Depot", [
  memberOf("stu-bao-tran", "Data & ML", "leader", null),
  memberOf("stu-hoang-tran", "Coordination", "accepted", "2026-06-02"),
]);

const depotProject: ProjectRecord = {
  startedAt: "2026-06-12",
  milestones: [
    milestone(
      "ms-depot-1",
      "Data audit & baseline",
      "2026-06-26",
      "Approved",
      "Route dataset profiled and a baseline cost model agreed",
      true,
      true,
    ),
    milestone(
      "ms-depot-2",
      "Solver prototype",
      "2026-07-17",
      "Approved",
      "Working heuristic over the sample region",
      true,
      true,
    ),
    milestone(
      "ms-depot-3",
      "Full-network run",
      "2026-07-26",
      "Submitted",
      "Solver across all fourteen depots plus a cost delta memo",
      true,
      // The partner's half of the dual sign-off — the whole point of the
      // approvals screen is that this is the one still false.
      false,
    ),
    milestone(
      "ms-depot-4",
      "Handover & recommendations",
      "2026-08-21",
      "Not started",
      "Final deck and a rollout plan operations can act on",
      false,
      false,
    ),
  ],
  meetings: [
    {
      id: "mtg-depot-review",
      title: "Milestone 3 review",
      kind: "Milestone review",
      startsAt: "2026-07-27T07:00:00Z",
      durationMinutes: 45,
      joinUrl: "https://meet.example.com/depot-review",
      attendees: [
        { name: "Bao Tran", role: "You" },
        { name: "Dr. Kevin Nguyen", role: "Faculty supervisor" },
        { name: "Dung Tran", role: "Partner lead" },
      ],
      milestoneId: "ms-depot-3",
    },
  ],
  resources: [
    { name: "Depot network extract", kind: "Dataset", ndaTier: true },
    { name: "Routing API sandbox", kind: "Credential", ndaTier: true, masked: "rt_live_9f2c…" },
  ],
  posterContact: {
    name: "Dung Tran",
    role: "Head of Operations Analytics",
    email: "dung.tran@bencanglogistics.vn",
  },
  fullBrief: [
    "Our last-mile fleet runs fourteen depots on routes that were drawn by hand and have not been revisited in three years.",
    "We want a solver that proposes better routes against real constraints — vehicle capacity, driver hours, delivery windows — and a memo that says what it would cost and save to adopt them.",
  ],
  facultyFeedback: null,
  partnerFeedback: null,
};

// ---------------------------------------------------------------------------
// supply-chain-dashboard — a finished engagement from the previous cohort.
// This is the record the close-out screen writes to; every milestone is
// approved and both feedback fields are still empty.
// ---------------------------------------------------------------------------

const meridianTeam = team("Meridian", [
  memberOf("stu-sara-idris", "Analysis", "leader", null),
  memberOf("stu-linh-pham", "Design", "accepted", "2026-02-10"),
]);

const meridianProject: ProjectRecord = {
  startedAt: "2026-02-16",
  milestones: [
    milestone(
      "ms-mer-1",
      "Supplier data audit",
      "2026-03-06",
      "Approved",
      "Forty suppliers profiled and gaps documented",
      true,
      true,
    ),
    milestone(
      "ms-mer-2",
      "Risk index methodology",
      "2026-04-03",
      "Approved",
      "Scoring approach agreed with the operations team",
      true,
      true,
    ),
    milestone(
      "ms-mer-3",
      "Dashboard build",
      "2026-05-15",
      "Approved",
      "Live dashboard against the warehouse feed",
      true,
      true,
    ),
    milestone(
      "ms-mer-4",
      "Handover",
      "2026-06-19",
      "Approved",
      "Documentation and a walkthrough for the ops team",
      true,
      true,
    ),
  ],
  meetings: [],
  resources: [
    { name: "Supplier master list", kind: "Dataset", ndaTier: true },
  ],
  posterContact: {
    name: "Dung Tran",
    role: "Head of Operations Analytics",
    email: "dung.tran@bencanglogistics.vn",
  },
  fullBrief: [
    "We buy from roughly forty suppliers and cannot see risk building up until a delivery is already late.",
    "Build us a view that scores supplier risk from the data we already hold, and tell us which three signals matter most.",
  ],
  facultyFeedback: null,
  // Null on purpose: this is what the close-out screen exists to fill in.
  partnerFeedback: null,
};

export const providerApplications: Application[] = [
  // --- merchant-churn-model, one team per pipeline column -------------------
  {
    ...base(
      "papp-churn-signal",
      "merchant-churn-model",
      "INVITED",
      "2026-07-06",
      "2026-07-25",
      "fac-pham",
      churnSignal,
    ),
    testResult: {
      track: "Technical",
      submittedAt: "2026-07-19",
      passed: true,
      overallBand: "Strong",
      sections: [
        { name: "Data handling", band: "Strong" },
        { name: "Modelling", band: "Strong" },
        { name: "Communication", band: "Proficient" },
      ],
      minutesTaken: 41,
    },
    offer: {
      invitedAt: "2026-07-25",
      respondBy: "2026-07-28T17:00:00Z",
      hoursPerWeek: 8,
      durationWeeks: 8,
      compensationNote: "Paid — 8,000,000 VND stipend",
      ndaRequired: true,
      startDate: "2026-09-01",
    },
  },
  {
    ...base(
      "papp-retention-lab",
      "merchant-churn-model",
      "INTERVIEW_SCHEDULED",
      "2026-07-09",
      "2026-07-24",
      "fac-rivera",
      retentionLab,
    ),
    testResult: {
      track: "Technical",
      submittedAt: "2026-07-21",
      passed: true,
      overallBand: "Strong",
      sections: [
        { name: "Data handling", band: "Strong" },
        { name: "Modelling", band: "Proficient" },
        { name: "Communication", band: "Strong" },
      ],
      minutesTaken: 44,
    },
  },
  {
    ...base(
      "papp-cohort-two",
      "merchant-churn-model",
      "TEST_SUBMITTED",
      "2026-07-11",
      "2026-07-22",
      "fac-pham",
      cohortTwo,
    ),
    testResult: {
      track: "Technical",
      submittedAt: "2026-07-22",
      passed: true,
      overallBand: "Proficient",
      sections: [
        { name: "Data handling", band: "Proficient" },
        { name: "Modelling", band: "Developing" },
        { name: "Communication", band: "Strong" },
      ],
      minutesTaken: 47,
    },
  },
  base(
    "papp-baseline",
    "merchant-churn-model",
    "TEST_PENDING",
    "2026-07-14",
    "2026-07-25",
    "fac-do",
    baselineTeam,
  ),
  base(
    "papp-first-ninety",
    "merchant-churn-model",
    "SHORTLISTED",
    "2026-07-18",
    "2026-07-23",
    "fac-pham",
    firstNinety,
  ),
  base(
    "papp-churn-rate",
    "merchant-churn-model",
    "APPLIED",
    "2026-07-22",
    "2026-07-22",
    "fac-rivera",
    churnRateTeam,
  ),
  base(
    "papp-second-look",
    "merchant-churn-model",
    "APPLIED",
    "2026-07-24",
    "2026-07-24",
    "fac-do",
    secondLookTeam,
  ),
  base(
    "papp-winback",
    "merchant-churn-model",
    "APPLIED",
    "2026-07-25",
    "2026-07-25",
    "fac-pham",
    winbackTeam,
  ),

  // --- route-optimisation, the second live project -------------------------
  {
    ...base(
      "papp-depot",
      "route-optimisation",
      "ACTIVE",
      "2026-05-20",
      "2026-06-12",
      "fac-nguyen-k",
      depotTeam,
    ),
    testResult: {
      track: "Technical",
      submittedAt: "2026-06-01",
      passed: true,
      overallBand: "Proficient",
      sections: [
        { name: "Algorithms", band: "Strong" },
        { name: "Data handling", band: "Proficient" },
      ],
      minutesTaken: 52,
    },
    offer: {
      invitedAt: "2026-06-05",
      respondBy: "2026-06-08T17:00:00Z",
      hoursPerWeek: 10,
      durationWeeks: 10,
      compensationNote: "Paid — 10,000,000 VND stipend",
      ndaRequired: true,
      startDate: "2026-06-12",
    },
    project: depotProject,
  },

  // --- supply-chain-dashboard, finished and awaiting close-out -------------
  {
    ...base(
      "papp-meridian",
      "supply-chain-dashboard",
      "COMPLETED",
      "2026-01-28",
      "2026-06-19",
      "fac-pham",
      meridianTeam,
    ),
    testResult: {
      track: "Cognitive + Case",
      submittedAt: "2026-02-04",
      passed: true,
      overallBand: "Strong",
      sections: [
        { name: "Reasoning", band: "Strong" },
        { name: "Case analysis", band: "Strong" },
      ],
      minutesTaken: 38,
    },
    project: meridianProject,
  },
];
