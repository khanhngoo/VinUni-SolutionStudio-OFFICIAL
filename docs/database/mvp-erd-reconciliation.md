# MVP <-> ERD Reconciliation

Phase: 2.1 ERD verification and 2.2 MVP reconciliation only  
Date: 2026-08-15  
Scope: analysis artifact for reconciling the current static MVP with `docs/database/schema.dbml` before ERD v1 freeze.

Authority note: `docs/database/schema.dbml` remains the canonical production ERD draft. The current static MVP and `docs/database/mvp-data-model-audit.md` are implementation evidence only. This document records mapping decisions, review items, gaps, and questions; it does not redesign the ERD.

## 1. Executive Summary

The current ERD is a strong conceptual foundation for identity, organizations, skills, challenges, applications, assessments, matching, selections, projects, feedback, consent, notifications, and audit logs.

It is not yet implementation-ready for PostgreSQL/Drizzle v1 because several current MVP workflows require decisions that are not explicit in the DBML. The most important unresolved areas are team-based applications before project creation, lifecycle state separation, offer/selection terms, faculty challenge routing versus faculty supervision, milestone submission and dual approval, and assessment modeling across disciplines.

The static MVP should not be copied into tables directly. Many fields are denormalized, derived, or presentation-only. However, several MVP concepts are useful production requirements and should be preserved intentionally through relational modeling, service-layer derivation, or explicit deferral.

## 2. ERD Implementation-Readiness Review

Source files inspected:

- `AGENTS.md`
- `PRODUCTION_TRANSFORMATION_PLAN.md`
- `docs/database/schema.dbml`
- `docs/database/mvp-data-model-audit.md`
- Repository structure under `src/app/**`, `src/components/**`, `src/lib/**`, `src/lib/data/**`, and `src/db/**`

Ready or mostly ready:

- Identity base: `users`, `student_profiles`, and `faculty_profiles` give a clear user/profile split.
- Organization base: `organizations` plus `organization_memberships` supports internal units, external partners, and scoped partner/admin roles.
- Skill taxonomy: `skill_categories`, `skills`, `skill_aliases`, `student_skills`, `student_projects`, `project_skills`, `project_evidence`, `skill_candidates`, and `skill_relationships` provide a solid normalized model.
- Challenge base: `challenges`, `challenge_skills`, `challenge_reviews`, and organization ownership reflect the production direction.
- Matching base: `match_results`, `match_skill_details`, and `match_experience_details` preserve explainable AI matching.
- Assessment base: `assessments`, `assessment_questions`, `assessment_attempts`, `assessment_responses`, and `assessment_scores` cover the broad assessment surface.
- Project base: `projects`, `project_members`, `milestones`, `deliverables`, and `feedback` cover the minimum active-project skeleton.
- Governance base: `consent_records`, `notifications`, and `audit_logs` cover essential platform governance.

Not yet implementation-ready:

- Team applications are not clearly represented before a project exists.
- MVP application stage values span application, assessment, interview, selection, offer, and project concepts, while DBML currently stores narrower statuses in separate tables.
- Offer terms, selection expiration, NDA requirement, and reveal state are not explicit.
- Challenge-level faculty routing and application/project-level faculty supervision are likely separate business concepts.
- Milestone status and approval model do not preserve submitted, revision-requested, faculty-approved, and partner-approved states.
- Marketplace eligibility and filtering fields are incomplete: subtype, compensation, work mode, college eligibility, year eligibility, GPA gate, and team-size range need decisions.
- PostgreSQL implementation details such as timestamp strategy, enum strategy, FK behavior, indexes, varchar lengths, numeric precision, bigint representation, JSONB, and vector dimensions are still unresolved.

## 3. PostgreSQL Implementation Decisions Still Required

These should be resolved before Phase 2.3 ERD freeze or explicitly accepted as deferred implementation decisions.

