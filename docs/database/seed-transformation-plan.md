# Seed Transformation Plan

Phase: 3.8 project/workspace seed implementation
Date: 2026-08-16

## Executive Summary

Phase 2 froze the production ERD, implemented the Drizzle schema, and verified the initial migration from a fresh PostgreSQL volume. Phase 3 should now transform useful static MVP fixtures into deterministic development seed data without treating the static TypeScript object shapes as production schema authority.

The seed should preserve recognizable demo scenarios while normalizing data into the frozen production tables. Static fixture fields that are UI-only, denormalized, duplicated, or derived must be excluded from persistence and recreated later through queries/services.

Human review correction: the compact initial DEMO scenario strategy is approved. Phase 3.1 should implement seed safety/context infrastructure, BOOTSTRAP records, and REFERENCE skill taxonomy first. Do not seed every static fixture.

## Phase 3.1 Implementation Status

Phase 3.1 implemented the seed safety/context infrastructure plus BOOTSTRAP and REFERENCE records only.

Implemented files:

- `src/db/seed.ts`
- `src/db/seed/context.ts`
- `src/db/seed/safety.ts`
- `src/db/seed/bootstrap.ts`
- `src/db/seed/reference.ts`
- `src/db/seed/organizations.ts`
- `src/db/seed/users.ts`
- `src/db/seed/skills.ts`
- `docs/database/reference-skill-seed.md`

Actual Phase 3.1 reference counts:

- skill categories: 9
- canonical skills: 58
- lexical aliases: 4 after final human-review cleanup
- skill relationships: 0
- embeddings: 0

Bootstrap identities:

- `caid.admin.dev@example.test` -> CAID organization membership with role `ADMIN`
- `elab.admin.dev@example.test` -> E-Lab organization membership with role `ADMIN`

Idempotency implementation:

- `users` are upserted by unique email.
- `organization_memberships` are upserted by unique `(user_id, organization_id, role)`.
- `skills` are upserted by unique `canonical_name`.
- `skill_aliases` use `ON CONFLICT DO NOTHING` on unique `(skill_id, alias)`.
- `organizations` and `skill_categories` use select-or-create by name because the frozen schema does not define a unique name constraint for those tables; the seed refuses to continue if multiple matching bootstrap/reference rows already exist.

Safety implementation:

- `pnpm db:seed` is non-destructive.
- The seed refuses to run unless `ALLOW_DB_SEED=true`.
- The seed refuses `NODE_ENV=production`.
- The seed parses `DATABASE_URL` and allows only approved local/development host and database targets.
- The seed prints host, database, and environment only; it does not print credentials or the full `DATABASE_URL`.

Final alias cleanup:

- Case, surrounding-whitespace, and repeated-whitespace differences are handled by canonical lookup normalization.
- Case-only source labels are documented for traceability but are not stored in `skill_aliases`.
- `skill_aliases` stores genuine spelling, abbreviation, or exact lexical alternatives only.
- Related but distinct competencies remain separate canonical skills and may later be connected through explicit `skill_relationships`.

Skill relationships remain deferred pending explicit human review. No `skill_relationships` rows are seeded in Phase 3.1, and no embeddings are generated.

## Phase 3.2 Implementation Status

Phase 3.2 establishes the compact DEMO identity and organization foundation required by later challenge/workflow seeding.

Implemented scope:

- DEMO organizations: 5
- DEMO organization contact users: 5
- DEMO student users/profiles: 7
- DEMO faculty users/profiles: 6
- DEMO contact memberships: 5
- DEMO student skill claims: 33

Phase 3.2 still seeds no challenges, applications, assessments, selections, offers, agreements, projects, milestones, deliverables, feedback, matching records, notifications, or audit demo records.

The compact manifest is now recorded at `docs/database/demo-seed-manifest.md`.

## Phase 3.3 Implementation Status

Phase 3.3 implements the compact DEMO challenge foundation only.

Implemented scope:

- DEMO challenges: 8
- DEMO challenge skill requirements: 26
- DEMO challenge eligibility rules: 17
- DEMO challenge faculty assignments: 14
- DEMO challenge reviews: 0

Seeded challenge-side fixtures:

- `merchant-churn-model`
- `route-optimisation`
- `triage-protocol-review`
- `community-health-outreach`
- `supply-chain-dashboard`
- `campus-energy-audit`
- `archive-digitisation`
- `demo-elab-venture-readiness-dashboard`

Challenge ownership/management choices:

- External partner challenges use the DEMO partner as `owner_organization_id` and CAID as `managing_organization_id`.
- Internal CAID-routed unit challenges use their DEMO internal unit as owner and CAID as manager.
- The synthesized E-Lab challenge uses E-Lab as both owner and manager.

Phase 3.3 keeps applications, application members, application project evidence, supervision requests, assessments, assessment attempts, selections, offers, agreements, projects, milestones, deliverables, feedback, matching records, notifications, and audit demo records deferred.

Phase 3.3 does not seed `challenge_reviews` because the static challenge-side fixtures do not contain durable review decisions/comments. Published/open challenge status is seeded directly without inventing approval history.

See `docs/database/demo-seed-manifest.md` for field mapping, visibility/confidentiality choices, skill normalization, eligibility rule representation, and faculty routing details.

## Phase 3.4 Reset Workflow Status

Phase 3.4 establishes the canonical local development reset workflow:

```bash
pnpm db:reset
```

The reset command is destructive and local-development-only. It deletes the local Docker PostgreSQL volume, restarts the repository's Docker Compose `db` service, waits for health, applies version-controlled migrations with `pnpm db:migrate`, and executes the guarded seed with `ALLOW_DB_SEED=true pnpm db:seed`.

The non-destructive seed command remains separate:

```bash
ALLOW_DB_SEED=true pnpm db:seed
```

Phase 3.4 verified that reset-from-zero recreates the seed state implemented through Phase 3.3:

- organizations: 7
- users: 20
- organization memberships: 7
- skill categories: 9
- canonical skills: 58
- skill aliases: 4
- skill relationships: 0
- student profiles: 7
- faculty profiles: 6
- student skills: 33
- challenges: 8
- challenge skills: 26
- challenge eligibility rules: 17
- challenge faculty assignments: 14
- challenge reviews: 0
- downstream workflow tables: 0 applications, 0 assessments, 0 selections, 0 offers, 0 projects, and 0 matching outputs

Migration-from-zero verification confirmed pgvector is enabled through migration history, 45 domain tables exist, 41 enums exist, 82 foreign keys exist, 35 PostgreSQL CHECK constraints exist, 11 partial indexes exist, and the Drizzle migration journal contains one applied migration.

Static UI equivalence note: the database now contains enough seeded data to later recreate the approved compact marketplace/challenge demo content. Application/team, assessment, offer, and project UI equivalence still depends on future workflow seed/database-backed phases.

## Phase 3.5 Application And Team Foundation Status

Phase 3.5 implements the compact DEMO application/team foundation only.

Implemented scope:

- DEMO applications: 8
- DEMO application members: 18
- DEMO application project evidence links: 0
- DEMO supervision requests: 1

