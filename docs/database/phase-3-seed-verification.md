# Phase 3 Seed Verification

Date: 2026-08-16

## 1. Scope

Phase 3.9 verified the complete Phase 3 compact normalized seed dataset only. No application source code, frozen DBML, Drizzle schema files, migrations, or seed behavior were changed during this verification pass.

## 2. Canonical Authority

The frozen production schema authority remains `docs/database/schema.dbml`, implemented by `src/db/schema/**` and the version-controlled migration under `drizzle/`. Static MVP fixtures remain provenance/evidence only; they are not production schema authority.

The Phase 3 seed authority is split across:

- `docs/database/seed-transformation-plan.md`
- `docs/database/reference-skill-seed.md`
- `docs/database/demo-seed-manifest.md`
- `src/db/seed.ts`
- `src/db/seed/**`

## 3. Canonical Reset Workflow

The canonical destructive local reset command is:

```bash
pnpm db:reset
```

Verified workflow:

```text
destroy local Docker PostgreSQL volume
start PostgreSQL
wait for health
apply version-controlled Drizzle migration
run guarded seed with ALLOW_DB_SEED=true
```

Manual non-destructive seed execution remains:

```bash
ALLOW_DB_SEED=true pnpm db:seed
```

## 4. Migration Verification

After `pnpm db:reset`, PostgreSQL recreated the schema from the version-controlled migration with:

| Item | Verified count |
|---|---:|
| Public domain tables | 45 |
| Public enums | 41 |
| Foreign keys | 82 |
| PostgreSQL CHECK constraints | 35 |
| Partial indexes | 11 |
| Drizzle migration journal rows | 1 |
| `pgvector` extension | enabled |
| Vector columns | 0 |
| Vector indexes | 0 |

The CHECK-constraint count uses PostgreSQL `pg_constraint.contype = 'c'`; `information_schema.table_constraints` also reports generated `NOT NULL` checks and is not the canonical count for this verification.

## 5. Full 45-Table Count Matrix

