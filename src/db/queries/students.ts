import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  facultyProfiles,
  projectMembers,
  projects,
  studentCourses,
  studentPreferredRoles,
  studentProfiles,
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