| Decision area | Current DBML state | Required decision |
|---|---|---|
| Timestamp type | Uses `timestamp` broadly | Decide `timestamp` vs `timestamptz`, likely favoring `timestamptz` for lifecycle/deadline data. |
| TypeScript bigint | Uses `bigint` primary keys | Decide Drizzle mode/string/number strategy and API serialization behavior. |
| Decimal precision | Uses `decimal` for confidence, weights, and scores | Define precision and scale for scores, weights, confidence, and similarity values. |
| Varchar length | Uses unbounded `varchar` conceptually | Define length conventions for names, emails, URLs, slugs, status-like strings, and titles. |
| Enum coverage | Some fields are enums, some are free-text notes | Decide whether `profile_visibility`, `confidentiality_level`, `skill_candidates.status`, `consent_type`, `notification_type`, `audit_logs.action`, and entity names become enums or constrained text. |
| JSONB candidates | No explicit JSONB fields | Decide whether parser evidence, audit details, assessment question config, coding test config, availability grids, and feedback metadata use JSONB or normalized tables. |
| Defaults | Many timestamps lack defaults | Define `created_at`, `updated_at`, submission timestamps, and read timestamps defaults. |
| `updated_at` strategy | Fields exist without update mechanism | Decide application-level, trigger-based, or ORM-managed update behavior. |
| Foreign-key behavior | Refs exist without delete/update rules | Decide restrict/cascade/set-null semantics for every relationship. |
| Query indexes | Some unique/indexes exist, many FK/filter indexes are implicit only | Add indexes for role-scoped challenge, application, assessment, project, matching, notification, and deadline queries. |
| Vector representation | `embedding text` placeholders | Decide pgvector extension timing, dimensions, model versioning, and index strategy. |
| URL/file storage | `cv_url`, `portfolio_url`, `file_url`, `attachment_url`, `evidence_url` | Confirm object storage pointers, signed URL handling, and metadata storage. |
| Public route identifiers | DBML uses numeric IDs | Decide whether public slugs/external IDs are required for challenges, applications, projects, and meetings. |
| Status history | Current tables store current status only | Decide whether lifecycle transition history is needed beyond `audit_logs`. |

## 4. Full MVP <-> ERD Reconciliation Matrix

Classification values:

- `KEEP`: same concept maps cleanly.
- `RENAME`: same concept exists under a production name.
- `NORMALIZE`: embedded/static data should become related records.
- `DERIVE`: calculate or query instead of storing redundantly.
- `DROP`: static/demo-only helper.
- `REVIEW`: production requirement may be missing or ambiguous.

Priority values:

- `CORE`: must resolve before ERD v1 freeze.
- `DEFER`: valid product idea, can wait if intentionally excluded from v1.
- `DERIVED`: should be calculated from production records.
- `OUT_OF_SCOPE`: do not persist from the MVP as-is.

