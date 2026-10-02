# Proposal: reviewed role administration

**Status:** Proposed — not approved, not implemented.
**Decision needed from:** product owner and security reviewer.
**Related:** [`../security/role-model.md`](../security/role-model.md),
[`../security/authorization-matrix.md`](../security/authorization-matrix.md),
[`../security/authentication-architecture.md`](../security/authentication-architecture.md),
[`../security/security-baseline.md`](../security/security-baseline.md),
[`../test/pre-demo-deployed-test-plan.md`](../test/pre-demo-deployed-test-plan.md).

---

## 1. Summary

Give authorised administrators a protected way to grant and revoke roles on
existing accounts, so that production builds no longer depend on development
personas or hand-written SQL. A new user registers (or signs in with Google /
Microsoft) with **no role**, and an administrator then assigns the role they are
entitled to. Every grant and revoke is recorded.

This replaces the temporary arrangement below, which is acceptable for private
demos only.

## 2. Background and problem

### 2.1 How roles work today

Roles are never stored on the user or in the session. `getAuthenticatedActor()`
derives capabilities from the database on every request
([`role-model.md`](../security/role-model.md)):

| Capability | Derived from |
|---|---|
| Student | a `student_profiles` row |
| Faculty | a `faculty_profiles` row |
| Partner representative | an `ACTIVE` `organization_memberships` row in an `EXTERNAL_PARTNER` organization |
| Internal unit member (CAID, E-Lab, …) | an `ACTIVE` membership in an `INTERNAL_UNIT` organization; `ADMIN` is the review authority for that unit |

There is deliberately no global system administrator.

### 2.2 How a role currently gets created

1. **Seed data** — the fixed demo identities (`pnpm db:seed`).
2. **Development personas** — a sign-up dropdown that lets the person choose
   Student, Faculty, Partner, CAID or E-Lab. It is hard-gated to
   `NODE_ENV` of `development` or `test`, so it is off in every production build.
3. **Hand-written SQL** — inserting the profile or membership row directly.

### 2.3 The problem

- A production build can sign users in but cannot give them roles, so on a
  deployed server only the seeded demo student works.
- Personas let anyone **self-assign** privileged roles (for example CAID
  administrator) with no verification. They are therefore forbidden in
  production, and running the Docker development image on a server only
  works as a stop-gap for a private demo.
- SQL is manual, error-prone and leaves no audit trail.
- Self-service sign-up creates accounts with no email verification, so the
  system cannot assume that an email address proves identity or entitlement.

## 3. Goals and non-goals

### Goals

1. Roles on a production build are granted only by an authorised person.
2. A user can never promote themselves.
3. Grants and revocations are auditable (who, whom, what, when, why).
4. Reuses the existing role model; no new kind of role or global super-admin.
5. Works with every sign-in method (email/password, Google, Entra).
6. Revocation takes effect on the next request without session changes.

### Non-goals

- Replacing Microsoft Entra / VinUniversity single sign-on (still the intended
  production identity source).
- Email verification, password recovery, MFA or rate limiting (tracked
  separately in the security baseline).
- Bulk import from the registrar or HR systems (see section 9, step 4).
- Changing what each role is allowed to do (the authorization matrix is
  unchanged).
- Student academic data (grades, courses, GPA) — still registrar-sourced.

## 4. Roles and who may grant them

Authority follows the existing organization model; nothing global is added.

| Role to grant | Granting rule (proposed) |
|---|---|
| Student profile | Any `ADMIN` of an internal unit (CAID or E-Lab), after confirming enrolment |
| Faculty profile | Any `ADMIN` of an internal unit |
| Partner representative of organization *O* | An `ADMIN` of *O* (self-managing), or a CAID `ADMIN` for any partner |
| Internal unit `ADMIN` / `REVIEWER` / `MEMBER` of unit *U* | An existing `ADMIN` of *U* only |
| Grant of the **first** `ADMIN` of a unit | Out-of-band bootstrap (see 6.4) |

Rules that apply to every grant:

- The granting user must be `ACTIVE` and hold the authority at the time of the
  request (checked server-side from the database, not from the session).
- No self-grants and no self-escalation: a user cannot create or upgrade any
  grant for their own account.
- The last active `ADMIN` of a unit cannot be removed or demoted.
- CAID administration does not imply E-Lab administration, and the reverse.

**Open decision D1:** whether a CAID `ADMIN` may grant faculty and student
profiles university-wide, or only for challenges they manage.

## 5. User experience

### 5.1 Account holder

1. Registers or signs in. With no role they see the existing account-setup
   page, which would gain a "Request access" action (see 5.3) and clear text
   about who to contact.
2. Once an administrator grants a role, the next page load shows that role's
   home page and navigation. No sign-out is needed, because roles are read
   from the database on each request.

