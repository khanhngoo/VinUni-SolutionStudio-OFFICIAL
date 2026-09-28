# VinUni Solution Studio — Production Transformation Plan

**Repository:** `VinUni-SolutionStudio-OFFICIAL`
**Project:** VinUniversity Solution Studio / AI-in-Action Platform
**Last updated:** 2026-09-28
**Current phase:** Phase 6.6.4 complete / ready for human review — Phase 6.6.5 awaits explicit human approval

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
Local containerized development
   ↓
Phase 6.6 — End-to-End Workflow Closure & Production-Readiness Remediation
   ↓
Human review + Playwright multi-role E2E acceptance
   ↓
Phase 7 skill + semantic matching (DEFERRED; optional later resumption)
   ↓
Phase 8 staging + production deployment (after Phase 6.6 acceptance;
Phase 7 is not a prerequisite)
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
├── Dockerfile                             # Phase 6.5 local development container
├── docker-compose.yml                     # `db` + optional-profile `app` service
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
| Phase 4 | Challenge marketplace → real DB | ✅ Complete / human review complete |
| Phase 5 | Applications, assessments, offers, workspace → real DB | ✅ Complete / human review complete |
| Phase 6 | Authentication + RBAC | ✅ Complete / ready for final human review |
| Phase 6.5 | Local containerized development | ✅ Complete / ready for human review |
| Phase 6.6 | End-to-End Workflow Closure & Production-Readiness Remediation | 🟡 6.6.4 complete / ready for human review; 6.6.5 awaits approval |
| Phase 7 | Skill + semantic matching | ⏸ Deferred / not required for initial near-production release |
| Phase 8 | Staging + production deployment | ⬜ Not started; follows Phase 6.6 human review and E2E acceptance, independently of Phase 7 |

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

- [x] Replace challenge list mock query
- [x] Replace challenge detail mock query
- [x] Preserve current UI where possible
- [x] Add loading/error-safe route behavior where appropriate
- [x] Add empty state
- [x] Add database error handling
- [x] Verify static and DB-backed visual behavior match

### Phase 4.3 actual results

- Migrated `src/app/challenges/page.tsx` from static challenge helpers to `listMarketplaceChallenges(...)`.
- Migrated `src/app/challenges/[id]/page.tsx` from static challenge helpers to `getMarketplaceChallengeBySlug(...)`, using the dynamic segment value as the canonical challenge slug.
- Added `src/lib/challenge-marketplace.ts` as a UI presentation/helper boundary for URL filter parsing, service-option mapping, href construction, and display formatting.
- Added a temporary pre-auth marketplace context with `audience: "VINUNI_MEMBER"`; the UI no longer hard-codes Jordan Lee as the marketplace viewer.
- Updated marketplace cards, filter rail, results header, pagination, detail header, summary, eligibility, and assessment display components to consume service-backed marketplace models.
- Preserved the current marketplace visual structure where practical while replacing fixture-derived fields with normalized PostgreSQL-backed fields.
- Preserved confidential marketplace redaction: ordinary reads for `merchant-churn-model` show the masked owner label and do not render the confidential owner organization name or contact.
- Preserved CAID/E-Lab organization semantics in the UI: owner and managing organization display remain separate, and the synthesized E-Lab demo challenge renders E-Lab as both owner and manager.
- Preserved downstream write boundaries: `/challenges/[id]/apply` remains the static MVP application flow; no application, assessment, offer, project, matching, auth, or RBAC runtime migration was performed.
- Added a challenge route error boundary with user-safe database/unavailable-state copy.
- Retained true invalid-slug 404 behavior; a segment-level loading boundary was not kept because it caused streamed not-found responses to return HTTP `200`.
- Documented Phase 4.3 runtime UI flow, URL filter mapping, caching/rendering behavior, remaining static boundaries, and local route verification in `docs/database/challenge-read-path.md`.

## 4.4 Write operations

When challenge creation/editing is introduced:

- [x] Create challenge
- [x] Update challenge
- [x] Add/remove required skills
- [x] Replace/update eligibility rules
- [x] Submit for review
- [x] Approve/reject/revise workflow
- [x] Assign/reroute faculty where supported
- [x] Validate writes server-side
- [x] Use transactions for multi-table writes

### Phase 4.4 actual results

- Added `src/db/mutations/challenges.ts` and `src/db/mutations/index.ts` as the challenge-only Drizzle mutation boundary.
- Added `src/services/challenge-write.service.ts` and exported its APIs through `src/services/challenge.service.ts`.
- Implemented server-side challenge write operations for draft creation, draft/revision update, skill replacement, eligibility-rule replacement, submit-for-review, review decision, publish-approved, and faculty routing replacement.
- Kept all writes behind explicit service functions; React components do not import Drizzle, the PostgreSQL pool, mutation helpers, or `DATABASE_URL`.
- Added development-only actor lookup through existing seeded users and memberships: Bến Cảng contact, CAID admin, and E-Lab admin. This is temporary verification context, not fake authentication or a universal super-admin bypass.
- Authorized owner-side writes through active owner-organization membership with `ADMIN` or `CONTACT_PERSON`.
- Authorized managing-side review/publish/routing through active managing-organization membership with `ADMIN`, `PROJECT_MANAGER`, or `REVIEWER`.
- Preserved CAID/E-Lab organization separation and explicitly verified CAID cannot manage an E-Lab-managed challenge without E-Lab membership.
- Created challenge drafts with initial status `DRAFT`; creation does not auto-submit, approve, or publish.
- Preserved lifecycle actions as separate service operations: `DRAFT/REVISION_REQUESTED -> SUBMITTED`, `SUBMITTED/UNDER_REVIEW -> APPROVED/REVISION_REQUESTED/CANCELLED`, and `APPROVED -> APPLICATIONS_OPEN`.
- Inserted durable `challenge_reviews` rows for managing-unit review decisions while keeping approval and publish as separate lifecycle steps.
- Validated required content, positive workload/team values, team-size ordering, date chronology, owner/managing organization authority, slug collisions, canonical skill resolution, duplicate skills, skill weights, faculty profile existence, and known eligibility-rule config shapes.
- Kept skill writes normalized to existing canonical active `skills` rows; Phase 4.4 does not create canonical skills, aliases, relationships, candidates, embeddings, or matching outputs.
- Added `scripts/verify-challenge-writes.ts`, which exercises successful and failing write paths inside a transaction and rolls everything back with a sentinel so the Phase 3 compact seed remains unchanged.
- Documented write architecture, operation semantics, authorization, validation, lifecycle transitions, rollback verification, caching notes, and deferred UI/auth boundaries in `docs/database/challenge-write-path.md`.
- Preserved Phase 4 scope: no application, assessment, offer, agreement, project, workspace, matching, auth/RBAC, notification, audit, schema, migration, or seed changes were made.

## Phase 4 exit criteria

- [x] Challenge marketplace no longer depends on `src/lib/data`
- [x] Challenge reads come from PostgreSQL
- [x] Core challenge writes are transaction-safe
- [x] Business rules are outside React components
- [x] Phase 4 remains challenge-domain only and stops before Phase 5

---

# 9. Phase 5 — Database-Back Applications, Assessments, Offers, Workspace

## Goal

Move the rest of the main workflow from static/mock state into PostgreSQL.

## 5.1 Applications

- [x] Create application query module
- [x] Create application service
- [x] Submit application
- [x] Prevent duplicate application
- [x] Validate challenge availability
- [x] Validate deadline
- [x] Validate student eligibility
- [x] Store application status history if required by ERD: not required by frozen ERD v1; no status-history table was added
- [x] Query applications by student
- [x] Query applications by challenge
- [x] Query applications for faculty/partner/admin views

### Phase 5.1 actual results

- Added PostgreSQL-backed application read queries in `src/db/queries/applications.ts` and exported them through `src/db/queries/index.ts`.
- Added application mutation helpers in `src/db/mutations/applications.ts` and exported them through `src/db/mutations/index.ts`.
- Added `src/services/application.service.ts` and `src/services/application-policy.ts` as the server-side application business/access boundary.
- Added `docs/database/application-runtime-path.md` documenting application runtime architecture, access policy, submission policy, team invariants, lifecycle boundaries, verification, and deferred UI/downstream work.
- Added `scripts/verify-application-runtime.ts` for rollback-based runtime verification against the compact Phase 3 seed data.
- Implemented reads by student, challenge slug, application public ID, and current-student challenge membership lookup.
- Implemented application creation as one transaction that inserts `applications.status = SUBMITTED`, the accepted leader member, and accepted/invited teammate rows.
- Enforced server-side actor ownership for `submitted_by`; clients cannot supply authoritative actor, `submitted_by`, inviter, or internal student/user IDs.
- Enforced challenge availability, server-side deadline checks, leader eligibility, team-size bounds, duplicate member prevention, duplicate challenge-application prevention, and committed-hours validation.
- Preserved the frozen ERD v1 application/team model: one `applications` row plus normalized `application_members`; no separate solo/team/provider application tables were introduced.
- Kept `application_projects` unused because transcript/portfolio evidence conversion remains intentionally deferred.
- Kept assessment writes, selection/offer writes, agreement writes, project/workspace writes, matching, authentication/RBAC, notifications, and audit flows deferred to later checkpoints.
- Existing application-related UI routes remain on static fixtures in Phase 5.1 because they currently mix application state with assessment, offer, project, meeting, milestone, and workspace fixture data.
- Verification passed with Phase 3 counts preserved: `applications = 8`, `application_members = 18`, `application_projects = 0`, `supervision_requests = 1`, `assessments = 2`, `assessment_attempts = 2`, `assessment_scores = 2`, `assessment_responses = 0`, `selections = 5`, `offers = 5`, `agreements = 5`, `projects = 4`, and `match_results = 0`.

## 5.2 Assessments

- [x] Persist assessment definitions
- [x] Persist assessment attempts/submissions
- [x] Persist scores/results
- [x] Define attempt rules
- [x] Define access rules
- [x] Connect assessment status to application pipeline

### Phase 5.2 actual results

