import { count, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { deliverables, feedback, milestoneReviews, milestones, projectMembers, projectResources, projects } from "@/db/schema";
import { getDevelopmentWorkspaceActor, getWorkspaceDetail, listWorkspaceProjects, WorkspaceError } from "@/services/workspace.service";

const APP_SUPPLY = "44444444-4444-4444-8444-000000000005";
const APP_ENERGY = "44444444-4444-4444-8444-000000000006";
const APP_ARCHIVE = "44444444-4444-4444-8444-000000000007";
const APP_DEPOT = "44444444-4444-4444-8444-000000000008";
const APP_ROUTE = "44444444-4444-4444-8444-000000000002";
type RuntimeDatabase = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function main() {
  const before = await snapshot();
  assertCounts(before);
  const jordan = await getDevelopmentWorkspaceActor("JORDAN_STUDENT_DEMO");
  const bao = await getDevelopmentWorkspaceActor("BAO_STUDENT_DEMO");
  const supervisor = await getDevelopmentWorkspaceActor("FACULTY_PHAM_DEMO");
  const partner = await getDevelopmentWorkspaceActor("BENCANG_CONTACT_DEMO");
  const supply = await getWorkspaceDetail(APP_SUPPLY, jordan);
  assert(supply?.projectStatus === "ACTIVE", "app-supply must expose its ACTIVE project");
  assert(supply.members.length === 3, "app-supply project membership must come from project_members");
  assert(supply.resources.some((resource) => resource.access === "AVAILABLE"), "accepted member agreement should unlock app-supply resources");
  const energy = await getWorkspaceDetail(APP_ENERGY, jordan);
  assert(energy?.projectStatus === "FINAL_REVIEW", "app-energy must remain FINAL_REVIEW");
  assert(energy.milestones.some((m) => !m.latestReviews.some((r) => r.reviewerRole === "PARTNER" && r.decision === "APPROVED")), "app-energy must retain pending partner-review evidence");
  const archive = await getWorkspaceDetail(APP_ARCHIVE, jordan);
  assert(archive?.projectStatus === "COMPLETED", "app-archive must remain COMPLETED");
  assert(archive.milestones.every((m) => ["FACULTY", "PARTNER"].every((role) => m.latestReviews.some((r) => r.reviewerRole === role && r.decision === "APPROVED"))), "app-archive must retain faculty and partner approval evidence");
  const depot = await getWorkspaceDetail(APP_DEPOT, partner);
  assert(depot?.projectStatus === "ACTIVE", "papp-depot must preserve the active partner workflow");
  assert(await getWorkspaceDetail(APP_ROUTE, jordan) === null, "app-route must not get a project workspace");
  await expectWorkspaceError(() => getWorkspaceDetail(APP_SUPPLY, bao), "unrelated student workspace access");
  const supervisorDetail = await getWorkspaceDetail(APP_SUPPLY, supervisor);
  assert(supervisorDetail?.project.supervisorName === "Dr. Minh Pham", "faculty_supervisor_id must authorize the authoritative supervisor");
  const visible = await listWorkspaceProjects(jordan);
  assert(visible.some((project) => project.applicationPublicId === APP_SUPPLY), "project member list must include app-supply");
  const noOverdue = await db.execute(sql`select count(*)::int as total from milestones where status::text = 'OVERDUE'`);
  assert(Number(noOverdue.rows[0]?.total ?? 0) === 0, "OVERDUE must not be persisted");
  const after = await snapshot();
  assert(JSON.stringify(after) === JSON.stringify(before), "workspace reads changed canonical seed state");
  console.log("Phase 5.4 workspace runtime verification passed.");
  console.log(JSON.stringify(after, null, 2));
}

async function snapshot(database: RuntimeDatabase = db) { return { deliverables: await countRows(database, deliverables), feedback: await countRows(database, feedback), milestoneReviews: await countRows(database, milestoneReviews), milestones: await countRows(database, milestones), projectMembers: await countRows(database, projectMembers), projectResources: await countRows(database, projectResources), projects: await countRows(database, projects) }; }
async function countRows(database: RuntimeDatabase, table: PgTable) { const [row] = await database.select({ total: count() }).from(table); return row?.total ?? 0; }
function assertCounts(counts: Awaited<ReturnType<typeof snapshot>>) { assert(counts.projects === 4, "projects count"); assert(counts.projectMembers === 10, "project_members count"); assert(counts.milestones === 15, "milestones count"); assert(counts.deliverables === 12, "deliverables count"); assert(counts.milestoneReviews === 20, "milestone_reviews count"); assert(counts.projectResources === 10, "project_resources count"); assert(counts.feedback === 0, "feedback count"); }
async function expectWorkspaceError(action: () => Promise<unknown>, label: string) { try { await action(); } catch (error) { if (error instanceof WorkspaceError && error.code === "FORBIDDEN") return; throw error; } throw new Error(`${label}: expected FORBIDDEN.`); }
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
main().catch((error) => { console.error(error); process.exit(1); });
