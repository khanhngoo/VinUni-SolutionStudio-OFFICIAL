# VinUni Solution Studio — Production Transformation Plan

**Repository:** `VinUni-SolutionStudio-OFFICIAL`  
**Project:** VinUniversity Solution Studio / AI-in-Action Platform  
**Last updated:** 2026-08-16  
**Current phase:** Phase 4.2 Challenge Business Layer complete / awaiting human review

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

Current/expected structure as the production transformation proceeds:

```text
VinUni-SolutionStudio-OFFICIAL/
│
├── docs/
│   └── database/
│       ├── schema.dbml                    # frozen canonical architectural ERD v1
│       ├── README.md                      # database implementation/migration notes
│       ├── mvp-data-model-audit.md        # static MVP evidence
│       ├── mvp-erd-reconciliation.md      # reviewed MVP ↔ ERD mapping
│       ├── seed-transformation-plan.md    # reviewed Phase 3 seed design
│       ├── reference-skill-seed.md        # canonical skill taxonomy review artifact
│       ├── demo-seed-manifest.md          # compact DEMO scenario/fixture authority
│       └── phase-3-seed-verification.md   # final Phase 3 verification artifact
│
├── docker-compose.yml
├── drizzle.config.ts
├── .env
├── .env.example
│
├── drizzle/
│   ├── 0000_empty_gladiator.sql
│   └── meta/
│
├── scripts/
│   ├── db-check.ts
│   └── db-reset.ts                        # destructive LOCAL DEVELOPMENT reset
│
├── src/
│   ├── app/
│   ├── components/
│   │
│   ├── db/
│   │   ├── index.ts
│   │   ├── schema/
│   │   ├── queries/
│   │   ├── seed.ts
│   │   └── seed/
│   │
│   ├── services/
│   │
│   └── lib/
│       ├── data/        # temporary static/mock implementation evidence
│       ├── queries.ts   # gradually replaced by DB-backed queries
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
| Phase 3 | Reconciled static mock data → production-valid database seed | ✅ Complete / human review complete |
| Phase 4 | Challenge marketplace → real DB | 🚧 In progress |
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

Transform useful demo records from the static MVP into a deterministic, normalized seed dataset that conforms to the frozen ERD v1 and can be recreated from zero through the canonical reset workflow.

Phase 3 reuses the reviewed artifacts:

```text
docs/database/mvp-data-model-audit.md
docs/database/mvp-erd-reconciliation.md
docs/database/seed-transformation-plan.md
docs/database/reference-skill-seed.md
docs/database/demo-seed-manifest.md
```

Do not redesign the schema from mock objects during seeding.

The Phase 3 implementation principle is:

```text
static fixture/source material
        ↓
reviewed transformation rules
        ↓
normalized BOOTSTRAP / REFERENCE / DEMO seed
        ↓
pnpm db:reset
        ↓
deterministically reproducible local database
```

The reset workflow established in Phase 3.4 is an ongoing invariant for every Phase 3.5+ seed checkpoint.

## Phase 3 checkpoint status

- Phase 3.0: ✅ COMPLETE / HUMAN REVIEW COMPLETE — seed transformation design and approved corrections recorded at `docs/database/seed-transformation-plan.md`.
- Phase 3.1: ✅ COMPLETE / HUMAN REVIEW COMPLETE — seed safety/context infrastructure, BOOTSTRAP data, and REFERENCE skill taxonomy implemented and verified.
- Phase 3.2: ✅ COMPLETE / HUMAN REVIEW COMPLETE — compact DEMO identity and organization foundation implemented and documented.
- Phase 3.3: ✅ COMPLETE / HUMAN REVIEW COMPLETE — DEMO challenges and challenge-side normalized data implemented and verified.
- Phase 3.4: ✅ COMPLETE / HUMAN REVIEW COMPLETE — canonical local reset workflow implemented as `pnpm db:reset`; migration-from-zero and seed-from-zero reproducibility verified.
- Phase 3.5: ✅ COMPLETE / HUMAN REVIEW COMPLETE — normalized DEMO applications, application members/teams, and supervision request.
- Phase 3.6: ✅ COMPLETE / HUMAN REVIEW COMPLETE — DEMO assessment definitions, attempts, responses, and scores for unambiguous scenarios.
- Phase 3.7: ✅ COMPLETE / HUMAN REVIEW COMPLETE — DEMO selections, offers, and agreements.
- Phase 3.8: ✅ COMPLETE / HUMAN REVIEW COMPLETE — DEMO projects, project members, milestones, deliverables, milestone reviews, resources, and feedback.
- Phase 3.9: ✅ COMPLETE / HUMAN REVIEW COMPLETE — final complete seed reset/reproducibility verification and Phase 3 closeout.

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

- [x] Review the Phase 2 MVP inventory/reconciliation and Phase 3.0 seed plan
- [x] Implement seed safety guard
- [x] Implement deterministic seed key/context strategy
- [x] Implement BOOTSTRAP CAID/E-Lab organizations and development admin memberships
- [x] Implement REFERENCE skill categories/canonical skills/exact lexical aliases
- [x] Add `pnpm db:seed`
- [x] Verify generated IDs/references are reliably resolved without hard-coded bigint PKs
- [x] Verify Phase 3.1 seed records satisfy final constraints
- [x] Confirm no DEMO challenge/application/assessment/offer/project rows are seeded in Phase 3.1
- [x] Create `docs/database/reference-skill-seed.md`
- [x] Human-review taxonomy cleanup: 9 categories, 58 canonical skills, 4 true lexical aliases, 0 skill relationships, 0 embeddings
- [x] Keep case/whitespace-only variants in canonical lookup normalization rather than `skill_aliases`

## 3.2 Define compact DEMO identity and organization foundation

Create deterministic development examples for the compact DEMO prerequisite layer:

- [x] Select useful existing demo records to preserve
- [x] Resolve the exact compact fixture list after excluding ambiguous organizations
- [x] Create `docs/database/demo-seed-manifest.md`
- [x] Supply ERD-required identity/profile fields missing from current mocks with intentional development values
- [x] Remove mock-only/presentation-only fields from persistence
- [x] Preserve useful names/content that make the current demo recognizable
- [x] Reuse existing CAID/E-Lab BOOTSTRAP admin identities
- [x] Seed selected faculty users and profiles
- [x] Seed selected student users and profiles
- [x] Seed selected partner/internal DEMO organizations and contact users
- [x] Seed contact organization memberships
- [x] Reuse existing REFERENCE skills without expanding taxonomy
- [x] Seed selected student skill claims against existing canonical skills
- [x] Exclude ambiguous `org-vinai`; use `route-optimisation` for compact public technical coverage
- [x] Keep `skill_relationships = 0`
- [x] Confirm no challenge/application/assessment/offer/project workflow data leaks into this checkpoint

Verified Phase 3.2 identity baseline:

```text
DEMO organizations:          5
DEMO contact users:          5
DEMO students:               7
DEMO faculty:                6
student_profiles:            7
faculty_profiles:            6
CONTACT_PERSON memberships:  5
student_skills:             33
```

Including BOOTSTRAP totals at this checkpoint:

```text
organizations:               7
users:                      20
organization_memberships:    7
```

## 3.3 Implement DEMO challenges and challenge-side normalized data

Seed only the compact challenge-side foundation.

Implemented challenge set:

```text
merchant-churn-model
route-optimisation
triage-protocol-review
community-health-outreach
supply-chain-dashboard
campus-energy-audit
archive-digitisation
demo-elab-venture-readiness-dashboard   # synthesized DEMO
```

Checklist:

- [x] Seed 8 selected/synthesized DEMO challenges
- [x] Seed 26 challenge skill requirements
- [x] Seed 17 challenge eligibility rules
- [x] Seed 14 challenge faculty assignments
- [x] Seed 0 challenge reviews intentionally; do not invent review history
- [x] Preserve challenge owner vs managing-organization semantics
- [x] Verify external-owner / CAID-manager path
- [x] Verify E-Lab owner = E-Lab manager path
- [x] Verify public and confidential marketplace cases
- [x] Preserve referential integrity to Phase 3.2 organizations, contacts, faculty, and Phase 3.1 skills
- [x] Resolve challenge skill labels only through canonical normalization / approved lexical aliases
- [x] Keep new skills, skill relationships, embeddings, matching outputs, and downstream workflow rows at zero
- [x] Verify repeated seed execution is idempotent
- [x] Verify challenge data through SQL/Drizzle joins and eligibility sanity checks

## 3.4 Establish reset workflow

Canonical local reset:

```bash
pnpm db:reset
```

`pnpm db:reset` is **destructive and LOCAL DEVELOPMENT ONLY**. It:

```text
validates local target / refuses production / refuses arguments
        ↓
