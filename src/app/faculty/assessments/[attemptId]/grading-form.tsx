"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import type { GradingActionState } from "./actions";

const INITIAL_STATE: GradingActionState = { message: null, success: false };

export function GradingForm({
  action,
  passingScore,
}: {
  action: (
    state: GradingActionState,
    formData: FormData
  ) => Promise<GradingActionState>;
  passingScore: number | null;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, INITIAL_STATE);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form action={formAction} className="bg-card border border-line rounded-card p-5">
      <label className="block">
        <span className="font-semibold text-ink">Overall score</span>
        <span className="block text-meta text-ink-3 mt-0.5">
          Authoritative score from 0 to 100. {passingScore === null
            ? "No pass threshold is configured, so this grade will not advance or reject the application."
            : `A score of ${passingScore} or higher passes.`}
        </span>
        <input
          name="overallScore"
          type="number"
          min="0"
          max="100"
          step="0.01"
          required
          className="mt-2 h-10 w-32 rounded-card border border-line bg-card px-3 text-ink"
        />
      </label>

      <label className="block mt-5">
        <span className="font-semibold text-ink">Rubric notes</span>
        <span className="block text-meta text-ink-3 mt-0.5">
          Record the reasoning behind the authoritative total. No automatic weighting is applied.
        </span>
        <textarea
          name="rubricNotes"
          maxLength={5000}
          rows={5}
          className="mt-2 w-full rounded-card border border-line bg-card px-3 py-2 text-ink"
        />
      </label>

      <label className="block mt-5">
        <span className="font-semibold text-ink">Student-facing comments</span>
        <textarea
          name="comments"
          maxLength={5000}
          rows={3}
          className="mt-2 w-full rounded-card border border-line bg-card px-3 py-2 text-ink"
        />
      </label>

      {state.message ? (
        <p
          role={state.success ? "status" : "alert"}
          className={`mt-4 ${state.success ? "text-ok" : "text-warn"}`}
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 px-5 mt-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-60"
    >
      {pending ? "Saving grade…" : "Submit authoritative grade"}
    </button>
  );
}
