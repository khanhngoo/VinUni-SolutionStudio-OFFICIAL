"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

/**
 * Every entry here must correspond to a route that exists. Checkpoint D
 * shipped overview + the five read-only lists; Checkpoint E added activity
 * and audit; Checkpoint F added access (second-owner grant/revoke,
 * suspend/reactivate via the users detail page); Checkpoint G adds
 * assessments, offers, and system. Never list a route that doesn't exist
 * yet (Section 14.2: never imply coverage that isn't there).
 */
const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/challenges", label: "Challenges" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/assessments", label: "Assessments" },
  { href: "/admin/offers", label: "Offers" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/access", label: "Access" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/system", label: "System" },
] as const;

export function AdminNavigation() {
  const activeHref = usePathname();

  return (
    <nav aria-label="Global administration" className="border-b border-line-2">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-7 flex items-center gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin" ? activeHref === "/admin" : activeHref.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex items-center h-11 px-3 border-b-2 font-medium whitespace-nowrap",
                isActive
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-2 hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