docker compose down -v
        ↓
docker compose up -d
        ↓
wait for PostgreSQL health
        ↓
pnpm db:migrate
        ↓
ALLOW_DB_SEED=true pnpm db:seed
```

Checklist:

- [x] Add and document `pnpm db:reset`
- [x] Keep `pnpm db:seed` non-destructive and separate from reset
- [x] Confirm migration from zero works
- [x] Confirm pgvector is enabled from version-controlled migration history
- [x] Confirm seed from zero recreates Phase 3.3 state exactly
- [x] Confirm repeated seed after reset is idempotent
- [x] Confirm representative challenge semantics after reset
- [x] Confirm no downstream workflow leakage
- [x] Confirm static UI can eventually display equivalent demo content for seed layers implemented through Phase 3.3; actual UI DB integration remains Phase 4+
- [x] Establish reset/reproducibility as an invariant for all later Phase 3 seed checkpoints

Verified post-reset baseline:

```text
organizations:                   7
users:                          20
organization_memberships:        7
skill_categories:                9
skills:                         58
skill_aliases:                   4
skill_relationships:             0
student_profiles:                7
faculty_profiles:                6
student_skills:                 33
challenges:                      8
challenge_skills:               26
challenge_eligibility_rules:    17
challenge_faculty_assignments:  14
challenge_reviews:               0
```

Verified schema baseline:

```text
domain tables:             45
PostgreSQL enums:          41
foreign keys:              82
CHECK constraints:         35
partial indexes:           11
Drizzle migration rows:     1
pgvector:             enabled
```

## 3.5 Implement DEMO application and team foundation

### Goal

Normalize the compact application/team fixtures on top of the verified Phase 3.4 reset baseline without prematurely creating assessment, selection/offer, or project records.

Target production entities:

```text
applications
application_members
supervision_requests
application_projects   # only if valid seeded student-project evidence exists
```

Expected compact application spine:

```text
app-triage
app-route
app-churn
app-outreach
app-supply
app-energy
app-archive
papp-depot
```

Every fixture must be validated against the actual static source and must resolve to an already-seeded Phase 3.3 challenge before insertion.

### Application/team rules

- [x] Seed only the approved compact application fixtures
- [x] Use deterministic seed keys/public IDs; never hard-code bigint PKs
- [x] Preserve `applications → application_members`; do not restore `applications.student_id`
- [x] Resolve `submitted_by` to the actual initiating user
- [x] Normalize embedded team members into `application_members`
- [x] Preserve separate `member_role` and `status`
- [x] Require exactly one `LEADER` per application and that leader is `ACCEPTED`
- [x] Preserve solo application as one accepted leader member
- [x] Preserve `app-route` pending-invite member as `MEMBER / INVITED`
- [x] Preserve `team_name`, `preferred_role`, `committed_hours_per_week` only when deterministically supported
- [x] Keep general profile availability separate from application commitment
- [x] Map motivation/relevant-experience narrative only from appropriate fixture fields
- [x] Do not fabricate `application_projects`; expected count remains 0 while student-project evidence is deferred
- [x] Seed `app-outreach + inv-outreach` as `supervision_requests`
- [x] Keep challenge faculty routing, supervision requests, and future project supervisor distinct

### Phase-consistent staged application statuses

Downstream authoritative records do not exist yet, so Phase 3.5 must not create internally inconsistent lifecycle state.

Use the furthest coherent application status available at this checkpoint:

```text
assessment-dependent fixture
→ ASSESSMENT until assessment result exists

post-assessment / pre-selection fixture
→ SELECTION_PENDING

pending-offer / active / final-review / completed fixture
→ SELECTION_PENDING until a selection exists

