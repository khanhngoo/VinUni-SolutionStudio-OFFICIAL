import type { AuthenticatedPresentation } from "@/auth/authenticated-presentation";
import { NavBar } from "@/components/layout/nav-bar";

/**
 * One consistent header for every route. Role-specific sections (faculty,
 * partner, review) still live at their own routes with their own pages —
 * they just share this chrome instead of each reimplementing a header.
 */
export function Chrome({
  children,
  identity,
}: {
  children: React.ReactNode;
  identity: AuthenticatedPresentation | null;
}) {
  return (
    <>
      <NavBar identity={identity} />
      <main className="flex-1">{children}</main>
    </>
  );
}
