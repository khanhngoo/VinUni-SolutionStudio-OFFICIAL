# Application Runtime Path

Date: 2026-08-22
Phase: 5.1 Applications

## Scope

Phase 5.1 establishes the PostgreSQL-backed runtime boundary for applications and team applications. It adds application read queries, application mutation helpers, application service/policy logic, and rollback verification.

## Post-Phase-6 Apply-flow integration

The `/challenges/[slug]/apply` route now consumes the Phase 5.1 runtime boundary.
It redirects anonymous requests to sign-in, requires the server-resolved `STUDENT`
capability, detects an existing application with `getMyApplicationForChallenge`, and
submits through `createApplication` from a server action. The browser supplies only
application content and teammate email addresses; the service derives the submitting
leader from the authenticated actor and enforces availability, eligibility, team,
deadline, and duplicate-application rules. The old static team wizard, draft control,
and invitation-response presentation are not part of this runtime route.

This phase does not migrate assessment submission, offer response, agreement acceptance, project/workspace writes, matching, authentication, global RBAC, notifications, audit logs, schema, migrations, or seed behavior.

Implemented modules:

- `src/db/queries/applications.ts`
- `src/db/mutations/applications.ts`
- `src/services/application-policy.ts`
- `src/services/application.service.ts`
- `scripts/verify-application-runtime.ts`

## Architecture

Application runtime follows the same server-side pattern as Phase 4:

```text
Next.js server boundary / verification script
        ↓
Application service
        ↓
Application query / mutation layer
        ↓
Drizzle
        ↓
PostgreSQL
```

React components do not import application mutation helpers, Drizzle, the PostgreSQL pool, or `DATABASE_URL`.

Phase 5.1 intentionally does not migrate the existing static application UI routes because those screens currently mix application state with assessment, offer, project, meeting, milestone, and workspace fixtures. The server-side application boundary is ready for future route/server-action wiring once each downstream Phase 5 checkpoint is migrated.

## Read APIs

Query module APIs:

- `listApplicationsForStudent(database, studentUserId)`
- `listApplicationsForChallenge(database, challengeSlug)`
- `getApplicationByPublicId(database, publicId)`
- `getApplicationByChallengeAndStudent(database, challengeSlug, studentUserId)`
- `countApplicationsForChallenge(database, challengeId)`

Service APIs:

- `getDevelopmentApplicationActor(...)`
- `listMyApplications(actor, options?)`
- `getApplicationDetail(publicId, actor, options?)`
- `listChallengeApplications(challengeSlug, actor, options?)`
- `getMyApplicationForChallenge(challengeSlug, actor, options?)`
- `createApplication(input, actor, options?)`

Read models expose browser-safe public application IDs and challenge slugs/public IDs. Internal bigint IDs remain inside query/service internals for authorization and relational joins.

Application detail reads include:

- application public ID, status, timestamps, team name
- challenge summary fields and owner/managing organization names
- submitted-by display name
- normalized application members
- member role/status/preferred role/commitment fields
- supervision-request summary
- assessment summary when existing seeded assessment attempts are present
- selection/offer summary when existing seeded downstream records are present
- project summary when an existing project exists

The read model does not pull full workspace, milestone, resource, agreement, or assessment-response payloads into application detail.

## Static Runtime Audit

Current static application-related routes remain intentionally unmigrated in Phase 5.1:

| Area | Current source | Phase 5.1 classification |
|---|---|---|
| `/challenges/[id]/apply` | Phase 5.1 service + authenticated actor | MIGRATED post-Phase-6 |
| `/workspace` | `src/lib/data/applications`, `src/lib/workspace` | DEFER until application UI adapter and workspace phases |
| `/workspace/[applicationId]` | static application/project records | DEFER to project/workspace phases |
| `/assessment/**` | static application + assessment state | DEFER to Phase 5.2 |
| `/offer/**` | static offer state | DEFER to Phase 5.3 |
| `/faculty/**` | static supervision/project queues | DEFER until application/faculty read UI checkpoint is explicitly scoped |
| `/partner/**` application boards | static provider applications + projects | DEFER until partner application/project reads are explicitly scoped |

