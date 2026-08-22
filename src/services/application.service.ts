import { db } from "@/db";
import {
  getApplicationByChallengeAndStudent,
  getApplicationByPublicId,
  listApplicationsForChallenge,
  listApplicationsForStudent,
  type ApplicationDetailRead,
  type ApplicationListItemRead,
  type ApplicationMemberStatus,
} from "@/db/queries/applications";
import {
  findDuplicateApplicationMemberships,
  getApplicationWriteActorByEmail,
  getApplicationWriteChallengeBySlug,
  insertApplication,
  insertApplicationMembers,
  selectChallengeEligibilityRulesForWrite,
  selectStudentProfileByUserId,
  selectStudentProfilesByEmails,
  type ApplicationMemberInsertValues,
  type ApplicationMutationDatabase,
  type ApplicationWriteActorRecord,
  type ApplicationWriteChallenge,
  type StudentApplicationProfile,
} from "@/db/mutations/applications";
import { evaluateChallengeEligibility } from "@/services/challenge-policy";
import {
  canAccessApplicationDetail,
  canAccessChallengeApplications,
} from "@/services/application-policy";

export type ApplicationErrorCode =
  | "CONFLICT"
  | "FORBIDDEN"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    message: string,
    public readonly details: string[] = []
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export type DevelopmentApplicationActorKey =
  | "BAO_STUDENT_DEMO"
  | "BENCANG_CONTACT_DEMO"
  | "CAID_ADMIN_DEMO"
  | "ELAB_ADMIN_DEMO"
  | "HOANG_STUDENT_DEMO"
  | "JORDAN_STUDENT_DEMO"
  | "PRIYA_STUDENT_DEMO";

export interface ApplicationActorContext {
  email: string;
  fullName: string;
  isStudent: boolean;
  memberships: ApplicationWriteActorRecord["memberships"];
  source: "DEVELOPMENT_ONLY" | "AUTHENTICATED";
  userId: bigint;
}

export interface ApplicationMemberInput {
  availabilityConfirmed?: boolean | null;
  committedHoursPerWeek?: number | null;
  preferredRole?: string | null;
  status?: Extract<ApplicationMemberStatus, "ACCEPTED" | "INVITED">;
  studentEmail: string;
}

export interface CreateApplicationInput {
  challengeSlug: string;
  leaderAvailabilityConfirmed?: boolean | null;
  leaderCommittedHoursPerWeek?: number | null;
  leaderPreferredRole?: string | null;
  members?: ApplicationMemberInput[];
  motivation: string;
  relevantExperience?: string | null;
  teamName?: string | null;
}

export interface ApplicationServiceListItem {
  challenge: {
    applicationDeadline: Date | null;
    managingOrganizationName: string;
    ownerOrganizationName: string;
    publicId: string;
    slug: string;
    title: string;
  };
  createdAt: Date | null;
  memberSummary: ApplicationListItemRead["memberSummary"];
  publicId: string;
  status: ApplicationListItemRead["status"];
  submittedAt: Date | null;
  submittedByName: string;
  teamName: string | null;
  updatedAt: Date | null;
}

export interface ApplicationServiceDetail extends ApplicationServiceListItem {
  assessmentSummaries: ApplicationDetailRead["assessmentSummaries"];
  members: Array<{
    availabilityConfirmed: boolean | null;
    committedHoursPerWeek: number | null;
    email: string;
    fullName: string;
    invitedAt: Date | null;
    memberRole: string;
    preferredRole: string | null;
    respondedAt: Date | null;
    status: string;
    student: {
      availableHoursPerWeek: number | null;
      major: string | null;
      school: string | null;
      studyYear: number | null;
    };
  }>;
  motivation: string | null;
  offerSummary: ApplicationDetailRead["offerSummary"];
  projectSummary: ApplicationDetailRead["projectSummary"];
  relevantExperience: string | null;
  supervisionRequests: Array<{
    comments: string | null;
    faculty: {
      academicTitle: string | null;
      department: string | null;
      fullName: string;
    };
    requestedAt: Date | null;
    respondBy: Date | null;
    respondedAt: Date | null;
    status: string;
  }>;
}

