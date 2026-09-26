import { db } from "@/db";
import {
  listApplicationDetailsForStudent,
  type ApplicationDetailRead,
} from "@/db/queries/applications";
import { listNotificationsForUser } from "@/db/queries/notifications";

export type InboxEntryKind = "invitation" | "application" | "assessment" | "offer" | "notice";

export interface StudentInboxEntry {
  id: string;
  kind: InboxEntryKind;
  title: string;
  body: string;
  at: Date | null;
  href: string | null;
  actionLabel: string | null;
  needsResponse: boolean;
}

export async function listStudentInbox(userId: bigint): Promise<StudentInboxEntry[]> {
  const [applications, notices] = await Promise.all([
    listApplicationDetailsForStudent(db, userId),
    listNotificationsForUser(userId),
  ]);

  const entries = applications.flatMap((application) => applicationEntries(application, userId));

  for (const notice of notices) {
    entries.push({
      id: `notice:${notice.id}`,
      kind: "notice",
      title: notice.title?.trim() || "Studio update",
      body: notice.message?.trim() || "",
      at: notice.createdAt,
      href: null,
      actionLabel: null,
      needsResponse: false,
    });
  }

  return entries.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
}

function applicationEntries(application: ApplicationDetailRead, userId: bigint): StudentInboxEntry[] {
  const seat = application.members.find((member) => member.student.userId === userId);
  if (!seat) return [];

  const entries: StudentInboxEntry[] = [];
  const challenge = application.challenge.title;
  const applicationHref = `/applications/${application.publicId}`;
  const invitationHref = `/invitations/${application.publicId}`;

  if (seat.memberRole === "MEMBER") {
    entries.push({
      id: `team-invitation:${seat.memberId}`,
      kind: "invitation",
      title: `Invitation to join ${application.teamName ?? "a team"}`,
      body: `${application.memberSummary.leaderName ?? "A student"} invited you to ${challenge}.`,
      at: seat.invitedAt ?? application.submittedAt ?? application.createdAt,
      href: invitationHref,
      actionLabel: seat.status === "INVITED" ? "Respond to invitation" : "View invitation",
      needsResponse: seat.status === "INVITED",
    });

    if (seat.respondedAt && seat.status !== "INVITED") {
      entries.push({
        id: `team-invitation-response:${seat.memberId}`,
        kind: "invitation",
        title: seat.status === "ACCEPTED" ? "Team invitation accepted" : "Team invitation declined",
        body: `${application.teamName ?? "Your team"} · ${challenge}`,
        at: seat.respondedAt,
        href: invitationHref,
        actionLabel: "View invitation",
        needsResponse: false,
      });
    }
  }

  // An unanswered or declined invitation is not an application the student owns.
  if (seat.status !== "ACCEPTED") return entries;

  if (seat.memberRole === "LEADER" && application.submittedAt) {
    entries.push({
      id: `application-submitted:${application.id}`,
      kind: "application",
      title: "Application submitted",
      body: `${application.teamName ?? "Your team"} applied to ${challenge}.`,
      at: application.submittedAt,
      href: applicationHref,
      actionLabel: "View application",
      needsResponse: false,
    });
  }

  const statusUpdate = applicationStatusUpdate(application.status, challenge);
  const assessmentPending = application.status === "ASSESSMENT" &&
    !application.assessmentSummaries.some((assessment) => assessment.submittedAt);
  if (
    statusUpdate &&
    application.updatedAt &&
    !(application.status === "SELECTED" && application.offerSummary?.selectedAt)
  ) {
    entries.push({
      id: `application-status:${application.id}`,
      kind: "application",
      ...statusUpdate,
      at: application.updatedAt,
      href: assessmentPending ? `/assessment/${application.publicId}` : applicationHref,
      actionLabel: assessmentPending ? "Take assessment" : "View application",
      needsResponse: assessmentPending,
    });
  }

  application.assessmentSummaries.forEach((assessment, index) => {
    if (!assessment.submittedAt) return;
    entries.push({
      id: `assessment-submitted:${application.id}:${index}`,
      kind: "assessment",
      title: "Assessment submitted",
      body: `${assessment.assessmentTitle ?? "Your assessment"} for ${challenge}.`,
      at: assessment.submittedAt,
      href: `/assessment/${application.publicId}/result`,
      actionLabel: "View result",
      needsResponse: false,
    });
  });

  const offer = application.offerSummary;
  if (offer?.selectedAt) {
    const hasOffer = offer.offerStatus !== null;
    entries.push({
      id: `offer-received:${application.id}`,
      kind: "offer",
      title: "Your team was selected",
      body: hasOffer ? `An offer is ready for ${challenge}.` : challenge,
      at: offer.selectedAt,
      href: hasOffer ? `/offer/${application.publicId}` : applicationHref,
      actionLabel: hasOffer ? "Review offer" : "View application",
      needsResponse: seat.memberRole === "LEADER" && offer.offerStatus === "PENDING" &&
        (!offer.respondBy || offer.respondBy.getTime() > Date.now()),
    });
  }

  if (offer?.respondedAt && (offer.offerStatus === "ACCEPTED" || offer.offerStatus === "DECLINED")) {
    entries.push({
      id: `offer-response:${application.id}`,
      kind: "offer",
      title: offer.offerStatus === "ACCEPTED" ? "Offer accepted" : "Offer declined",
      body: challenge,
      at: offer.respondedAt,
      href: `/offer/${application.publicId}`,
      actionLabel: "View offer",
      needsResponse: false,
    });
  }

  return entries;
}

function applicationStatusUpdate(status: ApplicationDetailRead["status"], challenge: string) {
  switch (status) {
    case "SHORTLISTED":
      return { title: "Your team was shortlisted", body: challenge };
    case "ASSESSMENT":
      return { title: "Assessment is available", body: challenge };
    case "SELECTION_PENDING":
      return { title: "Selection is pending", body: challenge };
    case "REJECTED":
      return { title: "Application not selected", body: challenge };
    case "WITHDRAWN":
      return { title: "Application withdrawn", body: challenge };
    case "SELECTED":
      return { title: "Your team was selected", body: challenge };
    default:
      return null;
  }
}