failed-assessment fixture
→ ASSESSMENT until reviewed failed attempt exists
→ REJECTED only in Phase 3.6 when the assessment result is seeded
```

Do **not** seed `SELECTED` while `selections = 0`.

Document for every application:

```text
fixture final scenario
Phase 3.5 staged application status
later transition required
```

### Phase 3.5 leakage boundary

At completion, keep:

```text
assessments = 0
assessment_attempts = 0
selections = 0
offers = 0
agreements = 0
projects = 0
project_members = 0
milestones = 0
deliverables = 0
milestone_reviews = 0
project_resources = 0
feedback = 0
match_results = 0
match_skill_details = 0
match_experience_details = 0
```

### Phase 3.5 verification

- [x] Validate every application references an existing seeded challenge
- [x] Validate every member references an existing seeded student/profile
- [x] Validate exactly one accepted leader per application
- [x] Validate no duplicate `(application_id, student_id)`
- [x] Validate `submitted_by` membership where required by fixture semantics
- [x] Validate pending invite scenario
- [x] Validate supervision request relationships/timestamps
- [x] Run seed twice and verify idempotency
- [x] Run `pnpm db:reset` and verify Phase 3.5 state can be recreated from zero
- [x] Update `docs/database/demo-seed-manifest.md`
- [x] Update `docs/database/seed-transformation-plan.md`
- [x] Update this plan with actual counts and next checkpoint

### Phase 3.5 actual results

- Seeded 8 compact applications: `app-triage`, `app-route`, `app-churn`, `app-outreach`, `app-supply`, `app-energy`, `app-archive`, and `papp-depot`.
- Seeded 18 `application_members`, preserving one accepted leader per application, the solo `app-triage` scenario, and the `app-route` pending invited member.
- Seeded 1 pending `supervision_requests` row for `app-outreach + inv-outreach`.
- Kept `application_projects = 0`; structured experience evidence remains deferred.
- Kept assessments, selections, offers, agreements, projects, milestones, deliverables, resources, feedback, and matching outputs at zero.
- Verified repeated guarded seeding is idempotent.
- Verified `pnpm db:reset` recreates Phase 3.5 from zero.

## 3.6 Implement DEMO assessment layer

### Goal

Add normalized assessment definitions and individual assessment history only where fixture ownership is unambiguous.

Target entities:

```text
assessments
assessment_sections
assessment_questions
assessment_attempts
assessment_responses
assessment_scores
```

Rules/checklist:

- [x] Seed assessment definitions only for compact challenges/applications that need them
- [x] Normalize static assessment sections/questions into the frozen multidisciplinary model
- [x] Use `MULTIPLE_CHOICE`, `CODING`, and other frozen question types only where fixture semantics support them
- [x] Store type-specific configuration in approved JSONB fields
- [x] Use `INDIVIDUAL` scope for explicit student-facing attempts whose member ownership is clear
- [x] Keep ambiguous provider/team `testResult` fixtures deferred; do not silently choose TEAM vs leader-INDIVIDUAL
- [x] Link individual attempts to the correct `application_member_id`
- [x] Preserve assessment/application/challenge consistency invariants
- [x] Seed reviewed scores/rubrics only when represented by fixture data
- [x] Transition `app-triage` to `REJECTED` only after the failed reviewed assessment exists
- [x] Transition successful reviewed assessment cases to `SELECTION_PENDING` where appropriate
- [x] Keep selections/offers/projects at zero
- [x] Verify repeated seed idempotency
- [x] Run `pnpm db:reset` and verify complete Phase 3.6 state from zero
- [x] Update manifest/transformation plan/current plan with actual counts and remaining deferrals

### Phase 3.6 actual results

- Seeded 2 assessments: `assessment:triage-protocol-review` and `assessment:merchant-churn-model`.
- Seeded 5 assessment sections and 12 questions: 10 `MULTIPLE_CHOICE` cognitive questions and 2 `CODING` technical questions.
- Seeded 2 reviewed INDIVIDUAL attempts, each linked to the correct accepted application member.
- Seeded 2 qualitative `assessment_scores` records; `overall_score` remains `NULL` because the fixtures provide bands, not numeric totals.
- Kept `assessment_responses = 0` because no response-level answers exist in the source fixtures.
- Transitioned `app-triage` to `REJECTED` after the failed reviewed assessment exists.
- Kept `app-churn` at `SELECTION_PENDING` after the reviewed passing assessment.
- Deferred ambiguous provider/team assessment results such as `papp-depot`.
- Kept selections, offers, agreements, projects, milestones, resources, feedback, and matching outputs at zero.
- Verified guarded seed idempotency and reset-from-zero reproducibility through Phase 3.6.

## 3.7 Implement DEMO selections, offers, and agreements

### Goal

Represent selected applications and durable offer/agreement state without creating projects yet.

Target entities:

```text
selections
offers
agreements
```

Rules/checklist:

- [x] Seed at most one selection per selected compact application
- [x] Seed at most one durable offer per selection
- [x] Update selected application rows to `SELECTED` only when the corresponding selection exists
- [x] Preserve pending-offer scenario such as `app-route`
- [x] Use `responded_by` = accepted application leader for accepted/declined team-level offers
- [x] Preserve offer expiry as derived: `PENDING + respond_by < now()`, never an `EXPIRED` enum
- [x] Seed accepted offer terms for scenarios that will become active/final-review/completed projects
- [x] Seed required NDA/confidentiality/data-access agreements only for compact scenarios that need restricted-resource access
- [x] Keep consent records separate from agreements
- [x] Keep projects/project members/milestones/resources at zero
- [x] Verify application ↔ selection ↔ offer cardinality
- [x] Verify repeated seed idempotency
- [x] Run `pnpm db:reset` and verify complete Phase 3.7 state from zero
- [x] Update manifest/transformation plan/current plan with actual counts and transitions

### Phase 3.7 actual results

- Seeded 5 `selections` rows for `app-route`, `app-supply`, `app-energy`, `app-archive`, and `papp-depot`.
- Seeded 5 durable `offers` rows: 1 `PENDING` offer for `app-route` and 4 `ACCEPTED` offers for project-bound historical scenarios.
- Seeded 5 individual NDA `agreements`: 3 for accepted `app-supply` members and 2 for accepted `papp-depot` members.
- Transitioned selected applications to `SELECTED` only after their selection rows exist.
- Preserved `app-triage` as `REJECTED`, `app-churn` as `SELECTION_PENDING`, and `app-outreach` as `SUBMITTED`.
- Used deterministic partner/internal contacts as `selected_by` and accepted application leaders as `responded_by`.
- Preserved the `app-route` pending-offer scenario with no response actor/time, one invited member, no agreements, and no project.
- Kept projects, project members, milestones, deliverables, milestone reviews, project resources, feedback, matching outputs, notifications, and audit demo records at zero.
- Verified guarded seed idempotency and reset-from-zero reproducibility through Phase 3.7.

## 3.8 Implement DEMO projects, milestones, workspace resources, and feedback

### Goal

Complete the compact downstream DEMO lifecycle after accepted offers exist.

Target entities:

```text
projects
project_members
milestones
deliverables
milestone_reviews
project_resources
feedback
```

Rules/checklist:

- [x] Create projects only from originating applications with appropriate accepted-offer state
- [x] Preserve `projects.application_id` as canonical project origin; do not reintroduce `projects.challenge_id`
- [x] Seed initial `project_members` from accepted application members
- [x] Map eventual scenarios to `ACTIVE`, `FINAL_REVIEW`, and `COMPLETED`
- [x] Seed faculty supervisor only from deterministic compact fixture data
- [x] Normalize milestone states without storing `OVERDUE`
- [x] Convert static faculty/partner approval booleans into authoritative `milestone_reviews`
- [x] Preserve v1 dual-approval rule: required FACULTY + PARTNER approvals gate completion
- [x] Keep formal milestone decisions out of generic feedback
- [x] Normalize FILE/LINK/TEXT/OTHER deliverables
- [x] Seed project resources as metadata/access references only; never plaintext credentials/secrets
- [x] Respect agreement requirements for restricted/T3 resources
- [x] Normalize faculty/partner close-out feedback into generic `feedback`
- [x] Keep meetings/join links deferred because meetings are not ERD v1 entities
- [x] Preserve `papp-depot` partner-approval coverage if deterministic
- [x] Keep matching outputs at zero
- [x] Verify repeated seed idempotency
- [x] Run `pnpm db:reset` and verify complete Phase 3.8 state from zero
- [x] Update manifest/transformation plan/current plan with actual counts

### Phase 3.8 actual results

- Added `src/db/seed/projects.ts` and wired it into the guarded seed transaction after selections/offers/agreements.
- Seeded 4 accepted-offer projects: `app-supply`, `app-energy`, `app-archive`, and `papp-depot`.
- Preserved `app-route` as selected with a pending offer, one invited member, no agreements, and no project.
- Seeded 10 project members from accepted application members only; no invited members became project members.
- Seeded project status coverage: `ACTIVE = 2`, `FINAL_REVIEW = 1`, and `COMPLETED = 1`.
- Seeded 15 milestones with status distribution `PENDING = 2`, `IN_PROGRESS = 1`, `SUBMITTED = 3`, `REVISION_REQUESTED = 1`, and `COMPLETED = 8`; no stored `OVERDUE` status exists.
- Seeded 12 `TEXT` deliverables and 20 formal milestone reviews.
- Milestone review distribution is 11 `FACULTY / APPROVED`, 8 `PARTNER / APPROVED`, and 1 `PARTNER / REVISION_REQUESTED`.
- Seeded 10 project resources: 6 `TEAM_ONLY` resources without agreement gates and 4 `RESTRICTED` resources requiring agreements.
- Validated restricted resources only on `app-supply` and `papp-depot`, where every project member has an accepted Phase 3.7 NDA agreement.
- Kept `feedback = 0` because the compact fixtures do not contain deterministic close-out feedback text or metrics.
- Kept `match_results`, `match_skill_details`, and `match_experience_details` at zero.
- Verified guarded seed idempotency, reset-from-zero reproducibility, post-reset idempotency, seed safety refusal, production safety refusal, TypeScript, lint, DB check, Drizzle check, production build, and `git diff --check`.

## 3.9 Final Phase 3 seed verification and closeout

### Goal

Prove the **entire compact normalized DEMO dataset** can be recreated deterministically from version-controlled migrations and seed code before any UI read path is migrated.

Final canonical workflow:

```bash
pnpm db:reset
```

Final verification:

- [x] Reset from an empty Docker volume succeeds with no manual DB step
- [x] Migrations recreate pgvector + frozen schema
- [x] Seed recreates BOOTSTRAP, REFERENCE, and all approved DEMO layers
- [x] Second `ALLOW_DB_SEED=true pnpm db:seed` is idempotent
- [x] Compact marketplace scenarios are queryable
- [x] Compact application/team scenarios are queryable
- [x] Assessment scenarios are queryable
- [x] Selection/offer/agreement scenarios are queryable
- [x] Active/final-review/completed project scenarios are queryable
- [x] Milestone review/resource/feedback scenarios are queryable
- [x] All seeded FKs resolve
- [x] Lifecycle states are internally coherent
- [x] `skill_relationships` remains 0 unless separately human-approved
- [x] Matching output tables remain 0; matching belongs to Phase 7
- [x] Embeddings/vector columns remain deferred to Phase 7
- [x] Ambiguous provider/team assessment ownership remains deferred unless separately resolved
- [x] Transcript/experience conversion remains deferred unless separately approved
- [x] Update `docs/database/demo-seed-manifest.md` with final actual counts
- [x] Update `docs/database/seed-transformation-plan.md` with final implementation facts
- [x] Mark Phase 3 COMPLETE only after all checks pass

### Phase 3.9 actual results

- Created final verification artifact: `docs/database/phase-3-seed-verification.md`.
- Verified `pnpm db:reset` recreates the complete Phase 3 dataset from an empty local Docker volume using only the version-controlled migration plus guarded seed.
- Verified migration replay produces pgvector, 45 public domain tables, 41 public enums, 82 foreign keys, 35 PostgreSQL CHECK constraints, 11 partial indexes, one Drizzle migration journal row, and no vector columns/indexes.
- Verified pre-reset, post-reset, and post-idempotency counts match across all 45 domain tables.
- Verified the compact scenario spine across challenge, application/team, assessment, selection/offer/agreement, and project/workspace layers.
- Verified safety refusals for `pnpm db:seed` without opt-in, `NODE_ENV=production ALLOW_DB_SEED=true pnpm db:seed`, and `NODE_ENV=production pnpm db:reset`.
- Validation passed: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm db:check`, `pnpm exec drizzle-kit check`, `pnpm build`, and `git diff --check`.

