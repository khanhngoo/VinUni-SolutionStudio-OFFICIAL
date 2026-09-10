/** Six glyphs, inline — not worth a dependency. */

interface IconProps {
  className?: string;
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3.25" y="7" width="9.5" height="6.5" rx="1.5" />
      <path d="M5.75 7V4.75a2.25 2.25 0 0 1 4.5 0V7" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6 3.5l4.5 4.5L6 12.5" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
    </svg>
  );
}

export function VideoIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="1.75" y="4" width="8.5" height="8" rx="1.5" />
      <path d="M10.25 7l4-2.25v6.5L10.25 9z" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M1.5 8S4 3.75 8 3.75 14.5 8 14.5 8 12 12.25 8 12.25 1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6.6 6.6a2 2 0 0 0 2.77 2.79" />
      <path d="M4.53 5.16C2.62 6.24 1.5 8 1.5 8s2.5 4.25 6.5 4.25c.86 0 1.66-.19 2.38-.5M6.58 4.06A7.14 7.14 0 0 1 8 3.75c4 0 6.5 4.25 6.5 4.25a12.3 12.3 0 0 1-2.44 2.9" />
      <path d="M2 2.5l12 11" />
    </svg>
  );
}
