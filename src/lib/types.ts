/**
 * Domain types for the Solutions Studio marketplace.
 *
 * The taxonomy here is fixed by the PRD (§4) — colleges, challenge sub-types and
 * compensation kinds are used as filters, tags and routing inputs everywhere, so
 * they are literal unions rather than free strings.
 */

export type College = "CAS" | "CBM" | "CECS" | "CHS";

export const COLLEGES: College[] = ["CAS", "CBM", "CECS", "CHS"];

export const COLLEGE_NAMES: Record<College, string> = {
  CAS: "Arts & Sciences",
  CBM: "Business & Management",
  CECS: "Engineering & Computer Science",
  CHS: "Health Sciences",
};

export type ChallengeSubType =
  | "Project"
  | "Mini-Internship"
  | "Research Internship";

export const SUB_TYPES: ChallengeSubType[] = [
  "Project",
  "Mini-Internship",
  "Research Internship",
];

export type Compensation =
  | "Paid"
  | "Credit"
  | "Work-study"
  | "Unpaid"
  | "Prize";

export const COMPENSATIONS: Compensation[] = [
  "Paid",
  "Credit",
  "Work-study",
  "Unpaid",
  "Prize",
];

export type WorkMode = "On-site" | "Hybrid" | "Remote";

export const WORK_MODES: WorkMode[] = ["On-site", "Hybrid", "Remote"];

/**
 * Progressive disclosure tiers (PRD §5). v1 renders everything at T1 and locks
 * the rest; the tier is carried on each locked block so its copy can say what
 * unlocks it.
 */
export type DisclosureTier = "T0" | "T1" | "T2" | "T3";

export type AssessmentTrack =
  | "Cognitive"
  | "Technical"
  | "Cognitive + Case"
  | "Cognitive + Domain scenario";

export type PosterKind = "Company" | "Lab" | "Faculty";

export type SkillLevel = "must" | "nice";

export interface Skill {
  name: string;
  level: SkillLevel;
}

export interface LockedBlock {
  id: string;
  title: string;
  /** Which tier reveals this block — drives the unlock copy. */
  unlocksAt: DisclosureTier;
  unlockCopy: string;
  /** How many blurred silhouette lines to draw behind the lock overlay. */
  previewLines: number;
}

export interface Challenge {
  id: string;
  title: string;
  subType: ChallengeSubType;

  /** null when the poster is confidential — `orgCategory` shows instead. */
  orgName: string | null;
  orgCategory: string;
  confidential: boolean;
  posterKind: PosterKind;

  colleges: College[];
  domainTags: string[];

  durationWeeks: number;
  hoursPerWeek: number;
  workMode: WorkMode;
  compensation: Compensation;

  /** ISO dates. */
  postedAt: string;
  deadline: string;
  startDate: string;

  summary: string;
  responsibilities: string[];
  skills: Skill[];

  assessmentTrack: AssessmentTrack;
  assessmentMinutes: number;
  interviewFormat: string;

  /** Gating (PRD §6.4) — never hides the challenge, only disables applying. */
  minGpa: number | null;
  eligibleYears: number[];
  /** null means open to every college. */
  eligibleColleges: College[] | null;

  lockedBlocks: LockedBlock[];
  suggestedFacultyIds: string[];
  applicantCount: number;
}

export interface Faculty {
  id: string;
  name: string;
  title: string;
  college: College;
  department: string;
  researchAreas: string[];
  /** Supervision capacity (PRD §7.2) — a full supervisor cannot be nominated. */
  slotsUsed: number;
  slotsTotal: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  college: College;
  major: string;
  year: number;
  gpa: number;
  gpaScale: number;
  skills: string[];
  hoursAvailable: number;
  workPreference: WorkMode;
}

/** What the apply modal hands back on submit. */
export interface ApplicationDraft {
  challengeId: string;
  motivation: string;
  relevantExperience: string;
  hoursPerWeek: number;
  facultySupervisorId: string;
}

export interface EligibilityResult {
  eligible: boolean;
  /** Human-readable reasons, quoting the student's actual numbers. */
  reasons: string[];
}

/**
 * The application pipeline, following the cross-role swimlane diagram (phases
 * 3-6) rather than PRD §7.
 *
 * The two documents disagree and the diagram is the newer one. Notably it has no
 * faculty-approval gate on a student's application — faculty enter at challenge
 * review (2.4) and test approval (4.4), never to approve a student — so PRD §7's
 * PENDING_FACULTY and PENDING_CAID stages are absent here. The student still
 * nominates a supervisor when applying; that supervisor mentors in the workspace
 * (diagram 5.2) instead of gating entry.
 *
 * TEST_PENDING implies the partner proposed a test (4.2), CAID cleared it for
 * compliance (4.3) and faculty approved it (4.5) — all off-screen for the
 * student.
 */
