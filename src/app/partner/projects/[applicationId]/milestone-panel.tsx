"use client";

import { PartnerMilestoneList } from "@/components/partner/partner-milestone-list";
import type { Meeting, Milestone } from "@/lib/types";

import { approveMilestoneAsPartner, requestMilestoneRevision } from "./actions";

/** Binds the partner's sign-off controls to their server actions. */
export function MilestonePanel({
  meetings,
  milestones,
  readOnly,
}: {
  meetings: Meeting[];
  milestones: Milestone[];
  readOnly: boolean;
}) {
  return (
    <PartnerMilestoneList
      meetings={meetings}
      milestones={milestones}
      onApprove={approveMilestoneAsPartner}
      onRequestRevision={requestMilestoneRevision}
      readOnly={readOnly}
    />
  );
}
