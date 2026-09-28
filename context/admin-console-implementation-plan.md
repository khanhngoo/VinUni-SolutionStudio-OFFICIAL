# Global Platform Administration Console — Implementation Plan

**Project:** VinUni Solution Studio / AI-in-Action platform  
**Document type:** Detailed architecture and implementation plan; this document does not change runtime behavior  
**Prepared:** 2026-09-09  
**Proposed checkpoint:** Phase 6.6 — Global Platform Administration  
**Proposed sequence:** Phase 6.5 review → Phase 6.6 global administration → Phase 8 private staging/deployment → Phase 7 matching later

---

## 1. Clarified product intention

The requested administrator is the owner/operator of the whole Solution Studio
application. This administrator needs a global view of system workflows and
activities across users, organizations, challenges, applications,
assessments, offers, and projects.

This is not the same as the existing organization membership role named
`ADMIN`:

- a CAID `ADMIN` administers CAID authority only;
- an E-Lab `ADMIN` administers E-Lab authority only;
- an external-partner `ADMIN` would administer that partner organization only;
- the new platform owner operates the application globally.

The first version should introduce an explicit database-backed
`PLATFORM_OWNER` authority and a protected `/admin` console. It must not obtain
global authority from an organization name, email domain, environment-only
claim, Auth.js token field, or self-service registration.

The primary purpose of v1 is operational visibility and accountability. The
owner should be able to understand where records are in the system flow, see
recent audited actions, identify blocked or inconsistent workflows, and
perform a small set of explicitly authorized governance actions.

---

## 2. Executive recommendation

Implement Phase 6.6 in this order:

1. Add an explicit platform-role assignment model to the canonical DBML.
2. Add its modular Drizzle schema and a reviewed migration.
3. Extend authenticated actor resolution with a DB-derived `PLATFORM_OWNER`
   capability.
4. Add a guarded one-time/recovery CLI bootstrap path for the first owner.
5. Add a read-only global `/admin` shell and workflow dashboard.
6. Instrument sensitive domain mutations with atomic `audit_logs` writes.
7. Add global activity, user, organization, and workflow drill-down pages.
8. Add only the explicitly approved owner mutations.
9. Verify global access, revocation, privacy, audit integrity, and separation
   from organization roles.
10. Proceed to Phase 8 private staging/deployment while Phase 7 matching stays
    deferred.

Do not implement a universal “admin bypass” inside existing services. Existing
student, faculty, partner, CAID, and E-Lab routes should keep their current
resource policies. The global console should use dedicated admin read models
and explicit admin mutations whose authority is clear and testable.

---

## 3. Current repository status

### 3.1 Existing foundations

- Auth.js resolves sessions to ACTIVE `users` records.
- Self-service signup creates an ACTIVE base identity without roles.
- `resolveAuthenticatedActor()` derives student/faculty capabilities and
  organization memberships from PostgreSQL.
- CAID and E-Lab administrator accounts are organization-scoped through
  `organization_memberships`.
- Phase 6 authorization protects marketplace, application, assessment, offer,
  workspace, faculty, partner, and internal-unit review paths.
- `/review` is an organization-scoped challenge review surface.
- The canonical schema already contains `audit_logs`.
- Domain lifecycle data is stored in PostgreSQL and is available for global
  read models.

### 3.2 Missing global-administration capabilities

- There is no global platform role.
- There is no `/admin` route or navigation entry.
- There is no owner bootstrap/recovery command.
- There is no global workflow overview.
- There is no global user or organization administration UI.
- `audit_logs` is not yet populated consistently by runtime workflows.
- Authentication events, infrastructure logs, and business audit events are
  not presented as a coherent operational view.
- There is no policy for platform-wide user status or organization
  verification mutations.

### 3.3 Authority conflict that must be resolved explicitly

The current ERD and Phase 6 documentation state that no global system/admin
role is required. The clarified product requirement changes that architectural
decision.

The implementation must therefore update authority sources in order:

```text
approved global-owner decision
    ↓
docs/database/schema.dbml
    ↓
docs/security/authorization-matrix.md and architecture notes
    ↓
src/db/schema/*.ts
    ↓
version-controlled Drizzle migration
    ↓
actor/policy/service implementation
```

The existing organization `ADMIN` role remains unchanged and must not be
reinterpreted as global authority.

---

## 4. Goals

1. Give the application owner a global, database-backed operational view.
2. Show system workflow state without depending on Phase 7 matching.
3. Record future security-sensitive and lifecycle-changing activity
   consistently.
4. Support secure owner bootstrap, revocation, and recovery.
5. Keep platform authority separate from organization authority.
6. Prevent self-service registration or provider claims from granting owner
   access.
7. Add narrowly scoped governance actions without introducing arbitrary data
   editing.
8. Prepare the application for private staging/deployment before matching.
9. Preserve all established Phase 6 resource policies outside `/admin`.

