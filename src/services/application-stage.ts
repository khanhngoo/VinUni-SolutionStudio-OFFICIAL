import type {
  ApplicationAssessmentSummary,
  ApplicationOfferSummary,
  ApplicationProjectSummary,
  ApplicationListItemRead,
} from "@/db/queries/applications";
import type { ApplicationStage } from "@/lib/types";

/**
 * The UI speaks in pipeline stages; the database speaks in per-table statuses.
 * This folds the second into the first.
 *
 * The stage a student sees is not stored anywhere and deliberately so — it is a
 * view over four independent rows (application, assessment attempt, offer,
 * project), each of which moves on its own. A stored column would be stale the
 * moment any one of them changed.
 *
 * Everything downstream of this — the stepper, the hub grouping, the CTA map in
 * `lib/pipeline.ts` — keys off the returned stage, so this is the single place
 * where "what stage is this application at" is decided.
 */

export interface ApplicationStageInputs {
  assessmentSummaries?: ApplicationAssessmentSummary[] | null;
  offerSummary?: ApplicationOfferSummary | null;
  projectSummary?: ApplicationProjectSummary | null;
  status: ApplicationListItemRead["status"];
}

/**
 * Note on the two interview stages: `INTERVIEW_SCHEDULING` and
 * `INTERVIEW_SCHEDULED` are unreachable. The schema models no interview, so
 * nothing can put an application there. They stay in the union because the
 * timeline still draws that node, and dropping them would silently renumber
 * `timelineIndex`. Remove them only alongside an interview model.
 */
export function deriveApplicationStage(
  input: ApplicationStageInputs,
  now: Date = new Date()
): ApplicationStage {
  const { status, offerSummary, projectSummary, assessmentSummaries } = input;

  if (status === "WITHDRAWN") return "WITHDRAWN";
  if (status === "REJECTED") return "NOT_SELECTED";

  // A project row is the furthest-along fact available: once work has started,
  // the project's own status is the answer regardless of upstream rows.
  if (projectSummary) {
    switch (projectSummary.status) {
      case "COMPLETED":
      case "ARCHIVED":
        return "COMPLETED";
      case "FINAL_REVIEW":
        return "IN_REVIEW";
      default:
        return "ACTIVE";
    }
  }

  if (offerSummary?.offerStatus) {
    switch (offerSummary.offerStatus) {
      case "ACCEPTED":
        // Accepted, but the project row has not been created yet.
        return "ACTIVE";
      case "DECLINED":
        return "WITHDRAWN";
      case "CANCELLED":
        return "NOT_SELECTED";
      case "PENDING":
        return isOfferExpired(offerSummary, now) ? "EXPIRED" : "INVITED";
    }
  }

  switch (status) {
    case "SELECTED":
      // Selected but no offer row yet — the invitation is imminent, not sent.
      return "INVITED";
    case "SELECTION_PENDING":
      return "TEST_SUBMITTED";
    case "ASSESSMENT":
      return hasSubmittedAssessment(assessmentSummaries)
        ? "TEST_SUBMITTED"
        : "TEST_PENDING";
    case "SHORTLISTED":
      return "SHORTLISTED";
    case "SUBMITTED":
    default:
      return "APPLIED";
  }
}

function isOfferExpired(offer: ApplicationOfferSummary, now: Date): boolean {
  if (offer.respondedAt) return false;
  return offer.respondBy !== null && offer.respondBy.getTime() <= now.getTime();
}

function hasSubmittedAssessment(
  summaries: ApplicationAssessmentSummary[] | null | undefined
): boolean {
  return (summaries ?? []).some(
    (summary) => summary.submittedAt !== null || summary.attemptStatus === "SUBMITTED"
  );
}
