import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { listAdminPlatformOwners } from "@/db/queries/admin";
import { Section } from "@/components/ui/section";

import { grantOwnerAction, revokeOwnerAction } from "./actions";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  CONFLICT: "That account already holds an active platform-owner assignment.",
  LAST_PLATFORM_OWNER: "Refusing to revoke the final platform owner.",
  NOT_FOUND: "No active account matches that email, or the target owner could not be found.",
  VALIDATION_ERROR: "Please check the form and try again.",
};

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Platform-owner assignments and approved access operations (Section 8).
 * Grant/revoke were already approved and built as service functions in
 * Checkpoint C (`grantPlatformOwner`/`revokePlatformOwner`); this page only
 * adds an authenticated in-app caller in place of the CLI-only path — no new
 * authority model. Every mutation re-checks `PLATFORM_OWNER` independently
 * inside `./actions.ts` (Section 13.3), requires an explicit confirmation
 * checkbox (Section 14.3), and re-renders authoritative state (this list,
 * freshly queried) after completion.
 */
export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ granted?: string; revoked?: string; error?: string; details?: string }>;
}) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  const query = await searchParams;
  const errorDetails = query.details ? query.details.split("|").filter(Boolean) : [];
  const owners = await listAdminPlatformOwners();
  const isLastOwner = owners.length <= 1;

  return (
    <div className="max-w-[1200px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Access</h1>
      <p className="text-ink-2 mt-2">
        {owners.length} active platform {owners.length === 1 ? "owner" : "owners"}
      </p>

      <div aria-live="polite">
        {query.granted ? <Banner tone="ok">Platform-owner access granted.</Banner> : null}
        {query.revoked ? <Banner tone="ok">Platform-owner access revoked.</Banner> : null}
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

      <div className="mt-5">
        <Section title="Active platform owners">
          <ul className="flex flex-col gap-3">
            {owners.map((owner) => (
              <li
                key={owner.platformRoleId.toString()}
                className="border border-line-2 rounded-card p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-ink">{owner.fullName}</p>
                  <p className="text-meta text-ink-3">{owner.email}</p>
                  <p className="text-meta text-ink-3 mt-1">
                    Granted {formatDate(owner.grantedAt)}
                    {owner.grantedByName ? ` by ${owner.grantedByName}` : ""}
                  </p>
                </div>

                {isLastOwner ? (
                  <p className="text-meta text-ink-3 max-w-[220px]">
                    The final platform owner cannot be revoked.
                  </p>
                ) : (
                  <form action={revokeOwnerAction} className="flex flex-col items-end gap-2">
                    <input type="hidden" name="targetUserId" value={owner.userId.toString()} />
                    <label className="flex items-center gap-2 text-meta text-ink-2">
                      <input type="checkbox" name="confirm" required />
                      Confirm revoke
                    </label>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center h-9 px-4 rounded-card border border-red/40 text-red font-medium hover:bg-red/5"
                    >
                      Revoke
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="mt-5">
        <Section title="Grant additional owner">
          <form action={grantOwnerAction} className="flex flex-col gap-3 max-w-[420px]">
            <label className="flex flex-col gap-1 text-meta text-ink-2">
              Email
              <input
                type="email"
                name="email"
                required
                placeholder="person@example.com"
                className="h-9 px-2.5 rounded-card border border-line bg-card text-ink-2"
              />
            </label>
            <label className="flex items-center gap-2 text-meta text-ink-2">
              <input type="checkbox" name="confirm" required />
              Confirm grant
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center h-10 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep self-start"
            >
              Grant platform-owner access
            </button>
          </form>
        </Section>
      </div>
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