| Current MVP entity/field/concept | Current source/use | ERD target | Mapping decision | Priority | Reason / production transformation |
|---|---|---|---|---|---|
| `Challenge` | Marketplace, detail, partner board | `challenges` | KEEP | CORE | Core challenge entity exists. |
| `Challenge.id` string route ID | `/challenges/[id]`, partner routes | `challenges.id` plus possible slug | REVIEW | CORE | Numeric DB ID may not be appropriate public route identifier. |
| `Challenge.title` | Cards and detail | `challenges.title` | KEEP | CORE | Direct field match. |
| `Challenge.summary` | Card/detail text | `challenges.description` | RENAME | CORE | Same concept with production naming. |
| `Challenge.fullBrief` via project fallback | Offer/workspace reveal | `challenges.description` or missing brief table/field | REVIEW | CORE | MVP has T3 full brief separate from public summary. |
| `Challenge.responsibilities[]` | Detail list | `challenges.expected_deliverables` or child records | REVIEW | CORE | Could be text, JSONB, or normalized list. |
| `Challenge.subType` | Marketplace filter/chips | None obvious | REVIEW | CORE | Filterable marketplace concept missing from DBML. |
| `Challenge.orgId` | Partner scoping | `challenges.owner_organization_id` | RENAME | CORE | Production owner organization is relational. |
| `Challenge.orgName` | Marketplace/detail display | `organizations.name` | DERIVE | DERIVED | Display from joined organization unless confidential. |
| `Challenge.orgCategory` | Confidential display/category | `organizations.industry` or missing category | REVIEW | CORE | MVP category is used as display fallback and filter-like metadata. |
| `Challenge.posterKind` | Internal/partner presentation | `organizations.organization_type` | RENAME | CORE | Similar idea but needs value mapping. |
| `Challenge.confidential` | Hide org identity | `challenges.visibility` and `confidentiality_level` | RENAME | CORE | Production needs clear reveal semantics. |
| `Challenge.colleges[]` | Marketplace card/filter | None obvious | REVIEW | CORE | Academic ownership/scope is not represented. |
| `Challenge.domainTags[]` | Filters and faculty overlap | `challenges.domain`, `skill_categories`, or tags | REVIEW | CORE | Needs decision: text, tags, skill taxonomy, or categories. |
| `Challenge.durationWeeks` | Cards/offers | `challenges.duration_weeks` | RENAME | CORE | Direct semantic match. |
| `Challenge.hoursPerWeek` | Eligibility/offer/team | `challenges.weekly_hours` | RENAME | CORE | Direct semantic match. |
| `Challenge.teamSizeMin/teamSizeMax` | Team apply validation | `challenges.team_size` insufficient | REVIEW | CORE | MVP uses a range and pending seats. |
| `Challenge.workMode` | Marketplace filter | None obvious | REVIEW | CORE | Onsite/hybrid/remote is UI-visible and filterable. |
| `Challenge.compensation` | Marketplace filter/offer context | None obvious | REVIEW | CORE | Compensation is UI-visible and filterable. |
| `Challenge.postedAt` | Newest sort | `challenges.created_at` | RENAME | CORE | Created timestamp can drive newest sort. |
| `Challenge.deadline` | Deadline sort/urgency | `challenges.application_deadline` | RENAME | CORE | Direct semantic match. |
| `Challenge.startDate` | Cards/offers | `projects.start_date` or challenge start field | REVIEW | CORE | Start date is shown before project exists. |
| `Challenge.skills[]` | Cards, filters, matching | `challenge_skills` + `skills` | NORMALIZE | CORE | Embedded list should become relational requirements. |
| `Skill.level` in challenge | Required/preferred indicator | `challenge_skills.requirement_type` | RENAME | CORE | Need exact value mapping from MVP labels. |
| `Challenge.assessmentTrack` | Detail and assessment route | `assessments` plus question config | REVIEW | CORE | Track drives UI behavior but not explicitly modeled. |
| `Challenge.assessmentMinutes` | Detail and test timer | `assessments.time_limit_minutes` | RENAME | CORE | Direct semantic match. |
| `Challenge.interviewFormat` | Detail/pipeline | None obvious | REVIEW | DEFER | Interview workflow is visible but no DBML support. |
| `Challenge.minGpa` | Eligibility gate | None obvious | REVIEW | CORE | Current business rule cannot be enforced from ERD. |
| `Challenge.eligibleYears` | Eligibility gate | None obvious | REVIEW | CORE | Needs eligibility rule model or explicit columns. |
| `Challenge.eligibleColleges` | Eligibility gate | None obvious | REVIEW | CORE | Needs eligibility rule model or academic tables. |
| `Challenge.lockedBlocks` | T3 progressive disclosure | Missing reveal/resource policy | REVIEW | CORE | Preserve reveal gates without storing UI-only blocks as schema authority. |
| `Challenge.suggestedFacultyIds` | Faculty picker | `challenge_faculty_assignments` maybe | REVIEW | CORE | Suggested faculty and assigned faculty may be different concepts. |
| `Challenge.applicantCount` | Card metric | `COUNT(applications)` | DERIVE | DERIVED | Avoid redundant counter initially. |
| MVP `ChallengeStatus` | Partner/dashboard buckets | `challenge_status` | RENAME | CORE | Production enum is richer and needs UI mapping. |
| `Application` | Student/partner/faculty flows | `applications` | KEEP | CORE | Core application entity exists. |
| `Application.id` string route ID | Assessment, offer, workspace routes | `applications.id` plus possible slug | REVIEW | CORE | Public URL strategy unresolved. |
| `Application.challengeId` | Joins to challenge | `applications.challenge_id` | RENAME | CORE | Direct FK mapping. |
| `Application.studentId` | Jordan-only static ownership | `applications.student_id` | KEEP | CORE | Direct for solo applicants only. |
| Team application concept | Apply flow and invitations | Missing application-team model | REVIEW | CORE | DBML only supports one `student_id` per application. |
| `Application.team.name` | Team apply/invitation | Missing application team table | REVIEW | CORE | Team name exists before project. |
| `TeamMember.studentId` | Team roster | Missing pre-project team member table | REVIEW | CORE | `project_members` exists only after project creation. |
| `TeamMember.status` | leader/accepted/invited/declined | Missing application invite status | REVIEW | CORE | Pending seats and declined invites are pre-selection state. |
| `TeamMember.role` | Team roster/project role | `project_members.project_role` after selection | REVIEW | CORE | Need pre-project role plus post-project role mapping. |
| `TeamMember.hours/availability` | Team fit warnings | `student_profiles.available_hours_per_week` or missing snapshot | REVIEW | DEFER | Could be derived from profile or captured as application-time snapshot. |
| `Application.motivation` | Apply form | `applications.motivation` | KEEP | CORE | Direct field match. |
| `ApplicationDraft.relevantExperience` | Apply form text | `application_projects` or `motivation`/missing text | REVIEW | CORE | DBML expects selected projects, MVP allows free text. |
| `Application.preferredRole` | Apply form/team display | `applications.preferred_role` | RENAME | CORE | Direct semantic match. |
| `Application.hoursPerWeek` draft | Apply validation | `applications.availability_confirmed` plus challenge weekly hours | REVIEW | CORE | MVP captures numeric commitment; DBML stores only confirmation. |
| `Application.facultySupervisorId` | Faculty supervision relationship | `projects.faculty_supervisor_id` or missing app supervision | REVIEW | CORE | MVP supervision starts before project. |
| `SupervisionInvite` | Faculty nomination queue | Missing app/team supervision invite | REVIEW | CORE | Distinct from `challenge_faculty_assignments`. |
| `Application.stage` | All role dashboards | Multiple status tables | REVIEW | CORE | UI stage spans application, assessment, selection, project, and expiration. |
| `Application.stageEnteredAt` | Days-in-stage display | Missing lifecycle history | REVIEW | CORE | Current statuses lack transition timestamps. |
| `Application.nextAction` | Hub CTA text | Derived service view | DERIVE | DERIVED | Should be calculated from workflow records. |
| `Application.nextActionDue` | Hub urgency | Deadlines on applications/selections/milestones | REVIEW | CORE | Some due dates are missing, especially offer expiration. |
| `Application.testResult` | Assessment result display | `assessment_attempts` + `assessment_scores` | NORMALIZE | CORE | Embedded result should become assessment records or derived view. |
| `Application.offer` | Offer page and countdown | `selections` insufficient | REVIEW | CORE | Offer terms and deadline are not explicit. |
| `Application.project` | Workspace | `projects` and child tables | NORMALIZE | CORE | Embedded project should become relational project execution records. |
| `Student` | Profile/home | `users` + `student_profiles` | NORMALIZE | CORE | Identity and student profile split is correct. |
| `Student.name/email` | Profile/header | `users.full_name/email` | RENAME | CORE | Direct semantic mapping. |
| `Student.college` | Eligibility/profile | Missing academic org/profile field | REVIEW | CORE | DBML has major but no college/school for students. |
| `Student.major/year` | Profile/eligibility | `student_profiles.major/study_year` | RENAME | CORE | Direct semantic mapping. |
| `Student.gpa/gpaScale` | Eligibility/private profile | Missing academic-record field | REVIEW | CORE | Production must decide if GPA is stored or external. |
| `Student.skills[]` | Profile/matching | `student_skills` + `skills` | NORMALIZE | CORE | Embedded skills become normalized records. |
| `Student.hoursAvailable` | Eligibility/recommendations | `student_profiles.available_hours_per_week` | RENAME | CORE | Direct semantic mapping. |
| `Student.workPreference` | Profile/filtering | None obvious | REVIEW | DEFER | Useful preference but not in ERD. |
| `Student.about` | Profile display | `student_profiles.interests` or missing bio | REVIEW | DEFER | Interests and bio are not identical. |
| `Student.transcriptUrl` | Private academic link | `student_profiles.cv_url`? no clear target | REVIEW | DEFER | Transcript likely needs academic integration or file metadata. |
| `Student.recordSyncedAt` | Registrar freshness | Missing academic sync metadata | REVIEW | DEFER | Integration freshness is not modeled. |
| `Student.portfolioUrl` | Profile | `student_profiles.portfolio_url` | KEEP | CORE | Direct field match. |
| `Student.usualRoles` | Team formation | None obvious | REVIEW | DEFER | Could become preference/profile metadata. |
| `Student.preferredTeamMin/Max` | Profile/team preferences | None obvious | REVIEW | DEFER | Preference, not core schema unless product keeps team matching. |
| `Student.weeklyAvailability` | Team fit/profile | None obvious | REVIEW | DEFER | Candidate for JSONB or scheduling table. |
| `Student.pinnedCourseIds` | Partner-visible profile | Missing showcase model | REVIEW | DEFER | Per-field disclosure/pinning is absent. |
| `Course` | Transcript/profile | Missing academic records | REVIEW | DEFER | Could be external registrar data or local table. |
| `Experience` | Profile | `student_projects` + `project_skills` | NORMALIZE | CORE | Student projects can cover much experience, with possible field gaps. |
| `DirectoryStudent` | Partner sourcing deck | Derived from users/profiles/skills/apps | DERIVE | DERIVED | Should be a role-scoped projection, not a table. |
| `Peer` | Team picker | Derived from users/profiles/skills/apps | DERIVE | DERIVED | Peer view is a privacy-shaped projection. |
| `Faculty` | Faculty pages/picker | `users` + `faculty_profiles` | NORMALIZE | CORE | Identity and faculty profile split is correct. |
| `Faculty.researchAreas` | Faculty matching | Missing faculty skill/area model | REVIEW | DEFER | Could map to skills/categories or profile metadata. |
| `Faculty.slotsUsed` | Capacity display | Derived from active supervision/project count | DERIVE | DERIVED | Do not store if reliably computed. |
| `Faculty.slotsTotal` | Capacity gate | Missing capacity field/config | REVIEW | CORE | Rule exists and must be configurable somewhere. |
| `Organization` | Partner portal/current org | `organizations` | KEEP | CORE | Core entity exists. |
| `Organization.category/kind` | Cards and partner identity | `organization_type`, `industry`, or missing category | REVIEW | CORE | Current values do not map one-to-one. |
| `Organization.initials` | Avatar display | Derived from name | DERIVE | DERIVED | Presentation-only. |
| `Organization.contact` embedded | Partner contact/reveal | `users` + `organization_memberships` and `challenges.contact_person_id` | NORMALIZE | CORE | Contact should be relational and may be many-to-many. |
| `AssessmentTrack` | Technical/cognitive behavior | `assessments` plus question types/config | REVIEW | CORE | Needs explicit production modeling. |
| `CognitiveSection` | Test runner sections/timers | `assessment_questions.sequence` plus missing section model | REVIEW | CORE | DBML has questions, not sections. |
| `CognitiveQuestion.options/correctIndex` | MC runner | `assessment_questions` plus missing JSONB/config | REVIEW | CORE | Options and answer key not represented. |
| `CodingProblem` | Technical runner | `assessment_questions` plus missing coding config | REVIEW | CORE | Starter code/sample tests/language missing. |
| `TestResult.overallBand/sections` | Result page | `assessment_scores` plus derived bands | DERIVE | DERIVED | Store raw/review scores or derive band policy explicitly. |
| Lockdown/preflight events | Assessment client state | `audit_logs` or missing proctor table | REVIEW | DEFER | Needed only if proctoring is in v1. |
| `Offer` | Student offer page | `selections` plus missing terms | REVIEW | CORE | Selection exists, offer terms do not. |
| `Offer.respondBy` | Countdown/expiration | Missing field | REVIEW | CORE | Expiration cannot be derived without deadline. |
| `Offer.compensationNote` | Offer terms | Missing field | REVIEW | CORE | Compensation terms are not explicit. |
| `Offer.ndaRequired` | Unlock gate | Missing agreement/reveal model | REVIEW | CORE | NDA is central to T3 reveal. |
| `Offer.startDate/duration/hours` | Offer confirmation | `projects.start_date`, `challenges.duration_weeks`, `weekly_hours` | REVIEW | CORE | Needs snapshot versus source-of-truth decision. |
| `ProjectRecord` | Workspace | `projects` | KEEP | CORE | Core project entity exists. |
| `ProjectRecord.startedAt` | Workspace header | `projects.start_date` | RENAME | CORE | Semantic match if start date is actual project start. |
| `ProjectRecord.fullBrief` | T3 content | Missing or `challenges.description` | REVIEW | CORE | Full brief may differ from public challenge text. |
| `ProjectRecord.posterContact` | Workspace reveal | `challenges.contact_person_id` | NORMALIZE | CORE | Contact should be joined through users/memberships. |
| `ProjectRecord.resources` | Workspace resources/credentials | Missing resource table | REVIEW | CORE | T3 assets and credentials require access control. |
| `Meeting` | Workspace/meeting routes | Missing meeting table | REVIEW | DEFER | Schedule and join links are absent from DBML. |
| `Milestone` | Workspace and partner/faculty queues | `milestones` | KEEP | CORE | Core milestone table exists. |
| MVP milestone statuses | Submitted/approved/revision | `milestone_status` insufficient | REVIEW | CORE | Production enum loses key workflow states. |
| `Milestone.deliverable` embedded | Workspace | `deliverables` | NORMALIZE | CORE | Deliverables should be child records. |
| `Milestone.facultyApproved/posterApproved` | Dual sign-off | Missing approval records | REVIEW | CORE | Single status cannot express dual approvals. |
| `PartnerFeedback` bands/private note | Close-out form | `feedback` insufficient | REVIEW | CORE | Structured visibility and bands missing. |
| `FacultyFeedback` | Faculty close-out queue | `feedback` | REVIEW | CORE | Need type/visibility/timing semantics. |
| `ParsedBrief` | Partner post flow | Missing import/draft parser model | REVIEW | DEFER | Can be deferred if upload/parsing is not v1. |
| Recommendation score/reasons/caveats | Partner sourcing deck | `match_results` and detail tables | NORMALIZE | CORE | Reasons can map to explanations; caveats need policy. |
| Recommendation rank/band | Partner display | Derived from match scores | DERIVE | DERIVED | Numeric score should remain internal. |
| Current hard-coded role IDs | Static data scoping | Auth/RBAC + memberships | DROP | OUT_OF_SCOPE | Demo shortcuts should not persist. |
| Pinned `TODAY` | Demo date stability | Runtime clock/test fixture | DROP | OUT_OF_SCOPE | Do not store demo clock in production data. |
| Static `providerApplications` duplicates | Partner-only fixtures | Real queries by org/application/project | DROP | OUT_OF_SCOPE | Duplicate fixture list should disappear after DB queries. |

