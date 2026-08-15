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
  /** Per person, not per team. */
  hoursPerWeek: number;
  /**
   * How many students the partner wants. Both 1 means solo — some research
   * internships genuinely are — so the apply flow enforces a range rather
   * than assuming everything is teamwork.
   */
  teamSizeMin: number;
  teamSizeMax: number;
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

  /**
   * The partner that owns this posting. Never rendered to a student — the
   * display identity is `orgName`/`orgCategory`/`confidential` above, which
   * deliberately hides the name on confidential posts. This is the join the
   * provider portal filters "your challenges" on.
   */
  orgId: string;
  /** Drafts are visible only in the provider portal, never in the marketplace. */
  status: ChallengeStatus;
}

/**
 * Where a posting sits in the partner's own workflow. Only `Published`
 * challenges reach the student marketplace; `Draft` and `In review` are the
 * states the posting flow moves through, and `Closed` is past its deadline.
 */
export type ChallengeStatus = "Draft" | "In review" | "Published" | "Closed";

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

/**
 * The partner that posts challenges — the provider portal's account holder.
 *
 * Introduced with the portal: until then a poster was only ever three loose
 * fields on Challenge (`orgName`, `orgCategory`, `confidential`), which is
 * enough to render a card but not enough to hang a login, a member list or
 * "your challenges" off. Those fields stay as the *display* identity, because
 * a confidential posting deliberately shows the category and hides the name;
 * `Challenge.orgId` is the real owner and is never rendered to a student.
 */
export interface Organization {
  id: string;
  name: string;
  /** Shown to students in place of the name on confidential postings. */
  category: string;
  kind: PosterKind;
  /** Two-letter monogram for the nav avatar. */
  initials: string;
  about: string;
  /** Who at the partner runs these engagements. */
  contact: { name: string; role: string; email: string };
}

/**
 * The roles a student can claim on a team. A fixed list rather than free text
 * so a team can be checked for gaps and teammates can be searched by role.
 */
export const TEAM_ROLES = [
  "Data & ML",
  "Backend",
  "Frontend",
  "Analysis",
  "Research",
  "Design",
  "Domain expert",
  "Coordination",
] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

/** Rough weekly shape, one slot per day. Enough to spot a shared afternoon. */
export type DayAvailability = "free" | "partly" | "busy";

export const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

/**
 * A course on the student's record. Registrar rows are the only thing in the
 * whole profile the university stands behind — everything else a student
 * types about themselves is a claim, and the UI must never blur the two.
 */
export interface Course {
  id: string;
  title: string;
  code: string;
  term: string;
  credits: number | null;
  /** Null for self-added courses, which also stay out of the GPA. */
  grade: string | null;
  source: "registrar" | "self";
}

export type ExperienceKind =
  | "Internship"
  | "Research"
  | "Teaching"
  | "Part-time"
  | "Volunteering"
  | "Other";

export interface Experience {
  id: string;
  kind: ExperienceKind;
  role: string;
  organisation: string;
  /** "Jun 2025" — month precision is all anyone fills in honestly. */
  from: string;
  /** Null while ongoing. */
  to: string | null;
  summary: string | null;
  skills: string[];
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
  /** Short self-introduction. Null until the student writes one. */
  about: string | null;
  creditsEarned: number;
  /** The registrar's own PDF — the profile links out rather than restating it. */
  transcriptUrl: string;
  /** Last registrar sync, ISO date. Shown next to the verified mark. */
  recordSyncedAt: string;
  portfolioUrl: string | null;
  /** How this student works on a team — read by the apply flow. */
  usualRoles: TeamRole[];
  preferredTeamMin: number;
  preferredTeamMax: number;
  /** Seven entries, Monday first. */
  weeklyAvailability: DayAvailability[];
  /**
   * Courses the student has chosen to showcase — `Course.id` references.
   *
   * Opt-in disclosure: GPA and the full transcript stay private from partners,
   * but a student can volunteer specific evidence of strength in an area. The
   * provider portal renders these and nothing else from the academic record.
   */
  pinnedCourseIds: string[];
}

