"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthenticatedPresentation } from "@/auth/authenticated-presentation";
import { cn } from "@/lib/cn";

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
 * The partner portal's header.
 *
 * Light like the student marketplace rather than dark like the faculty queue:
 * a partner spends their time on the same challenge and project records a
 * student does, and the shared chrome makes the two views of one record read
 * as two views of one record. The squared org monogram — students get a round
 * personal avatar — carries the distinction instead.
 */
export function PartnerNavBar({ identity }: { identity: AuthenticatedPresentation | null }) {
  const pathname = usePathname();

  const links = [
    {
      href: "/partner",
      label: "Challenges",
      active:
        pathname === "/partner" || pathname.startsWith("/partner/challenges"),
    },
    {
      href: "/partner/students",
      label: "Students",
      active: pathname.startsWith("/partner/students"),
    },
    {
      href: "/partner/projects",
      label: "Projects",
      active: pathname.startsWith("/partner/projects"),
    },
  ];

  return (
    <header className="h-[60px] shrink-0 bg-card border-b border-line">
      <div className="h-full px-7 flex items-center justify-between gap-6">
        <Link
          href="/partner"
          className="flex items-center gap-2.5 font-bold text-[14px] tracking-[0.01em] uppercase text-brand hover:text-brand"
        >
          <BrandMark className="w-6 h-[22px]" />
          Solutions Studio
          <span className="text-ink-3 font-medium normal-case tracking-normal">
            · Partner
          </span>
        </Link>

        <nav className="flex items-center gap-5 sm:gap-[22px]">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.active ? "page" : undefined}
              className={cn(
                "hidden sm:inline-flex h-[60px] items-center border-b-2",
                link.active
                  ? "border-red font-semibold text-brand hover:text-brand"
                  : "border-transparent text-ink-2 hover:text-brand",
              )}
            >
              {link.label}
            </Link>
          ))}
          {identity ? (
            <span
              className="w-7 h-7 rounded-full bg-brand text-white grid place-items-center text-[10px] font-semibold"
              title={identity.displayName}
            >
              {identity.initials}
            </span>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
