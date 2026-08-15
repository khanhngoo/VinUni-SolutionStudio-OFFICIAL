# Static MVP Data Model Audit

Phase: 2.0 static MVP audit only  
Date: 2026-08-15  
Scope: read-only analysis of the current static Next.js MVP implementation  
Authority note: `docs/database/schema.dbml` remains the canonical production ERD. This document records implementation evidence and possible review items; it does not redesign the ERD or authorize schema changes.

## Source Files Inspected

Required instruction and authority files:

- `AGENTS.md`
- `PRODUCTION_TRANSFORMATION_PLAN.md`
- `docs/database/schema.dbml`

Repository structure:

- `src/app/**`
- `src/components/**`
- `src/lib/**`
- `src/lib/data/**`
- `src/db/**` was only inspected for repository context; no schema work was performed.

Primary static data/model files:

- `src/lib/types.ts`
- `src/lib/queries.ts`
- `src/lib/eligibility.ts`
- `src/lib/filters.ts`
- `src/lib/pipeline.ts`
- `src/lib/dates.ts`
- `src/lib/workspace.ts`
- `src/lib/provider.ts`
- `src/lib/supervision.ts`
- `src/lib/teams.ts`
- `src/lib/profile.ts`
- `src/lib/recommendations.ts`
- `src/lib/meetings.ts`
- `src/lib/data/challenges.ts`
- `src/lib/data/applications.ts`
- `src/lib/data/provider-applications.ts`
- `src/lib/data/faculty.ts`
- `src/lib/data/student.ts`
- `src/lib/data/organizations.ts`
- `src/lib/data/teams.ts`
- `src/lib/data/peers.ts`
- `src/lib/data/directory.ts`
- `src/lib/data/transcript.ts`
- `src/lib/data/assessment.ts`
- `src/lib/data/brief-parse.ts`
- `src/lib/data/meetings.ts`
- `src/lib/data/supervision-invites.ts`

Material route/component files inspected include marketplace, challenge detail/apply, assessment, offer, workspace, profile, faculty, partner, team, and shared layout components under `src/app/**` and `src/components/**`.

## Cross-Cutting Patterns

Current entities/types used:

- `Challenge`, `Application`, `ProjectRecord`, `Milestone`, `WorkspaceResource`, `Meeting`, `TestResult`, `Offer`, `Team`, `TeamMember`, `Faculty`, `SupervisionInvite`, `Organization`, `Student`, `Peer`, `DirectoryStudent`, `Course`, `Experience`, `ParsedBrief`, `Recommendation`, and several union enums in `src/lib/types.ts`.

Current relationship style:

- Static IDs are strings, not numeric database IDs.
- Relationships are implied through ID fields such as `Application.challengeId`, `Application.facultySupervisorId`, `Challenge.orgId`, `Challenge.suggestedFacultyIds`, `SupervisionInvite.applicationId`, `SupervisionInvite.facultyId`, `Meeting.milestoneId`, `Student.pinnedCourseIds`, and team member `studentId`.
- Several production-looking child records are embedded directly in parent fixtures: `Application.team`, `Application.testResult`, `Application.offer`, `Application.project`, `ProjectRecord.milestones`, `ProjectRecord.meetings`, `ProjectRecord.resources`, and `ProjectRecord.partnerFeedback`.

Current static simplifications:

- No authentication. The MVP uses `currentStudent`, `currentFacultyId`, and `currentOrgId`.
- No persistence. Forms and decisions are mostly client state or fake timed state.
- No route handlers or API endpoints power these features.
- `TODAY` is pinned to `2026-07-27T00:00:00Z` for demo stability.
- `applications.ts` is Jordan Lee's student story; `provider-applications.ts` adds additional teams only for partner views.

Useful implementation concepts to preserve:

- Role-specific privacy slices: student, peer, partner, and faculty see different fields for the same people/work.
- Progressive disclosure: T3 content is locked until selection/activation.
- Bands instead of raw scores for assessments, recommendations, and close-out feedback.
- Dual milestone sign-off by faculty and partner.
- Faculty supervision nomination is separate from application pipeline progression.
- Partner challenge board collapses student-facing stages into fewer operational columns.
- Recommendation explanations are shown as reasons and caveats, not numeric ranks.

## Challenge Marketplace

Source files inspected:

- `src/app/challenges/page.tsx`
- `src/components/marketplace/challenge-card.tsx`
- `src/components/marketplace/filter-rail.tsx`
- `src/components/marketplace/filter-group.tsx`
- `src/components/marketplace/results-header.tsx`
- `src/lib/data/challenges.ts`
- `src/lib/filters.ts`
- `src/lib/queries.ts`
- `src/lib/types.ts`

Current entity/type names:

- `Challenge`
- `Skill`
- `LockedBlock`
- `FilterState`

Fields consumed:

- `id`, `title`, `subType`, `orgName`, `orgCategory`, `confidential`, `posterKind`, `colleges`, `domainTags`, `durationWeeks`, `hoursPerWeek`, `teamSizeMin`, `teamSizeMax`, `workMode`, `compensation`, `postedAt`, `deadline`, `startDate`, `summary`, `responsibilities`, `skills`, `assessmentTrack`, `assessmentMinutes`, `interviewFormat`, `minGpa`, `eligibleYears`, `eligibleColleges`, `lockedBlocks`, `suggestedFacultyIds`, `applicantCount`, `orgId`, `status`.

