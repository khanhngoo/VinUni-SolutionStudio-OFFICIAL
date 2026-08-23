import { redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";

export default async function ProfileEditPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");

  // Profile editing is not part of the current production schema/runtime scope.
  redirect("/profile");
}
