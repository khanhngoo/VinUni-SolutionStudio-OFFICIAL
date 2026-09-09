/**
 * The partner's selection board, as five columns.
 *
 * Salvaged out of `src/lib/provider.ts` — the column vocabulary is pure, while
 * everything around it in that module reads the fixture arrays and is going
 * away.
 *
 * One column changed name in the move. The prototype's fourth column was
 * "Interview", fed by `INTERVIEW_SCHEDULING` / `INTERVIEW_SCHEDULED`. The
 * schema models no interview at all — `src/services/application-stage.ts` says
 * so plainly, and nothing can put an application in either state — so that
 * column could only ever have rendered empty. It is now "In selection", fed by
 * `SELECTION_PENDING`, which is the real step between assessment and an offer.
 */

export type PipelineColumn =
  | "applied"
  | "shortlisted"
  | "assessment"
  | "selection"
  | "invited";

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  "applied",
  "shortlisted",
  "assessment",
  "selection",
  "invited",
];

export const PIPELINE_LABELS: Record<PipelineColumn, string> = {
  applied: "Applied",
  assessment: "In assessment",
  invited: "Invited",
  selection: "In selection",
  shortlisted: "Shortlisted",
};

/**
 * Which column an application belongs in, from its stored status.
 *
 * Rejected and withdrawn applications return null and leave the board: it
 * shows the live pipeline, not the history.
 */
export function columnForStatus(status: string): PipelineColumn | null {
  switch (status) {
    case "SUBMITTED":
      return "applied";
    case "SHORTLISTED":
      return "shortlisted";
    case "ASSESSMENT":
      return "assessment";
    case "SELECTION_PENDING":
      return "selection";
    case "SELECTED":
      return "invited";
    default:
      return null;
  }
}

/** One team on the board. Counts, not rosters — the detail page has the names. */
export interface PipelineCard {
  applicationPublicId: string;
  /** Reviewed assessment band, never a score. */
  assessmentBand: string | null;
  challengeSlug: string;
  confirmedCount: number;
  /**
   * The one extra line a card carries, which differs by column: an outstanding
   * offer is a clock, everything else is quiet.
   */
  detail: { label: string; urgent: boolean } | null;
  pendingCount: number;
  teamName: string;
}

export interface PipelineBucket {
  cards: PipelineCard[];
  column: PipelineColumn;
}

export function groupIntoPipeline(cards: (PipelineCard & { status: string })[]): PipelineBucket[] {
  return PIPELINE_COLUMNS.map((column) => ({
    cards: cards.filter((card) => columnForStatus(card.status) === column),
    column,
  }));
}
