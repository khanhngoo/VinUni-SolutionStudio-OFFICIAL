# Phase 6.1 Authentication Architecture

## Boundary

Solutions Studio uses Auth.js with JWT-backed, secure session cookies. Auth.js is
the authentication boundary for Microsoft Entra ID, the strict seeded
development provider, and the explicitly enabled internal-demo email/password
provider. Server-only callers use
`getAuthenticatedUser()` or `requireAuthenticatedUser()` to resolve a session
to the current internal `users` record. No database adapter, account table, or
session table is used.

## Internal-demo self-service authentication

`AUTH_SELF_SERVICE_ENABLED=true` registers a database-backed credentials
provider and renders email/password signup and sign-in forms. The flag defaults
to disabled and is independent from `NODE_ENV`, allowing a deliberately private
demo deployment to exercise real account creation before institutional Entra
configuration is available.

Signup writes one `users` row and one one-to-one `user_credentials` row in a
transaction. Email is normalized to lowercase and protected by a
case-insensitive unique index. Passwords are bounded before hashing and stored
only as salted `scrypt-v1` hashes produced by Node's server-side crypto API. The
password and hash never enter the Auth.js JWT or a client-facing read model.
Unknown-email and wrong-password sign-in paths return the same user-facing
error, and the unknown-email path still performs scrypt work.

A self-service account is deliberately authorization-neutral: registration
does not create a student/faculty profile, organization, or organization
membership. It therefore establishes identity but grants no `STUDENT`,
`FACULTY`, `PARTNER_REPRESENTATIVE`, or `INTERNAL_UNIT_MEMBER` capability.
Existing Phase 6.2/6.3 authorization continues to derive those capabilities
only from authoritative PostgreSQL relationships.

This is an internal-demo boundary, not public production registration. Email
verification, password recovery, MFA, distributed rate limiting, partner
invitation/onboarding, and account-administration flows remain unimplemented.
Do not enable the flag for an unrestricted public deployment until those
controls have been designed and verified.

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

External partner organization onboarding is not implemented here. A partner
person may use the internal-demo password provider to establish a basic
identity, but no partner authority exists until a separate approved process
creates an active `EXTERNAL_PARTNER` organization membership. VinUni Entra
B2B/guest identity remains a possible future provider if supported by
institutional IT.

## Development authentication

Outside production only, Auth.js registers a credentials provider whose sole
input is one of eight hard-coded seeded identity keys. It stores no passwords
and maps each key to a fixed seeded email. The server validates the allowlist,
so changing a browser form value cannot impersonate an arbitrary user.
`NODE_ENV=production` omits the provider and its server action refuses use.

The standard Auth.js route exposes sign-in, sign-out, and session endpoints.
The local `/sign-in` page uses the same session cookie boundary as Entra.

## Post-Phase-6 E2E presentation integration

The shared header receives a server-derived display model only after an Auth.js
session resolves to an active user and `AuthenticatedActor`. Anonymous users
receive no personal navigation or identity avatar and see a sign-in affordance.
The personal `/profile` route is server-protected and reads the authenticated
student's supported PostgreSQL profile and skills; it never falls back to a
static development identity. Non-student actors receive a role-aware
unavailable state instead of another user's student profile.

## Identity mapping and authorization boundary

Provider identity is normalized conservatively (trim + lowercase) and matched
against the case-insensitively unique `users.email`. Entra and seeded-provider
sign-in is denied when the email does not match an ACTIVE existing user. The
explicit self-service signup action is the only path in this checkpoint that
provisions a base user, and it never derives roles from an email domain or form
input. The server primitive re-checks the database on every resolution,
returning an unmapped/onboarding-not-configured state for unknown users.

JWTs contain authentication/session data, not authoritative application roles.
Phase 6.2 will validate roles and capabilities from student/faculty profiles,
active organization memberships, organization type, and membership role.
Phase 6.3 will migrate domain authorization enforcement. Existing temporary
domain actors and policies intentionally remain unchanged in Phase 6.1.

`AUTH_SECRET` is required deployment configuration and must be a long random
secret. It, Entra credentials, database credentials, and raw provider tokens
are never exposed to client components or committed to source control.
