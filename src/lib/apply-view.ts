import type { DirectoryStudentRead, FacultyOptionRead, PeerRead } from "@/db/queries/students";
import type { Peer } from "@/lib/data/peers";
import {
  challengeDeliverables,
  challengeDomainTags,
  type MarketplaceChallengeDetailModel,
} from "@/lib/challenge-marketplace";
import type {
  AssessmentTrack,
  Challenge,
  ChallengeSubType,
  College,
  Compensation,
  DayAvailability,
  DirectoryStudent,
  Faculty,
  InviteStatus,
  ScoreBand,
  Team,
  TeamRole,
  WorkMode,
} from "@/lib/types";

/**
 * The seam between the database and the prototype's view models.
 *
 * The apply wizard, the team helpers in `src/lib/teams.ts` and the partner
 * deck are all typed against `src/lib/types.ts`, while the marketplace screens
 * are typed against `challenge-marketplace.ts`. Rather than retype either side,
 * this module converts at the page boundary — one place that knows both
 * vocabularies, so neither set of components has to.
 *
 * Nothing here invents data. Where the database has no answer the field goes
 * to a null or an empty list and the component's own empty state handles it.
 */

const TEAM_ROLE_LABELS: Record<string, TeamRole> = {
  ANALYSIS: "Analysis",
  BACKEND: "Backend",
  COORDINATION: "Coordination",
  DATA_ML: "Data & ML",
  DESIGN: "Design",
  DOMAIN_EXPERT: "Domain expert",
  FRONTEND: "Frontend",
  RESEARCH: "Research",
};

const AVAILABILITY_LABELS: Record<string, DayAvailability> = {
  BUSY: "busy",
  FREE: "free",
  PARTLY: "partly",
};

const COLLEGES: College[] = ["CAS", "CBM", "CECS", "CHS"];

/** A week where nothing is known reads as unknown, not as free. */
const UNKNOWN_WEEK: DayAvailability[] = ["partly", "partly", "partly", "partly", "partly", "partly", "partly"];

export function toTeamRole(value: string): TeamRole | null {
  return TEAM_ROLE_LABELS[value] ?? null;
}

export function toTeamRoleEnum(value: TeamRole): string | null {
  const found = Object.entries(TEAM_ROLE_LABELS).find(([, label]) => label === value);
  return found ? found[0] : null;
}

export function toCollege(school: string | null | undefined): College {
  const match = COLLEGES.find((college) => college === school);
  // Every seeded student has one of the four; a stray value falls back rather
  // than throwing, since a college label is not worth failing a page over.
  return match ?? "CECS";
}

export function toWeek(slots: string[] | null | undefined): DayAvailability[] {
  if (!slots || slots.length !== 7) return UNKNOWN_WEEK;
  return slots.map((slot) => AVAILABILITY_LABELS[slot] ?? "partly");
}

function toRoles(values: string[]): TeamRole[] {
  return values.map(toTeamRole).filter((role): role is TeamRole => role !== null);
}

export function toPeer(row: PeerRead): Peer {
  return {
    college: toCollege(row.school),
    hoursAvailable: row.hoursAvailable ?? 0,
    id: String(row.userId),
    liveChallenges: row.liveChallenges,
    major: row.major ?? "—",
    name: row.fullName,
    roles: toRoles(row.roles),
    weeklyAvailability: toWeek(row.weeklyAvailability),
    year: row.studyYear ?? 0,
  };
}

export function toDirectoryStudent(
  row: DirectoryStudentRead,
  assessmentBand: ScoreBand | null = null
): DirectoryStudent {
  return {
    about: row.about,
    assessmentBand,
    college: toCollege(row.school),
    hoursAvailable: row.hoursAvailable ?? 0,
    id: String(row.userId),
    liveChallenges: row.liveChallenges,
    major: row.major ?? "—",
    name: row.fullName,
    pinnedCourses: row.pinnedCourses.map((course) => ({
      code: course.code,
      grade: course.grade ?? "—",
      title: course.title,
    })),
    roles: toRoles(row.roles),
    skills: row.skills,
    weeklyAvailability: toWeek(row.weeklyAvailability),
    year: row.studyYear ?? 0,
  };
}

export function toFaculty(row: FacultyOptionRead): Faculty {
  return {
    college: toCollege(row.school),
    department: row.department ?? "—",
    id: String(row.userId),
    name: row.fullName,
    // Research areas have no column yet; the picker shows department instead.
    researchAreas: [],
    slotsTotal: row.maxActiveSupervisions ?? 0,
    slotsUsed: row.slotsUsed,
    title: row.title ?? "Faculty",
  };
}

/** The roster an application starts from: the applicant, alone. */
export function soloTeamFor(input: {
  college: College;
  hoursAvailable: number;
  major: string;
  name: string;
  role: TeamRole;
  studentId: string;
  teamName: string;
  weeklyAvailability: DayAvailability[];
  year: number;
}): Team {
  return {
    name: input.teamName,
    members: [
      {
        college: input.college,
        hoursAvailable: input.hoursAvailable,
        invitedAt: null,
        major: input.major,
        name: input.name,
        role: input.role,
        status: "leader",
        studentId: input.studentId,
        weeklyAvailability: input.weeklyAvailability,
        year: input.year,
      },
    ],
  };
}

const WORK_MODE_LABELS: Record<string, WorkMode> = {
  HYBRID: "Hybrid",
  ONSITE: "On-site",
  REMOTE: "Remote",
};

const COMPENSATION_LABELS: Record<string, Compensation> = {
  CREDIT: "Credit",
  NOT_SPECIFIED: "Unpaid",
  PAID: "Paid",
  PRIZE: "Prize",
  UNPAID: "Unpaid",
  WORK_STUDY: "Work-study",
};

