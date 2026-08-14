import { currentFacultyId, getFacultyById } from "@/lib/data/faculty";
import {
  getFeedbackQueue,
  getMilestoneQueue,
  getPendingInvites,
  getSettledRows,
} from "@/lib/supervision";
import { FacultyQueue } from "@/components/faculty/faculty-queue";

/**
 * The faculty supervision queue (low-fi option A): invitations to supervise,
 * milestones needing sign-off, and completed projects still waiting on
 * feedback, triaged into one list rather than three separate screens.
 */
export default function FacultyQueuePage() {
  const faculty = getFacultyById(currentFacultyId);
  const invites = getPendingInvites(currentFacultyId);
  const milestones = getMilestoneQueue(currentFacultyId);
  const feedback = getFeedbackQueue(currentFacultyId);
  const settled = getSettledRows(currentFacultyId);

  if (!faculty) return null;

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <FacultyQueue
        faculty={faculty}
        invites={invites}
        milestones={milestones}
        feedback={feedback}
        settled={settled}
      />
    </div>
  );
}
