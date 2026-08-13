"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Only the link list needs the pathname, so the client boundary stops here —
 * the header, brand mark and avatar stay server-rendered.
 */
export function NavLinks() {
  const pathname = usePathname();

  const links = [
    {
      href: "/challenges",
      label: "Challenges",
      // A challenge detail page is still "Challenges" (prefix match).
      active: pathname === "/challenges" || pathname.startsWith("/challenges/"),
    },
    {
      // The hub, not a single application — it is always somewhere to go, even
      // with nothing active, so this link no longer disappears.
      href: "/workspace",
      label: "Your work",
      active:
        pathname.startsWith("/workspace") || pathname.startsWith("/meeting"),
    },
    {
      href: "/profile",
      label: "Profile",
      active: pathname.startsWith("/profile"),
    },
  ];

  return (
    <>
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          aria-current={link.active ? "page" : undefined}
          className={
            link.active
              ? "hidden sm:inline-flex h-[60px] items-center border-b-2 border-red font-semibold text-brand hover:text-brand"
              : "hidden sm:inline-flex h-[60px] items-center border-b-2 border-transparent text-ink-2 hover:text-brand"
          }
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}