## 5. CORE Issues

The following must be resolved before ERD v1 is frozen:

- Team applications before project creation need a production owner, membership model, invite state, and uniqueness rules.
- The lifecycle model needs explicit stored versus derived status boundaries across application, assessment, interview, selection, offer, project, and milestone tables.
- Offer terms need a home: response deadline, expiration, compensation note, NDA required, selected hours/duration/start date, and acceptance transaction.
- Faculty challenge routing and faculty supervision nomination need separate or explicitly unified models.
- Milestone submission, revision, and dual approval need a production model that does not collapse meaningful workflow states.
- Assessment definitions need enough structure for cognitive sections, multiple choice, coding tasks, sample tests, timers, and banded result displays.
- Marketplace eligibility/filtering fields need decisions for subtype, compensation, work mode, team size range, GPA/year/college gates, and domain tags.
- Route identifiers need a decision: expose numeric IDs or add stable slugs/external IDs.
- Partner/faculty feedback visibility and structured close-out bands need an explicit schema strategy.
- T3 reveal, NDA, full brief, resources, credentials, and contact release need access-control-aware modeling.

## 6. DEFER Items

These appear useful but can be excluded from v1 if the product intentionally narrows scope:

- Registrar course ingestion, transcript sync metadata, and pinned course showcase.
- Meeting schedules, join links, attendees, agenda views, and milestone-linked meetings.
- Work preference, usual roles, preferred team size, and weekly availability details beyond basic hours.
- AI brief parser draft/import review persistence.
- Lockdown/proctoring event capture beyond basic assessment attempt tracking.
- Faculty research-area taxonomy if challenge review can initially use manual assignment.
- Interview scheduling and interview format workflow if not part of v1 operations.

