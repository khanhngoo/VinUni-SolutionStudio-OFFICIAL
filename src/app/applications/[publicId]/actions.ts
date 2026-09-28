"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import {
  ApplicationError,
  reissueSupervisionRequest,
  toApplicationActorContext,
} from "@/services/application.service";
import {
  ApplicationLifecycleError,
  withdrawApplication,
} from "@/services/application-lifecycle.service";

export async function reissueSupervisionRequestAction(
  applicationPublicId: string,
  facultyId: string
): Promise<string | null> {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") return "Your session has expired. Sign in again.";

  let parsedFacultyId: bigint;
  try {
    parsedFacultyId = BigInt(facultyId);
    if (parsedFacultyId < BigInt(1)) throw new RangeError();
  } catch {
    return "Choose an available faculty supervisor.";
  }

  try {
    await reissueSupervisionRequest(
      applicationPublicId,
      parsedFacultyId,
      toApplicationActorContext(resolution.actor)
    );
  } catch (error) {
    if (error instanceof ApplicationError) {
      return error.details[0] ?? error.message;
    }
    throw error;
  }

  revalidatePath(`/applications/${applicationPublicId}`);
  revalidatePath("/faculty");
  return null;
}

export async function withdrawApplicationAction(
  applicationPublicId: string,
  previousState: string | null
): Promise<string | null> {
  void previousState;
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") {
    return "Your session has expired. Sign in again.";
  }

  try {
    await withdrawApplication(
      applicationPublicId,
      toApplicationActorContext(resolution.actor)
    );
  } catch (error) {
    if (error instanceof ApplicationLifecycleError) return error.message;
    throw error;
  }

  revalidatePath(`/applications/${applicationPublicId}`);
  revalidatePath("/applications");
  revalidatePath("/partner");
  return null;
}
