"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import {
  InvitationError,
  respondToInvitation,
} from "@/services/invitation.service";

export async function acceptInvitation(applicationPublicId: string) {
  return respond(applicationPublicId, "ACCEPT");
}

export async function declineInvitation(applicationPublicId: string) {
  return respond(applicationPublicId, "DECLINE");
}

async function respond(applicationPublicId: string, decision: "ACCEPT" | "DECLINE") {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") {
    return "Your session has expired. Sign in again.";
  }

  try {
    await respondToInvitation(applicationPublicId, decision, resolution.actor);
  } catch (error) {
    if (error instanceof InvitationError) return error.message;
    throw error;
  }

  revalidatePath(`/invitations/${applicationPublicId}`);
  revalidatePath("/workspace");
  return null;
}