No static fixture file was deleted. Remaining static references are expected until later Phase 5 route migrations.

## Temporary Actor Context

Real authentication remains Phase 6. Phase 5.1 uses explicit development-only actors resolved from seeded users:

| Actor key | Seeded user | Purpose |
|---|---|---|
| `JORDAN_STUDENT_DEMO` | `student.jordan-lee.demo@example.test` | Student application read/write verification |
| `PRIYA_STUDENT_DEMO` | `student.priya-raman.demo@example.test` | Team member access and eligibility tests |
| `HOANG_STUDENT_DEMO` | `student.hoang-tran.demo@example.test` | Unrelated-student denial test |
| `BAO_STUDENT_DEMO` | `student.bao-tran.demo@example.test` | Solo application creation test |
| `BENCANG_CONTACT_DEMO` | `contact.bencang.demo@example.test` | Owner-organization application reads |
| `CAID_ADMIN_DEMO` | `caid.admin.dev@example.test` | Managing-unit application reads |
| `ELAB_ADMIN_DEMO` | `elab.admin.dev@example.test` | Cross-unit denial test |

These actors are not browser sessions, not SSO, and not production RBAC.

## Access Policy

Student access:

- A student can list their own applications.
- A student can read an application detail only when they are an application member.

Owner organization access:

- Active owner-organization members with `ADMIN` or `CONTACT_PERSON` can list/read applications for challenges owned by that organization.

Managing organization access:

- Active managing-organization members with `ADMIN`, `PROJECT_MANAGER`, or `REVIEWER` can list/read applications for challenges managed by that organization.

Authority is never inferred from display names, email domains, route paths, or client-supplied roles.

## Solo And Team Representation

Production keeps one normalized application model:

```text
applications
        ↓
application_members
```

A solo application is one `applications` row plus one accepted `LEADER` member.

A team application is one `applications` row plus multiple `application_members`.

Phase 5.1 does not reintroduce `applications.student_id` and does not create separate `solo_applications`, `team_applications`, or `provider_applications` tables.

## Submission Policy

The frozen application enum has no `DRAFT`, so Phase 5.1 application creation validates everything first and inserts the application directly as:

```text
applications.status = SUBMITTED
```

Creation transaction:

```text
validate actor/challenge/team
        ↓
insert applications
        ↓
insert accepted leader member
        ↓
insert accepted/invited member rows
        ↓
read back normalized detail
```

The server determines `submitted_by` from the actor context. Client input cannot specify `submitted_by`, authoritative student actor, inviter actor, or internal student/user IDs.

## Team Invariants

Service validation enforces:

- the submitting actor must be a student
- exactly one leader is created
- the leader is the submitting actor
- the leader is always `ACCEPTED`
- non-leader creation statuses are limited to `ACCEPTED` or `INVITED`
- duplicate member emails are rejected before persistence
- the submitting actor cannot also be supplied as a member
- all member emails must resolve to existing `student_profiles`
- team applications with more than one member require a team name
- committed hours, when supplied, must be an integer between 1 and 168

The database also enforces at most one leader per application and no duplicate `(application_id, student_id)` member rows.

## Team Size Policy

Phase 5.1 counts the accepted leader plus all non-leader `ACCEPTED` and `INVITED` members toward challenge team-size bounds.

This preserves the reviewed production seed behavior where `app-route` is an authoritative submitted/selected application while Minh Anh Nguyen remains `INVITED`.

`DECLINED` and `REMOVED` members are not created by the Phase 5.1 submission API.

## Challenge Availability And Deadline

Application creation is allowed only when:

```text
challenge.status = APPLICATIONS_OPEN
```

