import Link from "next/link";
import { notFound } from "next/navigation";

import { Chip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { parseTab, WorkspaceTabs } from "@/components/workspace/workspace-tabs";
import { Section } from "@/components/ui/section";
import { daysUntil, formatDate } from "@/lib/dates";
import type { RawSearchParams } from "@/lib/filters";
import { getTemporaryWorkspaceViewer } from "@/lib/workspace-development";
import { getWorkspaceDetail, WorkspaceError, type WorkspaceDetail } from "@/services/workspace.service";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({ params, searchParams }: { params: Promise<{ applicationId: string }>; searchParams: Promise<RawSearchParams> }) {
  const { applicationId } = await params;
  let detail: WorkspaceDetail | null;
  try { detail = await getWorkspaceDetail(applicationId, await getTemporaryWorkspaceViewer()); }
  catch (error) { if (error instanceof WorkspaceError && error.code === "FORBIDDEN") notFound(); throw error; }
  if (!detail) notFound();
  const tab = parseTab((await searchParams).tab);
  const readOnly = detail.projectStatus === "COMPLETED" || detail.projectStatus === "ARCHIVED";
  return <div className="max-w-[980px] mx-auto px-6 sm:px-7 py-7 pb-16">
    <nav className="text-meta text-ink-3"><Link href="/workspace">Your work</Link><span className="mx-1.5">›</span><Link href={`/challenges/${detail.challengeSlug}`}>{detail.challengeTitle}</Link><span className="mx-1.5">›</span>Workspace</nav>
    <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5"><Chip variant="ok">{detail.projectStatus.replace("_", " ")}</Chip><Chip>{detail.challenge.ownerOrganizationName}</Chip></div>
    <h1>{detail.challengeTitle}</h1>
    <p className="text-ink-2 mt-2">Started {detail.project.startDate ? formatDate(detail.project.startDate) : "to be confirmed"} · {detail.progress.completed} of {detail.progress.total} milestones completed</p>
    <ProgressBar approved={detail.progress.completed} total={detail.progress.total} className="mt-5" />
    <div className="mt-6"><WorkspaceTabs applicationId={detail.applicationPublicId} active={tab} /></div>
    {tab === "overview" ? <>
      <Section title="Where things stand"><dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"><Stat label="Progress" value={`${detail.progress.completed} / ${detail.progress.total}`} /><Stat label="Next due" value={detail.nextDeadline ? formatDate(detail.nextDeadline) : "—"} /><Stat label="Workload" value={detail.challenge.weeklyHours ? `${detail.challenge.weeklyHours} hrs / wk` : "—"} /><Stat label="Status" value={detail.projectStatus.replace("_", " ")} /></dl></Section>
      <Section title="People"><div className="grid sm:grid-cols-3 gap-2.5">{detail.members.map((member) => <Person key={member.fullName} name={member.fullName} role={member.major ? `${member.major}${member.studyYear ? ` · Year ${member.studyYear}` : ""}` : "Project member"} note={member.projectRole ?? "Project member"} />)}<Person name={detail.project.supervisorName ?? "To be confirmed"} role="Faculty supervisor" note="Authoritative project supervisor" /></div></Section>
    </> : null}
    {tab === "milestones" ? <Section title="Milestones"><MilestoneTimeline milestones={detail.milestones} /></Section> : null}
    {tab === "deliverables" ? <Section title="Deliverables" aside="Formal decisions come from milestone reviews"><MilestoneTimeline milestones={detail.milestones} showReviews />{readOnly ? <p className="text-meta text-ink-3 mt-5">This project is read-only.</p> : <p className="text-meta text-ink-3 mt-5">Deliverable submission is not part of Phase 5.4.</p>}</Section> : null}
    {tab === "resources" ? <Section title="Resources" aside="Agreement requirements are checked server-side"><div className="flex flex-col gap-2.5">{detail.resources.map((resource) => <div key={resource.title} className="bg-card border border-line rounded-card p-4"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-ink">{resource.title}</p><Chip variant={resource.access === "AVAILABLE" ? "ok" : "warn"}>{resource.access === "AVAILABLE" ? resource.sensitivityLevel.replace("_", " ") : "Agreement required"}</Chip></div><p className="text-meta text-ink-3 mt-1">{resource.resourceType ?? "Resource"}</p>{resource.description ? <p className="text-ink-2 mt-2">{resource.description}</p> : null}</div>)}</div></Section> : null}
  </div>;
}

function MilestoneTimeline({ milestones, showReviews = false }: { milestones: WorkspaceDetail["milestones"]; showReviews?: boolean }) {
  return <ol className="bg-card border border-line rounded-card p-5 flex flex-col gap-5">{milestones.map((milestone) => { const overdue = milestone.deadline && daysUntil(milestone.deadline) < 0 && milestone.status !== "COMPLETED"; return <li key={milestone.id}><div className="flex flex-wrap gap-2 items-center"><h3 className="font-semibold text-ink">{milestone.title}</h3><Chip variant={milestone.status === "COMPLETED" ? "ok" : milestone.status === "REVISION_REQUESTED" ? "warn" : "default"}>{milestone.status.replaceAll("_", " ")}</Chip></div>{milestone.description ? <p className="text-ink-2 mt-1">{milestone.description}</p> : null}<p className={`text-meta mt-1.5 ${overdue ? "text-warn font-medium" : "text-ink-3"}`}>{milestone.deadline ? `Due ${formatDate(milestone.deadline)}${overdue ? " · overdue" : ""}` : "No deadline"}</p>{milestone.deliverables.map((deliverable, index) => <p key={`${deliverable.title}-${index}`} className="text-meta text-ink-3 mt-2">Deliverable: {deliverable.title ?? deliverable.description ?? "Submitted"} · {deliverable.submittedByName}</p>)}{showReviews ? <div className="flex flex-wrap gap-3 mt-2">{["FACULTY", "PARTNER"].map((role) => { const review = milestone.latestReviews.find((item) => item.reviewerRole === role); return <span key={role} className={review?.decision === "APPROVED" ? "text-meta text-ok" : "text-meta text-ink-3"}>{role === "FACULTY" ? "Faculty" : "Partner"}: {review ? review.decision.replaceAll("_", " ") : "pending"}</span>; })}</div> : null}</li>; })}</ol>;
}
function Stat({ label, value }: { label: string; value: string }) { return <div className="bg-line-2 rounded-card px-3.5 py-3"><dt className="text-meta text-ink-3">{label}</dt><dd className="font-semibold text-[15px] text-brand mt-1">{value}</dd></div>; }
function Person({ name, role, note }: { name: string; role: string; note: string }) { return <div className="bg-card border border-line rounded-card px-4 py-3.5"><p className="font-semibold text-ink">{name}</p><p className="text-meta text-ink-3 mt-0.5">{role}</p><p className="text-meta text-ink-2 mt-1.5">{note}</p></div>; }