## Phase 3 exit criteria

Phase 3 is complete when:

- [x] The local database has a documented destructive reset workflow (`pnpm db:reset`)
- [x] Schema recreation comes entirely from version-controlled migrations
- [x] BOOTSTRAP, REFERENCE, DEMO identity, and DEMO challenge layers are reproducible from seed
- [x] Compact DEMO applications/teams/supervision are normalized and seeded
- [x] Approved assessment scenarios are normalized and seeded
- [x] Approved selection/offer/agreement scenarios are normalized and seeded
- [x] Approved project/milestone/resource/feedback scenarios are normalized and seeded
- [x] The complete compact seed dataset is reproducible from zero through `pnpm db:reset`
- [x] Repeated non-destructive seed execution is idempotent after the complete Phase 3 dataset exists
- [x] Static mock objects are no longer required to reconstruct the production data model or normalized compact development database, although temporary UI code may still consume them until Phase 4/5 migration
- [x] Phase 4/5 can migrate UI/business read/write paths onto a representative production-valid database without inventing missing demo workflow state

---

# 8. Phase 4 — Move Challenge Marketplace to Real Database

## Goal

Make `/challenges` the first fully database-backed feature.

This should be the first production-data vertical slice.

## 4.1 Read path

- [x] Implement `src/db/queries/challenges.ts`
- [x] Query challenge list
- [x] Query challenge details
- [x] Query organization
- [x] Query required skills
- [x] Query relevant metadata/status
- [x] Add pagination strategy
- [x] Add filtering strategy
- [x] Add sorting strategy

### Phase 4.1 actual results

- Implemented `src/db/queries/challenges.ts` with `listPublishedChallenges(...)` and `getPublishedChallengeBySlug(...)`.
- Added `src/db/queries/index.ts` as the query-module export barrel.
- Added database-backed read models for challenge list and challenge detail without exposing internal bigint route identifiers.
- Joined owner and managing organizations while preserving their separate meanings.
- Retrieved normalized challenge skills through `challenge_skills -> skills` with deterministic required/preferred ordering.
- Retrieved normalized eligibility rules for detail and eligibility summary for list/filter use.
- Retrieved challenge faculty assignments for detail only; this remains routing metadata, not project supervision.
- Derived `applicantCount` with `COUNT(applications)` instead of storing a counter.
- Established page-based pagination with default page size 12 and max page size 50.
- Implemented filters for subtype, compensation type, work mode, visibility, domain, school eligibility, canonical skill, owner organization name, and conservative relational search.
- Implemented deterministic sorting by application deadline, newest, duration, and start date.
- Preserved UI/static fixtures untouched; `/challenges` still consumes static reads until Phase 4.3.
- Documented read semantics and UI field mapping in `docs/database/challenge-read-path.md`.

## 4.2 Business layer

- [x] Create `challenge.service.ts`
- [x] Separate DB access from business rules
- [x] Define public/published challenge visibility
- [x] Define admin/faculty visibility
- [x] Define partner ownership rules

### Phase 4.2 actual results

- Added `src/services/challenge.service.ts` with `listMarketplaceChallenges(...)` and `getMarketplaceChallengeBySlug(...)` as the future Phase 4.3 UI-facing read boundary.
- Added `src/services/challenge-policy.ts` with pure publication, discoverability, confidentiality/redaction, owner-organization, managing-organization, faculty-assignment, and eligibility-evaluation policies.
- Added `src/services/index.ts` as the service export barrel.
- Preserved the Phase 4.1 DB query layer for SQL/Drizzle access, joins, filtering primitives, pagination, sorting, normalized skill retrieval, normalized eligibility retrieval, and derived applicant counts.
- Moved confidential owner-display redaction into the service/policy layer; low-level DB queries now return normalized organization joins, while marketplace service methods apply the disclosure policy.
- Defined published marketplace status as `PUBLISHED` or `APPLICATIONS_OPEN`.
- Defined ordinary marketplace discoverability as `PUBLIC_PREVIEW` for anonymous contexts and `PUBLIC_PREVIEW`, `VINUNI_ONLY`, or redacted `PRIVATE` for VinUni/student/faculty/org/manager/admin contexts.
- Defined `INVITE_ONLY` as excluded from ordinary marketplace service methods; future direct authorized access remains deferred until authentication/invitation policy exists.
- Preserved the reviewed `merchant-churn-model` behavior as a discoverable `PRIVATE + HIGH_CONFIDENTIALITY` marketplace preview with owner/contact redaction for ordinary VinUni reads.
- Defined owner access from explicit active membership in the owner organization, managing access from explicit active membership in the managing organization with an appropriate role, and assigned-faculty access from explicit challenge faculty assignment user IDs.
- Confirmed CAID/E-Lab remain separate organization scopes; no hard-coded cross-unit access shortcut was introduced.
- Implemented a pure deterministic eligibility evaluator for normalized rules with `ELIGIBLE`, `INELIGIBLE`, and `UNKNOWN` outcomes plus rule-level evidence.
- Preserved the distinction between `challenge.weekly_hours` as workload metadata and `AVAILABLE_HOURS` as an explicit eligibility rule.
- Preserved static UI behavior; `/challenges` remains on mock reads until Phase 4.3.
- Preserved Phase 3 seed data; service/policy verification performed no writes and left row counts unchanged.

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