Relationships:

- `Challenge.orgId` maps to static `Organization.id`.
- `Challenge.suggestedFacultyIds` maps to static `Faculty.id`.
- `Challenge.skills[]` is embedded as `{ name, level }`.
- `Challenge.colleges[]` and `eligibleColleges[]` are embedded arrays.

Status/lifecycle assumptions:

- MVP `ChallengeStatus` is `"Draft" | "In review" | "Published" | "Closed"`.
- Only published records are intended for marketplace behavior, although `getChallenges()` currently filters only by selected filters and sort, not by `status`.
- Marketplace deadline urgency is derived from `deadline` and pinned `TODAY`.

Business rules:

- Search params silently drop unrecognized filter values.
- Filters are OR within group and AND across groups.
- Sort keys are `deadline`, `newest`, and `duration`.
- Gated students still see challenge cards.
- Confidential postings show `orgCategory` instead of `orgName`.

Derived fields:

- Deadline labels and urgency.
- Applicant counts are fixture fields.
- Organization display name is derived from `orgName ?? orgCategory`.
- Skill match counts are derived later on detail pages.

Preliminary ERD mappings:

- `Challenge` maps primarily to `challenges`.
- `orgId` maps to `challenges.owner_organization_id`.
- `orgName`, `orgCategory`, and `confidential` likely map through `organizations` plus challenge visibility/confidentiality fields.
- `skills[]` maps to `skills` and `challenge_skills`.
- `colleges` and `eligibleColleges` have no direct canonical table in DBML beyond broad challenge fields.
- `applicantCount` should likely be derived from `applications`.

Possible ERD gaps/conflicts:

- MVP has `ChallengeSubType`, `Compensation`, `WorkMode`, `PosterKind`, `College`, `teamSizeMin`, `teamSizeMax`, `domainTags`, `responsibilities`, `interviewFormat`, and `applicantCount`; DBML has `domain`, `expected_deliverables`, `duration_weeks`, `weekly_hours`, `team_size`, `visibility`, and `confidentiality_level`, but not all MVP fields are obvious.
- DBML `challenge_status` is much richer than MVP `ChallengeStatus`.
- DBML has one `team_size`; MVP needs a min/max range.
- Marketplace filters use colleges/type/compensation; DBML has no explicit challenge subtype, compensation, or college eligibility model.

Open questions:

- Should subtype, compensation, work mode, college eligibility, and team-size range become first-class fields, lookup tables, or metadata?
- Should `responsibilities[]` and `domainTags[]` be normalized or represented as text/JSONB?
- Should published marketplace reads filter by `APPLICATIONS_OPEN`/`PUBLISHED` production statuses, and which status is authoritative for public visibility?

## Challenge Detail And Application Flow

Source files inspected:

- `src/app/challenges/[id]/page.tsx`
- `src/app/challenges/[id]/apply/page.tsx`
- `src/components/challenge/*`
- `src/components/apply/*`
- `src/components/team/*`
- `src/lib/eligibility.ts`
- `src/lib/teams.ts`
- `src/lib/data/peers.ts`
- `src/lib/data/teams.ts`

Current entity/type names:

- `Challenge`
- `Application`
- `ApplicationDraft`
- `Team`
- `TeamMember`
- `Peer`
- `Faculty`
- `EligibilityResult`

Fields consumed:

- Challenge detail consumes challenge display fields, assessment fields, eligibility gates, locked blocks, suggested faculty IDs, and existing application state.
- Apply modal/form uses `motivation`, `relevantExperience`, `hoursPerWeek`, and `facultySupervisorId`.
- Team apply page uses `team.name`, `team.members`, member roles/status/hours/availability, challenge `teamSizeMin`, `teamSizeMax`, and `hoursPerWeek`.
- Peer picker uses peer `roles`, `hoursAvailable`, `weeklyAvailability`, and `liveChallenges`.

Relationships:

- A challenge may have one current static application for Jordan through `getApplicationByChallengeId`.
- A team belongs to exactly one application in the MVP.
- A team member references a student/peer by `studentId`.
- Application nominated faculty is stored on `Application.facultySupervisorId`; pending response is represented separately by `SupervisionInvite`.

Status/lifecycle assumptions:

- Applying begins with team formation.
- Team invite statuses are `"leader" | "accepted" | "invited" | "declined"`.
- Session-only application state can show `Applied · pending faculty` without persistence.

Business rules:

- Students below eligibility gates can view but cannot apply.
- Faculty at capacity remain visible in picker but disabled.
- Motivation has a 300-word limit in the modal path.
- Hours commitment must be numeric and between 1 and 40.
- A team cannot submit while invitations are pending.
- Outstanding invites hold seats toward max team size.
- Team warnings do not block submission when hours/shared availability are weak.
- Preferred project role/team data is session-only in the MVP.

Derived fields:

- Team size labels.
- Confirmed/pending/declined member counts.
- Combined hours and required hours.
- Shared free days.
- Skill match counts against current student's skills.

Preliminary ERD mappings:

- Application draft maps partly to `applications.motivation`, `applications.preferred_role`, and possibly `availability_confirmed`.
- Team/application membership likely maps to `project_members` only after selection in DBML, but MVP needs team membership during application.
- Faculty nomination maps imperfectly to `projects.faculty_supervisor_id` or `challenge_faculty_assignments`; neither obviously represents application-level supervision requests.

