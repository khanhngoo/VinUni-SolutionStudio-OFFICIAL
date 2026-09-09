import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getAuthenticatedActor,
  hasActorCapability,
} from "@/auth/authenticated-actor";
import { CompletenessPanel } from "@/components/profile/completeness-panel";
import { CourseTable } from "@/components/profile/course-table";
import { ExperienceList } from "@/components/profile/experience-list";
import { ProfileRail } from "@/components/profile/profile-rail";
import { TeamPreferences } from "@/components/profile/team-preferences";
import { VerifiedMark } from "@/components/profile/verified-mark";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { db } from "@/db";
import { getStudentRecord } from "@/db/queries/students";
import { toStudent } from "@/lib/apply-view";
import { formatDate } from "@/lib/dates";
import { recentCourses, registrarCourses } from "@/lib/profile";
import type { Course, Experience, ExperienceKind } from "@/lib/types";
import { listWorkspaceProjects } from "@/services/workspace.service";
import { toApplicationActorContext } from "@/services/application.service";

export const dynamic = "force-dynamic";

const COURSE_PREVIEW = 3;

const EXPERIENCE_KINDS: Record<string, ExperienceKind> = {
  INTERNSHIP: "Internship",
  OTHER: "Other",
  PART_TIME: "Part-time",
  RESEARCH: "Research",
  TEACHING: "Teaching",
  VOLUNTEERING: "Volunteering",
};

/**
 * The student's own record. Two halves, and the line between them is the
 * point of the page: the registrar's data carries a verified mark and cannot
 * be edited here, everything else is the student's own account of themselves.
 */
export default async function ProfilePage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");

  const { actor } = resolution;

  if (!hasActorCapability(actor, "STUDENT")) {
    return (
      <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
        <h1>Profile unavailable</h1>
        <p className="text-ink-2 mt-2">
          A student profile belongs to a student account. Yours is signed in as
          something else.
        </p>
        <Link className="inline-block font-semibold mt-4" href="/challenges">
          Browse challenges
        </Link>
      </div>
    );
  }

  const record = await getStudentRecord(db, actor.user.userId);
  if (!record) {
    return (
      <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
        <h1>Profile unavailable</h1>
        <p className="text-ink-2 mt-2">Your student profile is not set up yet.</p>
      </div>
    );
  }

  const student = toStudent(record);
  const courses: Course[] = record.courses.map((course) => ({
    code: course.code,
    credits: course.credits,
    grade: course.grade,
    id: course.id,
    source: course.source === "REGISTRAR" ? "registrar" : "self",
    term: course.term ?? "—",
    title: course.title,
  }));

  const experiences: Experience[] = record.experiences.map((entry) => ({
    from: entry.startDate ? formatDate(entry.startDate) : "—",
    id: entry.id,
    kind: EXPERIENCE_KINDS[entry.kind ?? ""] ?? "Other",
    organisation: entry.organisation ?? "—",
    role: entry.roleDescription ?? entry.title,
    skills: [],
    summary: entry.description,
    to: entry.endDate ? formatDate(entry.endDate) : null,
  }));

  const counts = {
    courseCount: courses.length,
    experienceCount: experiences.length,
  };
  const preview = recentCourses(courses, COURSE_PREVIEW);
  const totalRegistrar = registrarCourses(courses).length;

  // Studio work is neither registrar data nor a claim — faculty and partner
  // signed these milestones off inside the product, so it gets its own block.
  const studio = await listWorkspaceProjects(toApplicationActorContext(actor));

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <div className="grid gap-8 lg:grid-cols-[212px_1fr]">
        <ProfileRail counts={counts} student={student} />

        <div className="min-w-0">
          <CompletenessPanel counts={counts} student={student} />

          <Section title="About">
            {student.about ? (
              <p className="text-ink-2">{student.about}</p>
            ) : (
              <p className="text-ink-3">
                Nothing yet.{" "}
                <Link href="/profile/edit" className="font-semibold">
                  Write a short introduction
                </Link>
                .
              </p>
            )}
          </Section>

          <Section
            title="How I work in teams"
            aside={<Link href="/profile/edit">Edit</Link>}
          >
            <TeamPreferences student={student} />
          </Section>

          <Section
            title="Subjects & grades"
            aside={
              student.transcriptUrl ? (
                <a href={student.transcriptUrl}>Transcript PDF ↓</a>
              ) : undefined
            }
          >
            {preview.length > 0 ? (
              <>
                <div className="bg-card border border-line rounded-card px-5 py-3">
                  <CourseTable courses={preview} />
                </div>
                <p className="text-meta text-ink-3 mt-2.5">
                  Showing {preview.length} of {totalRegistrar}
                  {student.recordSyncedAt ? (
                    <>
                      {" · "}
                      <VerifiedMark className="inline-flex">
                        synced {formatDate(student.recordSyncedAt)}
                      </VerifiedMark>
                    </>
                  ) : null}
                </p>
              </>
            ) : (
              <div className="border border-dashed border-line rounded-card px-5 py-8 text-center">
                <p className="text-ink-2">
                  No registrar record has synced to your profile yet.
                </p>
              </div>
            )}
          </Section>

          <Section title="Skills" aside={<Link href="/profile/edit">+ Add</Link>}>
            {student.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {student.skills.map((skill) => (
                  <Chip key={skill}>{skill}</Chip>
                ))}
              </div>
            ) : (
              <p className="text-ink-3">Nothing yet.</p>
            )}
            <p className="text-meta text-ink-3 mt-2.5">
              Self-reported — the university does not assess these.
            </p>
          </Section>

          <Section
            title="Experience"
            aside={<Link href="/profile/edit">+ Add</Link>}
          >
            <ExperienceList entries={experiences} />
          </Section>

          {studio.length > 0 ? (
            <Section
              title="Solutions Studio work"
              aside="Delivered on this platform"
            >
              <ul className="flex flex-col gap-2.5">
                {studio.map((project) => (
                  <li
                    key={project.applicationPublicId}
                    className="bg-card border border-line rounded-card p-4 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/workspace/${project.applicationPublicId}`}
                        className="font-semibold text-ink hover:text-brand"
                      >
                        {project.challengeTitle}
                      </Link>
                      <p className="text-meta text-ink-3 mt-0.5">
                        {project.progress.completed} of {project.progress.total}{" "}
                        milestones complete
                      </p>
                    </div>
                    <Chip>{project.projectStatus.replaceAll("_", " ")}</Chip>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
