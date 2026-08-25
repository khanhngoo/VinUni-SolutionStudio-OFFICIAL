import type { AssessmentQuestionRead } from "@/db/queries/assessments";

type QuestionType = AssessmentQuestionRead["questionType"];

/**
 * The student-facing name for an assessment's shape, derived from the kinds of
 * question it contains rather than stored on the row.
 *
 * Shared by the assessment runtime (which already has the full question tree
 * loaded) and the challenge marketplace (which only needs the distinct types).
 * Both call this so the label a student reads before applying is the same one
 * they see when they sit the thing.
 */
export function assessmentTrackLabel(
  questionTypes: Iterable<QuestionType>
): string {
  const types = new Set(questionTypes);
  if (types.size === 1 && types.has("CODING")) return "Technical";
  if (types.size === 1 && types.has("MULTIPLE_CHOICE")) return "Cognitive";
  return "Mixed assessment";
}
