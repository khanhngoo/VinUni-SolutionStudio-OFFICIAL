import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PARTNER_REPRESENTATIVE")) notFound();
  return children;
}
