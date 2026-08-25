# Database Architecture Notes

Phase: 2 complete — ERD v1 frozen, Drizzle schema implemented, initial migration verified  
Date: 2026-08-16

## ERD v1 Status

`docs/database/schema.dbml` is the implementation-ready ERD v1 frozen after Phase 2.3 reconciliation and semantic cleanup.

This document records the approved architecture decisions and PostgreSQL implementation conventions that guide the Drizzle schema and migration history. It does not replace the DBML as canonical architecture.

Any later structural database change must be treated as a new reviewed schema change, not as a continuation of the Phase 2.3 reconciliation.

## Authority

Authority order for database work:

1. `docs/database/schema.dbml` is the canonical production database architecture.
2. `docs/database/mvp-data-model-audit.md` records static MVP implementation evidence.
3. `docs/database/mvp-erd-reconciliation.md` records reconciliation analysis and mapping rationale.
4. `src/db/schema/*` is the executable Drizzle/PostgreSQL implementation created during Phase 2.4-2.7.
5. `drizzle/*` is the version-controlled migration history created during Phase 2.8.

The static MVP is not schema authority. Do not directly copy `src/lib/data` or `src/lib/types.ts` structures into production tables.

## Approved Architecture Decisions

### CAID, E-Lab, Users, And Organizations

CAID and E-Lab are organizations, not shared user accounts.

Every human has an individual `users` record. Internal VinUni units use `organizations.organization_type = INTERNAL_UNIT`; external companies, NGOs, hospitals, and similar partners use `EXTERNAL_PARTNER`.

Permissions are scoped through `organization_memberships`. `membership_role.ADMIN` means administrator for that organization scope only; ERD v1 does not add a global `SYSTEM_ADMIN` role.

`challenges.owner_organization_id` and `challenges.managing_organization_id` intentionally have different semantics:

- `owner_organization_id` is the organization that owns or submitted the challenge.
- `managing_organization_id` is the VinUni internal unit operationally managing the challenge.

### Team Application Model

Production v1 supports both solo and team applications.

`applications` represents one submission to one challenge. It no longer structurally belongs to a single `student_id`. `applications.submitted_by` records the user who initiated or submitted the application.

Applicant membership lives in `application_members`.

Important invariants:

- A solo application is one application with one accepted leader member.
- A solo application may leave `applications.team_name` NULL.
- A team application has multiple application members.
- A team application may store the chosen team identity in `applications.team_name`.
- A student must not appear more than once in the same application.
- Each application must have exactly one leader.
- Pending or invited members can exist before project creation.
- Accepted application members later transition into `project_members`.
- `application_member_role` (`LEADER`, `MEMBER`) is separate from `application_member_status` (`INVITED`, `ACCEPTED`, `DECLINED`, `REMOVED`).
- `application_members.preferred_role` is the person's desired project contribution role and is not the same as leadership role.
- `applications.relevant_experience` is an optional applicant/team narrative.
- `application_projects` stores structured links to evidence/student project records.

DBML records the relationship and per-application student uniqueness. The existing `UNIQUE(application_id, student_id)` equivalent prevents a student from appearing twice in one application.

Leader enforcement is split across database and service validation:

- A database constraint or PostgreSQL partial unique index can enforce at most one member with `member_role = LEADER` per application.
- Application submission transaction/service validation must enforce that exactly one accepted leader exists when an application is submitted.

`application_projects` remains the relation between an application and relevant prior student project experience. Because applications can now have multiple members, the linked `student_project_id` must belong to an accepted or relevant member of that application. This invariant likely needs service-layer or PostgreSQL-specific enforcement.

Availability and commitment are intentionally separate:

- `student_profiles.available_hours_per_week` is general profile availability.
- `application_members.committed_hours_per_week` is the member's commitment for this specific application.
- Aggregate team hours are derived, not stored.

### Stored-Vs-Derived Lifecycle Model

Do not copy the MVP's large `ApplicationStage` enum into production.

Authoritative lifecycle state is separated across domain tables:

- `applications.status` tracks the application-selection pipeline only.
- `assessment_attempts.status` tracks assessment attempt state.
- `offers.status` tracks offer response state.
- `projects.status` tracks project execution state.
- `milestones.status` plus `milestone_reviews` track milestone workflow.

The frontend/service layer will later derive a composite application UI stage from those domain records.

Examples:

- `applications.status = ASSESSMENT` plus no submitted attempt derives UI `TEST_PENDING`.
- `assessment_attempts.status = SUBMITTED` derives UI `TEST_SUBMITTED`.
- `offers.status = PENDING` derives UI `INVITED`.
- `offers.status = PENDING` and `respond_by < now()` derives offer expired UI state.
- `projects.status = ACTIVE` derives UI `ACTIVE`.
- `projects.status = FINAL_REVIEW` derives UI `IN_REVIEW`.
- `projects.status = COMPLETED` derives UI `COMPLETED`.

ERD v1 does not add a generic lifecycle-history table. Existing timestamps plus `audit_logs` are sufficient for v1.

Interview scheduling is deferred and must not be encoded into `application_status`.

### Selection Vs Offer

`selections` and `offers` are separate concepts.

`selections` answers: which application did the decision-maker select?

`offers` answers: what terms were offered and how did the candidate or team respond?

Offer response states live in `offers.status`, not `selections`. `offer_status` does not include `EXPIRED`; expiration is derived from `status = PENDING` and `respond_by < current time`.

Offer fields such as `hours_per_week`, `duration_weeks`, `start_date`, and `compensation_note` are historical snapshots of the terms offered, even when similar values exist on the challenge.

Final v1 cardinality:

```text
Application
   -> 0..1 Selection
   -> 0..1 Offer
```

Conceptually:

- An application may never be selected.
- A selected application has one final selection record.
- A selection may have one durable offer record.
- Offer expiration remains derived from `respond_by`.
- Offer revisions/versioning are deferred to a future schema evolution if needed.

For team applications, the accepted application leader is the authorized team-level offer responder and is recorded in `offers.responded_by`. DBML records the responder relationship to `users`; the rule that `responded_by` must be the accepted leader requires later Drizzle/PostgreSQL/service validation.

Individual legal/confidentiality acceptance remains separate through `agreements.user_id`:

- Team leader accepts or declines the team offer.
- Each required individual accepts required NDA/agreement records.

### Agreements And NDA

Do not use `consent_records` for NDAs.

`consent_records` is for privacy, profile visibility, data-processing, and AI-matching consent.

`agreements` supports challenge/application-specific legal or confidentiality acceptance such as NDA, confidentiality, and data-access agreements.

Access rule:

```text
accepted offer
+
required agreement accepted
-> eligible for restricted/T3 resource access
```

The static MVP `lockedBlocks` structure is not a production entity.

### Faculty Routing Vs Supervision

`challenge_faculty_assignments` is challenge-level academic/review routing by a managing unit. It is not student/team supervision.

`supervision_requests` asks whether a faculty member will supervise a specific application/team. It may exist before `projects` exists.

`projects.faculty_supervisor_id` is the authoritative active supervisor after project creation.

These are distinct:

```text
challenge_faculty_assignments
!= supervision_requests
!= projects.faculty_supervisor_id
```

### Faculty Capacity

`faculty_profiles.max_active_supervisions` stores configured faculty supervision capacity. It may be nullable if no explicit cap is configured.

Used capacity is derived from active/final-review supervised projects. Do not store `slots_used`.

### Milestone Workflow And Dual Approval

`milestone_status` uses:

```text
PENDING
IN_PROGRESS
SUBMITTED
REVISION_REQUESTED
COMPLETED
```

`OVERDUE` is not stored. It is derived:

```text
deadline < current date
AND status != COMPLETED
```

`milestone_reviews` records reviewer identity, reviewer organization, reviewer role, decision, comments, and timestamps. Repeated review/revision rounds are represented as multiple rows.

Static MVP booleans such as `facultyApproved` and `posterApproved` are replaced by review records.

V1 milestone completion policy:

- `milestone_reviews` is the authoritative source for milestone approval/revision decisions.
- A submitted milestone becomes eligible for `COMPLETED` when the latest required `FACULTY` review is `APPROVED` and the latest required `PARTNER` review is `APPROVED`.
- `MANAGING_ORGANIZATION` may submit review/comment records where allowed, but its approval is not required for milestone completion in v1.
- If either required reviewer issues `REVISION_REQUESTED` after the current submission/review round, the milestone should move to `REVISION_REQUESTED` and must be resubmitted/re-reviewed before becoming completed.

Do not add `faculty_approved` or `partner_approved` booleans. Do not add a `milestone_review_requirements` table in ERD v1. If future challenges require configurable reviewer policies, that can be introduced in a later schema version.

