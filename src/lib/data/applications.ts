import {
  archiveMeetings,
  energyMeetings,
  supplyMeetings,
} from "@/lib/data/meetings";
import {
  archiveTeam,
  churnTeam,
  energyTeam,
  genzTeam,
  heatTeam,
  lastMileTeam,
  marketTeam,
  outreachTeam,
  soloTeam,
  supplyTeam,
} from "@/lib/data/teams";
import type { Application } from "@/lib/types";

/**
 * Seed applications for Jordan Lee. "Today" is pinned to 2026-07-27 in
 * lib/dates.ts, so every date here is authored relative to that.
 *
 * The fixture is engineered so each screen in the pipeline is reachable from a
 * cold URL load — there is no persistence, so a walkthrough of one screen
 * cannot set up the next. Notably:
 *
 *   app-perception  TEST_PENDING, technical track, due in 2 days
 *   app-heat        TEST_PENDING, cognitive track — the other assessment UI
 *   app-churn       TEST_SUBMITTED with a passing result
 *   app-triage      NOT_SELECTED with a failing result (below threshold)
 *   app-route       INVITED, NDA required, ~40h left on the 72h window
 *   app-genz        INVITED, no NDA — the shorter accept path
 *   app-supply      ACTIVE with a full project record (the workspace fixture)
 *   app-energy      IN_REVIEW — deliverables in, evaluation running
 *   app-archive     COMPLETED — closed and archived
 *
 * PRD D8 caps a student at 2 active applications and 1 active challenge. This
 * fixture deliberately exceeds that so every state has somewhere to live; the
 * cap is a product rule, not an unimplemented feature.
 */
