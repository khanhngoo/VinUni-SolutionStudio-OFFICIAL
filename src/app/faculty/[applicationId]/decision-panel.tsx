"use client";

import { InviteDecision } from "@/components/faculty/invite-decision";
import type { FacultyLoad, InviteQueueItem } from "@/lib/faculty-queue";

import { acceptSupervisionRequest, declineSupervisionRequest } from "../actions";

/** Binds the accept/decline view to the same actions the queue uses. */
export function DecisionPanel({
  atCapacity,
  item,
  load,
  summary,
}: {
  atCapacity: boolean;
  item: InviteQueueItem;
  load: FacultyLoad;
  summary: string;
}) {
  return (
    <InviteDecision
      atCapacity={atCapacity}
      faculty={load}
      item={item}
      onAccept={acceptSupervisionRequest}
      onDecline={declineSupervisionRequest}
      summary={summary}
    />
  );
}