- Added PostgreSQL-backed assessment read queries in `src/db/queries/assessments.ts` and exported them through `src/db/queries/index.ts`.
- Added assessment mutation helpers in `src/db/mutations/assessments.ts` and exported them through `src/db/mutations/index.ts`.
- Added `src/services/assessment.service.ts` as the server-side assessment business/access/lifecycle/validation boundary.
- Added `src/app/assessment/[applicationId]/actions.ts` as a thin server-action boundary for start, save-response, and submit operations.
- Added `src/lib/assessment-development.ts` for the explicit temporary pre-auth development student context.
- Migrated `/assessment/[applicationId]`, `/assessment/[applicationId]/take`, and `/assessment/[applicationId]/result` from static fixture authority to the Assessment Service and PostgreSQL.
- Updated assessment runners to consume safe service-backed question models and server actions while preserving the existing preflight, lockdown, cognitive, technical, and result UI concepts.
- Preserved the frozen hierarchy `assessments -> assessment_sections -> assessment_questions`; `assessment_questions.assessment_id` was not reintroduced.
- Implemented INDIVIDUAL runtime ownership: the actor must be an accepted application member, and the attempt must belong to that member.
- Deferred TEAM assessment start/save/submit semantics because no seeded/UI scenario requires them yet.
- Implemented attempt lifecycle rules for `IN_PROGRESS -> SUBMITTED`, idempotent start while in progress, repeated-submit denial, and edit denial after `SUBMITTED` or `REVIEWED`.
- Implemented response validation for `MULTIPLE_CHOICE`, `CODING`, and text-like responses; no score/reviewer/pass-fail payload is accepted from students.
- Implemented service-level response upsert for one logical response per attempt/question because the frozen schema has no `(attempt_id, question_id)` uniqueness constraint.
- Added a safe student question mapper that strips MCQ `correctIndex` and never serializes raw question config to the browser.
- Read reviewed result bands from `assessment_scores.rubric_scores`, preserving `overall_score = NULL` without fabricating numeric scores.
- Kept reviewer scoring writes, automatic MCQ scoring, code execution, attachments, proctoring persistence, application outcome transitions, selections/offers/agreements, projects/workspace, matching, auth/RBAC, notifications, audit, schema, migration, and seed work deferred.
- Added `scripts/verify-assessment-runtime.ts` for rollback-based verification against compact Phase 3 seed data.
- Added `docs/database/assessment-runtime-path.md` documenting assessment runtime architecture, APIs, scope, ownership, lifecycle, response validation, answer-key protection, UI migration, deferrals, static-reference classification, and verification.
- Verification passed with canonical counts preserved: `applications = 8`, `application_members = 18`, `assessments = 2`, `assessment_sections = 5`, `assessment_questions = 12`, `assessment_attempts = 2`, `assessment_responses = 0`, `assessment_scores = 2`, `selections = 5`, `offers = 5`, `agreements = 5`, `projects = 4`, and `match_results = 0`.

## 5.3 Offers

- [x] Persist offers
- [x] Persist offer status
- [x] Accept offer transaction
- [x] Reject offer transaction
- [x] Prevent conflicting states
- [ ] Create project/project membership when appropriate (deferred to Phase 5.4 Workspace)

Phase 5.3 is COMPLETE / READY FOR HUMAN REVIEW. `/offer/[applicationId]` now
uses PostgreSQL-backed offer reads through `offer -> selection -> application
-> challenge`, browser-facing application public IDs, a server-side offer
service, and a status-constrained offer mutation. Only an accepted application
leader can respond. Pending expiration is derived from `respond_by`; terminal
offers cannot be reversed. Offer response stores server-owned responder/time,
does not alter the selection or application status, does not provision projects,
and does not accept individual agreements. The rollback verifier preserves the
canonical seed, including `app-route` as the pending offer scenario.

## 5.4 Workspace

- [x] Define workspace-backed entities
- [x] Persist project membership
- [x] Persist project status
- [x] Persist relevant project metadata
- [x] Replace workspace mock state
- [x] Define visibility by role

Phase 5.4 is COMPLETE / READY FOR HUMAN REVIEW. `/workspace` and
`/workspace/[applicationId]` now use the PostgreSQL project query/service path,
the normalized `project_members`, milestones, deliverables, milestone reviews,
and resources. Workspace access is enforced by explicit development actor
contexts before Phase 6: project member, authoritative project supervisor, or
appropriate active owner/managing-organization membership. Agreement-gated
student resources require a current accepted agreement. No workspace write,
schema, migration, or seed change was introduced.

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

- [x] Define transaction boundaries
- [x] Test rollback behavior
- [x] Prevent partial lifecycle transitions

## Phase 5 exit criteria

- [x] Main platform workflow is database-backed
- [x] Applications are persistent
- [x] Assessments are persistent
- [x] Offers are persistent
- [x] Workspace/project state is persistent
- [x] Important multi-table operations are transactional

---

# 10. Phase 6 — Authentication + Role-Based Access Control

## Goal

Replace assumed/static user roles with real identity and authorization.

## 6.1 Authentication architecture — COMPLETE / HUMAN REVIEW COMPLETE

- [x] Select Auth.js with JWT/session-cookie strategy and Microsoft Entra ID OIDC for production
- [x] Document VinUniversity SSO feasibility and institutional prerequisites
- [x] Define a strict non-production seeded development authentication provider
- [x] Add server-side session → existing `users` identity resolution
- [x] Deny unmapped/inactive identities without auto-provisioning or token-based roles

Post-Phase-6 internal-demo extension (2026-09-06): an explicitly gated
email/password provider now supports self-service creation of an ACTIVE base
`users` identity. This is deliberate signup, not provider-login
auto-provisioning. It creates no student/faculty profile, organization,
membership, or role, so the established authorization model is unchanged.
Credentials are stored separately in `user_credentials` by migration 0005 and
the feature defaults off unless `AUTH_SELF_SERVICE_ENABLED=true`. This is not
Phase 7 work or a production-ready public authentication rollout.

Post-Phase-6 deployment preparation (2026-09-26): optional Google OIDC sign-in
is available when its client credentials are configured. It requires a verified
Google email mapped to an existing ACTIVE `users` row and creates no user or
role. Public account onboarding remains a separate review decision.

## 6.2 Roles

Expected roles to validate against ERD/business requirements:

- [x] Student
- [x] Faculty
- [x] Partner representative
- [x] CAID admin
- [x] E-Lab admin
- [x] No additional system/admin role required by ERD v1

Phase 6.2 is COMPLETE / HUMAN REVIEW COMPLETE. Server-side authenticated actor
resolution derives profiles and active organization memberships from PostgreSQL,
preserving organization ID, organization type, and membership role together.
CAID/E-Lab administration remains an organization-scoped `ADMIN` membership;
no global role, JWT role claim, schema change, or authorization enforcement is
introduced. See `docs/security/role-model.md`.

## 6.3 Authorization

- [x] Centralize role checks
- [x] Define permissions matrix
- [x] Enforce authorization server-side
- [x] Protect route handlers/server actions
- [x] Protect database writes
- [x] Prevent partner access to other organizations' private resources
- [x] Ensure CAID/E-Lab ownership boundaries are respected
- [x] Ensure students cannot access faculty/admin functions

Phase 6.3 is COMPLETE / READY FOR HUMAN REVIEW. DB-backed marketplace,
assessment, offer, and workspace runtime boundaries resolve the Auth.js
session to the PostgreSQL-backed authenticated actor server-side. Domain
services retain resource authorization based on application/project membership,
authoritative organization IDs, faculty supervision, and attempt ownership.
External partner authentication does not grant generic `VINUNI_ONLY` discovery;
CAID and E-Lab authority remains organization-scoped. No schema, migration, or
seed changes were introduced. See `docs/security/authorization-matrix.md`.

## 6.4 Security baseline

- [x] Secure cookies/session settings
- [x] CSRF considerations
- [x] Input validation
- [x] Rate limiting plan
- [x] Audit-sensitive operations
- [x] Do not expose database credentials to browser
- [x] Verify `.env` secrets are not committed

Phase 6.3 — Authorization is COMPLETE / HUMAN REVIEW COMPLETE. Phase 6.4 —
Security baseline is COMPLETE / READY FOR HUMAN REVIEW. Auth.js HTTPS cookie
defaults, Auth.js CSRF flow, same-origin Server Action protection, service-owned
validation and authorization, secret/browser separation, and Git environment
hygiene are verified. Production rate limiting and `audit_logs` writes remain
deployment/later-work boundaries documented in `docs/security/security-baseline.md`.

## Phase 6 exit criteria

- [x] Real authentication works
- [x] Users map correctly to database records
- [x] RBAC is enforced server-side
- [x] Unauthorized operations are blocked regardless of frontend UI state

Phase 6 is COMPLETE / READY FOR FINAL HUMAN REVIEW. Historical handoff was
Phase 6.5 — Local containerized development. The current handoff is Phase 6.6
after human review of this roadmap amendment; Phase 7 is deferred.

---

# 10.5. Phase 6.5 — Local Containerized Development

## Goal

Make local development reproducible as one containerized Docker Compose environment in which the Next.js application runs as a single `app` service alongside the existing `db` service, while fully preserving the current host-based `pnpm dev` workflow.

Phase 6.5 is intentionally a small bounded checkpoint recorded before Phase 7. It covers **local development infrastructure only** and must not silently pull Phase 8 production deployment work forward.

Both development workflows must work after this checkpoint:

```bash
# Fast host development (unchanged)
pnpm dev

# Fully containerized local development
docker compose --profile app up --build
```

The `app` service lives behind an optional Compose profile so that bare `docker compose up -d` — used by `pnpm db:up` and inside `pnpm db:reset` — continues to start only `db`.

## 6.5.1 Application development Dockerfile

- [x] Read the relevant guides under `node_modules/next/dist/docs/` before writing dev-server/container configuration; do not assume older Next.js conventions
- [x] Create a `Dockerfile` for the Next.js application's local development mode only
- [x] Base the image on Node 20 with pnpm provided through corepack, consistent with repository tooling
- [x] Install dependencies with pnpm inside the image/container
- [x] Run the Next.js development server bound so it is reachable from the host on port 3000
- [x] Do not add production hardening, multi-stage production builds, or standalone output in this phase
- [x] Do not copy `.env*` files or any secrets into image layers

## 6.5.2 Compose `app` service

- [x] Update the existing `docker-compose.yml` (filename kept; see 6.5.6) to add an `app` service alongside the existing `db` service
- [x] Keep the Next.js application one service; do not split frontend/backend containers
- [x] Publish the application on host port 3000
- [x] Add `depends_on` with `condition: service_healthy` against the existing `pg_isready` db health check
- [x] Put `app` behind an optional Compose profile so bare `docker compose up -d` still starts only `db`
- [x] Verify `pnpm db:up`, `pnpm db:down`, `pnpm db:logs`, and `pnpm db:reset` behavior is unchanged

## 6.5.3 Source bind mount and node_modules volume

- [x] Bind-mount the repository source into the `app` container
- [x] Use a separate named container volume for `node_modules` so host and container installs do not collide
- [x] Verify hot reload works through the bind mount under OrbStack
- [x] Document that `docker compose down -v` (run by `pnpm db:reset`) also removes the container `node_modules` volume; the cost is a dependency reinstall on next build/start, not data loss

## 6.5.4 Environment wiring

- [x] Provide environment values to the `app` container at runtime (`env_file`/`environment`), never by baking secrets into the image
- [x] Point the in-container `DATABASE_URL` at the `db` service hostname (`db:5432`), not `localhost`, without breaking the host-workflow `localhost:5432` value
- [x] Update `.env.example` guidance to document the host form and the container form
- [x] Keep `.env*` gitignored; only `.env.example` remains committed

## 6.5.5 Documented commands

- [x] Document containerized build, start, logs, stop, in-container migrations, and guarded seeding; expected shape to verify at implementation:

```bash
docker compose --profile app build
docker compose --profile app up --build
docker compose logs -f app
docker compose --profile app down
docker compose exec app pnpm db:migrate
docker compose exec -e ALLOW_DB_SEED=true app pnpm db:seed
```

- [x] Optionally add a `pnpm dev:docker` wrapper script for the containerized workflow
- [x] Update Section 16 (Development Command Reference) and `README.md` with the verified commands

## 6.5.6 Existing guard/script compatibility

- [x] Keep the Compose filename `docker-compose.yml`; `scripts/db-reset.ts` validates that exact filename and must remain untouched and passing
- [x] Verify `pnpm db:reset` still resets, migrates, and seeds from zero with the `app` service defined
- [x] Verify host `pnpm dev` remains fully functional and unaffected

