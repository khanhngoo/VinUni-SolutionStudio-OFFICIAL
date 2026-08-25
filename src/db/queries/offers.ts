import { eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  applicationMembers,
  applications,
  challenges,
  offers,
  organizations,
  selections,
  users,
} from "@/db/schema";

export type OfferQueryDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

type OfferRow = typeof offers.$inferSelect;
type ApplicationMemberRow = typeof applicationMembers.$inferSelect;

export type OfferRuntimeStatus = NonNullable<OfferRow["status"]>;
export type OfferMemberRole = ApplicationMemberRow["memberRole"];
export type OfferMemberStatus = NonNullable<ApplicationMemberRow["status"]>;

export interface OfferRead {
  application: {
    id: bigint;
    publicId: string;
    status: string;
    teamName: string | null;
  };
  challenge: {
    id: bigint;
    managingOrganizationName: string;
    ownerOrganizationName: string;
    slug: string;
    summary: string;
    title: string;
  };
  createdAt: Date | null;
  id: bigint;
  response: {
    respondedAt: Date | null;
    respondedByName: string | null;
  };
  respondBy: Date | null;
  selection: {
    id: bigint;
    selectedAt: Date | null;
  };
  status: OfferRuntimeStatus;
  terms: {
    compensationNote: string | null;
    durationWeeks: number | null;
    hoursPerWeek: number | null;
    ndaRequired: boolean;
    startDate: string | null;
  };
}

export interface OfferMemberRead {
  memberRole: OfferMemberRole;
  status: OfferMemberStatus;
  studentId: bigint;
}

export async function getOfferByApplicationPublicId(
  database: OfferQueryDatabase,
  applicationPublicId: string
): Promise<OfferRead | null> {
  const ownerOrganization = alias(organizations, "offer_owner_organization");
  const managingOrganization = alias(organizations, "offer_managing_organization");
  const responder = alias(users, "offer_responder");

  const [row] = await database
    .select({
      applicationId: applications.id,
      applicationPublicId: applications.publicId,
      applicationStatus: sql<string>`coalesce(${applications.status}, 'SUBMITTED')`,
      challengeId: challenges.id,
      challengeSlug: challenges.slug,
      challengeSummary: challenges.summary,
      challengeTitle: challenges.title,
      compensationNote: offers.compensationNote,
      createdAt: offers.createdAt,
      durationWeeks: offers.durationWeeks,
      hoursPerWeek: offers.hoursPerWeek,
      managingOrganizationName: managingOrganization.name,
      ndaRequired: sql<boolean>`coalesce(${offers.ndaRequired}, false)`,
      offerId: offers.id,
      ownerOrganizationName: ownerOrganization.name,
      respondedAt: offers.respondedAt,
      respondedByName: responder.fullName,
      respondBy: offers.respondBy,
      selectedAt: selections.selectedAt,
      selectionId: selections.id,
      startDate: offers.startDate,
      status: sql<OfferRuntimeStatus>`coalesce(${offers.status}, 'PENDING')`,
      teamName: applications.teamName,
    })
    .from(offers)
    .innerJoin(selections, eq(selections.id, offers.selectionId))
    .innerJoin(applications, eq(applications.id, selections.applicationId))
    .innerJoin(challenges, eq(challenges.id, applications.challengeId))
    .innerJoin(ownerOrganization, eq(ownerOrganization.id, challenges.ownerOrganizationId))
    .innerJoin(
      managingOrganization,
      eq(managingOrganization.id, challenges.managingOrganizationId)
    )
    .leftJoin(responder, eq(responder.id, offers.respondedBy))
    .where(eq(applications.publicId, applicationPublicId))
    .limit(1);

  if (!row || !row.challengeSlug) return null;

  return {
    application: {
      id: row.applicationId,
      publicId: row.applicationPublicId,
      status: row.applicationStatus,
      teamName: row.teamName,
    },
    challenge: {
      id: row.challengeId,
      managingOrganizationName: row.managingOrganizationName,
      ownerOrganizationName: row.ownerOrganizationName,
      slug: row.challengeSlug,
      summary: row.challengeSummary,
      title: row.challengeTitle,
    },
    createdAt: row.createdAt,
    id: row.offerId,
    response: {
      respondedAt: row.respondedAt,
      respondedByName: row.respondedByName,
    },
    respondBy: row.respondBy,
    selection: { id: row.selectionId, selectedAt: row.selectedAt },
    status: row.status,
    terms: {
      compensationNote: row.compensationNote,
      durationWeeks: row.durationWeeks,
      hoursPerWeek: row.hoursPerWeek,
      ndaRequired: row.ndaRequired,
      startDate: row.startDate,
    },
  };
}

export async function getOfferMember(
  database: OfferQueryDatabase,
  applicationId: bigint,
  studentId: bigint
): Promise<OfferMemberRead | null> {
  const [member] = await database
    .select({
      memberRole: applicationMembers.memberRole,
      status: sql<OfferMemberStatus>`coalesce(${applicationMembers.status}, 'INVITED')`,
      studentId: applicationMembers.studentId,
    })
    .from(applicationMembers)
    .where(
      sql`${applicationMembers.applicationId} = ${applicationId} and ${applicationMembers.studentId} = ${studentId}`
    )
    .limit(1);

  return member ?? null;
}
