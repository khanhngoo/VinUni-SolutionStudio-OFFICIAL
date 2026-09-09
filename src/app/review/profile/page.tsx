import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { OrganizationMemberProfile } from "@/components/account/organization-member-profile";
import { getOrganizationMemberProfile } from "@/services/account-profile.service";

export const dynamic = "force-dynamic";

export default async function ReviewProfilePage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "INTERNAL_UNIT_MEMBER")) notFound();

  const profile = await getOrganizationMemberProfile(resolution.actor, "INTERNAL_UNIT");

  return (
    <OrganizationMemberProfile
      editHref="/review/profile/edit"
      email={profile.email}
      fullName={profile.fullName}
      memberships={profile.memberships}
      title="Internal-unit profile"
    />
  );
}