---

## 5. Non-goals

The first global-admin release will not:

- grant `PLATFORM_OWNER` automatically during signup or sign-in;
- infer platform authority from a VinUni email domain;
- use CAID/E-Lab membership as a global-owner shortcut;
- expose password hashes, session cookies, CSRF tokens, secrets, database
  credentials, or raw environment variables;
- offer user impersonation or “sign in as user” behavior;
- provide a generic table editor or arbitrary SQL execution UI;
- bypass challenge/application/project lifecycle transitions;
- reconstruct historical events that were never written to `audit_logs`;
- replace infrastructure monitoring with database audit rows;
- implement email invitations or password recovery;
- add structured/semantic matching, embeddings, pgvector queries, or ranking;
- expose highly sensitive student content merely because workflow metadata is
  globally visible;
- mark the internal-demo self-service provider as public-production ready.

---

## 6. Global authority model

### 6.1 Recommended role

Introduce one v1 platform role:

```text
PLATFORM_OWNER
```

Future roles such as `PLATFORM_ADMIN`, `SUPPORT_OPERATOR`, or
`PLATFORM_AUDITOR` should not be added until their permissions differ in an
approved matrix. Avoid speculative role names with no behavior.

`PLATFORM_OWNER` means the account can enter the global administration console
and perform only the global operations enumerated in the platform-owner policy.
It must not mean “skip every authorization check.”

### 6.2 Recommended schema

Add a new enum and assignment table to `docs/database/schema.dbml`:

```text
Enum platform_role {
  PLATFORM_OWNER
}

Enum platform_role_status {
  ACTIVE
  REVOKED
}

Table user_platform_roles {
  id bigint [pk, increment]
  user_id bigint [not null]
  role platform_role [not null]
  status platform_role_status [not null, default: 'ACTIVE']

  granted_by bigint
  granted_at timestamptz
  revoked_by bigint
  revoked_at timestamptz

  created_at timestamptz
  updated_at timestamptz

  indexes {
    (user_id, role) [unique]
    (role, status)
  }
}
```

Relationships:

```text
users.id < user_platform_roles.user_id
users.id < user_platform_roles.granted_by
users.id < user_platform_roles.revoked_by
```

Design rationale:

- Do not add `users.is_admin`; a boolean does not record role lifecycle or
  grant/revoke provenance.
- Do not encode global authority as membership in a specially named
  organization.
- Keep the row when revoked so administration history remains explainable.
- Permit multiple active owners for operational recovery.
- Require at least one ACTIVE owner after initial bootstrap.
- Keep bootstrap `granted_by` nullable only for the documented initial/recovery
  path; ordinary grants must identify the acting owner.

The exact status/check constraints and foreign-key delete behavior must be
reviewed against the canonical ERD conventions before migration generation.

### 6.3 Actor resolution

Extend `AuthenticatedActorCapability` with:

```text
PLATFORM_OWNER
```

`resolveAuthenticatedActor()` should query ACTIVE platform-role assignments
alongside profiles and organization memberships. The role must be re-read from
PostgreSQL when the actor is resolved; JWT claims are not authoritative.

Expected effect:

- revocation takes effect on the next server-side actor resolution;
- a self-service account remains unprivileged until a role row is granted;
- organization roles and platform roles can coexist without being conflated;
- CAID/E-Lab admins do not gain `PLATFORM_OWNER` unless explicitly assigned.

### 6.4 Explicit policy, not a universal bypass

Create platform-owner helpers such as:

- `hasPlatformOwnerCapability(actor)`
- `requirePlatformOwner(actor)`
- `canPlatformOwnerRead(resourceType)`
- `canPlatformOwnerMutate(operation)`

Existing domain policies must not be changed to begin with
`if (platformOwner) return true`. Each global console query or mutation must
have an explicit owner policy and purpose.

This distinction prevents accidental authority over future sensitive features
and keeps ordinary application routes predictable.

---

## 7. Secure owner bootstrap and recovery

### 7.1 Initial bootstrap flow

The first owner must already have an ACTIVE `users` row, created through the
self-service flow, Entra mapping, or an approved deployment provisioning step.

Recommended flow:

```text
owner creates/signs into a normal account
    ↓
deployment operator runs guarded server-side command
    ↓
command resolves exact normalized email to one ACTIVE user
    ↓
command verifies bootstrap conditions
    ↓
PLATFORM_OWNER assignment + audit row commit atomically
    ↓
owner signs in again and receives DB-derived owner capability
```

Add an explicit command, for example:

```bash
ALLOW_PLATFORM_OWNER_BOOTSTRAP=true \
pnpm admin:grant-owner -- --email owner@example.com
```

The exact CLI syntax must be verified with the repository's pnpm version.

### 7.2 Bootstrap safeguards

