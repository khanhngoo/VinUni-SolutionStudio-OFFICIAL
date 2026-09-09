# Challenge Write Path

Date: 2026-08-22
Phase: 4.4 Challenge Write Operations

## Scope

Phase 4.4 introduces the first runtime PostgreSQL writes for the challenge domain only. It adds a server-side challenge write service, low-level Drizzle mutation helpers, and a rollback-based verification script.

This phase does not implement application submissions, assessments, selections, offers, projects, matching, authentication, global RBAC, notifications, audit logging, migrations, schema changes, or seed changes.

Implemented modules:

- `src/db/mutations/challenges.ts`
- `src/db/mutations/index.ts`
- `src/services/challenge-write.service.ts`
- `scripts/verify-challenge-writes.ts`

Service APIs exported through `src/services/challenge.service.ts`:

- `getDevelopmentChallengeWriteActor(...)`
- `createChallengeDraft(...)`
- `updateChallengeDraft(...)`
- `submitChallengeForReview(...)`
- `recordChallengeReviewDecision(...)`
- `publishApprovedChallenge(...)`
- `replaceChallengeFacultyRouting(...)`

## Architecture

Challenge writes follow the same server-side layering as the Phase 4 read path:

```text
Next.js server boundary / verification script
        ↓
Challenge service
        ↓
Challenge mutation layer
        ↓
Drizzle
        ↓
PostgreSQL
```

React components do not import Drizzle, the `pg` pool, mutation helpers, or `DATABASE_URL`. Phase 4.4 intentionally does not connect the existing static partner submission form to database writes because the current UI flow is a client-local demo and real browser identity is deferred to Phase 6.

The repository does not currently include the `server-only` package, so Phase 4.4 enforces the boundary by placement and import direction rather than adding a dependency. The write service and mutation helpers are server-side modules and are not imported by client components.

## Development Actor Boundary

Real authentication belongs to Phase 6. Phase 4.4 therefore uses explicit development-only actors resolved from seeded users and organization memberships:

| Actor key | Seeded user | Purpose |
|---|---|---|
| `BENCANG_CONTACT_DEMO` | `contact.bencang.demo@example.test` | External partner owner/contact writes |
| `CAID_ADMIN_DEMO` | `caid.admin.dev@example.test` | CAID managing-unit review/publish/routing |
| `ELAB_ADMIN_DEMO` | `elab.admin.dev@example.test` | E-Lab owner/manager write and review path |

These actors are not browser sessions, not fake SSO users, and not a universal super-admin bypass. The service still evaluates organization membership IDs, membership status, role, challenge owner organization, challenge managing organization, and workflow state.

Phase 6 should replace the development actor lookup with authenticated identity and membership context while preserving the same service-level predicates.

## Authorization Rules

Owner-side writes are allowed only for active memberships in the challenge owner organization with one of:

- `ADMIN`
- `CONTACT_PERSON`

Managing-unit writes are allowed only for active memberships in the challenge managing organization with one of:

- `ADMIN`
- `PROJECT_MANAGER`
- `REVIEWER`

Authorization is never inferred from organization names, email domains, UI routes, or client-supplied roles.

CAID and E-Lab remain separate organization scopes. A CAID admin cannot manage an E-Lab-managed challenge unless they also have an active allowed membership in E-Lab, and the reverse is also true.

## Write Operations

`createChallengeDraft(...)` creates a challenge and its normalized child rows in one transaction:

- inserts `challenges`
- replaces initial `challenge_skills`
- replaces initial `challenge_eligibility_rules`
- sets initial status to `DRAFT`
- defaults visibility to `VINUNI_ONLY` when omitted
- defaults compensation type to `NOT_SPECIFIED` when omitted
- defaults the contact person to the actor in Phase 4.4

`updateChallengeDraft(...)` updates editable content only when the actor owns the challenge and the status is `DRAFT` or `REVISION_REQUESTED`. Skills and eligibility rules are replaced atomically when supplied.

`submitChallengeForReview(...)` moves an owner-owned challenge from `DRAFT` or `REVISION_REQUESTED` to `SUBMITTED`.

`recordChallengeReviewDecision(...)` inserts a durable `challenge_reviews` row and applies the reviewed lifecycle transition from `SUBMITTED` or `UNDER_REVIEW`.

`publishApprovedChallenge(...)` moves an approved challenge from `APPROVED` to `APPLICATIONS_OPEN`. Approval does not automatically publish.

`replaceChallengeFacultyRouting(...)` replaces challenge faculty routing assignments for a managing-unit actor. This remains challenge routing metadata and does not create project supervision records.

## Lifecycle

