import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { Section } from "@/components/ui/section";
import { getFacultyProfile } from "@/services/faculty-profile.service";

export const dynamic = "force-dynamic";

/**
 * A faculty member's own record — school/department/title come from the
 * institution and are read-only here; supervision capacity is the one field
 * they own, mirroring how the student `/profile` splits registrar data from
 * self-reported data.
 */
export default async function FacultyProfilePage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "FACULTY")) notFound();

  const profile = await getFacultyProfile(resolution.actor);

  return (
    <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Faculty profile</h1>

      <Section title="About you">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          <ProfileField label="Name" value={profile.fullName} />
          <ProfileField label="Email" value={profile.email} />
          <ProfileField label="School" value={profile.school} />
          <ProfileField label="Department" value={profile.department} />
          <ProfileField label="Academic title" value={profile.academicTitle} />
        </dl>
      </Section>

      <Section
        title="Supervision capacity"
        aside={<Link href="/faculty/profile/edit">Edit</Link>}
      >
        <p className="text-ink-2">
          {profile.maxActiveSupervisions !== null
            ? `Up to ${profile.maxActiveSupervisions} active supervision${profile.maxActiveSupervisions === 1 ? "" : "s"} at a time.`
            : "No limit set yet."}
        </p>
      </Section>
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