Possible ERD gaps/conflicts:

- DBML `applications` represents a single `student_id`; MVP applications can be team-based before project creation.
- DBML `application_projects` links applications to prior student projects, but MVP application captures free-text relevant experience and team formation instead.
- DBML does not obviously model pre-selection team invites, pending team seats, or team roles on an application.
- DBML `faculty_assignment_status` appears challenge-level; MVP `SupervisionInvite` is application/team-level.

Open questions:

- Does production need an application-team table before `projects` are created?
- Should faculty supervision nomination be modeled as application-level, project-level, or both?
- Is `ApplicationDraft.relevantExperience` superseded by `application_projects`, or should free-text experience remain?

## Student-Facing Pages

Source files inspected:

- `src/app/page.tsx`
- `src/app/workspace/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/profile/edit/page.tsx`
- `src/app/invitations/[applicationId]/page.tsx`
- `src/app/meeting/[meetingId]/page.tsx`
- `src/components/profile/*`
- `src/components/workspace/*`
- `src/lib/profile.ts`
- `src/lib/workspace.ts`
- `src/lib/meetings.ts`
- `src/lib/data/student.ts`
- `src/lib/data/transcript.ts`

Current entity/type names:

- `Student`
- `Course`
- `Experience`
- `Application`
- `ProjectRecord`
- `Meeting`
- `AgendaEvent`
- `ChecklistItem`
- `Peer`
- `TeamMember`

Fields consumed:

- Student profile: `name`, `email`, `college`, `major`, `year`, `gpa`, `gpaScale`, `skills`, `hoursAvailable`, `workPreference`, `about`, `creditsEarned`, `transcriptUrl`, `recordSyncedAt`, `portfolioUrl`, `usualRoles`, `preferredTeamMin`, `preferredTeamMax`, `weeklyAvailability`, `pinnedCourseIds`.
- Courses: `title`, `code`, `term`, `credits`, `grade`, `source`.
- Experience: `kind`, `role`, `organisation`, `from`, `to`, `summary`, `skills`.
- Workspace hub: application stage, next action, due date, project milestones, offers, challenge deadlines, meetings.
- Invitation page: team leader, team members, pending seat, challenge terms, eligibility.

Relationships:

- `Student.pinnedCourseIds` resolves to `Course.id`.
- Studio work on profile derives from revealed applications.
- Meetings are nested under `ProjectRecord` and joined back to application/challenge through `getAllMeetings()`.

Status/lifecycle assumptions:

- Student profile distinguishes registrar verified data from self-reported data.
- Peer/partner/student views of the same person intentionally expose different slices.
- Workspace hub groups applications into `needs-you`, `in-progress`, `waiting`, and `closed`.
- Meeting states are derived as `live`, `starting`, `upcoming`, or `past`.

Business rules:

- GPA/transcript are private to the student, not shown to partners.
- Partners only see pinned courses the student chose to showcase.
- Registrar courses are automatic/verified and cannot be edited in profile UI.
- Profile completeness is derived from checklist items.
- Two live challenges is treated as the student capacity cap in directory/recommendation logic.

Derived fields:

- Profile completion percent and next checklist item.
- Recent registrar course preview.
- Agenda days/events.
- Urgent count.
- Meeting time labels.
- Application hub CTA labels.

Preliminary ERD mappings:

- `Student` maps to `users` + `student_profiles`.
- `skills` maps to `student_skills`.
- `Course` and `Experience` map partially to `student_projects`, `project_skills`, and possibly future academic-record/evidence tables.
- Profile consent/visibility maps partly to `consent_records` and `student_profiles.profile_visibility`.
- Meetings have no obvious DBML table.

Possible ERD gaps/conflicts:

- DBML does not explicitly model courses, registrar transcript sync, pinned/showcased courses, or registrar-vs-self source.
- DBML `student_projects` can represent experience/project work, but not generic work experience fields like organization, kind, month-only dates, or teaching.
- DBML has no meeting/schedule table.
- DBML has profile visibility/AI consent, but not per-field disclosure choices like pinned courses.

Open questions:

- Is registrar academic data in scope for production DB, or should it remain an external integration with only metadata stored?
- Should meetings be persisted as project schedule records?
- Should partner-visible profile pins be modeled as evidence, student projects, or a separate showcase table?

## Faculty-Facing Pages

Source files inspected:

- `src/app/faculty/page.tsx`
- `src/app/faculty/[applicationId]/page.tsx`
- `src/components/faculty/*`
- `src/components/layout/faculty-nav-bar.tsx`
- `src/lib/supervision.ts`
- `src/lib/data/faculty.ts`
- `src/lib/data/supervision-invites.ts`

Current entity/type names:

- `Faculty`
- `SupervisionInvite`
- `InviteQueueItem`
- `MilestoneQueueItem`
- `FeedbackQueueItem`
- `Application`
- `Milestone`
- `ProjectRecord`

Fields consumed:

- Faculty: `name`, `title`, `college`, `department`, `researchAreas`, `slotsUsed`, `slotsTotal`.
- Supervision invite: `applicationId`, `facultyId`, `status`, `requestedAt`, `respondBy`.
- Application/project: team members, applied date, stage, project milestones, faculty feedback, project meetings.
- Milestone: `status`, `dueDate`, `deliverable`, `facultyApproved`, `posterApproved`.

