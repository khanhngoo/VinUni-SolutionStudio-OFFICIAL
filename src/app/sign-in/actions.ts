"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "../../../auth";
import { getDevelopmentIdentity, isDevelopmentAuthenticationEnabled } from "@/auth/development-identities";
import {
  isSelfServiceAuthenticationEnabled,
  registerSelfServiceUser,
  SELF_SERVICE_PROVIDER_ID,
  SelfServiceAuthenticationError,
} from "@/auth/self-service-authentication";

export interface AuthenticationFormState {
  details?: string[];
  message?: string;
}

export async function signInWithDevelopmentIdentity(formData: FormData) {
  if (!isDevelopmentAuthenticationEnabled()) throw new Error("Development authentication is unavailable in production.");
  const identity = formData.get("identity");
  if (!getDevelopmentIdentity(identity)) throw new Error("Unknown development identity.");
  await signIn("development-seeded-identity", { identity, redirectTo: "/" });
}

export async function signInWithMicrosoftEntra() {
  await signIn("microsoft-entra-id", { redirectTo: "/" });
}

export async function signInWithSelfService(
  _previousState: AuthenticationFormState,
  formData: FormData
): Promise<AuthenticationFormState> {
  if (!isSelfServiceAuthenticationEnabled()) {
    return { message: "Email and password authentication is unavailable." };
  }

  try {
    await signIn(SELF_SERVICE_PROVIDER_ID, {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "The email or password is incorrect." };
    }
    throw error;
  }

  return {};
}

export async function signUpWithSelfService(
  _previousState: AuthenticationFormState,
  formData: FormData
): Promise<AuthenticationFormState> {
  if (!isSelfServiceAuthenticationEnabled()) {
    return { message: "Self-service registration is unavailable." };
  }

  const password = formData.get("password");
  if (password !== formData.get("passwordConfirmation")) {
    return { message: "The password confirmation does not match." };
  }

  try {
    const user = await registerSelfServiceUser({
      email: formData.get("email"),
      fullName: formData.get("fullName"),
      password,
    });

    await signIn(SELF_SERVICE_PROVIDER_ID, {
      email: user.email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof SelfServiceAuthenticationError) {
      return { details: error.details, message: error.message };
    }
    if (error instanceof AuthError) {
      return {
        message: "The account was created, but automatic sign-in failed. Sign in with the new account.",
      };
    }
    throw error;
  }

  return {};
}

export async function signOutCurrentUser() {
  await signOut({ redirectTo: "/sign-in" });
}