**Current phase:** Phase 4 — Challenge Marketplace → Real DB
**Active next checkpoint:** Phase 4.3 — Challenge Marketplace UI Migration, after Phase 4.2 human review

### Latest completed work

- Phase 1 local PostgreSQL 18 + pgvector infrastructure is complete and reproducible under OrbStack/Docker.
- Phase 2 is complete: MVP audit/reconciliation, frozen ERD v1, 45-table/41-enum Drizzle implementation, constraints/indexes, version-controlled initial migration, pgvector enablement, and fresh migration replay are verified.
- Phase 3.0 is COMPLETE / HUMAN REVIEW COMPLETE: `docs/database/seed-transformation-plan.md` defines the normalized BOOTSTRAP / REFERENCE / DEMO transformation strategy.
- Phase 3.1 is COMPLETE / HUMAN REVIEW COMPLETE: guarded non-destructive seed infrastructure plus CAID/E-Lab bootstrap data and the reviewed reference taxonomy are implemented.
- Final Phase 3.1 taxonomy: 9 categories, 58 canonical skills, 4 true lexical aliases, 0 `skill_relationships`, 0 embeddings.
- Phase 3.2 is COMPLETE / HUMAN REVIEW COMPLETE: compact DEMO identity/organization foundation is implemented and documented in `docs/database/demo-seed-manifest.md`.
- Phase 3.2 totals: 7 organizations including BOOTSTRAP, 20 users including BOOTSTRAP admins, 7 organization memberships, 7 student profiles, 6 faculty profiles, and 33 student-skill claims.
- Phase 3.3 is COMPLETE / HUMAN REVIEW COMPLETE: 8 compact/synthesized challenges, 26 challenge skills, 17 eligibility rules, 14 faculty assignments, and 0 challenge reviews are seeded.
- Phase 3.3 challenge set: `merchant-churn-model`, `route-optimisation`, `triage-protocol-review`, `community-health-outreach`, `supply-chain-dashboard`, `campus-energy-audit`, `archive-digitisation`, and synthesized `demo-elab-venture-readiness-dashboard`.
- Phase 3.4 is COMPLETE / HUMAN REVIEW COMPLETE: `pnpm db:reset` is the canonical destructive LOCAL DEVELOPMENT reset command.
- `pnpm db:reset` refuses production/arguments, validates the repository local Docker DB target, runs `docker compose down -v`, restarts and waits for PostgreSQL, runs migrations, then runs guarded seed.
- Phase 3.4 migration-from-zero verification recreated pgvector, 45 domain tables, 41 enums, 82 foreign keys, 35 PostgreSQL CHECK constraints, 11 partial indexes, and one Drizzle migration journal row.
- Phase 3.4 seed-from-zero verification recreated the Phase 3.3 state exactly and a second seed run remained idempotent.
- Phase 3.4 representative queries verified public/confidential challenge behavior, external owner + CAID manager, E-Lab owner = manager, canonical challenge-skill joins, eligibility rules, and faculty routing.
- Downstream workflow records remain intentionally unseeded through Phase 3.4: applications, assessment history, selections/offers, agreements, projects/milestones/resources/feedback, and matching outputs remain zero.
- Phase 3.5 is COMPLETE / HUMAN REVIEW COMPLETE: 8 compact applications, 18 application members, 0 application-project evidence links, and 1 pending supervision request are seeded.
- Phase 3.5 application set: `app-triage`, `app-route`, `app-churn`, `app-outreach`, `app-supply`, `app-energy`, `app-archive`, and `papp-depot`.
- Phase 3.5 preserves exactly one accepted leader per application, the solo `app-triage` scenario, the `app-route` pending invited member, and the `app-outreach + inv-outreach` supervision request.
- Phase 3.6 is COMPLETE / HUMAN REVIEW COMPLETE: 2 assessments, 5 assessment sections, 12 assessment questions, 2 reviewed individual attempts, 0 responses, and 2 qualitative assessment scores are seeded.
- Phase 3.6 assessment set: `assessment:triage-protocol-review` for `app-triage` and `assessment:merchant-churn-model` for `app-churn`.
- Phase 3.6 transitions `app-triage` to `REJECTED` only after its failed reviewed assessment exists and keeps `app-churn` at `SELECTION_PENDING` after its passing reviewed assessment.
- Phase 3.6 intentionally defers ambiguous provider/team assessment results such as `papp-depot`; no TEAM-scope attempt is silently inferred.
- Phase 3.7 is COMPLETE / HUMAN REVIEW COMPLETE: 5 selections, 5 offers, and 5 agreements are seeded.
- Phase 3.7 selection/offer set: `app-route` pending offer; `app-supply`, `app-energy`, `app-archive`, and `papp-depot` accepted offers.
- Phase 3.7 seeds NDA agreements only for accepted restricted/NDA scenarios: `app-supply` accepted members and `papp-depot` accepted members.
- Phase 3.8 is COMPLETE / HUMAN REVIEW COMPLETE: 4 projects, 10 project members, 15 milestones, 12 deliverables, 20 milestone reviews, 10 project resources, and 0 feedback rows are seeded.
- Phase 3.8 project set: `app-supply` active project, `app-energy` final-review project, `app-archive` completed project, and `papp-depot` active partner-approval workflow project.
- Phase 3.8 preserves `projects.application_id` as the canonical origin, derives challenge through application, and creates project members only from accepted application members.
- Phase 3.8 stores formal faculty/partner milestone decisions only in `milestone_reviews`; generic `feedback` remains 0 because deterministic fixture feedback text is unavailable.
- Phase 3.8 validates agreement-gated restricted resources only for `app-supply` and `papp-depot`, whose accepted project members have Phase 3.7 NDA agreements.
- Phase 3.9 is COMPLETE / HUMAN REVIEW COMPLETE: final reset-from-zero verification, full 45-table count inventory, lifecycle-integrity checks, idempotency, safety checks, and repository validation passed.
- Phase 3.9 artifact: `docs/database/phase-3-seed-verification.md`.
- Phase 4.1 is COMPLETE / READY FOR HUMAN REVIEW: challenge marketplace database read path implemented in `src/db/queries/challenges.ts`.
- Phase 4.1 read APIs: `listPublishedChallenges(...)` and `getPublishedChallengeBySlug(...)`.
- Phase 4.1 keeps the UI on static challenge reads until Phase 4.3; no runtime route/component migration was performed.
- Phase 4.2 is COMPLETE / READY FOR HUMAN REVIEW: challenge marketplace service and policy layer implemented in `src/services/challenge.service.ts` and `src/services/challenge-policy.ts`.
- Phase 4.2 service APIs: `listMarketplaceChallenges(...)` and `getMarketplaceChallengeBySlug(...)`.
- Phase 4.2 centralizes challenge publication, ordinary marketplace discoverability, visibility audience, `PRIVATE + HIGH_CONFIDENTIALITY` redaction, owner/managing/faculty access predicates, contact disclosure, and deterministic eligibility evaluation.
- Phase 4.2 defines `INVITE_ONLY` as hidden from ordinary marketplace methods; direct authorized invite-only access remains deferred.
- Phase 4.2 keeps authentication, full RBAC, challenge writes, applications, matching, and UI migration deferred.
- Current application lifecycle distribution is `SUBMITTED = 1`, `ASSESSMENT = 0`, `SELECTION_PENDING = 1`, `SELECTED = 5`, `REJECTED = 1`, `WITHDRAWN = 0`.
- Matching outputs, notifications, meetings, resource access services, and audit demo records remain unseeded.
- ERD v1 remains frozen; later structural DB changes require a new reviewed schema change.
- `src/db/seed/skills.ts` retains the approved taxonomy and exposes conservative seed-label resolution without semantic skill merging.