- Require an explicit environment confirmation flag.
- Refuse unknown, inactive, or suspended users.
- Normalize and compare email case-insensitively.
- Never create the user automatically.
- Never accept a password through this command.
- Refuse silent reassignment when an ACTIVE owner already exists unless the
  command uses an explicit recovery/second-owner mode.
- Print the exact target identity and outcome, never credential material.
- Write a bootstrap audit event in the same transaction.
- Be idempotent for an already ACTIVE assignment.
- Exit non-zero on ambiguous or unsafe conditions.

### 7.3 Development/E2E owner

Add a synthetic deterministic development identity only if browser E2E needs
it, for example:

```text
PLATFORM_OWNER_DEMO
platform.owner.dev@example.test
```

If added, update the seed manifest and authentication verifier. Never commit a
real team member's email as the production owner. The development identity
must remain unavailable in production mode like all other seeded identities.

### 7.4 Recovery and last-owner invariant

- Permit more than one owner to avoid a single-account lockout.
- Prevent revocation of the final ACTIVE `PLATFORM_OWNER`.
- Prevent self-revocation when the actor is the final ACTIVE owner.
- Recheck and lock relevant assignment rows inside the revocation transaction.
- Document an offline recovery procedure for a deployment with no accessible
  owner account.
- Recovery must use the same guarded command and produce an audit event.

---

## 8. Global admin information architecture

```text
/admin
├── overview
├── activity
├── users
│   └── [userId]
├── organizations
│   └── [organizationId]
├── challenges
│   └── [challengeId]
├── applications
│   └── [applicationId]
├── assessments
│   └── [assessmentId]
├── offers
│   └── [offerId]
├── projects
│   └── [projectId]
├── access
├── audit
└── system
```

Recommended delivery priority:

| Route | Purpose | Priority |
|---|---|---|
| `/admin` | Global workflow overview | Required |
| `/admin/activity` | Recent business/security activity feed | Required |
| `/admin/users` | Global account status and capability inventory | Required |
| `/admin/organizations` | Organization and membership inventory | Required |
| `/admin/challenges` | Cross-system lifecycle overview | Required |
| `/admin/applications` | Application-stage overview | Required |
| `/admin/projects` | Project-state overview | Required |
| `/admin/access` | Platform-owner assignments and approved access operations | Required |
| `/admin/audit` | Filterable persistent audit history | Required |
| `/admin/assessments` | Assessment-state overview | Recommended |
| `/admin/offers` | Offer-state overview | Recommended |
| `/admin/system` | Safe application/database health summary | Recommended for Phase 8 |

Detail routes should initially present identifiers, relationships, lifecycle
state, timestamps, and links to authoritative domain pages. They should not
duplicate every domain UI.

---

## 9. Functional scope

### 9.1 Global overview

Show live, database-backed counts and actionable workflow summaries:

- users by ACTIVE/INACTIVE/SUSPENDED status;
- users by derived capability;
- authorization-neutral self-service users;
- organizations by type and verification status;
- organization memberships by status and role;
- challenges by lifecycle status, visibility, owner, and manager;
- challenges awaiting review/publication;
- challenges with approaching or expired deadlines;
- applications by lifecycle stage;
- assessments by state/outcome band where disclosure is approved;
- selections/offers by state;
- active, final-review, completed, and stalled projects;
- recent audit events;
- failed or incomplete flows detectable from durable database state.

All counts must be computed in bounded, set-based SQL. Do not load all records
and aggregate in React. Every metric must have a documented definition and link
to the filtered list that produced it.

Avoid invented “success,” “quality,” or “AI” metrics. Do not present absence of
an audit event as proof that an action never occurred before instrumentation.

### 9.2 Global activity feed

`/admin/activity` should combine durable, approved business events into a
chronological operational feed. Example events:

- user registered;
- user status changed;
- platform role granted/revoked;
- organization verified/rejected;
- organization membership changed;
- challenge created/submitted/reviewed/approved/published;
- application submitted or transitioned;
- assessment submitted/reviewed;
- selection/offer created or responded to;
- project created or moved through milestones/final review/completion.

The feed should support time range, actor, action category, entity type/ID,
outcome where recorded, and bounded newest-first pagination.

The feed is prospective from the point instrumentation is deployed. Existing
rows provide current state, not a trustworthy historical activity timeline.

### 9.3 User inventory

`/admin/users` should show:

- full name and normalized email;
- account status;
- credential presence as a boolean only, never hash/algorithm details;
- derived profiles/capabilities;
- organization memberships;
- platform-role assignment state;
- created/updated timestamps;
- recent administrative events for that user.

Search must be length-bounded and paginated. Platform owners may search the
global directory because global account operations are an approved owner
function. Ordinary organization admins must never inherit this visibility.

The detail page must distinguish identity, authentication method/credential
presence, student/faculty profile, organization memberships, and global
platform roles. These are separate sources of authority and must not become one
editable “role” dropdown.

