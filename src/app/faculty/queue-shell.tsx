"use client";

import { FacultyQueue } from "@/components/faculty/faculty-queue";
import type {
  FacultyLoad,
  FeedbackQueueItem,
  InviteQueueItem,
  MilestoneQueueItem,
  SettledSupervision,
} from "@/lib/faculty-queue";

import {
  acceptSupervisionRequest,
  approveMilestone,
  declineSupervisionRequest,
  requestMilestoneChanges,
} from "./actions";

/**
 * Binds the queue to its server actions. The queue itself stays unaware of the
 * server, and each handler returns a message the queue uses to put a row back
 * if the write was rejected.
 */
export function FacultyQueueShell({
  feedback,
  invites,
  load,
  milestones,
  settled,
}: {
  feedback: FeedbackQueueItem[];
  invites: InviteQueueItem[];
  load: FacultyLoad;
  milestones: MilestoneQueueItem[];
  settled: SettledSupervision[];
}) {
  return (
    <FacultyQueue
      faculty={load}
      feedback={feedback}
      invites={invites}
      milestones={milestones}
      onAcceptInvite={acceptSupervisionRequest}
      onApproveMilestone={approveMilestone}
      onDeclineInvite={declineSupervisionRequest}
      onRequestChanges={requestMilestoneChanges}
      settled={settled}
    />
  );
}