## 7. DERIVED Items

These should generally be queried or computed from production records:

- Applicant count from `COUNT(applications)` filtered by challenge.
- Organization display name from `organizations.name`, with confidentiality rules applied in the service layer.
- Marketplace deadline urgency from `application_deadline` and current time.
- Newest sort from `challenges.created_at`.
- Skill match counts from `challenge_skills`, `student_skills`, and match detail records.
- Faculty `slotsUsed` from accepted/current supervision or active projects.
- Student live challenge count from active selections/projects and possibly active accepted applications.
- Hub buckets, partner board columns, attention rows, CTA labels, and timeline nodes from lifecycle records.
- Recommendation display bands from internal match scores and policy thresholds.
- Profile completeness from profile fields, skills, experience, consent, and portfolio evidence.
- Milestone progress percentage from milestone and approval/deliverable state.
- Offer countdown/expired state from selection or offer response deadline once modeled.
- Meeting state labels from persisted meeting start/end times if meetings are included.

## 8. OUT_OF_SCOPE Items

These MVP artifacts should not become production schema concepts:

- Hard-coded `currentStudent`, `currentFacultyId`, and `currentOrgId`.
- Pinned static `TODAY` value for demo stability.
- Static fixture-only duplicates such as partner-only application copies.
- Presentation initials derived from organization or person names.
- Client-only fake timers, local submission state, and demo redirect state.
- Locked-block UI labels as schema authority, unless transformed into a real access/reveal policy.

