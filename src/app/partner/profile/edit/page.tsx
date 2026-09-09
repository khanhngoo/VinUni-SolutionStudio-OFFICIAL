import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { MembershipJobTitleEditForm } from "@/components/account/membership-job-title-edit-form";
import { getOrganizationMemberProfile } from "@/services/account-profile.service";

import { savePartnerProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function PartnerProfileEditPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PARTNER_REPRESENTATIVE")) notFound();

  const profile = await getOrganizationMemberProfile(resolution.actor, "EXTERNAL_PARTNER");

  return (
    <>
      {profile.memberships.map((membership) => (
        <MembershipJobTitleEditForm
          key={membership.membershipId.toString()}
          backHref="/partner/profile"
          initialJobTitle={membership.jobTitle}
          membershipId={membership.membershipId.toString()}
          organizationName={membership.organizationName}
          saveAction={savePartnerProfile}
        />
      ))}
    </>
  );
}
