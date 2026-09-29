import Link from "next/link";

import { Chip } from "@/components/ui/chip";
import { formatDate } from "@/lib/dates";
import type { WorkspaceDetail } from "@/services/workspace.service";

import {
  createMilestoneAction,
  finalReviewAction,
  reviewMilestoneAction,
  submitWorkAction,
} from "./actions";
import { ActionForm } from "./work-forms";

const FIELD =
  "w-full rounded-card border border-line bg-paper px-3 py-2 text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Completed",
  IN_PROGRESS: "In progress",
  PENDING: "Not started",
  REVISION_REQUESTED: "Revision requested",
  SUBMITTED: "Submitted",
};

const ROLE_LABEL: Record<string, string> = { FACULTY: "Faculty", PARTNER: "Partner" };

/**
 * Milestone work and sign-off, rendered from persisted rounds. Controls appear
 * only where the server would accept the write; the server re-checks all of it.
 */
export function ProjectWorkPanel({
  applicationId,
  detail,
}: {
  applicationId: string;
  detail: WorkspaceDetail;
}) {
  const active = detail.projectStatus === "ACTIVE";
  const reviewable = active || detail.projectStatus === "FINAL_REVIEW";
  const { isMember, isOwnerPartner, isSupervisor } = detail.viewer;
  const canPlan = active && (isSupervisor || isOwnerPartner);
  const submitWork = submitWorkAction.bind(null, applicationId);
  const review = reviewMilestoneAction.bind(null, applicationId);

  return (
    <div className="flex flex-col gap-3">
      {detail.milestones.length === 0 ? (
        <div className="border border-dashed border-line rounded-card px-5 py-6 text-ink-2">
          {canPlan
            ? "No milestones yet. Add the first one below so the team knows what to deliver."
            : "No milestones have been set yet. Your supervisor or the partner adds them."}
        </div>
      ) : null}

      {detail.milestones.map((milestone) => {
        const round = milestone.currentSubmission;
        const current = milestone.deliverables.filter((item) => item.roundNumber === round?.roundNumber);
        const decided = new Set(milestone.latestReviews.map((item) => item.reviewerRole));
        const canSubmit = isMember && active && ["PENDING", "IN_PROGRESS", "REVISION_REQUESTED"].includes(milestone.status);
        const reviewAs: Array<"FACULTY" | "PARTNER"> = [];
        if (reviewable && milestone.status === "SUBMITTED" && round) {
          if (isSupervisor && !decided.has("FACULTY")) reviewAs.push("FACULTY");
          if (isOwnerPartner && !decided.has("PARTNER")) reviewAs.push("PARTNER");
        }

        return (
          <article key={milestone.id} className="bg-card border border-line rounded-card p-5" data-milestone={milestone.title}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-ink normal-case tracking-normal text-[14px] font-semibold">{milestone.title}</h3>
              <Chip variant={milestone.status === "COMPLETED" ? "ok" : milestone.status === "REVISION_REQUESTED" ? "warn" : "default"}>
                {STATUS_LABEL[milestone.status] ?? milestone.status}
              </Chip>
              {round ? <Chip variant="outline-dashed">Round {round.roundNumber}</Chip> : null}
            </div>
            {milestone.description ? <p className="text-ink-2 mt-1.5">{milestone.description}</p> : null}
            <p className="text-meta text-ink-3 mt-1">
              {milestone.deadline ? `Due ${formatDate(milestone.deadline)}` : "No due date set"}
            </p>

            {round ? (
              <div className="mt-3 bg-line-2 rounded-card px-3.5 py-3">
                <p className="text-meta text-ink-3">
                  Round {round.roundNumber} submitted by {round.submittedByName} on {formatDate(round.submittedAt)}
                </p>
                {current.map((item, index) => (
                  <div key={index} className="mt-1.5">
                    <p className="font-medium text-ink">
                      {item.title ?? "Deliverable"}
                      {item.externalUrl || item.fileUrl ? (
                        <>
                          {" · "}
                          <a href={item.externalUrl ?? item.fileUrl ?? "#"} target="_blank" rel="noreferrer noopener">
                            Open link
                          </a>
                        </>
                      ) : null}
                    </p>
                    {item.description ? <p className="text-ink-2 text-meta mt-0.5 whitespace-pre-line">{item.description}</p> : null}
                  </div>
                ))}
                <p className="text-meta text-ink-2 mt-2">
                  This round: faculty {milestone.facultyApproved ? "approved" : decided.has("FACULTY") ? "requested revision" : "pending"} ·
                  partner {milestone.partnerApproved ? "approved" : decided.has("PARTNER") ? "requested revision" : "pending"}
                </p>
              </div>
            ) : null}

            {reviewAs.map((role) => (
              <div key={role} className="mt-3 border border-line rounded-card p-3.5" data-review-as={role}>
                <p className="font-semibold text-ink text-[13px]">
                  Your {ROLE_LABEL[role].toLowerCase()} decision on round {round?.roundNumber}
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mt-2">
                  <ActionForm action={review} submitLabel={`Approve as ${ROLE_LABEL[role].toLowerCase()}`} tone="ok">
                    <input type="hidden" name="milestoneId" value={milestone.id} />
                    <input type="hidden" name="submissionId" value={round?.id ?? ""} />
                    <input type="hidden" name="role" value={role} />
                    <input type="hidden" name="decision" value="APPROVED" />
                    <input name="comments" placeholder="Optional note" className={FIELD} aria-label={`${ROLE_LABEL[role]} approval note`} />
                  </ActionForm>
                  <ActionForm action={review} submitLabel="Request revision" tone="warn">
                    <input type="hidden" name="milestoneId" value={milestone.id} />
                    <input type="hidden" name="submissionId" value={round?.id ?? ""} />
                    <input type="hidden" name="role" value={role} />
                    <input type="hidden" name="decision" value="REVISION_REQUESTED" />
                    <textarea name="comments" rows={2} required placeholder="What needs to change — the team sees this verbatim." className={FIELD} aria-label={`${ROLE_LABEL[role]} revision request`} />
                  </ActionForm>
                </div>
                <p className="text-meta text-ink-3 mt-2">
                  A revision closes this round. The team resubmits as a new round and approvals from this one do not carry over.
                </p>
              </div>
            ))}

            {canSubmit ? (
              <div className="mt-3 border border-line rounded-card p-3.5" data-submit-work>
                <p className="font-semibold text-ink text-[13px]">
                  {milestone.status === "REVISION_REQUESTED" ? `Resubmit as round ${(round?.roundNumber ?? 0) + 1}` : "Submit work for review"}
                </p>
                <ActionForm action={submitWork} submitLabel="Submit for review" className="mt-2">
                  <input type="hidden" name="milestoneId" value={milestone.id} />
                  <input name="title" required placeholder="What you are submitting" className={FIELD} aria-label="Deliverable title" />
                  <select name="deliverableType" defaultValue="LINK" className={FIELD} aria-label="Deliverable type">
                    <option value="LINK">Link (https://)</option>
                    <option value="TEXT">Written update</option>
                  </select>
                  <input name="url" type="url" placeholder="https:// — required for a link" className={FIELD} aria-label="Deliverable link" />
                  <textarea name="description" rows={2} placeholder="Notes for your reviewers — required for a written update" className={FIELD} aria-label="Deliverable notes" />
                </ActionForm>
                <p className="text-meta text-ink-3 mt-2">
                  Files are shared by link; the platform stores the reference, not the file.
                </p>
              </div>
            ) : null}

            {milestone.reviewHistory.length > 0 ? (
              <details className="mt-3">
                <summary className="text-meta text-ink-3 cursor-pointer">Review history ({milestone.reviewHistory.length})</summary>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {milestone.reviewHistory.map((item, index) => (
                    <li key={index} className="text-meta text-ink-2">
                      Round {item.roundNumber} · {ROLE_LABEL[item.reviewerRole] ?? item.reviewerRole} · {item.reviewerName} ·{" "}
                      {item.decision === "APPROVED" ? "approved" : "requested revision"}
                      {item.comments ? ` — “${item.comments}”` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </article>
        );
      })}

      {canPlan ? (
        <div className="border border-line rounded-card p-4" data-add-milestone>
          <p className="font-semibold text-ink">Add a milestone</p>
          <ActionForm action={createMilestoneAction.bind(null, applicationId)} submitLabel="Add milestone" className="mt-2">
            <input name="title" required placeholder="Milestone title" className={FIELD} aria-label="Milestone title" />
            <input name="description" placeholder="What the team should deliver" className={FIELD} aria-label="Milestone description" />
            <input name="deadline" type="date" className={FIELD} aria-label="Milestone due date" />
          </ActionForm>
          <p className="text-meta text-ink-3 mt-2">
            Every milestone must be completed by both sign-offs before the project moves to final review.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Formal close-out: FACULTY + PARTNER approval in the same round completes the project. */
export function FinalReviewPanel({
  applicationId,
  detail,
}: {
  applicationId: string;
  detail: WorkspaceDetail;
}) {
  const { decisions, round } = detail.finalReview;
  const inReview = detail.projectStatus === "FINAL_REVIEW";
  if (!inReview && decisions.length === 0) return null;

  const currentRound = decisions.filter((item) => item.roundNumber === round);
  const decided = new Set(currentRound.map((item) => item.reviewerRole));
  const roles: Array<"FACULTY" | "PARTNER"> = [];
  if (inReview && detail.viewer.isSupervisor && !decided.has("FACULTY")) roles.push("FACULTY");
  if (inReview && detail.viewer.isOwnerPartner && !decided.has("PARTNER")) roles.push("PARTNER");
  const act = finalReviewAction.bind(null, applicationId);

  return (
    <div className="bg-card border border-line rounded-card p-5" data-final-review>
      <p className="text-ink-2">
        {detail.projectStatus === "COMPLETED"
          ? "Both the faculty supervisor and the partner approved the final review. The project is complete and read-only."
          : inReview
            ? `Every milestone is complete. Final review round ${round} needs approval from both the faculty supervisor and the partner.`
            : "A final-review revision was requested; the project returned to active work."}
      </p>
      {decisions.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {decisions.map((item, index) => (
            <li key={index} className="text-meta text-ink-2">
              Round {item.roundNumber} · {ROLE_LABEL[item.reviewerRole] ?? item.reviewerRole} · {item.reviewerName} ·{" "}
              {item.decision === "APPROVED" ? "approved" : "requested revision"}
              {item.comments ? ` — “${item.comments}”` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {roles.map((role) => (
        <div key={role} className="grid sm:grid-cols-2 gap-3 mt-3 border-t border-line-2 pt-3" data-final-as={role}>
          <ActionForm action={act} submitLabel={`Approve final review as ${ROLE_LABEL[role].toLowerCase()}`} tone="ok">
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="decision" value="APPROVED" />
            <input type="hidden" name="round" value={round} />
            <input name="comments" placeholder="Optional note" className={FIELD} aria-label={`${ROLE_LABEL[role]} final approval note`} />
          </ActionForm>
          <ActionForm action={act} submitLabel="Request more work" tone="warn">
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="decision" value="REVISION_REQUESTED" />
            <input type="hidden" name="round" value={round} />
            <textarea name="comments" rows={2} required placeholder="What still needs to happen. The project returns to active work." className={FIELD} aria-label={`${ROLE_LABEL[role]} final revision request`} />
          </ActionForm>
        </div>
      ))}
      {inReview && detail.viewer.isOwnerPartner ? (
        <p className="text-meta text-ink-3 mt-3">
          Optional:{" "}
          <Link href={`/partner/projects/${applicationId}/close`}>write close-out feedback for the team →</Link>
        </p>
      ) : null}
    </div>
  );
}

export function CloseoutFeedbackList({ detail }: { detail: WorkspaceDetail }) {
  if (detail.closeoutFeedback.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2.5">
      {detail.closeoutFeedback.map((item, index) => (
        <li key={index} className="bg-card border border-line rounded-card p-4">
          <p className="text-meta text-ink-3">
            {item.authorName}
            {item.createdAt ? ` · ${formatDate(item.createdAt)}` : ""}
          </p>
          {item.metrics ? (
            <p className="text-meta text-ink-2 mt-1">
              Quality: {item.metrics.quality} · Reliability: {item.metrics.reliability} · Would host again: {item.metrics.hostAgain}
            </p>
          ) : null}
          {item.content ? <p className="text-ink-2 mt-1.5 whitespace-pre-line">{item.content}</p> : null}
        </li>
      ))}
    </ul>
  );
}