### Latest verification

- `pnpm exec tsc --noEmit` passes.
- `pnpm exec drizzle-kit check` passes.
- `pnpm db:check` passes against PostgreSQL 18.4.
- `pnpm lint` passes.
- `pnpm build` passes.
- `pnpm db:seed` refuses without `ALLOW_DB_SEED=true`.
- `NODE_ENV=production ALLOW_DB_SEED=true pnpm db:seed` refuses before writes.
- Repeated `ALLOW_DB_SEED=true pnpm db:seed` is idempotent for the complete Phase 3 seed state.
- `pnpm db:reset` recreates the complete Phase 3 seed state from an empty local Docker volume.
- Phase 3.6 validation confirms assessment/application/challenge consistency, every individual attempt has a member owner, every attempt owner belongs to the attempt application, `papp-depot` has zero assessment attempts, and downstream leakage remains zero.
- Phase 3.7 validation confirms one selection per selected application, one offer per selection, accepted offer responses by accepted leaders, pending offer response fields empty, agreement/application/challenge consistency, and no project or matching leakage.
- Phase 3.8 validation confirms accepted-offer project creation, project/application/challenge consistency, accepted-member-only project membership, app-route no-project behavior, coherent milestone review evidence, agreement-gated resource coverage, and no matching leakage.
- Phase 3.9 validation confirms all 45 domain table counts match before reset, after reset, and after a repeated guarded seed run.
- `NODE_ENV=production pnpm db:reset` refuses before destructive Docker work.
- pgvector is enabled after reset; no vector columns or vector indexes exist yet.
- Phase 4.1 query verification confirms the public list returns 8 seeded marketplace challenges; `route-optimisation` is retrievable; `merchant-churn-model` is discoverable with masked confidential owner display; and `demo-elab-venture-readiness-dashboard` returns owner = E-Lab and managing organization = E-Lab.
- Phase 4.1 query verification confirms canonical skill joins for `route-optimisation` and `merchant-churn-model`, normalized E-Lab eligibility rules, nonexistent slug -> `null`, pagination boundaries, filters, search, deterministic sorting, and Phase 3 row-count preservation.
- Phase 4.2 policy verification covers publication status, `PUBLIC_PREVIEW`/`VINUNI_ONLY`/`PRIVATE`/`INVITE_ONLY` discoverability, owner-organization access, managing-organization access, assigned-faculty access, required/optional eligibility rules, GPA scale incompatibility, school/study-year rules, and explicit available-hours rules.
- Phase 4.2 service verification confirms default VinUni marketplace list count = 8, `route-optimisation` owner = Bến Cảng Logistics and manager = CAID, `merchant-churn-model` ordinary reads redact owner/contact while admin context can see owner/contact display, E-Lab owner = manager, nonexistent slug returns `null`, `INVITE_ONLY` marketplace filter returns zero, pagination/filtering still work, and Phase 3 row counts remain unchanged.
- Current reproducible seed counts:

```text
organizations:                   7
users:                          20
organization_memberships:        7
skill_categories:                9
skills:                         58
skill_aliases:                   4
skill_relationships:             0
student_profiles:                7
faculty_profiles:                6
student_skills:                 33
challenges:                      8
challenge_skills:               26
challenge_eligibility_rules:    17
challenge_faculty_assignments:  14
challenge_reviews:               0

applications:                    8
application_members:            18
application_projects:            0
supervision_requests:            1
assessments:                     2
assessment_sections:             5
assessment_questions:           12
assessment_attempts:             2
assessment_responses:            0
assessment_scores:               2
selections:                      5
offers:                          5
agreements:                      5
projects:                        4
project_members:                10
milestones:                     15
deliverables:                   12
milestone_reviews:              20
project_resources:              10
feedback:                        0
match_results:                   0
match_skill_details:             0
match_experience_details:        0
```

Full 45-domain-table pre-reset/post-reset/post-idempotency count equality is recorded in `docs/database/phase-3-seed-verification.md`.

---

# 14. Upcoming Task

## Immediate next task

### Phase 4.3 — Challenge Marketplace UI Migration

Phase 4.2 has implemented the challenge marketplace service and policy layer. Do **not** begin Phase 4.3 until Phase 4.2 human review is approved.

After approval, Phase 4.3 should migrate the `/challenges` list/detail UI from static mock reads to the service APIs while preserving the current user-facing behavior where possible.

Immediate sequence:

```text
Phase 3.4 reset/reproducibility baseline ✅
        ↓
Phase 3.5 applications + application members + supervision ✅
        ↓
Phase 3.6 assessments ✅
        ↓
Phase 3.7 selections + offers + agreements ✅
        ↓
Phase 3.8 projects + milestones + resources + feedback ✅
        ↓
Phase 3.9 final reset/reproducibility closeout ✅
        ↓
Phase 4.1 challenge marketplace DB read path ✅
        ↓
Phase 4.2 challenge business layer ✅
        ↓
Phase 4.3 challenge marketplace UI migration after human approval
```

### Immediate Phase 4.3 checklist

- [ ] Wait for human approval of Phase 4.2 service/policy implementation
- [ ] Re-read the exact Phase 4.3 section in this plan before implementation
- [ ] Replace challenge list mock query with `listMarketplaceChallenges(...)`
- [ ] Replace challenge detail mock query with `getMarketplaceChallengeBySlug(...)`
- [ ] Preserve current UI behavior where possible and keep policy decisions out of React components
- [ ] Do not begin Phase 4.4 writes until explicitly requested

### Agent sequencing rule

The phase numbering/titles in **this file are authoritative for workflow sequencing**.

Before each agent implementation task:

1. Read `PRODUCTION_TRANSFORMATION_PLAN.md`.
2. Use the exact current phase/checkpoint number and title.
3. Do not infer or skip to a later phase because it seems logically next.
4. If a needed checkpoint is not represented here, update the plan through human review before implementation.
5. After each checkpoint, update this plan with actual work completed, verification, counts, and the exact next checkpoint.

### Recommended next agent instruction

After human approval of Phase 4.2, proceed with Phase 4.3 — Challenge Marketplace UI Migration only. Do not modify Phase 3 seed behavior, authentication, matching, notifications, audit demo records, challenge writes, or non-challenge runtime paths unless explicitly requested.

---

# 15. Work Log

Use this section after each development session.

## 2026-08-16

### Completed