interface ApplicationServiceOptions {
  database?: ApplicationMutationDatabase;
  now?: Date;
}

const DEVELOPMENT_ACTOR_EMAILS: Record<DevelopmentApplicationActorKey, string> = {
  BAO_STUDENT_DEMO: "student.bao-tran.demo@example.test",
  BENCANG_CONTACT_DEMO: "contact.bencang.demo@example.test",
  CAID_ADMIN_DEMO: "caid.admin.dev@example.test",
  ELAB_ADMIN_DEMO: "elab.admin.dev@example.test",
  HOANG_STUDENT_DEMO: "student.hoang-tran.demo@example.test",
  JORDAN_STUDENT_DEMO: "student.jordan-lee.demo@example.test",
  PRIYA_STUDENT_DEMO: "student.priya-raman.demo@example.test",
};

const APPLICATION_OPEN_STATUSES = ["APPLICATIONS_OPEN"];

export async function getDevelopmentApplicationActor(
  key: DevelopmentApplicationActorKey,
  options: ApplicationServiceOptions = {}
): Promise<ApplicationActorContext> {
  const actor = await getApplicationWriteActorByEmail(
    options.database ?? db,
    DEVELOPMENT_ACTOR_EMAILS[key]
  );

  if (!actor) {
    throw new ApplicationError(
      "NOT_FOUND",
      `Development application actor ${key} was not found.`
    );
  }

  return toActorContext(actor, "DEVELOPMENT_ONLY");
}

export async function listMyApplications(
  actor: ApplicationActorContext,
  options: ApplicationServiceOptions = {}
): Promise<ApplicationServiceListItem[]> {
  assertStudentActor(actor);

  const rows = await listApplicationsForStudent(options.database ?? db, actor.userId);
  return rows.map(toServiceListItem);
}

export async function getApplicationDetail(
  publicId: string,
  actor: ApplicationActorContext,
  options: ApplicationServiceOptions = {}
): Promise<ApplicationServiceDetail | null> {
  const application = await getApplicationByPublicId(
    options.database ?? db,
    publicId.trim()
  );
  if (!application) return null;

  if (!canAccessApplicationDetail(application, actor)) {
    throw new ApplicationError(
      "FORBIDDEN",
      "Actor cannot access this application."
    );
  }

  return toServiceDetail(application);
}

export async function listChallengeApplications(
  challengeSlug: string,
  actor: ApplicationActorContext,
  options: ApplicationServiceOptions = {}
): Promise<ApplicationServiceListItem[]> {
  const database = options.database ?? db;
  const challenge = await getApplicationWriteChallengeBySlug(database, challengeSlug);
  if (!challenge) throw notFound("Challenge was not found.");

  if (
    !canAccessChallengeApplications(
      {
        managingOrganizationId: challenge.managingOrganizationId,
        ownerOrganizationId: challenge.ownerOrganizationId,
      },
      actor
    )
  ) {
    throw new ApplicationError(
      "FORBIDDEN",
      "Actor cannot access applications for this challenge."
    );
  }

  const rows = await listApplicationsForChallenge(database, challengeSlug);
  return rows.map(toServiceListItem);
}

export async function getMyApplicationForChallenge(
  challengeSlug: string,
  actor: ApplicationActorContext,
  options: ApplicationServiceOptions = {}
): Promise<ApplicationServiceDetail | null> {
  assertStudentActor(actor);

  const application = await getApplicationByChallengeAndStudent(
    options.database ?? db,
    challengeSlug,
    actor.userId
  );

  return application ? toServiceDetail(application) : null;
}

