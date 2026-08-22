import { getDevelopmentAssessmentActor } from "@/services/assessment.service";

export async function getTemporaryAssessmentViewer() {
  return getDevelopmentAssessmentActor("JORDAN_STUDENT_DEMO");
}