### 5.2 Administrator (new area, for example `/review/people`)

- **Search** accounts by email (exact match; no open directory listing).
- **Account view:** name, email, status, sign-in method, current roles and
  memberships, and the grant history.
- **Grant:** choose the role (and organization where relevant), enter a reason,
  confirm. The confirmation shows exactly which rows will be created.
- **Revoke:** end a membership (status change) or remove a profile, with a
  reason. Existing work is preserved (see 7.3).
- **Access requests:** a queue of pending requests from role-less users.

Only roles the administrator is allowed to grant (section 4) are offered.

### 5.3 Access request (optional, phase 2)

A role-less user can submit a short request ("I am faculty in X", "I represent
partner Y") that appears in the administrator queue. A request grants nothing
by itself. It reduces back-and-forth and gives the administrator context.

## 6. Technical design

### 6.1 Server boundary

New server-side service (for example `src/services/role-admin.service.ts`)
exposing: `searchAccountByEmail`, `listGrantableRoles`, `grantRole`,
`revokeRole`, `listRoleHistory`. All access goes through server actions and the
existing service/query layer. Nothing connects to the database from the client.

Every operation:

1. Resolves the acting administrator with `getAuthenticatedActor()`.
2. Checks the granting rule for the requested role (section 4) against the
   database.
3. Runs the change and its audit record in **one transaction**.
4. Returns a controlled error with no existence leak for unauthorised callers
   (same 404 isolation the rest of the platform uses).

### 6.2 What a grant writes

Identical to what the development personas write today, so downstream code
needs no change:

| Grant | Rows |
|---|---|
| Student | `student_profiles` (user id) |
| Faculty | `faculty_profiles` (user id) |
| Partner or unit membership | `organization_memberships` (user, organization, role, `ACTIVE`, optional job title) |

Duplicate grants are prevented by the existing unique key on
`(user_id, organization_id, role)` and by an advisory lock keyed on the target
user, so two administrators acting at once cannot create duplicates or race a
revocation.

Revocation sets membership `status` to a non-active value rather than deleting
the row, so history stays intact. Profile revocation needs a design decision
(see D3).

### 6.3 Audit trail

`audit_logs` already exists in the ERD and Drizzle schema
(`id, user_id, action, entity_type, entity_id, details jsonb, created_at`) and
is not used by any application code yet. Proposed use:

| Field | Value |
|---|---|
| `user_id` | the acting administrator |
| `action` | `ROLE_GRANTED`, `ROLE_REVOKED`, `ROLE_REQUESTED` |
| `entity_type` / `entity_id` | `user` / target user id |
| `details` | role, organization id, previous and new status, reason, request id |

Whether the existing columns are enough is open decision D2 (a dedicated table
or a typed actor/target pair may be cleaner and easier to query).

### 6.4 Bootstrap and recovery

The first `ADMIN` of CAID (and of any other unit) cannot be granted through the
product. Provide a **guarded one-time script**, for example
`pnpm admin:grant-first-admin`, that:

- refuses `NODE_ENV=production` unless an explicit confirmation variable names
  the target database,
- prints the target and requires a typed confirmation,
- grants a single `ADMIN` membership and writes an audit record,
- is idempotent and refuses if that unit already has an active `ADMIN`.

The same script (or a documented SQL runbook) is the recovery path if every
administrator is locked out.

### 6.5 Interaction with existing gates

| Existing mechanism | Effect of this proposal |
|---|---|
| `AUTH_DEV_PERSONAS_ENABLED` | Unchanged. Remains development/test only. Not a production mechanism. |
| `AUTH_SELF_SERVICE_ENABLED` | Unchanged. Accounts created this way stay role-less until granted. |
| Seeded one-click identities | Unchanged. Development only. |
| Google sign-in | Unchanged: still requires an existing active user with a verified email; role administration then applies as usual. |

### 6.6 Schema and migrations

Possibly none. The role tables and `audit_logs` already exist. A migration
would be needed only if the audit table is reshaped (D2), if a profile
revocation state is added (D3), or if access requests are stored (D4). Per
project rules, any schema change goes through DBML → Drizzle → a reviewed
migration after explicit approval. This proposal does not approve any schema
change.

## 7. Security considerations

### 7.1 Threats and controls

| Threat | Control |
|---|---|
| Self-assigned privilege | No self-grants; granting authority read from the database, never from the request |
| Forged request / CSRF | Server actions with Auth.js CSRF protection; same-origin only |
| Admin account takeover | Admin actions are audited; require recent sign-in (open item D5); last-admin protection |
| Granting to the wrong person (lookalike email) | Exact-email lookup, confirmation screen shows name and email |
| Race between two admins | Transaction plus advisory lock per target user |
| Enumeration of accounts | No directory listing; exact search only; unauthorised callers get 404 |
| Lockout of every admin | Guarded bootstrap/recovery script |
| Stale access after revocation | Roles read from the database on every request; no role claims in the JWT |
| Over-broad email trust | Roles are never inferred from an email domain |

### 7.2 Dependencies on other security work

Because self-service sign-up has no email verification, an administrator
granting a role to an unverified address is trusting an assertion that the
system has not proved. Mitigations, in order of preference:

1. Grant only to accounts signed in through Google/Entra (verified email).
2. Add email verification before this is used with real people.
3. Grant out-of-band after confirming identity with the person.

### 7.3 Effect of revocation on existing work

Revoking a role must not corrupt records. Proposed rules:

- Past applications, offers, project memberships, milestone reviews and
  feedback remain, still attributed to the user.
- A user who loses the student capability can no longer take new actions as a
  student.
- A supervising faculty member who is revoked leaves active projects without
  an authoritative supervisor; the revocation screen must list affected
  projects and block or require reassignment (D3).

## 8. Alternatives considered

| Option | Why not chosen as the main path |
|---|---|
| Allow personas in production | Anyone can become CAID administrator; unacceptable on a reachable server |
| Role from email domain (`@vinuni.edu.vn`) | Rejected by the role model ("no email domain … establishes a role"); also unverified under self-service |
| Role claims from the identity provider (Entra groups) | The right long-term source for staff and faculty; depends on VinUniversity tenant configuration, so complementary rather than a replacement |
| Manual SQL | No audit, easy to get wrong |
| Developer-run grant script only | Lowest effort and fine as a first step (see rollout step 1), but needs server access for every change |

## 9. Rollout plan

| Step | Deliverable | Needs approval |
|---|---|---|
| 0 | **Interim:** private demo servers run the Docker development image with personas, behind a VPN or IP allowlist, with synthetic data only | No (already documented) |
| 1 | Guarded script: grant/revoke a role by email, writes `audit_logs` | Decision on D2 |
| 2 | Administrator page: search, grant, revoke, history | Yes (access control change) |
| 3 | Access-request queue | Yes (D4) |
| 4 | Entra group mapping and registrar import | Separate proposal |

Step 1 alone is enough to run a production build with real role assignment
and is the recommended first slice.

## 10. Test plan

Automated verifiers (same style as `scripts/verify-*.ts`, rollback-only
against a disposable database):

- every granting rule: allowed and denied for each role pairing in section 4;
- no self-grant or self-escalation, including through concurrent requests;
- last-admin protection;
- duplicate and concurrent grants produce one row and one audit entry;
- revoked membership loses access on the next request;
- unauthorised callers receive the controlled not-found response and no data;
- audit record written in the same transaction (injected failure rolls both
  back);
- bootstrap script refuses production without confirmation and refuses a unit
  that already has an administrator.

Browser checks (Playwright, isolated disposable database):

- role-less account sees setup page; after grant, home page and navigation
  change on the next load;
- each administrator type sees only the roles it may grant;
- revoked user is redirected or denied at once, including from an open tab;
- the Phase 6.3 authorization regression and the full role-play flow in
  [`../test/manual-role-play-test-flow.md`](../test/manual-role-play-test-flow.md)
  still pass.

## 11. Open decisions

| ID | Decision | Recommendation |
|---|---|---|
| D1 | Scope of CAID grants for students and faculty (university-wide or per managed challenge) | University-wide, because profiles are not challenge-scoped |
| D2 | Reuse `audit_logs` as is, or add a structured role-grant history table | Start with `audit_logs`; add a table only if queries become awkward |
| D3 | How profiles are revoked (new status column versus deletion) and how supervised projects are reassigned | Add a status, never delete; block revoking an active supervisor until projects are reassigned |
| D4 | Store access requests in the database, or handle them out-of-band | Out-of-band first; revisit after step 2 |
| D5 | Require recent re-authentication for grants | Yes once SSO exists; document as a risk until then |
| D6 | Who is the initial administrator of CAID and E-Lab, and how is that identity confirmed | Named by the product owner before step 1 |
| D7 | Allowed granting of partner roles by partner `ADMIN`s versus CAID only | Partner `ADMIN` for own organization, CAID for any |

## 12. Acceptance criteria

1. On a production build with personas disabled, a role-less user can be given
   each supported role by an authorised administrator, and no other way
   exists in the product to obtain one.
2. A user cannot grant themselves or escalate any role, even with crafted
   requests.
3. Every grant and revoke has an audit record (actor, target, role,
   organization, reason, time).
4. The last active administrator of a unit cannot be removed.
5. Revocation blocks access on the next request.
6. All existing verifiers, including Phase 6.3 authorization, still pass, and
   the schema has changed only as approved.
