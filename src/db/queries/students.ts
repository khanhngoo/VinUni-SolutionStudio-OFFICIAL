import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  facultyProfiles,
  projectMembers,
  projects,
  studentCourses,
  studentPreferredRoles,
  studentProfiles,
  studentProjects,
  studentSkills,
  skills,
  users,
} from "@/db/schema";

export type StudentQueryDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A classmate, as another student sees them while building a team.
 *
 * Deliberately narrower than the row behind it: no GPA, no transcript, no
 * email. The Studio cap is two concurrent projects, so `liveChallenges` is
 * what tells the inviter whether this person has a seat left at all.
 */
export interface PeerRead {
  fullName: string;
  hoursAvailable: number | null;
  liveChallenges: number;
  major: string | null;
  roles: string[];
  school: string | null;
  studyYear: number | null;
  userId: bigint;
  weeklyAvailability: string[] | null;
}

/**
 * A student as a *partner* sees them, which is a third and narrower view
 * again: bands rather than scores, and only the courses the student chose to
 * pin. The privacy boundary lives here in the query rather than in the
 * component, so no caller can widen it by accident.
 */
export interface DirectoryStudentRead extends PeerRead {
  about: string | null;
  pinnedCourses: { code: string; grade: string | null; title: string }[];
  skills: string[];
}

