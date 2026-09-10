import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { getAdminUserDetail, type AdminAuditEventListItem } from "@/db/queries/admin";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { WorkflowTable } from "@/components/admin/workflow-table";

import { reactivateUserAction, suspendUserAction } from "./actions";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  LAST_PLATFORM_OWNER: "Refusing to suspend the final accessible platform owner.",
  NOT_FOUND: "This user could not be found.",
  VALIDATION_ERROR: "A suspension reason is required (500 characters or fewer).",
};

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The Checkpoint F user detail: distinguishes identity, authentication
 * method/credential presence, student/faculty profile, organization
 * memberships, and global platform role as separate fields (Section 9.3 —
 * "must not become one editable role dropdown"), plus this user's own
 * recent audit events. The only mutation here is account suspension/
 * reactivation (Section 10.3); every other field is read-only metadata.
 */
export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ suspended?: string; reactivated?: string; error?: string; details?: string }>;
}) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  const [{ userId: userIdParam }, query] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(userIdParam)) notFound();

  const user = await getAdminUserDetail(BigInt(userIdParam));
  if (!user) notFound();

  const errorDetails = query.details ? query.details.split("|").filter(Boolean) : [];

  return (
    <div className="max-w-[900px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <p className="text-meta">
        <Link href="/admin/users" className="text-brand hover:text-brand-deep">
          ← Users
        </Link>
      </p>
      <h1 className="mt-1">{user.fullName}</h1>
      <p className="text-ink-2 mt-1">{user.email}</p>

      <div aria-live="polite">
        {query.suspended ? <Banner tone="ok">Account suspended.</Banner> : null}
        {query.reactivated ? <Banner tone="ok">Account reactivated.</Banner> : null}
        {query.error ? (
          <Banner tone="error">
            <p>{ERROR_MESSAGES[query.error] ?? "Something went wrong."}</p>
            {errorDetails.length > 0 ? (
              <ul className="list-disc list-inside mt-1">
                {errorDetails.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </Banner>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-6">
        <div className="border border-line-2 rounded-card p-4">
          <h3 className="font-semibold text-ink mb-2">Identity</h3>
          <dl className="flex flex-col gap-1">
            <Row
              label="Status"
              value={
                <Chip variant={user.status === "SUSPENDED" ? "warn" : user.status === "ACTIVE" ? "ok" : undefined}>
                  {user.status ?? "—"}
                </Chip>
              }
            />
            <Row label="Credential" value={user.hasCredential ? "Present" : "None"} />
            <Row label="Created" value={formatDate(user.createdAt)} />
            <Row label="Updated" value={formatDate(user.updatedAt)} />
          </dl>
        </div>

        <div className="border border-line-2 rounded-card p-4">
          <h3 className="font-semibold text-ink mb-2">Global platform role</h3>
          {user.platformRole ? (
            <dl className="flex flex-col gap-1">
              <Row label={user.platformRole.role.replaceAll("_", " ")} value={<Chip variant={user.platformRole.status === "ACTIVE" ? "ok" : undefined}>{user.platformRole.status}</Chip>} />
              <Row label="Granted" value={formatDate(user.platformRole.grantedAt)} />
            </dl>
          ) : (
            <p className="text-ink-2">No global platform role.</p>
          )}
        </div>

        {user.studentProfile ? (
          <div className="border border-line-2 rounded-card p-4">
            <h3 className="font-semibold text-ink mb-2">Student profile</h3>
            <dl className="flex flex-col gap-1">
              <Row label="School" value={user.studentProfile.school ?? "—"} />
              <Row label="Major" value={user.studentProfile.major ?? "—"} />
              <Row label="Study year" value={user.studentProfile.studyYear?.toString() ?? "—"} />
            </dl>
          </div>
        ) : null}

        {user.facultyProfile ? (
          <div className="border border-line-2 rounded-card p-4">
            <h3 className="font-semibold text-ink mb-2">Faculty profile</h3>
            <dl className="flex flex-col gap-1">
              <Row label="School" value={user.facultyProfile.school ?? "—"} />
              <Row label="Department" value={user.facultyProfile.department ?? "—"} />
              <Row label="Title" value={user.facultyProfile.academicTitle ?? "—"} />
            </dl>
          </div>
        ) : null}
      </div>

      <Section title="Organization memberships">
        {user.memberships.length === 0 ? (
          <p className="text-ink-2">No organization memberships.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {user.memberships.map((membership) => (
              <li
                key={`${membership.organizationId}-${membership.role}`}
                className="flex items-center justify-between gap-3 text-meta border border-line-2 rounded-card px-3 py-2"
              >
                <span className="text-ink-2">
                  {membership.organizationName}{" "}
                  <span className="text-ink-3">({membership.organizationType.replaceAll("_", " ")})</span>
                </span>
                <span className="text-ink-3">
                  {membership.role} — {membership.status ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Account status">
        {user.status === "SUSPENDED" ? (
          <form action={reactivateUserAction}>
            <input type="hidden" name="targetUserId" value={user.id.toString()} />
            <button
              type="submit"
              className="inline-flex items-center justify-center h-10 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
            >
              Reactivate account
            </button>
          </form>
        ) : (
          <form action={suspendUserAction} className="flex flex-col gap-3 max-w-[480px]">
            <input type="hidden" name="targetUserId" value={user.id.toString()} />
            <label className="flex flex-col gap-1 text-meta text-ink-2">
              Reason (recorded in the audit log)
              <textarea
                name="reason"
                required
                maxLength={500}
                rows={3}
                placeholder="Why is this account being suspended?"
                className="w-full px-3 py-2 rounded-card border border-line bg-card text-ink"
              />
            </label>
            <label className="flex items-center gap-2 text-meta text-ink-2">
              <input type="checkbox" name="confirm" required />
              Confirm suspend
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center h-10 px-4 rounded-card border border-red/40 text-red font-medium hover:bg-red/5 self-start"
            >
              Suspend account
            </button>
          </form>
        )}
      </Section>

      <Section title="Recent administrative events">
        <WorkflowTable
          caption={`Recent audit events for ${user.fullName}`}
          emptyLabel="No audit events recorded for this user yet."
          getRowKey={(row: AdminAuditEventListItem) => row.id.toString()}
          rows={user.recentAuditEvents.items}
          columns={[
            { header: "Time", render: (row) => formatDate(row.createdAt) },
            { header: "Action", render: (row) => <Chip>{row.action.replaceAll("_", " ")}</Chip> },
            { header: "Actor", render: (row) => row.actorName ?? <span className="text-ink-3">System</span> },
          ]}
        />
      </Section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-meta text-ink-3">{label}</dt>
      <dd className="text-ink font-medium text-right">{value}</dd>
    </div>
  );
}

function Banner({ children, tone }: { children: React.ReactNode; tone: "error" | "ok" }) {
  return (
    <div
      className={
        tone === "ok"
          ? "mt-4 border border-line bg-line-2 text-ink-2 rounded-card px-4 py-3"
          : "mt-4 border border-red/40 bg-red/5 text-red rounded-card px-4 py-3"
      }
    >
      {children}
    </div>
  );
}
