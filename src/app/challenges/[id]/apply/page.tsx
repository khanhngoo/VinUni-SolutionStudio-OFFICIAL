import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplyWizard } from "@/components/apply/apply-wizard";
import { peers } from "@/lib/data/peers";
import { currentStudent } from "@/lib/data/student";
import { soloTeam } from "@/lib/data/teams";
import {
  getAllChallengeIds,
  getApplicationByChallengeId,
  getChallengeById,
  getFacultyOptions,
} from "@/lib/queries";

export function generateStaticParams() {
  return getAllChallengeIds().map((id) => ({ id }));
}

/**
 * Applying, in four steps: team, motivation, supervisor, review.
 *
 * A server shell over a client wizard — the page resolves the fixtures and the
 * wizard owns the draft, since a form spread over four screens has to keep its
 * answers somewhere and there is no persistence layer to keep them in.
 *
 * The starting roster is the seeded team where the student already has an
 * application, and a team of one otherwise. That matters for the one challenge
 * without a seeded application: it is the only route through here that starts
 * from nothing, which is what applying actually looks like.
 */
export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = getChallengeById(id);
  if (!challenge) notFound();

  const existing = getApplicationByChallengeId(id);
  const baseTeam =
    existing?.team ?? soloTeam(`${currentStudent.name.split(" ")[0]}'s team`);

  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/challenges">Challenges</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/challenges/${challenge.id}`}>{challenge.title}</Link>
        <span className="mx-1.5">›</span>
        Apply
      </nav>

      <ApplyWizard
        challenge={challenge}
        baseTeam={baseTeam}
        peers={peers}
        facultyOptions={getFacultyOptions(challenge)}
        defaultHours={Math.min(currentStudent.hoursAvailable, challenge.hoursPerWeek)}
        leaderName={currentStudent.name}
      />
    </article>
  );
}
