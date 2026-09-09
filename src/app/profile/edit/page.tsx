import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getAuthenticatedActor,
  hasActorCapability,
} from "@/auth/authenticated-actor";
import { db } from "@/db";
import { getStudentRecord } from "@/db/queries/students";
import { toStudent } from "@/lib/apply-view";
import { formatDate } from "@/lib/dates";
import type { Experience, ExperienceKind } from "@/lib/types";

import { ProfileEditor } from "./profile-editor";

export const dynamic = "force-dynamic";

const EXPERIENCE_KINDS: Record<string, ExperienceKind> = {
  INTERNSHIP: "Internship",
  OTHER: "Other",
  PART_TIME: "Part-time",
  RESEARCH: "Research",
  TEACHING: "Teaching",
  VOLUNTEERING: "Volunteering",
};

export default async function ProfileEditPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "STUDENT")) redirect("/profile");

  const record = await getStudentRecord(db, resolution.actor.user.userId);
  if (!record) {
    return (
      <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
        <h1>Profile unavailable</h1>
        <p className="text-ink-2 mt-2">Your student profile is not set up yet.</p>
        <Link className="inline-block font-semibold mt-4" href="/profile">
          Back to profile
        </Link>
      </div>
    );
  }

  const experiences: Experience[] = record.experiences.map((entry) => ({
    from: entry.startDate ? formatDate(entry.startDate) : "—",
    id: entry.id,
    kind: EXPERIENCE_KINDS[entry.kind ?? ""] ?? "Other",
    organisation: entry.organisation ?? "—",
    role: entry.roleDescription ?? entry.title,
    skills: [],
    summary: entry.description,
    to: entry.endDate ? formatDate(entry.endDate) : null,
  }));

  return <ProfileEditor experiences={experiences} student={toStudent(record)} />;
}
