import type { SupervisionInvite } from "@/lib/types";

/**
 * Outstanding requests for a faculty member to supervise a team's
 * application. One row per `Application` that has a nominated supervisor who
 * hasn't responded yet — accepted nominations aren't tracked here, since the
 * `Application.facultySupervisorId` already stands for "confirmed" once the
 * pipeline has moved past this.
 */
export const supervisionInvites: SupervisionInvite[] = [
  {
    id: "inv-outreach",
    applicationId: "app-outreach",
    facultyId: "fac-pham",
    status: "pending",
    requestedAt: "2026-07-25",
    respondBy: "2026-08-01",
  },
];
