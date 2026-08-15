import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "@/components/ui/chip";
import { GroupHeading } from "@/components/partner/group-heading";
import { PipelineBoard } from "@/components/partner/pipeline-board";
import { deadlineLabel, formatDate, isUrgent } from "@/lib/dates";
import { orgChallenges, getOrgChallengeById, pipelineFor } from "@/lib/provider";
import { sizeLabel } from "@/lib/teams";
import { cn } from "@/lib/cn";

export function generateStaticParams() {
  return orgChallenges().map((challenge) => ({ id: challenge.id }));
}

/**
 * One challenge, as its owner sees it: the selection pipeline across the top,
 * the posting's own terms below.
 *
 * The board runs left to right along the same stages the student's selection
 * timeline runs top to bottom. One record, two readings — a student watching
 * their own position, a partner watching everyone's.
 */
export default async function PartnerChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = getOrgChallengeById(id);
  if (!challenge) notFound();

  const buckets = pipelineFor(challenge.id);
  const total = buckets.reduce((n, b) => n + b.applications.length, 0);
  const urgent = isUrgent(challenge.deadline);

  return (
    <div className="max-w-[1160px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner">Your challenges</Link>
        <span className="mx-1.5">›</span>
        {challenge.title}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            <Chip>{challenge.subType}</Chip>
            {challenge.confidential ? (
              <Chip variant="outline-dashed">Confidential posting</Chip>
            ) : null}
            {challenge.colleges.map((college) => (
              <Chip key={college}>{college}</Chip>
            ))}
          </div>
          <h1>{challenge.title}</h1>
          <p className="text-ink-2 mt-2">
            {total} team{total === 1 ? "" : "s"} in selection ·{" "}
            <span
              className={cn(urgent ? "text-warn font-medium" : "text-ink-2")}
            >
              {deadlineLabel(challenge.deadline)}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/challenges/${challenge.id}`}
            className="inline-flex items-center justify-center h-9 px-4 rounded-card border border-line text-ink-2 font-medium hover:border-brand hover:text-brand"
          >
            View as student
          </Link>
          <Link
            href={`/partner/students?challenge=${challenge.id}`}
            className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
          >
            Find students
          </Link>
        </div>
      </div>

      <section className="mt-7">
        <GroupHeading title="Selection pipeline" />
        <PipelineBoard buckets={buckets} />
      </section>

      <section className="mt-8">
        <GroupHeading title="What you posted" />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Team size" value={sizeLabel(challenge)} />
          <Stat
            label="Commitment"
            value={`${challenge.hoursPerWeek} hrs/wk · ${challenge.durationWeeks} wks`}
          />
          <Stat label="Compensation" value={challenge.compensation} />
          <Stat label="Work mode" value={challenge.workMode} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 mt-4">
          <div className="bg-card border border-line rounded-card p-5">
            <h3 className="text-h3 text-ink-3">Summary students see</h3>
            <p className="text-ink-2 mt-2 leading-relaxed">
              {challenge.summary}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {challenge.skills.map((skill) => (
                <Chip
                  key={skill.name}
                  variant={skill.level === "must" ? "default" : "outline-dashed"}
                >
                  {skill.name}
                </Chip>
              ))}
            </div>
          </div>

          <div className="bg-card border border-line rounded-card p-5">
            <h3 className="text-h3 text-ink-3">Gating</h3>
            <dl className="mt-2 flex flex-col gap-2">
              <Row
                label="Minimum GPA"
                value={challenge.minGpa === null ? "None" : String(challenge.minGpa)}
              />
              <Row
                label="Eligible years"
                value={
                  challenge.eligibleYears.length === 0
                    ? "Any"
                    : challenge.eligibleYears.join(", ")
                }
              />
              <Row
                label="Eligible colleges"
                value={
                  challenge.eligibleColleges === null
                    ? "All colleges"
                    : challenge.eligibleColleges.join(", ")
                }
              />
              <Row
                label="Assessment"
                value={`${challenge.assessmentTrack} · ${challenge.assessmentMinutes} min`}
              />
              <Row label="Starts" value={formatDate(challenge.startDate)} />
            </dl>
            <p className="text-meta text-ink-3 mt-3 pt-3 border-t border-line-2 leading-relaxed">
              Gating never hides your posting — students who do not qualify
              still see it, and simply cannot apply.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-line-2 rounded-card px-3.5 py-3">
      <p className="text-meta text-ink-3">{label}</p>
      <p className="font-semibold text-[15px] text-brand mt-1">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-meta text-ink-3">{label}</dt>
      <dd className="text-ink font-medium text-right">{value}</dd>
    </div>
  );
}
