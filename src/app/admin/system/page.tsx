import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { getAdminSystemStatus } from "@/db/queries/admin";
import { Chip } from "@/components/ui/chip";

export const dynamic = "force-dynamic";

function formatTimestamp(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Safe application/database health summary only (Section 9.6's explicit
 * allow-list: version, server time, environment label, live connectivity,
 * latest applied migration, one non-secret feature flag). Deliberately does
 * NOT show environment-variable values, connection strings, secrets,
 * tokens, or raw logs — real infrastructure observability is Phase 8's job,
 * not this checkpoint's.
 */
export default async function AdminSystemPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  const status = await getAdminSystemStatus();

  return (
    <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>System</h1>
      <p className="text-ink-2 mt-2">Safe application and database status.</p>

      <dl className="flex flex-col gap-1 mt-6 border border-line-2 rounded-card p-4">
        <Row label="Application version" value={status.applicationVersion} />
        <Row label="Server time" value={formatTimestamp(status.serverTime)} />
        <Row label="Environment" value={status.environmentLabel} />
        <Row
          label="Database connectivity"
          value={
            <Chip variant={status.databaseConnected ? "ok" : "warn"}>
              {status.databaseConnected ? "Connected" : "Unreachable"}
            </Chip>
          }
        />
        <Row
          label="Latest applied migration"
          value={
            status.latestMigration
              ? `${status.latestMigration.tag ?? "unknown tag"} (${formatTimestamp(status.latestMigration.appliedAt)})`
              : "Unknown"
          }
        />
        <Row
          label="Development authentication"
          value={
            <Chip variant={status.developmentAuthenticationEnabled ? "warn" : "ok"}>
              {status.developmentAuthenticationEnabled ? "Enabled" : "Disabled"}
            </Chip>
          }
        />
        <Row label="Phase 7 matching" value={<Chip>Not yet implemented</Chip>} />
      </dl>

      <p className="text-meta text-ink-3 mt-4">
        Structured job status and Phase 8 monitoring links will appear here once that
        infrastructure exists.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt className="text-meta text-ink-3">{label}</dt>
      <dd className="text-ink font-medium text-right">{value}</dd>
    </div>
  );
}
