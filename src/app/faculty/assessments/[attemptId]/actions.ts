"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import {
  AssessmentGradingError,
  gradeAssessmentAttempt,
} from "@/services/assessment-grading.service";

export interface GradingActionState {
  message: string | null;
  success: boolean;
}

export async function gradeAssessmentForAuthenticatedFaculty(
  attemptKey: string,
  _previous: GradingActionState,
  formData: FormData
): Promise<GradingActionState> {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") {
    return { message: "Your session has expired. Sign in again.", success: false };
  }

  const rawScore = formData.get("overallScore");
  if (typeof rawScore !== "string" || rawScore.trim() === "") {
    return { message: "Enter an overall score from 0 to 100.", success: false };
  }
  const overallScore = Number(rawScore);
  const rubricNotes = formData.get("rubricNotes");
  const comments = formData.get("comments");

  try {
    const result = await gradeAssessmentAttempt(
      attemptKey,
      {
        comments: typeof comments === "string" ? comments : null,
        overallScore,
        rubricNotes: typeof rubricNotes === "string" ? rubricNotes : null,
      },
      resolution.actor.user.userId
    );

    revalidatePath("/faculty");
    revalidatePath(`/faculty/assessments/${attemptKey}`);

    return {
      message:
        result.outcome === "PASS"
          ? "Grade saved. The application is awaiting partner selection."
          : result.outcome === "FAIL"
            ? "Grade saved. The application has been rejected."
            : "Grade saved, but no passing threshold is configured. The application remains pending.",
      success: true,
    };
  } catch (error) {
    if (error instanceof AssessmentGradingError) {
      return {
        message:
          error.code === "FORBIDDEN" || error.code === "NOT_FOUND"
            ? "This assessment is no longer available to you."
            : error.message,
        success: false,
      };
    }
    throw error;
  }
}
