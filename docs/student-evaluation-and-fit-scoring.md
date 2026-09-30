# Student Evaluation and Fit Scoring

**Status:** Current implementation reference  
**Last updated:** 2026-09-30  
**Future direction:** Update this document when the approved AI evaluation and matching feature is implemented.

## Purpose

This document explains how the current platform evaluates students and teams.
It records the present behavior so that a future AI-assisted evaluation system
can be compared against a clear baseline.

The platform does **not** currently maintain one global student rating. It has
three separate mechanisms with different purposes:

1. a challenge-specific fit score used for partner candidate discovery;
2. an authoritative assessment grade used for application progression; and
3. qualitative project close-out feedback.

These signals are not combined into a permanent reputation score.

## 1. Challenge-specific fit score

### Purpose

The partner candidate directory compares each student with one selected
challenge. The result describes fit for that brief only. It is not a standing
rank across challenges, a percentile, or a general measure of student quality.

The current calculation is deterministic TypeScript logic in
`src/lib/recommendations.ts`. It is not produced by an AI model or semantic
matching service.

### Inputs and weights

| Component | Current contribution |
|---|---:|
| Required-skill coverage | Up to 60 points |
| Preferred-skill coverage | Up to 12 points |
| Student meets the challenge's weekly-hours requirement | +12 points |
| Student is no more than two hours short | +5 points instead |
| Previous assessment band: Strong | +10 points |
| Previous assessment band: Proficient | +6 points |
| Previous assessment band: Developing | +2 points |
| Student is in an eligible college | +4 points |
| Student is in an eligible study year | +4 points |
| Relevant student-pinned course | +4 points each, maximum two courses |
| Student already has two live projects | −40 points |

The main calculation is:

```text
raw score =
    required skill match ratio × 60
  + preferred skill match ratio × 12
  + availability contribution
  + assessment-band contribution
  + college contribution
  + study-year contribution
  + relevant pinned-course contribution
  − capacity penalty
```

If a challenge has no required skills, required-skill coverage receives the
full 60 points. If it has no preferred skills, that component contributes zero.

### Skill and course matching

Skill names are normalized to lowercase. A skill matches when the two names
are equal or when one contains the other. This supports small wording
differences, but it is not semantic or embedding-based matching.

A pinned course is considered relevant when a word longer than four characters
from its title occurs in the challenge title, domain tags, or skill names.
Only courses the student chose to showcase are available to partners.

### Bands and display

The raw score determines the fit band:

| Raw score | Fit band |
|---:|---|
| 75 or higher | Strong |
| 55–74.99 | Proficient |
| 35–54.99 | Developing |
| Below 35 | Below threshold |

The displayed number is rounded and clamped to the range `0–100`. The raw
score is still used for ordering candidates. The candidate directory sorts
students from highest to lowest raw score and returns at most ten students.

The UI also shows human-readable reasons and caveats, including matched or
missing skills, availability, eligibility mismatch, showcased coursework, and
current workload.

### Current data and privacy boundaries

The calculation uses the partner-facing student directory, which includes:

- student-declared skills;
- major, college, and study year;
- available hours and weekly availability;
- student-pinned courses; and
- the number of live projects.

It does not expose or use the student's GPA or full transcript in the partner
view.

The formula supports an assessment-band contribution. However, the current
partner-directory adapter calls `toDirectoryStudent(...)` without supplying an
assessment band, so the value defaults to `null` and that contribution is
currently zero in both the candidate directory and partner team roster.

College and study-year mismatches reduce the score and create caveats rather
than filtering the student out. A student at the two-project capacity limit
receives a 40-point penalty and cannot be invited, but may still appear when
the candidate pool is small.

### Persistence

The fit score is computed when the page is rendered. It is not stored as an
attribute of the student. Although the database contains future-oriented
`match_results` tables, they do not currently power this calculation and the
runtime does not persist these directory scores.

## 2. Assessment grading