## Phase 6.5 not in scope

- Separate frontend/backend containers — the Next.js app remains one service
- Production image hardening, HTTPS, managed DB networking, CI/CD, monitoring, WAF, or cloud deployment (Phase 8, unchanged)
- Schema, migration, seed, auth, or Phase 7 changes

## Phase 6.5 exit criteria

- [x] `docker compose --profile app up --build` serves the app on `localhost:3000` against the containerized database
- [x] Hot reload works through the source bind mount
- [x] Migrations and guarded seeding run from inside the container
- [x] Host `pnpm dev` and every existing `db:*` script behave exactly as before
- [x] No secrets are baked into image layers
- [x] Containerized commands are documented in Section 16 and `README.md`
- [ ] Human review of Phase 6.5 and the amended roadmap is completed before Phase 6.6.0 implementation begins

---

# 10.6. Phase 6.6 — End-to-End Workflow Closure & Production-Readiness Remediation

## Goal and boundaries

Move from a tour of seeded downstream states to a near-production, authorized
action path: challenge draft/review/publish → legitimate student access and
application → supervision request/response → assessment submission and grading
→ application progression → partner selection and offer → leader acceptance →
project/member provisioning → milestone decisions and close-out. A state shown
as an actionable product step must be reachable and persisted through runtime
actions, not only through `pnpm db:reset` fixtures. Historical/negative seed
scenarios may remain when clearly labelled and internally coherent.

This is a **planned** checkpoint, not approval to implement it. Proceed through
6.6.0–6.6.9 in order, with a bounded review after each slice. Preserve Phase
6.3: anonymous and external-partner ordinary marketplace access is
`PUBLIC_PREVIEW` only; VinUni actors retain their established scope; private
and confidential disclosure stays protected. Production authentication still
follows the approved Entra/VinUniversity direction. No production privileged
self-selection, global-admin shortcut, Phase 7 matching, or Phase 8 deployment
is implied. Do not add arbitrary code-execution/sandbox infrastructure merely
to complete assessment grading.

Evidence and priority come from
`context/pre-demo-product-quality-audit.md`,
`context/browser-product-quality-audit-2026-09-27.md`, and
`context/product-quality-audit-reconciliation-2026-09-27.md`. Focus on their
workflow-blocking P0/P1 and pertinent F1–F9 findings; do not import every
low-priority polish item. Use Playwright MCP after each implemented checkpoint
and inspect persisted rows for write/integrity tests in an isolated/disposable
development database. Do not run destructive resets against a shared database.
For any structural change, first review `docs/database/schema.dbml` and the
reconciliation; obtain explicit approval, then update DBML → Drizzle schema →
reviewed migration. A proposed checklist item is not schema approval.

## 6.6.0 Product-rule confirmation — first implementation checkpoint

**Goal:** Freeze decisions that determine the action path before writing it.

**Scope/checklist:**

- [ ] Approve a representative end-to-end branch (public or scoped invitation,
  solo/team, supervision required or optional, assessment required or optional)
  and define which transitions are compulsory versus valid bypasses.
- [ ] Approve development-only persona provisioning boundaries and first-use
  destinations; decide how a tester chooses an external partner organization
  without acquiring arbitrary production authority.
- [ ] Decide `PRIVATE` versus `INVITE_ONLY` discovery and candidate-access
  semantics; require verification of a VinUni student identity, an owner-scoped
  partner operation, student-specific access, revocation/expiry, and auditability.
- [ ] Confirm `respond_by` is a hard supervision deadline: `PENDING` with
  `now <= respond_by` may respond; `now > respond_by` is effectively expired
  and read-only. Define missing deadline, reissue/reroute, and timezone rules.
- [ ] Decide grading authority, rubric/numeric score, authoritative pass
  threshold and its owner, manual versus automatic assessment types, retry and
  failure consequences; do not infer pass from an absent result.
- [ ] Decide challenge rejection recovery/closing, application withdrawal and
  valid transitions, effective milestone review versus retained review history,
  terminal project close-out, and historical versus intentionally open demo
  scenarios/date convention.

**Dependencies/decisions:** Human product review is required; this checkpoint
records decisions, not implementation. Existing DBML has
`supervision_requests.respond_by` and describes derived offer expiry, but has
no explicit candidate-specific challenge invitation/access table. It describes
derived assessment bands from numeric scores/policy thresholds without fixing
the threshold authority. Review these gaps against DBML before design.
**Non-scope:** No source, data, or schema writes merely to close 6.6.0.
**Playwright regression:** Record baseline persona journeys and the chosen
acceptance path; do not claim a newly working flow before implementation.
**DB/integrity verification:** Read-only model/constraint inventory; no data
mutation. **Exit:** Signed-off rule ledger, named schema-review items, and
approved 6.6.1 scope. **DBML/schema review:** Required for invitation/access,
grading threshold, and any other missing model; no migration until approved.

## 6.6.1 Route safety and honest action gates

**Goal:** Prevent 500-class failures and misleading actions at existing entry
points (older F-05/F-13; latest F4/F5/F7).

**Scope/checklist:**

- [x] Validate malformed public IDs before UUID queries; map wrong-role,
  unrelated-resource, absent-resource, and ordinary domain failures to safe
  route/action outcomes without leaking protected existence.
- [x] Align Apply, offer, supervision, and assessment controls with the same
  server-side status, deadline, ownership, and eligibility rules used on submit.
- [x] Label marketplace counts accurately; distinguish future, due-today, and
  expired supervision requests; make expired actions unavailable server-side.
- [x] Make pending/lapsed/accepted offer inbox copy and CTAs state-aware.

**Dependencies/decisions:** 6.6.0 supervision deadline and error-disclosure
rules. **Non-scope:** No new lifecycle write path or broad policy change.
**Playwright regression:** Anonymous, student, faculty, and partner direct
navigation across malformed/absent/forbidden challenge, application,
assessment, offer, and workspace routes; no raw 500. Test a student with no
existing application against open, PUBLISHED, closed, and expired challenges;
test future/today/expired requests and offer inbox states.
**DB/integrity verification:** Read-only boundary checks and no row-count
changes. **Exit:** Every offered CTA matches a valid server action and
denials are controlled. **DBML/schema review:** None expected.

### 6.6.1 implementation record — 2026-09-27

**Implementation facts:** Added UUID validation at public-ID service boundaries
before UUID queries; protected application, assessment, offer, workspace,
meeting, faculty, and partner-team routes resolve malformed, absent, and
unrelated resources through existing controlled 404/redirect policy. The Apply
entry and direct apply page now reuse the creation service's application-window
rule and surface deadline/status/profile/eligibility gates before offering a
wizard. Supervision expiry is derived from `PENDING + now > respond_by`, is
atomic in the mutation predicate, returns a controlled server error, and is
read-only in faculty UI with future/due-today/expired state wording. Offer and
inbox wording is state-aware; non-leaders have no response CTA. Marketplace
counts now say `published challenges`, matching the result set rather than
calling deadline-closed records open.

**Verification:** `pnpm exec tsc --noEmit`, `pnpm lint`, and `git diff --check`
passed. Initial Playwright coverage observed anonymous protected routes redirect
to `/sign-in`; authenticated malformed application/assessment/offer/workspace/
faculty and partner-project paths return controlled 404; unrelated student
application, assessment, offer, and workspace paths return 404; the open
no-application E-Lab scenario offers Apply; and the deadline-closed campus
challenge has no Apply CTA and its direct apply page is unavailable.

**Regression closure — 2026-09-27:** Used disposable local records only (then
deleted) to observe future supervision (`2 days`, enabled actions), due-today
supervision (`due today`, enabled actions), and overdue supervision (`expired`,
read-only, both actions disabled). A deliberately stale browser action against
a now-expired disposable request was rejected by the server with `The response
deadline has passed. This request is now read-only.` Live pending offer UI was
actionable for its accepted leader and non-actionable for its accepted member;
the leader inbox used `Respond to offer`, while declined, expired, and accepted
offers/inbox entries used terminal state-aware wording with no response action.
A disposable `PUBLISHED` + `PUBLIC_PREVIEW` challenge with no applications was
representable under the existing model: its detail page said `Applications are
not open for this challenge`, and direct `/apply` rendered the same server gate.

The disposable fixtures were then removed. Shared counts returned exactly to
the pre-test baseline: `challenges=11`, `applications=8`,
`supervision_requests=1`, `selections=5`, and `offers=5`; the targeted query
found zero temporary challenge/application/request/offer rows.

**Build classification:** The default Turbopack build still fails while its CSS
worker attempts a prohibited port bind, including when run outside the normal
sandbox. `pnpm exec next build --webpack` compiled, type-checked, generated all
routes, and completed successfully. This is a Turbopack/environment runtime
restriction, not a Phase 6.6.1 regression; it should be resolved before Phase
8 production acceptance, but does not block this checkpoint's human review.

**DB/schema impact:** None. No DBML, schema, migration, seed, or intentional
workflow-row mutation.

**Exact next checkpoint:** Human review of complete Phase 6.6.1; only then
Phase 6.6.2 — Development personas and first-use navigation.

## 6.6.2 Development personas and first-use navigation

**Goal:** Let local/internal-QA testers create usable identities without
weakening production identity or RBAC (latest F1; older F-11).

**Scope/checklist:**

- [x] Extend only explicitly gated non-production self-service registration to
  provision actual domain records: Student → `student_profiles`; Faculty →
  `faculty_profiles`; Partner → approved external-partner membership; CAID/E-Lab
  admin → `ADMIN` membership in that exact internal organization.
- [x] Resolve all capabilities from server-owned profile/membership rows, never
  a client role string or session claim; prevent production activation of the
  persona selector and arbitrary organization/admin assignment.
- [x] Give a newly created or incomplete identity a clear next step; use
  capability-aware post-sign-in destinations and navigation, including
  zero-data/empty states and existing seeded identities.

**Dependencies/decisions:** 6.6.0 persona/organization choices and secure dev
gate. **Non-scope:** Public production self-registration or replacing Entra.
**Playwright regression:** Fresh unauthenticated contexts register each dev
persona, sign in, land on an appropriate page, and attempt both allowed and
forbidden role routes; verify the gate is absent outside non-production mode.
**DB/integrity verification:** Exactly one user plus only the intended profile
or scoped membership per registration; duplicate/retry cannot grant extra
authority; transaction rollback on partial provisioning.
**Exit:** Each QA persona can enter its real role workflow with no privileged
self-selection in production. **DBML/schema review:** Existing profile and
membership model appears sufficient; review if the approved provisioning
workflow needs new fields or constraints.

### 6.6.2 implementation record — 2026-09-27

**Implementation:** Added `AUTH_DEV_PERSONAS_ENABLED=true` as a second explicit
gate requiring `NODE_ENV=development` or `test` and enabled self-service
authentication. Signup accepts one of five development personas, then creates
the user, credential, and exactly one profile or active scoped membership in a
transaction. Partner keys resolve through a three-organization server allowlist;
CAID and E-Lab resolve by exact verified internal-unit name and type. Ambiguous
or unavailable organizations fail closed. No role is stored in the session;
existing actor resolution continues reading database profiles and memberships.
The authenticated home route now selects the marketplace, faculty queue,
partner dashboard, or scoped review queue by capability. A basic account sees
an account-setup message. Navigation follows the resolved actor on desktop and
mobile.

