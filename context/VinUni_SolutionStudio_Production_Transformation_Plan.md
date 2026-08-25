# VinUni Solution Studio — Production Transformation Plan

**Repository:** `VinUni-SolutionStudio-OFFICIAL`  
**Project:** VinUniversity Solution Studio / AI-in-Action Platform  
**Last updated:** 2026-08-09  
**Current phase:** Phase 1 complete → Phase 2 next

---

## 1. Purpose

This document tracks the transformation of the current static Next.js MVP into a production-ready platform.

The development strategy is intentionally incremental:

```text
Static MVP
   ↓
Production database foundation
   ↓
Verified ERD → Drizzle schema
   ↓
Database-backed features
   ↓
Authentication + RBAC
   ↓
AI matching
   ↓
Production deployment
```

The **latest verified ERD** should be treated as the source of truth for the production database schema.

The current static MVP data under `src/lib/data` is temporary presentation/demo data and **must not automatically define the production database schema**. Static data should only be transformed into seed data after it has been reconciled with the approved ERD.

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
| Phase 2 | ERD → Drizzle schema + migrations | ⏭️ Next |
| Phase 3 | Static mock data → database seed | ⬜ Not started |
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

# 6. Phase 2 — Translate ERD to Drizzle Schema

## Goal

Convert the latest approved production ERD into a version-controlled Drizzle/PostgreSQL schema.

The ERD—not the current static MVP—is the source of truth.

## 2.1 Reconfirm latest ERD

- [ ] Recover the latest approved dbdiagram.io schema
- [ ] Verify all tables
- [ ] Verify all fields
- [ ] Verify primary keys
- [ ] Verify foreign keys
- [ ] Verify nullable vs required fields
- [ ] Verify `1:1`, `1:N`, `N:M`, `0..1`, and `0..N` relationships
- [ ] Verify status/state fields
- [ ] Verify timestamps
- [ ] Verify organization ownership model
- [ ] Verify CAID and E-Lab administration model
- [ ] Verify partner/contact-person model
- [ ] Verify student/faculty profile structure
- [ ] Verify challenge lifecycle
- [ ] Verify application lifecycle
- [ ] Verify project lifecycle
- [ ] Verify skill model
- [ ] Verify assessment and offer models
- [ ] Identify fields that should use PostgreSQL enums
- [ ] Identify fields that should use `JSONB`
- [ ] Identify future vector columns without implementing ranking logic yet

## 2.2 Define schema module organization

Target:

```text
src/db/schema/
├── users.ts
├── organizations.ts
├── challenges.ts
├── skills.ts
├── applications.ts
├── assessments.ts
├── offers.ts
├── projects.ts
├── matching.ts
└── index.ts
```

Checklist:

- [ ] Decide table grouping across schema files
- [ ] Create shared enums
- [ ] Create shared timestamps/helpers if useful
- [ ] Avoid circular schema imports
- [ ] Export all tables from `src/db/schema/index.ts`

## 2.3 Implement core tables

Likely domains:

### Identity / profiles

- [ ] `users`
- [ ] `student_profiles`
- [ ] `faculty_profiles`
- [ ] Other profile/role tables required by final ERD

### Organizations

- [ ] `organizations`
- [ ] `organization_memberships`
- [ ] Partner/contact-person relationships
- [ ] Administrative ownership relationships

### Challenges

- [ ] `challenges`
- [ ] Challenge ownership
- [ ] Challenge status
- [ ] Challenge review/approval relationships
- [ ] Challenge capacity/team configuration where required

### Skills

- [ ] `skills`
- [ ] `student_skills`
- [ ] `challenge_skills`
- [ ] Skill uniqueness constraints
- [ ] Skill normalization fields if present in final ERD

### Applications

- [ ] `applications`
- [ ] Application state/status
- [ ] Application timestamps
- [ ] Duplicate-application prevention constraints

### Assessments / offers

- [ ] Assessment-related tables
- [ ] Offer-related tables
- [ ] State transitions represented consistently

### Projects

- [ ] `projects`
- [ ] `project_members`
- [ ] Project/challenge relationship
- [ ] Student/faculty/partner relationships where required

## 2.4 Add database constraints

