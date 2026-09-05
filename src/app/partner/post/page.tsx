import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { listInternalUnitOrganizations } from "@/db/queries/review";
import { listActiveCanonicalSkills } from "@/db/queries/skills";
import { resolvePartnerOrganization } from "@/services/partner.service";

import { PostFlowShell } from "./post-flow-shell";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  CONFLICT: "A challenge with that title already exists — try a slightly different title.",
  FORBIDDEN: "Your account cannot post a challenge for this organization.",
  INVALID_TRANSITION: "That action is not valid for this challenge's current status.",
  NOT_FOUND: "One of the organizations you selected could not be found.",
  VALIDATION_ERROR: "Please check the challenge details and try again — every field must be valid.",
};

/**
 * The real challenge-authoring form, backed end-to-end by the existing
 * Phase 4.4 write service (`createChallengeDraft`). Owner organization is
 * resolved server-side from the actor's real EXTERNAL_PARTNER membership —
 * it is never a form field. Managing organization is a required, explicit
 * selection among real INTERNAL_UNIT organizations read from PostgreSQL
 * (no default/automatic routing — see the Cluster D product decision).
 */
export default async function PartnerPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; details?: string }>;
}) {
  const { error, details } = await searchParams;
  const detailMessages = details ? details.split("|").filter(Boolean) : [];
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  // Independent capability check — the same defensive pattern
  // `PartnerLayout`/`/partner` use, so this page never depends solely on
  // layout execution order.
  if (!hasActorCapability(resolution.actor, "PARTNER_REPRESENTATIVE")) notFound();

  const ownerResolution = resolvePartnerOrganization(resolution.actor);
  if (ownerResolution.kind !== "RESOLVED") {
    return (
      <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
        <h1>Cannot post a challenge</h1>
        <p className="text-ink-2 mt-2">
          {ownerResolution.kind === "AMBIGUOUS"
            ? "Your account is a partner representative for more than one organization. Ask an administrator to leave you on the one you are posting for."
            : "Your account has no active external-partner organization membership."}
        </p>
      </div>
    );
  }

  const [managingOrganizations, canonicalSkills] = await Promise.all([
    listInternalUnitOrganizations(),
    listActiveCanonicalSkills(),
  ]);

  return (
    <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner">Your challenges</Link>
        <span className="mx-1.5">›</span>
        Post a challenge
      </nav>

      <h1 className="mt-3.5">Post a challenge</h1>
      <p className="text-ink-2 mt-2">
        This saves a draft. A CAID officer reviews every posting for compliance
        before it reaches students, and publishing is their decision.
      </p>

      {error ? (
        <div className="mt-4 border border-red/40 bg-red/5 text-red rounded-card px-4 py-3">
          <p>{ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}</p>
          {detailMessages.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 space-y-0.5">
              {detailMessages.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <PostFlowShell
        canonicalSkills={canonicalSkills}
        managingOrganizations={managingOrganizations}
      />
    </div>
  );
}
