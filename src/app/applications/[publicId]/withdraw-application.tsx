"use client";

import { useActionState } from "react";

import { withdrawApplicationAction } from "./actions";

export function WithdrawApplication({ publicId }: { publicId: string }) {
  const action = withdrawApplicationAction.bind(null, publicId);
  const [error, formAction, pending] = useActionState(action, null);

  return (
    <form
      action={formAction}
      className="mt-3"
      onSubmit={(event) => {
        if (!window.confirm("Withdraw this entire application? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center h-9 px-4 rounded-card border border-warn text-warn font-semibold disabled:opacity-50"
      >
        {pending ? "Withdrawing…" : "Withdraw application"}
      </button>
      {error ? (
        <p className="text-meta text-warn mt-2" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