- Phase 4.2 Challenge Business Layer completed and ready for human review
- Added `src/services/challenge.service.ts` with `listMarketplaceChallenges(...)` and `getMarketplaceChallengeBySlug(...)`
- Added `src/services/challenge-policy.ts` with centralized pure challenge publication, visibility/discoverability, confidentiality/redaction, owner/managing/faculty access, contact disclosure, and eligibility policies
- Added `src/services/index.ts` as the service export barrel
- Moved confidential owner-display policy out of `src/db/queries/challenges.ts` so the query layer returns normalized organization joins and the service layer applies marketplace disclosure
- Verified service behavior against the Phase 3 seed: default VinUni marketplace count, route owner/manager, merchant confidential redaction/admin reveal, E-Lab owner/manager, nonexistent slug, invite-only exclusion, pagination, filtering, and zero row-count mutation
- Verified pure policy behavior for publication states, visibility matrix, owner/managing/faculty predicates, required/optional eligibility rules, GPA scale incompatibility, school/study-year exact matching, and explicit available-hours handling
- Updated `docs/database/challenge-read-path.md` with query/service responsibilities, policy matrix, disclosure rules, eligibility evaluator semantics, deferred auth/RBAC boundaries, and Phase 4.3 consumption guidance
- Phase 4.1 Challenge Marketplace Read Path completed and ready for human review
- Added `src/db/queries/challenges.ts` with typed challenge list/detail read models, `listPublishedChallenges(...)`, and `getPublishedChallengeBySlug(...)`
- Added `src/db/queries/index.ts` as the query export barrel
- Implemented public marketplace read semantics for `PUBLISHED`/`APPLICATIONS_OPEN` challenges with `PUBLIC_PREVIEW`, `VINUNI_ONLY`, or `PRIVATE` visibility, excluding draft/review/invite-only rows from the default read
- Preserved confidential discoverability for `merchant-churn-model` while masking the public owner display for `PRIVATE + HIGH_CONFIDENTIALITY`
- Joined owner and managing organizations separately, preserved normalized challenge skills, retrieved normalized eligibility rules, and kept faculty assignments detail-only
- Derived `applicantCount` through `COUNT(applications)` instead of adding a stored counter
- Added bounded page-based pagination, deterministic sorting, conservative relational search, and filters for subtype, compensation type, work mode, visibility, domain, school eligibility, canonical skill, and owner organization name
- Avoided N+1 and Cartesian duplication by using set-based child queries for skills/eligibility and separate detail-only faculty/contact queries
- Added `docs/database/challenge-read-path.md` documenting query APIs, read semantics, shapes, pagination, filters, sorting, UI field mapping, and Phase 4.2 deferrals
- Verified Phase 4.1 query behavior against the Phase 3 seed: default list count, route retrieval, confidential merchant handling, E-Lab owner/manager, skill joins, eligibility rules, nonexistent slug, pagination, filters, search, and sorting
- Preserved existing UI/static challenge runtime behavior; Phase 4.3 still owns `/challenges` UI migration
- Phase 3.9 final seed verification and closeout completed
- Created `docs/database/phase-3-seed-verification.md` with canonical authority, reset workflow, migration facts, full 45-table count matrix, lifecycle integrity results, deferred-zero tables, idempotency, safety checks, validation commands, known limitations, and Phase 4 readiness conclusion
- Verified pre-reset, post-reset, and post-idempotency counts match across all 45 public domain tables
- Verified `pnpm db:reset` recreates the complete Phase 3 dataset from an empty local Docker volume using version-controlled migration plus guarded seed only
- Verified migration replay recreates pgvector, 45 public domain tables, 41 public enums, 82 foreign keys, 35 PostgreSQL CHECK constraints, 11 partial indexes, one Drizzle migration journal row, and zero vector columns/indexes
- Verified compact lifecycle spine: public route challenge, confidential merchant challenge, E-Lab owner/manager challenge, triage rejection, route pending invite/pending offer/no project, churn reviewed assessment, outreach supervision request, supply active project, energy final review, archive completion, and depot partner approval
- Verified application/team, assessment, selection/offer/agreement, project/member/milestone/review/resource, agreement-gated access, feedback-zero, matching-zero, and deferred-zero invariants
- Verified seed safety refusals for `pnpm db:seed` without opt-in and `NODE_ENV=production ALLOW_DB_SEED=true pnpm db:seed`
- Verified reset safety refusal for `NODE_ENV=production pnpm db:reset`
- Validation passed: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm db:check`, `pnpm exec drizzle-kit check`, `pnpm build`, and `git diff --check`
- Updated `docs/database/demo-seed-manifest.md`, `docs/database/seed-transformation-plan.md`, and this plan with final Phase 3 counts, verification status, deferrals, and Phase 4.1-after-human-approval handoff
- Human-reviewed Phase 3.4 and corrected the roadmap so Phase 3 does not jump prematurely to Phase 4
- Added explicit Phase 3.5–3.9 checkpoints for application/team, assessment, selection/offer/agreement, project/workspace, and final seed closeout
- Established that `PRODUCTION_TRANSFORMATION_PLAN.md` phase numbering/titles are authoritative for agent task sequencing
- Phase 3.4 local reset workflow implemented and verified
- Added `pnpm db:reset` as the canonical destructive LOCAL DEVELOPMENT ONLY reset command
- `pnpm db:reset` safety checks refuse production, refuse arguments, require the repository Docker Compose `vinuni-solution-studio-db` service, and only allow localhost `solution_studio`
- Reset workflow executes `docker compose down -v`, `docker compose up -d`, waits for PostgreSQL health, runs `pnpm db:migrate`, and runs `ALLOW_DB_SEED=true pnpm db:seed`
- Pre-reset database counts matched the expected Phase 3.3 state before destroying the local volume
- Migration-from-zero verification confirmed pgvector, 45 domain tables, 41 enums, 82 foreign keys, 35 PostgreSQL CHECK constraints, 11 partial indexes, and one migration journal row
- Seed-from-zero verification confirmed the Phase 3.3 state was recreated exactly
- Post-reset repeated seed execution kept all counts unchanged
- Representative post-reset challenge queries verified `route-optimisation`, private/high-confidentiality `merchant-churn-model`, CAID-managed external challenge ownership, E-Lab owner/manager routing, challenge skill canonical joins, eligibility rules, and faculty assignments
- Phase 3.4 confirmed no downstream workflow leakage into applications, assessments, selections/offers, projects, milestones, or matching outputs
- Phase 3.3 DEMO challenge-side foundation implemented and documented
- Seeded compact challenge records for `merchant-churn-model`, `route-optimisation`, `triage-protocol-review`, `community-health-outreach`, `supply-chain-dashboard`, `campus-energy-audit`, `archive-digitisation`, and synthesized `demo-elab-venture-readiness-dashboard`
- Seeded 26 normalized challenge skill requirements, 17 eligibility rules, and 14 pending faculty routing assignments
- Intentionally seeded zero `challenge_reviews`; no durable static review history was invented
- Verified Phase 3.3 seed idempotency with repeated `ALLOW_DB_SEED=true pnpm db:seed`
- Verified Phase 3.3 relationship queries for public/VinUni marketplace rows, confidential merchant ownership, CAID management, E-Lab owner/manager routing, canonical skill joins, eligibility rules, and faculty assignment joins
- Verified Jordan Lee passes the synthesized E-Lab `MIN_GPA = 3.5` eligibility sanity check
- Verified Phase 3.3 did not seed applications, application members, supervision requests, assessments, selections/offers, agreements, projects, milestones, matching records, notifications, or audit logs
- Phase 3.5 DEMO application and team foundation implemented and documented
- Added `src/db/seed/applications.ts` for deterministic compact application, application-member, and supervision-request seeding
- Wired Phase 3.5 seeding into the guarded transaction after DEMO challenges
- Seeded 8 compact applications, 18 application members, 0 application-project evidence links, and 1 pending supervision request
- Preserved exactly one accepted leader per application and `submitted_by` as an application member
- Preserved solo `app-triage`, pending-invite `app-route`, provider-side `papp-depot`, and pending supervision `app-outreach + inv-outreach`
- Staged application statuses before downstream rows: `SUBMITTED = 1`, `ASSESSMENT = 1`, `SELECTION_PENDING = 6`
- Verified no Phase 3.6-3.8 leakage into assessments, selections/offers, agreements, projects, milestones/resources/feedback, or matching outputs
- Verified guarded seed idempotency before reset, `pnpm db:reset` reproduction from zero, and post-reset seed idempotency
- Updated `docs/database/demo-seed-manifest.md`, `docs/database/seed-transformation-plan.md`, and this plan with Phase 3.5 counts, mappings, and next checkpoint
- Validation passed: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm db:check`, `pnpm exec drizzle-kit check`, and network-enabled `pnpm build`
- Phase 3.6 DEMO assessment layer implemented and documented
- Added `src/db/seed/assessments.ts` for deterministic assessment definitions, sections, questions, attempts, and qualitative scores
- Wired Phase 3.6 seeding into the guarded transaction after DEMO applications
- Seeded 2 assessments, 5 sections, 12 questions, 2 reviewed individual attempts, 0 responses, and 2 qualitative score records
- Preserved question ownership through sections and stored MCQ/coding configuration in JSONB
- Linked every individual attempt to the correct accepted application member and verified assessment/application/challenge consistency
- Transitioned `app-triage` from `ASSESSMENT` to `REJECTED` only after its failed reviewed assessment result exists
- Kept `app-churn` at `SELECTION_PENDING` after its passing reviewed assessment
- Deferred ambiguous provider/team assessment results such as `papp-depot`
- Verified no Phase 3.7-3.8 leakage into selections/offers, agreements, projects, milestones/resources/feedback, or matching outputs
- Verified guarded seed idempotency before reset, `pnpm db:reset` reproduction from zero, and post-reset seed idempotency through Phase 3.6
- Updated `docs/database/demo-seed-manifest.md`, `docs/database/seed-transformation-plan.md`, and this plan with Phase 3.6 counts, mappings, deferrals, and next checkpoint
- Phase 3.7 DEMO selections, offers, and agreements layer implemented and documented
- Added `src/db/seed/offers.ts` for deterministic selections, durable offers, accepted-leader offer responses, and individual NDA agreements
- Wired Phase 3.7 seeding into the guarded transaction after DEMO assessments
- Seeded 5 selections and 5 offers for `app-route`, `app-supply`, `app-energy`, `app-archive`, and `papp-depot`
- Preserved `app-route` as `SELECTED` with one pending offer, no response actor/time, one invited member, no agreements, and no project
- Seeded 4 accepted offers for `app-supply`, `app-energy`, `app-archive`, and `papp-depot`, with `responded_by` set to the accepted application leader
- Seeded 5 individual NDA agreements only for accepted restricted/NDA scenarios: three accepted `app-supply` members and two accepted `papp-depot` members
- Preserved `app-triage` as `REJECTED`, `app-churn` as `SELECTION_PENDING`, and `app-outreach` as `SUBMITTED`
- Verified no Phase 3.8+ leakage into projects, project members, milestones, deliverables, milestone reviews, project resources, feedback, matching outputs, notifications, or audit logs
- Verified guarded seed idempotency before reset, `pnpm db:reset` reproduction from zero, and post-reset seed idempotency through Phase 3.7
- Updated `docs/database/demo-seed-manifest.md`, `docs/database/seed-transformation-plan.md`, and this plan with Phase 3.7 counts, mappings, deferrals, and next checkpoint
- Phase 3.8 DEMO project/workspace layer implemented and documented
- Added `src/db/seed/projects.ts` for deterministic accepted-offer project, project-member, milestone, deliverable, formal review, resource, and conservative feedback seeding
- Wired Phase 3.8 seeding into the guarded transaction after DEMO selections/offers/agreements
- Seeded 4 projects for accepted-offer scenarios only: `app-supply`, `app-energy`, `app-archive`, and `papp-depot`
- Preserved `projects.application_id` as canonical origin and derived challenge context through `project -> application -> challenge`
- Preserved `app-route` as selected with a pending offer, one invited member, no agreements, and no project
- Seeded 10 project members from accepted application members only; no invited member became a project member
- Seeded 15 milestones, 12 `TEXT` deliverables, 20 formal milestone reviews, 10 resource metadata rows, and 0 feedback rows
- Preserved `ACTIVE`, `FINAL_REVIEW`, `COMPLETED`, and partner-approval workflow project coverage
- Validated completed milestone dual approvals, final-review pending partner review, restricted-resource agreement coverage, faculty supervisor capacity, no stored `OVERDUE`, no formal review feedback, and no matching leakage
- Verified guarded seed idempotency before reset, `pnpm db:reset` reproduction from zero, and post-reset seed idempotency through Phase 3.8
- Updated `docs/database/demo-seed-manifest.md`, `docs/database/seed-transformation-plan.md`, and this plan with Phase 3.8 counts, mappings, deferrals, and next checkpoint
- Phase 3.2 compact DEMO identity and organization foundation implemented
- `docs/database/demo-seed-manifest.md` created as the authoritative compact DEMO inventory
- Exact compact scenario spine selected: route, churn, triage, outreach, supply, energy, archive, depot, and synthesized E-Lab challenge coverage
- Ambiguous `org-vinai` fixture excluded and `route-optimisation` selected for public technical challenge coverage
- DEMO seed now inserts selected organizations, contacts, students, faculty, student/faculty profiles, contact memberships, and student skill claims only
- Student skill claims resolve to the frozen Phase 3.1 canonical taxonomy; no new skills, skill relationships, or embeddings are generated
- Phase 3.2 intentionally seeds no challenges, applications, assessments, selections/offers, projects, milestones, matching records, notifications, or audit demo records
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
- Remaining REVIEW item limited to optional approved skill relationships
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

