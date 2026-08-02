"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinksProps {
  /** The workspace of the student's current engagement, if they have one. */
  workspaceHref: string | null;
}

/**
 * Only the link list needs the pathname, so the client boundary stops here —
 * the header, brand mark and avatar stay server-rendered.
 */
export function NavLinks({ workspaceHref }: NavLinksProps) {
  const pathname = usePathname();

  const links = [
    {
      href: "/challenges",
      label: "Challenges",
      // A challenge detail page is still "Challenges" (prefix match).
      active: pathname === "/challenges" || pathname.startsWith("/challenges/"),
    },
    ...(workspaceHref
      ? [
          {
            href: workspaceHref,
            label: "Workspace",
            active: pathname.startsWith("/workspace"),
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