### Deliverables

`deliverables` supports files, links, text, and other submission types through `deliverable_type`.

`file_url` and `external_url` are references to object storage or external resources. Files are not stored as PostgreSQL blobs.

### Multi-Disciplinary Assessment Architecture

Assessments remain multi-disciplinary and must support programming, engineering, business, healthcare, supply chain, reasoning, case analysis, and other disciplines.

`assessments` is the parent definition. `assessment_sections` groups questions; a simple assessment may have one section.

`assessment_questions.config jsonb` is approved for type-specific configuration only, such as:

- Multiple-choice options and correct option.
- Coding language, starter code, and sample tests.
- Case context and allowed resources.

Do not normalize every possible discipline-specific question shape into many sparse tables.

`assessment_responses.response_data jsonb` supports structured answers only when needed, such as selected-option metadata or coding-answer metadata.

`assessment_scores` uses `overall_score` plus `rubric_scores jsonb` instead of mandatory fixed discipline-specific columns. User-facing bands such as `Strong`, `Proficient`, `Developing`, and `Below threshold` are derived from numeric scores and policy thresholds, not stored as authoritative result state.

Assessment proctoring and lockdown event persistence is deferred.

Assessment ownership for team applications is resolved through `assessments.scope`:

- `assessments.scope = TEAM` means one application-level attempt represents the application/team.
- `assessments.scope = INDIVIDUAL` means attempts belong to individual application members.

Intended invariants:

- TEAM assessments have one relevant attempt per assessment/application and `application_member_id = NULL`.
- INDIVIDUAL assessments have one relevant attempt per assessment/application member and `application_member_id` is required.

DBML represents the nullable relationship from `assessment_attempts.application_member_id` to `application_members.id`. Exact uniqueness/check constraints for TEAM and INDIVIDUAL scopes must be implemented during Drizzle/PostgreSQL translation.

Assessment question ownership is normalized through sections:

```text
assessments
-> assessment_sections
-> assessment_questions
```

`assessment_questions` belongs to an assessment through its required `section_id`. This prevents a question from referencing assessment A while also referencing a section from assessment B. A simple assessment should still have one section.

Assessment cross-table consistency invariants:

- If `assessment_attempts.application_member_id IS NOT NULL`, that application member must belong to `assessment_attempts.application_id`.
- The assessment and application involved in an attempt must belong to the same challenge: `assessment.challenge_id = application.challenge_id`.
- Every `assessment_response.question_id` must belong to the same assessment as `assessment_response.attempt_id`: `response.question.section.assessment_id = response.attempt.assessment_id`.

Later Drizzle/PostgreSQL implementation should enforce these invariants using appropriate foreign keys, composite uniqueness/constraints where practical, transactions, and service-level validation where a relational constraint alone is insufficient.

### Eligibility Rules

Challenge eligibility uses `challenge_eligibility_rules` rather than many fixed columns on `challenges`.

Initial rule types:

- `MIN_GPA`
- `STUDY_YEAR`
- `SCHOOL`
- `MAJOR`
- `AVAILABLE_HOURS`
- `MAX_ACTIVE_PROJECTS`

`config jsonb` stores rule-specific data only. Do not store derived live-project counts on student profiles.

### Academic Data Boundary

`student_profiles` stores a minimal nullable academic summary:

- `school`
- `major`
- `study_year`
- `gpa`
- `gpa_scale`
- `academic_data_verified_at`

Full registrar course ingestion, registrar synchronization, transcript persistence, and pinned/showcased courses are deferred. A future institutional system may become the authoritative source for academic records.

### Challenge Marketplace Fields

The following are first-class challenge concepts in ERD v1 because they have stable operational meaning:

- `subtype`
- `work_mode`
- `team_size_min`
- `team_size_max`
- `start_date`
- `compensation_type`
- `compensation_description`
- `summary`
- `description`

`summary` is the marketplace/public-facing overview. `description` is the fuller challenge brief. Confidentiality/access to fuller information is enforced later through services/RBAC/access policy.

Domain tags are not modeled as a separate generic tag architecture in v1. Keep `challenges.domain` and use skill taxonomy independently. Responsibilities can remain in challenge description and expected deliverables.

### Public ID Strategy

Internal primary keys remain `bigint`/bigserial-style relational IDs.

