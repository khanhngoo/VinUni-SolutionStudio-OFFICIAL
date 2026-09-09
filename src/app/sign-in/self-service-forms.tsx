"use client";

import { useActionState } from "react";

import {
  signInWithSelfService,
  signUpWithSelfService,
  type AuthenticationFormState,
} from "./actions";

const initialState: AuthenticationFormState = {};

export function SelfServiceAuthenticationForms() {
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithSelfService,
    initialState
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithSelfService,
    initialState
  );

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <form
        action={signInAction}
        className="rounded-card border border-line bg-card p-5"
      >
        <h2 className="text-lg font-semibold text-ink">Sign in</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-3">
          Use an account created for this internal demo.
        </p>

        <div className="mt-5 space-y-4">
          <Field
            autoComplete="email"
            id="sign-in-email"
            label="Email"
            name="email"
            type="email"
          />
          <Field
            autoComplete="current-password"
            id="sign-in-password"
            label="Password"
            minLength={12}
            name="password"
            type="password"
          />
        </div>

        <FormFeedback state={signInState} />
        <button
          className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-card bg-brand px-5 font-semibold text-white hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          disabled={signInPending}
          type="submit"
        >
          {signInPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <form
        action={signUpAction}
        className="rounded-card border border-line bg-card p-5"
      >
        <h2 className="text-lg font-semibold text-ink">Create an account</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-3">
          Registration creates a basic account without student or organization privileges.
        </p>

        <div className="mt-5 space-y-4">
          <Field
            autoComplete="name"
            id="sign-up-full-name"
            label="Full name"
            maxLength={255}
            minLength={2}
            name="fullName"
            type="text"
          />
          <Field
            autoComplete="email"
            id="sign-up-email"
            label="Email"
            name="email"
            type="email"
          />
          <Field
            autoComplete="new-password"
            description="12–128 characters with at least one letter and one number."
            id="sign-up-password"
            label="Password"
            maxLength={128}
            minLength={12}
            name="password"
            type="password"
          />
          <Field
            autoComplete="new-password"
            id="sign-up-password-confirmation"
            label="Confirm password"
            maxLength={128}
            minLength={12}
            name="passwordConfirmation"
            type="password"
          />
        </div>

        <FormFeedback state={signUpState} />
        <button
          className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-card bg-brand px-5 font-semibold text-white hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          disabled={signUpPending}
          type="submit"
        >
          {signUpPending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </div>
  );
}

function Field({
  autoComplete,
  description,
  id,
  label,
  maxLength,
  minLength,
  name,
  type,
}: {
  autoComplete: string;
  description?: string;
  id: string;
  label: string;
  maxLength?: number;
  minLength?: number;
  name: string;
  type: "email" | "password" | "text";
}) {
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <label className="block text-sm font-medium text-ink" htmlFor={id}>
      {label}
      <input
        aria-describedby={descriptionId}
        autoComplete={autoComplete}
        className="mt-1.5 h-10 w-full rounded-card border border-line bg-white px-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
        id={id}
        maxLength={maxLength}
        minLength={minLength}
        name={name}
        required
        type={type}
      />
      {description ? (
        <span className="mt-1.5 block text-xs font-normal leading-relaxed text-ink-3" id={descriptionId}>
          {description}
        </span>
      ) : null}
    </label>
  );
}

function FormFeedback({ state }: { state: AuthenticationFormState }) {
  if (!state.message && !state.details?.length) return null;

  return (
    <div
      aria-live="polite"
      className="mt-4 rounded-card border border-warn/35 bg-warn-soft px-3 py-2 text-sm text-ink-2"
      role="status"
    >
      {state.message ? <p>{state.message}</p> : null}
      {state.details?.length ? (
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {state.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