export async function createApplication(
  input: CreateApplicationInput,
  actor: ApplicationActorContext,
  options: ApplicationServiceOptions = {}
): Promise<ApplicationServiceDetail> {
  assertStudentActor(actor);

  return withApplicationTransaction(options.database ?? db, async (tx) => {
    const now = options.now ?? new Date();
    const challenge = await requireChallenge(tx, input.challengeSlug);
    const normalized = normalizeCreateInput(input);

    validateChallengeAcceptsApplications(challenge, now);

    const leader = await selectStudentProfileByUserId(tx, actor.userId);
    if (!leader) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Actor must have a student profile to submit an application."
      );
    }

    const members = await resolveMemberInputs(tx, normalized.members, actor);
    const allMembers = [leader, ...members.map((member) => member.profile)];

    validateTeamShape(normalized, challenge, allMembers.length);
    await validateNoDuplicateApplications(tx, challenge, allMembers);
    await validateLeaderEligibility(tx, challenge, leader);

    const application = await insertApplication(tx, {
      challengeId: challenge.id,
      motivation: normalized.motivation,
      relevantExperience: normalized.relevantExperience,
      status: "SUBMITTED",
      submittedAt: now,
      submittedBy: actor.userId,
      teamName: normalized.teamName,
    });

    await insertApplicationMembers(tx, [
      {
        applicationId: application.id,
        availabilityConfirmed: normalized.leaderAvailabilityConfirmed,
        committedHoursPerWeek: normalized.leaderCommittedHoursPerWeek,
        memberRole: "LEADER",
        preferredRole: normalized.leaderPreferredRole,
        respondedAt: now,
        status: "ACCEPTED",
        studentId: actor.userId,
      },
      ...members.map((member): ApplicationMemberInsertValues => ({
        applicationId: application.id,
        availabilityConfirmed: member.input.availabilityConfirmed,
        committedHoursPerWeek: member.input.committedHoursPerWeek,
        invitedAt: now,
        memberRole: "MEMBER",
        preferredRole: member.input.preferredRole,
        respondedAt: member.input.status === "ACCEPTED" ? now : null,
        status: member.input.status ?? "INVITED",
        studentId: member.profile.userId,
      })),
    ]);

    const created = await getApplicationByPublicId(tx, application.publicId);
    if (!created) throw notFound("Application disappeared during creation.");

    return toServiceDetail(created);
  });
}

function toActorContext(
  actor: ApplicationWriteActorRecord,
  source: ApplicationActorContext["source"]
): ApplicationActorContext {
  return {
    email: actor.email,
    fullName: actor.fullName,
    isStudent: actor.isStudent,
    memberships: actor.memberships,
    source,
    userId: actor.userId,
  };
}

async function withApplicationTransaction<T>(
  database: ApplicationMutationDatabase,
  callback: (tx: ApplicationMutationDatabase) => Promise<T>
) {
  if (hasTransaction(database)) {
    return database.transaction((tx) => callback(tx));
  }

  return callback(database);
}

function hasTransaction(
  database: ApplicationMutationDatabase
): database is typeof db {
  return "transaction" in database && typeof database.transaction === "function";
}

function assertStudentActor(actor: ApplicationActorContext) {
  if (!actor.isStudent) {
    throw new ApplicationError(
      "FORBIDDEN",
      "Application operation requires an explicit student actor."
    );
  }
}

async function requireChallenge(
  database: ApplicationMutationDatabase,
  slug: string
) {
  const challenge = await getApplicationWriteChallengeBySlug(database, slug);
  if (!challenge) throw notFound("Challenge was not found.");
  return challenge;
}

