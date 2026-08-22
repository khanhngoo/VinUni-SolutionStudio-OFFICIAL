import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

import { getDevelopmentIdentity, isDevelopmentAuthenticationEnabled } from "@/auth/development-identities";

const entraEnvironment = {
  clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
  clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
  issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
};

export function getProductionEntraConfigurationError(environment = process.env.NODE_ENV): string | null {
  if (environment !== "production") return null;
  return Object.values(entraEnvironment).every(Boolean)
    ? null
    : "Microsoft Entra ID is not configured. Set AUTH_MICROSOFT_ENTRA_ID_ID, AUTH_MICROSOFT_ENTRA_ID_SECRET, and a tenant-specific AUTH_MICROSOFT_ENTRA_ID_ISSUER.";
}

const providers = [];

if (isDevelopmentAuthenticationEnabled()) {
  providers.push(
    Credentials({
      id: "development-seeded-identity",
      name: "Development seeded identity",
      credentials: { identity: { label: "Development identity", type: "text" } },
      async authorize(credentials) {
        if (!isDevelopmentAuthenticationEnabled()) return null;
        const identity = getDevelopmentIdentity(credentials?.identity);
        return identity ? { id: identity.email, email: identity.email, name: identity.name } : null;
      },
    })
  );
}

if (!getProductionEntraConfigurationError()) {
  providers.push(
    MicrosoftEntraID({
      clientId: entraEnvironment.clientId,
      clientSecret: entraEnvironment.clientSecret,
      issuer: entraEnvironment.issuer,
      authorization: { params: { scope: "openid profile email" } },
      profile(profile) {
        const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : null;
        if (!email) throw new Error("Microsoft Entra ID did not provide a trusted email claim.");
        return { id: profile.sub, email, name: profile.name ?? email };
      },
    })
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      const { isAuthorizedUserEmail } = await import("@/auth/authenticated-user");
      return isAuthorizedUserEmail(user.email);
    },
  },
  pages: { signIn: "/sign-in" },
});
