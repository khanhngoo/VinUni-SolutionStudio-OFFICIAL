import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";

export const dynamic = "force-dynamic";

/**
 * Student recommendations — deferred.
 *
 * The previous "AI shortlist" here was `recommendationsFor()` over the
 * static student fixture (`@/lib/recommendations`), with no PostgreSQL
 * matching engine behind it. Matching/recommendation is explicitly Phase 7
 * work, so this route now says so plainly instead of presenting fabricated
 * "recommended student" cards as if a real ranking model produced them.
 */
export default async function PartnerStudentsPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PARTNER_REPRESENTATIVE")) notFound();

  return (
    <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner">Your challenges</Link>
        <span className="mx-1.5">›</span>
        Find students
      </nav>

      <h1 className="mt-3.5">Student recommendations aren&apos;t available yet</h1>
      <div className="mt-6 border border-dashed border-line rounded-card py-10 px-6 text-center">
        <p className="text-ink font-semibold">This is Phase 7 matching work</p>
        <p className="text-ink-2 mt-2 max-w-[520px] mx-auto leading-relaxed">
          Recommending students against a brief needs a real matching model
          over PostgreSQL data. That doesn&apos;t exist yet, so this page no
          longer shows a fabricated shortlist.
        </p>
      </div>
    </div>
  );
}