Seeded application fixtures:

- `app-triage`
- `app-route`
- `app-churn`
- `app-outreach`
- `app-supply`
- `app-energy`
- `app-archive`
- `papp-depot`

Seeded supervision fixture:

- `inv-outreach` -> `supervision_requests`

Phase 3.5 normalizes every selected static team into `applications -> application_members`. Every application has exactly one accepted leader, and `submitted_by` is the application leader/member rather than an organization or contact user.

Important fixture normalization decisions:

- `app-triage` is preserved as the solo scenario: one application, one accepted leader, no artificial member row.
- `app-route` is preserved as the pending invite scenario: Jordan Lee is accepted leader, Priya Raman is accepted member, and Minh Anh Nguyen remains `MEMBER / INVITED`.
- `papp-depot` uses the same application/member model as student-facing fixtures: Bao Tran is accepted leader and Hoang Tran is accepted member.
- `app-outreach + inv-outreach` creates one pending application-level supervision request for Dr. Minh Pham, requested by Jordan Lee.
- `application_projects` remains zero because transcript/experience-to-`student_projects` conversion is still deferred.

Phase 3.5 staged status policy as implemented:

| Fixture | Static/final scenario | Phase 3.5 status | Later phase |
|---|---|---|---|
| `app-triage` | failed assessment / not selected | `ASSESSMENT` | Phase 3.6 assessment result can support `REJECTED` |
| `app-churn` | reviewed passing assessment | `SELECTION_PENDING` | Phase 3.6 assessment history |
| `app-route` | pending offer | `SELECTION_PENDING` | Phase 3.7 selection + offer |
| `app-outreach` | early pending supervision | `SUBMITTED` | Future downstream transition |
| `app-supply` | active project | `SELECTION_PENDING` | Phase 3.7 selection/offer, Phase 3.8 project |
| `app-energy` | final-review project | `SELECTION_PENDING` | Phase 3.7 selection/offer, Phase 3.8 project |
| `app-archive` | completed project | `SELECTION_PENDING` | Phase 3.7 selection/offer, Phase 3.8 project/close-out |
| `papp-depot` | partner approval workflow | `SELECTION_PENDING` | Phase 3.7 selection/offer, Phase 3.8 project |

Phase 3.5 deliberately does not seed `SELECTED` while `selections = 0`, and it does not seed `REJECTED` for `app-triage` until the failed assessment result is represented in Phase 3.6.

Committed-hour and narrative decisions:

- `application_members.committed_hours_per_week` remains `NULL` for every member because no selected fixture provides a distinct per-application commitment.
- `student_profiles.available_hours_per_week` remains the general profile availability source.
- `applications.motivation` and `applications.relevant_experience` remain `NULL` because the selected static fixtures do not contain submitted draft narratives.

Phase 3.5 keeps assessments, assessment attempts, selections, offers, agreements, projects, project members, milestones, deliverables, milestone reviews, project resources, feedback, and matching outputs deferred.

See `docs/database/demo-seed-manifest.md` for exact public IDs, member mappings, lifecycle matrix, and supervision-request details.

## Phase 3.6 Assessment Layer Status

Phase 3.6 implements the compact DEMO assessment layer only.

Implemented scope:

- DEMO assessments: 2
- DEMO assessment sections: 5
- DEMO assessment questions: 12
- DEMO assessment attempts: 2
- DEMO assessment responses: 0
- DEMO assessment scores: 2

Seeded assessment fixtures:

- `assessment:triage-protocol-review` -> `application:app-triage`
- `assessment:merchant-churn-model` -> `application:app-churn`

Phase 3.6 ownership policy as implemented:

- Both seeded assessments use `assessments.scope = INDIVIDUAL`.
- Each attempt is linked to Jordan Lee's accepted `application_members` row for the corresponding application.
- No TEAM-scope attempt is seeded.
- Provider/team assessment results without deterministic member attribution remain deferred.

Assessment definition mapping:

- `triage-protocol-review` uses the static cognitive sections: 4 sections and 10 `MULTIPLE_CHOICE` questions.
- `merchant-churn-model` uses the static coding problem bank: 1 section and 2 `CODING` questions.
- Questions are linked through `assessment_sections`; there is no direct question-to-assessment seed path.
- Type-specific question details are stored in `assessment_questions.config` JSONB.

Assessment result mapping:

- `app-triage` seeds one reviewed failed individual attempt and one qualitative score/rubric record. The application transitions from `ASSESSMENT` to `REJECTED` after the durable reviewed result exists.
- `app-churn` seeds one reviewed passed individual attempt and one qualitative score/rubric record. The application remains `SELECTION_PENDING`.
- `assessment_scores.overall_score` remains `NULL` for both seeded scores because the static fixtures provide qualitative bands, not numeric totals.
- `assessment_responses` remains 0 because the static fixtures provide no response-level answers.

Deferred/avoided records:

- `papp-depot` provider/team `testResult` is deferred because the owner is not attributable to a specific member.
- `app-route` is reserved for Phase 3.7 pending-offer coverage and receives no assessment attempt in Phase 3.6.
- Project-bound assessment histories for `app-supply`, `app-energy`, and `app-archive` remain deferred.
- Selections, offers, agreements, projects, project members, milestones, deliverables, milestone reviews, project resources, feedback, and matching outputs remain at zero.

Phase 3.6 application status distribution:

- `SUBMITTED`: 1
- `ASSESSMENT`: 0
- `SELECTION_PENDING`: 6
- `SELECTED`: 0
- `REJECTED`: 1
- `WITHDRAWN`: 0

See `docs/database/demo-seed-manifest.md` for exact assessment definitions, attempt ownership, lifecycle transitions, and deferral notes.

## Phase 3.7 Selections, Offers, And Agreements Status

Phase 3.7 implements the compact DEMO selection/offer/agreement layer only.

Implemented scope:

- DEMO selections: 5
- DEMO offers: 5
- DEMO agreements: 5

Seeded selection/offer fixtures:

- `application:app-route` -> pending offer
- `application:app-supply` -> accepted offer
- `application:app-energy` -> accepted offer
- `application:app-archive` -> accepted offer
- `application:papp-depot` -> accepted offer

Phase 3.7 classification policy as implemented:

- `app-triage` is `NO_SELECTION` and remains `REJECTED`.
- `app-churn` is `NO_SELECTION` and remains `SELECTION_PENDING` after its passing reviewed assessment because no deterministic final-selection evidence is present.
- `app-outreach` is `NO_SELECTION` and remains `SUBMITTED` with its pending supervision request.
- `app-route` is `SELECTION_WITH_PENDING_OFFER`.
- `app-supply`, `app-energy`, `app-archive`, and `papp-depot` are `SELECTION_WITH_ACCEPTED_OFFER`.

Selection and offer mapping:

- One selected application has exactly one `selections` row.
- One selection has exactly one durable `offers` row.
- `applications.status` is updated to `SELECTED` only for applications with a selection row.
- `selected_by` uses the deterministic owner/contact actor where available: Bến Cảng contact for Bến Cảng scenarios, Facilities contact for campus energy, and Heritage contact for archive.
- Accepted offers use `responded_by` = the accepted application leader.
- The `app-route` pending offer keeps `responded_by = NULL`, `responded_at = NULL`, and preserves the invited member without creating a project or agreement.
- Offer expiration remains derived from `PENDING + respond_by < current time`; no `EXPIRED` status is seeded.

Agreement mapping:

- Individual NDA agreements are seeded only for accepted-offer scenarios with deterministic NDA/restricted-resource evidence.
- `app-supply` seeds NDA `demo-v1` agreements for Jordan Lee, Priya Raman, and Minh Anh Nguyen.
- `papp-depot` seeds NDA `demo-v1` agreements for Bao Tran and Hoang Tran.
- `app-route` seeds no agreements because the offer is still pending, even though the offer requires NDA acceptance later.
- `app-energy` and `app-archive` seed no agreements because no deterministic NDA requirement exists.
- No agreement is seeded for invited application members.

Deferred/avoided records:

- Projects, project members, milestones, deliverables, milestone reviews, project resources, feedback, matching outputs, notifications, and audit logs remain deferred.
- Phase 3.7 does not fabricate rich offer terms beyond compact deterministic static values and minimal lifecycle support for historical project fixtures.
- `papp-depot` selection/offer state is labeled synthesized lifecycle support where needed because the static provider fixture has active-project evidence but project rows remain Phase 3.8.

Phase 3.7 application status distribution:

- `SUBMITTED`: 1
- `ASSESSMENT`: 0
- `SELECTION_PENDING`: 1
- `SELECTED`: 5
- `REJECTED`: 1
- `WITHDRAWN`: 0

See `docs/database/demo-seed-manifest.md` for exact selection/offer timestamps, actors, terms, agreement users, invariants, and deferral notes.

## Phase 3.8 Projects, Milestones, Workspace Resources, And Feedback Status

Phase 3.8 implements the compact DEMO project/workspace layer only.

Implemented scope:

- DEMO projects: 4
- DEMO project members: 10
- DEMO milestones: 15
- DEMO deliverables: 12
- DEMO milestone reviews: 20
- DEMO project resources: 10
- DEMO feedback: 0

Seeded project fixtures:

- `application:app-supply` -> `project:app-supply`
- `application:app-energy` -> `project:app-energy`
- `application:app-archive` -> `project:app-archive`
- `application:papp-depot` -> `project:papp-depot`

Project creation policy as implemented:

- Projects are created only for originating applications whose selection has an `ACCEPTED` offer.
- `projects.application_id` is the canonical project origin. Challenge ownership and challenge metadata are derived through `project -> application -> challenge`.
- `app-route` remains `SELECTED` with one `PENDING` offer, one invited member, no agreements, and no project.
- Project creation does not mutate `applications.status`; project-bound applications remain `SELECTED`.
- Selection, offer, and agreement counts from Phase 3.7 remain unchanged.

Project status distribution:

- `ACTIVE`: 2 (`app-supply`, `papp-depot`)
- `FINAL_REVIEW`: 1 (`app-energy`)
- `COMPLETED`: 1 (`app-archive`)

Faculty supervisor mapping:

- `project:app-supply` -> `user:fac-pham`
- `project:app-energy` -> `user:fac-vu`
- `project:app-archive` -> `user:fac-pham`
- `project:papp-depot` -> `user:fac-nguyen-k`

Supervision capacity sanity check:

- Dr. Minh Pham has 1 ongoing seeded project against `max_active_supervisions = 5`; the completed archive project is not counted as ongoing.
- Dr. Lan Vu has 1 ongoing seeded project against `max_active_supervisions = 5`.
- Dr. Kevin Nguyen has 1 ongoing seeded project against `max_active_supervisions = 4`.
- No persisted slots-used counter is seeded.

Project member derivation:

- Initial `project_members` are derived from accepted `application_members` only.
- `app-supply` seeds 3 project members: Jordan Lee, Priya Raman, Minh Anh Nguyen.
- `app-energy` seeds 2 project members: Jordan Lee, Hoang Tran.
- `app-archive` seeds 3 project members: Jordan Lee, Linh Pham, Thao Ha.
- `papp-depot` seeds 2 project members: Bao Tran, Hoang Tran.
- `INVITED` application members are not provisioned into project membership, and application member status is not changed.

Milestone and deliverable mapping:

- Milestone status distribution is `PENDING = 2`, `IN_PROGRESS = 1`, `SUBMITTED = 3`, `REVISION_REQUESTED = 1`, and `COMPLETED = 8`.
- No `OVERDUE` status is stored; overdue remains derived from deadline and state.
- Phase 3.8 seeds 12 `TEXT` deliverables for submitted/reviewed milestones only.
- No file payloads, object-storage clients, signed URLs, meeting records, meeting links, notifications, or audit demo records are seeded.

Milestone review mapping:

- Static faculty/partner approval booleans are normalized into `milestone_reviews`.
- Formal review distribution is 11 `FACULTY / APPROVED`, 8 `PARTNER / APPROVED`, and 1 `PARTNER / REVISION_REQUESTED`.
- Formal milestone decisions are not duplicated into generic `feedback`.
- Managing-organization reviews are not seeded and do not gate completion in v1.

Lifecycle evidence:

- `app-archive` is coherent as `COMPLETED` because its final milestone is `COMPLETED` with latest required `FACULTY = APPROVED` and latest required `PARTNER = APPROVED`.
- `app-energy` is coherent as `FINAL_REVIEW` because its final milestone is `SUBMITTED` with latest `FACULTY = APPROVED` and no partner review yet.
- `app-supply` is coherent as `ACTIVE` because it has active workspace data, one submitted current milestone, one in-progress milestone, and no final completed-project evidence.
- `papp-depot` preserves partner-approval workflow coverage because `Full-network run` is `SUBMITTED`, has latest `FACULTY = APPROVED`, and has no partner review yet.

Resource and agreement mapping:

- Resource sensitivity distribution is 6 `TEAM_ONLY / requires_agreement = false` and 4 `RESTRICTED / requires_agreement = true`.
- Restricted resources are seeded only for `app-supply` and `papp-depot`, the two accepted-offer scenarios with Phase 3.7 NDA agreements for all accepted project members.
- `app-energy` and `app-archive` have only agreement-free `TEAM_ONLY` resources.
- Resource rows store metadata/access references only; no plaintext credentials, passwords, private tokens, API keys, or binary file content are seeded.

Feedback and deferred content:

- `feedback = 0` is intentional because the compact fixtures do not provide deterministic close-out feedback text or structured feedback metrics.
- Matching outputs remain zero: no `match_results`, `match_skill_details`, or `match_experience_details` are seeded.
- Ambiguous provider/team assessment results, transcript/experience conversion, meetings, resource access services, notifications, audit demo records, embeddings, and semantic matching remain deferred.

Phase 3.8 verification summary:

- Repeated guarded seed execution is idempotent through Phase 3.8.
- `pnpm db:reset` recreates the Phase 3.8 project/workspace state from zero.
- Post-reset guarded seed execution remains idempotent.
- Seed safety still refuses without `ALLOW_DB_SEED=true`, and production safety still refuses with `NODE_ENV=production`.

See `docs/database/demo-seed-manifest.md` for exact project public IDs, milestone titles, project members, resource mappings, and acceptance invariants.

## Seed Categories

| Category | Meaning | Proposed records |
|---|---|---|
| BOOTSTRAP | Required for local development platform operation | CAID organization, E-Lab organization, one individual development admin user for each, organization memberships |
| REFERENCE | Stable reusable domain/reference data | skill categories, canonical skills, exact lexical skill aliases; skill relationships deferred until explicitly approved |
| DEMO | Scenario records that reproduce MVP flows | demo students/faculty/partners, challenges, applications, team members, assessments, offers, projects, milestones, resources, feedback |

Do not classify all static users as BOOTSTRAP. Most fixture people are DEMO identities.

## Source Files Inspected

- `AGENTS.md`
- `PRODUCTION_TRANSFORMATION_PLAN.md`
- `docs/database/schema.dbml`
- `docs/database/README.md`
- `docs/database/mvp-data-model-audit.md`
- `docs/database/mvp-erd-reconciliation.md`
- `src/db/schema/**`
- `src/lib/data/assessment.ts`
- `src/lib/data/applications.ts`
- `src/lib/data/brief-parse.ts`
- `src/lib/data/challenges.ts`
- `src/lib/data/directory.ts`
- `src/lib/data/faculty.ts`
- `src/lib/data/meetings.ts`
- `src/lib/data/organizations.ts`
- `src/lib/data/peers.ts`
- `src/lib/data/provider-applications.ts`
- `src/lib/data/student.ts`
- `src/lib/data/supervision-invites.ts`
- `src/lib/data/teams.ts`
- `src/lib/data/transcript.ts`
- `src/lib/types.ts`
- `src/lib/queries.ts`
- `src/lib/eligibility.ts`
- `src/lib/filters.ts`
- `src/lib/pipeline.ts`
- `src/lib/workspace.ts`
- `src/lib/provider.ts`
- `src/lib/supervision.ts`
- `src/lib/teams.ts`
- `src/lib/recommendations.ts`
- `src/lib/profile.ts`
- `src/lib/meetings.ts`
- `src/lib/dates.ts`

## Static Fixture Inventory

| Static source | Entities represented | Fixture IDs / counts | Important dependencies | Seed recommendation |
|---|---|---:|---|---|
| `src/lib/data/challenges.ts` | marketplace challenge cards, eligibility gates, assessment track hints, suggested faculty, locked blocks | 12 challenges | `orgId`, `suggestedFacultyIds`, skills, eligibility fields | DEMO challenges plus normalized challenge skills and eligibility rules |
| `src/lib/data/applications.ts` | Jordan's student-facing application pipeline | 12 applications | challenges, teams, faculty, assessments, offers, projects | Compact DEMO subset, not necessarily all 12 |
| `src/lib/data/provider-applications.ts` | partner-facing applicant board and projects | 10 applications | challenges, directory students, teams, offers, projects | Seed selectively; avoid duplicating student fixture scenarios unless needed |
| `src/lib/data/teams.ts` | Jordan application teams and invite states | leader/accepted/invited statuses | `currentStudent`, `peers` | NORMALIZE into `application_members` |
| `src/lib/data/directory.ts` | partner-visible student directory | 12 students | current student, peers, transcript pins | DEMO users/profiles/skills; pinned courses are deferred/drop |
| `src/lib/data/student.ts` | current student profile | `stu-jordan-lee` | transcript, profile helpers | DEMO user/profile/student skills |
| `src/lib/data/peers.ts` | teammate picker students | 6 peers | team fixtures | DEMO users/profiles; availability grid is deferred/drop |
| `src/lib/data/faculty.ts` | faculty profiles and capacity | 8 faculty | challenge assignments, supervision requests | DEMO users/faculty profiles |
| `src/lib/data/organizations.ts` | partner/provider organizations and contacts | 10 orgs | challenges, provider portal | DEMO organizations and contact users; CAID/E-Lab are synthesized BOOTSTRAP |
| `src/lib/data/assessment.ts` | cognitive sections/questions and coding problems | 4 cognitive sections, 10 MCQs, 2 coding problems | challenge assessment tracks | REFERENCE-like assessment templates or DEMO assessment definitions |
| `src/lib/data/supervision-invites.ts` | faculty supervision request queue | `inv-outreach` | application, faculty | DEMO `supervision_requests` |
| `src/lib/data/meetings.ts` | project meeting fixtures | meeting IDs per project | embedded projects | DROP/DEFER because meetings are deferred from ERD v1 |
| `src/lib/data/transcript.ts` | course/transcript and experience | 7 courses, 2 experiences | student profile/profile UI | Courses DROP/DEFER; experience to `student_projects` conversion is deferred beyond Phase 3.1 |
| `src/lib/data/brief-parse.ts` | partner post parser demo | parsed brief sample | partner posting UI | DROP/DEFER parser output persistence |

## Source-To-Seed Mapping Matrix