## 9. Six Core Review Clusters

### 9.1 Team-Based Applications Before Project Creation

Current MVP behavior:

- Applications may represent teams before any `projects` row exists.
- Team members can be leader, accepted, invited, or declined.
- Pending invites hold seats and block application submission.
- Team role and availability are visible during application review and invitation.

Current DBML tension:

- `applications` has one `student_id`.
- `project_members` only exists after `projects` is created.
- No application-team, application-member, or team-invite concept is represented.

Decision needed:

- Add or approve a production model for pre-project teams, or explicitly narrow v1 to solo applications.

### 9.2 Lifecycle Separation

Current MVP behavior:

- One `Application.stage` drives student, partner, faculty, assessment, offer, and workspace UI.
- Stages include assessment pending/submitted, interview scheduling/scheduled, invited, active, final review, completed, withdrawn, expired, and rejected states.

Current DBML tension:

- DBML splits status across `applications`, `assessment_attempts`, `selections`, `projects`, and `milestones`.
- No lifecycle history table exists.
- Interview states and selection expiration are absent.

Decision needed:

- Define canonical stored statuses and a derived UI-stage projection before implementation.

### 9.3 Offer / Selection / Expiration / NDA

Current MVP behavior:

- Offer is an object embedded in application.
- It includes response deadline, terms, NDA requirement, start date, and reveal behavior.
- Accepting an offer should reveal T3 content and create/open the workspace.

