# Assessment Runtime Path

Date: 2026-08-22
Phase: 5.2 Assessments

## Scope

Phase 5.2 establishes the PostgreSQL-backed runtime boundary for student assessments. It migrates `/assessment/**` from static assessment/application fixtures to the normalized production model:

```text
assessments
    -> assessment_sections
    -> assessment_questions

assessment_attempts
    -> assessment_responses
    -> assessment_scores
```

This phase does not implement assessment definition authoring, reviewer scoring writes, automatic grading, code execution, proctoring persistence, selection/offer/agreement writes, project/workspace writes, matching, authentication, global RBAC, schema changes, migrations, or seed changes.

Implemented modules:

- `src/db/queries/assessments.ts`
- `src/db/mutations/assessments.ts`
- `src/services/assessment.service.ts`
- `src/app/assessment/[applicationId]/actions.ts`
- `scripts/verify-assessment-runtime.ts`

## Architecture

Assessment runtime follows the established server-side boundary:

```text
Browser / Next.js route or server action
        ↓
Assessment service
        ↓
Assessment query / mutation layer
        ↓
Drizzle
        ↓
PostgreSQL
```

React components do not import Drizzle, mutation helpers, the PostgreSQL pool, `DATABASE_URL`, grading keys, or raw assessment configuration.

## Read APIs

Query module APIs:

- `listActiveAssessmentsForChallenge(database, challengeId)`
- `getAssessmentDefinitionWithQuestions(database, assessmentId)`
- `getAssessmentAttemptForOwner(database, input)`
- `listAssessmentResponsesForAttempt(database, attemptId)`
- `getLatestAssessmentScoreForAttempt(database, attemptId)`

Service APIs:

- `getDevelopmentAssessmentActor(...)`
- `getAssessmentPreflight(applicationPublicId, actor, options?)`
- `getAssessmentTakingSession(applicationPublicId, actor, options?)`
- `getAssessmentResult(applicationPublicId, actor, options?)`
- `startAssessmentAttempt(applicationPublicId, actor, options?)`
- `saveAssessmentResponse(applicationPublicId, questionKey, response, actor, options?)`
- `submitAssessmentAttempt(applicationPublicId, actor, options?)`

Read models expose application public IDs and challenge slugs. Internal bigint IDs remain server-side except for question keys. Because `assessment_questions` has no public identifier in ERD v1, Phase 5.2 uses a narrow `q_<question_id>` key for response submission. The service resolves and revalidates that key against the current attempt's assessment before any response write.

## Assessment Scope

Phase 5.2 implements and verifies the `INDIVIDUAL` runtime first.

For `INDIVIDUAL` assessments:

- The actor must be an accepted `application_members` row for the application.
- `assessment_attempts.application_member_id` is required.
- The attempt member must belong to the same application as the attempt.
- One logical attempt per assessment/application member is supported by the existing partial unique index.

For `TEAM` assessments:

- ERD v1 supports `TEAM` through nullable `application_member_id`.
- Phase 5.2 does not implement TEAM start/save/submit behavior because no seeded or UI scenario requires it yet.
- The service rejects TEAM write runtime with `VALIDATION_ERROR` rather than silently choosing leader-owned or team-owned behavior.

## Access Policy

Student access is intentionally narrow before Phase 6 authentication:

- The route/action resolves one explicit development-only student actor through `src/lib/assessment-development.ts`.
- The actor must be a student.
- The actor must be an accepted member of the application.
- The assessment must belong to the same challenge as the application.
- INDIVIDUAL attempts must belong to that exact application member.

Authorization is never inferred from page URLs, display names, email strings supplied by the client, or static fixture IDs.

Reviewer writes are deferred because Phase 5.2 does not yet define a production reviewer ownership policy. Existing reviewed seeded attempts are read-only.

## Lifecycle

Supported student-side attempt lifecycle:

```text
no attempt
    -> IN_PROGRESS
    -> SUBMITTED
```

`REVIEWED` is read from seeded historical attempts and from future reviewer workflows, but students cannot transition an attempt to `REVIEWED`.

Rules:

- Starting an assessment creates an `IN_PROGRESS` attempt when the application is in `ASSESSMENT`.
- Starting an already `IN_PROGRESS` attempt is idempotent and returns the existing session.
- Saving is allowed only while the attempt is `NOT_STARTED` or `IN_PROGRESS`; normal UI starts first, so runtime writes use `IN_PROGRESS`.
- Submitting is allowed only from `IN_PROGRESS`.
- Repeated submit returns `INVALID_TRANSITION`.
- `SUBMITTED` and `REVIEWED` attempts are not student-editable.
- Phase 5.2 does not update `applications.status` when an attempt starts or submits. UI state is derived from `applications.status` plus `assessment_attempts.status`.

## Response Validation

Response writes are service-owned and transaction-safe.

Validation:

- Every response question must belong to the current attempt's assessment through `question -> section -> assessment`.
- `MULTIPLE_CHOICE` responses must include an integer selected option index that exists in the question's options.
- `CODING` responses store submitted source text only; Phase 5.2 does not execute code.
- Generic text-like question types require non-empty text when supported.
- Student payload cannot include score, rubric, reviewer, pass/fail, answer key, or grading metadata.

