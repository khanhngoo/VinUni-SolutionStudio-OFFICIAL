# Data Model

Static mock data layer — no DB, no ORM. `src/lib/types.ts` interfaces are the schema; arrays in `src/lib/data/*.ts` are the seed data; `src/lib/queries.ts` joins them at request time via plain `.find()`/`.filter()`.

## Core entities

### Challenge
Posting for a project/internship.

| Field | Type | Notes |
|---|---|---|
| id | string | |
| title | string | |
| subType | ChallengeSubType | Project / Mini-Internship / Research Internship |
| orgName | string \| null | null when confidential poster |
| orgCategory | string | shown when orgName hidden |
| confidential | boolean | |
| posterKind | PosterKind | Company / Lab / Faculty |
| colleges | College[] | CAS / CBM / CECS / CHS |
| domainTags | string[] | |
| durationWeeks, hoursPerWeek | number | |
| workMode | WorkMode | On-site / Hybrid / Remote |
| compensation | Compensation | Paid / Credit / Work-study / Unpaid / Prize |
| postedAt, deadline, startDate | string (ISO date) | |
| summary, responsibilities, skills | string / string[] / Skill[] | |
| assessmentTrack | AssessmentTrack | |
| assessmentMinutes, interviewFormat | number / string | |
| minGpa, eligibleYears, eligibleColleges | gating fields | never hides challenge, only disables applying |
| lockedBlocks | LockedBlock[] | progressive disclosure (T0–T3) |
| suggestedFacultyIds | string[] | → Faculty.id |
| applicantCount | number | |

### Faculty
| Field | Type | Notes |
|---|---|---|
| id, name, title | string | |
| college | College | |
| department | string | |
| researchAreas | string[] | |
| slotsUsed, slotsTotal | number | supervision capacity — full supervisor can't be nominated |

### Student
| Field | Type |
|---|---|
| id, name, email | string |
| college | College |
| major | string |
| year | number |
| gpa, gpaScale | number |
| skills | string[] |
| hoursAvailable | number |
| workPreference | WorkMode |

### Application
Central join record tying a student's journey to a Challenge.

| Field | Type | Notes |
|---|---|---|
| id | string | |
| challengeId | string | → Challenge.id |
| stage | ApplicationStage | see pipeline below |
| appliedAt, stageEnteredAt | string (ISO date) | |
| facultySupervisorId | string | → Faculty.id, nominated at apply time |
| nextAction, nextActionDue | string \| null | |
| testResult | TestResult \| null | present once TEST_SUBMITTED+ |
| offer | Offer \| null | present from INVITED+ |
| project | ProjectRecord \| null | present from ACTIVE+ |

**ApplicationStage pipeline** (STAGE_ORDER):
`APPLIED → SHORTLISTED → TEST_PENDING → TEST_SUBMITTED → INTERVIEW_SCHEDULING → INTERVIEW_SCHEDULED → INVITED → ACTIVE → IN_REVIEW → COMPLETED`
Terminal side-states: `NOT_SELECTED`, `WITHDRAWN`, `EXPIRED`.

## Nested types

### TestResult (on Application)
track, submittedAt, passed, overallBand (ScoreBand), sections[] (name + band), minutesTaken.

### Offer (on Application)
invitedAt, respondBy (ISO datetime deadline), hoursPerWeek, durationWeeks, compensationNote, ndaRequired, startDate.

### ProjectRecord (on Application, = the workspace)
| Field | Type | Notes |
|---|---|---|
| startedAt | string | |
| milestones | Milestone[] | |
| meetings | Meeting[] | may be empty |
| resources | WorkspaceResource[] | |
| posterContact | { name, role, email } | T3 content, workspace-only |
| fullBrief | string[] | |

**Milestone**: id, title, dueDate, status (MilestoneStatus), deliverable, `facultyApproved` + `posterApproved` (dual sign-off).

**Meeting**: id, title, kind (MeetingKind), startsAt (ISO datetime w/ Z), durationMinutes, joinUrl, attendees[] (MeetingAttendee: name + role), `milestoneId?` → Milestone.id (set only for review meetings).

**WorkspaceResource**: name, kind, ndaTier (bool, stays gated in workspace), masked? (credential display).

## Data layer files

`src/lib/data/`:
- `challenges.ts` — Challenge[]
- `applications.ts` — Application[]
- `faculty.ts` — Faculty[]
- `student.ts` — Student
- `assessment.ts` — assessment content
- `meetings.ts` — meeting-related fixtures

## Relationships (id-ref, no FK enforcement)

```
Challenge.id ←── Application.challengeId
Faculty.id   ←── Application.facultySupervisorId
             ←── Challenge.suggestedFacultyIds[]
Milestone.id ←── Meeting.milestoneId (optional)
```

Meetings live nested inside `Application.project.meetings`, not a top-level table — reaching "all meetings" requires flattening across all applications.

## Join layer (`src/lib/queries.ts`)

| Function | Joins | Notes |
|---|---|---|
| `getChallenges(filters)` | — | filtered/sorted Challenge[] |
| `getChallengeById(id)` | — | |
| `getFacultyOptions(challenge)` | Challenge → Faculty | suggested faculty first, rest after |
| `getApplications()` / `getApplicationById(id)` | — | |
| `getApplicationByChallengeId(id)` | Application ⋈ challengeId | |
| `getApplicationsWithChallenge()` | Application ⋈ Challenge | drops orphaned applications silently |
| `getAllMeetings()` | Application ⋈ Challenge ⋈ project.meetings | flatMap across all applications |
| `getMeetingById(id)` / `getAllMeetingIds()` | same, filtered | |

Downstream consumers (`filters.ts`, `pipeline.ts`, `eligibility.ts`, `workspace.ts`, `meetings.ts`) all operate on these joined shapes rather than raw arrays.