Current DBML tension:

- `selections` stores invite/accept/decline and timestamps only.
- No response deadline, expiry state, NDA signature, offer terms, or reveal state exists.

Decision needed:

- Decide whether to extend `selections`, add an offer/agreement model, or constrain v1 offer scope.

### 9.4 Faculty Challenge Routing vs Faculty Supervision

Current MVP behavior:

- Faculty can be suggested for a challenge.
- Faculty receives supervision invites for a specific application/team.
- Faculty capacity affects whether supervision can be accepted.
- Confirmed supervision drives faculty queues and project access.

Current DBML tension:

- `challenge_faculty_assignments` is documented as challenge routing/review.
- `projects.faculty_supervisor_id` exists only after project creation.
- No application-level supervision invite or capacity field exists.

Decision needed:

- Separate challenge academic review routing from project supervision, or deliberately unify them with documented semantics.

### 9.5 Milestone Submission, Revision, and Dual Approval

Current MVP behavior:

- Milestones can be not started, in progress, submitted, approved, or revision requested.
- Faculty and partner approvals are independent.
- Submitted deliverables trigger both faculty and partner review.

Current DBML tension:

- `milestone_status` has `PENDING`, `IN_PROGRESS`, `COMPLETED`, and `OVERDUE`.
- `deliverables` captures submissions, but approvals and revision requests are not first-class.
- `feedback` is generic and may not preserve approval decisions.

Decision needed:

- Add approval/review records or revise milestone status semantics before schema implementation.

### 9.6 Multi-Disciplinary Assessment Modeling

Current MVP behavior:

- Assessment track changes the entire runner: technical coding versus cognitive/multi-section questions.
- Cognitive questions include options and correct answers.
- Coding problems include language, starter code, and sample tests.
- Results are banded and may hide raw scores.

Current DBML tension:

- Question types are broad: practical task, reasoning, adaptive follow-up.
- There is no section model, option model, answer key, coding config, sample test model, or band policy.
- `application_status` collapses assessment pending/submitted into one `ASSESSMENT` value.

Decision needed:

- Confirm whether v1 supports these assessment variants and where structured question/test configuration lives.

## 10. Lifecycle Stored-vs-Derived Mapping

| MVP UI lifecycle value | Candidate source records | Stored/derived recommendation | Notes |
|---|---|---|---|
| `APPLIED` | `applications.status = SUBMITTED` | STORED with UI rename | MVP label maps to production submitted application. |
| `SHORTLISTED` | `applications.status = SHORTLISTED` | STORED | Direct production state exists. |
| `TEST_PENDING` | `applications.status = ASSESSMENT` plus active assessment and no submitted attempt | DERIVED/REVIEW | Requires assessment due/availability semantics. |
| `TEST_SUBMITTED` | `assessment_attempts.status = SUBMITTED` or `REVIEWED` | DERIVED | Should not require separate application status if assessment records are authoritative. |
| `INTERVIEW_SCHEDULING` | Missing interview records | REVIEW | No ERD support. |
| `INTERVIEW_SCHEDULED` | Missing interview records | REVIEW | No ERD support. |
| `INVITED` | `selections.status = INVITED` | DERIVED from selection | Response deadline still missing. |
| `ACTIVE` | `selections.status = ACCEPTED` plus `projects.status = ACTIVE` | DERIVED | Project record should drive workspace access. |
| `IN_REVIEW` | `projects.status = FINAL_REVIEW` or milestone/approval state | DERIVED/REVIEW | Need exact final-review rule. |
| `COMPLETED` | `projects.status = COMPLETED` | DERIVED from project | Completion should likely be project-owned. |
| `NOT_SELECTED` | `applications.status = REJECTED` or absence of selection after selection close | STORED/DERIVED REVIEW | Need rejection semantics versus no-selection outcome. |
| `WITHDRAWN` | `applications.status = WITHDRAWN` | STORED | Direct production state exists. |
| `EXPIRED` | `selections.status = INVITED` plus response deadline in past | DERIVED/REVIEW | Deadline field missing in DBML. |
| Challenge `Draft` | `challenge_status = DRAFT` | STORED | Direct mapping. |
| Challenge `In review` | `SUBMITTED`, `UNDER_REVIEW`, `FACULTY_REVIEW`, `REVISION_REQUESTED` | DERIVED label | UI bucket collapses several DBML states. |
| Challenge `Published` | `PUBLISHED` or `APPLICATIONS_OPEN` | STORED/REVIEW | Need public marketplace definition. |
| Challenge `Closed` | `ARCHIVED`, `CANCELLED`, `COMPLETED`, maybe after deadline | DERIVED label | Partner bucket collapses several terminal states. |
| Milestone `Submitted` | `deliverables.submitted_at` plus pending approvals | DERIVED/REVIEW | Not in current enum. |
| Milestone `Approved` | both approval records complete | DERIVED/REVIEW | Not represented by current DBML except `COMPLETED`. |
| Milestone `Revision requested` | approval/review decision | REVIEW | Missing explicit decision source. |