/** Concurrent unfinished projects per student, which is what the cap counts. */
function liveProjectCounts(database: StudentQueryDatabase, studentIds: bigint[]) {
  if (studentIds.length === 0) return Promise.resolve([]);

  return database
    .select({
      count: sql<number>`count(*)::int`,
      studentId: projectMembers.studentId,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(
      and(
        inArray(projectMembers.studentId, studentIds),
        inArray(projects.status, ["ACTIVE", "PAUSED", "FINAL_REVIEW"])
      )
    )
    .groupBy(projectMembers.studentId);
}

function rolesFor(database: StudentQueryDatabase, studentIds: bigint[]) {
  if (studentIds.length === 0) return Promise.resolve([]);

  return database
    .select({ role: studentPreferredRoles.role, studentId: studentPreferredRoles.studentId })
    .from(studentPreferredRoles)
    .where(inArray(studentPreferredRoles.studentId, studentIds));
}

async function decorate(
  database: StudentQueryDatabase,
  base: {
    fullName: string;
    hoursAvailable: number | null;
    major: string | null;
    school: string | null;
    studyYear: number | null;
    userId: bigint;
    weeklyAvailability: unknown;
  }[]
): Promise<PeerRead[]> {
  const ids = base.map((row) => row.userId);
  const [roleRows, liveRows] = await Promise.all([
    rolesFor(database, ids),
    liveProjectCounts(database, ids),
  ]);

  const rolesByStudent = new Map<string, string[]>();
  for (const row of roleRows) {
    const key = String(row.studentId);
    rolesByStudent.set(key, [...(rolesByStudent.get(key) ?? []), row.role]);
  }

  const liveByStudent = new Map<string, number>();
  for (const row of liveRows) {
    liveByStudent.set(String(row.studentId), row.count);
  }

  return base.map((row) => ({
    fullName: row.fullName,
    hoursAvailable: row.hoursAvailable,
    liveChallenges: liveByStudent.get(String(row.userId)) ?? 0,
    major: row.major,
    roles: rolesByStudent.get(String(row.userId)) ?? [],
    school: row.school,
    studyYear: row.studyYear,
    userId: row.userId,
    weeklyAvailability: Array.isArray(row.weeklyAvailability)
      ? (row.weeklyAvailability as string[])
      : null,
  }));
}

/**
 * Everyone the viewer could invite onto a team — that is, every student but
 * themselves. Ordering puts the most available first, which is the order the
 * invite picker opens on.
 */
export async function listInvitablePeers(
  database: StudentQueryDatabase,
  viewerUserId: bigint
): Promise<PeerRead[]> {
  const base = await database
    .select({
      fullName: users.fullName,
      hoursAvailable: studentProfiles.availableHoursPerWeek,
      major: studentProfiles.major,
      school: studentProfiles.school,
      studyYear: studentProfiles.studyYear,
      userId: studentProfiles.userId,
      weeklyAvailability: studentProfiles.weeklyAvailability,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .where(and(ne(studentProfiles.userId, viewerUserId), eq(users.status, "ACTIVE")))
    .orderBy(sql`${studentProfiles.availableHoursPerWeek} desc nulls last`, users.fullName);

  return decorate(database, base);
}

/**
 * The partner-facing directory. Same people, less of them visible: pinned
 * courses only, and no academic record beyond that.
 */
export async function listDirectoryStudents(
  database: StudentQueryDatabase
): Promise<DirectoryStudentRead[]> {
  const base = await database
    .select({
      about: studentProfiles.about,
      fullName: users.fullName,
      hoursAvailable: studentProfiles.availableHoursPerWeek,
      major: studentProfiles.major,
      school: studentProfiles.school,
      studyYear: studentProfiles.studyYear,
      userId: studentProfiles.userId,
      weeklyAvailability: studentProfiles.weeklyAvailability,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .where(eq(users.status, "ACTIVE"))
    .orderBy(users.fullName);

  const peers = await decorate(database, base);
  const ids = base.map((row) => row.userId);

  const [courseRows, skillRows] = await Promise.all([
    ids.length === 0
      ? []
      : database
          .select({
            code: studentCourses.code,
            grade: studentCourses.grade,
            studentId: studentCourses.studentId,
            title: studentCourses.title,
          })
          .from(studentCourses)
          .where(and(inArray(studentCourses.studentId, ids), eq(studentCourses.pinned, true))),
    ids.length === 0
      ? []
      : database
          .select({
            raw: studentSkills.rawSkillName,
            canonical: skills.canonicalName,
            studentId: studentSkills.studentId,
          })
          .from(studentSkills)
          .leftJoin(skills, eq(skills.id, studentSkills.skillId))
          .where(inArray(studentSkills.studentId, ids)),
  ]);

  const coursesByStudent = new Map<string, DirectoryStudentRead["pinnedCourses"]>();
  for (const row of courseRows) {
    const key = String(row.studentId);
    coursesByStudent.set(key, [
      ...(coursesByStudent.get(key) ?? []),
      { code: row.code, grade: row.grade, title: row.title },
    ]);
  }

  const skillsByStudent = new Map<string, string[]>();
  for (const row of skillRows) {
    const name = row.canonical ?? row.raw;
    if (!name) continue;
    const key = String(row.studentId);
    skillsByStudent.set(key, [...(skillsByStudent.get(key) ?? []), name]);
  }

  const aboutByStudent = new Map<string, string | null>();
  for (const row of base) aboutByStudent.set(String(row.userId), row.about);

  return peers.map((peer) => ({
    ...peer,
    about: aboutByStudent.get(String(peer.userId)) ?? null,
    pinnedCourses: coursesByStudent.get(String(peer.userId)) ?? [],
    skills: skillsByStudent.get(String(peer.userId)) ?? [],
  }));
}

export interface FacultyOptionRead {
  department: string | null;
  fullName: string;
  maxActiveSupervisions: number | null;
  school: string | null;
  slotsUsed: number;
  title: string | null;
  userId: bigint;
}

/**
 * Faculty a student may nominate as supervisor, with the load each is already
 * carrying. `slotsUsed` counts unfinished supervised projects, so the picker
 * can show who is at capacity rather than letting a student pick someone who
 * will only decline.
 */
export async function listFacultyOptions(
  database: StudentQueryDatabase
): Promise<FacultyOptionRead[]> {
  const base = await database
    .select({
      department: facultyProfiles.department,
      fullName: users.fullName,
      maxActiveSupervisions: facultyProfiles.maxActiveSupervisions,
      school: facultyProfiles.school,
      title: facultyProfiles.academicTitle,
      userId: facultyProfiles.userId,
    })
    .from(facultyProfiles)
    .innerJoin(users, eq(users.id, facultyProfiles.userId))
    .where(eq(users.status, "ACTIVE"))
    .orderBy(users.fullName);

  const ids = base.map((row) => row.userId);
  const loadRows =
    ids.length === 0
      ? []
      : await database
          .select({
            count: sql<number>`count(*)::int`,
            facultyId: projects.facultySupervisorId,
          })
          .from(projects)
          .where(
            and(
              inArray(projects.facultySupervisorId, ids),
              inArray(projects.status, ["ACTIVE", "PAUSED", "FINAL_REVIEW"])
            )
          )
          .groupBy(projects.facultySupervisorId);

  const loadByFaculty = new Map<string, number>();
  for (const row of loadRows) {
    if (row.facultyId === null) continue;
    loadByFaculty.set(String(row.facultyId), row.count);
  }

  return base.map((row) => ({
    ...row,
    slotsUsed: loadByFaculty.get(String(row.userId)) ?? 0,
  }));
}

/**
 * Resolves invited user ids to the emails `createApplication` matches members
 * on.
 *
 * Kept separate from `listInvitablePeers` on purpose: the invite picker runs in
 * the browser and has no business receiving classmates' email addresses, so the
 * client invites by id and only the server ever sees the mapping. Ids that do
 * not belong to an active student simply do not come back, which is what lets
 * the caller reject them.
 */
export async function resolveStudentEmailsByUserId(
  database: StudentQueryDatabase,
  userIds: bigint[]
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const rows = await database
    .select({ email: users.email, userId: studentProfiles.userId })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .where(and(inArray(studentProfiles.userId, userIds), eq(users.status, "ACTIVE")));

  return new Map(rows.map((row) => [String(row.userId), row.email]));
}

export interface StudentTeamProfileRead {
  hoursAvailable: number | null;
  major: string | null;
  roles: string[];
  school: string | null;
  studyYear: number | null;
  weeklyAvailability: string[] | null;
}

/**
 * The viewer's own team-facing details, which `listInvitablePeers` cannot
 * supply because it excludes them by definition. Used to build the leader row
 * of a new application's roster from real data rather than placeholders.
 */
export async function getStudentTeamProfile(
  database: StudentQueryDatabase,
  userId: bigint
): Promise<StudentTeamProfileRead | null> {
  const [profile] = await database
    .select({
      hoursAvailable: studentProfiles.availableHoursPerWeek,
      major: studentProfiles.major,
      school: studentProfiles.school,
      studyYear: studentProfiles.studyYear,
      weeklyAvailability: studentProfiles.weeklyAvailability,
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, userId))
    .limit(1);

  if (!profile) return null;

  const roleRows = await database
    .select({ role: studentPreferredRoles.role })
    .from(studentPreferredRoles)
    .where(eq(studentPreferredRoles.studentId, userId));

  return {
    ...profile,
    roles: roleRows.map((row) => row.role),
    weeklyAvailability: Array.isArray(profile.weeklyAvailability)
      ? (profile.weeklyAvailability as string[])
      : null,
  };
}

/**
 * Team-facing details for several students at once, keyed by user id as a
 * string. Used where a roster is already in hand and only the availability and
 * default roles are missing — an application's members, for instance, which
 * carry their per-application role but not their weekly shape.
 */
export async function listStudentTeamProfiles(
  database: StudentQueryDatabase,
  userIds: bigint[]
): Promise<Map<string, StudentTeamProfileRead>> {
  if (userIds.length === 0) return new Map();

  const profiles = await database
    .select({
      hoursAvailable: studentProfiles.availableHoursPerWeek,
      major: studentProfiles.major,
      school: studentProfiles.school,
      studyYear: studentProfiles.studyYear,
      userId: studentProfiles.userId,
      weeklyAvailability: studentProfiles.weeklyAvailability,
    })
    .from(studentProfiles)
    .where(inArray(studentProfiles.userId, userIds));

  const roleRows = await database
    .select({ role: studentPreferredRoles.role, studentId: studentPreferredRoles.studentId })
    .from(studentPreferredRoles)
    .where(inArray(studentPreferredRoles.studentId, userIds));

  const rolesByStudent = new Map<string, string[]>();
  for (const row of roleRows) {
    const key = String(row.studentId);
    rolesByStudent.set(key, [...(rolesByStudent.get(key) ?? []), row.role]);
  }

  return new Map(
    profiles.map((profile) => [
      String(profile.userId),
      {
        hoursAvailable: profile.hoursAvailable,
        major: profile.major,
        roles: rolesByStudent.get(String(profile.userId)) ?? [],
        school: profile.school,
        studyYear: profile.studyYear,
        weeklyAvailability: Array.isArray(profile.weeklyAvailability)
          ? (profile.weeklyAvailability as string[])
          : null,
      },
    ])
  );
}

export interface StudentRecordRead {
  about: string | null;
  courses: {
    code: string;
    credits: number | null;
    grade: string | null;
    id: string;
    pinned: boolean;
    source: string;
    term: string | null;
    title: string;
  }[];
  creditsEarned: number | null;
  email: string;
  experiences: {
    description: string | null;
    endDate: string | null;
    id: string;
    kind: string | null;
    organisation: string | null;
    roleDescription: string | null;
    startDate: string | null;
    title: string;
  }[];
  fullName: string;
  gpa: number | null;
  gpaScale: number | null;
  hoursAvailable: number | null;
  major: string | null;
  portfolioUrl: string | null;
  preferredTeamMax: number | null;
  preferredTeamMin: number | null;
  recordSyncedAt: Date | null;
  roles: string[];
  school: string | null;
  skills: string[];
  studyYear: number | null;
  transcriptUrl: string | null;
  userId: bigint;
  weeklyAvailability: string[] | null;
  workPreference: string | null;
}

/**
 * The student's own record, in full.
 *
 * This is the widest of the three views of a person and the only one that may
 * carry a GPA or a transcript link, because it is the only one the student
 * themselves is looking at. `listInvitablePeers` and `listDirectoryStudents`
 * are the narrower two, and none of them is derived from this one — each
 * query decides its own scope.
 */
export async function getStudentRecord(
  database: StudentQueryDatabase,
  userId: bigint
): Promise<StudentRecordRead | null> {
  const [base] = await database
    .select({
      about: studentProfiles.about,
      creditsEarned: studentProfiles.creditsEarned,
      email: users.email,
      fullName: users.fullName,
      gpa: studentProfiles.gpa,
      gpaScale: studentProfiles.gpaScale,
      hoursAvailable: studentProfiles.availableHoursPerWeek,
      major: studentProfiles.major,
      portfolioUrl: studentProfiles.portfolioUrl,
      preferredTeamMax: studentProfiles.preferredTeamMax,
      preferredTeamMin: studentProfiles.preferredTeamMin,
      recordSyncedAt: studentProfiles.academicDataVerifiedAt,
      school: studentProfiles.school,
      studyYear: studentProfiles.studyYear,
      transcriptUrl: studentProfiles.transcriptUrl,
      userId: studentProfiles.userId,
      weeklyAvailability: studentProfiles.weeklyAvailability,
      workPreference: studentProfiles.workPreference,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .where(eq(studentProfiles.userId, userId))
    .limit(1);

  if (!base) return null;

  const [courseRows, experienceRows, roleRows, skillRows] = await Promise.all([
    database
      .select({
        code: studentCourses.code,
        credits: studentCourses.credits,
        grade: studentCourses.grade,
        id: studentCourses.id,
        pinned: studentCourses.pinned,
        source: studentCourses.source,
        term: studentCourses.term,
        title: studentCourses.title,
      })
      .from(studentCourses)
      .where(eq(studentCourses.studentId, userId))
      .orderBy(desc(studentCourses.term), studentCourses.code),
    database
      .select({
        description: studentProjects.description,
        endDate: studentProjects.endDate,
        id: studentProjects.id,
        kind: studentProjects.kind,
        organisation: studentProjects.organisation,
        roleDescription: studentProjects.roleDescription,
        startDate: studentProjects.startDate,
        title: studentProjects.title,
      })
      .from(studentProjects)
      .where(eq(studentProjects.studentId, userId))
      .orderBy(desc(studentProjects.startDate)),
    database
      .select({ role: studentPreferredRoles.role })
      .from(studentPreferredRoles)
      .where(eq(studentPreferredRoles.studentId, userId)),
    database
      .select({ canonical: skills.canonicalName, raw: studentSkills.rawSkillName })
      .from(studentSkills)
      .leftJoin(skills, eq(skills.id, studentSkills.skillId))
      .where(eq(studentSkills.studentId, userId)),
  ]);

  return {
    ...base,
    courses: courseRows.map((row) => ({ ...row, id: String(row.id) })),
    experiences: experienceRows.map((row) => ({ ...row, id: String(row.id) })),
    roles: roleRows.map((row) => row.role),
    skills: skillRows
      .map((row) => row.canonical ?? row.raw)
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => a.localeCompare(b)),
    weeklyAvailability: Array.isArray(base.weeklyAvailability)
      ? (base.weeklyAvailability as string[])
      : null,
  };
}
