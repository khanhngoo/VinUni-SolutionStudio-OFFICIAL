"use server";

import { signIn, signOut } from "../../../auth";
import { getDevelopmentIdentity, isDevelopmentAuthenticationEnabled } from "@/auth/development-identities";

export async function signInWithDevelopmentIdentity(formData: FormData) {
  if (!isDevelopmentAuthenticationEnabled()) throw new Error("Development authentication is unavailable in production.");
  const identity = formData.get("identity");
  if (!getDevelopmentIdentity(identity)) throw new Error("Unknown development identity.");
  await signIn("development-seeded-identity", { identity, redirectTo: "/" });
}

export async function signInWithMicrosoftEntra() {
  await signIn("microsoft-entra-id", { redirectTo: "/" });
}

export async function signOutCurrentUser() {
  await signOut({ redirectTo: "/sign-in" });
}