**Verification:** `pnpm exec tsc --noEmit`, `pnpm lint`, `git diff --check`,
and `pnpm exec next build --webpack` passed. The rollback-only persona verifier
confirmed all five domain records, duplicate-email retry, server allowlist
rejections, disabled and production-mode gate rejection, and rollback after a
controlled organization-availability failure. The existing self-service auth
verifier passed with the persona gate disabled.

**Playwright:** Fresh isolated browser contexts registered Student →
`/challenges`, Faculty → `/faculty`, Partner → `/partner`, CAID → `/review`, and
E-Lab → `/review`; each displayed the corresponding role navigation. Manual
sign-in repeated these destinations. Representative allowed profile routes
returned 200 and forbidden role routes returned 404 for all five. Four
partner-form tampering attempts (arbitrary ID, CAID, E-Lab, malformed value)
remained on signup with an allowlist error. With the gate disabled, the persona
selector disappeared; a new basic account reached the actionable setup page
and `/faculty` returned 404. Existing seeded Student, Faculty, Partner, CAID,
and E-Lab identities retained their expected destinations and 200/404 role
boundaries. E-Lab was denied the CAID-managed review detail route (404).

**DB/integrity:** Browser-created rows showed one user/credential and exactly
the intended profile or scoped membership per identity, with no cross-role
records; rejected partner attempts created no users. All disposable browser
accounts were removed. Final counts were `users=22`, `organizations=7`,
`organization_memberships=7`, and zero `qa-662-%` users or credentials.
No DBML, schema, migration, or seed change was needed. Temporary local QA
configuration was restored. **Blockers:** None for 6.6.2. The existing
Turbopack environment issue remains; the previously validated webpack build
path passed. **Exact next checkpoint:** Human review of 6.6.2, then explicit
approval for 6.6.3 and its private-access model review. Do not begin 6.6.3
automatically.

## 6.6.3 Challenge, private access, and supervision lifecycle

**Goal:** Close the creation-to-legitimate-access path, including private
candidate sourcing and hard supervision response (older F-01/F-12/F-14/D-12;
latest F3/F4).

**Scope/checklist:**

- [x] Finish owner draft → managing-unit review → publish UI using existing
  authorized service boundaries; use recoverable `REVISION_REQUESTED` review
  feedback with a required reason and resubmission path, reserve `CANCELLED` for
  intentional terminal cancellation, and derive deadline closing semantics.
- [x] Repair partner Students default with a separate owner-scoped selection
  path, not the ordinary external-partner marketplace query; preserve
  `PUBLIC_PREVIEW`-only ordinary browsing and unrelated-partner denial.
- [x] Implement approved external candidate nomination: verify the candidate
  is an appropriate VinUni student, create scoped invitation/access, let only
  that student view/apply to the target INVITE_ONLY challenge, and support
  approved expiry/revocation. Do not expose other private briefs or change the
  existing PRIVATE semantics.
- [x] Persist the student's faculty nomination as a supervision request or
  remove any claim of notification when none is created. Store decline reason
  if promised. Enforce `respond_by` on the server; provide authorized
  reroute/reissue when the deadline passes. Prefer derived effective expiry if
  consistent with the reviewed model, not a gratuitous `EXPIRED` status.
- [x] Preserve honest partner post-form input/errors and remove misleading
  synthetic/internal challenge copy relevant to the stakeholder flow.

**Dependencies/decisions:** 6.6.0 private-access model, notification wording,
challenge rejection/close rules, request deadline. **Non-scope:** Ordinary
partner VINUNI_ONLY discovery or Phase 7 ranking.
**Playwright regression:** Partner draft → CAID/E-Lab scoped review/publish;
rejection/recovery; private owner nominates verified candidate; invited student
can view/apply while unrelated student/partner cannot; partner Students default
does not 404; faculty accepts/declines before deadline, cannot respond after,
and sees reroute/reissue result. Recheck anonymous/external ordinary catalog.
**DB/integrity verification:** Challenge review and access/request rows match
actors, scope and dates; no duplicate effective invitation or late response;
unrelated organizations see no protected data; retries/partial failures roll
back. **Exit:** A genuine challenge can become discoverable to its intended
audience and supervision decisions are durable/truthful. **DBML/schema
review:** Explicitly required for candidate-specific invitation/access if
existing ERD cannot express it; review request uniqueness/history and any
approved close/reissue design before migration.

**2026-09-28 implementation record (complete — ready for human review):**

- Owner authoring now preserves submitted form values on expected validation
  errors. The browser-verified lifecycle is draft → edit → submit → scoped
  managing-unit review → required-reason revision → owner edit/resubmit →
  approve → publish. An unrelated internal unit receives a controlled 404.
- Partner Students uses an owner-scoped challenge path. The owning partner can
  use its PRIVATE challenge as the candidate-directory context while the
  ordinary external marketplace remains `PUBLIC_PREVIEW` only; service
  verification denies an unrelated partner. Synthetic swipe/invite behavior
  and AI-ranking claims were removed.
- Application submission now atomically creates a real `PENDING` supervision
  request for an active faculty user with a required five-campus-working-day
  `respond_by`. The server accepts only while `now <= respond_by`; effective
  expiry is derived, no `EXPIRED` enum was added. A decline is durable and the
  submitting leader can append a new request without mutating prior history.
  The UI no longer promises email/notification delivery or a persisted decline
  reason that the approved model cannot store. Database timestamp labels use
  the campus timezone so the displayed response date matches the server cutoff.
- Playwright verified owner PRIVATE context, ordinary-marketplace isolation,
  scoped review/revision/resubmission/publication, student application and
  persisted request, faculty future/due-today actions, expired read-only state,
  decline, and student reroute with both old and new history visible. DB checks
  confirmed the review/request actors, statuses and timestamps. Disposable QA
  rows were removed and confirmed absent.
- Verification passed: TypeScript, lint, webpack production build, DB health,
  challenge writes, partner runtime authorization, application/supervision
  transactions and rollback, faculty queue deadline enforcement, apply-flow
  integration, and the Phase 6.3 authorization regression suite.
- The approved `challenge_candidate_access` history model is now represented in
  DBML and the modular Drizzle schema. Migration
  `drizzle/0006_condemned_stardust.sql` adds challenge/student/granting-actor
  references, required grant/expiry timestamps, optional paired revocation
  actor/time, audit timestamps, integrity checks, and lookup indexes. Effective
  state remains derived. One-effective-grant enforcement is serialized by a
  challenge-row lock and a transactional recheck; no time-dependent partial
  index or redundant lifecycle status was added.
- Owner grant/revoke management resolves an exact active-student email without
  exposing a student search surface. INVITE_ONLY remains absent from ordinary
  marketplace reads. Candidate detail/application authorization is scoped to
  the one challenge; application creation rechecks every team member under the
  same challenge lock, and submitted application membership becomes the durable
  downstream basis after invitation expiry. Revocation is prohibited after
  submission, while revoked/expired/re-granted history remains inspectable.
- Candidate-access integrity verification passed owner, unrelated-partner,
  non-student and unknown-identity cases; deadline validation; idempotent and
  concurrent duplicate grants; actor-stamped revocation; revoked/expired access;
  history; post-submission durability; and rollback. Fresh migration replay,
  deterministic seed plus repeat seed, Drizzle consistency, DB health,
  TypeScript, lint, webpack build, challenge/partner/application/faculty/apply
  regressions, and Phase 6.3 authorization all passed.
- Playwright used disposable records to verify owner creation/review/publication,
  anonymous and ordinary-marketplace isolation, exact-email grant, invited and
  unrelated students, unrelated external partner denial, pre-submit revocation,
  re-grant history, submission, post-expiry durable application access, expired
  pre-application denial, PRIVATE partner-Students behavior, and the persisted
  supervision request. The temporary challenge, application, access history,
  supervision request, and unrelated-partner login were removed; shared seed
  counts returned to baseline.
- **Remaining blocker / exact next checkpoint:** None within Phase 6.6.3. Obtain
  explicit human approval before beginning Phase 6.6.4.

## 6.6.4 Application lifecycle and concurrency

**Goal:** Make submitted applications move through authorized stages rather
than remain seeded-state snapshots (older F-06c/C-02).

**Scope/checklist:**

- [x] Implement only approved state transitions (including withdrawal,
  supervision/assessment gates, rejection, and partner handoff), with clear
  reason/history display where the model supports it.
- [x] Guarantee one effective application per student/challenge under two-tab
  and double-submit races; respect the normalized `applications` plus
  `application_members` model rather than adding an invalid simple index.
- [x] Keep student, partner, and internal views consistent, with truthful
  pending/blocked/terminal next steps and eligibility errors.

**Dependencies/decisions:** 6.6.0 state machine; 6.6.3 access/supervision.
**Non-scope:** Selection, offer issuance, or project creation.
**Playwright regression:** Invited/public student applies, withdraws where
permitted, sees progression; partner sees the same persisted status; duplicate
submits and forbidden transitions receive controlled feedback.
**DB/integrity verification:** Cross-table application/member invariants,
single accepted leader, duplicate-race test, transition authorization, atomic
rollback and no orphaned requests. **Exit:** Every displayed application stage
has an authorized action path or an explicit documented external decision.
**DBML/schema review:** Required if concurrency/history cannot be enforced
with existing constraints/transactions; do not assume the old proposed index.

**Implementation record (2026-09-28):**

- Added one server-owned lifecycle policy/reconciliation boundary. Supervision
  acceptance and the last invitation response re-evaluate the persisted gates
  under an application row lock. A ready application advances from `SUBMITTED`
  to `ASSESSMENT` when exactly one active assessment exists, or to
  `SELECTION_PENDING` when none exists. An attempt, `IN_PROGRESS`/`SUBMITTED`
  state, missing score, or unreviewed result is never treated as a pass; Phase
  6.6.5 still owns grading and pass/fail writes. Terminal and stale transitions
  are rejected or safely no-op on retry.
- Whole-application withdrawal is an accepted-leader-only, pre-selection
  transaction with a row lock plus compare-and-set status update. `WITHDRAWN`
  and `REJECTED` remain terminal; ordinary withdrawal is unavailable after
  selection/offer. Terminal history remains readable but does not count as an
  effective application if the student later submits a genuinely new one.
- Duplicate participation is serialized with transaction-scoped PostgreSQL
  advisory locks keyed by `(challenge_id, accepted_student_id)`, acquired in
  sorted student-id order before the conflict recheck and inserts. Only
  accepted participants count; invited members do not gain downstream rights.
  Application creation, member inserts and supervision request creation remain
  one transaction, so an injected failure leaves no orphaned rows. Application
  row locks serialize invitation acceptance, supervision progression,
  withdrawal and stale retries.
- Student detail, challenge/apply, invitation, faculty supervision, partner
  pipeline and owner-scoped partner team detail now render the same persisted
  lifecycle explanation. They expose no premature selection action. Pending,
  declined/expired supervision, assessment pending/review, selection pending,
  rejected and withdrawn states have explicit honest copy and gated actions.
