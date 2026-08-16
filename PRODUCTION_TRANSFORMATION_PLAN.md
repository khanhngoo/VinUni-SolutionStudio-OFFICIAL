# VinUni Solution Studio — Production Transformation Plan

**Repository:** `VinUni-SolutionStudio-OFFICIAL`  
**Project:** VinUniversity Solution Studio / AI-in-Action Platform  
**Last updated:** 2026-08-16  
**Current phase:** Phase 3 — Seed Transformation

---

## 1. Purpose

This document tracks the transformation of the current static Next.js MVP into a production-ready platform.

The development strategy is intentionally incremental:

```text
Static MVP
   ↓
Production database foundation
   ↓
Audit existing MVP data/workflows
   +
Verify canonical ERD
   ↓
Reconcile MVP ↔ ERD
   ↓
Freeze implementation-ready ERD v1
   ↓
ERD v1 → Drizzle schema → migrations
   ↓
Database-backed features
   ↓
Authentication + RBAC
   ↓
AI matching
   ↓
Production deployment
```

The **canonical ERD stored at `docs/database/schema.dbml`** should be treated as the design source of truth for the production database schema.

The current static MVP is still important: its pages, components, mock types, queries, filters, eligibility logic, and pipeline logic should be audited so useful UI requirements and business rules can be preserved. However, `src/lib/data` and `src/lib/types.ts` **must not automatically define the production database schema**.

Phase 2 therefore reconciles the existing implementation with the ERD before any production Drizzle tables are finalized. Static data is transformed into seed data only after this reconciliation is complete.

---

# 2. Baseline Architecture

## Current development stack

```text
Browser
   ↓
Next.js + TypeScript
   ↓
Drizzle ORM
   ↓
node-postgres (`pg`)
   ↓
localhost:5432
   ↓
OrbStack / Docker
   ↓
PostgreSQL 18 + pgvector
```

## Planned production database stack

- Next.js + TypeScript
- Drizzle ORM
- Drizzle Kit
- node-postgres (`pg`)
- PostgreSQL
- pgvector
- Managed PostgreSQL for production
- Object storage later for uploaded files such as CVs, PDFs, images, portfolios, and attachments

---

# 3. Current Repository Direction

Expected structure as the production transformation proceeds:

```text
VinUni-SolutionStudio-OFFICIAL/
│
├── docs/
│   └── database/
│       ├── schema.dbml          # canonical architectural ERD
│       └── README.md            # database design/reconciliation notes
│
├── docker-compose.yml
├── drizzle.config.ts
├── .env
├── .env.example
│
├── drizzle/
│   └── migrations...
│
├── scripts/
│   └── db-check.ts
│
├── src/
│   ├── app/
│   ├── components/
│   │
│   ├── db/
│   │   ├── index.ts
│   │   ├── schema/
│   │   ├── queries/
│   │   └── seed.ts
│   │
│   ├── services/
│   │
│   └── lib/
│       ├── data/        # temporary static/mock data
│       ├── queries.ts   # gradually replaced
│       ├── types.ts
│       └── ...
│
└── ...
```

---

# 4. Phase Status Overview

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Database infrastructure | ✅ Complete |
| Phase 2 | Audit MVP + reconcile with ERD → Drizzle schema + migrations | ✅ Complete |
| Phase 3 | Reconciled static mock data → production-valid database seed | 🚧 In progress |
| Phase 4 | Challenge marketplace → real DB | ⬜ Not started |
| Phase 5 | Applications, assessments, offers, workspace → real DB | ⬜ Not started |
| Phase 6 | Authentication + RBAC | ⬜ Not started |
| Phase 7 | Skill + semantic matching | ⬜ Not started |
| Phase 8 | Production deployment | ⬜ Not started |

---

# 5. Phase 1 — Database Infrastructure

## Goal

Establish a reproducible local database environment without changing the static MVP behavior.

## Completed checklist

- [x] Install and configure OrbStack
- [x] Verify Docker CLI
- [x] Verify Docker Compose
- [x] Add PostgreSQL + pgvector Docker Compose service
- [x] Configure persistent PostgreSQL Docker volume
- [x] Start PostgreSQL container successfully
- [x] Verify PostgreSQL container health
- [x] Verify `solution_studio` database exists
- [x] Verify pgvector is available in PostgreSQL image
- [x] Install `drizzle-orm`
- [x] Install `drizzle-kit`
- [x] Install `pg`
- [x] Install `@types/pg`
- [x] Install `dotenv`
- [x] Install `tsx`
- [x] Configure pnpm build permission required by `esbuild`
- [x] Configure `.env` / `DATABASE_URL`
- [x] Add Drizzle database connection layer
- [x] Add `scripts/db-check.ts`
- [x] Successfully connect through Drizzle → node-postgres → PostgreSQL
- [x] Preserve existing static MVP architecture

## Verified state

Database connection test:

```text
database: solution_studio
PostgreSQL: 18.4
architecture: aarch64
```

Docker service:

```text
vinuni-solution-studio-db
image: pgvector/pgvector:pg18
status: healthy
port: 5432
```

## Exit criteria

**Phase 1 complete.**

---

# 6. Phase 2 — Audit MVP, Reconcile ERD, and Build Drizzle Schema

## Goal

Produce an **implementation-ready ERD v1** by reconciling the existing static MVP with the canonical DBML design, then translate that ERD into a version-controlled Drizzle/PostgreSQL schema.

The authority order for this phase is:

```text
1. docs/database/schema.dbml
      ↓
   intended production architecture

2. Existing static MVP implementation
      ↓
   UI requirements + workflows + useful business rules

3. src/db/schema/*.ts
      ↓
   executable PostgreSQL/Drizzle representation

4. drizzle/*.sql
      ↓
   migration history
```

The ERD remains the production design source of truth. Existing mock objects may reveal missing requirements, but they must not silently override or denormalize the ERD.

## Phase 2 checkpoint status

