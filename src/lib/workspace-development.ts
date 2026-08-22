import { getDevelopmentWorkspaceActor } from "@/services/workspace.service";

/** Temporary server-only viewer until Phase 6 provides a real session. */
export async function getTemporaryWorkspaceViewer() {
  return getDevelopmentWorkspaceActor("JORDAN_STUDENT_DEMO");
}
