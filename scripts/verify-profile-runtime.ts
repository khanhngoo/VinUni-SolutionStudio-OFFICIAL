import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "../src/db";
import { studentPreferredRoles, studentProfiles } from "../src/db/schema";
import { getStudentRecord } from "../src/db/queries/students";
import { toStudent } from "../src/lib/apply-view";
import { profileStrength, registrarCourses } from "../src/lib/profile";
import { saveStudentProfile, StudentProfileError } from "../src/services/student-profile.service";
import { getAuthenticatedActorForVerification } from "./_actor";

const ROLLBACK = new Error("rollback");
const STUDENT = "student.jordan-lee.demo@example.test";

/**
 * Checks the profile read and the save path.
 *
 * The invariants worth guarding are the ones a UI can be talked out of: the
 * three-role cap and the seven-slot week. The second matters most -- the team
 * helpers intersect availability positionally, so a six-slot array would read
 * as "busy on Sunday" rather than as missing.
 */
async function main() {
  const failures: string[] = [];
  const actor = await getAuthenticatedActorForVerification(STUDENT);

  const record = await getStudentRecord(db, actor.user.userId);
  if (!record) { console.error("no record"); process.exit(1); }

  const student = toStudent(record);
  console.log(`${student.name} · ${student.major} · y${student.year} · GPA ${student.gpa}/${student.gpaScale}`);
  console.log(`  roles=[${student.usualRoles.join(", ")}] team ${student.preferredTeamMin}-${student.preferredTeamMax} ${student.hoursAvailable}h ${student.workPreference}`);
  console.log(`  week=${JSON.stringify(student.weeklyAvailability)}`);
  console.log(`  courses=${record.courses.length} (registrar ${registrarCourses(record.courses.map((c) => ({ ...c, source: c.source === "REGISTRAR" ? "registrar" : "self", credits: c.credits, grade: c.grade, term: c.term ?? "", title: c.title, code: c.code, id: c.id }))).length}) experiences=${record.experiences.length} skills=${record.skills.length}`);

  const strength = profileStrength(student, { courseCount: record.courses.length, experienceCount: record.experiences.length });
  console.log(`  completeness ${strength.done}/${strength.total} (${strength.percent}%) next=${strength.next?.label ?? "nothing"}`);

  if (student.weeklyAvailability.length !== 7) failures.push("adapted week is not 7 slots");
  if (student.gpa === 0) failures.push("GPA did not survive the adapter");

  // --- save path, rolled back ---
  try {
    await db.transaction(async (tx) => {
      await saveStudentProfile({
        about: "Updated by the verification script.",
        hoursAvailable: 12,
        portfolioUrl: "https://example.test/portfolio",
        preferredTeamMax: 5,
        preferredTeamMin: 2,
        roles: ["BACKEND", "DESIGN"],
        weeklyAvailability: ["FREE", "FREE", "BUSY", "PARTLY", "FREE", "BUSY", "FREE"],
        workPreference: "REMOTE",
      }, actor, { database: tx });

      const [row] = await tx.select({ about: studentProfiles.about, hours: studentProfiles.availableHoursPerWeek, mode: studentProfiles.workPreference, week: studentProfiles.weeklyAvailability }).from(studentProfiles).where(eq(studentProfiles.userId, actor.user.userId));
      const roles = await tx.select({ role: studentPreferredRoles.role }).from(studentPreferredRoles).where(eq(studentPreferredRoles.studentId, actor.user.userId));
      console.log(`\nsaved: ${row.hours}h ${row.mode} roles=[${roles.map((r) => r.role).join(", ")}] week=${JSON.stringify(row.week)}`);
      if (roles.length !== 2) failures.push("roles were not replaced wholesale");
      if (row.mode !== "REMOTE") failures.push("work mode did not save");
      throw ROLLBACK;
    });
  } catch (e) { if (e !== ROLLBACK) throw e; }

  // --- the two rules the server must not accept ---
  const rejects: [string, Parameters<typeof saveStudentProfile>[0]][] = [
    ["four roles", { about: "", hoursAvailable: 10, portfolioUrl: "", preferredTeamMax: 4, preferredTeamMin: 2, roles: ["BACKEND", "DESIGN", "RESEARCH", "ANALYSIS"], weeklyAvailability: ["FREE","FREE","FREE","FREE","FREE","FREE","FREE"], workPreference: "REMOTE" }],
    ["six-slot week", { about: "", hoursAvailable: 10, portfolioUrl: "", preferredTeamMax: 4, preferredTeamMin: 2, roles: ["BACKEND"], weeklyAvailability: ["FREE","FREE","FREE","FREE","FREE","FREE"], workPreference: "REMOTE" }],
    ["bogus role", { about: "", hoursAvailable: 10, portfolioUrl: "", preferredTeamMax: 4, preferredTeamMin: 2, roles: ["ADMIN"], weeklyAvailability: ["FREE","FREE","FREE","FREE","FREE","FREE","FREE"], workPreference: "REMOTE" }],
    ["inverted team size", { about: "", hoursAvailable: 10, portfolioUrl: "", preferredTeamMax: 1, preferredTeamMin: 5, roles: [], weeklyAvailability: ["FREE","FREE","FREE","FREE","FREE","FREE","FREE"], workPreference: "REMOTE" }],
  ];
  console.log("");
  for (const [label, input] of rejects) {
    try {
      await db.transaction(async (tx) => { await saveStudentProfile(input, actor, { database: tx }); throw ROLLBACK; });
      failures.push(`${label} was accepted`);
    } catch (e) {
      if (e === ROLLBACK) { failures.push(`${label} was accepted`); continue; }
      if (e instanceof StudentProfileError) console.log(`rejected ${label}: ${e.details.join(" ")}`);
      else throw e;
    }
  }

  if (failures.length > 0) { console.error("\nFAILED:"); for (const f of failures) console.error(`  - ${f}`); process.exit(1); }
  console.log("\nProfile reads, saves, and refuses what it should.");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
