import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { getFacultyProfile } from "@/services/faculty-profile.service";

import { FacultyProfileEditForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function FacultyProfileEditPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "FACULTY")) notFound();

  const profile = await getFacultyProfile(resolution.actor);

  return <FacultyProfileEditForm maxActiveSupervisions={profile.maxActiveSupervisions} />;
}