- Focused verification covered pending/declined/expired/accepted supervision,
  assessment/no-assessment routing, missing/unreviewed outcomes, invalid/stale
  and terminal transitions, leader/non-leader withdrawal, accepted/invited
  team semantics, rapid/double-tab and competing-transaction creation, retry,
  rollback and baseline restoration. Playwright used disposable data to verify
  submission, cross-role state, faculty acceptance, assessment presentation,
  leader withdrawal, terminal/read-only behavior, unrelated-student denial and
  two pre-opened tabs producing one effective application plus a controlled
  stale-tab conflict. The fixture was removed; baseline returned to 8
  applications, 18 application members, 2 assessments, 11 challenges and 1
  supervision request.
- Verification passed: lifecycle and relevant application/assessment,
  candidate-access, invitation, faculty, partner, persona and Phase 6.3
  authorization verifiers; TypeScript; lint; DB health; Drizzle consistency;
  webpack production build; and `git diff --check`.
- **DB/schema impact:** none for Phase 6.6.4. Existing normalized tables and
  PostgreSQL transaction/locking semantics were sufficient; no DBML, Drizzle
  schema or migration change was required.
- **Remaining blocker / exact next checkpoint:** None within Phase 6.6.4.
  Obtain explicit human approval before beginning Phase 6.6.5 assessment
  submission safety and live grading. Do not infer that approval from this
  completion record.

## 6.6.5 Assessment submission safety and live grading

**Goal:** Complete a real assessment-to-authoritative-result path (older
F-04/F-07–F-10/C-01).

**Scope/checklist:**

- [ ] Reconcile preflight duration with runner timer; handle nullable time
  limits/empty question sets before attempt creation and allow intentionally
  unanswered coding responses without poisoning submission.
- [ ] Make response saves and submits concurrency-safe; do not allow a
  duplicate `(attempt_id, question_id)` logical answer to make an attempt
  permanently un-submittable. Preserve answer-key isolation.
- [ ] Add approved reviewer/grader authorization, rubric/score write, reviewed
  transition, threshold-based pass/fail, and the corresponding authorized
  application transition. Unknown verdict must remain pending/unknown, never
  default to Passed. Specify which question types use manual or automatic
  grading; do not imply arbitrary code execution.
- [ ] Remove internal `DEMO`/phase commentary from user-facing assessment
  titles and feedback in the representative flow.

**Dependencies/decisions:** 6.6.0 grading authority, threshold, assessment
type, retry, and result policy; 6.6.4 transitions.
**Non-scope:** General code sandbox or Phase 7 scoring.
**Playwright regression:** Student starts, saves none/some/all answers,
submits, sees pending review; authorized grader reviews and persists result;
pass/fail/unknown render correctly; wrong student/reviewer cannot alter it;
empty/null-limit cases fail safely; timer matches preflight.
**DB/integrity verification:** One effective response per question, one
authoritative reviewed outcome under concurrent saves/reviews, actor ownership,
attempt/application consistency, rollback on failed grading transition.
**Exit:** A fresh attempt can reach a trusted reviewed result and the correct
application state. **DBML/schema review:** Required for threshold authority,
score/rubric model and any response uniqueness or review-history constraint.

## 6.6.6 Partner selection and offer issuance

**Goal:** Let an authorized partner choose a real candidate/team and issue a
durable pending offer (older F-02/F-06c).

**Scope/checklist:**

- [ ] Replace sourcing copy that claims an AI shortlist with an honest
  deterministic/curated description while Phase 7 is deferred; give the
  partner a persisted decision, not a browser-only deck choice.
- [ ] Validate ownership, application readiness, eligibility/assessment gate,
  capacity, offer terms and response deadline; atomically create selection,
  PENDING offer, and coherent application status.
- [ ] Show the resulting offer to the accepted team leader; keep ordinary
  partner marketplace disclosure separate from owner-scoped candidate review.

**Dependencies/decisions:** 6.6.4/6.6.5 progression and 6.6.0 offer rules.
**Non-scope:** Matching scores or project provisioning.
**Playwright regression:** Partner reviews eligible applicant, selects once,
refreshes/double-clicks safely; leader sees offer, other member cannot
respond; unrelated partner and wrong-status application cannot select.
**DB/integrity verification:** Exactly one selection and offer per chosen
application; actor/owner and term snapshots correct; race/rollback tests.
**Exit:** Authorized runtime action persists selection and PENDING offer.
**DBML/schema review:** Existing cardinality may suffice; review any needed
capacity/audit or term change before schema work.

## 6.6.7 Offer response and atomic project provisioning

**Goal:** Close acceptance into an immediately usable workspace (older F-03;
latest F2/F7).

**Scope/checklist:**

- [ ] Preserve accepted-leader-only, pending-unexpired offer response and
  decline behavior; ensure accepted response atomically creates one project
  and project members from accepted application members only.
- [ ] Apply approved project supervisor, agreement/restricted-resource and
  application/project state rules; never promote merely invited members.
- [ ] Make lapsed offers and mixed challenge/offer demo dates truthful;
  reconcile deterministic fixtures for intended open versus historical cases
  without changing the production server clock.

**Dependencies/decisions:** 6.6.0 offer/project rules and 6.6.6 issuance.
**Non-scope:** Arbitrary agreement acceptance or project milestone actions
unless explicitly approved in the relevant checkpoint.
**Playwright regression:** Leader accepts a fresh offer → workspace opens
immediately; non-leader/unrelated user denied; decline and expiry do not
provision; offer inbox and historical offer copy reflect terminal state.
**DB/integrity verification:** One offer response and one project/application,
correct accepted-member roster, transaction rollback on injected failure,
safe concurrent accepts; query challenge/application/selection/offer/project
chronology after reset. **Exit:** Accepted offer reliably creates a usable
project; no seed-only bridge remains. **DBML/schema review:** Review only if
approved supervisor/agreement/capacity semantics need new persistence.

## 6.6.8 Project, milestone, and close-out writes

**Goal:** Let the newly provisioned project progress to a real terminal state
(older F-15/F-17/C-03; latest F6).

**Scope/checklist:**

- [ ] Implement authorized milestone/deliverable submissions and faculty +
  partner reviews, including revision and effective dual approval; preserve
  legitimate review history without racing the quorum.
- [ ] Implement approved project close-out/final review, durable feedback if
  promised, completed/archived workspace links, and honest active-project
  date/status labels (not challenge application deadlines).
- [ ] Keep agreement-gated resources and cross-project/organization access
  enforced throughout; remove disabled/stub close-out CTAs or make them real.

**Dependencies/decisions:** 6.6.0 review-history and terminal-state rules;
6.6.7 project provisioning. **Non-scope:** General meeting system, file
storage, and unrelated P2/P3 polish.
**Playwright regression:** Student submits milestone; faculty and partner
review/revise/approve; project reaches final review and close-out; completed
project remains reachable; wrong role and unrelated project remain denied.
**DB/integrity verification:** Review events retained while exactly one
effective decision/quorum is computed under concurrency; deliverable/project
FKs, restricted-resource agreements, terminal transition and rollback checks.
**Exit:** A fresh project can be completed through persisted authorized work.
**DBML/schema review:** Required if effective-decision serialization,
close-out, or feedback needs a structural change; do not blindly add a unique
index that erases legitimate review rounds.

## 6.6.9 Isolated Playwright multi-role E2E acceptance

**Goal:** Demonstrate the complete path through runtime actions and database
evidence, then obtain human review before Phase 8.

**Scope/checklist:** Use a clean, isolated/disposable development database,
not a shared or production database. Capture starting URL, persona, action,
redirect/result URL, visible state, and persisted rows at each transaction
boundary. Exercise with Playwright MCP:

1. [ ] Create the approved development test identities with actual profiles
   and scoped memberships.
2. [ ] Partner creates a challenge.
3. [ ] The correct CAID/E-Lab unit reviews and publishes it.
4. [ ] Student gains legitimate public or candidate-scoped access.
5. [ ] Student completes an application.
6. [ ] Required supervision request is persisted.
7. [ ] Faculty responds before `respond_by`; overdue response is denied.
8. [ ] Student starts, answers, and submits an assessment.
9. [ ] Authorized reviewer grades/reviews; score and attempt state persist.
10. [ ] Application progresses according to the authoritative result.
11. [ ] Partner reviews the candidate/application under owner scope.
12. [ ] Partner selects the team.
13. [ ] Exactly one selection and PENDING offer persist.
14. [ ] Correct leader can respond; other members cannot.
15. [ ] Acceptance atomically provisions one project.
16. [ ] Correct project members immediately enter the workspace.
17. [ ] Milestone submissions and faculty/partner reviews persist.
18. [ ] Project reaches the approved terminal/close-out state.
19. [ ] Wrong-role, unrelated-resource, anonymous, private and confidential
   negative paths remain denied at every relevant boundary.
20. [ ] Inspect persisted DB rows, FKs, state coherence, counts, and rollback/
   idempotency at application, request, assessment, selection, offer, project,
   and milestone boundaries.

**Dependencies/decisions:** 6.6.0–6.6.8 complete and each slice reviewed; any
valid product-path deviation is documented rather than silently skipped.
**Non-scope:** Phase 7 matching and Phase 8 deployment. **Playwright
regression:** The numbered flow plus existing persona/route/visibility suites;
repeat near-boundary dates, double-submit, and expired states. **DB/integrity
verification:** Read-only assertions on the disposable run's writes plus
targeted concurrency/rollback verifiers; no shared-data reset. **Exit:** Human
review accepts the browser ledger, DB evidence and documented deviations;
only then may Phase 8 begin. **DBML/schema review:** No new design in this
acceptance step; any uncovered model gap reopens the relevant earlier review.

## Phase 6.6 exit criteria

- [ ] Every required major lifecycle state is reachable through authorized
  runtime actions, not merely seeded fixtures.
- [ ] Phase 6.3 disclosure, production identity, and organization boundaries
  pass negative regression tests.
- [ ] Deadline, scoring, selection, offer, and milestone integrity withstand
  stale requests and concurrent retries.
- [ ] Stakeholder-facing copy, catalog counts, and demo chronology are honest.
- [ ] The isolated Playwright multi-role scenario and DB assertions pass; a
  human reviews the evidence and approves the Phase 8 handoff.

---

# 11. Phase 7 — Skill + Semantic Matching

**Status: DEFERRED / NOT STARTED.** Matching is not required for the initial
near-production release. Preserve this section as a resumable workstream when
the owner makes matching a product priority. Do not use unimplemented matching
to imply an AI shortlist or to block Phase 6.6/Phase 8.

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

# 12. Phase 8 — Staging & Production Deployment

**Status: FUTURE / NOT STARTED.** Phase 8 follows successful Phase 6.6 human
review and full Playwright multi-role E2E acceptance. Deferred Phase 7 is **not**
a prerequisite. Phase 8 still owns the production image, environment/secrets,
managed PostgreSQL, separately reviewed migrations, staging, HTTPS/domain,
backups/recovery, observability, rate limiting/security, and staging E2E
verification. This roadmap amendment authorizes none of that implementation.

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
- [ ] Repeat the approved Phase 6.6 multi-role workflow and negative access
  checks in staging, with staging-only identities/data and persisted-state
  assertions; do not treat a seeded screen tour as E2E acceptance

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
- [ ] Phase 6.6 human review and isolated Playwright E2E acceptance completed
  before deployment work begins; Phase 7 may remain deferred

---

# 13. Latest Work Tracker

## Current status

**Current phase:** Phase 6.6.4 — COMPLETE / READY FOR HUMAN REVIEW

**Phase 6:** COMPLETE / READY FOR FINAL HUMAN REVIEW

