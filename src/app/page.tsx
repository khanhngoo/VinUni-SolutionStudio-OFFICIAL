import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";

export const dynamic = "force-dynamic";

export default async function Home() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/challenges");
  const actor = resolution.actor;
  if (hasActorCapability(actor, "STUDENT")) redirect("/challenges");
  if (hasActorCapability(actor, "FACULTY")) redirect("/faculty");
  if (hasActorCapability(actor, "PARTNER_REPRESENTATIVE")) redirect("/partner");
  if (hasActorCapability(actor, "INTERNAL_UNIT_MEMBER")) redirect("/review");

  return (
    <div className="mx-auto max-w-[720px] px-6 py-12 sm:px-7">
      <h1>Your account needs setup</h1>
      <p className="mt-3 text-ink-2">
        You are signed in, but your account has no student, faculty, partner, or
        internal-unit record yet. Ask a Solutions Studio administrator to set up
        your access, then sign in again.
      </p>
      <Link className="mt-5 inline-block font-semibold text-brand" href="/challenges">
        Browse public challenges
      </Link>
    </div>
  );
}
