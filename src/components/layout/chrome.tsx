"use client";

import { usePathname } from "next/navigation";
import type { AuthenticatedPresentation } from "@/auth/authenticated-presentation";
import { FacultyNavBar } from "@/components/layout/faculty-nav-bar";
import { NavBar } from "@/components/layout/nav-bar";
import { PartnerNavBar } from "@/components/layout/partner-nav-bar";

/**
 * Picks which portal's header to render. Faculty and partner are separate
 * app surfaces (own auth in a real deployment) from the student marketplace,
 * so each gets its own header rather than a shared nav with role-based links.
 */
export function Chrome({
  children,
  identity,
}: {
  children: React.ReactNode;
  identity: AuthenticatedPresentation | null;
}) {
  const pathname = usePathname();

  const header = pathname.startsWith("/faculty") ? (
    <FacultyNavBar identity={identity} />
  ) : pathname.startsWith("/partner") ? (
    <PartnerNavBar identity={identity} />
  ) : (
    <NavBar identity={identity} />
  );

  return (
    <>
      {header}
      <main className="flex-1">{children}</main>
    </>
  );
}