Relationships:

- Current faculty is fixed by `currentFacultyId`.
- Pending supervision invites reference applications and faculty.
- Confirmed supervision is inferred from `Application.facultySupervisorId` when no pending invite exists.
- Faculty milestone queue scans supervised project milestones.

Status/lifecycle assumptions:

- `SupervisionInviteStatus`: `"pending" | "accepted" | "declined"`.
- Pending nomination is separate from the application stage and does not gate the main pipeline.
- Faculty sees invite decision page before project/T3 content is available.
- Faculty milestone queue includes submitted milestones and marks whether faculty action is still needed.
- Completed projects without `facultyFeedback` enter feedback queue.

Business rules:

- Faculty cannot accept another team when at supervision capacity.
- Research-area overlap is derived from challenge domain tags.
- Faculty should not see full project record before accepting supervision and before the project is active.
- `Revision requested` is not shown as awaiting faculty sign-off.
- Faculty sign-off is separate from partner sign-off.

Derived fields:

- Days left for invite response and milestone due dates.
- Action-needed flags.
- Settled supervised rows.
- Faculty slot percentage/filtering in queue UI.

Preliminary ERD mappings:

- `Faculty` maps to `users` + `faculty_profiles`.
- `slotsUsed` and `slotsTotal` are not represented directly in DBML.
- Supervision invite may require a production concept distinct from `challenge_faculty_assignments`.
- Faculty milestone sign-off could map to `feedback`, `milestones.status`, or a missing approval table.

Possible ERD gaps/conflicts:

- DBML `challenge_faculty_assignments` supports challenge review/routing, not clearly application/team supervision nomination.
- DBML `milestones.status` has one status but MVP tracks separate `facultyApproved` and `posterApproved` booleans.
- DBML has generic `feedback`, but MVP distinguishes faculty learning feedback from partner close-out feedback with different visibility and timing.
- Faculty capacity is a core MVP rule but absent from DBML.

Open questions:

- Should faculty supervision capacity be stored in `faculty_profiles` or derived from active project count plus a configurable cap?
- Should dual sign-off be modeled as separate approval records rather than booleans/status?
- Is faculty supervision acceptance separate from challenge review assignment in the production lifecycle?

## Partner-Facing Pages

Source files inspected:

- `src/app/partner/page.tsx`
- `src/app/partner/challenges/[id]/page.tsx`
- `src/app/partner/students/page.tsx`
- `src/app/partner/projects/page.tsx`
- `src/app/partner/projects/[applicationId]/page.tsx`
- `src/app/partner/projects/[applicationId]/close/page.tsx`
- `src/app/partner/post/page.tsx`
- `src/components/partner/*`
- `src/components/layout/partner-nav-bar.tsx`
- `src/lib/provider.ts`
- `src/lib/recommendations.ts`
- `src/lib/data/organizations.ts`
- `src/lib/data/provider-applications.ts`
- `src/lib/data/directory.ts`
- `src/lib/data/brief-parse.ts`

Current entity/type names:

- `Organization`
- `Challenge`
- `Application`
- `ProjectRecord`
- `PartnerFeedback`
- `DirectoryStudent`
- `Recommendation`
- `ParsedBrief`

Fields consumed:

- Organization: `name`, `category`, `kind`, `initials`, `about`, contact name/role/email.
- Partner challenge dashboard: challenge status, selection counts, live counts, deadlines, team counts.
- Pipeline board: application stage, team, test result band, offer response countdown.
- Student deck: student identity/profile slice, skills, roles, hours, availability, assessment band, pinned courses, live challenge count, reasons/caveats.
- Close-out feedback: quality band, reliability band, would-host-again, shared note, private CAID note.
- Posting flow: parsed fields, confidence, evidence, gaps, uploaded filename/page count.

Relationships:

- Current organization is fixed by `currentOrgId`.
- Partner challenges are selected by `Challenge.orgId`.
- Partner applications are a union of Jordan's applications and provider-only fixtures.
- Directory students are built from peers/current student plus extras.
- Recommendations are computed from challenge requirements and directory students.

Status/lifecycle assumptions:

- Partner challenge buckets: `Published`, `Draft`, `Closed`.
- Partner board columns: `applied`, `shortlisted`, `assessment`, `interview`, `invited`.
- Live projects are application stages `ACTIVE` or `IN_REVIEW`; finished projects are `COMPLETED`.
- Close-out runs after completed project and approved milestones.
- Posting flow steps are `upload`, `parsing`, `review`, `published`, but not persisted.

Business rules:

- Partner only sees challenges for its current organization.
- Partner attention list includes applicant review, deliverable approval, and close-out feedback.
- Partner can browse recommended students independent of applications.
- Student recommendations hide numeric scores and show bands/reasons/caveats.
- At-capacity students can appear in the recommendation deck but invitation action is disabled/penalized.
- AI brief parser should show evidence/confidence and leave missing fields blank.

Derived fields:

- Selection counts and live counts.
- Partner attention items.
- Milestone progress.
- Recommendation score, fit band, matched skills, missing skills, reasons, caveats.
- Parsed brief gaps and filled counts.

Preliminary ERD mappings:

- `Organization` maps to `organizations`; contact likely maps to `users` + `organization_memberships`.
- Partner application board maps to `applications`, `assessment_attempts`, `selections`, and `projects`.
- Recommendations map partly to `match_results`, `match_skill_details`, and `match_experience_details`.
- Partner feedback maps partly to `feedback`, but MVP has a structured partner-specific shape.
- Parsed brief flow is not clearly represented in DBML.

Possible ERD gaps/conflicts:

- DBML `organization_memberships` supports contact roles, but static `Organization.contact` is embedded and singular.
- DBML matching tables store numeric component scores; MVP intentionally hides numeric scores but still needs reason/caveat display.
- DBML has no parsed-brief/import-review entity.
- DBML does not distinguish shared partner feedback from private CAID note in a structured way.
- DBML selection/application statuses do not include interview scheduling/responses as explicitly as the MVP.

Open questions:

- Should AI brief parsing results be persisted as draft challenge metadata, audit log records, or a separate import table?
- How should partner close-out feedback map to generic `feedback` while preserving private CAID-only notes?
- Should organization contacts be many-to-many memberships rather than singular challenge/org contact fields?

## Assessment Flow

Source files inspected:

- `src/app/assessment/[applicationId]/page.tsx`
- `src/app/assessment/[applicationId]/take/page.tsx`
- `src/app/assessment/[applicationId]/result/page.tsx`
- `src/components/assessment/*`
- `src/lib/data/assessment.ts`

Current entity/type names:

- `AssessmentTrack`
- `CognitiveSection`
- `CognitiveQuestion`
- `CodingProblem`
- `TestResult`
- `ScoreBand`

Fields consumed:

- Challenge: `assessmentTrack`, `assessmentMinutes`, `title`.
- Application: `stage`, `nextActionDue`, `testResult`.
- Cognitive sections/questions: section name, minutes, prompt, options, correctIndex.
- Coding problems: title, statement, language, starterCode, sampleTests.
- Test result: track, submittedAt, passed, overallBand, section bands, minutesTaken.

Relationships:

- Assessment availability is tied to application stage `TEST_PENDING`.
- Question banks are global fixtures, not tied to specific assessment IDs.
- Final result is embedded on `Application`.

Status/lifecycle assumptions:

- Single attempt only.
- Anything past `TEST_PENDING` cannot retake and redirects/shows closed state.
- Result can be absent after demo submission because there is no persistence.
- Cognitive track has sections, per-section timers, and no back-navigation.
- Technical track has code editor/sample tests/full submit behavior as fake local state.

Business rules:

- Assessments are timed, monitored, and single-attempt.
- Results are bands, not raw scores or rankings.
- Below-threshold result closes that application and triggers a 30-day cooldown copy.
- Technical track determined only by exact `"Technical"` assessment track.

Derived fields:

- Total cognitive minutes and question count.
- Technical problem count.
- Preflight item count and deadline warning.
- Lockdown timer/violations are client-only state.

Preliminary ERD mappings:

- Assessment definitions map to `assessments` and `assessment_questions`.
- Attempts map to `assessment_attempts`.
- Answers map to `assessment_responses`.
- Scores map to `assessment_scores`.
- `TestResult.sections[]` may map to assessment score dimensions or a derived result view.

Possible ERD gaps/conflicts:

- DBML assessment question types are `PRACTICAL_TASK`, `REASONING`, `ADAPTIVE_FOLLOWUP`; MVP has cognitive sections and coding problems with options/sample tests.
- DBML human scoring fields are numeric; MVP exposes banded result sections.
- DBML does not directly model lockdown/preflight/violation events.
- DBML `application_status` has `ASSESSMENT`; MVP distinguishes `TEST_PENDING` and `TEST_SUBMITTED`.

Open questions:

- Should production store assessment result bands separately from numeric reviewer scores?
- Should proctoring/lockdown events be audit logs, assessment attempt metadata, or out of scope?
- How should cognitive multiple-choice sections map to the current assessment question model?

## Offer And Selection Flow

Source files inspected:

- `src/app/offer/[applicationId]/page.tsx`
- `src/components/offer/*`
- `src/app/invitations/[applicationId]/page.tsx`
- `src/lib/pipeline.ts`

Current entity/type names:

- `Offer`
- `Application`
- `Challenge`
- `Team`
- `TeamMember`

Fields consumed:

- Offer: `invitedAt`, `respondBy`, `hoursPerWeek`, `durationWeeks`, `compensationNote`, `ndaRequired`, `startDate`.
- Application: `id`, `stage`, `offer`, `project`, `facultySupervisorId`.
- Challenge: title, org display identity, subtype, summary, start/work fields.
- Project preview fields: `fullBrief`, `resources`, `posterContact`.

Relationships:

- Offer is embedded on `Application`.
- `Application.offer` appears from `INVITED` onward.
- `OfferFlow` links accepted users to `/workspace/{applicationId}` but does not persist state.

Status/lifecycle assumptions:

- Student stage `INVITED` means selected and must respond.
- Offer can expire based on `respondBy`.
- Accepting can require NDA before reveal.
- Decline is session-only and not written to data.

Business rules:

- Confidential org name can be revealed at offer stage.
- NDA gates full brief/resources/contact details.
- Offer response countdown is derived from pinned `TODAY`.
- Accepting offer should reveal T3 content and create/open workspace in a real implementation.

Derived fields:

