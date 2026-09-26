"use client";

import { useActionState } from "react";

import { signInWithDemo, type AuthenticationFormState } from "./actions";

const initialState: AuthenticationFormState = {};

export function DemoSignInForm() {
  const [state, action, pending] = useActionState(signInWithDemo, initialState);

  return (
    <form action={action} className="rounded-card border border-line bg-card p-5">
      <p className="text-sm leading-relaxed text-ink-2">
        Explore the student portal with a prepared demo profile. Enter the demo
        password provided to you by the site owner.
      </p>
      <label className="mt-5 block text-sm font-medium text-ink" htmlFor="demo-password">
        Demo password
        <input
          autoComplete="current-password"
          className="mt-1.5 h-10 w-full rounded-card border border-line bg-white px-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          id="demo-password"
          name="password"
          required
          type="password"
        />
      </label>
      {state.message ? (
        <p aria-live="polite" className="mt-4 text-sm text-ink-2" role="status">
          {state.message}
        </p>
      ) : null}
      <button
        className="mt-5 inline-flex h-10 items-center justify-center rounded-card bg-brand px-5 font-semibold text-white hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in…" : "Enter student demo"}
      </button>
    </form>
  );
}