**Active next implementation checkpoint:** Phase 6.6.5 — Assessment submission
safety and live grading, only after explicit human approval. Phase 7 is deferred; Phase
8 follows Phase 6.6 acceptance.

### Latest completed work

- 2026-09-28 Phase 6.6.4 — Application lifecycle and concurrency is COMPLETE /
  READY FOR HUMAN REVIEW. Server-owned gate reconciliation, accepted-leader
  withdrawal, terminal-state handling, sorted participant advisory locks,
  application row locks, retry/rollback safety, coherent student/faculty/
  partner presentation, focused DB verification and disposable multi-role/two-
  tab Playwright acceptance are complete. No Phase 6.6.4 schema or migration
  change was required. Phase 6.6.5 has not begun and requires explicit approval.

- 2026-09-28 Phase 6.6.3 — Challenge, private access, and supervision
  lifecycle is COMPLETE / READY FOR HUMAN REVIEW. Candidate-specific
  INVITE_ONLY grant, expiry, revocation, audit history, application durability,
  concurrency enforcement, owner UI, schema/migration replay, regression
  verification, disposable Playwright acceptance, and cleanup are complete.
  Phase 6.6.4 has not begun and requires explicit approval.

- 2026-09-27 roadmap amendment only: approved product direction now requires a
  near-production action path through project close-out. Planned bounded Phase
  6.6.0–6.6.9, including development-only domain persona provisioning,
  candidate-scoped PRIVATE/INVITE_ONLY access, hard supervision response
  deadline, live grading, selection/offer/project writes, integrity and
  Playwright multi-role acceptance. Phase 7 is deferred; Phase 8 follows 6.6
  acceptance, not Phase 7. No checkpoint has been implemented by this edit.

- 2026-09-06 Post-Phase-6 internal-demo authentication extension: added an
  opt-in self-service email/password signup and sign-in path alongside the
  existing Entra and development identity providers. Signup creates only an
  ACTIVE base user; no profile, organization membership, or authorization role
  is inferred. Migration 0005 adds one-to-one `user_credentials` storage and a
  case-insensitive unique email index. Passwords use versioned Node.js scrypt
  hashes. The feature is disabled by default and intentionally lacks the email
  verification, recovery, MFA, and distributed rate limiting required before
  public production use. Phase 7 remains unstarted.
- 2026-09-06 Phase 6.5 — Local containerized development is COMPLETE / READY
  FOR HUMAN REVIEW: added a dev-mode `Dockerfile` (Node 20 + pnpm via
  corepack, `pnpm install` then `next dev`, no multi-stage/production
  hardening, no `.env*`/secrets copied into image layers) and a `.dockerignore`.
  Added an `app` service to `docker-compose.yml` alongside the existing `db`,
  behind an optional `app` Compose profile, published on host port 3000, with
  `depends_on: db: condition: service_healthy`, a repository bind mount, and a
  separate named `app_node_modules` volume. The in-container `DATABASE_URL` is
  overridden to `db:5432` while the host-form `.env` value is untouched.
  `.env.example` documents both forms. Added the optional `pnpm dev:docker`
  wrapper script and documented the containerized commands in Section 16 and
  `README.md`. The Compose filename stayed `docker-compose.yml` and the
  `scripts/db-reset.ts` guard strings remain matched. Phase 8 production
  deployment scope is unchanged and was not pulled forward.
- Verified end-to-end: `docker compose config` resolves only `db` without a
  profile and `db` + `app` with `--profile app`; `docker compose --profile app
  build` and `up --build` succeed; the `app` container waits for `db`'s health
  check before starting; in-container `DATABASE_URL` resolves to
  `db:5432` while the bind-mounted `.env` keeps its host-form value; a
  bind-mounted source edit triggered an immediate Turbopack recompile inside
  the container (hot reload confirmed under OrbStack); `docker compose exec
  app pnpm db:migrate` and `docker compose exec -e ALLOW_DB_SEED=true app pnpm
  db:seed` both ran successfully from inside the container; `curl
  localhost:3000` returned a response from the containerized app; and, after
  tearing the app container down, host `pnpm db:reset` and `pnpm db:check`
  both still passed unaffected by the new `app` service definition.
- pnpm note: the host's currently active pnpm (11.20.0 via corepack) requires
  Node.js >= 22.13 and fails under a Node 20 image. The Dockerfile pins
  `corepack prepare pnpm@10 --activate` instead — the latest pnpm 10.x line,
  which supports Node 20 and reads this repository's `lockfileVersion: '9.0'`
  lockfile without changes.