### 9.4 Organization inventory

Show organization name/type, verification status, membership counts, challenge
ownership/management counts, current organization administrators/contact
persons, timestamps, and recent audit events.

The detail page may link to existing partner or review views, but must not reuse
their organization-scoped actor context as global-owner authority.

### 9.5 Workflow inventories

Global workflow pages are operational indexes, not alternate domain
implementations.

#### Challenges

- public ID/slug/title, status, visibility, and confidential flag;
- owner/managing organizations;
- deadline/start date and application count;
- last recorded lifecycle event.

#### Applications

- public ID, challenge/organization relationships, stage/status;
- leader/team identifiers appropriate for owner visibility;
- submission/update timestamps;
- assessment/selection/offer/project linkage state.

#### Assessments and offers

- workflow identifiers and state;
- ownership/relationship metadata;
- creation/submission/review/response timestamps;
- inconsistency flags based on approved lifecycle invariants;
- sensitive answers/private offer details only if separately approved.

#### Projects

- project/application/challenge identifiers and status;
- owner/managing organizations and faculty assignment;
- member count, milestone progress, and last activity time.

Where an existing authoritative detail route permits owner access, link to it.
Otherwise create an admin-specific metadata view with explicit owner policy.
Do not weaken the ordinary route policy merely to make a link work.

### 9.6 Safe system status

`/admin/system` may show application version, server time, environment label,
database connectivity, latest migration identifier, non-secret feature-flag
states, future job status, and Phase 8 monitoring links.

Never expose environment-variable values, database URLs, Auth.js secrets,
tokens, raw cookies/headers, browser stack traces, or unrestricted server logs.

### 9.7 Existing CAID/E-Lab review behavior

`/review` remains organization-scoped and unchanged. A platform owner without a
CAID/E-Lab membership does not automatically become that unit's reviewer.

The global console uses dedicated admin read models. Any future global
lifecycle override must be a named, audited owner operation with its own policy;
it must not pretend that the owner belongs to an organization.

---

## 10. Platform-owner mutation policy

### 10.1 Recommended v1 mutations

After the read-only console and audit foundation are verified, permit only:

1. Grant a second `PLATFORM_OWNER` assignment.
2. Revoke a `PLATFORM_OWNER` assignment while preserving at least one owner.
3. Suspend or reactivate a user account.
4. Verify or reject an organization.
5. Add/reactivate/deactivate an organization membership by exact user and
   organization selection, if approved for internal-demo onboarding.

Each operation requires a dedicated service, documented policy, current-state
validation, service-owned transaction, same-transaction audit event,
confirmation for sensitive changes, and focused rollback/authorization tests.

### 10.2 Mutations deferred by default

- deleting users or organizations;
- changing user email or viewing/resetting passwords;
- creating student/faculty profiles or altering academic verification;
- editing assessment answers/scores;
- reversing offers or accepted agreements;
- changing project membership outside existing lifecycle rules;
- editing audit history or impersonating another actor;
- arbitrary challenge/application/project status overrides.

These require separate product semantics and must not exist merely because the
caller is a platform owner.

### 10.3 Account suspension semantics

If approved:

- use existing `users.status` values;
- suspension prevents future authenticated-user resolution;
- never delete credentials as a side effect;
- require a bounded reason;
- prevent suspension of the final accessible ACTIVE owner;
- audit previous/next state, actor, target, and reason;
- verify active-session behavior rather than assuming immediate termination.

### 10.4 Organization verification semantics

If approved:

- preserve existing `PENDING`, `VERIFIED`, and `REJECTED` states;
- define allowed transitions first;
- require a bounded rejection reason;
- do not grant membership/publish challenges implicitly;
- update verification and audit atomically.

### 10.5 Temporary onboarding without invitations

For the private demo, an owner may attach an existing ACTIVE user to a selected
organization by exact normalized email.

```text
person creates self-service account
    ↓
account remains authorization-neutral
    ↓
PLATFORM_OWNER selects organization, exact email, and role
    ↓
server rechecks owner authority and target state
    ↓
membership + audit event commit atomically
```

Do not create the user implicitly, infer roles from email/domain, or create
student/faculty profiles. Preserve multiple membership-role rows and handle
duplicates safely. Label this as manual admin onboarding, not invitations.

---

## 11. Audit and observability design

### 11.1 Separate authoritative sources

| Source | Purpose | Storage |
|---|---|---|
| Domain state | Current workflow truth | Existing PostgreSQL domain tables |
| Application audit | Who changed what and when | `audit_logs` |
| Infrastructure telemetry | Errors, latency, request/resource health | Phase 8 monitoring/log platform |

The dashboard may summarize these later, but they answer different questions.

### 11.2 Audit event envelope

Use the existing fields consistently:

- `user_id`: authoritative actor, nullable only for approved system/bootstrap
  events;
- `action`: stable uppercase event code;
- `entity_type`: stable entity category;
- `entity_id`: internal bigint ID when available;
- `details`: minimal structured context with bigint IDs serialized as strings;
- `created_at`: server/database timestamp.

Never include passwords, hashes, secrets, tokens, cookies, complete forms,
CV/transcript content, or raw assessment answers.

### 11.3 Initial event catalog

Platform access:

- `PLATFORM_OWNER_BOOTSTRAPPED`
- `PLATFORM_OWNER_GRANTED`
- `PLATFORM_OWNER_REVOKED`
- `USER_SUSPENDED`
- `USER_REACTIVATED`

Organizations:

- `ORGANIZATION_VERIFIED`
- `ORGANIZATION_REJECTED`
- `ORGANIZATION_MEMBERSHIP_ADDED`
- `ORGANIZATION_MEMBERSHIP_REACTIVATED`
- `ORGANIZATION_MEMBERSHIP_DEACTIVATED`

Challenges:

- `CHALLENGE_CREATED`
- `CHALLENGE_SUBMITTED`
- `CHALLENGE_REVIEWED`
- `CHALLENGE_REVISION_REQUESTED`
- `CHALLENGE_APPROVED`
- `CHALLENGE_PUBLISHED`

Downstream workflow:

- `APPLICATION_SUBMITTED`
- `APPLICATION_STATUS_CHANGED`
- `ASSESSMENT_SUBMITTED`
- `ASSESSMENT_REVIEWED`
- `SELECTION_CREATED`
- `OFFER_CREATED`
- `OFFER_ACCEPTED`
- `OFFER_DECLINED`
- `PROJECT_CREATED`
- `PROJECT_STATUS_CHANGED`
- `MILESTONE_STATUS_CHANGED`
- `PROJECT_COMPLETED`

Only add events for real production mutations; never fabricate activity for
unimplemented flows.

### 11.4 Atomic audit writes

```text
service opens transaction
    ↓
service rechecks actor/resource state
    ↓
domain mutation executes
    ↓
audit row is inserted
    ↓
both commit or both roll back
```

An audit helper accepts authoritative values from the service, never actor or
entity identity supplied by a client form.

### 11.5 Authentication activity

- Never log submitted passwords.
- Avoid retaining unknown email addresses unnecessarily.
- Use rate-limit/security telemetry for repeated failures.
- Record successful account-level sign-in only after retention/privacy review.
- Keep raw authentication diagnostics in protected infrastructure logs, not
  directly in `/admin`.

---

## 12. Privacy and sensitive-data boundaries

Global operational visibility does not automatically mean unrestricted content
visibility.

Recommended v1 rule:

- owners can read global identifiers, relationships, statuses, timestamps,
  counts, and audit metadata needed to diagnose workflows;
- existing policies continue protecting private briefs, assessment answers,
  CVs, transcripts, private notes, and other sensitive content;
- any owner access to sensitive content must be named in the authorization
  matrix and tested explicitly.

Admin queries select only columns needed for the current view. The UI should
show “restricted content” rather than silently loading protected fields.

Before public production, complete student-data privacy review, audit retention
policy, administrator acceptable-use policy, access review/revocation, incident
response, and owner-account recovery procedures.

---

## 13. Technical architecture

### 13.1 Expected file structure

```text
src/app/admin/
├── layout.tsx
├── page.tsx
├── activity/page.tsx
├── users/
│   ├── [userId]/page.tsx
│   ├── actions.ts
│   └── page.tsx
├── organizations/
│   ├── [organizationId]/page.tsx
│   ├── actions.ts
│   └── page.tsx
├── challenges/
│   ├── [challengeId]/page.tsx
│   └── page.tsx
├── applications/
│   ├── [applicationId]/page.tsx
│   └── page.tsx
├── assessments/page.tsx
├── offers/page.tsx
├── projects/
│   ├── [projectId]/page.tsx
│   └── page.tsx
├── access/
│   ├── actions.ts
│   └── page.tsx
├── audit/page.tsx
└── system/page.tsx

src/components/admin/
├── admin-navigation.tsx
├── activity-table.tsx
├── filter-bar.tsx
├── status-summary.tsx
└── workflow-table.tsx

src/db/queries/admin.ts
src/db/mutations/admin.ts
src/services/platform-admin-policy.ts
src/services/platform-admin.service.ts
src/services/audit.service.ts
scripts/admin-grant-owner.ts
scripts/verify-platform-admin.ts
```

Database access remains server-side; authorization and business rules remain
outside client components.

### 13.2 Request flow

```text
Server Component / Server Action
    ↓
getAuthenticatedActor()
    ↓
requirePlatformOwner(actor)
    ↓
platform-admin service
    ↓
bounded query or transaction-owned mutation
    ↓
Drizzle → PostgreSQL
```