| Table | Pre-reset | Post-reset | Final idempotent | Classification | Result |
|---|---:|---:|---:|---|---|
| `agreements` | 5 | 5 | 5 | SEEDED | MATCH |
| `application_members` | 18 | 18 | 18 | SEEDED | MATCH |
| `application_projects` | 0 | 0 | 0 | DEFERRED_TO_LATER_PHASE | MATCH |
| `applications` | 8 | 8 | 8 | SEEDED | MATCH |
| `assessment_attempts` | 2 | 2 | 2 | SEEDED | MATCH |
| `assessment_questions` | 12 | 12 | 12 | SEEDED | MATCH |
| `assessment_responses` | 0 | 0 | 0 | INTENTIONALLY_ZERO | MATCH |
| `assessment_scores` | 2 | 2 | 2 | SEEDED | MATCH |
| `assessment_sections` | 5 | 5 | 5 | SEEDED | MATCH |
| `assessments` | 2 | 2 | 2 | SEEDED | MATCH |
| `audit_logs` | 0 | 0 | 0 | DEFERRED_TO_LATER_PHASE | MATCH |
| `challenge_eligibility_rules` | 17 | 17 | 17 | SEEDED | MATCH |
| `challenge_faculty_assignments` | 14 | 14 | 14 | SEEDED | MATCH |
| `challenge_reviews` | 0 | 0 | 0 | INTENTIONALLY_ZERO | MATCH |
| `challenge_skills` | 26 | 26 | 26 | SEEDED | MATCH |
| `challenges` | 8 | 8 | 8 | SEEDED | MATCH |
| `consent_records` | 0 | 0 | 0 | DEFERRED_TO_LATER_PHASE | MATCH |
| `deliverables` | 12 | 12 | 12 | SEEDED | MATCH |
| `faculty_profiles` | 6 | 6 | 6 | SEEDED | MATCH |
| `feedback` | 0 | 0 | 0 | INTENTIONALLY_ZERO | MATCH |
| `match_experience_details` | 0 | 0 | 0 | DEFERRED_TO_LATER_PHASE | MATCH |
| `match_results` | 0 | 0 | 0 | DEFERRED_TO_LATER_PHASE | MATCH |
| `match_skill_details` | 0 | 0 | 0 | DEFERRED_TO_LATER_PHASE | MATCH |
| `milestone_reviews` | 20 | 20 | 20 | SEEDED | MATCH |
| `milestones` | 15 | 15 | 15 | SEEDED | MATCH |
| `notifications` | 0 | 0 | 0 | DEFERRED_TO_LATER_PHASE | MATCH |
| `offers` | 5 | 5 | 5 | SEEDED | MATCH |
| `organization_memberships` | 7 | 7 | 7 | SEEDED | MATCH |
| `organizations` | 7 | 7 | 7 | SEEDED | MATCH |
| `project_evidence` | 0 | 0 | 0 | DEFERRED_TO_LATER_PHASE | MATCH |
| `project_members` | 10 | 10 | 10 | SEEDED | MATCH |
| `project_resources` | 10 | 10 | 10 | SEEDED | MATCH |
| `project_skills` | 0 | 0 | 0 | DEFERRED_TO_LATER_PHASE | MATCH |
| `projects` | 4 | 4 | 4 | SEEDED | MATCH |
| `selections` | 5 | 5 | 5 | SEEDED | MATCH |
| `skill_aliases` | 4 | 4 | 4 | SEEDED | MATCH |
| `skill_candidates` | 0 | 0 | 0 | DEFERRED_TO_LATER_PHASE | MATCH |
| `skill_categories` | 9 | 9 | 9 | SEEDED | MATCH |
| `skill_relationships` | 0 | 0 | 0 | DEFERRED_TO_LATER_PHASE | MATCH |
| `skills` | 58 | 58 | 58 | SEEDED | MATCH |
| `student_profiles` | 7 | 7 | 7 | SEEDED | MATCH |
| `student_projects` | 0 | 0 | 0 | DEFERRED_TO_LATER_PHASE | MATCH |
| `student_skills` | 33 | 33 | 33 | SEEDED | MATCH |
| `supervision_requests` | 1 | 1 | 1 | SEEDED | MATCH |
| `users` | 20 | 20 | 20 | SEEDED | MATCH |

## 6. Reference Taxonomy Verification

Verified counts:

- `skill_categories = 9`
- `skills = 58`
- `skill_aliases = 4`
- `skill_relationships = 0`

Stored aliases are exactly:

- `Data Visualisation -> Data Visualization`
- `Optimisation -> Optimization`
- `Postgres -> PostgreSQL`
- `Visualisation -> Visualization`

No alias normalizes to the same string as its canonical skill. Challenge skill rows all resolve to existing canonical skills, with `REQUIRED = 17` and `PREFERRED = 9`.

## 7. Compact Scenario Verification

Verified scenario spine:

| Scenario | Result |
|---|---|
| `route-optimisation` public technical challenge | PASS |
| `merchant-churn-model` confidential partner challenge | PASS |
| `demo-elab-venture-readiness-dashboard` E-Lab owner and manager | PASS |
| `app-triage` solo rejected assessment scenario | PASS |
| `app-route` selected application with pending offer, invited member, no agreements, no project | PASS |
| `app-churn` reviewed assessment, `SELECTION_PENDING`, no selection | PASS |
| `app-outreach` pending supervision request | PASS |
| `app-supply` active project | PASS |
| `app-energy` final-review project | PASS |
| `app-archive` completed project | PASS |
| `papp-depot` active partner-approval workflow | PASS |

Organization ownership checks passed: all challenges have owner and manager organizations; external partner scenarios use external owner plus CAID manager; the E-Lab demo challenge uses E-Lab as both owner and manager. No ambiguous `org-vinai` row exists.

