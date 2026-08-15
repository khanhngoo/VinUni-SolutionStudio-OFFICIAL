<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# VinUni Solution Studio Project Rules

This repository contains the VinUniversity Solution Studio / AI-in-Action platform.

The project is currently being transformed from a static Next.js MVP into a production-ready platform using:

* Next.js
* TypeScript
* Drizzle ORM
* Drizzle Kit
* node-postgres (`pg`)
* PostgreSQL
* pgvector
* Docker Compose / OrbStack for local infrastructure

Follow the architectural rules and phase boundaries below before making changes.

---

## Production Transformation Roadmap

The current implementation roadmap is:

`PRODUCTION_TRANSFORMATION_PLAN.md`

Before working on:

* production transformation,
* database schema,
* Drizzle,
* PostgreSQL,
* migrations,
* static-to-database conversion,
* authentication/RBAC,
* matching,
* or deployment,

read `PRODUCTION_TRANSFORMATION_PLAN.md`.

Follow the phases and checkpoints defined in that document.

Do not skip ahead to a later phase unless explicitly instructed.

If a task says to complete only a specific phase or checkpoint, stop after that checkpoint and report the result before proceeding.

---

# Database Architecture and Schema Authority

## Canonical Database Design

The canonical production database architecture is:

`docs/database/schema.dbml`

Always read this file before creating or modifying database schema.

This DBML file represents the approved architectural intent for:

* tables,
* entities,
* relationships,
* cardinalities,
* lifecycle/status models,
* skill taxonomy,
* application workflow,
* assessment workflow,
* project workflow,
* matching,
* governance,
* and organizational ownership.

Do not silently modify the ERD.

If implementation requirements appear to conflict with the ERD, report the discrepancy as a review item.

---

## Executable Database Schema

The executable PostgreSQL schema is implemented with Drizzle under:

`src/db/schema/`

Schema files should be domain-oriented and modular.

Expected organization may include:

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

`src/db/schema/index.ts` should primarily aggregate and export schema definitions.

Do not place the entire database schema into one giant `index.ts`.

---

## Migration History

Version-controlled Drizzle migrations are stored under:

`drizzle/`

Do not generate or modify migrations until the corresponding schema design has been reviewed and approved.

Do not use:

```text
drizzle-kit push
```

against production.

For production-relevant schema evolution, use reviewed schema changes and version-controlled migrations.

---

# Static MVP Is Implementation Evidence, Not Schema Authority

The current static MVP contains useful implementation work.

Relevant sources include:

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

These files may reveal:

* UI requirements,
* fields displayed by pages,
* workflows,
* lifecycle assumptions,
* filtering/sorting behavior,
* derived values,
* business rules,
* and existing user experience decisions.

However:

`src/lib/data/**` and `src/lib/types.ts` are NOT the source of truth for the production database schema.

Do not directly convert static mock objects or frontend types into PostgreSQL tables.

The current MVP may be simplified, denormalized, or presentation-oriented.

---

# Phase 2 Analysis Artifacts

Phase 2 uses the following analysis documents.

## MVP Data Model Audit

`docs/database/mvp-data-model-audit.md`

This document describes what the current static application implementation actually expects.

It may include:

* current entities,
* fields,
* relationships,
* status values,
* lifecycle assumptions,
* derived values,
* UI requirements,
* and business rules.

This document does not have authority to change the ERD.

---

## MVP ↔ ERD Reconciliation

`docs/database/mvp-erd-reconciliation.md`

This document records approved decisions for mapping the current static MVP to the production ERD.

Use these classifications:

### KEEP

The existing concept maps cleanly to the ERD.

### RENAME

The same concept exists, but the production name differs.

### NORMALIZE

The static MVP embeds data that should become a separate relational table or relationship.

### DERIVE

The value should be calculated or queried rather than stored redundantly.

### DROP

The value exists only for the static/demo implementation and should not become persistent production data.

### REVIEW

The current UI/workflow appears to require something that is not represented clearly in the ERD and requires explicit review.

Do not resolve `REVIEW` items silently.

---

# Database Authority Order

Use this authority hierarchy:

1. `docs/database/schema.dbml`

   * approved architectural intent

2. `docs/database/mvp-erd-reconciliation.md`

   * approved implementation mapping decisions, once it exists

3. `src/db/schema/*.ts`

   * executable Drizzle/PostgreSQL schema

4. `drizzle/*.sql`

   * historical migration record

The static MVP is implementation evidence, not schema authority.

If these sources disagree:

* report the discrepancy,
* explain which files disagree,
* do not guess,
* do not silently modify one source to match another.

---

# Analysis-Only Tasks

When instructed to perform an:

* audit,
* analysis,
* review,
* reconciliation,
* investigation,
* or inventory,

treat the task as read-only unless file creation is explicitly requested.

During analysis-only work:

* Do not modify application source code.
* Do not refactor components.
* Do not modify database schema.
* Do not modify `docs/database/schema.dbml` unless explicitly requested.
* Do not create Drizzle table definitions.
* Do not generate migrations.
* Do not run destructive database commands.
* Do not resolve architecture conflicts silently.
* Record uncertainties and conflicts as findings.
* Stop at the requested checkpoint.