| Action | Required actor scope | Allowed source status | Result |
|---|---|---|---|
| Create draft | Owner organization | n/a | `DRAFT` |
| Update draft | Owner organization | `DRAFT`, `REVISION_REQUESTED` | unchanged |
| Submit for review | Owner organization | `DRAFT`, `REVISION_REQUESTED` | `SUBMITTED` |
| Approve review | Managing organization | `SUBMITTED`, `UNDER_REVIEW` | `APPROVED` + review row |
| Request revision | Managing organization | `SUBMITTED`, `UNDER_REVIEW` | `REVISION_REQUESTED` + review row |
| Reject review | Managing organization | `SUBMITTED`, `UNDER_REVIEW` | `CANCELLED` + review row |
| Publish | Managing organization | `APPROVED` | `APPLICATIONS_OPEN` |
| Replace faculty routing | Managing organization | any existing challenge status | status unchanged |

The frozen challenge status enum does not include a separate final `REJECTED` challenge status. Phase 4.4 maps a `REJECTED` challenge review decision to challenge status `CANCELLED` while preserving the review decision row.

## Validation

The service accepts business DTOs rather than raw database insert types. It validates deterministic user-facing rules before relying on database constraints.

Challenge content validation includes:

- required non-blank `title`, `summary`, and `description` for creation
- positive integer `durationWeeks`, `weeklyHours`, `teamSizeMin`, and `teamSizeMax` when supplied
- `teamSizeMax >= teamSizeMin`
- `startDate` uses `YYYY-MM-DD` date semantics when supplied
- `applicationDeadline <= startDate` when both are supplied
- slug generation/collision checks
- managing organization must be an `INTERNAL_UNIT`
- Phase 4.4 `contactPersonId`, if supplied, must be the actor

Skill validation includes:

- resolve by existing active canonical `skills.canonical_name`
- no automatic canonical skill, alias, relationship, candidate, or embedding creation
- no duplicate skill names in one requested skill set
- `weight` must be between `0` and `1` when supplied
- `REQUIRED` and `PREFERRED` requirement type is preserved from input

Eligibility validation includes:

- `MIN_GPA`: non-negative numeric `minGpa`, optional positive `scale`, and `minGpa <= scale` when scale exists
- `STUDY_YEAR`: non-empty array of positive integers
- `SCHOOL`: non-empty array of strings
- `MAJOR`: non-empty array of strings
- `AVAILABLE_HOURS`: positive numeric `availableHours`
- `MAX_ACTIVE_PROJECTS`: non-negative integer `maxActiveProjects`

Malformed eligibility JSON is rejected rather than silently repaired.

## Transactions And Rollback

All service write operations run inside a transaction by default. When a caller supplies an existing transaction, the service reuses it so multi-step verification and future server workflows can remain atomic.

The mutation helpers are intentionally narrow:

- insert one challenge
- update editable challenge fields
- update status with expected-source-status protection
- replace all challenge skills for a challenge
- replace all challenge eligibility rules for a challenge
- insert one challenge review
- replace all faculty routing assignments for a challenge

The replacement helpers are designed to be called after validation and inside the service transaction so invalid skill/rule input cannot leave partial normalized children behind.

`scripts/verify-challenge-writes.ts` exercises successful and failing write paths inside one explicit transaction and then throws a sentinel rollback. It verifies that Phase 3 compact seed row counts remain unchanged after the test.

## Error Model

Challenge writes throw `ChallengeWriteError` with stable error codes:

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `FORBIDDEN`
- `INVALID_TRANSITION`
- `CONFLICT`

This is intentionally service-level and UI-safe. A future route handler or server action can map these codes to form messages, HTTP statuses, or structured action results without parsing database errors.

## Read-After-Write And Caching

The Phase 4.3 marketplace routes use dynamic request-time reads. Once a Phase 4.4 write commits a challenge into a marketplace-visible status such as `APPLICATIONS_OPEN`, the existing read path can observe it on the next request.

Phase 4.4 does not add explicit cache revalidation because the migrated `/challenges` and `/challenges/[id]` routes already use dynamic rendering. If later pages introduce cached challenge reads, their mutation boundary must add explicit invalidation.

## Deferred Items

Deferred by design:

- wiring the current static partner post flow to database writes
- challenge edit/review UI forms
- route handlers or server actions
- authenticated sessions and global RBAC
- application submission writes
- assessment attempt writes
- selection, offer, agreement, project, and workspace writes
- matching outputs and semantic skill expansion
- audit log and notification records
- challenge deletion or archive workflows beyond the existing status transitions

The current service boundary is intended to be the future server action or route-handler dependency once Phase 6 supplies authenticated actor context.

## Verification Summary

Phase 4.4 verification covers:

- successful Bến Cảng-owned / CAID-managed draft creation
- validation failure without persistence
- unrelated owner denial
- draft update and atomic skill replacement
- unknown skill rollback
- draft submission
- invalid repeated submit transition
- owner review denial
- CAID approval and explicit publish
- faculty routing replacement by CAID
- faculty routing denial for owner actor
- slug collision handling
- E-Lab owner/manager write path
- CAID denial for E-Lab-managed challenge
- E-Lab revision request
- durable challenge review insertion inside the transaction
- unchanged Phase 3 compact seed counts after rollback

