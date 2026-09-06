# Phase 6.4 Security Baseline

## IMPLEMENTED

- Auth.js `5.0.0-beta.32` is the authentication/session boundary. The app uses
  JWT sessions and resolves each session to an active existing `users` row;
  roles and organization authority are then read from PostgreSQL into an
  `AuthenticatedActor`. JWT claims never establish application roles.
- An explicitly gated internal-demo self-service provider stores only salted
  `scrypt-v1` password hashes in the one-to-one `user_credentials` table.
  Signup creates no profile, membership, organization, or role. The provider
  defaults off through `AUTH_SELF_SERVICE_ENABLED=false`; email verification,
  password recovery, MFA, distributed rate limiting, and public registration
  remain required before this path can be exposed beyond a private demo.
- Existing Auth.js HTTPS defaults are intentionally retained: session and CSRF
  cookies are `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/`; secure cookie
  names use the `__Secure-`/`__Host-` prefixes. The default JWT session max age
  is 30 days. `AUTH_SECRET` is required by Auth.js in production. Local HTTP
  development deliberately uses non-secure cookies so localhost remains usable.
- Auth.js protects sign-in and sign-out with its CSRF token/cookie flow. The
  focused verifier exercises a rejected invalid-CSRF sign-in and an HTTPS
  development session lifecycle. The development provider remains unavailable
  when `NODE_ENV=production`.
- Current database-backed browser mutations are Next.js Server Actions for
  assessment start/save/submit and offer response. Next.js 16 compares
  `Origin` with `Host`/`X-Forwarded-Host` for these POST requests; no extra
  origins are configured, so only same-origin requests are allowed. Every
  action also derives its actor server-side and delegates to service validation
  and resource authorization. Challenge and application write services are not
  currently exposed through browser mutation routes.
- Services own authoritative write fields and lifecycle transitions. Browser
  input cannot set an actor/user ID, organization authority, roles,
  `submitted_by`, review actor, `responded_by`/`responded_at`, score authority,
  or arbitrary persisted status. Challenge, application, assessment, and offer
  services validate their respective content, membership/ownership,
  question-response shape, and permitted transition before mutation.
- `DATABASE_URL`, `AUTH_SECRET`, and Entra client credentials are read only by
  server modules. No `NEXT_PUBLIC_*` secret configuration exists; client
  components do not import the DB/auth-secret boundary. Assessment read models
  omit answer keys and raw grading configuration.
- `.env*` is ignored while `.env.example` is explicitly trackable. Git-aware
  checks confirmed no tracked real `.env` or PEM credential files; the example
  contains placeholders only.

## VERIFIED EXISTING BEHAVIOR

- Authentication maps only active existing users; unmapped and inactive
  identities are denied. Authorization continues to require the actor plus
  authoritative resource relationships and domain policy.
- Stable domain errors are returned from service boundaries. Current read
  models do not serialize raw PostgreSQL errors, provider tokens, session
  cookies, secrets, organization internals outside authorized scopes, or
  assessment answer keys.
- Phase 6.3 regression coverage preserves anonymous-write denial, external
  partner exclusion from generic `VINUNI_ONLY` access, organization isolation,
  unrelated assessment denial, leader-only offer response, and workspace scope.

## PLANNED FOR PRODUCTION

### Rate limiting

| Class | Key | Enforcement boundary | Intent |
|---|---|---|---|
| Entra sign-in/callback | IP plus provider/account signal where safely available | edge/hosting layer, with Auth.js endpoint policy | slow credential and callback abuse |
| Application submission | authenticated user ID, challenge ID, and IP fallback | shared distributed limiter at the Server Action/service ingress | prevent duplicate/spam submissions |
| Assessment save/submit | authenticated user ID, attempt ID, and IP fallback | shared distributed limiter at Server Action ingress | protect expensive and high-frequency writes |
| Offer response | authenticated user ID and offer/application ID | shared distributed limiter at Server Action ingress | prevent replay/automation noise |
| Challenge create/update/review | authenticated user ID, organization ID, and IP fallback | shared distributed limiter at service ingress | protect privileged workflow writes |
| Marketplace/search | IP, with authenticated user ID when present | edge/hosting layer | mitigate scraping and abusive read volume if needed |

Limits are intentionally not fixed here: they require production traffic and
provider constraints. Phase 8 deployment/infrastructure owns a shared,
horizontally scalable implementation; an in-memory process-local limiter is
not suitable for production.

### Audit-sensitive operations

The existing `audit_logs` table is the future persistence target. Later write
integration should record actor, action, resource type/ID, timestamp, and safe
metadata for challenge create/edit/submit/review/publish/routing, application
submission, assessment submission, offer accept/decline, agreement acceptance,
project/milestone lifecycle changes, and privileged organization actions. It
must not record passwords, tokens, cookies, secrets, or unnecessary full
assessment responses.

### Deployment dependencies and Phase 8 controls

Production requires HTTPS with correctly forwarded host/protocol headers,
tenant-specific Entra redirect URIs and credentials, a long random
`AUTH_SECRET`, environment secret management/rotation, a stable
`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` shared by all app instances, and explicit
`serverActions.allowedOrigins` only if a trusted proxy/CDN changes the request
origin. Rate limiting, WAF/CDN policy, CSP, monitoring/SIEM, backup/recovery,
and production audit-log writes remain Phase 8 or later approved work.
