import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { PartnerTeamRoster } from "@/components/partner/partner-team-roster";
import { TeamFit } from "@/components/team/team-fit";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { db } from "@/db";
import { getApplicationByPublicId } from "@/db/queries/applications";
import { listDirectoryStudents, listStudentTeamProfiles } from "@/db/queries/students";
import {
  toDirectoryStudent,
  toPartnerOwnedApplyChallenge,
  toTeam,
} from "@/lib/apply-view";
import { formatDate } from "@/lib/dates";
import { countdownLabel } from "@/lib/pipeline";
import { bandChipVariant } from "@/lib/score";
import { confirmedMembers, pendingMembers } from "@/lib/teams";
import type { ScoreBand } from "@/lib/types";
import { getPartnerChallengePage } from "@/services/partner.service";
import { deriveApplicationStage } from "@/services/application-stage";
import { deriveApplicationLifecycleView } from "@/services/application-lifecycle.service";
import { STAGE_LABELS } from "@/lib/types";
import { isPublicId } from "@/lib/public-id";

import { issueSelectionOfferAction } from "./actions";

export const dynamic = "force-dynamic";

const OFFER_ERROR_MESSAGES: Record<string, string> = {
  CONFLICT: "This team's selection changed before it could be saved. Refresh and try again.",
  FORBIDDEN: "Your account cannot select applications for this challenge.",
  INVALID_TRANSITION: "This application is no longer ready for selection.",
  NOT_FOUND: "This application could not be found.",
  VALIDATION_ERROR: "Check the offer terms and try again.",
};

const BANDS: ScoreBand[] = ["Strong", "Proficient", "Developing", "Below threshold"];

/**
 * One team, as the partner deciding about them sees it.
 *
 * The board can only afford a name and a count, which is enough to sort by and
 * not enough to choose by. This is the rest: who is actually on the roster,
 * what each of them scores against this brief, and the same fit arithmetic the
 * team itself saw while assembling — a partner and a team looking at one set of
 * numbers rather than two.
 */