- Phase 2.0: COMPLETE. Static MVP audit created at `docs/database/mvp-data-model-audit.md`.
- Phase 2.1: COMPLETE. ERD implementation-readiness review completed.
- Phase 2.2: COMPLETE. MVP to ERD reconciliation completed at `docs/database/mvp-erd-reconciliation.md`.
- Phase 2.3: COMPLETE. ERD v1 reviewed and FROZEN in `docs/database/schema.dbml`.
- Phase 2.4: COMPLETE. Modular Drizzle schema organization implemented under `src/db/schema/**`.
- Phase 2.5: COMPLETE. Frozen ERD v1 translated into Drizzle tables/enums.
- Phase 2.6: COMPLETE. Approved constraints, partial unique indexes, CHECK constraints, and query indexes implemented.
- Phase 2.7: COMPLETE. pgvector extension strategy documented and implemented through the Phase 2.8 migration.
- Phase 2.8: COMPLETE. Initial migration generated, reviewed, applied, and verified against a fresh PostgreSQL database.

ERD v1 is frozen. Future structural database changes require a new reviewed schema change rather than silently editing the frozen model.

---

## 2.0 Repository preparation and static MVP audit

### 2.0.1 Store the canonical ERD in the repository

- [x] Create `docs/database/`
- [x] Save the latest dbdiagram.io/DBML definition as `docs/database/schema.dbml`
- [x] Add `docs/database/README.md` for implementation decisions and reconciliation notes
- [x] Update `AGENTS.md` so coding agents are explicitly instructed to read `docs/database/schema.dbml` before database work
- [x] Document that `src/lib/data` and `src/lib/types.ts` are temporary MVP representations, not production schema authority

### 2.0.2 Perform a read-only audit of the current MVP

The first agent task in Phase 2 should **analyze but not modify** the implementation.

Review:

```text
src/app/**
src/components/**
src/lib/data/**
src/lib/types.ts
src/lib/queries.ts
src/lib/eligibility.ts
src/lib/filters.ts
src/lib/pipeline.ts
```

Audit these feature areas:

- [x] Challenge marketplace
- [x] Challenge detail/apply flow
- [x] Student-facing views
- [x] Faculty-facing views
- [x] Partner-facing views
- [x] Assessment flow
- [x] Offer/selection flow
- [x] Workspace/project flow
- [x] Shared filters/query helpers
- [x] Eligibility logic
- [x] Pipeline/status logic

For every major feature, identify:

- [x] Current mock entities
- [x] Current fields
- [x] Current relationships
- [x] Current status/state values
- [x] User-entered fields
- [x] Derived/display-only fields
- [x] Existing business rules
- [x] Existing filtering/sorting assumptions
- [x] Existing lifecycle transitions
- [x] UI-required information that is not currently represented in the ERD

### 2.0.3 Produce an MVP inventory

The audit should produce a written inventory rather than immediate code changes.

Recommended artifact:

```text
docs/database/mvp-data-model-audit.md
```

For each feature, document:

```text
Feature
Current source file(s)
Current entity/type
Fields consumed by UI
Derived fields
Relationships
Business rules
Status/lifecycle assumptions
Potential ERD mapping
Open questions
```

### Phase 2.0 exit criteria

- [x] Canonical ERD exists in the repository
- [x] Agent guidance points to the canonical ERD
- [x] Existing MVP data/workflow assumptions are documented
- [x] No Drizzle production schema has been generated from mock types prematurely

---

## 2.1 Reconfirm and review the latest ERD

The latest approved DBML has already been recovered. The task is now to verify and refine it for PostgreSQL implementation.

- [x] Recover the latest approved dbdiagram.io schema
- [x] Verify all tables
- [x] Verify all fields
- [x] Verify primary keys
- [x] Verify foreign keys
- [x] Verify nullable vs required fields
- [x] Verify `1:1`, `1:N`, `N:M`, `0..1`, and `0..N` relationships
- [x] Verify status/state fields
- [x] Verify timestamps
- [x] Verify organization ownership model
- [x] Verify CAID and E-Lab administration model
- [x] Verify partner/contact-person model
- [x] Verify student/faculty profile structure
- [x] Verify challenge lifecycle
- [x] Verify application lifecycle
- [x] Verify selection/offer lifecycle
- [x] Verify project lifecycle
- [x] Verify skill taxonomy and normalization model
- [x] Verify assessment model
- [x] Verify matching-result model
- [x] Verify governance tables: consent, notifications, audit logs
- [x] Identify fields that should use PostgreSQL enums
- [x] Identify fields that should use `JSONB`
- [x] Identify future vector columns without implementing ranking logic yet
- [x] Identify URL/file fields that will later point to object storage rather than database blobs

### PostgreSQL implementation decisions to resolve

- [x] `timestamp` vs `timestamptz` strategy
- [x] `bigint` representation in TypeScript/Drizzle
- [x] `decimal/numeric` precision and scale
- [x] `varchar` length strategy
- [x] enum vs free-text decisions
- [x] `JSONB` candidates
- [x] default timestamps
- [x] `updated_at` update strategy
- [x] delete/update behavior for foreign keys
- [x] indexes required for ordinary relational queries
- [x] embedding/vector dimension strategy
- [x] uniqueness rules not explicit in the conceptual ERD

---

## 2.2 Reconcile the static MVP with the ERD

## Goal

Preserve useful implementation work without allowing the static model to dictate the production schema.

Create:

```text
docs/database/mvp-erd-reconciliation.md
```

For every relevant current entity/field, classify it as:

```text
KEEP
  Same concept maps cleanly to the ERD.

RENAME
  Same concept, but production naming differs.

NORMALIZE
  Static object embeds data that belongs in another table/relationship.

DERIVE
  Value should be queried/calculated rather than stored redundantly.

DROP
  Static-demo-only presentation/helper field.

REVIEW
  UI/workflow genuinely requires something that may be missing from the ERD.
```

Recommended reconciliation matrix:

| Current MVP entity/field | Current use | ERD target | Decision | Reason / transformation |
|---|---|---|---|---|
| Example: `challenge.company` | challenge card | `organizations.name` through `owner_organization_id` | DERIVE | Organization is relational |
| Example: `challenge.skills[]` | filters/cards | `challenge_skills` + `skills` | NORMALIZE | Many-to-many relational model |
| Example: `applicantCount` | marketplace display | `COUNT(applications)` | DERIVE | Avoid redundant counter initially |

Checklist:

- [x] Map every major mock entity to ERD table(s)
- [x] Map every UI-consumed field
- [x] Identify denormalized arrays/objects
- [x] Identify derived values
- [x] Identify presentation-only values
- [x] Identify naming differences
- [x] Identify status mismatches
- [x] Identify lifecycle mismatches
- [x] Identify business rules that should be preserved
- [x] Identify mock shortcuts that should be removed
- [x] Identify genuine UI/workflow requirements missing from ERD
- [x] Resolve each `REVIEW` item before freezing ERD v1

---

## 2.3 Freeze implementation-ready ERD v1

After the audit and reconciliation:

- [x] Update `docs/database/schema.dbml` with approved corrections
- [x] Resolve all high-priority reconciliation questions
- [x] Record significant design decisions in `docs/database/README.md`
- [x] Confirm no current UI requirement is unintentionally lost
- [x] Confirm no mock-only convenience structure is promoted into the DB without justification
- [x] Tag/document the ERD as implementation-ready v1

At this point:

```text
Static implementation ──┐
                        ▼
                   reconciliation
                        ▲
Canonical ERD ──────────┘
                        ↓
                 ERD v1 frozen
```

Only after this point should production Drizzle schema implementation begin.

---

## 2.4 Define Drizzle schema module organization

Target:

```text
src/db/schema/
├── enums.ts
├── users.ts
├── organizations.ts
├── skills.ts
├── challenges.ts
├── applications.ts
├── assessments.ts
├── matching.ts
├── projects.ts
├── governance.ts
└── index.ts
```

Notes:

- `index.ts` should primarily aggregate/export schema modules.
- Do not place the entire ERD into one giant `index.ts`.
- `offers.ts` should only exist if the final ERD contains a distinct offer entity; otherwise selection/invitation state should follow the finalized ERD.

Checklist:

- [x] Decide table grouping across schema files
- [x] Create PostgreSQL enums
- [x] Create shared timestamps/helpers if useful
- [x] Avoid circular schema imports
- [x] Export all tables/enums from `src/db/schema/index.ts`

---

## 2.5 Implement core tables

Implement according to the frozen ERD v1, module by module.

### Identity / profiles / consent

- [x] `users`
- [x] `student_profiles`
- [x] `faculty_profiles`
- [x] `consent_records`

### Organizations

- [x] `organizations`
- [x] `organization_memberships`

### Skills and student experience

- [x] `skill_categories`
- [x] `skills`
- [x] `skill_aliases`
- [x] `student_skills`
- [x] `student_projects`
- [x] `project_skills`
- [x] `project_evidence`
- [x] `skill_candidates`
- [x] `skill_relationships`

### Challenges

- [x] `challenges`
- [x] `challenge_eligibility_rules`
- [x] `challenge_skills`
- [x] `challenge_faculty_assignments`
- [x] `challenge_reviews`

### Applications / selection

- [x] `applications`
- [x] `application_members`
- [x] `application_projects`
- [x] `supervision_requests`
- [x] `selections`
- [x] `offers`
- [x] `agreements`

### Matching

- [x] `match_results`
- [x] `match_skill_details`
- [x] `match_experience_details`

### Assessments

- [x] `assessments`
- [x] `assessment_sections`
- [x] `assessment_questions`
- [x] `assessment_attempts`
- [x] `assessment_responses`
- [x] `assessment_scores`

### Active projects

- [x] `projects`
- [x] `project_members`
- [x] `milestones`
- [x] `deliverables`
- [x] `milestone_reviews`
- [x] `project_resources`
- [x] `feedback`

### Governance / system

- [x] `notifications`
- [x] `audit_logs`

---

## 2.6 Add constraints and indexes

- [x] Unique user email
- [x] Composite primary/unique keys for junction tables where appropriate
- [x] Required foreign keys
- [x] `ON DELETE` strategy for every relationship
- [x] `ON UPDATE` strategy where relevant
- [x] Database-level check constraints where useful
- [x] Appropriate timestamp defaults
- [x] Prevent impossible duplicate organization memberships
- [x] Define duplicate rules for student skills, including unnormalized skills
- [x] Prevent duplicate challenge skills where appropriate
- [x] Preserve duplicate-application prevention as a later service/transaction rule because applications are team submissions
- [x] Prevent duplicate project membership
- [x] Preserve match-result version/run duplicate policy for later matching-service design
- [x] Add indexes for common foreign-key/filter fields
- [x] Avoid speculative indexes that are not justified by expected queries

---

## 2.7 Enable pgvector through migration

- [x] Create version-controlled extension migration in Phase 2.8
- [x] Document required SQL:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

- [x] Verify extension exists after migration in Phase 2.8
- [x] Confirm ERD v1 has no conceptual `embedding text` placeholders and Drizzle adds no vector columns
- [x] Do not implement ranking logic in this phase
- [x] Do not add HNSW/IVFFlat indexes until Phase 7 unless an earlier measured requirement justifies them

---

## 2.8 Generate and verify initial migrations

- [x] Run `drizzle-kit generate`
- [x] Review generated SQL manually
- [x] Verify migration ordering
- [x] Apply migrations to the current local DB
- [x] Confirm Drizzle migration tracking works
- [x] Inspect created tables/constraints
- [x] Run application build/typecheck/lint as appropriate

### Fresh-database reproducibility test