function normalizeCreateInput(input: CreateApplicationInput) {
  const members = input.members ?? [];
  return {
    challengeSlug: input.challengeSlug.trim(),
    leaderAvailabilityConfirmed: input.leaderAvailabilityConfirmed ?? null,
    leaderCommittedHoursPerWeek: input.leaderCommittedHoursPerWeek ?? null,
    leaderPreferredRole: cleanOptional(input.leaderPreferredRole),
    members: members.map((member) => ({
      availabilityConfirmed: member.availabilityConfirmed ?? null,
      committedHoursPerWeek: member.committedHoursPerWeek ?? null,
      preferredRole: cleanOptional(member.preferredRole),
      status: member.status ?? "INVITED",
      studentEmail: member.studentEmail.trim().toLowerCase(),
    })),
    motivation: input.motivation.trim(),
    relevantExperience: cleanOptional(input.relevantExperience),
    teamName: cleanOptional(input.teamName),
  };
}

async function resolveMemberInputs(
  database: ApplicationMutationDatabase,
  members: ReturnType<typeof normalizeCreateInput>["members"],
  actor: ApplicationActorContext
) {
  const errors: string[] = [];
  const memberEmails = members.map((member) => member.studentEmail);
  const uniqueMemberEmails = new Set(memberEmails);

  if (uniqueMemberEmails.size !== memberEmails.length) {
    errors.push("Duplicate team member emails are not allowed.");
  }

  if (uniqueMemberEmails.has(actor.email.toLowerCase())) {
    errors.push("The submitting actor is already the accepted leader.");
  }

  for (const member of members) {
    if (!member.studentEmail) errors.push("Every team member needs an email.");
    if (member.status !== "ACCEPTED" && member.status !== "INVITED") {
      errors.push("Team members can only be ACCEPTED or INVITED at creation.");
    }
    validateCommittedHours(member.committedHoursPerWeek, errors);
  }

  if (errors.length > 0) validationError(errors);

  const profiles = await selectStudentProfilesByEmails(database, memberEmails);
  const byEmail = new Map(
    profiles.map((profile) => [profile.email.toLowerCase(), profile])
  );
  const missing = memberEmails.filter((email) => !byEmail.has(email));
  if (missing.length > 0) {
    validationError([`Unknown student email(s): ${missing.join(", ")}.`]);
  }

  return members.map((input) => ({
    input,
    profile: byEmail.get(input.studentEmail)!,
  }));
}

function validateTeamShape(
  input: ReturnType<typeof normalizeCreateInput>,
  challenge: ApplicationWriteChallenge,
  totalMembers: number
) {
  const errors: string[] = [];
  if (!input.challengeSlug) errors.push("Challenge slug is required.");
  if (!input.motivation) errors.push("Motivation is required.");

  validateCommittedHours(input.leaderCommittedHoursPerWeek, errors);

  if (totalMembers > 1 && !input.teamName) {
    errors.push("Team applications require a team name.");
  }

  const min = challenge.teamSizeMin ?? 1;
  const max = challenge.teamSizeMax ?? Number.POSITIVE_INFINITY;
  if (totalMembers < min) {
    errors.push(`Team has ${totalMembers} member(s), below minimum ${min}.`);
  }
  if (totalMembers > max) {
    errors.push(`Team has ${totalMembers} member(s), above maximum ${max}.`);
  }

  if (errors.length > 0) validationError(errors);
}

function validateChallengeAcceptsApplications(
  challenge: ApplicationWriteChallenge,
  now: Date
) {
  if (!APPLICATION_OPEN_STATUSES.includes(challenge.status)) {
    throw new ApplicationError(
      "INVALID_TRANSITION",
      `Challenge ${challenge.slug ?? challenge.title} is not accepting applications.`,
      [`Current challenge status: ${challenge.status}`]
    );
  }

  if (challenge.applicationDeadline && now > challenge.applicationDeadline) {
    throw new ApplicationError(
      "INVALID_TRANSITION",
      "Application deadline has passed.",
      [`Deadline: ${challenge.applicationDeadline.toISOString()}`]
    );
  }
}