/**
 * The database derives a track label from the question types actually present
 * ("Technical" / "Cognitive" / "Mixed assessment"); the prototype's union is a
 * fixed set of four. Anything that is not a clean match reads as Cognitive,
 * which is the conservative option — it never promises a technical screen the
 * assessment does not contain.
 */
function toAssessmentTrack(label: string | null): AssessmentTrack {
  if (label === "Technical") return "Technical";
  return "Cognitive";
}

function toChallengeSubType(subtype: string | null): ChallengeSubType {
  if (subtype === "Mini-Internship") return "Mini-Internship";
  if (subtype === "Research Internship") return "Research Internship";
  return "Project";
}

/**
 * The challenge as the wizard's validation and team arithmetic need it.
 *
 * Several fields on the prototype's `Challenge` are presentation concerns the
 * wizard never reads — `lockedBlocks`, `applicantCount`, `postedAt`. They are
 * filled from the detail model where it has them and left empty where it does
 * not, rather than being faked.
 */
export function toApplyChallenge(detail: MarketplaceChallengeDetailModel): Challenge {
  const schools = detail.eligibilitySummary.schools ?? [];
  const eligibleColleges = schools
    .map((school) => COLLEGES.find((college) => college === school))
    .filter((college): college is College => Boolean(college));

  return {
    applicantCount: detail.applicantCount,
    assessmentMinutes: detail.assessmentSummary?.timeLimitMinutes ?? 0,
    assessmentTrack: toAssessmentTrack(detail.assessmentSummary?.trackLabel ?? null),
    colleges: eligibleColleges,
    compensation: COMPENSATION_LABELS[detail.compensationType] ?? "Unpaid",
    confidential: !detail.ownerOrganization.nameIsPublic,
    deadline: detail.applicationDeadline
      ? new Date(detail.applicationDeadline).toISOString()
      : "",
    domainTags: challengeDomainTags(detail),
    durationWeeks: detail.durationWeeks ?? 0,
    eligibleColleges: eligibleColleges.length > 0 ? eligibleColleges : null,
    eligibleYears: detail.eligibilitySummary.studyYears ?? [],
    hoursPerWeek: detail.weeklyHours ?? 0,
    id: detail.slug,
    interviewFormat: detail.interviewFormat ?? "",
    // Locked blocks are derived per viewer by `src/lib/disclosure.ts`, not
    // carried on the challenge. The wizard never renders them.
    lockedBlocks: [],
    minGpa: detail.eligibilitySummary.minGpa ?? null,
    orgCategory: detail.ownerOrganization.industry ?? "Partner",
    // The owner's internal id is deliberately not exposed on the read model,
    // and nothing in the wizard needs it.
    orgId: "",
    orgName: detail.ownerOrganization.nameIsPublic
      ? detail.ownerOrganization.displayName
      : null,
    posterKind:
      detail.ownerOrganization.organizationType === "INTERNAL_UNIT" ? "Lab" : "Company",
    postedAt: "",
    responsibilities: challengeDeliverables(detail),
    skills: detail.skills.map((skill) => ({
      level: skill.requirementType === "REQUIRED" ? "must" : "nice",
      name: skill.canonicalName,
    })),
    startDate: detail.startDate ?? "",
    status: "Published",
    subType: toChallengeSubType(detail.subtype),
    // Faculty assignments carry a display name but no id on the read model,
    // so there is nothing to pre-select against; the picker lists everyone.
    suggestedFacultyIds: [],
    summary: detail.summary,
    teamSizeMax: detail.teamSizeMax ?? 0,
    teamSizeMin: detail.teamSizeMin ?? 0,
    title: detail.title,
    workMode: WORK_MODE_LABELS[detail.workMode ?? ""] ?? "Hybrid",
  };
}

/**
 * An application's roster as the team components render it.
 *
 * `preferredRole` on the membership is the authority for what someone does on
 * *this* team; their profile default is only the fallback. Availability comes
 * from the profile, since it is a property of the person rather than of the
 * application.
 */
export function toTeam(
  teamName: string | null,
  members: {
    fullName: string;
    invitedAt: Date | null;
    memberRole: string;
    preferredRole: string | null;
    status: string;
    student: {
      availableHoursPerWeek: number | null;
      major: string | null;
      school: string | null;
      studyYear: number | null;
      userId: bigint;
    };
  }[],
  profiles: Map<string, { roles: string[]; weeklyAvailability: string[] | null }>
): Team {
  return {
    name: teamName ?? "Unnamed team",
    members: members.map((member) => {
      const profile = profiles.get(String(member.student.userId));
      const fallbackRole = toTeamRole(profile?.roles[0] ?? "");
      return {
        college: toCollege(member.student.school),
        hoursAvailable: member.student.availableHoursPerWeek ?? 0,
        invitedAt: member.invitedAt ? member.invitedAt.toISOString().slice(0, 10) : null,
        major: member.student.major ?? "—",
        name: member.fullName,
        role: asTeamRole(member.preferredRole) ?? fallbackRole ?? "Coordination",
        status: toInviteStatus(member.memberRole, member.status),
        studentId: String(member.student.userId),
        weeklyAvailability: toWeek(profile?.weeklyAvailability),
        year: member.student.studyYear ?? 0,
      };
    }),
  };
}

/** `preferred_role` is free text; only a value that is actually a team role counts. */
function asTeamRole(value: string | null): TeamRole | null {
  if (!value) return null;
  return (Object.values(TEAM_ROLE_LABELS) as string[]).includes(value)
    ? (value as TeamRole)
    : null;
}

function toInviteStatus(memberRole: string, status: string): InviteStatus {
  if (memberRole === "LEADER") return "leader";
  if (status === "ACCEPTED") return "accepted";
  if (status === "DECLINED") return "declined";
  return "invited";
}