Contact membership checks passed for all non-E-Lab challenge contacts. The E-Lab demo challenge intentionally uses the bootstrap E-Lab admin contact, who has active E-Lab admin membership rather than a separate contact-person row.

## 8. Application/Team Integrity

Application status distribution:

- `SUBMITTED = 1`
- `SELECTION_PENDING = 1`
- `SELECTED = 5`
- `REJECTED = 1`

Verified invariants:

- Every application has exactly one `LEADER`.
- Every leader is `ACCEPTED`.
- `submitted_by` is the accepted leader for all compact student/team applications.
- No duplicate `(application_id, student_id)` members exist.
- Every application member has a student profile.
- `app-triage` has one accepted leader and no artificial member.
- `app-route` keeps Minh Anh Nguyen as `INVITED`; that member is not an offer responder, project member, or agreement holder.

## 9. Assessment Integrity

Verified counts and semantics:

- `assessments = 2`
- `assessment_sections = 5`
- `assessment_questions = 12`
- `assessment_attempts = 2`
- `assessment_responses = 0`
- `assessment_scores = 2`

Both assessment attempts are `INDIVIDUAL`, `REVIEWED`, have non-null `application_member_id`, and belong to the correct application/challenge. `overall_score` remains `NULL` for both attempts because the source fixtures provide qualitative reviewed outcomes but no numeric score.

`app-triage` has the failed reviewed result supporting `REJECTED`; `app-churn` has the passed reviewed result and remains `SELECTION_PENDING`.

## 10. Selection/Offer/Agreement Integrity

Verified counts:

- `selections = 5`
- `offers = 5`
- `agreements = 5`

Offer status distribution:

- `PENDING = 1`
- `ACCEPTED = 4`

Verified invariants:

- No application has more than one selection.
- Every selection belongs to a `SELECTED` application.
- No selection has more than one offer.
- Accepted offer responses are by the accepted application leader.
- The pending `app-route` offer has null response actor/time.
- No persisted `EXPIRED` offer status exists.
- Agreement rows have coherent user/application/challenge references.
- No `app-route` agreement exists.
- No invited/non-accepted application member has an accepted agreement.

## 11. Project/Workspace Integrity

Verified counts:

- `projects = 4`
- `project_members = 10`
- `milestones = 15`
- `deliverables = 12`
- `milestone_reviews = 20`
- `project_resources = 10`
- `feedback = 0`

Project mapping:

- `app-supply -> ACTIVE -> Dr. Minh Pham`
- `app-energy -> FINAL_REVIEW -> Dr. Lan Vu`
- `app-archive -> COMPLETED -> Dr. Minh Pham`
- `papp-depot -> ACTIVE -> Dr. Kevin Nguyen`

Project invariants passed:

- Every project originates from one application with an accepted offer.
- `projects.application_id` is unique.
- `projects.challenge_id` does not exist.
- Challenge is derived through `project -> application -> challenge`.
- Project members correspond to accepted application members only.
- Ongoing supervision counts do not exceed `faculty_profiles.max_active_supervisions`.

Milestone and review distributions:

- Milestones: `PENDING = 2`, `IN_PROGRESS = 1`, `SUBMITTED = 3`, `REVISION_REQUESTED = 1`, `COMPLETED = 8`
- Reviews: `FACULTY = 11`, `PARTNER = 9`
- Decisions: `APPROVED = 19`, `REVISION_REQUESTED = 1`

No `OVERDUE` milestone status is stored. All milestone reviewers exist; faculty reviewers have faculty profiles; partner reviewers resolve to the owning organization contact membership. Formal milestone approvals are stored only in `milestone_reviews`, not `feedback`.

Deliverables are all `TEXT`, have valid milestone/project derivation, and have submitters who are project members. No binary/blob payloads are stored in PostgreSQL.

## 12. Agreement/Resource Access Prerequisites

Resource sensitivity distribution:

- `TEAM_ONLY / requires_agreement = false`: 6
- `RESTRICTED / requires_agreement = true`: 4

Agreement-gated coverage:

| Application | Restricted resource | Project users | Covered users |
|---|---|---:|---:|
| `app-supply` | `Inbound shipment extract (18 months)` | 3 | 3 |
| `app-supply` | `Partner staging database` | 3 | 3 |
| `papp-depot` | `Depot network extract` | 2 | 2 |
| `papp-depot` | `Routing API sandbox` | 2 | 2 |

The restricted resource keyword scan flagged two descriptions that explicitly state no credentials are stored. Direct inspection confirmed resource rows contain demo storage keys or empty access-reference metadata, not passwords, tokens, API keys, credentials, or plaintext secrets.

## 13. Deferred-Zero Tables

The following tables are intentionally zero at Phase 3 closeout:

| Table | Reason |
|---|---|
| `application_projects` | Transcript/experience conversion to structured evidence remains deferred. |
| `assessment_responses` | Source fixtures have qualitative reviewed outcomes but no answer-level payloads. |
| `audit_logs` | Runtime audit events belong to later implementation. |
| `challenge_reviews` | Static challenge fixtures do not contain durable review decisions/comments. |
| `consent_records` | Consent/auth flows remain later work; legal agreements are represented separately. |
| `feedback` | Compact fixtures lack deterministic generic feedback content; formal reviews use `milestone_reviews`. |
| `match_experience_details` | Matching output belongs to Phase 7. |
| `match_results` | Matching output belongs to Phase 7. |
| `match_skill_details` | Matching output belongs to Phase 7. |
| `notifications` | Notification generation belongs to later workflow implementation. |
| `project_evidence` | Project evidence artifacts remain deferred. |
| `project_skills` | Project skill derivation is not needed for Phase 3 demo coverage. |
| `skill_candidates` | Skill candidate governance remains deferred. |
| `skill_relationships` | Only explicitly approved relationships may be seeded; none are approved yet. |
| `student_projects` | Transcript/experience conversion remains deferred. |

## 14. Idempotency

After reset, a second guarded seed run succeeded:

```bash
ALLOW_DB_SEED=true pnpm db:seed
```

All 45 domain table counts remained unchanged, and lifecycle distributions remained unchanged.

## 15. Safety Verification

Verified safety behavior:

- `pnpm db:seed` without `ALLOW_DB_SEED=true` refused before writes.
- `NODE_ENV=production ALLOW_DB_SEED=true pnpm db:seed` refused before writes.
- `NODE_ENV=production pnpm db:reset` refused before any destructive Docker action.
- `pnpm db:reset` prints the local target and retains LOCAL DEVELOPMENT ONLY behavior.

## 16. Repository Validation

Validation commands passed:

- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm db:check`
- `pnpm exec drizzle-kit check`
- `pnpm build`
- `git diff --check`

`pnpm db:check` reported PostgreSQL 18.4. `pnpm build` completed successfully in the sandbox during this pass.

## 17. Known Limitations

Phase 3 closes the normalized production-valid database demo dataset. It does not remove static mock runtime reads from the UI. Phase 4/5 will migrate frontend/service read/write paths away from `src/lib/data/**` and related static helpers.

Remaining intentional deferrals:

- Skill relationships and embeddings remain Phase 7.
- Matching outputs remain Phase 7.
- Transcript/experience to `student_projects` and `application_projects` remains deferred.
- Ambiguous provider/team assessment results remain deferred until ownership is explicit.
- Notifications, audit demo events, meetings, parser/registrar/proctoring, object-storage access services, and runtime access checks remain later phases.

## 18. Phase 4 Readiness Conclusion

Phase 3.9 verification passed. The complete compact normalized seed dataset is reproducible from zero through migrations plus guarded seed, the seed is idempotent, lifecycle relationships are internally coherent, and deferred Phase 7 matching/embedding data did not leak into the dataset.

Phase 3 Seed Transformation is ready for human approval. Phase 4.1 Challenge Marketplace Read Path should not begin until Phase 3.9 human review is approved.