export const applications: Application[] = [
  {
    id: "app-perception",
    challengeId: "multimodal-perception",
    stage: "TEST_PENDING",
    appliedAt: "2026-07-08",
    stageEnteredAt: "2026-07-24",
    facultySupervisorId: "fac-rivera",
    team: soloTeam("Perception Solo", "Data & ML"),
    nextAction: "Complete your technical test",
    // Two days out: the urgent case the pre-flight screen exists to catch.
    nextActionDue: "2026-07-29",
    testResult: null,
    offer: null,
    project: null,
  },
  {
    id: "app-heat",
    challengeId: "urban-heat-mapping",
    stage: "TEST_PENDING",
    appliedAt: "2026-07-12",
    stageEnteredAt: "2026-07-25",
    facultySupervisorId: "fac-do",
    team: heatTeam,
    nextAction: "Complete your cognitive test",
    nextActionDue: "2026-08-01",
    testResult: null,
    offer: null,
    project: null,
  },
  {
    id: "app-churn",
    challengeId: "merchant-churn-model",
    stage: "TEST_SUBMITTED",
    appliedAt: "2026-07-02",
    stageEnteredAt: "2026-07-21",
    facultySupervisorId: "fac-pham",
    team: churnTeam,
    nextAction: "Waiting on your results",
    nextActionDue: null,
    testResult: {
      track: "Technical",
      submittedAt: "2026-07-21",
      passed: true,
      overallBand: "Strong",
      sections: [
        { name: "Problem 1 — data cleaning", band: "Strong" },
        { name: "Problem 2 — churn baseline", band: "Proficient" },
        { name: "Code quality", band: "Strong" },
      ],
      minutesTaken: 74,
    },
    offer: null,
    project: null,
  },
  {
    id: "app-triage",
    challengeId: "triage-protocol-review",
    stage: "NOT_SELECTED",
    appliedAt: "2026-06-18",
    stageEnteredAt: "2026-07-06",
    facultySupervisorId: "fac-osei",
    team: soloTeam("Triage Review", "Research"),
    nextAction: null,
    nextActionDue: null,
    // The failing result: terminal for this challenge, 30-day cooldown (§8.1).
    testResult: {
      track: "Cognitive + Domain scenario",
      submittedAt: "2026-07-04",
      passed: false,
      overallBand: "Below threshold",
      sections: [
        { name: "Numerical reasoning", band: "Developing" },
        { name: "Logical reasoning", band: "Proficient" },
        { name: "Verbal reasoning", band: "Developing" },
        { name: "Clinical scenario", band: "Below threshold" },
      ],
      minutesTaken: 41,
    },
    offer: null,
    project: null,
  },
  {
    id: "app-route",
    challengeId: "route-optimisation",
    stage: "INVITED",
    appliedAt: "2026-06-30",
    stageEnteredAt: "2026-07-26",
    facultySupervisorId: "fac-nguyen-k",
    team: lastMileTeam,
    nextAction: "Respond to your invitation",
    nextActionDue: "2026-07-29",
    testResult: {
      track: "Technical",
      submittedAt: "2026-07-14",
      passed: true,
      overallBand: "Strong",
      sections: [
        { name: "Problem 1 — routing heuristic", band: "Strong" },
        { name: "Problem 2 — constraint handling", band: "Strong" },
        { name: "Code quality", band: "Proficient" },
      ],
      minutesTaken: 68,
    },
    offer: {
      invitedAt: "2026-07-26",
      // ~40 hours left against the pinned today — the live countdown case.
      respondBy: "2026-07-28T16:00:00Z",
      hoursPerWeek: 10,
      durationWeeks: 10,
      compensationNote: "Paid · stipend confirmed by the partner",
      ndaRequired: true,
      startDate: "2026-08-17",
    },
    project: null,
  },
  {
    id: "app-genz",
    challengeId: "genz-brand-positioning",
    stage: "INVITED",
    appliedAt: "2026-07-01",
    stageEnteredAt: "2026-07-25",
    facultySupervisorId: "fac-le",
    team: genzTeam,
    nextAction: "Respond to your invitation",
    nextActionDue: "2026-07-30",
    testResult: {
      track: "Cognitive + Case",
      submittedAt: "2026-07-16",
      passed: true,
      overallBand: "Proficient",
      sections: [
        { name: "Numerical reasoning", band: "Proficient" },
        { name: "Verbal reasoning", band: "Strong" },
        { name: "Case response", band: "Proficient" },
      ],
      minutesTaken: 52,
    },
    offer: {
      invitedAt: "2026-07-25",
      respondBy: "2026-07-30T09:00:00Z",
      hoursPerWeek: 8,
      durationWeeks: 6,
      compensationNote: "Credit · counts toward your capstone elective",
      // No NDA: the shorter accept path.
      ndaRequired: false,
      startDate: "2026-08-24",
    },
    project: null,
  },
  {
    id: "app-supply",
    challengeId: "supply-chain-dashboard",
    stage: "ACTIVE",
    appliedAt: "2026-05-20",
    stageEnteredAt: "2026-06-22",
    facultySupervisorId: "fac-pham",
    team: supplyTeam,
    nextAction: "Milestone 3 is with your reviewers",
    nextActionDue: null,
    testResult: {
      track: "Technical",
      submittedAt: "2026-06-04",
      passed: true,
      overallBand: "Strong",
      sections: [
        { name: "Problem 1 — data modelling", band: "Strong" },
        { name: "Problem 2 — aggregation", band: "Strong" },
        { name: "Code quality", band: "Proficient" },
      ],
      minutesTaken: 71,
    },
    offer: {
      invitedAt: "2026-06-18",
      respondBy: "2026-06-21T12:00:00Z",
      hoursPerWeek: 12,
      durationWeeks: 12,
      compensationNote: "Paid · stipend disbursed off-platform by the partner",
      ndaRequired: true,
      startDate: "2026-06-22",
    },
    // The workspace fixture: every milestone status, an NDA-tier resource and a
    // masked credential are all represented here.
    project: {
      startedAt: "2026-06-22",
      milestones: [
        {
          id: "ms-1",
          title: "Data audit and source mapping",
          dueDate: "2026-07-03",
          status: "Approved",
          deliverable: "Written audit of the four inbound data sources",
          facultyApproved: true,
          posterApproved: true,
        },
        {
          id: "ms-2",
          title: "Warehouse schema and ingestion",
          dueDate: "2026-07-20",
          status: "Revision requested",
          deliverable: "Schema diagram + ingestion scripts",
          facultyApproved: true,
          posterApproved: false,
        },
        {
          id: "ms-3",
          title: "Forecast module",
          dueDate: "2026-08-03",
          // Submitted and unreviewed — the faculty portal's approve case.
          status: "Submitted",
          deliverable: "Notebook + short methodology memo",
          facultyApproved: false,
          posterApproved: false,
        },
        {
          id: "ms-4",
          title: "Dashboard build",
          dueDate: "2026-08-24",
          status: "In progress",
          deliverable: "Deployed dashboard link",
          facultyApproved: false,
          posterApproved: false,
        },
        {
          id: "ms-5",
          title: "Handover pack and walkthrough",
          dueDate: "2026-09-11",
          status: "Not started",
          deliverable: "Runbook, recorded walkthrough, final presentation",
          facultyApproved: false,
          posterApproved: false,
        },
      ],
      meetings: supplyMeetings,
      resources: [
        {
          name: "Inbound shipment extract (18 months)",
          kind: "Dataset · 240 MB",
          ndaTier: true,
        },
        {
          name: "Warehouse taxonomy reference",
          kind: "Document",
          ndaTier: false,
        },
        {
          name: "Partner staging database",
          kind: "Credentials",
          ndaTier: true,
          masked: "sc-staging.partner.internal · user sc_intern_jl",
        },
        {
          name: "Brand and reporting guidelines",
          kind: "Document",
          ndaTier: false,
        },
      ],
      posterContact: {
        name: "Mai Tran",
        role: "Head of Supply Chain Analytics",
        email: "mai.tran@partner-logistics.vn",
      },
      fullBrief: [
        "The partner runs a regional distribution network of eleven warehouses feeding roughly 1,400 retail points across northern Vietnam. Inbound shipment data lands in four systems that were never designed to talk to each other: a legacy ERP, two warehouse management tools acquired with regional operators, and a spreadsheet process still used for cross-border freight.",
        "The operational consequence is that nobody can answer, on any given morning, how much stock is genuinely in transit versus stalled at a depot. Planners compensate by over-ordering, which the finance team estimates ties up a material amount of working capital across the network.",
        "Your work is to build the first unified view. That means reconciling the four sources into a single warehouse schema, establishing which fields can be trusted from which system, and producing a forecast module that flags likely stockouts two weeks ahead. The dashboard is the visible deliverable, but the reconciliation logic underneath it is the part the partner will keep.",
        "You will have direct access to eighteen months of historical shipment data under NDA, and a weekly slot with the analytics team. The partner has been explicit that they would rather have a defensible, well-documented model over a sophisticated one they cannot maintain after handover.",
      ],
      facultyFeedback: null,
    },
  },
  {
    id: "app-energy",
    challengeId: "campus-energy-audit",
    stage: "IN_REVIEW",
    appliedAt: "2026-03-10",
    stageEnteredAt: "2026-07-18",
    facultySupervisorId: "fac-vu",
    team: energyTeam,
    nextAction: "Complete your reflection",
    nextActionDue: "2026-08-05",
    testResult: {
      track: "Cognitive",
      submittedAt: "2026-03-24",
      passed: true,
      overallBand: "Proficient",
      sections: [
        { name: "Numerical reasoning", band: "Strong" },
        { name: "Logical reasoning", band: "Proficient" },
        { name: "Verbal reasoning", band: "Proficient" },
        { name: "Situational judgement", band: "Proficient" },
      ],
      minutesTaken: 38,
    },
    offer: {
      invitedAt: "2026-04-05",
      respondBy: "2026-04-08T12:00:00Z",
      hoursPerWeek: 6,
      durationWeeks: 14,
      compensationNote: "Work-study · logged through the student employment office",
      ndaRequired: false,
      startDate: "2026-04-13",
    },
    project: {
      startedAt: "2026-04-13",
      milestones: [
        {
          id: "ms-e1",
          title: "Baseline consumption survey",
          dueDate: "2026-05-08",
          status: "Approved",
          deliverable: "Survey dataset + methodology note",
          facultyApproved: true,
          posterApproved: true,
        },
        {
          id: "ms-e2",
          title: "Building-level breakdown",
          dueDate: "2026-06-12",
          status: "Approved",
          deliverable: "Per-building consumption analysis",
          facultyApproved: true,
          posterApproved: true,
        },
        {
          id: "ms-e3",
          title: "Retrofit recommendations",
          dueDate: "2026-07-17",
          status: "Submitted",
          deliverable: "Final report with costed recommendations",
          facultyApproved: true,
          posterApproved: false,
        },
      ],
      meetings: energyMeetings,
      resources: [
        {
          name: "Campus meter readings 2024–2026",
          kind: "Dataset · 12 MB",
          ndaTier: false,
        },
        {
          name: "Facilities floor plans",
          kind: "Document",
          ndaTier: false,
        },
      ],
      posterContact: {
        name: "Dr. Hoang Vu",
        role: "Director, Campus Sustainability",
        email: "hoang.vu@vinuni.edu.vn",
      },
      fullBrief: [
        "VinUniversity has committed to a measurable reduction in campus energy consumption, but the estimates it currently reports are extrapolated from a small number of building-level meters rather than measured directly.",
        "This audit establishes the real baseline: what each building consumes, when, and how much of that is avoidable. The output feeds directly into the university's capital planning cycle, so the recommendations need to be costed, not just identified.",
      ],
      facultyFeedback: null,
    },
  },
  {
    id: "app-archive",
    challengeId: "archive-digitisation",
    stage: "COMPLETED",
    appliedAt: "2025-11-14",
    stageEnteredAt: "2026-05-29",
    // Not fac-tran: Dr. Bao Tran is this project's poster contact (the
    // University Librarian), and the same person cannot also be the faculty
    // supervisor signing their own project off.
    facultySupervisorId: "fac-pham",
    team: archiveTeam,
    nextAction: null,
    nextActionDue: null,
    testResult: {
      track: "Cognitive",
      submittedAt: "2025-12-02",
      passed: true,
      overallBand: "Proficient",
      sections: [
        { name: "Numerical reasoning", band: "Proficient" },
        { name: "Logical reasoning", band: "Proficient" },
        { name: "Verbal reasoning", band: "Strong" },
        { name: "Situational judgement", band: "Proficient" },
      ],
      minutesTaken: 43,
    },
    offer: {
      invitedAt: "2025-12-18",
      respondBy: "2025-12-21T12:00:00Z",
      hoursPerWeek: 6,
      durationWeeks: 16,
      compensationNote: "Credit · 2 elective credits recorded",
      ndaRequired: false,
      startDate: "2026-01-12",
    },
    project: {
      startedAt: "2026-01-12",
      milestones: [
        {
          id: "ms-a1",
          title: "Collection survey and prioritisation",
          dueDate: "2026-02-13",
          status: "Approved",
          deliverable: "Prioritised catalogue of holdings",
          facultyApproved: true,
          posterApproved: true,
        },
        {
          id: "ms-a2",
          title: "Digitisation pipeline",
          dueDate: "2026-04-03",
          status: "Approved",
          deliverable: "Scanning workflow + metadata schema",
          facultyApproved: true,
          posterApproved: true,
        },
        {
          id: "ms-a3",
          title: "Searchable archive handover",
          dueDate: "2026-05-22",
          status: "Approved",
          deliverable: "Deployed archive + maintenance runbook",
          facultyApproved: true,
          posterApproved: true,
        },
      ],
      meetings: archiveMeetings,
      resources: [
        {
          name: "Scanned holdings index",
          kind: "Dataset · 3 MB",
          ndaTier: false,
        },
        {
          name: "Metadata standard (Dublin Core profile)",
          kind: "Document",
          ndaTier: false,
        },
      ],
      posterContact: {
        name: "Dr. Bao Tran",
        role: "University Librarian",
        email: "bao.tran@vinuni.edu.vn",
      },
      fullBrief: [
        "The university's regional history collection exists only on paper, is consulted rarely because nobody can search it, and is deteriorating.",
        "This project built the digitisation pipeline and the searchable front end that replaced it, along with the runbook the library uses to continue the work.",
      ],
      // Closed but unreviewed — the faculty portal's write-feedback case.
      facultyFeedback: null,
    },
  },
  {
    id: "app-market",
    challengeId: "market-entry-case",
    stage: "SHORTLISTED",
    appliedAt: "2026-07-19",
    stageEnteredAt: "2026-07-26",
    facultySupervisorId: "fac-le",
    team: marketTeam,
    nextAction: "Waiting on the partner to release your test",
    nextActionDue: null,
    testResult: null,
    offer: null,
    project: null,
  },
  {
    id: "app-spectro",
    challengeId: "spectroscopy-pipeline",
    stage: "WITHDRAWN",
    appliedAt: "2026-06-11",
    stageEnteredAt: "2026-06-25",
    facultySupervisorId: "fac-rivera",
    team: soloTeam("Spectro", "Research"),
    nextAction: null,
    nextActionDue: null,
    testResult: null,
    offer: null,
    project: null,
  },
  {
    id: "app-outreach",
    challengeId: "community-health-outreach",
    stage: "APPLIED",
    appliedAt: "2026-07-25",
    stageEnteredAt: "2026-07-25",
    // Nominated but not yet accepted — see supervision-invites.ts.
    facultySupervisorId: "fac-pham",
    team: outreachTeam,
    nextAction: "Waiting on your supervisor to accept",
    nextActionDue: null,
    testResult: null,
    offer: null,
    project: null,
  },
];
