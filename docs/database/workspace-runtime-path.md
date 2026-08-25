# Workspace Runtime Path

Date: 2026-08-22
Phase: 5.4 Workspace

## Scope

Phase 5.4 replaces the migrated `/workspace` and `/workspace/[applicationId]`
read paths with normalized PostgreSQL project state:

```text
Browser / Next.js server component
        ↓
Workspace service
        ↓
Project query layer
        ↓
Drizzle → PostgreSQL
```

Implemented modules:

- `src/db/queries/projects.ts`
- `src/services/workspace.service.ts`
- `src/lib/workspace-development.ts`
- `scripts/verify-workspace-runtime.ts`

There are no workspace mutations in this phase. The former local deliverable
submission success simulation was removed; storage-backed deliverable submission
and milestone transitions require a later, explicitly defined write scope.

## Read Model

`projects.application_id` is the project origin. The project query resolves
challenge information through `project -> application -> challenge`; it does
not recreate a project-level challenge foreign key. It separately loads project
members, milestones, deliverables, latest review per review role, and resources
to avoid a Cartesian aggregate.

`project_members` is the sole workspace-member source. A project is never
inferred from an application alone: the canonical seed retains `app-route` as
an accepted-selection pending offer with no project. `faculty_supervisor_id` is
the active supervision authority; challenge assignments and supervision requests
do not grant workspace access.

Milestone completion is read from the frozen statuses. `OVERDUE` is derived by
the UI from deadline/status and is never persisted. Formal approval evidence
comes only from `milestone_reviews`; the detail view exposes the latest faculty
and partner decisions separately from generic feedback.

## Access And Resources

Before Phase 6, routes resolve the explicit server-only Jordan Lee development
viewer in `src/lib/workspace-development.ts`. Service policy permits a student
only when they are in `project_members`; it also supports the authoritative
faculty supervisor, active owner-organization contacts/admins/reviewers, and
active managing-organization admins/project managers/reviewers for the current
workspace flow. This is not global RBAC.

For student resource access, `requires_agreement` is checked against an accepted,
unrevoked agreement for the same application/challenge/user. Resource metadata
does not serialize storage keys or external URLs, and this phase never creates
agreements. Supervisory/authorized organization views retain their workspace
access; object retrieval remains outside this phase.

## UI And Verification

The hub lists only accessible projects and uses browser-safe application public
IDs. The detail route renders normalized members, milestones, deliverables,
review evidence, and resources; it has no static workspace fixture authority.
Meetings and feedback are not rendered because there is no Phase 5.4 normalized
workspace runtime requirement for them.

`scripts/verify-workspace-runtime.ts` verifies the canonical `app-supply`,
`app-energy`, `app-archive`, `papp-depot`, and `app-route` scenarios, project
member and supervisor policy, unrelated-student denial, review/resource
invariants, absence of persisted `OVERDUE`, and canonical count preservation.
