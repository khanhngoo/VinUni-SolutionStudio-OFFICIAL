import Link from "next/link";

import { Section } from "@/components/ui/section";
import type { OwnMembershipRead } from "@/db/queries/organizations";

/**
 * Shared view for a partner rep's or internal-unit member's own profile —
 * organization name and role are the organization's own facts (read-only
 * here); job title is the one thing the member owns.
 */
export function OrganizationMemberProfile({
  editHref,
  email,
  fullName,
  memberships,
  title,
}: {
  editHref: string;
  email: string;
  fullName: string;
  memberships: OwnMembershipRead[];
  title: string;
}) {
  return (
    <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>{title}</h1>

      <Section title="About you">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          <ProfileField label="Name" value={fullName} />
          <ProfileField label="Email" value={email} />
        </dl>
      </Section>

      {memberships.map((membership) => (
        <Section
          key={membership.membershipId.toString()}
          title={membership.organizationName}
          aside={<Link href={editHref}>Edit</Link>}
        >
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            <ProfileField label="Role" value={membership.role.replaceAll("_", " ")} />
            <ProfileField label="Job title" value={membership.jobTitle} />
          </dl>
        </Section>
      ))}
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-meta text-ink-3 uppercase tracking-[0.07em]">{label}</dt>
      <dd className="text-ink mt-0.5">{value ?? "—"}</dd>
    </div>
  );
}