## Pre-Phase-7 Integration Closure — Cluster D (browser integration)

Date: 2026-08-25

Cluster D connects the Phase 4.4 write service described above to the real
Phase 6 authenticated actor and to a browser UI. It does not change any
function signature, authorization rule, or lifecycle transition documented
earlier in this file — it only adds callers.

**Actor adapter.** `toChallengeWriteActorContext(actor: AuthenticatedActor)`
(added to `src/services/challenge-write.service.ts`) maps the real Phase 6
session actor (`@/auth/authenticated-actor`) into the existing
`ChallengeWriteActorContext` shape, mirroring `toApplicationActorContext` in
`src/services/application.service.ts`. The browser runtime (`/partner/post`,
`/partner/challenges/[id]`, `/review/**`) uses this adapter exclusively;
`getDevelopmentChallengeWriteActor` remains untouched and is used only by
rollback verifier scripts (`scripts/verify-challenge-writes.ts`,
`scripts/verify-partner-post-flow.ts`).

**Owner/managing organization resolution.** The owner organization is never
browser input: `/partner/post`'s server action re-resolves the actor via
`getAuthenticatedActor()`, requires the `PARTNER_REPRESENTATIVE` capability,
and resolves the exact owner organization through the existing
`resolvePartnerOrganization` (`src/services/partner.service.ts`). The
managing organization is an explicit, required form selection among real
`INTERNAL_UNIT` organizations read from PostgreSQL
(`listInternalUnitOrganizations` in `src/db/queries/review.ts`) — there is no
default/automatic routing rule, and `createChallengeDraft`'s existing
`managingOrganization.organizationType === "INTERNAL_UNIT"` check remains
the authoritative validation. Managing organization is fixed after draft
creation; no reassignment UI or service semantics were added.

**Canonical skill authoring.** `listActiveCanonicalSkills`
(`src/db/queries/skills.ts`) is a new UI-safe read of the frozen canonical
taxonomy (canonical name, category name, internal id for plumbing only — no
embeddings). The shared `SkillPicker` component
(`src/components/challenge/skill-picker.tsx`) lets an authoring form check
existing skills and mark each REQUIRED/PREFERRED; there is no free-text
skill input anywhere. The selection is submitted as the existing
`ChallengeSkillWriteInput[]` DTO shape and re-validated/normalized entirely
by `createChallengeDraft`/`updateChallengeDraft` — the browser is never
authoritative over canonical skill identity.

**New browser surfaces.**

- `/partner/post` — real challenge-authoring form, backed by
  `createChallengeDraft`. Produces a `DRAFT` only; never auto-submits.
- `/partner/challenges/[id]` — extended (not replaced) to add DRAFT/
  REVISION_REQUESTED editing (`updateChallengeDraft` + skill replacement)
  and submission (`submitChallengeForReview`), plus read-only review history
  from `challenge_reviews`.
- `/review` and `/review/[slug]` (new) — one generic internal-unit review
  runtime. The queue (`src/services/review.service.ts`,
  `src/db/queries/review.ts`) scopes strictly to the actor's own active
  `INTERNAL_UNIT` organization memberships; the detail read is scoped by
  `managingOrganizationId` the same way `getOwnedChallengeDetail` scopes by
  `ownerOrganizationId` for partners, so a slug managed by an unrelated
  internal unit resolves to `null` → `notFound()`, not a leak. Review
  decisions (`recordChallengeReviewDecision`) and explicit publish
  (`publishApprovedChallenge`) are separate actions; approval never
  auto-publishes.

**Authorization remains layered.** Every `/partner/post`, `/partner/
challenges/[id]`, and `/review/**` page and server action independently
re-resolves `getAuthenticatedActor()` and re-checks the relevant capability
(`PARTNER_REPRESENTATIVE` or `INTERNAL_UNIT_MEMBER`) before any sensitive
read or write — optional layout gates (`ReviewLayout`, `PartnerLayout`) are
defense-in-depth, never the sole boundary. Resource-scoped organization
authorization (`assertOwnerCanWrite`, `assertManagingCanWrite`) inside
`challenge-write.service.ts` remains the sole authority for whether a given
actor may write a given challenge.

**Verification.** `scripts/verify-partner-post-flow.ts` adds the
Cluster D-specific assertions inside one rollback transaction: explicit
managing-unit selection with normalized `challenge_skills`, cross-unit
review denial in both directions (CAID/E-Lab), unknown/duplicate canonical
skill rejection with no partial writes, and the full
submit → revision-requested → edit → resubmit lifecycle. A full Playwright
browser run additionally exercised the same flow end-to-end and confirmed
canonical database state matched the UI at every step; see
`context/post-phase-6-e2e-audit-report.md`'s Cluster D section for the full
run log.

The rollback verifier leaves `challenges`, `challenge_skills`, `challenge_eligibility_rules`, `challenge_faculty_assignments`, `challenge_reviews`, applications, assessments, selections, offers, projects, and matching tables unchanged.