| Static source | Static concept | Production target | Action | Seed category | Notes |
|---|---|---|---|---|---|
| `organizations.ts` | partner organizations | `organizations` | RENAME/DEFER | DEMO | Do not infer `INTERNAL_UNIT` vs `EXTERNAL_PARTNER` from names. Seed only organizations whose classification is deterministic from known fixture/context. Exclude ambiguous organizations from the compact seed until explicitly classified. |
| synthesized | CAID and E-Lab | `organizations` | SYNTHESIZE | BOOTSTRAP | Use `INTERNAL_UNIT`, verified status. They are organizations, not users. |
| synthesized | CAID/E-Lab dev admins | `users`, `organization_memberships` | SYNTHESIZE | BOOTSTRAP | Individual development identities only; no real passwords or shared accounts. |
| `organizations.ts contact` | organization contact | `users`, `organization_memberships`, `challenges.contact_person_id` | NORMALIZE | DEMO | Create individual contact users and membership role `CONTACT_PERSON`; link challenge contact where deterministic. |
| `faculty.ts` | faculty | `users`, `faculty_profiles` | NORMALIZE | DEMO | `slotsTotal` maps to `max_active_supervisions`; `slotsUsed` is derived from active projects/supervision and should not be stored. |
| `student.ts`, `peers.ts`, `directory.ts` | students | `users`, `student_profiles` | NORMALIZE | DEMO | Minimal academic summary only: school/college, major, study year, GPA where available, hours. |
| `student.skills`, `directory.skills` | student skills | `skills`, `skill_aliases`, `student_skills` | NORMALIZE | REFERENCE/DEMO | Canonical skills are REFERENCE; per-student claims are DEMO. |
| `transcript.ts courses` | course records and pinned courses | none in ERD v1 | DROP/DEFER | none | Do not create course/transcript/pinned-course tables in Phase 3. |
| `transcript.ts experience` | internship/teaching experience | `student_projects`, `project_skills`, `project_evidence` | DEFER | DEMO | Defer transcript/experience conversion from Phase 3.1. Revisit during later DEMO seed implementation. |
| `challenges.ts` | challenge core | `challenges` | RENAME | DEMO | Use `slug` from static `id`; `summary`, subtype/domain/duration/hours/team size/work mode/compensation/deadline map directly or via enum transform. Use the approved description convention below. |
| `challenges.ts orgName/orgCategory/confidential` | display identity | `organizations`, `visibility`, `confidentiality_level` | NORMALIZE/DERIVE | DEMO | Organization display name/initials are derived. Confidential posts should use visibility/confidentiality, not duplicate display identity as authority. |
| `challenges.ts responsibilities[]` | expected work | `challenges.expected_deliverables` | NORMALIZE/RENAME | DEMO | Store as joined text or structured text convention; do not add a new table in Phase 3. |
| `challenges.ts skills[]` | challenge skill requirements | `challenge_skills` | NORMALIZE | DEMO | `must` to `REQUIRED`; `nice` to `PREFERRED`; normalize skill IDs where canonical exists. |
| `challenges.ts minGpa` | minimum GPA gate | `challenge_eligibility_rules` | NORMALIZE | DEMO | Rule type `MIN_GPA`, config like `{ "minGpa": 3.9 }`. |
| `challenges.ts eligibleYears` | study year gate | `challenge_eligibility_rules` | NORMALIZE | DEMO | Rule type `STUDY_YEAR`, config like `{ "studyYears": [2,3,4] }`. |
| `challenges.ts eligibleColleges` | school/college gate | `challenge_eligibility_rules` | NORMALIZE | DEMO | Rule type `SCHOOL`, config should use school codes/names consistently. |
| `challenges.ts hoursPerWeek` | hours requirement | `challenges.weekly_hours`, optional `AVAILABLE_HOURS` rule | KEEP/NORMALIZE | DEMO | Store challenge weekly hours; add eligibility rule only if eligibility UI requires gating. |
| `challenges.ts suggestedFacultyIds` | faculty routing suggestions | `challenge_faculty_assignments` | NORMALIZE | DEMO | Seed assignments with `PENDING` or `ACCEPTED` only when scenario needs it; assigned by CAID/E-Lab admin. |
| `challenges.ts applicantCount` | card count | query count of `applications` | DERIVE | none | Do not seed counters. |
| `challenges.ts lockedBlocks` | progressive disclosure UI blocks | agreements/resources/challenge/project content | DROP/DERIVE | none | Do not persist static block structures. |
| `applications.ts`, `provider-applications.ts` | application core | `applications` | RENAME | DEMO | Static `id` becomes seed key/slug/public route key, not DB bigint. |
| `Application.team` | application team | `applications.team_name`, `application_members` | NORMALIZE | DEMO | Applications are team submissions; no `applications.student_id`. |
| `TeamMember.status` | invite state | `application_members.status` | RENAME | DEMO | `leader` -> `ACCEPTED` plus `LEADER`; `accepted` -> `ACCEPTED`; `invited` -> `INVITED`; `declined` -> `DECLINED`. |
| `TeamMember.role` | role on application | `application_members.preferred_role` | RENAME | DEMO | `member_role` is leadership/member enum; preferred role stores product role label. |
| `TeamMember.hoursAvailable` | per-student availability | `student_profiles.available_hours_per_week`, `application_members.committed_hours_per_week` | NORMALIZE | DEMO | Profile availability is general; committed hours should use application/offer/challenge context. |
| `Application.stage` | UI lifecycle label | multiple authoritative tables | DERIVE/NORMALIZE | DEMO | Do not seed as one state column; map to application/assessment/selection/offer/project records. |
| `Application.nextAction`, `nextActionDue` | UI action and urgency | queries/services, `respond_by`, deadlines, milestones | DERIVE | none | Do not seed. |
| `Application.testResult` | assessment outcome | `assessment_attempts`, `assessment_responses`, `assessment_scores` | NORMALIZE/DEFER | DEMO | Explicit student-facing assessment scenarios with clear ownership may use `INDIVIDUAL` scope. Provider/team fixture results without member attribution are deferred. |
| `Application.offer` | invitation terms | `selections`, `offers` | NORMALIZE | DEMO | Use `respond_by`; expired display is derived from `PENDING` plus past deadline, not `EXPIRED` status. |
| `Application.project` | workspace/project | `projects`, `project_members`, `milestones`, `deliverables`, `milestone_reviews`, `project_resources`, `feedback` | NORMALIZE | DEMO | `projects.application_id` is canonical; never seed `projects.challenge_id`. |
| `Milestone.facultyApproved/posterApproved` | dual sign-off booleans | `milestone_reviews` | NORMALIZE | DEMO | Synthesize FACULTY/PARTNER review rows from true/false/decision. |
| `Meeting` | meeting/join link | none in ERD v1 | DROP/DEFER | none | Do not seed until meeting tables are approved. |
| `WorkspaceResource` | resource cards | `project_resources` | NORMALIZE | DEMO | `ndaTier` maps to `requires_agreement`; `masked` credentials are sensitive resource descriptions, not secrets. |
| `PartnerFeedback`, `facultyFeedback` | close-out feedback | `feedback` | NORMALIZE | DEMO | Use `feedback_type` and `visibility`; structured partner bands can go in `metrics` JSONB. |
| `assessment.ts cognitiveSections` | assessment sections/questions | `assessments`, `assessment_sections`, `assessment_questions` | NORMALIZE | DEMO/REFERENCE | Question options/correct index go in `config` JSONB. |
| `assessment.ts codingProblems` | coding problems | `assessment_questions.config` | NORMALIZE | DEMO/REFERENCE | Store starter code/sample tests in `config`; do not add new columns. |
| `provider.ts`, `workspace.ts`, `pipeline.ts` | buckets, CTAs, urgency, progress | queries/services | DERIVE | none | Preserve logic concepts later; do not persist derived labels. |
| `recommendations.ts` | deterministic scoring deck | matching tables in Phase 7 | DROP/DEFER | none | Do not seed `match_results`, `match_skill_details`, or `match_experience_details` in Phase 3. Matching outputs belong to Phase 7. |
| `dates.ts TODAY` | pinned scenario clock | seed reference date convention | DROP/DEFER | none | Use documented scenario timestamps; do not persist a fake global clock. |

## Dropped And Derived Fixture Fields

Do not seed these static values as stored production data:

- `applicantCount`
- `slotsUsed`
- `liveChallenges`
- deadline urgency labels
- offer expired labels
- `Application.stage` as a single source of truth
- timeline index/node
- CTA label/destination
- partner board bucket
- profile completeness/checklist percent
- recommendation display band/score; matching outputs belong to Phase 7
- milestone progress percent
- organization initials
- organization display name derived from organization/contact/confidentiality rules
- `currentStudent`, `currentFacultyId`, `currentOrgId`
- pinned `TODAY`
- `providerApplications` as a duplicate authority; use it only as scenario source material
- client-only timers and fake redirect/session state
- `lockedBlocks` object structures
- meetings/join links/attendees until a meeting schema exists
- course/transcript/registrar sync/pinned-course records until those deferred features are approved

