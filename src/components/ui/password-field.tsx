"use client";

import { useState } from "react";

import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

interface PasswordFieldProps {
  autoComplete: string;
  className?: string;
  description?: string;
  id: string;
  label: string;
  maxLength?: number;
  minLength?: number;
  name: string;
}

export function PasswordField({
  autoComplete,
  className,
  description,
  id,
  label,
  maxLength,
  minLength,
  name,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const descriptionId = description ? `${id}-description` : undefined;
  const actionLabel = isVisible ? "Hide password" : "Show password";

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-ink" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          aria-describedby={descriptionId}
          autoComplete={autoComplete}
          className="h-10 w-full rounded-card border border-line bg-white py-2 pl-3 pr-11 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          id={id}
          maxLength={maxLength}
          minLength={minLength}
          name={name}
          required
          type={isVisible ? "text" : "password"}
        />
        <button
          aria-controls={id}
          aria-label={actionLabel}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-card text-ink-3 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
          onClick={() => setIsVisible((visible) => !visible)}
          title={actionLabel}
          type="button"
        >
          {isVisible ? (
            <EyeOffIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      {description ? (
        <span
          className="mt-1.5 block text-xs font-normal leading-relaxed text-ink-3"
          id={descriptionId}
        >
          {description}
        </span>
      ) : null}
    </div>
  );
}
