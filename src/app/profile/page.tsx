import Link from "next/link";
import { CompletenessPanel } from "@/components/profile/completeness-panel";
import { CourseTable } from "@/components/profile/course-table";
import { ExperienceList } from "@/components/profile/experience-list";
import { ProfileRail } from "@/components/profile/profile-rail";
import { TeamPreferences } from "@/components/profile/team-preferences";
import { VerifiedMark } from "@/components/profile/verified-mark";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { currentStudent } from "@/lib/data/student";
import { experience } from "@/lib/data/transcript";
import { formatDate } from "@/lib/dates";
import { isRevealed } from "@/lib/pipeline";
import { recentCourses, registrarCourses } from "@/lib/profile";
import { getApplicationsWithChallenge } from "@/lib/queries";
import { STAGE_LABELS } from "@/lib/types";

const COURSE_PREVIEW = 3;

/**
 * The student's own record. Two halves, and the line between them is the
 * point of the page: the registrar's data carries a verified mark and cannot
 * be edited here, everything else is the student's own account of themselves.
 */
export default function ProfilePage() {
  const student = currentStudent;
  const preview = recentCourses(COURSE_PREVIEW);
  const totalRegistrar = registrarCourses().length;

  // Studio work is neither registrar data nor a claim — faculty and partner
  // signed these milestones off inside the product, so it gets its own block.
  const studio = getApplicationsWithChallenge().filter(({ application }) =>
    isRevealed(application),
  );

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <div className="grid gap-8 lg:grid-cols-[212px_1fr]">
        <ProfileRail student={student} />

        <div className="min-w-0">
          <CompletenessPanel student={student} />

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
              <a href={student.transcriptUrl}>Transcript PDF ↓</a>
            }
          >
            <div className="bg-card border border-line rounded-card px-5 py-3">
              <CourseTable courses={preview} />
            </div>
            <p className="text-meta text-ink-3 mt-2.5">
              Showing {preview.length} of {totalRegistrar} · full record in the
              registrar PDF · <VerifiedMark className="inline-flex">
                synced {formatDate(student.recordSyncedAt)}
              </VerifiedMark>
            </p>
          </Section>

          <Section
            title="Skills"
            aside={<Link href="/profile/edit">+ Add</Link>}
          >
            <div className="flex flex-wrap gap-1.5">
              {student.skills.map((skill) => (
                <Chip key={skill}>{skill}</Chip>
              ))}
            </div>
            <p className="text-meta text-ink-3 mt-2.5">
              Self-reported — the university does not assess these.
            </p>
          </Section>

          <Section
            title="Experience"
            aside={<Link href="/profile/edit">+ Add</Link>}
          >
            <ExperienceList entries={experience} />
          </Section>

          {studio.length > 0 ? (
            <Section title="Solutions Studio work" aside="Delivered on this platform">
              <ul className="flex flex-col gap-2.5">
                {studio.map(({ application, challenge }) => (
                  <li
                    key={application.id}
                    className="bg-card border border-line rounded-card p-4 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/workspace/${application.id}`}
                        className="font-semibold text-ink hover:text-brand"
                      >
                        {challenge.title}
                      </Link>
                      <p className="text-meta text-ink-3 mt-0.5">
                        {challenge.orgName ?? challenge.orgCategory}
                        {application.project
                          ? ` · started ${formatDate(application.project.startedAt)}`
                          : ""}
                      </p>
                    </div>
                    <Chip>{STAGE_LABELS[application.stage]}</Chip>
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
