"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Only the link list needs the pathname, so the client boundary stops here —
 * the header, brand mark and avatar stay server-rendered.
 */
export function NavLinks({
  authenticated,
  isFaculty = false,
  isInternalUnitMember = false,
  isPartnerRepresentative = false,
  isStudent = false,
}: {
  authenticated: boolean;
  isFaculty?: boolean;
  isInternalUnitMember?: boolean;
  isPartnerRepresentative?: boolean;
  isStudent?: boolean;
}) {
  const pathname = usePathname();

  // Each role has its own "my profile" destination — student, faculty,
  // partner and internal-unit profiles are entirely different data models
  // (see /profile, /faculty/profile, /partner/profile, /review/profile), so
  // this picks the one that matches the actor rather than hardcoding
  // `/profile`. Priority order only matters for the rare actor holding more
  // than one capability at once.
  const profileHref = isStudent
    ? "/profile"
    : isFaculty
      ? "/faculty/profile"
      : isPartnerRepresentative
        ? "/partner/profile"
        : isInternalUnitMember
          ? "/review/profile"
          : null;

  // Faculty/Partner/Review's own profile lives under their own path
  // (e.g. `/faculty/profile` under `/faculty`), so without this a section
  // link and "Profile" would both show active at once on that one page.
  const onOwnProfile = profileHref !== null && pathname.startsWith(profileHref);

  const links = [
    {
      href: "/challenges",
      label: "Challenges",
      // A challenge detail page is still "Challenges" (prefix match).
      active: pathname === "/challenges" || pathname.startsWith("/challenges/"),
    },
    // The applications/projects hub only means something for a student — a
    // faculty/partner/internal-unit actor's "work" is their own section
    // (Faculty/Partner/Review, linked below), not this.
    ...(authenticated && isStudent
      ? [
          {
            href: "/workspace",
            label: "Your work",
            active: pathname.startsWith("/workspace") || pathname.startsWith("/meeting"),
          },
        ]
      : []),
    ...(authenticated && profileHref
      ? [
          {
            href: profileHref,
            label: "Profile",
            active: pathname.startsWith(profileHref),
          },
        ]
      : []),
    // Nav visibility only — `/applications` independently re-checks STUDENT
    // (list) and `canAccessApplicationDetail` (detail) on every page.
    // Applications precede any project, so this covers the gap `/workspace`
    // (projects only) leaves for SUBMITTED/SHORTLISTED/ASSESSMENT/
    // SELECTION_PENDING/REJECTED state.
    ...(isStudent
      ? [{ href: "/applications", label: "Applications", active: pathname.startsWith("/applications") }]
      : []),
    // Nav visibility only — `/partner` independently re-checks
    // PARTNER_REPRESENTATIVE on every page/action regardless of this link.
    ...(isPartnerRepresentative
      ? [
          {
            href: "/partner",
            label: "Partner",
            active: pathname.startsWith("/partner") && !onOwnProfile,
          },
        ]
      : []),
    // Nav visibility only — `/faculty` independently re-checks FACULTY on
    // every page/action regardless of this link.
    ...(isFaculty
      ? [
          {
            href: "/faculty",
            label: "Faculty",
            active: pathname.startsWith("/faculty") && !onOwnProfile,
          },
        ]
      : []),
    // Nav visibility only — `/review` independently re-checks
    // INTERNAL_UNIT_MEMBER on every page/action regardless of this link.
    ...(isInternalUnitMember
      ? [
          {
            href: "/review",
            label: "Review",
            active: pathname.startsWith("/review") && !onOwnProfile,
          },
        ]
      : []),
  ];

  return (
    <>
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          aria-current={link.active ? "page" : undefined}
          className={cn(
            "hidden sm:inline-flex h-[60px] cursor-pointer items-center border-b-2 font-semibold transition-colors duration-150",
            link.active
              ? "border-red text-brand"
              : "border-transparent text-ink-2 hover:border-ink-3 hover:text-brand",
          )}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}