After human approval of Phase 4.2, proceed with Phase 4.3 — Challenge Marketplace UI Migration only. Do not begin Phase 4.4 writes.

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

**Destructive — LOCAL DEVELOPMENT ONLY. Removes the PostgreSQL volume and all local DB data.**

Canonical command:

```bash
pnpm db:reset
```

The verified reset workflow performs:

```text
docker compose down -v
docker compose up -d
wait for PostgreSQL health
pnpm db:migrate
ALLOW_DB_SEED=true pnpm db:seed
```

The reset script refuses production, refuses arguments, verifies the repository Docker Compose DB service, and only allows the approved local `solution_studio` target.

Do not put destructive reset behavior inside `pnpm db:seed`.

## Seed development data

Non-destructive/idempotent guarded seed:

```bash
ALLOW_DB_SEED=true pnpm db:seed
```

Running `pnpm db:seed` without the explicit opt-in must refuse before writes.

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
21. `pnpm db:reset` is the canonical destructive LOCAL DEVELOPMENT reset; `pnpm db:seed` remains non-destructive/idempotent.
22. Every Phase 3.5+ seed checkpoint must preserve reset → migrate → seed reproducibility from zero.
23. `PRODUCTION_TRANSFORMATION_PLAN.md` is authoritative for implementation phase/checkpoint sequencing; agents must not invent, skip, or renumber checkpoints silently.
24. After each major checkpoint, update this plan with actual completion status, verification results, counts, current blocker, and exact next checkpoint.

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

- [ ] Read `PRODUCTION_TRANSFORMATION_PLAN.md` before each implementation checkpoint and follow its exact phase number/title
- [ ] Do not infer, skip, or silently renumber roadmap checkpoints
- [ ] Update `PRODUCTION_TRANSFORMATION_PLAN.md` after major checkpoints with actual status and next task
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
- [ ] Complete compact development data is reproducible from migrations + seed via `pnpm db:reset`
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