If the task explicitly requests an analysis document, only create/update that requested documentation artifact unless otherwise instructed.

---

# Phase Boundary Rules

The production transformation must proceed incrementally.

## Phase 2 sequence

```text
2.0 Static MVP audit
        ↓
Human review
        ↓
2.1 ERD verification
        +
2.2 MVP ↔ ERD reconciliation
        ↓
Human review
        ↓
2.3 Freeze implementation-ready ERD v1
        ↓
Human approval
        ↓
2.4 Define Drizzle module structure
        ↓
2.5 Implement schema
        ↓
2.6 Constraints/indexes
        ↓
2.7 pgvector extension/vector representation
        ↓
2.8 Generate and verify migrations
```

Do not proceed from one major checkpoint into the next unless the task explicitly authorizes it.

In particular:

* Do not implement Drizzle during the initial MVP audit.
* Do not update the ERD during the initial MVP audit.
* Do not generate migrations before ERD v1 is approved.
* Do not seed static data before the production schema is established.

---

# Database Implementation Rules

## PostgreSQL Access

Keep PostgreSQL access server-side.

Client React components must never connect directly to PostgreSQL.

Expected flow:

```text
Client
  ↓
Next.js server boundary
  ↓
service/query layer
  ↓
Drizzle
  ↓
node-postgres
  ↓
PostgreSQL
```

Use the shared database connection layer.

---

## Relational Modeling

Prefer proper relational modeling for core domain entities.

Use:

* primary keys,
* foreign keys,
* unique constraints,
* check constraints,
* indexes,
* and transactions

where appropriate.

Do not rely only on frontend validation for integrity.

---

## Transactions

Use database transactions for workflows that modify multiple related records and must succeed or fail atomically.

Examples may include:

* accepting an offer/selection,
* creating project membership,
* changing application state,
* updating challenge capacity,
* or other multi-table lifecycle transitions.

---

## PostgreSQL as Primary Structured Store

PostgreSQL remains the primary datastore for structured platform data.

Examples:

* users,
* profiles,
* organizations,
* challenges,
* applications,
* skills,
* assessments,
* projects,
* memberships,
* governance records.

---

## pgvector

pgvector is used for semantic/vector functionality.

Do not implement semantic ranking prematurely.

Do not add speculative HNSW/IVFFlat indexes before matching/query requirements are understood unless explicitly instructed.

---

## JSONB

Use JSONB only when flexible structured metadata is justified.

Do not use JSONB as a replacement for relationships that should be normalized.

---

## Object Storage

Large uploaded files should eventually use object storage rather than PostgreSQL blobs.

Examples:

* CVs,
* PDFs,
* transcripts,
* images,
* portfolio files,
* challenge attachments,
* project deliverables.

PostgreSQL should store metadata/object keys as appropriate.

---

# Existing Development Environment

Local database infrastructure currently uses:

```text
OrbStack / Docker Compose
        ↓
PostgreSQL 18 + pgvector
```

Development database:

```text
solution_studio
```

PostgreSQL is exposed locally on:

```text
localhost:5432
```

Useful commands may include:

```bash
docker compose up -d
docker compose ps
docker compose stop
docker compose start
docker compose down
docker compose logs -f db
```

The command:

```bash
docker compose down -v
```

is destructive because it removes the local PostgreSQL volume.

Do not run destructive database commands unless explicitly required.

---

# Package Manager and Tooling

Use `pnpm` for repository package commands.

Use existing project scripts where available.

Before adding a dependency:

* check whether an equivalent dependency already exists,
* avoid unnecessary packages,
* preserve the existing package-management strategy.

---

# Next.js-Specific Work

For Next.js code changes:

* read the relevant documentation under `node_modules/next/dist/docs/`,
* do not assume older Next.js APIs are still valid,
* heed repository-specific and version-specific deprecation notices.

---

# Schema Change Workflow

Once ERD v1 is approved, an approved database schema change should normally follow:

```text
Architectural decision
        ↓
docs/database/schema.dbml
        ↓
src/db/schema/*.ts
        ↓
drizzle migration
        ↓
PostgreSQL
```

Update documentation, Drizzle schema, and migration history consistently as appropriate.

Do not make production schema changes only at the database level without representing them in source control.

---

# Conflict Handling

If you encounter:

* ERD ↔ static MVP conflicts,
* ERD ↔ Drizzle conflicts,
* reconciliation ↔ implementation conflicts,
* ambiguous relationships,
* missing required fields,
* contradictory lifecycle states,
* or unclear product requirements,

do not guess.

Instead report:

1. the conflicting sources;
2. the exact discrepancy;
3. why it matters;
4. possible interpretations if useful;
5. which decision requires review.

Wait for clarification when the conflict changes architecture or production schema semantics.

---

# Completion Reporting

At the end of an assigned task, report:

* what was inspected,
* what was changed,
* files created,
* files modified,
* tests/checks performed,
* important findings,
* unresolved questions,
* and the next checkpoint.

If instructed to stop after a phase/checkpoint, do not continue automatically.
