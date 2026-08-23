import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import {
  getAuthenticatedActor,
  hasActorCapability,
} from "@/auth/authenticated-actor";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { db } from "@/db";
import { skills, studentProfiles, studentSkills } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");

  const { actor } = resolution;

  if (!hasActorCapability(actor, "STUDENT")) {
    return (
      <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
        <h1>Profile unavailable</h1>
        <p className="text-ink-2 mt-2">
          Student profile details are available only to authenticated student accounts.
        </p>
        <Link className="inline-block font-semibold mt-4" href="/challenges">
          Browse challenges
        </Link>
      </div>
    );
  }

  const [profile, skillRows] = await Promise.all([
    db
      .select({
        availableHoursPerWeek: studentProfiles.availableHoursPerWeek,
        gpa: studentProfiles.gpa,
        gpaScale: studentProfiles.gpaScale,
        interests: studentProfiles.interests,
        major: studentProfiles.major,
        portfolioUrl: studentProfiles.portfolioUrl,
        school: studentProfiles.school,
        studyYear: studentProfiles.studyYear,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, actor.user.userId))
      .limit(1),
    db
      .select({
        canonicalName: skills.canonicalName,
        rawSkillName: studentSkills.rawSkillName,
      })
      .from(studentSkills)
      .leftJoin(skills, eq(skills.id, studentSkills.skillId))
      .where(eq(studentSkills.studentId, actor.user.userId))
      .orderBy(asc(skills.canonicalName), asc(studentSkills.rawSkillName)),
  ]);

  const student = profile[0];
  if (!student) {
    return (
      <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
        <h1>Profile unavailable</h1>
        <p className="text-ink-2 mt-2">
          Your student profile is not configured yet.
        </p>
      </div>
    );
  }

  const skillsForProfile = skillRows
    .map((skill) => skill.canonicalName ?? skill.rawSkillName)
    .filter((skill): skill is string => Boolean(skill));

  return (
    <div className="max-w-[900px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <header className="border-b border-line pb-5">
        <h1>{actor.user.fullName}</h1>
        <p className="text-ink-2 mt-1">{actor.user.email}</p>
        <p className="text-ink-2 mt-3">
          {[student.major, student.school, student.studyYear ? `Year ${student.studyYear}` : null]
            .filter(Boolean)
            .join(" · ") || "Student profile"}
        </p>
      </header>

      <div className="grid gap-7 lg:grid-cols-2 mt-7">
        <Section title="Academic information">
          <dl className="space-y-2 text-ink-2">
            <ProfileFact label="School" value={student.school} />
            <ProfileFact label="Major" value={student.major} />
            <ProfileFact
              label="Study year"
              value={student.studyYear ? `Year ${student.studyYear}` : null}
            />
            <ProfileFact
              label="GPA"
              value={
                student.gpa !== null && student.gpaScale !== null
                  ? `${student.gpa.toFixed(2)} / ${student.gpaScale.toFixed(1)}`
                  : null
              }
            />
          </dl>
        </Section>

        <Section title="Availability">
          <ProfileFact
            label="Available time"
            value={
              student.availableHoursPerWeek !== null
                ? `${student.availableHoursPerWeek} hours per week`
                : null
            }
          />
        </Section>
      </div>

      <Section title="About">
        <p className="text-ink-2">
          {student.interests ?? "No introduction has been added yet."}
        </p>
      </Section>

      <Section title="Skills">
        {skillsForProfile.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {skillsForProfile.map((skill) => (
              <Chip key={skill}>{skill}</Chip>
            ))}
          </div>
        ) : (
          <p className="text-ink-2">No skills have been added yet.</p>
        )}
      </Section>

      {student.portfolioUrl ? (
        <Section title="Portfolio">
          <a href={student.portfolioUrl} rel="noreferrer" target="_blank">
            Open portfolio
          </a>
        </Section>
      ) : null}
    </div>
  );
}

function ProfileFact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-3">{label}</dt>
      <dd className="font-semibold text-ink">{value ?? "Not provided"}</dd>
    </div>
  );
}