- [ ] Unique user email
- [ ] Unique institutional identifiers where appropriate
- [ ] Composite primary/unique keys for junction tables
- [ ] Required foreign keys
- [ ] `ON DELETE` strategy for every relationship
- [ ] `ON UPDATE` strategy where relevant
- [ ] Database-level check constraints where useful
- [ ] Appropriate default timestamps
- [ ] Prevent impossible duplicate memberships
- [ ] Prevent duplicate student skill records
- [ ] Prevent duplicate challenge skill records

## 2.5 Enable pgvector through migration

- [ ] Create version-controlled extension migration
- [ ] Add:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

- [ ] Verify extension exists after migration
- [ ] Do not add unnecessary vector indexes before actual matching queries are designed

## 2.6 Generate initial migrations

- [ ] Run `drizzle-kit generate`
- [ ] Review generated SQL manually
- [ ] Verify migration ordering
- [ ] Run migrations against fresh local DB
- [ ] Run migrations against existing local development DB
- [ ] Confirm migration tracking table works
- [ ] Test rollback/reset procedure locally
- [ ] Commit Drizzle schema + migrations together

## Phase 2 exit criteria

Phase 2 is complete when:

- [ ] Latest ERD is fully represented in Drizzle
- [ ] A fresh PostgreSQL database can be created entirely from migrations
- [ ] All core relationships and constraints are verified
- [ ] pgvector extension is enabled through version-controlled migration
- [ ] No production table structure depends accidentally on temporary static MVP fields

---

# 7. Phase 3 — Convert Static Mock Data to Database Seed

## Goal

Preserve the useful demo content from the static MVP while reshaping it to conform to the production ERD.

## 3.1 Audit current static data

Review:

```text
src/lib/data/
src/lib/types.ts
src/lib/queries.ts
```

Checklist:

- [ ] List all current mock entities
- [ ] List all mock fields
- [ ] Map mock entities to ERD entities
- [ ] Identify mock-only fields
- [ ] Identify ERD-required fields missing from mock data
- [ ] Identify inconsistent IDs
- [ ] Identify duplicated or denormalized information
- [ ] Identify values that need normalized lookup tables

## 3.2 Define seed dataset

Create deterministic development examples for:

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

**Current phase:** Phase 1 complete  
**Next phase:** Phase 2 — ERD → Drizzle schema

### Latest completed work

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

### Latest verification

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

### Reconstruct and freeze the latest ERD before writing production schema code.

Do **not** start by translating `src/lib/types.ts` or `src/lib/data` into tables.

Next sequence:

```text
Latest ERD
   ↓
review tables + fields
   ↓
review relationships
   ↓
resolve inconsistencies
   ↓
freeze ERD v1
   ↓
map to Drizzle files
   ↓
generate initial migration
```

### Next-task checklist

- [ ] Retrieve latest ERD/dbdiagram.io definition
- [ ] Compare it against prior design decisions
- [ ] Mark any unresolved fields/relationships
- [ ] Produce final ERD v1
- [ ] Decide PostgreSQL enums
- [ ] Decide `JSONB` fields
- [ ] Decide indexes/unique constraints
- [ ] Decide foreign-key delete behavior
- [ ] Define schema module boundaries
- [ ] Only then implement `src/db/schema/*`

---

# 15. Work Log

Use this section after each development session.

## 2026-08-09

### Completed

- Phase 1 local database infrastructure
- OrbStack/Docker setup
- PostgreSQL 18 + pgvector container
- Persistent development volume
- Drizzle + node-postgres integration
- Successful DB connectivity test

### Current blocker

None.

### Next action

Recover/review the latest production ERD and begin Phase 2.

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

1. **ERD is the production schema source of truth.**
2. `src/lib/data` is temporary mock/demo data.
3. All schema changes must be represented in Drizzle schema + migrations.
4. Production migrations must be reviewed before deployment.
5. Do not use `drizzle-kit push` in production.
6. Keep PostgreSQL as the primary structured datastore.
7. Use pgvector only for semantic/vector needs.
8. Use object storage for large files rather than storing them directly in PostgreSQL.
9. Keep business rules out of React components.
10. Client components must never connect directly to PostgreSQL.
11. Enforce authentication and authorization server-side.
12. Use transactions for workflows that modify multiple related tables.
13. Keep local development reproducible through Docker Compose.
14. Do not delete Docker volumes unless intentionally resetting the local DB.
15. Introduce additional infrastructure such as Redis only when justified by measured requirements.

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
