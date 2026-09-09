import Link from "next/link";
import type { AuthenticatedPresentation } from "@/auth/authenticated-presentation";
import { signOutCurrentUser } from "@/app/sign-in/actions";
import { NavLinks } from "@/components/layout/nav-links";

/** The VinUniversity chevron mark: navy left half, red right half. */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 22" aria-hidden className={className}>
      <path d="M1 1h7.2L12 15.5 15.8 1H23L12 21.5Z" fill="var(--color-brand)" />
      <path d="M15.8 1H23L12 21.5l3.2-6.2Z" fill="var(--color-red)" />
    </svg>
  );
}

export function NavBar({ identity }: { identity: AuthenticatedPresentation | null }) {
  // Authenticated users navigate to the workspace hub, which can represent
  // multiple projects without implying a personal identity to anonymous users.
  return (
    <header className="h-[60px] shrink-0 bg-card border-b border-line">
      <div className="h-full px-7 flex items-center justify-between gap-6">
        <Link
          href="/challenges"
          className="flex items-center gap-2.5 font-bold text-[14px] tracking-[0.01em] uppercase text-brand hover:text-brand"
        >
          <BrandMark className="w-6 h-[22px]" />
          Solutions Studio
        </Link>

        <nav className="flex items-center gap-5 sm:gap-[22px]">
          <NavLinks
            authenticated={identity !== null}
            isFaculty={identity?.isFaculty ?? false}
            isInternalUnitMember={identity?.isInternalUnitMember ?? false}
            isPartnerRepresentative={identity?.isPartnerRepresentative ?? false}
            isStudent={identity?.isStudent ?? false}
          />
          {identity ? (
            <>
              <span
                className="w-7 h-7 rounded-full bg-brand text-white grid place-items-center text-[10px] font-semibold"
                title={identity.displayName}
              >
                {identity.initials}
              </span>
              <form action={signOutCurrentUser}>
                <button
                  className="cursor-pointer text-meta font-semibold text-ink-2 transition-colors hover:text-brand hover:underline underline-offset-2"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              className="cursor-pointer font-semibold text-brand transition-colors hover:text-brand-deep hover:underline underline-offset-2"
              href="/sign-in"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