async function validateNoDuplicateApplications(
  database: ApplicationMutationDatabase,
  challenge: ApplicationWriteChallenge,
  members: StudentApplicationProfile[]
) {
  const duplicates = await findDuplicateApplicationMemberships(
    database,
    challenge.id,
    members.map((member) => member.userId)
  );

  if (duplicates.length > 0) {
    throw new ApplicationError(
      "CONFLICT",
      "A proposed member already belongs to an active application for this challenge.",
      duplicates.map(
        (duplicate) =>
          `${duplicate.studentId.toString()} in ${duplicate.applicationPublicId}`
      )
    );
  }
}

async function validateLeaderEligibility(
  database: ApplicationMutationDatabase,
  challenge: ApplicationWriteChallenge,
  leader: StudentApplicationProfile
) {
  const rules = await selectChallengeEligibilityRulesForWrite(database, challenge.id);
  const evaluation = evaluateChallengeEligibility(rules, {
    activeProjectCount: leader.activeProjectCount,
    availableHoursPerWeek: leader.availableHoursPerWeek,
    gpa: leader.gpa,
    gpaScale: leader.gpaScale,
    major: leader.major,
    school: leader.school,
    studyYear: leader.studyYear,
  });

  if (evaluation.status === "INELIGIBLE") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Submitting student does not satisfy required challenge eligibility.",
      evaluation.rules
        .filter((rule) => rule.required && rule.result === "FAILED")
        .map((rule) => `${rule.ruleType}: ${rule.reason}`)
    );
  }
}

function validateCommittedHours(value: number | null | undefined, errors: string[]) {
  if (value === null || value === undefined) return;
  if (!Number.isInteger(value) || value < 1 || value > 168) {
    errors.push("Committed hours per week must be an integer between 1 and 168.");
  }
}

function toServiceListItem(row: ApplicationListItemRead): ApplicationServiceListItem {
  return {
    challenge: {
      applicationDeadline: row.challenge.applicationDeadline,
      managingOrganizationName: row.challenge.managingOrganization.name,
      ownerOrganizationName: row.challenge.ownerOrganization.name,
      publicId: row.challenge.publicId,
      slug: row.challenge.slug,
      title: row.challenge.title,
    },
    createdAt: row.createdAt,
    memberSummary: row.memberSummary,
    publicId: row.publicId,
    status: row.status,
    submittedAt: row.submittedAt,
    submittedByName: row.submittedBy.fullName,
    teamName: row.teamName,
    updatedAt: row.updatedAt,
  };
}

function toServiceDetail(row: ApplicationDetailRead): ApplicationServiceDetail {
  return {
    ...toServiceListItem(row),
    assessmentSummaries: row.assessmentSummaries,
    members: row.members.map((member) => ({
      availabilityConfirmed: member.availabilityConfirmed,
      committedHoursPerWeek: member.committedHoursPerWeek,
      email: member.email,
      fullName: member.fullName,
      invitedAt: member.invitedAt,
      memberRole: member.memberRole,
      preferredRole: member.preferredRole,
      respondedAt: member.respondedAt,
      status: member.status,
      student: {
        availableHoursPerWeek: member.student.availableHoursPerWeek,
        major: member.student.major,
        school: member.student.school,
        studyYear: member.student.studyYear,
      },
    })),
    motivation: row.motivation,
    offerSummary: row.offerSummary,
    projectSummary: row.projectSummary,
    relevantExperience: row.relevantExperience,
    supervisionRequests: row.supervisionRequests.map((request) => ({
      comments: request.comments,
      faculty: {
        academicTitle: request.faculty.academicTitle,
        department: request.faculty.department,
        fullName: request.faculty.fullName,
      },
      requestedAt: request.requestedAt,
      respondBy: request.respondBy,
      respondedAt: request.respondedAt,
      status: request.status,
    })),
  };
}

function validationError(details: string[]): never {
  throw new ApplicationError(
    "VALIDATION_ERROR",
    "Application validation failed.",
    details
  );
}

function notFound(message: string): ApplicationError {
  return new ApplicationError("NOT_FOUND", message);
}

function cleanOptional(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}