/** A showcased course as a partner sees it — no term, no credits, no GPA. */
export interface PinnedCourse {
  code: string;
  title: string;
  grade: string;
}

/**
 * A student as the provider portal sees them.
 *
 * Deliberately its own shape rather than `Student` or `Peer`, because the
 * three roles see three different slices. `Peer` is what a classmate sees
 * (roles and availability — enough to decide about teaming up). This adds the
 * things a partner needs to judge fit — skills, assessment band, showcased
 * courses — and still withholds GPA, transcript and any raw score.
 */
export interface DirectoryStudent {
  id: string;
  name: string;
  major: string;
  year: number;
  college: College;
  about: string | null;
  skills: string[];
  roles: TeamRole[];
  hoursAvailable: number;
  weeklyAvailability: DayAvailability[];
  /** Null when they have never sat one. Never a raw score. */
  assessmentBand: ScoreBand | null;
  pinnedCourses: PinnedCourse[];
  /** Two live challenges is the Studio's cap — a full student can't be invited. */
  liveChallenges: number;
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
  /** Written by the faculty supervisor once the project is COMPLETED; null until then. */
  facultyFeedback: string | null;
  /**
   * The partner's close-out review. Deliberately a separate field from
   * `facultyFeedback` rather than a shared shape: the two are written by
   * different people, at different moments, about different things — faculty
   * assess the learning, the partner assesses the work delivered.
   *
   * Optional rather than required-nullable so existing project fixtures read
   * as "no partner feedback yet" without a backfill. Absent and null mean the
   * same thing; read it through `partnerFeedbackOf()` in lib/provider.ts.
   */
  partnerFeedback?: PartnerFeedback | null;
}

/**
 * What the partner records when a project closes.
 *
 * Bands rather than a numeric rating, matching PRD §8.5 on the assessment
 * side: the student sees how they were rated, so the vocabulary has to be one
 * they already understand and one that cannot be turned into a league table.
 */
export interface PartnerFeedback {
  submittedAt: string;
  qualityBand: ScoreBand;
  reliabilityBand: ScoreBand;
  wouldHostAgain: WouldHostAgain;
  /** Shared with the student and the faculty supervisor. */
  note: string;
  /** Visible to CAID only — never rendered on a student-facing screen. */
  privateNote: string | null;
}

export type WouldHostAgain = "Yes" | "With reservations" | "No";

export type SupervisionInviteStatus = "pending" | "accepted" | "declined";

/**
 * A team's request that a faculty member supervise their application —
 * issued when the student nominates a supervisor at apply time
 * (`ApplicationDraft.facultySupervisorId`) and outstanding until the faculty
 * responds. Kept separate from `Application`/`ApplicationStage` rather than
 * folded in: accepting or declining supervision doesn't gate the pipeline —
 * per the diagram, faculty mentors from the workspace (5.2), they don't
 * approve the application itself.
 */
export interface SupervisionInvite {
  id: string;
  applicationId: string;
  facultyId: string;
  status: SupervisionInviteStatus;
  /** ISO date the team nominated this faculty. */
  requestedAt: string;
  /** ISO date the faculty is expected to respond by. */
  respondBy: string;
}

export type InviteStatus = "leader" | "accepted" | "invited" | "declined";

/**
 * One student on one team. Roles are per-team rather than copied off the
 * profile: the role you play depends on who else is with you.
 */
export interface TeamMember {
  studentId: string;
  name: string;
  major: string;
  year: number;
  college: College;
  role: TeamRole;
  hoursAvailable: number;
  weeklyAvailability: DayAvailability[];
  status: InviteStatus;
  /** ISO date the invite went out. Null for the leader. */
  invitedAt: string | null;
}

/**
 * A team exists for exactly one application. Two challenges mean two teams
 * even with identical people — the pipeline, assessment and offer all hang
 * off a single application, and a shared team would have to straddle them.
 */
export interface Team {
  name: string;
  members: TeamMember[];
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

  /**
   * Who is applying. Always present — a solo application is a team of one,
   * which keeps every downstream screen from carrying two code paths.
   */
  team: Team;

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