`assessment_responses` has no database unique constraint for `(attempt_id, question_id)` in the frozen schema. Phase 5.2 therefore implements service-level upsert:

```text
existing response for attempt/question
    -> update

no existing response
    -> insert

more than one existing response
    -> CONFLICT
```

No response version history is added.

## Safe Student Question Model

Raw `assessment_questions.config` can contain grading metadata. The Phase 3 seed stores MCQ `correctIndex` in config.

The student-facing mapper whitelists only answerable fields:

- MCQ: `options`
- Coding: `title`, `statement`, `language`, `starterCode`, `sampleTests`

It does not serialize:

- `correctIndex`
- answer keys
- hidden tests
- reviewer notes
- score/rubric metadata
- raw config objects

`scripts/verify-assessment-runtime.ts` asserts the taking-session model does not contain `correctIndex`.

## Result Behavior

Reviewed result reads use:

```text
assessment_attempts
assessment_scores
```

`app-triage` and `app-churn` both have:

- `attempt.status = REVIEWED`
- `assessment.scope = INDIVIDUAL`
- `assessment_scores.overall_score = NULL`
- qualitative bands in `assessment_scores.rubric_scores`
- zero `assessment_responses`

The migrated result page renders qualitative bands without coercing `NULL` numeric scores to `0`, `NaN`, or a fake percentage. `SUBMITTED` attempts without scores render a pending-review state.

## UI Routes Migrated

Migrated routes:

- `/assessment/[applicationId]`
- `/assessment/[applicationId]/take`
- `/assessment/[applicationId]/result`

Route identity is now the production `applications.public_id` UUID. Static fixture application IDs such as `app-churn` are no longer assessment-route authority.

The current temporary UI viewer is Jordan Lee's seeded development student resolved server-side through `src/lib/assessment-development.ts`. Phase 6 must replace this with real session identity.

Preserved UI concepts:

- preflight/system check
- desktop-only assessment runner
- lockdown chrome
- per-section cognitive navigation
- technical coding layout
- submit confirmation with unanswered count
- pending-review result
- qualitative reviewed-result display

## Deferred Items

Deferred by design:

- TEAM assessment start/save/submit semantics
- reviewer scoring/review writes
- re-review/history/versioning
- automatic MCQ scoring
- coding execution sandbox
- hidden test execution
- binary/file attachments and object storage
- proctoring/lockdown event persistence
- assessment definition/admin authoring
- application outcome transitions from assessment submission/review
- selection, offer, agreement, project, workspace, matching, notification, and audit writes

## Remaining Static Assessment References

After Phase 5.2, migrated `/assessment/**` routes no longer import:

- `src/lib/data/assessment.ts`
- `getApplicationById(...)`
- `getAllApplicationIds(...)`
- static `Application.testResult`

Remaining static references are classified as:

| Reference area | Classification |
|---|---|
| `src/lib/data/assessment.ts` | TEST/FIXTURE source retained for traceability |
| `src/lib/data/applications.ts` and `provider-applications.ts` `testResult` fields | UNMIGRATED LATER FEATURE for offer/workspace/faculty/partner boards |
| `src/lib/pipeline.ts` static assessment links/result branches | UNMIGRATED LATER FEATURE until application UI route migration |
| `src/app/offer/**`, `src/app/workspace/**`, `src/app/faculty/**`, `src/app/invitations/**` static application lookups | UNMIGRATED LATER FEATURE |
| `src/app/partner/**` assessment display fields | UNMIGRATED LATER FEATURE |

No static assessment fixture file was deleted because deferred surfaces still depend on static MVP data.

## Verification Summary

`scripts/verify-assessment-runtime.ts` verifies:

- baseline assessment counts
- baseline application status distribution
- `app-triage` reviewed failed qualitative result and `REJECTED` application status
- `app-churn` reviewed passing qualitative result and `SELECTION_PENDING` application status
- `overall_score = NULL` handling
- zero seeded-response handling
- disposable INDIVIDUAL attempt start
- idempotent start while in progress
- wrong-member denial
- student-safe question model without `correctIndex`
- valid MCQ save
- response update/upsert behavior
- invalid MCQ option rejection
- cross-assessment response rejection
- submit from `IN_PROGRESS`
- pending-review state after submit
- repeated-submit rejection
- submitted-attempt edit denial
- reviewed-attempt edit denial
- rollback preservation of canonical counts
- no assessment score, selection, offer, project, or matching write leakage

Canonical counts after verification remain:

```text
applications = 8
application_members = 18
assessments = 2
assessment_sections = 5
assessment_questions = 12
assessment_attempts = 2
assessment_responses = 0
assessment_scores = 2
selections = 5
offers = 5
agreements = 5
projects = 4
match_results = 0
```

## Next Boundary

The next checkpoint in `PRODUCTION_TRANSFORMATION_PLAN.md` is Phase 5.3 Offers. Phase 5.2 stops before any selection, offer, agreement, project, workspace, authentication, RBAC, or matching implementation.
