import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { formatNullableDate } from "@/lib/dates";
import { getAssessmentGradingQueue } from "@/services/assessment-grading.service";
import { getFacultyQueue } from "@/services/faculty.service";

import { FacultyQueueShell } from "./queue-shell";

export const dynamic = "force-dynamic";

/**
 * A supervisor's obligations as one priority queue.
 *
 * Invitations, milestone sign-offs and closing feedback all land here sorted
 * by how soon each is due, rather than in three separate lists a supervisor
 * has to reconcile themselves.
 */
export default async function FacultyPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "FACULTY")) notFound();

  const [queue, gradingQueue] = await Promise.all([
    getFacultyQueue(resolution.actor.user.userId),
    getAssessmentGradingQueue(resolution.actor.user.userId),
  ]);

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      {gradingQueue.length > 0 ? (
        <Section title="Assessments awaiting review">
          <div className="flex flex-col gap-2.5">
            {gradingQueue.map((item) => (
              <Link
                key={item.attemptKey}
                href={`/faculty/assessments/${item.attemptKey}`}
                className="bg-card border border-line rounded-card p-4 flex items-center gap-4 hover:border-ink-3"
              >
                <Chip variant="warn">Grade assessment</Chip>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{item.challengeTitle}</p>
                  <p className="text-meta text-ink-2 mt-0.5">
                    {item.studentName} · {item.teamName ?? "Individual application"} · submitted {formatNullableDate(item.submittedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}
      <FacultyQueueShell
        feedback={queue.feedback}
        invites={queue.invites}
        load={{ ...queue.load, name: resolution.actor.user.fullName }}
        milestones={queue.milestones}
        settled={queue.settled}
      />
    </div>
  );
}