export default async function PartnerTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; applicationId: string }>;
  searchParams: Promise<{ code?: string; offer?: string }>;
}) {
  const { id: slug, applicationId } = await params;
  const query = await searchParams;

  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!isPublicId(applicationId)) notFound();

  // Ownership is established by resolving the challenge through the partner
  // service, which scopes to the actor's organization. A challenge belonging
  // to another partner is indistinguishable from one that does not exist.
  const page = await getPartnerChallengePage(resolution.actor, { slug });
  if (!page || !page.canReadApplications) notFound();

  const application = await getApplicationByPublicId(db, applicationId);
  // Guard the pairing, not just the ids — a valid team under the wrong
  // challenge would otherwise render fit numbers against the wrong brief.
  if (!application || application.challenge.slug !== slug) notFound();

  const memberIds = application.members.map((member) => member.student.userId);
  const [profiles, directoryRows] = await Promise.all([
    listStudentTeamProfiles(db, memberIds),
    listDirectoryStudents(db),
  ]);

  // Scored through the partner-facing view, which is the same one the sourcing
  // deck uses — so a team that applied and a candidate who was recommended are
  // read as one number rather than two incompatible ones.
  const directory = new Map(
    directoryRows.map((row) => [String(row.userId), toDirectoryStudent(row)])
  );

  const challenge = toPartnerOwnedApplyChallenge(
    page.challenge,
    application.challenge.ownerOrganization.name
  );
  const team = toTeam(application.teamName, application.members, profiles);
  const confirmed = confirmedMembers(team);
  const pending = pendingMembers(team);

  const stage = deriveApplicationStage({
    assessmentSummaries: application.assessmentSummaries,
    offerSummary: application.offerSummary,
    projectSummary: application.projectSummary,
    status: application.status,
  });
  const lifecycle = deriveApplicationLifecycleView(application);

  const offer = application.offerSummary;
  const offerLeft =
    offer && offer.offerStatus === "PENDING" && offer.respondBy
      ? countdownLabel(offer.respondBy.toISOString())
      : null;

  const assessment = application.assessmentSummaries.find(
    (summary) => summary.overallBand !== null
  );

  return (
    <div className="max-w-[900px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner">Your challenges</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/partner/challenges/${slug}`}>{application.challenge.title}</Link>
        <span className="mx-1.5">›</span>
        {team.name}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3.5">
        <div className="min-w-0">
          <h1>{team.name}</h1>
          <p className="text-ink-2 mt-2">
            {confirmed.length} confirmed member
            {confirmed.length === 1 ? "" : "s"}
            {pending.length > 0
              ? ` · ${pending.length} invitation${pending.length === 1 ? "" : "s"} outstanding`
              : ""}
            {application.submittedAt ? ` · applied ${formatDate(application.submittedAt.toISOString())}` : ""}
          </p>
        </div>
        <Chip variant="solid">{STAGE_LABELS[stage]}</Chip>
      </div>

      {offerLeft ? (
        <p
          className={
            offerLeft === "Expired"
              ? "text-meta text-warn font-medium mt-3"
              : "text-meta text-ink-3 mt-3"
          }
        >
          {offerLeft === "Expired"
            ? "The offer to this team has expired."
            : `${offerLeft} left for this team to respond to your offer.`}
        </p>
      ) : null}

      {query.offer === "issued" ? (
        <Banner tone="ok">Offer issued. The accepted team leader can now respond.</Banner>
      ) : null}
      {query.offer === "error" ? (
        <Banner tone="error">
          {OFFER_ERROR_MESSAGES[query.code ?? ""] ?? "Something went wrong."}
        </Banner>
      ) : null}

      <Section title="Members" aside={`${team.members.length} listed`}>
        <PartnerTeamRoster challenge={challenge} directory={directory} team={team} />
      </Section>

      <Section title="Application next step">
        <div className="bg-card border border-line rounded-card p-5">
          <p className="text-ink-2 leading-relaxed">{lifecycle.message}</p>
        </div>
      </Section>

      {application.status === "SELECTION_PENDING" ? (
        <Section title="Selection">
          <div className="bg-card border border-line rounded-card p-5">
            <p className="text-ink-2 leading-relaxed">
              This team cleared every required gate. Selecting them here is
              your own decision — it is a direct choice from the eligible
              applications on this challenge, not an AI-ranked or
              AI-generated shortlist.
            </p>
            <form
              action={issueSelectionOfferAction}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="applicationId" value={applicationId} />
              <label className="flex flex-col gap-1.5">
                <span className="text-meta font-semibold text-ink-2 uppercase tracking-wide">
                  Hours per week
                </span>
                <input
                  type="number"
                  name="hoursPerWeek"
                  min={1}
                  defaultValue={page.challenge.weeklyHours ?? undefined}
                  className="h-10 w-full rounded-card border border-line bg-card px-3 text-ink outline-none focus:border-brand"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-meta font-semibold text-ink-2 uppercase tracking-wide">
                  Duration (weeks)
                </span>
                <input
                  type="number"
                  name="durationWeeks"
                  min={1}
                  defaultValue={page.challenge.durationWeeks ?? undefined}
                  className="h-10 w-full rounded-card border border-line bg-card px-3 text-ink outline-none focus:border-brand"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-meta font-semibold text-ink-2 uppercase tracking-wide">
                  Start date
                </span>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={page.challenge.startDate ?? undefined}
                  className="h-10 w-full rounded-card border border-line bg-card px-3 text-ink outline-none focus:border-brand"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-meta font-semibold text-ink-2 uppercase tracking-wide">
                  Response deadline (working days)
                </span>
                <input
                  type="number"
                  name="respondByWorkingDays"
                  min={1}
                  defaultValue={5}
                  className="h-10 w-full rounded-card border border-line bg-card px-3 text-ink outline-none focus:border-brand"
                />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-meta font-semibold text-ink-2 uppercase tracking-wide">
                  Compensation note
                </span>
                <textarea
                  name="compensationNote"
                  rows={2}
                  defaultValue={page.challenge.compensationDescription ?? ""}
                  className="w-full rounded-card border border-line bg-card px-3 py-2 text-ink outline-none focus:border-brand"
                />
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" name="ndaRequired" className="h-4 w-4" />
                <span className="text-ink-2">Require an NDA before restricted materials are released</span>
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
                >
                  Select this team and issue offer
                </button>
              </div>
            </form>
          </div>
        </Section>
      ) : null}

      <Section title="Fit">
        <TeamFit team={team} challenge={challenge} />
      </Section>

      {assessment?.overallBand ? (
        <Section title="Assessment">
          <div className="bg-card border border-line rounded-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Chip variant={bandChipVariant(toBand(assessment.overallBand))}>
                {assessment.overallBand} overall
              </Chip>
              {assessment.submittedAt ? (
                <span className="text-meta text-ink-3">
                  Submitted {formatDate(assessment.submittedAt.toISOString())}
                </span>
              ) : null}
            </div>
            <p className="text-meta text-ink-3 mt-3 leading-relaxed">
              Bands only. The platform does not show a partner a numeric score
              or a rank against other applicants.
            </p>
          </div>
        </Section>
      ) : null}

      <p className="text-meta text-ink-3 mt-7 pt-4 border-t border-line leading-relaxed">
        Per-member scores are that student against this brief only. GPA and full
        transcripts stay private; showcased coursework is what each student
        chose to publish.
      </p>
    </div>
  );
}

/** Bands come back from jsonb as free text; anything unrecognised is not a band. */
function toBand(value: string): ScoreBand {
  return BANDS.find((band) => band === value) ?? "Developing";
}

function Banner({ children, tone }: { children: React.ReactNode; tone: "error" | "ok" }) {
  return (
    <div
      className={
        tone === "ok"
          ? "mt-4 border border-line bg-line-2 text-ink-2 rounded-card px-4 py-3"
          : "mt-4 border border-red/40 bg-red/5 text-red rounded-card px-4 py-3"
      }
    >
      {children}
    </div>
  );
}