Externally routed major resources get safe public identifiers:

- `challenges.public_id`
- `applications.public_id`
- `projects.public_id`

Challenges also allow a unique human-readable `slug`.

Do not add public UUIDs to every child or junction table.

```text
internal relation key = bigint
external route identifier = UUID/slug where needed
```

### Feedback Visibility

ERD v1 keeps one generic `feedback` system.

`feedback_type` distinguishes general, faculty-closeout, and partner-closeout feedback.

`feedback_visibility` records intended audience. Private admin/CAID notes should use restricted visibility such as `PRIVATE_ADMIN` and must not be exposed through general project visibility.

Structured fields such as quality, reliability, and would-host-again belong in `metrics jsonb`. Human-readable remarks remain in `content`.

Formal milestone workflow decisions must live only in `milestone_reviews`.

```text
milestone_reviews
-> authoritative milestone approval/revision decisions

feedback
-> general and close-out feedback only
```

`feedback.milestone_id` may remain nullable for non-authoritative comments associated with a milestone, but `feedback` must not become a second authoritative source for `APPROVED` or `REVISION_REQUESTED` milestone decisions.

### Restricted Project Resources / T3

`project_resources` stores metadata and access references for restricted workspace resources.

It supports sensitivity and agreement requirements through:

- `sensitivity_level`
- `requires_agreement`

Do not store plaintext credentials or secrets in PostgreSQL. Actual secrets should later use an appropriate secrets-management mechanism.

### Project Creation

The canonical transition is:

```text
Application
    |
    +-- accepted application members
    +-- selected
    +-- accepted offer
    v
Project
    v
Project Members
```

Accepted application members are the source for initial `project_members`.

`projects.application_id` references the originating application directly and is unique in ERD v1. The challenge for a project is derived through:

```text
Project
-> Application
-> Challenge
```

This avoids duplicated challenge references that could disagree.

## PostgreSQL Implementation Conventions

### Timestamps

Use PostgreSQL `timestamptz` semantics for lifecycle and system timestamps such as:

- `created_at`
- `updated_at`
- `submitted_at`
- `respond_by`
- `responded_at`
- `selected_at`
- `assigned_at`
- `accepted_at`
- `application_deadline`

Use `date` for true calendar-only business values where time-of-day is not meaningful, such as project start/end dates and milestone deadlines.

### IDs

Keep internal primary keys as `bigint`/bigserial-style values.

Use UUID/public IDs only for externally routed major resources.

Drizzle implementation note: Phase 2.4-2.7 uses Drizzle `bigint`/`bigserial` with `mode: "bigint"` consistently for internal relational IDs. This preserves PostgreSQL `bigint` semantics and avoids JavaScript safe-integer truncation. API serialization layers must convert bigint values explicitly when exposed outside server-side code.

### Creation And Update Timestamps

Ordinary `created_at` should later map to `NOT NULL DEFAULT now()`.

Ordinary `updated_at` should initialize to `now()` and be maintained by the application/Drizzle layer.

Do not introduce database triggers for `updated_at` in v1.

### JSONB

Approved JSONB use cases:

- Challenge eligibility rule config.
- Assessment question config.
- Assessment structured response data.
- Assessment rubric scores.
- Feedback metrics.
- Audit log details.

Do not use JSONB as a substitute for proper core relational relationships.

### Numeric Precision

Decimals represent bounded values in several places:

- Confidence values should be normalized, generally `0.0` to `1.0`.
- Matching similarities and component scores should be normalized and documented by model/version.
- Matching weights should be non-negative and normalized where practical.
- Assessment scores should use a consistent rubric scale per assessment.

Exact PostgreSQL precision and scale should be finalized during Drizzle translation where DBML syntax is insufficient.

Drizzle implementation note: Phase 2.4-2.7 uses `numeric(6,5)` for normalized 0-1 confidence, similarity, component-score, and weight values; `numeric(8,2)` for assessment rubric scores; and `numeric(4,2)` for GPA values. CHECK constraints enforce stable row-local ranges where appropriate.

### URL And Storage Fields

URL/storage fields are text-like references. They point to object storage keys, signed URL targets, or external resources. They do not imply file/blob storage inside PostgreSQL.

### Foreign-Key Deletion

General policy:

- Major historical/domain records should normally use restrictive or set-null semantics, or lifecycle archival.
- Pure owned child records may cascade with their parent.
- Do not cascade-delete historical applications or projects merely because a user or organization becomes inactive.