- 2026-08-23 roadmap amendment: Phase 6.5 — Local containerized development is
  recorded as a new bounded checkpoint between Phase 6 and Phase 7.1 (section
  # 10.5): dev-mode application Dockerfile, `app` Compose service beside the
  existing `db`, source bind mount with a separate container `node_modules`
  volume, runtime environment wiring without baking secrets into images,
  db-health-gated startup, documented containerized commands, and an optional
  Compose profile preserving host `pnpm dev`. The Compose filename stays
  `docker-compose.yml` so the `scripts/db-reset.ts` guard is untouched. Phase 8
  production deployment scope is unchanged and not pulled forward.
- Phase 6.4 is COMPLETE / READY FOR HUMAN REVIEW: Auth.js HTTPS cookie/session
  defaults and CSRF flow were verified without weakening localhost development;
  database-backed Server Actions retain framework same-origin checks and
  server-derived actors; service validation and answer-key/secret boundaries
  were audited; Git environment hygiene passed; and the production rate-limit,
  audit-sensitive-operation, and Phase 8 dependency plans were documented in
  `docs/security/security-baseline.md`.
- Phase 6 is COMPLETE / READY FOR FINAL HUMAN REVIEW. Phase 6.3 authorization
  is COMPLETE / HUMAN REVIEW COMPLETE. The next checkpoint is Phase 6.5 —
  Local containerized development; Phase 7 has not begun.
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
- Phase 5 is COMPLETE / HUMAN REVIEW COMPLETE.
- Phase 6.1 is COMPLETE / HUMAN REVIEW COMPLETE: Auth.js JWT sessions, conditional tenant-specific Microsoft Entra ID OIDC, strict non-production seeded development identities, session-to-`users` resolution, and unmapped-user denial are implemented without schema, migration, seed, or domain-policy changes.
- Phase 6.2 is COMPLETE / READY FOR HUMAN REVIEW: `getAuthenticatedActor()` resolves student/faculty profiles and active organization memberships from the Phase 6.1 user primitive. Capabilities are multi-dimensional, partner representation requires an external-partner membership, and CAID/E-Lab administrative authority remains scoped to the authoritative organization ID. No global `SYSTEM_ADMIN`, JWT role authority, schema/migration/seed change, or Phase 6.3 policy enforcement was added.
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
- Phase 4.3 is COMPLETE / READY FOR HUMAN REVIEW: the visible `/challenges` marketplace list and `/challenges/[id]` detail routes now read from PostgreSQL through `listMarketplaceChallenges(...)` and `getMarketplaceChallengeBySlug(...)`.
- Phase 4.3 adds `src/lib/challenge-marketplace.ts` as the UI presentation/query-param boundary and updates the marketplace/detail components to consume service-backed read models.
- Phase 4.3 preserves ordinary confidential preview redaction for `merchant-churn-model`, preserves separate owner/managing organization display including the E-Lab owner/manager demo, and avoids hard-coding Jordan Lee as the marketplace viewer.
- Phase 4.3 leaves `/challenges/[id]/apply` and downstream application, assessment, selection, offer, agreement, project/workspace, matching, auth, RBAC, notification, and audit flows on their existing deferred/static boundaries.
- Phase 4.4 is COMPLETE / READY FOR FINAL PHASE 4 HUMAN APPROVAL: challenge-only write operations are implemented through a server-side service and Drizzle mutation layer.
- Phase 4.4 write APIs: `createChallengeDraft(...)`, `updateChallengeDraft(...)`, `submitChallengeForReview(...)`, `recordChallengeReviewDecision(...)`, `publishApprovedChallenge(...)`, and `replaceChallengeFacultyRouting(...)`.
- Phase 4.4 uses explicit development-only seeded actor contexts for Bến Cảng, CAID, and E-Lab verification; real authentication and global RBAC remain Phase 6.
- Phase 4.4 authorizes writes through active organization memberships and workflow state, never organization-name strings, email domains, UI routes, or client-supplied roles.
- Phase 4.4 validates challenge content, canonical skills, eligibility rules, organization ownership/management, faculty profiles, slug collisions, and lifecycle transitions before writes commit.
- Phase 4.4 preserves CAID/E-Lab organization separation, keeps approval separate from publish, and maps challenge review `REJECTED` decisions to the existing challenge status `CANCELLED` while recording the durable review decision.
- Phase 4.4 includes rollback-based verification in `scripts/verify-challenge-writes.ts`; no seed rows are intentionally mutated by write verification.
- Phase 4.4 documents the write path in `docs/database/challenge-write-path.md`.
- Phase 4 is complete and human reviewed.
- Phase 5.5 is COMPLETE / READY FOR PHASE 5 HUMAN REVIEW: transaction ownership is explicit across the implemented challenge, application, assessment, and offer services. Root database handles start one authoritative transaction, while supplied transaction handles are reused directly rather than creating nested scopes. Challenge update payloads are fully validated before normalized child replacement writes. Existing rollback verifiers cover dependent challenge, application/member, and assessment response/attempt writes and preserve the canonical seed; offer responses remain constrained to the offer domain and do not provision projects.
- Phase 5.1 is COMPLETE / READY FOR HUMAN REVIEW: application reads, application creation, application access policy, application mutation helpers, and rollback verification are implemented.
- Phase 5.1 read APIs: `listApplicationsForStudent(...)`, `listApplicationsForChallenge(...)`, `getApplicationByPublicId(...)`, `getApplicationByChallengeAndStudent(...)`, and `countApplicationsForChallenge(...)`.
- Phase 5.1 service APIs: `getDevelopmentApplicationActor(...)`, `listMyApplications(...)`, `getApplicationDetail(...)`, `listChallengeApplications(...)`, `getMyApplicationForChallenge(...)`, and `createApplication(...)`.
- Phase 5.1 creates submitted applications transactionally with normalized `application_members`, exactly one accepted leader, accepted/invited non-leader members, per-application committed hours, motivation, optional relevant experience, and optional team name.
- Phase 5.1 validates server-side actor ownership, challenge availability, deadline, leader eligibility, team-size bounds, duplicate member emails, duplicate non-terminal challenge applications, and committed-hours values.
- Phase 5.1 uses explicit development-only seeded actors for student/owner/managing-unit verification; real authentication and global RBAC remain Phase 6.
- Phase 5.1 intentionally keeps existing application UI routes on static fixtures until the downstream assessment, offer, project/workspace, and auth checkpoints are ready to support full route migration.
- Phase 5.1 documents the runtime path in `docs/database/application-runtime-path.md`.
- Phase 5.2 is COMPLETE / READY FOR HUMAN REVIEW: assessment reads, student-side attempt lifecycle, response persistence, result reads, server actions, and `/assessment/**` UI migration are implemented.
- Phase 5.2 read APIs: `listActiveAssessmentsForChallenge(...)`, `getAssessmentDefinitionWithQuestions(...)`, `getAssessmentAttemptForOwner(...)`, `listAssessmentResponsesForAttempt(...)`, and `getLatestAssessmentScoreForAttempt(...)`.
- Phase 5.2 service APIs: `getDevelopmentAssessmentActor(...)`, `getAssessmentPreflight(...)`, `getAssessmentTakingSession(...)`, `getAssessmentResult(...)`, `startAssessmentAttempt(...)`, `saveAssessmentResponse(...)`, and `submitAssessmentAttempt(...)`.
- Phase 5.2 migrates `/assessment/[applicationId]`, `/assessment/[applicationId]/take`, and `/assessment/[applicationId]/result` to the Assessment Service and PostgreSQL using `applications.public_id` as the route identity.
- Phase 5.2 enforces INDIVIDUAL attempt ownership, assessment/application challenge consistency, attempt/member consistency, question/attempt assessment consistency, answer-key stripping, response validation, response upsert, and student edit/submit transition rules.
- Phase 5.2 reads reviewed qualitative results for `app-triage` and `app-churn` with `overall_score = NULL` and zero seeded responses, without fabricating numeric scores.
- Phase 5.2 defers TEAM runtime semantics, reviewer scoring writes, automatic scoring, code execution, attachments, proctoring persistence, application outcome transitions, offers, agreements, projects/workspace, matching, auth/RBAC, notifications, audit, schema, migrations, and seed changes.
- Phase 5.2 documents the runtime path in `docs/database/assessment-runtime-path.md`.
- Phase 5.3 is COMPLETE / READY FOR HUMAN REVIEW: PostgreSQL-backed offer reads, leader-only team response, status-constrained accept/decline mutation, a development-only server action, and `/offer/[applicationId]` UI migration are implemented.
- Phase 5.3 resolves offers through `offer -> selection -> application -> challenge`, preserves issued terms as offer snapshots, derives pending expiration from `respond_by`, and exposes application public IDs rather than bigint identifiers.
- Phase 5.3 does not mutate selections/application status, provision projects, create project members, or accept individual agreements; those workflows remain deferred to their own checkpoints.
- Phase 5.3 documents the runtime path in `docs/database/offer-runtime-path.md` and verifies leader/non-leader/invited/unrelated access, expiration, stale responses, snapshots, no project creation, and rollback preservation in `scripts/verify-offer-runtime.ts`.
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
- Phase 4.3 static-reference audit confirms migrated `/challenges` list/detail routes no longer import `src/lib/data/challenges.ts` or `src/lib/queries.ts`; remaining static challenge references are limited to deferred application/provider/supervision/workspace flows.
- Phase 4.3 local route verification confirms `/challenges`, filtered/search marketplace URLs, `route-optimisation`, `merchant-churn-model`, and `demo-elab-venture-readiness-dashboard` return HTTP `200`; invalid slug `/challenges/not-real-slug` returns HTTP `404`.
- Phase 4.3 redaction verification confirms `merchant-churn-model` ordinary UI output contains the masked label `Logistics group, Hai Phong` and does not render `Bến Cảng Logistics`.
- Phase 4.3 read-only verification confirms full public-table counts remain at the Phase 3 compact seed state after local marketplace route checks.
- Phase 4.4 baseline verification confirmed the Phase 3 challenge counts before write tests: `challenges = 8`, `challenge_skills = 26`, `challenge_eligibility_rules = 17`, `challenge_faculty_assignments = 14`, and `challenge_reviews = 0`.
- Phase 4.4 rollback verification covers create, update, skill replacement, eligibility replacement, submit, invalid transition, unauthorized review, managing-unit approval, explicit publish, faculty routing, slug collision, unknown skill rollback, unrelated owner denial, and CAID/E-Lab cross-unit denial.
- Phase 4.4 rollback verification confirms public table counts remain unchanged after write tests: `challenges = 8`, `challenge_skills = 26`, `challenge_eligibility_rules = 17`, `challenge_faculty_assignments = 14`, `challenge_reviews = 0`, `applications = 8`, `assessments = 2`, `selections = 5`, `offers = 5`, `projects = 4`, and `match_results = 0`.
- Phase 4.4 local route regression confirms `/challenges`, `route-optimisation`, `merchant-churn-model`, and `demo-elab-venture-readiness-dashboard` still return HTTP `200` after write-path implementation and rollback verification.
- Phase 5.1 rollback verification covers seeded solo/team application reads, student-member access, unrelated-student denial, owner/managing organization reads, CAID/E-Lab cross-unit denial, current-student challenge lookup, closed challenge rejection, deadline rejection, eligibility hard failure, below/within/above team-size checks, duplicate member rejection, duplicate challenge-application rejection, valid team creation, valid solo creation, rollback preservation, and no assessment/offer/project/matching write leakage.
- Phase 5.1 rollback verification confirms public table counts remain unchanged after write tests: `applications = 8`, `application_members = 18`, `application_projects = 0`, `supervision_requests = 1`, `assessments = 2`, `assessment_attempts = 2`, `assessment_scores = 2`, `assessment_responses = 0`, `selections = 5`, `offers = 5`, `agreements = 5`, `projects = 4`, and `match_results = 0`.
- Phase 5.2 rollback verification covers `app-triage` failed reviewed result, `app-churn` passing reviewed result, `overall_score = NULL`, zero seeded responses, disposable INDIVIDUAL attempt start, idempotent start, wrong-member denial, answer-key leak prevention, valid MCQ save, response upsert, invalid option denial, cross-assessment response denial, submit, pending-review state, repeated-submit denial, submitted/reviewed edit denial, and no downstream write leakage.
- Phase 5.2 rollback verification confirms public table counts remain unchanged after write tests: `applications = 8`, `application_members = 18`, `assessments = 2`, `assessment_sections = 5`, `assessment_questions = 12`, `assessment_attempts = 2`, `assessment_responses = 0`, `assessment_scores = 2`, `selections = 5`, `offers = 5`, `agreements = 5`, `projects = 4`, and `match_results = 0`.
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

### Phase 6.6.0 — Product-rule confirmation

Phase 6.5 (local containerized development) is complete and ready for human
review. The 2026-09-27 roadmap amendment is also awaiting human approval.
After that approval, the next implementation checkpoint is **Phase 6.6.0 —
Product-rule confirmation**, followed by the bounded 6.6.1–6.6.9 sequence.
Do not implement 6.6 yet on the authority of this documentation edit. Phase 7
matching is deferred. Phase 8 can start only after Phase 6.6 human review and
isolated Playwright multi-role E2E acceptance; it need not wait for Phase 7.

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
Phase 4.3 challenge marketplace UI migration ✅
        ↓
Phase 4.4 challenge write operations ✅
        ↓
Final Phase 4 human approval ✅
        ↓
Phase 5.1 applications ✅
        ↓
Phase 5.1 human review ✅
        ↓
Phase 5.2 assessments ✅
        ↓
Phase 5.2 human review ✅
        ↓
Phase 5.3 offers ✅
        ↓
Phase 5.4 workspace ✅
        ↓
Phase 5 human review ✅
        ↓
Phase 6.1 authentication architecture ✅
        ↓
Phase 6.2 roles ✅
        ↓
Phase 6.3 authorization ✅
        ↓
Phase 6.4 security baseline ✅
        ↓
Final Phase 6 human review
        ↓
Phase 6.5 local containerized development ✅
        ↓
Phase 6.5 human review + human-approved roadmap amendment
        ↓
Phase 6.6.0 product-rule confirmation
        ↓
Phase 6.6.1–6.6.8 bounded workflow closure and regression checkpoints
        ↓
Phase 6.6.9 disposable-DB Playwright multi-role E2E acceptance
        ↓
Phase 6.6 human review
        ↓
Phase 8 staging + production deployment (future, not started)

Phase 7 matching: DEFERRED, resumable later; not on the critical path to Phase 8.
```

### Phase 6.5 checklist (complete, pending human review)

- [x] Re-read the exact Phase 6.5 section (# 10.5) in this plan before implementation.
- [x] Read the relevant Next.js guides under `node_modules/next/dist/docs/` before writing dev-server/container configuration.
- [x] Keep `docker-compose.yml` as the Compose filename; do not break the `scripts/db-reset.ts` guard.
- [x] Preserve host `pnpm dev` and all existing `db:*` script behavior unchanged.
- [x] No Phase 7 matching or Phase 8 production deployment work was performed
  as part of Phase 6.5.

### Immediate next checkpoint

- [ ] Human review of Phase 6.5 and explicit approval of this amended roadmap.
- [ ] Phase 6.6.0 — Product-rule confirmation only; record the decisions and
  reviewed DBML/schema gaps before 6.6.1 implementation.
- [ ] Do not begin Phase 7 matching or Phase 8 deployment as part of 6.6.0.

### Agent sequencing rule

The phase numbering/titles in **this file are authoritative for workflow sequencing**.

Before each agent implementation task:

1. Read `PRODUCTION_TRANSFORMATION_PLAN.md`.
2. Use the exact current phase/checkpoint number and title.
3. Do not infer or skip to a later phase because it seems logically next.
4. If a needed checkpoint is not represented here, update the plan through human review before implementation.
5. After each checkpoint, update this plan with actual work completed, verification, counts, and the exact next checkpoint.
6. For Phase 6.6, implement only the approved bounded sub-checkpoint; attach
   Playwright regression and DB/integrity evidence before advancing. Escalate
   product or DBML gaps instead of inventing policy, privilege, or migrations.
7. Phase 7 is deferred; Phase 8 is sequenced after Phase 6.6 acceptance, not
   after Phase 7. Neither is authorized by a Phase 6.6 checkpoint request.

### Recommended next agent instruction

After human approval of this roadmap amendment, proceed with **Phase 6.6.0 —
Product-rule confirmation only**. Record the required product decisions and
schema-review items; do not implement 6.6.1, Phase 7, Phase 8, schema,
migrations, seed, authentication, or unrelated runtime paths unless separately
approved for their bounded checkpoint.

---

# 15. Work Log

Use this section after each development session.

## 2026-09-27 — Roadmap amendment only

### Completed

- Recorded the approved near-production E2E direction as planned Phase 6.6,
  with ten bounded checkpoints, explicit product/schema decisions, per-slice
  Playwright and write-integrity verification, and final disposable-database
  multi-role acceptance.
- Deferred Phase 7 without deleting it; sequenced Phase 8 after Phase 6.6
  human review and E2E acceptance, independently of matching.
- Updated active status, sequencing, next-task guidance and Definition of Done.
  Historical entries below retain the decisions and next actions as recorded
  at their original dates.
- Documentation-only change to this file; no application, schema, migration,
  seed, authentication, database, Phase 7 or Phase 8 implementation.

### Current blocker

Human approval of this roadmap amendment and the unresolved 6.6.0 product/
schema decisions. This is a planned checkpoint, not a claim of implementation.

### Next action

After explicit human approval, perform Phase 6.6.0 — Product-rule confirmation
only, then seek review before the next bounded implementation slice.

## 2026-09-06

### Completed

- Phase 6.5 — Local containerized development implemented and verified end to
  end; see the Section 13 "Latest completed work" entry for full detail.
- Files created: `Dockerfile`, `.dockerignore`.
- Files modified: `docker-compose.yml` (added optional-profile `app`
  service + `app_node_modules` volume), `.env.example` (documented host vs.
  container `DATABASE_URL` forms), `package.json` (added `dev:docker`
  script), `README.md` (added "Containerized Development" section),
  `PRODUCTION_TRANSFORMATION_PLAN.md` (status table, header, Section 13/14/16
  updates, checklist checkoffs).
- No schema, migration, seed, auth, or Phase 7/8 changes were made.

### Current blocker

None. Awaiting human review of Phase 6.5 before Phase 7.1 — Structured skill
matching begins.

### Next action

After human review of Phase 6.5, implement Phase 7.1 — Structured skill matching only.

## 2026-08-23

### Completed

- Roadmap amendment: recorded Phase 6.5 — Local containerized development as a new bounded checkpoint between Phase 6 and Phase 7.1 (section # 10.5).
- Scoped Phase 6.5 to a dev-mode application Dockerfile, an `app` Compose service beside the existing `db`, a source bind mount with a separate container `node_modules` volume, runtime environment wiring without baking secrets into images, db-health-gated startup, documented containerized commands, and an optional Compose profile preserving host `pnpm dev`.
- Recorded the decision to keep `docker-compose.yml` as the Compose filename so the `scripts/db-reset.ts` safety guard remains untouched.
- Recorded explicit non-scope: no frontend/backend container split, no production image hardening, HTTPS, managed DB networking, CI/CD, monitoring, WAF, or cloud deployment (Phase 8 unchanged), and no schema, migration, seed, auth, or Phase 7 changes.
- Corrected stale plan status: the header current-phase line and the Section 14 upcoming-task block (previously still pointing at Phase 6.2) now reflect Phase 6 completion and the Phase 6.5 next checkpoint.
- Documentation-only session: no application code, schema, migration, seed, Docker, or Compose files were changed.

### Current blocker

None.

### Next action

After final human review of Phase 6, implement Phase 6.5 — Local containerized development only. Do not begin Phase 7.1.

## 2026-08-22

### Completed

- Phase 5.3 Offers completed and ready for human review before Phase 5.4.
- Added `src/db/queries/offers.ts` and `src/db/mutations/offers.ts` for normalized offer reads and status-constrained responses.
- Added `src/services/offer.service.ts`, `src/lib/offer-development.ts`, and `src/app/offer/[applicationId]/actions.ts` for the explicit development actor and thin server boundary.
- Migrated `/offer/[applicationId]` to PostgreSQL-backed reads with public application IDs, pending/accepted historical rendering, and team-leader accept/decline actions.
- Enforced accepted-leader-only response, server-owned response fields, terminal-state protection, derived expiration, and offer snapshot terms.
- Added `scripts/verify-offer-runtime.ts` and `docs/database/offer-runtime-path.md`; verified rollback preservation, no project provisioning, and application/assessment regression safety.
- Preserved Phase 5.3 scope: no schema, migration, seed, agreement acceptance, project/workspace write, matching, auth/RBAC, notification, or audit implementation was added.
- Phase 5.2 Assessments completed and ready for human review before Phase 5.3.
- Added `src/db/queries/assessments.ts` and exported assessment read queries through `src/db/queries/index.ts`.
- Added `src/db/mutations/assessments.ts` and exported assessment mutation helpers through `src/db/mutations/index.ts`.
- Added `src/services/assessment.service.ts` and exported assessment service APIs through `src/services/index.ts`.
- Added `src/app/assessment/[applicationId]/actions.ts` as the server-action boundary for start, save-response, and submit.
- Added `src/lib/assessment-development.ts` for the temporary development-only student viewer context.
- Migrated `/assessment/[applicationId]`, `/assessment/[applicationId]/take`, and `/assessment/[applicationId]/result` from static fixture authority to the Assessment Service and PostgreSQL.
- Updated cognitive and technical runners to consume safe DB-backed question models and persist responses through server actions.
- Implemented INDIVIDUAL assessment ownership enforcement, safe question mapping, answer-key stripping, response validation, service-level response upsert, submission lifecycle rules, and read-only reviewed-result rendering.
- Added `scripts/verify-assessment-runtime.ts` to exercise assessment runtime inside one rollback transaction and verify no selection, offer, project, or matching write leakage.
- Added `docs/database/assessment-runtime-path.md` documenting Phase 5.2 architecture, APIs, scope, access, lifecycle, response validation, answer-key protection, UI migration, deferrals, verification, and static-reference classification.
- Preserved Phase 5.2 scope: no schema, migration, seed, reviewer scoring write, automatic grading, code execution, attachment storage, proctoring persistence, offer/agreement write, project/workspace write, matching, auth/RBAC, notification, or audit implementation was added.
- Phase 5.1 Applications completed and ready for human review before Phase 5.2.
- Added `src/db/queries/applications.ts` and exported application read queries through `src/db/queries/index.ts`.
- Added `src/db/mutations/applications.ts` and exported application mutation helpers through `src/db/mutations/index.ts`.
- Added `src/services/application.service.ts`, `src/services/application-policy.ts`, and application service exports through `src/services/index.ts`.
- Implemented PostgreSQL-backed application reads by student, challenge, application public ID, and current-student challenge membership.
- Implemented transactional application submission with server-owned `submitted_by`, normalized application members, exactly one accepted leader, accepted/invited non-leader members, optional team name, motivation, relevant experience, and per-application committed hours.
- Enforced server-side validation for student actor context, challenge availability, deadlines, leader eligibility, duplicate members, duplicate non-terminal challenge applications, team-size bounds, and committed-hours values.
- Added `scripts/verify-application-runtime.ts` to exercise application reads/writes inside one rollback transaction and verify no downstream assessment, offer, project, or matching write leakage.
- Added `docs/database/application-runtime-path.md` documenting Phase 5.1 architecture, read/write APIs, temporary actors, access policy, solo/team representation, lifecycle boundaries, verification, and deferred UI/downstream work.
- Preserved Phase 5.1 scope: no schema, migration, seed, assessment write, selection/offer/agreement write, project/workspace write, matching, auth/RBAC, notification, or audit implementation was added.
- Phase 4.4 Challenge Write Operations completed and ready for final Phase 4 human approval.
- Added `src/db/mutations/challenges.ts` and `src/db/mutations/index.ts` as the challenge-domain mutation layer.
- Added `src/services/challenge-write.service.ts` and exported challenge write APIs through `src/services/challenge.service.ts`.
- Implemented server-side challenge draft creation, draft/revision update, normalized skill replacement, normalized eligibility-rule replacement, submit-for-review, review decision, explicit publish, and faculty routing replacement.
- Preserved future Phase 6 compatibility by using explicit development-only seeded actor contexts instead of browser sessions, fake SSO, or a universal super-admin bypass.
- Authorized owner writes through active owner-organization memberships and managing-unit writes through active managing-organization memberships; verified CAID/E-Lab cross-unit denial.
- Added deterministic validation for challenge content, canonical skills, eligibility-rule configs, faculty profiles, owner/manager organizations, slug collisions, and lifecycle transitions.
- Added `scripts/verify-challenge-writes.ts` to exercise challenge writes inside one transaction and roll everything back, preserving the compact Phase 3 seed counts.
- Added `docs/database/challenge-write-path.md` documenting write architecture, operations, authorization, validation, lifecycle, transactions, rollback verification, and deferred boundaries.
- Preserved Phase 4 scope: no schema, migration, seed, application, assessment, offer, agreement, project, workspace, matching, auth/RBAC, notification, or audit implementation was added.
- Validation passed: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm db:check`, `pnpm exec drizzle-kit check`, `pnpm build`, `pnpm exec tsx -r dotenv/config scripts/verify-challenge-writes.ts`, `git diff --check`, and local route regressions through `pnpm dev`.

### Current blocker

None.

### Next action

Wait for human review of Phase 5.3. After review, proceed with Phase 5.4 — Workspace only.

## 2026-08-16

### Completed

- Phase 4.3 Challenge Marketplace UI Migration completed and ready for human review
- Migrated `/challenges` and `/challenges/[id]` from static challenge reads to `listMarketplaceChallenges(...)` and `getMarketplaceChallengeBySlug(...)`
- Added marketplace UI helpers for URL parsing, service-option mapping, display formatting, pagination hrefs, and the temporary pre-auth VinUni-member context
- Updated marketplace list/detail components to render service-backed challenge read models while preserving confidential owner redaction, E-Lab owner/manager display, empty state, and invalid-slug 404 behavior
- Preserved `/challenges/[id]/apply` and downstream application/assessment/offer/project flows as static/deferred boundaries for later phases
- Updated `docs/database/challenge-read-path.md` with Phase 4.3 runtime UI behavior, URL filter mapping, cache/rendering notes, remaining static boundaries, and local route verification
- Verified Phase 4.3 with TypeScript, lint, database/schema checks, production build, diff whitespace checks, local route checks through `pnpm dev`, static-reference audit, and post-read row-count verification
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

After final human approval of Phase 4, proceed with Phase 5.1 — Applications only. Do not begin later Phase 5 checkpoints unless explicitly requested.

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

## Containerized local development (Phase 6.5)

Local development only — not a production image. The `app` service lives
behind an optional Compose profile; bare `docker compose up -d` / `pnpm
db:up` still start only `db`.

```bash
docker compose --profile app build          # Build the dev image
docker compose --profile app up --build     # Start db + app, serve on localhost:3000
pnpm dev:docker                             # Equivalent wrapper script

docker compose logs -f app                  # Follow the Next.js dev server logs
docker compose --profile app down           # Stop and remove db + app containers

docker compose exec app pnpm db:migrate                         # Migrations from inside the container
docker compose exec -e ALLOW_DB_SEED=true app pnpm db:seed      # Guarded seed from inside the container
```

The repository is bind-mounted into the `app` container for hot reload;
`node_modules` lives in a separate named container volume
(`app_node_modules`) so host and container installs never collide.
`docker compose down -v` (run by `pnpm db:reset`) also removes that volume —
the cost is a dependency reinstall on the next `--build`, not data loss.

The `app` container's `DATABASE_URL` is set directly in `docker-compose.yml`
to point at the `db` service hostname (`db:5432`), overriding the host-form
value from the bind-mounted `.env` (`localhost:5432`) without modifying it.

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
23. `PRODUCTION_TRANSFORMATION_PLAN.md` is authoritative for implementation phase/checkpoint sequencing; agents must not invent, skip, or renumber checkpoints silently. Phase 7 is deferred; Phase 8 follows Phase 6.6 acceptance without requiring matching.
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

The initial near-production transformation is complete when:

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
- [ ] Fresh, authorized multi-role users can perform the Phase 6.6 challenge →
  application → supervision → assessment/review → selection/offer → accepted
  project → milestone/close-out path with persisted state and negative access
  checks; isolated Playwright E2E evidence is human-reviewed
- [ ] Development-only persona provisioning cannot grant production roles;
  candidate-scoped private access does not broaden ordinary marketplace scope
- [ ] Stale/racing actions cannot violate deadline, grading, selection,
  project-membership, or milestone-review integrity
- [ ] Staging environment exists
- [ ] Production deployment exists
- [ ] Managed PostgreSQL is backed up and monitored
- [ ] File/object storage is available if uploads are required
- [ ] Deployment and recovery procedures are documented

Deferred optional Phase 7 completion criteria, tracked separately and **not**
gates for the initial release or Phase 8:

- [ ] Skill matching works when separately prioritized
- [ ] Semantic matching works through pgvector when separately prioritized
