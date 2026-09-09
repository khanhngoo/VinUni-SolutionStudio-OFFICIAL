import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { getReviewQueue, ReviewError } from "@/services/review.service";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The generic internal-unit review queue — the same code serves any real
 * INTERNAL_UNIT actor (CAID, E-Lab, or any future unit). It never shows
 * challenges managed by an organization the actor does not belong to:
 * `getReviewQueue` scopes strictly to the actor's own active INTERNAL_UNIT
 * memberships (`resolveInternalUnitOrganizationIds`).
 */
export default async function ReviewQueuePage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  // Independent capability check — never relies solely on `ReviewLayout`
  // having already run (see that layout's comment).
  if (!hasActorCapability(resolution.actor, "INTERNAL_UNIT_MEMBER")) notFound();

  let queue;
  try {
    queue = await getReviewQueue(resolution.actor);
  } catch (error) {
    if (error instanceof ReviewError) {
      return (
        <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
          <h1>No internal unit membership</h1>
          <p className="text-ink-2 mt-2">
            Your account has no active INTERNAL_UNIT organization
            membership, so no review queue can be shown.
          </p>
        </div>
      );
    }
    throw error;
  }

  const { approved, needsReview } = queue;

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Review queue</h1>
      <p className="text-ink-2 mt-2">{resolution.actor.user.fullName}</p>

      <Section title="Needs review" aside={`${needsReview.length} total`}>
        {needsReview.length === 0 ? (
          <EmptyRow>Nothing is waiting for review.</EmptyRow>
        ) : (
          <QueueTable items={needsReview} />
        )}
      </Section>

      <Section title="Approved / ready to publish" aside={`${approved.length} total`}>
        {approved.length === 0 ? (
          <EmptyRow>Nothing is approved and waiting to be published.</EmptyRow>
        ) : (
          <QueueTable items={approved} />
        )}
      </Section>
    </div>
  );
}

function QueueTable({
  items,
}: {
  items: Array<{
    applicationDeadline: Date | null;
    ownerOrganizationName: string;
    publicId: string;
    slug: string | null;
    status: string;
    title: string;
  }>;
}) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {items.map((item) => (
          <tr key={item.publicId} className="border-b border-line-2 last:border-b-0">
            <td className="py-2.5 pr-3 align-middle">
              {item.slug ? (
                <Link href={`/review/${item.slug}`} className="font-medium text-ink hover:text-brand">
                  {item.title}
                </Link>
              ) : (
                <span className="font-medium text-ink">{item.title}</span>
              )}
              <p className="text-meta text-ink-3 mt-0.5">Owned by {item.ownerOrganizationName}</p>
            </td>
            <td className="py-2.5 pr-3 align-middle w-[140px]">
              <Chip>{item.status.replaceAll("_", " ")}</Chip>
            </td>
            <td className="py-2.5 align-middle w-[120px] text-right">
              <span className="text-meta text-ink-3 whitespace-nowrap">
                {item.applicationDeadline ? formatDate(item.applicationDeadline) : "No deadline"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-line rounded-card py-8 px-6 text-center">
      <p className="text-ink-2">{children}</p>
    </div>
  );
}