Client components may manage form state, filters, pagination, and dialogs, but
never PostgreSQL access or owner authorization.

### 13.3 Defense in depth

- `/admin/layout.tsx` performs the first gate.
- Every admin page repeats the gate before sensitive reads.
- Every Server Action re-resolves the actor.
- Every service checks platform-owner policy.
- Every mutation checks target state inside its transaction.
- Every direct identifier is untrusted input.
- No global query runs before page-level owner authorization.

A layout alone is not an adequate authorization boundary for Server Component
execution.

### 13.4 Query rules

- Dedicated server-only global admin queries.
- Only approved fields selected.
- Parameterized, length-bounded filters and date ranges.
- Bounded pagination and deterministic ordering.
- Set-based aggregates; avoid N+1 queries.
- No client-only filtering of globally loaded data.
- Typed/null missing-record behavior; no raw DB errors.
- Use `EXPLAIN` before proposing indexes.

### 13.5 Transaction rules

1. Re-read owner authority where required.
2. Read/validate target state.
3. Lock rows needed for final-owner/status invariants.
4. Apply the mutation.
5. Insert the audit event.
6. Commit only when all steps succeed.

Typed errors may include `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
`LAST_PLATFORM_OWNER`, `INVALID_TRANSITION`, and `VALIDATION_ERROR`.

---

## 14. UI and accessibility requirements

### 14.1 Navigation

- Show `Admin` only for DB-derived ACTIVE `PLATFORM_OWNER`.
- Navigation remains non-authoritative.
- Existing role navigation remains tied to existing capabilities.
- Owners with another capability may see both relevant areas.
- Display persistent “Global administration” context inside `/admin`.

### 14.2 Dashboard and lists

- Lead with workflow state and attention items.
- Link every metric to its exact filtered list.
- Display definitions for non-obvious counts and data-load time.
- Distinguish empty, restricted, loading, and error states.
- Preserve filters in query parameters.
- Support bounded pagination and mobile representations.
- Make non-secret identifiers copyable.
- Never imply audit coverage predates instrumentation.

### 14.3 Mutation forms

- Confirm suspension, revocation, and rejection explicitly.
- Require bounded reasons where appropriate.
- Disable duplicate submission while pending.
- Provide accessible `aria-live` feedback.
- Never expose raw PostgreSQL errors or stack traces.
- Re-render authoritative state after completion.

### 14.4 Accessibility baseline

- Full keyboard navigation and visible focus.
- Programmatic labels and correct headings/landmarks.
- Status never depends on color alone.
- Dialog focus management.
- Tables have headings/captions or descriptive context.
- Manual responsive/accessibility smoke tests.

---

## 15. Implementation checkpoints

Each checkpoint stops for verification and human review before expanding
authority.

### 15.1 Checkpoint A — roadmap and governance amendment

- Add Phase 6.6 to `PRODUCTION_TRANSFORMATION_PLAN.md`.
- Record Phase 7 matching as deferred.
- Set Phase 8 private staging after Phase 6.6.
- Replace the decision that no global admin is required.
- Approve `PLATFORM_OWNER`, permissions, sensitive-content boundaries, and
  initial/recovery procedures.

**Exit:** owner authority and phase sequence approved.

### 15.2 Checkpoint B — canonical schema and migration

- Update `docs/database/schema.dbml` first.
- Add enum/table to a modular Drizzle file.
- Add constraints/indexes/timestamps/foreign keys.
- Generate and inspect a named migration.
- Replay migrations from empty database.
- Update architecture documentation.
- Never seed a real person's owner email.

**Exit:** DBML, Drizzle, migration, and documentation agree.

### 15.3 Checkpoint C — actor capability and bootstrap

- Extend actor resolution and policy helpers.
- Add guarded owner-bootstrap/recovery command.
- Add synthetic development owner only if approved.
- Verify grants, idempotence, revocation, final-owner protection, and recovery.
- Verify signup/provider claims never grant owner authority.

**Exit:** owner authority is DB-derived, revocable, and recoverable.

### 15.4 Checkpoint D — read-only admin shell

- Read installed Next.js 16 documentation for layouts, Server Components,
  Server Actions, forms, and authorization before coding.
- Add `/admin` layout/navigation/overview.
- Add read-only user, organization, challenge, application, and project lists.
- Add metadata-only details as needed.
- Add direct-route/service authorization tests.

**Exit:** owner can inspect global workflow without new mutation authority.

### 15.5 Checkpoint E — audit and activity

- Define event names/minimum details.
- Add reusable server-only audit insert primitive.
- Instrument high-value real lifecycle mutations incrementally.
- Keep writes/audit atomic.
- Add activity/audit routes.
- Document coverage start date/gaps.
- Add rollback tests.

**Exit:** new sensitive actions create durable, filterable audit events.

### 15.6 Checkpoint F — access governance

- Add `/admin/access`.
- Support second-owner grant and safe revocation.
- Add account suspension/reactivation if approved.
- Add organization verification if approved.
- Add exact-email membership assignment if approved.
- Confirm/reason/audit every mutation.

**Exit:** approved governance actions are explicit and safe.

### 15.7 Checkpoint G — operational coverage

- Add assessment/offer state pages if required.
- Add safe blocked/inconsistent-flow indicators from documented invariants.
- Add safe system metadata and future monitoring links.
- Disable matching UI by default while Phase 7 is deferred.

**Exit:** global visibility covers the implemented MVP flow.

### 15.8 Checkpoint H — final verification

- Run complete persona/policy matrix.
- Verify revoke/suspend behavior against sessions.
- Review global query fields and every owner mutation/audit detail.
- Run reset/migration/seed verification.
- Complete responsive/accessibility checks.
- Obtain review before Phase 8.

**Exit:** Phase 6.6 complete for private staging deployment.

---

## 16. Verification plan

### 16.1 Role and policy verifier

Add `scripts/verify-platform-admin.ts` proving:

- anonymous/base/student/faculty/partner actors lack owner capability;
- CAID/E-Lab `ADMIN` alone cannot access `/admin`;
- ACTIVE assignment grants owner capability;
- REVOKED assignment grants none;
- JWT claims cannot manufacture authority;
- signup cannot claim a privileged owner email;
- platform and organization capabilities coexist independently.

### 16.2 Bootstrap verifier

- Unknown/inactive targets rejected.
- Normalized email works.
- Grant creates one assignment and audit event.
- Repeat grant is idempotent.
- Recovery/second-owner mode is explicit.
- Last owner cannot be revoked.
- Failure changes no rows.
- No credential material is output/audited.

### 16.3 Query verifier

Cross-check admin counts against direct SQL after deterministic reset for users,
organizations/memberships, challenges, applications, assessments,
selections/offers, projects/milestones, and verifier-owned audit fixtures.
Verify pagination, filters, ordering, missing IDs, and sensitive-field exclusion.

### 16.4 Mutation verifier

- Unauthorized direct service calls denied.
- Client actor IDs ignored.
- Suspension/verification/owner/membership writes are atomic with audit.
- Duplicate/conflicting writes fail cleanly.
- Final-owner safety holds under rollback/concurrency.
- No unrelated profile, credential, organization, or workflow rows change.

### 16.5 Browser/runtime matrix

| Persona | `/admin` expectation |
|---|---|
| Anonymous | Redirect to `/sign-in` |
| New self-service account | Clean deny |
| `JORDAN_STUDENT_DEMO` | Clean deny |
| `FACULTY_PHAM_DEMO` | Clean deny |
| `BENCANG_CONTACT_DEMO` | Clean deny |
| `CAID_ADMIN_DEMO` | Deny unless separately assigned `PLATFORM_OWNER` |
| `ELAB_ADMIN_DEMO` | Deny unless separately assigned `PLATFORM_OWNER` |
| Approved owner account/fixture | Global console visible |
| Revoked owner | Clean deny on next actor resolution |

Check status/redirect, DOM, browser console, failed requests, direct URL guesses,
and sensitive-data absence.

### 16.6 Regression commands

```bash
pnpm exec tsx scripts/verify-platform-admin.ts
pnpm exec tsx scripts/verify-auth-architecture.ts
pnpm exec tsx scripts/verify-self-service-authentication.ts
pnpm exec tsx scripts/verify-role-model.ts
pnpm exec tsx scripts/verify-authorization.ts
pnpm exec tsx scripts/verify-challenge-writes.ts
pnpm exec tsx scripts/verify-application-runtime.ts
pnpm exec tsx scripts/verify-assessment-runtime.ts
pnpm exec tsx scripts/verify-offer-runtime.ts
pnpm exec tsx scripts/verify-workspace-runtime.ts
pnpm exec tsx scripts/verify-partner-runtime.ts
pnpm exec tsx scripts/verify-faculty-runtime.ts
pnpm exec tsc --noEmit
pnpm lint
pnpm db:check
pnpm exec drizzle-kit check
pnpm build
git diff --check
```

Because this checkpoint changes schema/migrations and possibly deterministic
development identity data, also run `pnpm db:reset`, `pnpm db:check`, and the
platform-admin verifier again. Temporary rows must roll back or be cleaned up.

---

## 17. Matching deferral and Phase 8 ordering

Phase 7 is not required for administration or deployment. Amend the active
sequence to:

```text
Phase 6.6 global administration
    ↓