Assessment grading is authoritative workflow data, separate from the
challenge-specific fit score.

### Grading flow

1. A student submits an individual assessment attempt.
2. Only the faculty member with an accepted supervision request for that
   application can open the grading interface.
3. The server computes multiple-choice correctness from the authoritative
   answer key and exposes that evidence only to the authorized grader.
4. Coding and free-text responses remain manual-review material. The platform
   does not execute code or invent test results.
5. The supervisor enters one authoritative overall score from `0` to `100`,
   with at most two decimal places, plus optional rubric notes and
   student-facing comments.
6. The score, reviewed-attempt state, and application transition are committed
   atomically.

The current assessment definition does not provide an approved mixed-question
weighting system. Consequently, the faculty supervisor owns the authoritative
overall score; multiple-choice correctness is evidence rather than an
automatically weighted total.

### Pass/fail rule

```text
overall score >= assessment passing score  -> PASS
overall score <  assessment passing score  -> FAIL
assessment passing score is NULL           -> unresolved configuration state
```

A pass moves the application to `SELECTION_PENDING`. A failure moves it to
`REJECTED`. A missing threshold never implies a default threshold and does not
advance or reject the application.

### Visibility

Students see the reviewed outcome and approved qualitative presentation rather
than a cohort rank. Partners can see the challenge-specific pass/fail state but
not the numeric assessment score. Student-taking payloads never contain the
multiple-choice answer key.

The implementation is primarily in:

- `src/services/assessment-grading.service.ts`;
- `src/services/assessment.service.ts`; and
- `src/app/assessment/[applicationId]/result/page.tsx`.

## 3. Project close-out feedback

During `FINAL_REVIEW`, the authorized partner can submit qualitative feedback
for the project team.

The required structured fields are:

- quality of work;
- communication and reliability; and
- whether the partner would host the team again.

Quality and reliability use these bands:

- Strong;
- Proficient;
- Developing; or
- Below threshold.

The partner also supplies a written note shared with the team and supervisor.
An optional private note can be stored for CAID and is never shown to the team.

This feedback is persisted against the project. It is team-level feedback and
is not currently converted into a numeric student rating, added to the fit
score, or aggregated into a reputation score.

The implementation is primarily in:

- `src/components/partner/close-out-form.tsx`;
- `src/services/milestone-review.service.ts`; and
- `src/db/schema/projects.ts`.

## What the current version does not do

The current platform does not:

- generate a universal rating for each student;
- use an LLM, embedding, or semantic model for candidate ordering;
- calculate percentiles or rank students across unrelated challenges;
- expose GPA or full transcripts to partners;
- automatically derive an assessment score from mixed question types;
- aggregate project feedback into a reputation score; or
- persist the current candidate-directory score in `match_results`.

## Future AI evaluation update

When a real AI-assisted evaluation or matching feature is approved and
implemented, update this document before describing the feature as production
behavior. At minimum, document:

- the precise purpose of every AI-generated score;
- input data and explicit exclusions;
- model and embedding providers or versions;
- structured versus semantic score components;
- normalization and weighting rules;
- whether scores are computed live or persisted;
- explanation and appeal mechanisms;
- bias, fairness, privacy, and human-oversight controls;
- access rules for students, faculty, partners, and administrators;
- evaluation datasets and quality metrics;
- fallback behavior when the AI service is unavailable; and
- migration or compatibility behavior for existing deterministic scores.

The future system should preserve the distinction between:

- eligibility, which is a policy gate;
- challenge-specific fit, which is comparative evidence;
- assessment results, which are authoritative workflow decisions; and
- project feedback, which records actual delivery experience.

Any decision to combine those signals into a durable student-level rating
requires explicit product, governance, privacy, and schema approval. It should
not be inferred from the existing `match_results` schema.

## Change log

- **2026-09-30:** Initial documentation of the deterministic fit score,
  authoritative assessment grading, qualitative close-out feedback, privacy
  boundaries, and current limitations.
