import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
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

  const queue = await getFacultyQueue(resolution.actor.user.userId);

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
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
