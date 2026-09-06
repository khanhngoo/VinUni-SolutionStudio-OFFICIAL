"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Secondary sub-navigation for the partner portal's sibling pages. The
 * shared `NavBar` (brand mark, primary links, avatar, sign-out) already
 * renders above this on every route, so this strip only carries the
 * partner-specific tabs.
 */
export function PartnerSectionTabs() {
  const pathname = usePathname();

  const links = [
    {
      href: "/partner",
      label: "Overview",
      active: pathname === "/partner" || pathname.startsWith("/partner/challenges"),
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
    <div className="h-11 shrink-0 bg-card border-b border-line">
      <div className="h-full px-7 flex items-center gap-5 sm:gap-[22px]">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.active ? "page" : undefined}
            className={cn(
              "inline-flex h-11 cursor-pointer items-center border-b-2 text-meta font-semibold transition-colors duration-150",
              link.active
                ? "border-red text-brand"
                : "border-transparent text-ink-2 hover:border-ink-3 hover:text-brand",
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
