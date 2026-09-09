import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { OrganizationMemberProfile } from "@/components/account/organization-member-profile";
import { getOrganizationMemberProfile } from "@/services/account-profile.service";

export const dynamic = "force-dynamic";

export default async function PartnerProfilePage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PARTNER_REPRESENTATIVE")) notFound();

  const profile = await getOrganizationMemberProfile(resolution.actor, "EXTERNAL_PARTNER");

  return (
    <OrganizationMemberProfile
      editHref="/partner/profile/edit"
      email={profile.email}
      fullName={profile.fullName}
      memberships={profile.memberships}
      title="Partner profile"
    />
  );
}
