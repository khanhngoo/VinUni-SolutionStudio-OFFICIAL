import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Chip } from "@/components/ui/chip";
import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { listMyApplications, toApplicationActorContext } from "@/services/application.service";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The persistent home for "what's the status of my application?" — the gap
 * `/workspace` cannot fill, since a project only exists after an offer is
 * accepted. Every application the actor has ever submitted appears here,
 * at whatever lifecycle stage it is currently in (SUBMITTED through
 * SELECTED/REJECTED/WITHDRAWN), linking to the shared detail page.
 */
export default async function MyApplicationsPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  // Independent capability check — never relies solely on nav visibility.
  if (!hasActorCapability(resolution.actor, "STUDENT")) notFound();

  const applications = await listMyApplications(toApplicationActorContext(resolution.actor));

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Your applications</h1>
      <p className="text-ink-2 mt-2">Every challenge you have applied to, at its current status.</p>

      {applications.length === 0 ? (
        <div className="mt-6 border border-dashed border-line rounded-card py-16 px-6 text-center">
          <p className="text-ink font-semibold">No applications yet</p>
          <p className="text-ink-2 mt-1.5">Applications you submit from the marketplace will appear here.</p>
        </div>
      ) : (
        <section className="mt-7 bg-card border border-line rounded-card px-5">
          <table className="w-full border-collapse">
            <tbody>
              {applications.map((application) => (
                <tr key={application.publicId} className="border-b border-line-2 last:border-b-0">
                  <td className="py-3 pr-3">
                    <Link
                      href={`/applications/${application.publicId}`}
                      className="font-medium text-ink hover:text-brand"
                    >
                      {application.challenge.title}
                    </Link>
                    <p className="text-meta text-ink-3 mt-0.5">
                      {application.teamName ?? "No team name"} ·{" "}
                      {application.memberSummary.total} member
                      {application.memberSummary.total === 1 ? "" : "s"}
                    </p>
                  </td>
                  <td className="py-3 pr-3 w-[160px]">
                    <Chip>{application.status.replaceAll("_", " ")}</Chip>
                  </td>
                  <td className="py-3 pr-3 w-[140px] text-right text-meta text-ink-3">
                    {application.submittedAt ? `Submitted ${formatDate(application.submittedAt)}` : "—"}
                  </td>
                  <td className="py-3 w-[70px] text-right">
                    <Link
                      href={`/applications/${application.publicId}`}
                      className="text-meta font-semibold text-brand hover:text-brand-deep"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