## Team-Application Transformation

Production v1 uses:

```text
applications
  ↓
application_members
```

Mapping rules:

| Static member status | `application_members.member_role` | `application_members.status` | Notes |
|---|---|---|---|
| `leader` | `LEADER` | `ACCEPTED` | Exactly one leader per application. |
| `accepted` | `MEMBER` | `ACCEPTED` | Use `responded_at` from `invitedAt` if no better timestamp exists. |
| `invited` | `MEMBER` | `INVITED` | Preserve pending team invitation scenario. |
| `declined` | `MEMBER` | `DECLINED` | No current primary fixture uses this, but mapping is clear. |

`Team.name` maps to nullable `applications.team_name`. `TeamMember.role` maps to `application_members.preferred_role`. `TeamMember.hoursAvailable` belongs on `student_profiles.available_hours_per_week`; `application_members.committed_hours_per_week` should be synthesized from application draft, challenge weekly hours, or offer hours depending on the scenario.

Solo applications should still seed one `applications` row and one accepted `LEADER` application member.

## Lifecycle Transformation

Do not seed MVP `Application.stage` as the production authority. Use it to decide which rows exist.

| MVP stage | `applications.status` | Assessment rows | Selection/offer rows | Project rows | Notes |
|---|---|---|---|---|---|
| `APPLIED` | `SUBMITTED` | none or available assessment definition only | none | none | May include pending supervision request. |
| `SHORTLISTED` | `SHORTLISTED` | none | none | none | Waiting state. |
| `TEST_PENDING` | `ASSESSMENT` | attempt `NOT_STARTED` or no attempt yet | none | none | Seed assessment definition. |
| `TEST_SUBMITTED` | `ASSESSMENT` or `SELECTION_PENDING` | attempt `SUBMITTED` or `REVIEWED`; scores if reviewed | none | none | Choose based on whether result is reviewed. |
| `INTERVIEW_SCHEDULING` | `SELECTION_PENDING` | reviewed attempt if available | none | none | Interview tables are deferred; preserve only coarse application status. |
| `INTERVIEW_SCHEDULED` | `SELECTION_PENDING` | reviewed attempt if available | none | none | No meeting/interview row in ERD v1. |
| `INVITED` | `SELECTED` | reviewed attempt if present | `selections` + `offers(status=PENDING)` | none | Expiration derived from `respond_by`. |
| `ACTIVE` | `SELECTED` | reviewed attempt if present | selection + accepted offer | `projects(status=ACTIVE)` | `responded_by` should be accepted leader. |
| `IN_REVIEW` | `SELECTED` | reviewed attempt if present | selection + accepted offer | `projects(status=FINAL_REVIEW)` | Derived UI label from project status. |
| `COMPLETED` | `SELECTED` | reviewed attempt if present | selection + accepted offer | `projects(status=COMPLETED)` | Optional feedback rows. |
| `NOT_SELECTED` | `REJECTED` | reviewed failed attempt if present | none | none | No selection/offer. |
| `WITHDRAWN` | `WITHDRAWN` | optional historical attempt | none | none | Terminal without project. |
| `EXPIRED` | `SELECTED` | reviewed attempt if present | offer `PENDING` with `respond_by` before current time | none | `EXPIRED` remains derived. Do not use `REJECTED` merely because an offer expired. Current primary fixtures do not include this stage. |

## Selection And Offer Transformation

Static `Application.offer` normalizes into one `selections` row and one durable `offers` row.

Rules:

- One application has at most one selection.
- One selection has at most one offer.
- `offers.status = PENDING` for current invitation scenarios.
- Accepted project scenarios should use `offers.status = ACCEPTED`, `responded_at`, and `responded_by`.
- `responded_by` should be the accepted application leader.
- Offer expiration must remain derived from `respond_by`; do not invent `EXPIRED`.
- MVP `EXPIRED` maps to `applications.status = SELECTED`, `offers.status = PENDING`, and `respond_by < current time`. Do not use `REJECTED` merely because an offer expired.
- `agreements` should be seeded separately for NDA-required accepted project scenarios where T3 resource access must be demonstrated.

## Assessment Transformation

Static assessment definitions:

- Cognitive track: 4 sections, 10 MCQ questions.
- Technical track: 2 coding problems.
- Challenge assessment tracks: `Cognitive`, `Technical`, `Cognitive + Case`, `Cognitive + Domain scenario`.

Recommended mapping:

- Create one assessment per challenge that appears in the compact demo scenario set.
- Use `assessment_sections` for cognitive section names and for a simple technical section.
- Use `assessment_questions.question_type = MULTIPLE_CHOICE` for MCQs and `CODING` for coding problems.
- Store MCQ options/correct index and coding starter/sample-test data in `assessment_questions.config`.
- Use `assessments.scope = INDIVIDUAL` for Jordan student-facing assessment scenarios where the UI clearly says one student takes the test.
- For static provider/team fixtures where `testResult` is not attributable to a specific member, defer assessment-attempt/result seeding. Do not silently decide `TEAM` vs `INDIVIDUAL`.

Attempt mapping:

- `TEST_PENDING` -> `assessment_attempts.status = NOT_STARTED` for the relevant application/member, or no attempt if the intended UI starts from zero.
- `TEST_SUBMITTED` with visible result -> `assessment_attempts.status = REVIEWED`, `assessment_scores` with band comments/rubric JSONB.
- `passed = false` -> score/comment data that supports rejected application scenario.
- Section bands map to `assessment_scores.rubric_scores` JSONB; do not create unsupported columns.

## Project And Milestone Transformation

Static `Application.project` normalizes into:

```text
projects
project_members
milestones
deliverables
milestone_reviews
project_resources
feedback
```

Rules:

- `projects.application_id` is the only project origin link.
- Challenge ownership is derived through `project -> application -> challenge`.
- Accepted application members seed initial `project_members`.
- `ProjectRecord.startedAt` maps to `projects.start_date`.
- Project status derives from MVP stage: `ACTIVE`, `FINAL_REVIEW`, or `COMPLETED`.
- `Milestone.status` maps as follows:

| Static milestone status | Production `milestones.status` | Review synthesis |
|---|---|---|
| `Not started` | `PENDING` | no deliverable/review unless needed |
| `In progress` | `IN_PROGRESS` | no review |
| `Submitted` | `SUBMITTED` | create deliverable; create FACULTY review if `facultyApproved=true`; no PARTNER approval if `posterApproved=false` |
| `Revision requested` | `REVISION_REQUESTED` | create deliverable and review row with `REVISION_REQUESTED` for the reviewer that requested changes |
| `Approved` | `COMPLETED` | create deliverable and both FACULTY/PARTNER `APPROVED` reviews |

Do not seed `facultyApproved` or `posterApproved` booleans. They exist only to synthesize `milestone_reviews`.

Project resources:

- `WorkspaceResource.name` -> `project_resources.title`
- `kind` -> `resource_type`
- `ndaTier` -> `requires_agreement`; sensitivity `CONFIDENTIAL` or `RESTRICTED` if NDA-tier, otherwise `TEAM_ONLY` or `PUBLIC`
- `masked` -> safe demo `description`; never seed real credentials

Meetings are deferred and should not be seeded.

## Organization / CAID / E-Lab Bootstrap Plan

Bootstrap records:

| Seed key | Table(s) | Values |
|---|---|---|
| `org:caid` | `organizations` | name `CAID`, `organization_type=INTERNAL_UNIT`, `verification_status=VERIFIED` |
| `org:elab` | `organizations` | name `E-Lab`, `organization_type=INTERNAL_UNIT`, `verification_status=VERIFIED` |
| `user:caid-admin-dev` | `users`, `organization_memberships` | development identity, role `ADMIN` in CAID |
| `user:elab-admin-dev` | `users`, `organization_memberships` | development identity, role `ADMIN` in E-Lab |

Future production authentication provisioning remains separate. Do not seed passwords or secrets.

For demo organizations:

- Do not infer `INTERNAL_UNIT` vs `EXTERNAL_PARTNER` from organization names.
- Seed organizations only when classification is deterministic from known fixture/context.
- Ambiguous organizations should be excluded from the compact seed until explicitly classified.
- CAID and E-Lab remain `INTERNAL_UNIT`.
- Contacts become individual `users` with membership role `CONTACT_PERSON`.

Approved E-Lab demo scenario:

- Synthesize one clearly labeled DEMO challenge with `owner_organization = E-Lab` and `managing_organization = E-Lab`.
- This exists only to exercise the internal-unit ownership/management path.
- The challenge should be marked as synthesized demo data in seed constants/comments during implementation.

## Skill / Reference-Data Strategy

Canonical skill reference data should be seeded before demo records.

Initial canonical skill sources:

- Challenge skills: 31 unique names from `challenges.ts`.
- Student skills from `student.ts`, `directory.ts`, and peer/directory-only records.
- Experience skills from `transcript.ts`.
- Faculty research areas may be considered for aliases/categories, not necessarily skills.

Phase 3.1 implementation facts:

- Implemented category count: 9.
- Implemented canonical skill count: 58.
- Implemented lexical alias count: 4 after final human-review cleanup.
- Implemented skill relationship count: 0.
- Implemented embedding count: 0.
- Exact taxonomy review artifact: `docs/database/reference-skill-seed.md`.

Skill categories, aliases, relationships, and embeddings have distinct meanings:

- `skill_categories` are taxonomy/navigation only.
- `skill_aliases` are exact lexical normalization for the same underlying competency.
- `skill_relationships` are explicit semantic relationships between different canonical skills.
- Embeddings are a Phase 7 semantic fallback.

Category membership must never automatically imply matching equivalence.

Recommended taxonomy/navigation categories:

- Data & Analytics
- Machine Learning & AI
- Software & Systems
- Business & Strategy
- Design & Research
- Operations & Logistics
- Health & Life Sciences
- Sustainability & Environment
- Humanities & Archives

Approved alias policy:

- Case/whitespace variations use canonical lookup normalization and are not stored as `skill_aliases`.
- Seed aliases only for genuine alternate spelling, abbreviation, or synonym variants of the same competency.
- Valid alias examples include `Data Visualization` / `Data Visualisation` and `PostgreSQL` / `Postgres`.
- Do not normalize related but distinct competencies as aliases.

Examples that must remain separate canonical skills:

| Distinct skill | Not an alias of | Notes |
|---|---|---|
| `Pandas` | `Python` | Library competency differs from language competency. |
| `PyTorch` | `TensorFlow` | Related ML frameworks, not lexical variants. |
| `Airflow` | `Python` | Orchestration tool differs from language competency. |
| `dbt` | `SQL` | Analytics engineering tool differs from query language. |
| `OR-Tools` | `Optimization` | Tool differs from general optimization competency. |
| `GIS` | `Geospatial Analysis` | Keep separate when fixtures/product treat them as distinct competencies. |
| `User Research` | `Market Research` | Related research methods, not exact synonyms. |
| `Optimization` | `Operations Research` | Related but not equivalent. |

Distinct canonical skills may later be connected through `skill_relationships`.

Skill relationship seed policy:

- Only seed conservative, explicitly approved `skill_relationships`.
- Do not automatically generate a broad skill graph from mock data.
- Do not generate embeddings in Phase 3.0.
- Phase 3.1 seeded no `skill_relationships`; the explicit conservative relationship set remains deferred for human review.

## Eligibility Transformation

| Static field | Production table | Rule type/config |
|---|---|---|
| `minGpa` | `challenge_eligibility_rules` | `MIN_GPA`, `{ "minGpa": value, "scale": 4.0 }` |
| `eligibleYears` | `challenge_eligibility_rules` | `STUDY_YEAR`, `{ "studyYears": [...] }` |
| `eligibleColleges` | `challenge_eligibility_rules` | `SCHOOL`, `{ "schools": [...] }` |
| `hoursPerWeek` | `challenges.weekly_hours` and optional rule | `AVAILABLE_HOURS`, `{ "minimumHoursPerWeek": value }` if used as a gate |
| active challenge cap | service rule or eligibility rule | `MAX_ACTIVE_PROJECTS`, `{ "maxActiveProjects": 1 }` only if challenge-specific |

Do not add old static eligibility fields back to `challenges`.

## Challenge Description Convention

Use the following approved mapping:

```text
challenges.summary
<- static challenge summary

challenges.expected_deliverables
<- static responsibilities where appropriate

challenges.description
<- explicit challenge-level fuller description when available
<- otherwise deterministic fallback from challenge summary
```

Do not populate `challenges.description` from `Application.project.fullBrief`. Project full briefs are selected/project-level scenario material, not the authoritative challenge-level description source.

## Deterministic Identity Strategy

Recommended implementation approach:

- Define stable seed keys in TypeScript, such as `challenge:merchant-churn-model`, `application:app-route`, `user:stu-jordan-lee`.
- Use stable slugs/public identifiers where the schema supports them, especially `challenges.slug`.
- Insert parent records first and capture returned bigint IDs.
- Build child rows from captured IDs, not hard-coded numeric primary keys.
- Use unique natural keys for idempotency where available: user email, organization name, challenge slug, skill canonical name.
- Keep a per-run in-memory lookup map from seed key to returned bigint ID.
- Avoid depending on generated numeric IDs being the same between reset runs.

## FK Dependency / Insertion Order

Recommended insertion order:

1. Guard environment and start a transaction.
2. Insert BOOTSTRAP organizations: CAID, E-Lab.
3. Insert BOOTSTRAP admin users.
4. Insert bootstrap organization memberships.
5. Insert DEMO partner/internal organizations.
6. Insert DEMO users: contacts, faculty, students.
7. Insert organization memberships for contacts/admin/reviewers.
8. Insert student and faculty profiles.
9. Insert skill categories.
10. Insert canonical skills and skill aliases.
11. Insert student projects/evidence where approved.
12. Insert student skills and project skills.
13. Insert challenges.
14. Insert challenge skills, eligibility rules, faculty assignments, and review rows only where explicitly scoped; Phase 3.3 seeds zero review rows.
15. Insert applications.
16. Insert application members and application project evidence links.
17. Insert supervision requests.
18. Insert assessments, sections, and questions.
19. Insert assessment attempts, responses, and scores.
20. Insert selections and offers.
21. Insert agreements for NDA-required accepted scenarios.
22. Insert projects and project members.
23. Insert milestones.
24. Insert deliverables.
25. Insert milestone reviews.
26. Insert project resources.
27. Insert feedback rows.
28. Insert notifications/consent/audit demo rows only if needed for UI testing.
29. Commit transaction.

## Compact Scenario Dataset

The compact initial DEMO scenario strategy is APPROVED. Do not seed every static fixture in the initial demo dataset.

Phase 3.2 resolved the exact compact fixture list after excluding ambiguous organizations for identity/org prerequisites. The workflow records below remain deferred to later DEMO phases.

| Scenario | Selected fixture | Why preserve |
|---|---|---|
| Marketplace published challenge | `route-optimisation` | Public technical challenge with deterministic external partner classification; replaces `multimodal-perception` because `org-vinai` is excluded as ambiguous. |
| Confidential partner challenge | `merchant-churn-model` | Confidential display, partner pipeline, case assessment |
| Solo application | `app-triage` | Solo leader-only team and rejected assessment outcome using deterministic internal-unit classification. |
| Team application with pending invite | `app-route` | Team members accepted/invited, pending offer, NDA required |
| Assessment submitted/reviewed | `app-churn` | Passing reviewed assessment |
| Rejected/not-selected application | `app-triage` | Failed assessment to rejected outcome |
| Pending supervision request | `app-outreach` + `inv-outreach` | Faculty supervision request queue |
| Pending offer | `app-route` or `papp-churn-signal` | Selection + durable offer `PENDING` |
| Active project | `app-supply` | Workspace, resources, milestone statuses, NDA-tier data |
| Final-review project | `app-energy` | Project `FINAL_REVIEW`, submitted milestone |
| Completed project | `app-archive` | Close-out feedback path |
| Partner approvals queue | `papp-depot` | Partner milestone approval pending |
| E-Lab-managed challenge | `demo-elab-venture-readiness-dashboard` | Approved internal-unit path coverage with owner and manager both E-Lab |

This gives broad coverage without seeding all 22 application-like fixtures.

Selected Phase 3.2 prerequisite identities:

- Organizations: `org-bencang`, `org-vhf`, `org-facilities`, `org-heritage`, `org-health`.
- Contacts: Dung Tran, Ngoc Bui, Hai Do, Thu Hoang, Dr. Lan Nguyen.
- Students: Jordan Lee, Priya Raman, Minh Anh Nguyen, Hoang Tran, Bao Tran, Linh Pham, Thao Ha.
- Faculty: Dr. Minh Pham, Dr. Kevin Nguyen, Dr. Diane Osei, Dr. Lan Vu, Dr. Thu Le, Dr. Bao Tran.

Excluded or deferred organizations:

- `org-vinai` is excluded as ambiguous; fixture content does not deterministically classify it as an internal VinUni unit or external partner.
- `org-consumer`, `org-mekong`, and `org-green` are unambiguous external partners but outside the compact scenario set.
- `org-materials` is outside the compact scenario set after `app-spectro` is excluded.

## Idempotency And Safety Strategy

Recommended strategy for this repository:

- `pnpm db:seed` should be a non-destructive, idempotent seed of known records.
- A destructive reset is a separate explicit local-development workflow.
- The normal seed command must not automatically drop the database.
- Use deterministic unique keys plus transactional upsert for bootstrap/reference records.
- For demo records, prefer an explicit development reset then run the non-destructive seed during early Phase 3.
- Later, if rerunnable demo seed is needed, use targeted replacement of known demo records by stable seed keys/slugs/emails inside one transaction.
- Add a future environment guard: refuse to run unless `NODE_ENV !== "production"`, `ALLOW_DB_SEED=true`, and `DATABASE_URL` points to an approved local/development database host/name.
- Print the target database before seeding.
- Never mutate arbitrary records that do not carry known seed keys/natural keys.

## Proposed Phase 3 File Organization

Do not create these files in Phase 3.0. Recommended Phase 3.1+ structure:

```text
src/db/
├── seed.ts
└── seed/
    ├── context.ts
    ├── bootstrap.ts
    ├── reference.ts
    ├── demo.ts
    ├── organizations.ts
    ├── users.ts
    ├── skills.ts
    ├── challenges.ts
    ├── applications.ts
    ├── assessments.ts
    ├── projects.ts
    └── safety.ts
```

`context.ts` should hold the transaction/client and seed-key lookup maps. `safety.ts` should own environment/database guards.

## REVIEW Items Requiring Human Decisions

Human review correction resolved the prior Phase 3.0 review items for compact dataset size, provider-side assessment ownership, E-Lab demo coverage, organization classification policy, skill alias granularity, matching seed records, student experience conversion, and challenge description convention.

Phase 3.2 resolved the exact compact fixture list after excluding ambiguous organizations. See `docs/database/demo-seed-manifest.md`.

| Item | Decision needed | Blocking next step? |
|---|---|---|
| Explicit approved skill relationships | Decide which, if any, conservative `skill_relationships` should be seeded as REFERENCE data. | Not blocking categories/canonical skills/lexical aliases. |

## Recommended Phase 3.1+ Implementation Sequence

1. Implement seed safety guard and transaction context.
2. Implement BOOTSTRAP seeds for CAID/E-Lab organizations and development admin identities.
3. Implement REFERENCE skill categories, canonical skills, and approved lexical aliases.
4. Implement demo users/profiles for the compact scenario set.
5. Implement demo organizations/contacts.
6. Implement demo challenges, challenge skills, eligibility rules, and faculty assignments.
7. Implement applications and application members.
8. Implement assessments and attempts for reviewed individual scenarios.
9. Implement selections/offers/agreements.
10. Implement projects, project members, milestones, deliverables, milestone reviews, resources, and feedback.
11. Add `pnpm db:seed`.
12. Test reset-from-zero with migrate + seed. Completed in Phase 3.4.

## Phase 3.0 Completion Status

Phase 3.0 seed transformation design is complete and human review corrections are applied.

Phase 3.2 has resolved the compact DEMO identity/org fixture list and seeded only prerequisite identity/profile/contact/student-skill records.

Phase 3.3 has seeded the compact DEMO challenge-side foundation: challenge records, normalized challenge skills, eligibility rules, and pending faculty routing assignments.

Phase 3.4 has verified that the database can be recreated from zero using only Docker Compose, version-controlled migrations, and the guarded seed pipeline.

Phase 3.5 has seeded the compact application/team foundation: 8 applications, 18 application members, 0 application-project evidence links, and 1 pending supervision request.

Remaining REVIEW items do not block the next existing roadmap checkpoint.
