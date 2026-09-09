import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "../src/db";
import {
  studentCourses,
  studentPreferredRoles,
  studentProfiles,
  studentProjects,
  users,
} from "../src/db/schema";

/**
 * Checks the profile data the seed writes for the screens that render it:
 * /profile, /profile/edit, the apply wizard's team-fit arithmetic and the
 * partner student directory.
 *
 * The assertions that matter are the invariants, not the counts. A SELF course
 * must never carry a grade, because GPA is computed over registrar rows only;
 * and weekly availability must be exactly seven slots, because the team
 * helpers intersect the arrays positionally and a short one would silently
 * read as "busy on Sunday".
 */
async function main() {
  const failures: string[] = [];

  const profiles = await db
    .select({
      availability: studentProfiles.weeklyAvailability,
      credits: studentProfiles.creditsEarned,
      name: users.fullName,
      teamMax: studentProfiles.preferredTeamMax,
      teamMin: studentProfiles.preferredTeamMin,
      work: studentProfiles.workPreference,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId));

  console.log(`student profiles: ${profiles.length}`);
  for (const profile of profiles) {
    const slots = profile.availability ?? [];
    console.log(
      `  ${profile.name.padEnd(18)} ${JSON.stringify(slots)} ${profile.work ?? "—"} team ${profile.teamMin}-${profile.teamMax} ${profile.credits}cr`
    );
    if (slots.length !== 7) {
      failures.push(`${profile.name}: weekly availability has ${slots.length} slots, expected 7`);
    }
    if (profile.teamMin && profile.teamMax && profile.teamMin > profile.teamMax) {
      failures.push(`${profile.name}: preferred team min exceeds max`);
    }
  }

  const courses = await db
    .select({
      code: studentCourses.code,
      grade: studentCourses.grade,
      name: users.fullName,
      pinned: studentCourses.pinned,
      source: studentCourses.source,
      title: studentCourses.title,
    })
    .from(studentCourses)
    .innerJoin(users, eq(users.id, studentCourses.studentId));

  const graded = courses.filter((course) => course.source === "SELF" && course.grade !== null);
  if (graded.length > 0) {
    failures.push(`${graded.length} SELF course row(s) carry a grade and would pollute GPA`);
  }

  const jordan = courses.filter((course) => course.name === "Jordan Lee");
  console.log(`\nJordan's transcript (${jordan.length} rows):`);
  for (const course of jordan) {
    console.log(
      `  ${course.code.padEnd(10)} ${course.title.padEnd(32)} ${(course.grade ?? "—").padEnd(4)} ${course.source}${course.pinned ? "  PINNED" : ""}`
    );
  }

  const pinned = courses.filter((course) => course.pinned);
  console.log(`\npinned courses (the only ones a partner may read): ${pinned.length}`);
  if (pinned.length === 0) {
    failures.push("no pinned courses — partner directory cards would show none");
  }

  const roles = await db
    .select({ name: users.fullName, role: studentPreferredRoles.role })
    .from(studentPreferredRoles)
    .innerJoin(users, eq(users.id, studentPreferredRoles.studentId));
  console.log(`preferred roles: ${roles.length}`);

  const experiences = await db
    .select({ kind: studentProjects.kind, organisation: studentProjects.organisation, title: studentProjects.title })
    .from(studentProjects);
  const withKind = experiences.filter((row) => row.kind !== null);
  console.log(`experiences with a kind: ${withKind.length} of ${experiences.length}`);

  if (failures.length > 0) {
    console.error("\nFAILED:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log("\nAll student profile seed invariants hold.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
