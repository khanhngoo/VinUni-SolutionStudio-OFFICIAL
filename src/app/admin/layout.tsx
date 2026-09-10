import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { AdminNavigation } from "@/components/admin/admin-navigation";

/**
 * The first gate for `/admin` — mirrors `ReviewLayout`/`FacultyLayout`. This
 * is NOT the sole authorization boundary: per Section 13.3 of
 * `context/admin-console-implementation-plan.md`, every page and Server
 * Action under `/admin` independently re-resolves the actor and re-checks
 * `PLATFORM_OWNER` (via `requirePlatformOwner`) before any read or mutation.
 * A Server Component tree can start rendering a page before a sibling
 * layout's `notFound()` is observed, so this layout alone must never be
 * trusted as sufficient (see `ReviewLayout`'s identical note, and the
 * installed Next.js docs on layouts and auth checks).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line-2 bg-brand-soft/30">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-7 py-3">
          <p className="text-meta text-ink-3 font-medium">Global administration</p>
          <p className="text-meta text-ink-2 mt-0.5">
            Signed in as {resolution.actor.user.fullName} — platform owner
          </p>
        </div>
      </header>
      <AdminNavigation />
      {children}
    </div>
  );
}
