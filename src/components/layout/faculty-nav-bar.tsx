import Link from "next/link";
import type { AuthenticatedPresentation } from "@/auth/authenticated-presentation";
import { signOutCurrentUser } from "@/app/sign-in/actions";

/** The VinUniversity chevron mark: navy left half, red right half. */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 22" aria-hidden className={className}>
      <path d="M1 1h7.2L12 15.5 15.8 1H23L12 21.5Z" fill="var(--color-brand)" />
      <path d="M15.8 1H23L12 21.5l3.2-6.2Z" fill="var(--color-red)" />
    </svg>
  );
}

/**
 * The faculty portal's own header — a distinct app surface from the student
 * marketplace (different auth, different audience), so it gets its own nav
 * rather than another link bolted onto the student `NavBar`. Light like the
 * dashboard content below it (which uses the same `bg-card`/`text-ink` theme
 * as every other page) rather than a dark banner that would visually clash
 * with it.
 */
export function FacultyNavBar({ identity }: { identity: AuthenticatedPresentation | null }) {
  return (
    <header className="h-[60px] shrink-0 bg-card border-b border-line">
      <div className="h-full px-7 flex items-center justify-between gap-6">
        <Link
          href="/faculty"
          className="flex items-center gap-2.5 font-bold text-[14px] tracking-[0.01em] uppercase text-brand hover:text-brand"
        >
          <BrandMark className="w-6 h-[22px]" />
          Solutions Studio
          <span className="text-ink-3 font-medium normal-case tracking-normal">
            · Faculty
          </span>
        </Link>

        <nav className="flex items-center gap-5 sm:gap-[22px]">
          <span className="hidden sm:inline-flex h-[60px] items-center border-b-2 border-red font-semibold text-brand">
            Queue
          </span>
          {identity ? (
            <>
              <span
                className="w-7 h-7 rounded-full bg-brand text-white grid place-items-center text-[10px] font-semibold"
                title={identity.displayName}
              >
                {identity.initials}
              </span>
              <form action={signOutCurrentUser}>
                <button className="text-meta font-semibold text-ink-2 hover:text-brand" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