## 11. Candidate ERD Gaps

Candidate gaps to resolve or explicitly defer:

- Application-team tables and application team membership/invite statuses.
- Application-level faculty supervision invites and responses.
- Faculty supervision capacity policy or field.
- Offer terms, response deadline, expiration, NDA/agreement signature, and reveal state.
- Challenge eligibility rules for GPA, year, college, and possibly max active commitments.
- Marketplace fields for subtype, compensation, work mode, team-size range, domain tags, and public/private display semantics.
- Project resources/credentials with sensitivity tier, NDA gating, and reveal audit.
- Full brief content distinct from public challenge summary.
- Meeting/schedule records.
- Milestone approval/revision model by reviewer role.
- Structured partner and faculty feedback with visibility rules and band fields.
- Assessment section/config models for MCQ and coding tasks.
- Assessment band policy if bands are persisted or consistently derived.
- Interview scheduling tables if interview flow remains in v1.
- Academic registrar/course/transcript model or external integration metadata.
- Route slugs/external IDs for public URLs.
- Lifecycle history table or explicit audit-log usage for status transitions.

## 12. Potential Unnecessary MVP Fields

These should not be promoted into the ERD without a clear production reason:

- Stored `applicantCount`.
- Stored organization/person initials.
- Demo-only `lockedBlocks` object shapes.
- Pinned `TODAY`.
- Static hard-coded current user/org IDs.
- Partner-only duplicated application fixtures.
- Client-only assessment timer/preflight state.
- UI bucket names such as `needs-you`, `waiting`, or partner board column names.
- Derived profile completion percentages and checklist labels.
- Derived urgency text, countdown copy, and CTA labels.

## 13. Open Architecture/Product Questions

- Is v1 required to support team applications, or can v1 launch with solo applications only?
- If team applications are required, is the application submitted by one leader on behalf of a team, or does each student own an individual application linked to a team?
- Should faculty supervision be requested before selection, after shortlisting, or only after offer acceptance?
- Is faculty capacity global, per term, per challenge, or per active project?
- Does an offer need a separate durable entity, or is selection enough after adding deadline/terms?
- Is NDA acceptance a generic consent record, a challenge-specific agreement, or an external e-signature integration?
- Which lifecycle values are authoritative database statuses, and which are role-specific UI labels?
- What is the canonical definition of marketplace-visible challenge: `PUBLISHED`, `APPLICATIONS_OPEN`, or another state?
- Should academic eligibility data be stored locally or referenced from a registrar integration?
- Are GPA gates allowed in production policy?
- Should challenge eligibility be modeled as explicit columns or a flexible rules table?
- Are meetings, resources, and credential reveal part of v1 project workspace scope?
- Should partner private CAID notes be stored in `feedback`, audit logs, or a separate restricted table?
- Should assessment questions use normalized option/test-case tables or JSONB configuration?
- Are public URLs allowed to expose numeric database IDs?

## 14. Recommended Issues Before ERD v1 Freeze

Recommended blocking issues:

- Decide and document application team modeling before Drizzle schema work.
- Decide lifecycle decomposition and derived UI-stage mapping before implementing status enums.
- Decide offer/selection/NDA data ownership and acceptance transaction.
- Decide faculty routing versus supervision model and capacity source.
- Decide milestone approval/revision schema.
- Decide assessment configuration depth for v1.
- Decide challenge eligibility and marketplace filter fields.
- Decide route slug/external ID policy.
- Decide feedback visibility and structured close-out data.
- Decide PostgreSQL implementation conventions: timestamps, bigint, decimal, varchar, enum/free text, JSONB, FK behavior, indexes, and pgvector dimensions.

## Phase Boundary Notes

- This artifact stops after Phase 2.1 and Phase 2.2.
- `docs/database/schema.dbml` was not modified.
- Application source code was not modified.
- No Drizzle schema files were created or changed.
- No migrations were created or generated.
- Phase 2.3 ERD freeze was not performed.