The service rejects submissions after `challenges.application_deadline` using server-side time. The service accepts an optional `now` value for deterministic verification; production callers should rely on the server clock unless a tested clock abstraction is introduced.

## Duplicate Application Policy

Phase 5.1 rejects a proposed submission when any proposed member already belongs to another non-terminal application for the same challenge.

Terminal statuses excluded from duplicate blocking:

- `WITHDRAWN`
- `REJECTED`

This avoids a simplistic `(challenge, submitted_by)` rule that would miss team membership while still allowing future review of narrower lifecycle policy.

## Eligibility Policy

Phase 5.1 reuses the Phase 4.2 `evaluateChallengeEligibility(...)` helper for the submitting leader.

Policy:

- `INELIGIBLE` blocks submission.
- `UNKNOWN` does not block submission.
- `ELIGIBLE` allows submission.

This preserves Phase 4.2 semantics where missing/incompatible data produces `UNKNOWN` rather than silent rejection.

Eligibility is currently evaluated for the submitting leader only. Expanding hard-gate checks to every invited/accepted proposed teammate requires a separate product decision.

## Availability And Narrative Fields

`student_profiles.available_hours_per_week` remains general student availability.

`application_members.committed_hours_per_week` stores explicit per-application commitment only when supplied.

`applications.motivation` stores the submitted motivation.

`applications.relevant_experience` stores optional applicant/team narrative when supplied.

No data is copied from profile bios, challenge descriptions, project briefs, or transcript fixtures into application narrative fields.

`application_projects` remains unused in Phase 5.1 because structured student-project evidence conversion is still deferred.

## Lifecycle Boundaries

Phase 5.1 implements only the application submission creation transition:

```text
new application submission -> SUBMITTED
```

It does not implement:

- assessment transitions
- shortlist/selection transitions
- offer transitions
- project provisioning
- withdrawal
- leader transfer
- invitation response mutation
- supervision-request mutation

Existing seeded downstream records may be read as summaries when already present.

## Transactions And Errors

Application creation is transactional. If any application or member insert fails, the operation rolls back.

Application errors use stable service codes:

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `FORBIDDEN`
- `INVALID_TRANSITION`
- `CONFLICT`

Raw PostgreSQL errors are not intended to be exposed to UI callers.

## Verification Summary

`scripts/verify-application-runtime.ts` verifies:

- baseline application counts and status distribution
- `app-triage` solo rejected scenario
- `app-route` team plus pending invite plus pending offer summary
- `app-churn` reviewed assessment summary
- `app-outreach` pending supervision request summary
- `app-supply` active project summary
- student member access
- unrelated student denial
- owner-organization access
- managing-organization access
- CAID/E-Lab cross-unit denial
- current-student challenge lookup
- closed challenge rejection
- deadline rejection with controlled clock
- eligibility hard failure
- below/within/above team-size policy
- duplicate member rejection
- duplicate challenge application rejection
- valid team creation
- valid solo creation through transaction-local team-size adjustment
- rollback preservation of canonical Phase 3 counts
- no assessment, offer, project, or matching write leakage

After verification, canonical counts remain:

```text
applications = 8
application_members = 18
application_projects = 0
supervision_requests = 1
assessments = 2
assessment_attempts = 2
assessment_scores = 2
assessment_responses = 0
selections = 5
offers = 5
agreements = 5
projects = 4
match_results = 0
```

## Deferred Items

Deferred by design:

- application UI route migration
- server actions/route handlers for browser submissions
- invitation response mutation
- withdrawal mutation
- supervision-request mutation
- structured `application_projects` evidence linking
- assessment writes
- selection/offer/agreement writes
- project/workspace writes
- auth/session/RBAC integration
- matching and semantic eligibility expansion
- notification/audit side effects

The Phase 5.1 service boundary is the future dependency for server actions or route handlers once UI/auth checkpoints are explicitly scoped.