- Hours left/countdown labels.
- Expired boolean.
- Fallback full brief/resources/poster contact for invited applications without `project`.

Preliminary ERD mappings:

- DBML has `selections` with `status`, `selected_at`, and `responded_at`.
- Offer terms may map to `selections`, `challenges`, or a missing offer/selection terms entity.
- NDA/consent could map to `consent_records`, but the MVP implies a challenge-specific NDA signature.

Possible ERD gaps/conflicts:

- DBML has no distinct `offers` table and no fields for response deadline, compensation note, NDA required, selected workload/duration, or offer start date.
- DBML `selection_status` is `INVITED`, `ACCEPTED`, `DECLINED`; MVP also handles expiration in application stage.
- NDA signature and unlock checklist are not represented.

Open questions:

- Should offer terms be persisted as part of `selections`, `projects`, or a distinct offer entity?
- Should challenge-specific NDA acceptance be represented by `consent_records` or a separate agreement/signature table?
- What transaction should occur on offer acceptance: update selection, update application, create project, create project members, update capacity?

## Workspace And Project Flow

Source files inspected:

- `src/app/workspace/page.tsx`
- `src/app/workspace/[applicationId]/page.tsx`
- `src/app/workspace/[applicationId]/actions.ts`
- `src/components/workspace/*`
- `src/app/meeting/[meetingId]/page.tsx`
- `src/lib/workspace.ts`
- `src/lib/meetings.ts`

Current entity/type names:

- `ProjectRecord`
- `Milestone`
- `WorkspaceResource`
- `Meeting`
- `AgendaEvent`
- `Application`

Fields consumed:

- Project: `startedAt`, `milestones`, `meetings`, `resources`, `posterContact`, `fullBrief`, `facultyFeedback`, `partnerFeedback`.
- Milestone: `id`, `title`, `dueDate`, `status`, `deliverable`, `facultyApproved`, `posterApproved`.
- Resource: `name`, `kind`, `ndaTier`, `masked`.
- Meeting: `id`, `title`, `kind`, `startsAt`, `durationMinutes`, `joinUrl`, `attendees`, `milestoneId`.
- Deliverable submission: milestone, type, file/link, notes.

Relationships:

- Project record is embedded in `Application`.
- Milestones/resources/meetings are embedded in project.
- Meetings optionally reference milestone IDs.
- Server action `revealCredential()` resolves application/project/resource and checks `isRevealed()`.

Status/lifecycle assumptions:

- Workspace content is locked unless application is `ACTIVE`, `IN_REVIEW`, or `COMPLETED`.
- `COMPLETED` workspaces are read-only.
- Milestone statuses are `"Not started" | "In progress" | "Submitted" | "Approved" | "Revision requested"`.
- Dual sign-off is tracked as `facultyApproved` and `posterApproved`.
- Agenda includes deadlines, offers, milestones, and meetings.

Business rules:

- T3 content must never render before reveal.
- Credentials should be revealed server-side only after reveal gate.
- Submitted deliverables notify both faculty and partner.
- Only non-approved milestones are open for student submission.
- Overdue milestones outrank next action due dates in hub urgency.
- Closed projects show archived read-only state.

Derived fields:

- Progress counts and percentages.
- Next milestone/due date.
- Overdue labels.
- Agenda grouping.
- Meeting state/time label.
- Resource safe view hides actual `masked` credential until requested.

Preliminary ERD mappings:

- `ProjectRecord` maps to `projects`.
- `TeamMember` maps to `project_members` after selection.
- `Milestone` maps to `milestones`.
- Deliverable submission maps to `deliverables`.
- Resource/credential data has no obvious DBML table.
- Meetings have no obvious DBML table.
- Feedback maps to `feedback`, but structured partner/faculty feedback may require specialization.

Possible ERD gaps/conflicts:

- DBML `milestone_status` is `PENDING | IN_PROGRESS | COMPLETED | OVERDUE`; MVP uses submitted/revision/approved and separate dual approvals.
- DBML `deliverables` has file URL and description but MVP supports deliverable type, link-only submissions, notes, and file-size/type assumptions.
- DBML has no resources, credentials, NDA-tier resources, meeting schedule, poster contact release, or full-brief paragraphs.
- DBML `projects` has one `faculty_supervisor_id`, but MVP project/team may involve multiple student members and partner contact.

Open questions:

- Should project resources/credentials become a table with sensitivity/NDA/reveal metadata?
- Should meetings be part of the production project model?
- Should milestone approval be represented with approval records by role instead of status/booleans?
- Where should full brief content live relative to challenge description and expected deliverables?

## Shared Filtering And Query Logic

Source files inspected:

- `src/lib/queries.ts`
- `src/lib/filters.ts`
- `src/lib/provider.ts`
- `src/lib/supervision.ts`
- `src/lib/workspace.ts`

Current entity/type names:

- `FilterState`
- `ApplicationWithChallenge`
- `MeetingWithContext`
- `PipelineBucket`
- `HubBucket`
- `AttentionItem`

Fields consumed:

- Challenge filter fields: `colleges`, `subType`, `compensation`, `deadline`, `postedAt`, `durationWeeks`.
- Application join fields: `challengeId`, `id`, `stage`, `project`.
- Partner query fields: `orgId`, application stage, milestone status/approval.
- Faculty query fields: `facultySupervisorId`, supervision invite status, milestone status.

Relationships:

- Joins are performed in memory with array `find`, `filter`, and `map`.
- `getApplicationsWithChallenge()` drops applications whose challenge no longer resolves.
- `provider.ts` unions student and partner-only application fixtures.

Status/lifecycle assumptions:

- Student and partner views use different groupings over the same `ApplicationStage`.
- Current role scoping is hard-coded via `currentStudent`, `currentFacultyId`, and `currentOrgId`.

Business rules:

- Partner can only access applications for its organization's challenges.
- Faculty route 404s if neither pending invite nor confirmed supervision belongs to current faculty.
- Closed/terminal stages are filtered differently by each role.

Derived fields:

- Counts, buckets, attention rows, urgency, progress, active CTAs.

Preliminary ERD mappings:

- Query helpers will likely split into `src/db/queries/*` and service layers after ERD reconciliation.
- Role scoping should eventually map to `users`, `organization_memberships`, and auth/RBAC.

Possible ERD gaps/conflicts:

- Static helper behavior assumes both student-owned and partner-wide application lists; production queries need role-aware scoping.
- Static challenge/application IDs are route IDs; DBML uses bigint IDs and does not mention slugs.

Open questions:

- Should production keep stable public slugs separate from numeric IDs for challenge/application routes?
- Which derived counts should be queried live vs cached/materialized?

## Eligibility Logic

Source files inspected:

- `src/lib/eligibility.ts`
- `src/components/challenge/eligibility-section.tsx`
- `src/lib/recommendations.ts`
- `src/app/invitations/[applicationId]/page.tsx`

Current entity/type names:

- `EligibilityResult`
- `Student`
- `Challenge`
- `DirectoryStudent`
- `Recommendation`

Fields consumed:

- Student: `gpa`, `year`, `college`, `hoursAvailable`.
- Challenge: `minGpa`, `eligibleYears`, `eligibleColleges`, `hoursPerWeek`.
- Directory student: `college`, `year`, `hoursAvailable`, `liveChallenges`.

Relationships:

- Eligibility is computed directly from student and challenge objects.
- Recommendation scoring repeats some eligibility concepts for partner-visible students.

Status/lifecycle assumptions:

- Ineligible students can view but not apply.
- Partner recommendations score capacity/eligibility instead of filtering all records away.

Business rules:

- GPA, year, and college are hard gates in `checkEligibility()`.
- Reasons quote student values.
- Hours fit is presented in invitation flow but not part of `checkEligibility()`.
- Two live challenges is treated as a cap in recommendation logic.

Derived fields:

- Human-readable eligibility reasons.
- Recommendation caveats for eligibility/capacity.

Preliminary ERD mappings:

- Eligibility needs `student_profiles`, challenge eligibility fields, and possibly applications/projects for live challenge count.

Possible ERD gaps/conflicts:

- DBML does not clearly represent challenge eligible years, eligible colleges, minimum GPA, student GPA, or capacity cap.
- DBML student profile has `study_year`, but no `college`, `major` is present; current `major` exists but college/school linkage may need clarification.

Open questions:

- Are GPA-based gates allowed in production, and where should GPA live if academic data is external?
- Should eligibility criteria be normalized into a flexible rules table?
- Should active application/challenge caps be enforced at DB/service level?

## Lifecycle And Pipeline Logic

Source files inspected:

- `src/lib/types.ts`
- `src/lib/pipeline.ts`
- `src/lib/workspace.ts`
- `src/lib/provider.ts`
- `src/lib/supervision.ts`
- `src/components/challenge/selection-timeline.tsx`
- `src/components/challenge/pipeline-cta.tsx`

Current entity/type names:

- `ApplicationStage`
- `ChallengeStatus`
- `MilestoneStatus`
- `SupervisionInviteStatus`
- `InviteStatus`
- `ScoreBand`
- `StageVariant`

Current status/state values:

- Application stages: `APPLIED`, `SHORTLISTED`, `TEST_PENDING`, `TEST_SUBMITTED`, `INTERVIEW_SCHEDULING`, `INTERVIEW_SCHEDULED`, `INVITED`, `ACTIVE`, `IN_REVIEW`, `COMPLETED`, `NOT_SELECTED`, `WITHDRAWN`, `EXPIRED`.
- Challenge statuses: `Draft`, `In review`, `Published`, `Closed`.
- Milestone statuses: `Not started`, `In progress`, `Submitted`, `Approved`, `Revision requested`.
- Team invite statuses: `leader`, `accepted`, `invited`, `declined`.
- Supervision invite statuses: `pending`, `accepted`, `declined`.
- Score bands: `Strong`, `Proficient`, `Developing`, `Below threshold`.

Business rules:

- `warn` visual stage variant means the student owes action.
- Terminal stages are `COMPLETED`, `NOT_SELECTED`, `WITHDRAWN`, and `EXPIRED`.
- T3 reveal applies from `ACTIVE`, `IN_REVIEW`, and `COMPLETED`.
- Timeline has six visual nodes and maps multiple technical stages to the same node.
- Partner selection board excludes live and terminal applications.
- Hub groups stages differently for student workload.

Derived fields:

- Timeline index.
- CTA target.
- Stage chip variant.
- Days in stage.
- Countdown labels.
- Hub group.
- Partner board column.

Preliminary ERD mappings:

- MVP application stages map partly to DBML `application_status`, `selection_status`, `assessment_attempt_status`, `project_status`, and maybe future interview status.
- MVP challenge statuses map only partly to DBML `challenge_status`.
- MVP milestone statuses map only partly to DBML `milestone_status`.

Possible ERD gaps/conflicts:

- DBML `application_status` lacks APPLIED vs SUBMITTED naming alignment, TEST_PENDING/TEST_SUBMITTED, interview states, invited/active/project states, expired, and not-selected naming.
- DBML `selection_status` can represent invited/accepted/declined but lacks response deadline and expiration.
- DBML `project_status` has `FINAL_REVIEW`; MVP uses application stage `IN_REVIEW`.
- DBML `milestone_status` lacks submitted, approved, and revision requested.

Open questions:

- Should production keep one application status or split lifecycle into application, assessment, selection, interview, offer, and project statuses?
- Which MVP statuses are UI labels over multiple production tables rather than stored states?
- Should lifecycle history be modeled explicitly for `stageEnteredAt` and auditability?

## Information Required By UI Not Obviously Represented In DBML

- Challenge subtype, compensation, work mode, college eligibility, eligible years, minimum GPA, team size min/max, domain tags, responsibilities, interview format, applicant count display, confidential display identity.
- Application teams before selection, team invites, team roles, team availability, team name, pending/declined team seats.
- Application-level faculty supervision nomination and response.
- Faculty supervision capacity.
- Offer terms: response deadline, compensation note, NDA required, selected workload/duration/start date.
- Challenge-specific NDA signature/reveal state.
- Workspace resources, credentials, NDA-tier files, and request-to-reveal credential behavior.
- Meetings/schedule/join links/attendees/milestone-linked meetings.
- Dual milestone sign-off by faculty and partner.
- Structured partner close-out feedback with private CAID note.
- Registrar courses, transcript URL, record sync date, pinned courses, verified vs self-reported academic/profile data.
- Peer directory and partner-visible profile slices.
- AI brief parsing fields, confidence, evidence snippets, and parser gaps.
- Lockdown/proctoring state and assessment violations.
- Public route slugs if numeric DB IDs are not intended for URLs.

## Major Static Denormalizations

- `Application` embeds team, test result, offer, and project.
- `ProjectRecord` embeds milestones, meetings, resources, contact, brief, and feedback.
- `Challenge` embeds display organization fields, skills, colleges, eligibility arrays, and locked blocks.
- `Organization` embeds a single contact object.
- `DirectoryStudent` is assembled from `Peer`, current student, transcript pins, and extra partner-facing fields.
- `providerApplications` duplicates application fixtures only to populate partner portal workflows.
- `applicantCount` is stored directly on `Challenge`.

## Major Business Rules Discovered

- Static MVP data is intentionally demo-shaped and uses session-only writes.
- Students can see gated challenges but cannot apply.
- T3 content remains locked until active/revealed stages.
- Confidential org identity is hidden in marketplace but revealed at offer stage.
- Assessments are single-attempt and banded.
- Raw scores/rank numbers are hidden from students and partners.
- Faculty supervisor nomination does not gate the application pipeline but does gate supervision relationship.
- Faculty cannot accept new supervision when at capacity.
- Teams must satisfy size and pending-invite rules before applying.
- Dual sign-off is required for milestones.
- Partner and faculty queues are role-specific derived views over shared application/project data.
- Partner sourcing recommendations are separate from applicant pipeline triage.
- Large uploads/resources are represented only as UI/demo metadata, not stored.

## Major ERD Gaps Or Conflicts Found

- The DBML is production-oriented and normalized, while the MVP uses several embedded/denormalized records. This is expected, but the mapping must be reviewed explicitly.
- Team-based applications before project creation are central to the MVP but not obvious in DBML `applications`.
- The MVP has richer application pipeline states than DBML `application_status`.
- The MVP has a distinct offer object; DBML has only `selections`.
- The MVP has richer milestone states and dual sign-off than DBML `milestone_status`.
- Faculty supervision nomination and faculty challenge review/assignment appear to be different concepts in the MVP, but DBML primarily models challenge-level faculty assignment.
- Partner/faculty close-out feedback visibility and structured bands are more specific than DBML generic `feedback`.
- Marketplace filters and eligibility need fields not clearly present in DBML.
- Meetings, resources/credentials, NDA-specific unlocks, and AI brief parsing are not clearly represented in DBML.

## Open Questions For Review

- Should production support team applications before selection, and if so what tables own team membership and invite state?
- Should offer terms become a separate table or be folded into `selections`/`projects`?
- How should challenge eligibility rules be modeled, especially GPA, college, year, and application caps?
- Should dual milestone sign-off be represented as separate approval records?
- Should faculty supervision capacity be stored or derived?
- Should meetings and workspace resources be first-class project entities?
- How should partner close-out feedback and faculty feedback map to `feedback` while preserving visibility rules?
- Should AI brief parsing/import review be persisted?
- Should route-facing string IDs remain as slugs separate from bigint primary keys?
- Which MVP lifecycle states should be stored, and which should be derived from assessment/selection/project records?

## Phase Boundary Notes

- No application source code was modified.
- `docs/database/schema.dbml` was not modified.
- No Drizzle schema files were created.
- No migrations were created or generated.
- This document stops at Phase 2.0 and does not perform Phase 2.1 ERD verification or later reconciliation decisions.
