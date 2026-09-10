import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { getAdminAttentionItems, getAdminOverview } from "@/db/queries/admin";
import { StatusBreakdown } from "@/components/admin/status-summary";

export const dynamic = "force-dynamic";

/**
 * Every count here is a live, bounded, set-based SQL aggregate computed in
 * `getAdminOverview()`/`getAdminAttentionItems()` — never loaded-and-counted
 * in React (Section 9.1). This page still does not embed a live activity
 * feed inline (Section 9.1's "recent audit events" bullet): `/admin/activity`
 * and `/admin/audit` (Checkpoint E) are the dedicated, filterable views for
 * that, linked below rather than duplicated here.
 */
export default async function AdminOverviewPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  const [overview, attention] = await Promise.all([getAdminOverview(), getAdminAttentionItems()]);
  const { users, organizations, challenges, applications, projects } = overview;

  return (
    <div className="max-w-[1200px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Global workflow overview</h1>
      <p className="text-ink-2 mt-2">
        Live counts across the platform. Every number links to the exact
        filtered list that produced it.
      </p>

      <div className="mt-5">
        <h2 className="marker-triangle text-brand">Attention items</h2>
        <p className="text-meta text-ink-3 mt-1">
          Detected from existing lifecycle timestamps and statuses — never an
          invented health score (Section 9.1).
        </p>
        <div className="grid gap-3 sm:grid-cols-3 mt-3">
          <AttentionItem
            label="Awaiting review 7+ days"
            definition="Challenges with status SUBMITTED or UNDER_REVIEW, unchanged for at least 7 days."
            count={attention.staleReviewChallenges}
            href="/admin/challenges"
          />
          <AttentionItem
            label="Open past deadline"
            definition="Challenges with status APPLICATIONS_OPEN whose application deadline has already passed."
            count={attention.expiredOpenChallenges}
            href="/admin/challenges?status=APPLICATIONS_OPEN"
          />
          <AttentionItem
            label="Offers overdue"
            definition="Offers with status PENDING whose respond-by date has already passed."
            count={attention.overduePendingOffers}
            href="/admin/offers?status=PENDING"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        <StatusBreakdown
          title="Users by status"
          total={users.total}
          totalHref="/admin/users"
          rows={users.byStatus.map((row) => ({
            href: `/admin/users?status=${row.status}`,
            label: row.status,
            count: row.count,
          }))}
        />

        <StatusBreakdown
          title="Users by capability"
          total={users.total}
          totalHref="/admin/users"
          rows={[
            { href: "/admin/users?capability=STUDENT", label: "Student", count: users.capabilities.student },
            { href: "/admin/users?capability=FACULTY", label: "Faculty", count: users.capabilities.faculty },
            {
              href: "/admin/users?capability=PARTNER_REPRESENTATIVE",
              label: "Partner representative",
              count: users.capabilities.partnerRepresentative,
            },
            {
              href: "/admin/users?capability=INTERNAL_UNIT_MEMBER",
              label: "Internal unit member",
              count: users.capabilities.internalUnitMember,
            },
            {
              href: "/admin/users?capability=PLATFORM_OWNER",
              label: "Platform owner",
              count: users.capabilities.platformOwner,
            },
            { href: "/admin/users", label: "Authorization-neutral (self-service)", count: users.capabilities.neutral },
          ]}
        />

        <StatusBreakdown
          title="Organizations by type"
          total={organizations.total}
          totalHref="/admin/organizations"
          rows={organizations.byType.map((row) => ({
            href: `/admin/organizations?organizationType=${row.status}`,
            label: row.status,
            count: row.count,
          }))}
        />

        <StatusBreakdown
          title="Organizations by verification"
          total={organizations.total}
          totalHref="/admin/organizations"
          rows={organizations.byVerificationStatus.map((row) => ({
            href: `/admin/organizations?verificationStatus=${row.status}`,
            label: row.status,
            count: row.count,
          }))}
        />

        <StatusBreakdown
          title="Challenges by status"
          total={challenges.total}
          totalHref="/admin/challenges"
          rows={challenges.byStatus.map((row) => ({
            href: `/admin/challenges?status=${row.status}`,
            label: row.status,
            count: row.count,
          }))}
        />

        <StatusBreakdown
          title="Applications by status"
          total={applications.total}
          totalHref="/admin/applications"
          rows={applications.byStatus.map((row) => ({
            href: `/admin/applications?status=${row.status}`,
            label: row.status,
            count: row.count,
          }))}
        />

        <StatusBreakdown
          title="Projects by status"
          total={projects.total}
          totalHref="/admin/projects"
          rows={projects.byStatus.map((row) => ({
            href: `/admin/projects?status=${row.status}`,
            label: row.status,
            count: row.count,
          }))}
        />
      </div>

      <div className="border border-dashed border-line rounded-card p-4 mt-6">
        <p className="text-ink-2">
          <strong className="text-ink">Activity and audit history.</strong>{" "}
          Real domain mutations began writing `audit_logs` events on
          2026-09-09 (Checkpoint E) — coverage is incremental, not yet every
          mutation in the codebase. See{" "}
          <Link href="/admin/activity" className="text-brand hover:text-brand-deep">
            Activity
          </Link>{" "}
          for the chronological feed or{" "}
          <Link href="/admin/audit" className="text-brand hover:text-brand-deep">
            Audit
          </Link>{" "}
          to filter by action, entity, or actor.
        </p>
      </div>
    </div>
  );
}

function AttentionItem({
  label,
  definition,
  count,
  href,
}: {
  label: string;
  definition: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block border border-line-2 rounded-card p-4 hover:border-brand"
      title={definition}
    >
      <p className={`text-[24px] font-semibold tabular-nums ${count > 0 ? "text-accent" : "text-ink"}`}>{count}</p>
      <p className="text-meta text-ink-2 mt-1">{label}</p>
    </Link>
  );
}