Exact FK behavior must be specified during Drizzle translation.

### pgvector And Embeddings

The local PostgreSQL environment supports pgvector.

pgvector extension availability belongs in version-controlled Phase 2 migrations.

ERD v1 intentionally does not contain fake production `text` columns for embeddings.

Phase 7 may add semantic vector columns such as:

```text
skills.embedding vector(N)
student_projects.semantic_embedding vector(N)
challenges.semantic_embedding vector(N)
```

Only add those after selecting the embedding model and vector dimension. Do not invent `vector(1536)`, `vector(768)`, or any other dimension in Phase 2. Model choice, vector dimensions, vector column implementation, and HNSW/IVFFlat indexes are deferred to Phase 7.

Phase 2.8 implementation status: the installed Drizzle stack supports pgvector column/index primitives, but ERD v1 intentionally has no vector columns. The initial version-controlled migration includes:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

This extension statement appears before schema objects in `drizzle/0000_empty_gladiator.sql`. Fresh-database replay verified that pgvector is enabled through migration history, with no manual SQL step required.

The verified Phase 2.8 database state has no vector columns or vector indexes. Future Phase 7 semantic matching work must add vector columns, dimensions, and index strategy through a new reviewed schema change and migration.

## Derived Values Not Stored

Do not add persistent columns for:

- Applicant count.
- Faculty slots used.
- Student live challenge count.
- Deadline urgency.
- Offer expired.
- Timeline node.
- CTA label.
- UI application stage.
- Partner board bucket.
- Recommendation display band.
- Profile completion percent.
- Milestone progress percent.
- Organization initials.
- Organization display name.

These values should be derived from authoritative records in services/queries.

## Deferred Features

ERD v1 intentionally does not add first-class tables for:

- Meetings or scheduling.
- Join links.
- Meeting attendees.
- Registrar course synchronization.
- Full transcript persistence.
- Pinned course showcase.
- AI brief parser/import persistence.
- Assessment lockdown/proctoring events.
- Detailed weekly availability grids.
- Interview scheduling.
- Interview attendees.

Do not encode interview scheduling into `application_status`.

## Out-Of-Scope Static MVP Artifacts

The following static/demo concepts disappear as static implementation is replaced:

- `currentStudent`
- `currentFacultyId`
- `currentOrgId`
- pinned `TODAY`
- `providerApplications` duplicate fixtures
- client-only fake timers
- fake redirect/session state
- static `lockedBlocks` object structure

## Phase Boundary

Phase 2 is complete. ERD v1 is frozen in `docs/database/schema.dbml`, the executable Drizzle schema is implemented under `src/db/schema/**`, and the initial migration is version-controlled under `drizzle/**`.

Phase 2.8 was verified by applying the migration to the existing local database, resetting the local Docker PostgreSQL volume, replaying the migration from zero, confirming the Drizzle migration journal, and rerunning `pnpm db:migrate` as a no-op idempotence check.

Phase 3 is now using the frozen ERD to build deterministic seed and reset workflows. Do not change the frozen ERD or migration history unless a new reviewed schema change is explicitly approved.

## Local Development Reset Workflow

Phase 3.4 establishes the canonical local reset command:

```bash
pnpm db:reset
```

This command is destructive and is for LOCAL DEVELOPMENT ONLY. It deletes the local Docker PostgreSQL volume, restarts the repository's Docker Compose `db` service, waits for the container to become healthy, applies version-controlled migrations with `pnpm db:migrate`, and runs the guarded seed with `ALLOW_DB_SEED=true pnpm db:seed`.

Equivalent explicit workflow:

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate
ALLOW_DB_SEED=true pnpm db:seed
```

`docker compose down -v` deletes the local PostgreSQL volume. Do not run it against any environment where data must be preserved.

Safety distinction:

- `pnpm db:seed` is non-destructive and idempotent. It must never drop volumes, truncate arbitrary data, or reset the database.
- `pnpm db:reset` is explicitly destructive, tied to the local Docker Compose PostgreSQL service, and refuses non-local or production-looking targets before destroying the local volume.

Phase 3.4 verified that a fresh reset recreates the seed state implemented through Phase 3.3 from migrations plus seed only. Static UI integration remains a later phase; this checkpoint verifies database data coverage, not frontend migration.