Phase 8 private staging/internal-demo deployment
    ↓
Phase 7 matching when prioritized
```

Before deployment, audit recommendation language, scores, and “AI shortlist”
claims. If Phase 7 has not validated them, default to:

```dotenv
MATCHING_ENABLED=false
```

Matching routes/components should be unavailable or clearly internal-demo-only
when disabled. The admin console must not introduce matching metrics.

Preserve future pgvector support in the managed database choice, but add no
vector query/index merely to unblock deployment.

### 17.1 Deployment classification

The first deployment remains private staging/internal demo because self-service
auth lacks email verification, password recovery, MFA, and distributed rate
limiting.

Do not complete full Phase 8 until HTTPS, secrets, managed DB networking,
backups/recovery, migrations, monitoring, rate limiting, retention, and privacy
review are verified.

---

## 18. Security checklist

- [ ] Canonical DBML explicitly models `PLATFORM_OWNER`.
- [ ] Platform authority is separate from organization membership.
- [ ] Signup/provider/JWT claims cannot grant platform authority.
- [ ] Bootstrap/recovery is guarded and audited.
- [ ] At least one accessible ACTIVE owner remains.
- [ ] Layout/pages/actions/services/mutations independently authorize.
- [ ] Existing domain routes retain Phase 6 policies.
- [ ] No universal owner bypass exists in domain services.
- [ ] Global queries select only required fields.
- [ ] Sensitive content access is separately approved/tested.
- [ ] Every mutation has explicit policy/confirmation/audit.
- [ ] Mutation and audit commit atomically.
- [ ] Audit details contain no secrets/unnecessary sensitive content.
- [ ] Suspension/session behavior is verified.
- [ ] Lists bound search, filters, date ranges, and pagination.
- [ ] UI exposes no raw logs, stack traces, DB URLs, or environment values.
- [ ] Rate limits exist before public use.
- [ ] Matching UI is disabled/demo-only while Phase 7 is deferred.

---

## 19. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Organization `ADMIN` mistaken for owner | Separate platform-role table/capability; explicitly deny org admins in tests. |
| Owner becomes universal bypass | Dedicated policies/read models; enumerate each mutation. |
| Self-service account claims owner | Explicit DB grant via bootstrap/existing owner only. |
| Single owner is lost | Multiple owners, last-owner protection, documented recovery. |
| Unnecessary private content exposed | Metadata-first views and column minimization. |
| Audit appears historically complete | Display coverage start date; separate current state from events. |
| Audit and domain state disagree | Same service-owned transaction and rollback verification. |
| Infrastructure secrets leak | Allowlisted system facts only; raw telemetry remains external. |
| Suspension leaves usable sessions | Verify/recheck active status at every request boundary. |
| Global lists become slow | Bounded pagination, set queries, `EXPLAIN`, reviewed indexes. |
| Demo scoring ships as real AI | Disable matching by default. |
| Scope becomes arbitrary editing | Mutation allowlist and new approval checkpoint for expansion. |

---

## 20. Human decision gates

1. Approve `PLATFORM_OWNER` as the initial role.
2. Approve multiple ACTIVE owners for recovery.
3. Decide synthetic development owner versus bootstrap in E2E setup.
4. Decide metadata-only versus selected confidential-content visibility.
5. Approve/defer account suspension.
6. Approve/defer organization verification.
7. Approve/defer exact-email organization membership assignment.
8. Decide whether owner delegation is UI-enabled or initially CLI-only.
9. Define audit retention/privacy before public production.
10. Approve `MATCHING_ENABLED=false` as deployed MVP default.
11. Confirm next deployment is private staging/internal demo.

Recommended defaults:

- use `PLATFORM_OWNER` and allow at least two owners;
- use a synthetic development owner for deterministic E2E only;
- begin with metadata-oriented global read access;
- add suspension/verification only after read-only/audit foundations pass;
- permit exact-email membership onboarding for private demo;
- allow delegation only with final-owner safeguards;
- disable matching UI;
- deploy privately before public hardening.

---

## 21. Definition of done

Phase 6.6 is complete when:

- canonical DBML, Drizzle, migration, and docs model platform authority;
- ACTIVE PostgreSQL assignments derive `PLATFORM_OWNER`;
- signup, provider claims, and organization roles cannot infer it;
- guarded bootstrap/recovery works and is audited;
- `/admin` exists with authorization at every layer;
- global workflow state is visible across implemented MVP domains;
- activity pages distinguish state from recorded events;
- high-value real mutations produce minimal atomic audit events;
- only approved owner mutations exist with policy, confirmation, transaction,
  audit, and regression coverage;
- ordinary role routes preserve Phase 6 authorization;
- sensitive content remains excluded unless approved;
- revocation, suspension, final-owner, and recovery behavior are verified;
- reset, migration, seed, runtime, TypeScript, lint, build, DB, and diff checks
  pass;
- roadmap records Phase 7 deferred and Phase 8 private staging next;
- no Phase 7 matching implementation begins;
- human review approves Phase 6.6 before Phase 8 deployment.