Before completing Phase 2:

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate
```

Then verify:

- [x] Database initializes from zero
- [x] pgvector extension is enabled
- [x] All ERD tables exist
- [x] All expected constraints exist
- [x] No manual SQL step outside version-controlled migrations is required
- [x] `pnpm db:check` still passes

## Phase 2 exit criteria

Phase 2 is complete when:

- [x] Static MVP implementation has been audited
- [x] MVP ↔ ERD reconciliation is documented
- [x] All unresolved schema-impacting `REVIEW` items are resolved
- [x] ERD v1 is frozen and stored in the repository
- [x] ERD v1 is fully represented in modular Drizzle schema files
- [x] A fresh PostgreSQL database can be created entirely from migrations
- [x] Core relationships and constraints are verified
- [x] pgvector is enabled through a version-controlled migration
- [x] No production table structure depends accidentally on temporary static MVP fields

---

# 7. Phase 3 — Convert Reconciled Mock Data to Database Seed

## Goal

Transform useful demo records from the static MVP into a deterministic seed dataset that conforms to the frozen ERD v1.

Phase 3 should reuse the analysis produced in:

```text
docs/database/mvp-data-model-audit.md
docs/database/mvp-erd-reconciliation.md
docs/database/seed-transformation-plan.md
```

Do not re-design the schema from mock objects during seeding.

## Phase 3 checkpoint status

- Phase 3.0: COMPLETE. HUMAN REVIEW COMPLETE. Seed transformation design and approved review corrections recorded at `docs/database/seed-transformation-plan.md`.
- Phase 3.1: COMPLETE. Seed safety/context infrastructure, BOOTSTRAP data, and REFERENCE skill taxonomy implemented and verified.
- Phase 3.2: NEXT. Define the compact DEMO seed dataset and deterministic scenario records.

## 3.0 Design the seed transformation

- [x] Review the Phase 2 MVP inventory
- [x] Review the Phase 2 reconciliation matrix
- [x] Audit static fixture sources under `src/lib/data/**`
- [x] Classify proposed records as BOOTSTRAP, REFERENCE, or DEMO
- [x] Map static fixtures to normalized production tables
- [x] Identify derived/drop/deferred fixture fields
- [x] Define team-application transformation
- [x] Define lifecycle, selection, offer, assessment, project, milestone, organization, skill, and eligibility transformations
- [x] Define deterministic identity strategy
- [x] Define FK dependency/insertion order
- [x] Define seed idempotency/safety strategy
- [x] Recommend compact demo scenario coverage
- [x] Record REVIEW items requiring human decisions
- [x] Produce `docs/database/seed-transformation-plan.md`
- [x] Apply human review corrections before Phase 3.1

## 3.1 Prepare and implement bootstrap/reference seed infrastructure

- [x] Review the Phase 2 MVP inventory
- [x] Review the Phase 2 reconciliation matrix
- [x] Review the Phase 3.0 seed transformation plan
- [x] Implement seed safety guard
- [x] Implement deterministic seed key/context strategy
- [x] Implement BOOTSTRAP records
- [x] Implement REFERENCE skill categories/canonical skills/exact lexical aliases
- [x] Add `pnpm db:seed`
- [x] Verify all generated IDs/references are deterministic or reliably resolved
- [x] Verify Phase 3.1 seed records satisfy final constraints
- [x] Confirm no DEMO challenge/application/assessment/offer/project rows are seeded in Phase 3.1
- [x] Create reference taxonomy review artifact at `docs/database/reference-skill-seed.md`

## 3.2 Define seed dataset

Create deterministic development examples for:

- [ ] Select useful existing demo records to preserve
- [ ] Transform denormalized mock objects into normalized ERD records
- [ ] Supply ERD-required fields missing from current mocks with intentional development values
- [ ] Remove mock-only/presentation-only fields from persistence
- [ ] Preserve useful names/content that make the current demo recognizable
- [ ] CAID admin
- [ ] E-Lab admin
- [ ] Faculty
- [ ] Students
- [ ] Partner organizations
- [ ] Partner representatives/contact people
- [ ] Skills
- [ ] Student skills
- [ ] Challenges
- [ ] Challenge skill requirements
- [ ] Applications
- [ ] Assessments
- [ ] Offers
- [ ] Projects where applicable

## 3.3 Implement seeding

Target:

```text
src/db/seed.ts
```

Checklist:

- [ ] Make seed deterministic
- [ ] Make repeated seed execution safe where practical
- [ ] Preserve referential integrity
- [ ] Seed useful lifecycle states
- [ ] Add `pnpm db:seed`
- [ ] Test seed on fresh DB
- [ ] Verify seeded data through Drizzle Studio

## 3.4 Establish reset workflow

Expected local reset:

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

Checklist:

- [ ] Document reset command
- [ ] Confirm migration from zero works
- [ ] Confirm seed from zero works
- [ ] Confirm static UI can eventually display equivalent demo content

## Phase 3 exit criteria

- [ ] Development database can be recreated from zero
- [ ] Schema comes from migrations
- [ ] Demo content comes from seed
- [ ] Static mock objects are no longer the authoritative data source

---

# 8. Phase 4 — Move Challenge Marketplace to Real Database

## Goal

Make `/challenges` the first fully database-backed feature.

This should be the first production-data vertical slice.

## 4.1 Read path

- [ ] Implement `src/db/queries/challenges.ts`
- [ ] Query challenge list
- [ ] Query challenge details
- [ ] Query organization
- [ ] Query required skills
- [ ] Query relevant metadata/status
- [ ] Add pagination strategy
- [ ] Add filtering strategy
- [ ] Add sorting strategy

## 4.2 Business layer

- [ ] Create `challenge.service.ts`
- [ ] Separate DB access from business rules
- [ ] Define public/published challenge visibility
- [ ] Define admin/faculty visibility
- [ ] Define partner ownership rules

## 4.3 UI migration

- [ ] Replace challenge list mock query
- [ ] Replace challenge detail mock query
- [ ] Preserve current UI where possible
- [ ] Add loading state
- [ ] Add empty state
- [ ] Add database error handling
- [ ] Verify static and DB-backed visual behavior match

## 4.4 Write operations

When challenge creation/editing is introduced:

- [ ] Create challenge
- [ ] Update challenge
- [ ] Add/remove required skills
- [ ] Submit for review
- [ ] Approve/reject/revise workflow
- [ ] Validate writes server-side
- [ ] Use transactions for multi-table writes

## Phase 4 exit criteria

- [ ] Challenge marketplace no longer depends on `src/lib/data`
- [ ] Challenge reads come from PostgreSQL
- [ ] Core challenge writes are transaction-safe
- [ ] Business rules are outside React components

---

# 9. Phase 5 — Database-Back Applications, Assessments, Offers, Workspace

## Goal

Move the rest of the main workflow from static/mock state into PostgreSQL.

## 5.1 Applications

- [ ] Create application query module
- [ ] Create application service
- [ ] Submit application
- [ ] Prevent duplicate application
- [ ] Validate challenge availability
- [ ] Validate deadline
- [ ] Validate student eligibility
- [ ] Store application status history if required by ERD
- [ ] Query applications by student
- [ ] Query applications by challenge
- [ ] Query applications for faculty/partner/admin views

## 5.2 Assessments

- [ ] Persist assessment definitions
- [ ] Persist assessment attempts/submissions
- [ ] Persist scores/results
- [ ] Define attempt rules
- [ ] Define access rules
- [ ] Connect assessment status to application pipeline

## 5.3 Offers

- [ ] Persist offers
- [ ] Persist offer status
- [ ] Accept offer transaction
- [ ] Reject offer transaction
- [ ] Prevent conflicting states
- [ ] Create project/project membership when appropriate

## 5.4 Workspace

- [ ] Define workspace-backed entities
- [ ] Persist project membership
- [ ] Persist project status
- [ ] Persist relevant project metadata
- [ ] Replace workspace mock state
- [ ] Define visibility by role

## 5.5 Transaction boundaries

Identify workflows that require atomic transactions, for example:

```text
Accept offer
   ↓
update offer
   +
update application
   +
create project member
   +
update challenge capacity
```

Checklist:

- [ ] Define transaction boundaries
- [ ] Test rollback behavior
- [ ] Prevent partial lifecycle transitions

## Phase 5 exit criteria

- [ ] Main platform workflow is database-backed
- [ ] Applications are persistent
- [ ] Assessments are persistent
- [ ] Offers are persistent
- [ ] Workspace/project state is persistent
- [ ] Important multi-table operations are transactional

---

# 10. Phase 6 — Authentication + Role-Based Access Control

## Goal

Replace assumed/static user roles with real identity and authorization.

## 6.1 Authentication architecture

- [ ] Select authentication provider/strategy
- [ ] Determine VinUniversity SSO feasibility
- [ ] Define development authentication approach
- [ ] Define session strategy
- [ ] Map authentication identity → `users`

## 6.2 Roles

Expected roles to validate against ERD/business requirements:

- [ ] Student
- [ ] Faculty
- [ ] Partner representative
- [ ] CAID admin
- [ ] E-Lab admin
- [ ] Additional system/admin role if required

## 6.3 Authorization

- [ ] Centralize role checks
- [ ] Define permissions matrix
- [ ] Enforce authorization server-side
- [ ] Protect route handlers/server actions
- [ ] Protect database writes
- [ ] Prevent partner access to other organizations' private resources
- [ ] Ensure CAID/E-Lab ownership boundaries are respected
- [ ] Ensure students cannot access faculty/admin functions

## 6.4 Security baseline

- [ ] Secure cookies/session settings
- [ ] CSRF considerations
- [ ] Input validation
- [ ] Rate limiting plan
- [ ] Audit-sensitive operations
- [ ] Do not expose database credentials to browser
- [ ] Verify `.env` secrets are not committed

## Phase 6 exit criteria

- [ ] Real authentication works
- [ ] Users map correctly to database records
- [ ] RBAC is enforced server-side
- [ ] Unauthorized operations are blocked regardless of frontend UI state

---

# 11. Phase 7 — Skill + Semantic Matching

## Goal

Implement the AI-assisted candidate matching system after the relational workflow is stable.

## 7.1 Structured skill matching

- [ ] Finalize skill taxonomy
- [ ] Finalize student skill representation
- [ ] Finalize challenge skill requirements
- [ ] Define required vs preferred skills
- [ ] Define proficiency representation
- [ ] Define structured skill score formula
- [ ] Test score interpretation

## 7.2 Skill normalization

- [ ] Normalize case/spelling
- [ ] Handle aliases
- [ ] Handle unseen/new skills
- [ ] Define admin approval/merge flow if necessary
- [ ] Avoid expensive semantic lookup on every ordinary UI interaction

## 7.3 Embedding data model

Possible embedding targets:

- [ ] Student experiences
- [ ] Projects
- [ ] Challenge descriptions
- [ ] Skill descriptions if useful

Checklist:

- [ ] Select embedding model
- [ ] Record embedding model/version
- [ ] Choose vector dimension
- [ ] Add vector fields through migration
- [ ] Define re-embedding strategy
- [ ] Define stale embedding handling

## 7.4 pgvector

- [ ] Implement similarity query
- [ ] Select cosine/L2/inner-product metric
- [ ] Benchmark exact search first
- [ ] Add HNSW only when beneficial
- [ ] Tune index configuration based on measured workload
- [ ] Verify result quality

## 7.5 Ranking

Potential structure:

```text
Final candidate score
   =
structured skill score
   +
semantic experience score
   +
other approved eligibility/ranking factors
```

Checklist:

- [ ] Define score components
- [ ] Define weights
- [ ] Normalize score ranges
- [ ] Explain rankings to faculty/admin users
- [ ] Avoid opaque automated rejection
- [ ] Add evaluation dataset
- [ ] Measure ranking quality
- [ ] Test bias/fairness concerns
- [ ] Record matching model/version

## Phase 7 exit criteria

- [ ] Matching operates on real production-style DB records
- [ ] Structured and semantic scores are separately testable
- [ ] pgvector queries are indexed appropriately if required
- [ ] Rankings are explainable enough for human decision-making
- [ ] Matching does not replace authorization or eligibility validation

---

# 12. Phase 8 — Production Deployment

## Goal

Deploy a secure, recoverable, observable production system.

## 8.1 Production application

- [ ] Choose deployment platform
- [ ] Build production Next.js image/deployment
- [ ] Configure production environment variables
- [ ] Configure HTTPS
- [ ] Configure domain
- [ ] Configure health checks
- [ ] Configure logs

## 8.2 Managed PostgreSQL

- [ ] Select managed PostgreSQL provider
- [ ] Select supported PostgreSQL version
- [ ] Verify pgvector support
- [ ] Configure private/network-restricted access
- [ ] Configure SSL
- [ ] Configure production DB user permissions
- [ ] Configure connection pooling
- [ ] Configure backups
- [ ] Configure point-in-time recovery
- [ ] Configure monitoring
- [ ] Establish upgrade strategy

## 8.3 Migration deployment process

- [ ] Production migrations run separately from arbitrary app startup
- [ ] Review migrations before production
- [ ] Back up before destructive migrations
- [ ] Test migration in staging
- [ ] Define rollback/recovery procedure
- [ ] Never use `drizzle-kit push` against production

## 8.4 Staging

- [ ] Create staging environment
- [ ] Separate staging DB
- [ ] Separate staging secrets
- [ ] Run migrations before production
- [ ] Run end-to-end workflow tests

## 8.5 Object storage

When file uploads are introduced:

- [ ] Select S3-compatible storage
- [ ] Store files outside PostgreSQL
- [ ] Store file metadata/object keys in PostgreSQL
- [ ] Use signed upload/download URLs where appropriate
- [ ] Define file-size limits
- [ ] Define MIME/type restrictions
- [ ] Add malware/security review strategy if required
- [ ] Define deletion/retention policy

Likely objects:

```text
CVs
transcripts
portfolio documents
images
challenge attachments
project files
```

## 8.6 Observability

- [ ] Application error monitoring
- [ ] Database metrics
- [ ] Request logging
- [ ] Slow-query monitoring
- [ ] Resource monitoring
- [ ] Security/audit logging where required

## 8.7 Production security

- [ ] Secrets management
- [ ] Principle of least privilege
- [ ] Restricted DB networking
- [ ] Backup verification
- [ ] Dependency vulnerability checks
- [ ] Secure headers
- [ ] Rate limiting
- [ ] Abuse prevention
- [ ] Data retention rules
- [ ] Privacy review for student information

## Phase 8 exit criteria

- [ ] Production application deployed
- [ ] Production PostgreSQL deployed
- [ ] Backups tested
- [ ] Staging validation completed
- [ ] Authentication/RBAC verified
- [ ] Database migrations reproducible
- [ ] Monitoring enabled
- [ ] Recovery process documented

---

# 13. Latest Work Tracker

## Current status

**Current phase:** Phase 3 — Seed Transformation  
**Active next phase:** Phase 3.2 — define the compact DEMO seed dataset and deterministic scenario records

### Latest completed work

- Phase 2.0 static MVP audit created at `docs/database/mvp-data-model-audit.md`
- Phase 2.1 ERD implementation-readiness review completed
- Phase 2.2 MVP to ERD reconciliation completed at `docs/database/mvp-erd-reconciliation.md`
- Phase 2.3 ERD v1 reviewed and FROZEN in `docs/database/schema.dbml`
- Phase 2.4 Drizzle schema module organization implemented under `src/db/schema/**`
- Phase 2.5 frozen ERD v1 translated into 45 Drizzle PostgreSQL tables and 41 enums
- Phase 2.6 primary keys, foreign keys, unique constraints, partial unique indexes, CHECK constraints, and query indexes implemented
- Phase 2.7 pgvector extension strategy implemented through a version-controlled migration
- Phase 2.8 initial migration generated at `drizzle/0000_empty_gladiator.sql`
- `CREATE EXTENSION IF NOT EXISTS vector;` is included before schema objects in the initial migration
- Fresh database reproducibility verified with `docker compose down -v`, `docker compose up -d`, and `pnpm db:migrate`
- Phase 3.0 seed transformation design created at `docs/database/seed-transformation-plan.md`
- Phase 3.0 human review corrections applied: compact demo dataset approved; skill aliases limited to exact lexical variants; provider/team assessment results deferred when ownership is unclear; E-Lab demo challenge approved; ambiguous organization classification excluded from compact seed; challenge description convention approved; expired offers remain selected/pending/derived; matching outputs deferred to Phase 7; transcript/experience conversion deferred from Phase 3.1; seed command safety clarified
- Phase 3.1 seed safety/context infrastructure implemented under `src/db/seed/**`
- `pnpm db:seed` added as a non-destructive, opt-in seed command requiring `ALLOW_DB_SEED=true`
- Phase 3.1 BOOTSTRAP records implemented: CAID organization, E-Lab organization, one synthetic development admin user for each, and organization-scoped `ADMIN` memberships
- Phase 3.1 REFERENCE skill taxonomy implemented: 9 categories, 58 canonical skills, 4 stored lexical aliases after final cleanup, 0 skill relationships, and 0 embeddings
- Phase 3.1 human-review taxonomy cleanup completed: case-only aliases removed from `skill_aliases`; casing/whitespace variants are handled by canonical lookup normalization while source fixture labels remain documented
- Reference taxonomy review artifact created at `docs/database/reference-skill-seed.md`
- Phase 3.1 idempotency verified by repeated seed execution with stable row counts
- Phase 3.1 confirmed no challenge/application/assessment/offer/project DEMO rows are seeded
- `src/db/index.ts` now exposes the shared node-postgres Drizzle client with the production schema
- ERD v1 remains frozen; future structural changes require a new reviewed schema change

Previous completed work:

- PostgreSQL + pgvector successfully running under OrbStack
- Docker container is healthy
- Local DB exposed at port `5432`
- Database name: `solution_studio`
- PostgreSQL version verified as `18.4`
- Drizzle ORM installed
- Drizzle Kit installed
- node-postgres installed
- `DATABASE_URL` configured
- Drizzle database connection created
- `scripts/db-check.ts` created
- End-to-end application-side database connection successfully verified
- pnpm/esbuild build-script approval issue resolved
- Latest DBML ERD has been recovered for repository inclusion
- Phase 2 strategy revised to audit the existing static MVP before implementing Drizzle tables

### Latest verification

- `pnpm exec tsc --noEmit` passes
- `pnpm exec drizzle-kit check` passes
- `pnpm db:check` passes against PostgreSQL 18.4 after starting the local Compose database
- `pnpm lint` passes
- `pnpm build` passes when network access is available for Google Fonts
- `pnpm db:seed` refuses without `ALLOW_DB_SEED=true`
- `NODE_ENV=production ALLOW_DB_SEED=true pnpm db:seed` refuses before seed writes
- `ALLOW_DB_SEED=true pnpm db:seed` first run produced 2 organizations, 2 users, 2 memberships, 9 skill categories, 58 skills, 4 aliases after final cleanup, and 0 skill relationships
- Repeated `ALLOW_DB_SEED=true pnpm db:seed` kept all Phase 3.1 row counts unchanged
- DBML to Drizzle comparison: 45 tables and 41 enums implemented; no missing or extra domain tables/enums
- Fresh PostgreSQL migration replay creates 45 public tables, 41 enums, 82 foreign keys, 35 CHECK constraints, and 11 partial indexes
- Drizzle migration journal contains one applied migration after repeated `pnpm db:migrate`
- pgvector extension is enabled and no vector columns/indexes exist yet

Previous verification:

```text
database: solution_studio

PostgreSQL 18.4
Debian 18.4-1.pgdg12+1
aarch64
64-bit
```

```text
container:
vinuni-solution-studio-db

image:
pgvector/pgvector:pg18

status:
healthy

port:
5432
```

---

# 14. Upcoming Task

## Immediate next task

### Begin Phase 3.2 compact DEMO seed dataset definition.

Phase 3.1 seed safety/context infrastructure, BOOTSTRAP data, and REFERENCE skill taxonomy are complete and ready for human review. The next checkpoint is to define the compact DEMO seed dataset and deterministic scenario records before implementing scenario inserts.

Immediate sequence:

```text
1. Review docs/database/seed-transformation-plan.md
      ↓
2. Review docs/database/reference-skill-seed.md
      ↓
3. Select the compact DEMO challenge/application/project scenarios
      ↓
4. Confirm deterministic organization classifications for selected DEMO fixtures
      ↓
5. Prepare Phase 3.2 implementation instructions without seeding records yet
```

### Immediate checklist

- [ ] Review `docs/database/seed-transformation-plan.md`
- [ ] Review `docs/database/reference-skill-seed.md`
- [ ] Choose final compact DEMO fixture list
- [ ] Confirm deterministic organization classifications
- [ ] Confirm any seed-specific demo timestamps or scenario reference date
- [ ] Keep matching outputs, embeddings, transcript conversion, and ambiguous provider/team assessment results deferred unless explicitly approved
- [ ] Preserve Phase 2 migration history unchanged
- [ ] Do not change the frozen ERD without a reviewed schema change
- [ ] Do not seed full demo application/project scenarios until Phase 3.2 decisions are reviewed

### Recommended first agent instruction

```text
Proceed with Phase 3.2 only.

Read:
- AGENTS.md
- PRODUCTION_TRANSFORMATION_PLAN.md
- docs/database/schema.dbml
- docs/database/README.md
- docs/database/mvp-data-model-audit.md
- docs/database/mvp-erd-reconciliation.md
- docs/database/seed-transformation-plan.md
- docs/database/reference-skill-seed.md
- src/db/schema/**
- src/lib/data/**
- src/lib/types.ts

Define the compact DEMO seed dataset and deterministic scenario records only.

Do not implement DEMO seed inserts unless explicitly requested for the next checkpoint.
Do not change the frozen ERD unless a new reviewed schema change is explicitly approved.
```

---

# 15. Work Log

Use this section after each development session.

## 2026-08-16

### Completed

- Phase 3.1 seed safety/context infrastructure, BOOTSTRAP data, and REFERENCE skill taxonomy implemented
- `src/db/seed.ts` and modular seed helpers created under `src/db/seed/**`
- `pnpm db:seed` added as non-destructive/idempotent local seed command
- Safety guard implemented: requires `ALLOW_DB_SEED=true`, rejects `NODE_ENV=production`, parses `DATABASE_URL`, and allows only approved local development targets
- BOOTSTRAP seed implemented for CAID and E-Lab organizations plus synthetic development admin identities
- REFERENCE skill taxonomy implemented with 9 categories, 58 canonical skills, and 4 stored lexical aliases after final cleanup
- Final Phase 3.1 taxonomy cleanup removed case-only aliases from `skill_aliases`; source fixture labels remain documented for traceability
- Skill relationships and embeddings intentionally seeded as 0 rows
- Reference taxonomy review artifact created at `docs/database/reference-skill-seed.md`
- Validation passed: safety refusal without opt-in, production refusal, first seed, second idempotent seed, no DEMO scenario rows, TypeScript, lint, Drizzle Kit check, DB connection check, and network-enabled production build
- Phase 3.0 seed transformation design created at `docs/database/seed-transformation-plan.md`
- Phase 3.0 human review corrections applied before Phase 3.1
- Approved compact initial demo dataset strategy; do not seed every static fixture
- Approved skill policy: categories are taxonomy/navigation only, aliases are exact lexical variants only, relationships are explicit semantic links, embeddings are Phase 7 fallback
- Approved deferrals: provider/team assessment results without member attribution, matching output tables, and transcript/experience to `student_projects`
- Approved E-Lab-owned and E-Lab-managed synthesized demo challenge for internal-unit coverage
- Approved seed safety convention: `pnpm db:seed` must be non-destructive/idempotent and destructive reset remains a separate explicit local workflow
- Static fixture sources classified into BOOTSTRAP, REFERENCE, and DEMO seed categories
- Source-to-seed mapping, lifecycle mapping, team-application mapping, assessment mapping, project/milestone mapping, skill/reference strategy, eligibility mapping, dependency order, and idempotency/safety strategy documented
- Remaining REVIEW items limited to exact compact fixture list after excluding ambiguous organizations and optional approved skill relationships
- Phase 2.8 initial migration generated, reviewed, applied, and fresh-tested
- `drizzle/0000_empty_gladiator.sql` created with `CREATE EXTENSION IF NOT EXISTS vector;` before schema objects
- Fresh database replay verified with `docker compose down -v`, `docker compose up -d`, `pnpm db:migrate`, and repeated no-op `pnpm db:migrate`
- PostgreSQL inspection verified pgvector, 45 public tables, 41 enums, 82 foreign keys, 35 CHECK constraints, 11 partial indexes, and one Drizzle journal row
- Confirmed no `projects.challenge_id`, `selections.challenge_id`, `assessment_questions.assessment_id`, embedding placeholder fields, vector columns, or vector indexes exist
- Phase 2.4 modular Drizzle schema organization implemented
- Phase 2.5 frozen ERD v1 translated into 45 tables and 41 enums
- Phase 2.6 keys, foreign keys, unique constraints, partial unique indexes, CHECK constraints, and query indexes implemented
- Phase 2.7 pgvector extension strategy implemented through the Phase 2.8 version-controlled migration
- Shared Drizzle client updated to expose the schema through the existing node-postgres pool
- Validation passed: TypeScript, Drizzle Kit check, DB connection check, lint, production build with network access
- DBML to Drizzle comparison found no missing or extra domain tables/enums

### Current blocker

None.

### Next action

Proceed to Phase 3.2: define the compact DEMO seed dataset and deterministic scenario records.

## 2026-08-15

### Completed

- Confirmed Phase 1 completion
- PostgreSQL 18.4 + pgvector healthy under OrbStack
- Drizzle → node-postgres → PostgreSQL connectivity verified
- Latest DBML ERD recovered
- Decided to keep DBML in `docs/database/schema.dbml`
- Decided not to derive the production schema directly from static MVP types
- Revised Phase 2 to include static implementation audit and MVP ↔ ERD reconciliation

### Current blocker

None.

### Next action

Add the DBML and agent guidance to the repository, then run the read-only static MVP audit.

---

## 2026-08-09

### Completed

- Phase 1 local database infrastructure
- OrbStack/Docker setup
- PostgreSQL 18 + pgvector container
- Persistent development volume
- Drizzle + node-postgres integration
- Successful DB connectivity test

---

# 16. Development Command Reference

## Start database

```bash
docker compose up -d
```

or after adding package scripts:

```bash
pnpm db:up
```

## Check database

```bash
docker compose ps
```

## Test Drizzle connection

```bash
pnpm tsx scripts/db-check.ts
```

or:

```bash
pnpm db:check
```

## Stop temporarily

```bash
docker compose stop
```

Resume:

```bash
docker compose start
```

## Tear down containers but preserve DB data

```bash
docker compose down
```

## Completely reset local DB

**Destructive: removes the PostgreSQL volume and all local DB data.**

```bash
docker compose down -v
```

After Phase 2/3, rebuild with:

```bash
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

## View DB logs

```bash
docker compose logs -f db
```

## Drizzle Studio

```bash
pnpm db:studio
```

## Generate migration

```bash
pnpm db:generate
```

## Apply migration

```bash
pnpm db:migrate
```

---

# 17. Project Rules Going Forward

1. **`docs/database/schema.dbml` is the canonical database design source of truth.**
2. `src/lib/data` and `src/lib/types.ts` are temporary static-MVP representations and implementation evidence, not production schema authority.
3. Before modifying database schema, review the ERD and the MVP ↔ ERD reconciliation artifacts.
4. The static MVP may reveal legitimate missing requirements; such differences must be explicitly reviewed rather than silently copied into the schema.
5. `src/db/schema/*.ts` is the executable Drizzle/PostgreSQL representation of the approved ERD.
6. `src/db/schema/index.ts` should aggregate exports; do not place the entire schema in one giant file.
7. All approved schema changes must be represented in Drizzle schema + version-controlled migrations.
8. Production migrations must be reviewed before deployment.
9. Do not use `drizzle-kit push` in production.
10. Keep PostgreSQL as the primary structured datastore.
11. Use pgvector only for semantic/vector needs.
12. Use object storage for large files rather than storing them directly in PostgreSQL.
13. Keep business rules out of React components.
14. Client components must never connect directly to PostgreSQL.
15. Enforce authentication and authorization server-side.
16. Use transactions for workflows that modify multiple related tables.
17. Keep local development reproducible through Docker Compose.
18. Do not delete Docker volumes unless intentionally resetting the local DB.
19. Introduce additional infrastructure such as Redis only when justified by measured requirements.
20. Agents should perform analysis-only tasks when instructed and must not generate migrations until ERD v1 is frozen.

---

# 17.1 Agent Guidance Requirements

`AGENTS.md` should include a database section with, at minimum, the following rules:

```text
Canonical ERD:
docs/database/schema.dbml

Executable schema:
src/db/schema/

Migration history:
drizzle/

Static MVP evidence:
src/lib/data/
src/lib/types.ts
src/lib/queries.ts
src/lib/eligibility.ts
src/lib/filters.ts
src/lib/pipeline.ts
```

Agents should be told:

- [ ] Read `docs/database/schema.dbml` before database/schema work
- [ ] Do not infer production tables directly from mock data or UI types
- [ ] Use the existing UI implementation to identify requirements worth preserving
- [ ] Consult `docs/database/mvp-data-model-audit.md` after it exists
- [ ] Consult `docs/database/mvp-erd-reconciliation.md` after it exists
- [ ] Do not modify the ERD silently
- [ ] Surface ERD/MVP conflicts as explicit review items
- [ ] Do not generate migrations before the schema change is approved
- [ ] Keep DB access server-side
- [ ] Keep schema modules domain-oriented and modular
- [ ] Update DBML/documentation when an approved architectural schema change is made
- [ ] Update Drizzle schema and migration together for implemented changes

Recommended authority hierarchy for agents:

```text
Approved architectural intent
        ↓
docs/database/schema.dbml

Implementation reconciliation
        ↓
docs/database/mvp-erd-reconciliation.md

Executable schema
        ↓
src/db/schema/*.ts

Historical database changes
        ↓
drizzle/*.sql
```

If these disagree, the agent should **report the discrepancy instead of guessing**.

---

# 18. Definition of Done

The static MVP transformation is complete when:

- [ ] The approved ERD is fully represented in PostgreSQL
- [ ] Database creation is reproducible from migrations
- [ ] Development data is reproducible from seed
- [ ] Static feature data has been removed from production paths
- [ ] Challenge lifecycle is database-backed
- [ ] Applications are database-backed
- [ ] Assessments are database-backed
- [ ] Offers are database-backed
- [ ] Workspace/projects are database-backed
- [ ] Authentication is implemented
- [ ] RBAC is enforced
- [ ] Skill matching works
- [ ] Semantic matching works through pgvector
- [ ] Staging environment exists
- [ ] Production deployment exists
- [ ] Managed PostgreSQL is backed up and monitored
- [ ] File/object storage is available if uploads are required
- [ ] Deployment and recovery procedures are documented
