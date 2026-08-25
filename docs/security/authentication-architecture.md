# Phase 6.1 Authentication Architecture

## Boundary

Solutions Studio uses Auth.js with JWT-backed, secure session cookies. Auth.js is
the authentication boundary; server-only callers use
`getAuthenticatedUser()` or `requireAuthenticatedUser()` to resolve a session
to the current internal `users` record. No database adapter, account table, or
session table is used.

## Production Microsoft Entra ID strategy

The intended production provider is Microsoft Entra ID OIDC through Auth.js.
It is enabled only when all of these deployment-only values are configured:

- `AUTH_MICROSOFT_ENTRA_ID_ID`
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_ISSUER`

The issuer must be tenant-specific (for example,
`https://login.microsoftonline.com/<tenant-id>/v2.0`), never the Entra
`common` issuer. This prevents the platform from defaulting to arbitrary
personal or work Microsoft accounts. A production sign-in page reports a clear
configuration error when those values are absent, and no development provider
is registered in production.

The current contract confirms that VinUni uses institutional Microsoft 365/SSO
for existing systems, and Microsoft Entra OIDC is technically suitable for this
Next.js application. Real institutional SSO still requires VinUni IT to provide
the tenant/directory ID, application registration, permitted redirect URIs,
credential/certificate strategy, and any required claim or group policy.

External partner authentication is not implemented here. The preferred future
direction is VinUni Entra B2B/guest identity if supported by institutional IT;
that support remains an unresolved integration dependency. No password-based
partner identity system is introduced.

## Development authentication

Outside production only, Auth.js registers a credentials provider whose sole
input is one of eight hard-coded seeded identity keys. It stores no passwords
and maps each key to a fixed seeded email. The server validates the allowlist,
so changing a browser form value cannot impersonate an arbitrary user.
`NODE_ENV=production` omits the provider and its server action refuses use.

The standard Auth.js route exposes sign-in, sign-out, and session endpoints.
The local `/sign-in` page uses the same session cookie boundary as Entra.

## Identity mapping and authorization boundary

Provider identity is normalized conservatively (trim + lowercase) and matched
against the unique `users.email`. Sign-in is denied when the email does not
match an ACTIVE existing user; the system does not auto-provision users or
derive roles from an email domain. The server primitive re-checks the database
on every resolution, returning an unmapped/onboarding-not-configured state for
unknown users.

JWTs contain authentication/session data, not authoritative application roles.
Phase 6.2 will validate roles and capabilities from student/faculty profiles,
active organization memberships, organization type, and membership role.
Phase 6.3 will migrate domain authorization enforcement. Existing temporary
domain actors and policies intentionally remain unchanged in Phase 6.1.

`AUTH_SECRET` is required deployment configuration and must be a long random
secret. It, Entra credentials, database credentials, and raw provider tokens
are never exposed to client components or committed to source control.