export type ApplicationStage =
  | "APPLIED"
  | "SHORTLISTED"
  | "TEST_PENDING"
  | "TEST_SUBMITTED"
  | "INTERVIEW_SCHEDULING"
  | "INTERVIEW_SCHEDULED"
  | "INVITED"
  | "ACTIVE"
  | "IN_REVIEW"
  | "COMPLETED"
  | "NOT_SELECTED"
  | "WITHDRAWN"
  | "EXPIRED";

/** Pipeline order, terminal states last. Drives stepper position and sorting. */
export const STAGE_ORDER: ApplicationStage[] = [
  "APPLIED",
  "SHORTLISTED",
  "TEST_PENDING",
  "TEST_SUBMITTED",
  "INTERVIEW_SCHEDULING",
  "INTERVIEW_SCHEDULED",
  "INVITED",
  "ACTIVE",
  "IN_REVIEW",
  "COMPLETED",
  "NOT_SELECTED",
  "WITHDRAWN",
  "EXPIRED",
];

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  APPLIED: "Applied",
  SHORTLISTED: "Shortlisted",
  TEST_PENDING: "Test ready",
  TEST_SUBMITTED: "Test submitted",
  INTERVIEW_SCHEDULING: "Book interview",
  INTERVIEW_SCHEDULED: "Interview booked",
  INVITED: "Invitation sent",
  ACTIVE: "In progress",
  IN_REVIEW: "In review",
  COMPLETED: "Completed",
  NOT_SELECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
  EXPIRED: "Expired",
};

/** PRD §8.5: the student sees bands, never a raw percentile against peers. */
export type ScoreBand =
  | "Strong"
  | "Proficient"
  | "Developing"
  | "Below threshold";

export interface TestResult {
  track: AssessmentTrack;
  submittedAt: string;
  passed: boolean;
  overallBand: ScoreBand;
  sections: { name: string; band: ScoreBand }[];
  minutesTaken: number;
}

export interface Offer {
  invitedAt: string;
  /** ISO datetime — the accept deadline, so the countdown can show hours. */
  respondBy: string;
  hoursPerWeek: number;
  durationWeeks: number;
  compensationNote: string;
  ndaRequired: boolean;
  startDate: string;
}

export type MilestoneStatus =
  | "Not started"
  | "In progress"
  | "Submitted"
  | "Approved"
  | "Revision requested";

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  status: MilestoneStatus;
  deliverable: string;
  /** Dual sign-off (PRD D7) — both must approve at IN_REVIEW. */
  facultyApproved: boolean;
  posterApproved: boolean;
}

export type MeetingKind =
  | "Kickoff"
  | "Weekly sync"
  | "Milestone review"
  | "Supervisor 1:1"
  | "Final presentation";

export interface MeetingAttendee {
  name: string;
  /** "Faculty supervisor" / "Partner lead" / "You". */
  role: string;
}

/**
 * Scheduled contact on a live project. Standalone rather than a field on
 * Milestone: most meetings (kickoff, weekly sync, 1:1) have no milestone at
 * all, and the ones that do are a review *of* it rather than part of it.
 */
export interface Meeting {
  id: string;
  title: string;
  kind: MeetingKind;
  /** ISO datetime with an explicit Z — unlike the date-only fields elsewhere. */
  startsAt: string;
  durationMinutes: number;
  joinUrl: string;
  attendees: MeetingAttendee[];
  /** Set only on reviews — the milestone this meeting signs off. */
  milestoneId?: string;
}

export interface WorkspaceResource {
  name: string;
  kind: string;
  /** NDA-tier files stay gated even inside the workspace (PRD §11). */
  ndaTier: boolean;
  /** Credentials are masked with request-to-reveal, per PRD §11. */
  masked?: string;
}

export interface ProjectRecord {
  startedAt: string;
  milestones: Milestone[];
  /** May be empty; every live project has at least a kickoff in practice. */
  meetings: Meeting[];
  resources: WorkspaceResource[];
  /** T3 content — visible in the workspace and nowhere else. */
  posterContact: { name: string; role: string; email: string };
  /** The full brief the locked block has been promising all along. */
  fullBrief: string[];
}

export interface Application {
  id: string;
  challengeId: string;
  stage: ApplicationStage;

  /** ISO dates. */
  appliedAt: string;
  /** Last stage change — drives "most recent activity" ordering. */
  stageEnteredAt: string;

  /** Nominated at apply time; mentors in the workspace (diagram 5.2). */
  facultySupervisorId: string;

  /** The one thing the student must do or is waiting on. null when terminal. */
  nextAction: string | null;
  /** ISO date that action is due, when time-boxed. null otherwise. */
  nextActionDue: string | null;

  /** Present once TEST_SUBMITTED or later. */
  testResult: TestResult | null;
  /** Present from INVITED onward. */
  offer: Offer | null;
  /** Present from ACTIVE onward — the workspace record. */
  project: ProjectRecord | null;
}
