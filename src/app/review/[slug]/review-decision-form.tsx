"use client";

import { useRef } from "react";

import { recordReviewDecisionAction } from "./actions";

export function ReviewDecisionForm({ slug }: { slug: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={recordReviewDecisionAction}
      className="flex flex-col gap-3 max-w-[520px]"
    >
      <input type="hidden" name="slug" value={slug} />
      <label className="text-meta font-semibold text-ink-2" htmlFor="review-comments">
        Reviewer comments
      </label>
      <textarea
        id="review-comments"
        name="comments"
        rows={3}
        placeholder="Required when requesting a revision"
        className="w-full px-3 py-2 rounded-card border border-line bg-card text-ink"
      />
      <div className="flex gap-2.5 flex-wrap">
        <button
          type="submit"
          name="decision"
          value="APPROVED"
          className="inline-flex items-center justify-center h-10 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
        >
          Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="REVISION_REQUESTED"
          onClick={(event) => {
            if (!formRef.current) return;
            const comments = new FormData(formRef.current).get("comments");
            if (typeof comments !== "string" || comments.trim().length < 3) return;
            if (!window.confirm("Send this challenge back to its owner for revision?")) {
              event.preventDefault();
            }
          }}
          className="inline-flex items-center justify-center h-10 px-4 rounded-card border border-line text-ink-2 font-medium hover:border-brand hover:text-brand"
        >
          Request revision
        </button>
      </div>
      <p className="text-meta text-ink-3">
        “Not ready” is a revision request. It remains editable and can be
        resubmitted; it is not a terminal cancellation.
      </p>
    </form>
  );
}
