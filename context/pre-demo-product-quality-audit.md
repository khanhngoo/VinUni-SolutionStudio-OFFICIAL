# Pre-Demo Product Quality Audit — VinUni Solution Studio

> **The demo shows a finished platform. The write path underneath it does not exist.**

A seven-pass review across every route, persona and lifecycle in the application — code-traced and then exercised live in a browser against the seeded development database.

| | |
|---|---|
| **Reviewed** | 10 Sep 2026 |
| **Scope** | 57 routes · 6 personas · 5 entity lifecycles |
| **Findings** | 83 (7 P0 · 24 P1 · 34 P2 · 18 P3) |
| **Method** | Read-only — no application code was modified |

---

## Verdict — not ready as an end-to-end story

The browse-and-read surface of this product is genuinely strong: the challenge detail page, the invitation page, the faculty action queue and the admin console are well-built, carefully authorized and thoughtfully written. **If the demo is a *tour of screens*, it will land.**

But **no user of any role can move the pipeline forward past "application submitted."** Five separate writes that the product's own copy promises are absent from the codebase entirely — they exist only in the seed script. Every stage the demo displays downstream of applying is pre-seeded scenery, not something the app can produce. If a stakeholder asks to see a team selected, an assessment graded, or a project started, there is no path.

Two things also need fixing before anyone opens the URL. **The public marketplace shows exactly one challenge** — verified signed-out — because anonymous visitors and partners are restricted to `PUBLIC_PREVIEW` and only 1 of 8 open challenges carries it. And one of the eight is titled **"SYNTHETIC DEMO: E-Lab venture readiness dashboard"**, live and applicable in the student marketplace right now.

---

## 1. Executive summary

### Where the core loop breaks

Each break was verified by grepping for the write across `src/` excluding `src/db/seed/`. All returned no results.

```
Post & review  →  Apply  ✕1  Nominate supervisor  ✕2  Assess  ✕3  Select & offer  ✕4  Project
   [works]      [works]      [discarded]              [never graded]   [no control]     [never created]
```

| # | Missing write | Consequence |
|---|---|---|
| ✕1 | `insert(supervisionRequests)` | The apply wizard *requires* a supervisor and the success screen says they "have been notified"; `CreateApplicationInput` has no supervisor field at all. |
| ✕2 | `assessment_scores` write / `REVIEWED` transition | Every attempt a student takes is parked on "awaiting review" permanently. |
| ✕3 | `insert(offers)` | The partner has six server actions and none of them selects a team or issues an offer. |
| ✕4 | `insert(projects)` / `insert(projectMembers)` / `insert(selections)` | Accepting an offer only flips `offers.status`; the workspace it hands you a button to never opens. |
| ✕5 | `updateApplicationStatus` call sites | Exists, is correctly compare-and-swap guarded — and has **zero call sites**. Any application created live is frozen at `SUBMITTED` forever; six of its seven states are unreachable. |

### Strongest parts of the current application

- **The admin console is exemplary.** Layout gate plus an independent `PLATFORM_OWNER` re-check on all 13 pages, regex-validated route params, and pagination that neutralises `?page=abc`. It is the reference implementation the rest of the app should copy.
- **Challenge detail is a genuinely good product page** — workload, duration, skills split by required/preferred, a selection timeline, progressive disclosure of gated material, and a clear eligibility block.
- **Where guards exist, they are real, not cosmetic.** Offer acceptance re-checks status and expiry in SQL; assessment submission uses a conditional `UPDATE … RETURNING` inside a transaction. These are correct concurrent-safe implementations, not UI-only hiding.
- **Organization scoping does not leak.** Partner and reviewer services return `null` for another org's object, producing a clean 404 rather than exposing data.
- **The faculty queue and invitation page are well-designed** — populated, prioritised, with the context needed to decide.

### Biggest usability risks

- **The public marketplace shows one challenge.** `marketplaceVisibilitiesForContext` restricts both `ANONYMOUS` and `EXTERNAL_PARTNER` audiences to `PUBLIC_PREVIEW`, and only 1 of the 8 open challenges is `PUBLIC_PREVIEW`. Verified signed-out: "1 open challenge", one card. This is what a stakeholder sees if they open the link before signing in, and what every partner contact sees. A signed-in student correctly sees all 8.
- **A newly registered user is misclassified as an external partner.** `marketplaceContextForActor` has no branch for a role-less account, so it falls through to `EXTERNAL_PARTNER` with zero memberships — inheriting the same 1-of-8 restriction, plus a nav bar containing nothing but "Challenges", and no way to apply to the one thing they can see.
- **Internal build language ships in the product.** A live, applicable challenge is titled "SYNTHETIC DEMO: E-Lab venture readiness dashboard". All 7 seeded organizations carry descriptions like "DEMO partner from static fixture org-bencang", rendered on the partner's own card and on challenge detail pages. Assessment score comments cite "Phase 3.6". The filter rail ships a visible "Not yet wired" section.
- **Four feature tables are entirely empty** — `match_results`, `notifications`, `assessment_responses` and `challenge_reviews` all have 0 rows. Matching is a headline feature of this platform with no data behind it at all.
- **Raw enum names are shown to external users** — "APPLICATIONS OPEN", "SELECTION PENDING", "REVISION REQUESTED". A complete label system already exists at `src/lib/labels.ts` and is imported by only 5 files, while 20 files hand-roll `replaceAll("_", " ")`.
- **Three sibling student routes handle the same denial three different ways** — `/profile` renders an explanation, `/applications` 404s, and `/workspace` renders a student-framed empty state telling a non-student they "haven't applied to anything yet".

### Biggest behavioral risks

- **Normal user states produce HTTP 500.** There is no `src/app/error.tsx` anywhere — only `challenges/error.tsx` — so any uncaught throw becomes a raw Next.js crash page. Confirmed live in the browser: a malformed id on `/assessment/<anything>`, and any non-student opening a real `/offer/<uuid>`.
- **Pass/fail fails open.** `result.passed ?? result.overallBand !== "Below threshold"` renders a green "Passed" chip when both values are null. The authoritative numeric column is loaded and never compared to anything — and no passing-threshold field exists in the schema at all.
- **Required user input is collected and silently discarded** in three separate flows: the supervisor nomination, the faculty decline reason, and the partner's sourcing-deck verdicts.
- **Actions the UI presents as available cannot complete** — deliverable submission is hardcoded `enabled = false`, partner close-out's submit button is permanently disabled, and the faculty "Write feedback" button is permanently disabled while still inflating the queue count.

### Top 5 to fix before demonstrating

1. **Fix the public marketplace and purge seed language.** Half a day, and it changes the first thing anyone sees: mark 4–5 challenges `PUBLIC_PREVIEW`, stop treating partners as anonymous, retitle the "SYNTHETIC DEMO" challenge, and rewrite the 7 organization descriptions.
2. **Decide the demo's narrative boundary.** Either implement selection→offer→project (large), or explicitly scope the demo to "post, review, discover, apply" and pre-seed the downstream states you intend to show. Do not walk a stakeholder into an accept button that leads to a locked page.
3. **Add `src/app/error.tsx` and validate UUID route params** — turns every confirmed 500 into a controlled page. Roughly an hour, removes the worst class of demo accident.
4. **Either persist the supervisor nomination or remove step 3 and its "has been notified" claim.** Telling a student a named professor was notified when nothing was written is the single most damaging false statement in the product.
5. **Rehearse with the personas that actually have data.** Jordan Lee and the Bến Cảng contact carry nearly every interesting state; the E-Lab reviewer's dashboard is completely empty and Priya has no offer, no assessment and no leadership. Either seed them or keep them out of the script.

---

## 2. End-to-end journey findings by persona

Each journey below was walked in a real browser against the seeded database, signed in as the persona named. "What feels wrong" is written from the user's side of the screen.

### Brand-new registered student
`register → / → /challenges → challenge detail → apply`

**What works**
- Registration itself is clean, validates well, and signs you straight in.
- The apply route is properly enforced server-side — not merely hidden.

**What feels wrong**
- Lands on a marketplace showing **one** challenge, labelled "1 open challenges".
- Nav contains only "Challenges" — no profile, no way to complete an account.
- The apply slot reads "Applications are available to student accounts." with no link and no next step.
- Typing the apply URL returns "We couldn't find that challenge" — about a challenge that plainly exists.
- Header copy promises a suitability ring on each card; no ring is ever rendered for anyone.

**Recommended behavior**
- Give the role-less account a real first-run destination that states what kind of account it is and how to get verified as a student.
- Show the full VinUni-visible catalogue, or explain why it is restricted.
- Every gate names one concrete recovery action.

### Existing student
`browse → detail → apply → assessment → offer → workspace`

**What works**
- Sees all 8 challenges and the full nav. Discovery and filtering are good.
- The four-step apply wizard is well-paced; errors return in place rather than discarding the draft.
- Duplicate-application protection at page, service and database level.
- Assessment preflight sets expectations well: single attempt, autosave, violation policy.
- Offer decline is properly guarded by a confirm dialog.

**What feels wrong**
- The wizard demands a faculty supervisor, then discards it and claims they were notified.
- "Save draft" is a link back to the challenge; the footnote three lines below admits nothing is saved.
- Preflight promises 55 minutes; the runner counts 40.
- A submitted assessment can never be graded, so the result page never changes.
- Accepting an offer hands you "Open your workspace", which lands on "this opens when you accept".
- A finished project is unreachable — closed rows link to the public marketing page.

**Recommended behavior**
- Every promise in the copy corresponds to a write that happens.
- Accept lands the student in a real workspace in one transaction.
- Closed projects stay reachable as the student's own record of the work.

### Student in edge-case states
`rejected · below threshold · expired offer · direct URL access`

**What works**
- Expired/duplicate/withdrawn offer acceptance is refused in SQL, not just hidden.
- Already-answered invitations show a correct terminal state.
- Assessment retake is genuinely impossible — guarded at both service and mutation level.

**What feels wrong**
- A declined or withdrawn offer still renders a green "Selected" chip and "You've been selected" above the refusal panel.
- An expired offer drops into a "Closed" chip strip labelled "Expired" with no explanation and no next step.
- A malformed id in the URL produces a raw 500 rather than a 404.
- An ineligible student is warned but never blocked until the final click, then told to "check the application details and try again".

**Recommended behavior**
- Terminal states get their own header, not the celebratory one.
- Ineligibility is stated before four steps of work, not after.

### Faculty member
`sign in → / → /challenges → (self-navigate) → /faculty → decide`

**What works**
- The action queue is the best-populated surface in the product — typed, counted, sorted by urgency.
- Supervision load renders correctly ("1 of 5 slots").
- Accept/decline on an invitation is clear and well-contextualised.

**What feels wrong**
- Signs in and lands on the student marketplace, not their queue.
- The decline dialog requires a reason, then drops it — and tells the faculty member the team "has been told".
- "Feedback due" rows can never be cleared; the button is permanently disabled but still counted.
- Opening any `/offer/<uuid>` returns HTTP 500 — confirmed live.
- A missing duration renders as "— wks".

**Recommended behavior**
- Redirect by capability on sign-in.
- Never count work that cannot be done.
- Denials are 404s, not crashes.

### Partner contact person
`sign in → /partner → post → review teams → select → run project → close`

**What works**
- The dashboard is genuinely informative: owned challenges, applications, projects, milestones needing sign-off.
- Milestone approval and revision requests are real, working writes.
- Challenge drafting and submit-for-review work end to end.

**What feels wrong**
- **Cannot select a team or issue an offer at all** — the dashboard says a team "is waiting on a decision" and links to a page with no decision control.
- Their own organization card reads "DEMO partner from static fixture org-bencang."
- Statuses render as "APPLICATIONS OPEN", "SELECTION PENDING".
- A validation error on the post form discards every field and returns to a screen with no form on it.
- Close-out's submit button is permanently disabled — the last step of the journey cannot be completed.
- Two different destinations for the same project, only one of which has the sign-off control.

**Recommended behavior**
- Selection is the partner's core action and needs to exist, or be visibly out of scope.
- Never show a partner an internal fixture description.
- Preserve form input across validation errors.

### Internal unit reviewer & anonymous visitor
`/review queue → decision · and public browsing`

**What works**
- Review scoping is correct; another unit's challenge cleanly 404s.
- Anonymous browsing works and the header correctly shows only Challenges + Sign in.
- Authenticated routes redirect anonymous users to sign-in consistently.

**What feels wrong**
- Reject is a bare one-click button beside Approve, with no confirmation and an optional reason — and it maps to `CANCELLED`, which is neither editable nor resubmittable. A partner's challenge can be killed permanently with no explanation.
- The reviewer cannot see who posted it — no contact name or email on the decision page.
- Visiting `/sign-in` while already signed in shows the form plus your own signed-in header.
- The partner is told "A CAID officer reviews every posting" even when they selected E-Lab.

**Recommended behavior**
- Rejection requires confirmation and a mandatory reason, and leaves a path to revise.
- Name the actual managing unit.

---

## 3. Detailed findings

Full detail for every P0 and P1. P2/P3 findings are tabulated in compact form after them — at 83 findings the long template stops being readable, and the compact rows carry the same file references.

**Severity legend:** `P0` critical — core workflow unusable · `P1` high — fails or seriously misleads · `P2` medium — confusing or inconsistent · `P3` low — polish

### P0 — Critical

#### F-01 — The faculty supervisor a student is forced to nominate is discarded at the service boundary
- **Severity:** P0
- **Category:** BUG / BUSINESS_LOGIC / PRODUCT_FLOW
- **Persona:** Student, faculty
- **Route:** `/challenges/[id]/apply`
- **Current behavior:** Step 3 of the wizard blocks progress without a supervisor (`apply-validation.ts:73` — "Pick a supervisor to nominate."). The draft carries `facultySupervisorId`, but `CreateApplicationInput` (`application.service.ts:99–108`) has **no supervisor field**, so the value is dropped. `insert(supervisionRequests)` appears nowhere in `src/` outside the seed. The success screen then states: *"{supervisorName} has been notified and has five working days to respond."*
- **Why this feels wrong:** The product tells a student, by name, that a professor was contacted on their behalf. Nobody was. The student waits on a response that was never requested, and the "Faculty supervision" block on their application page stays empty forever.
- **Expected behavior:** Persist the nomination and create the supervision request in the same transaction as the application — or remove step 3 and the notification sentence.
- **How to reproduce:** Apply to any challenge as a student; complete step 3; submit; read the success screen; query `supervision_requests` — no new row.
- **Relevant files:** `src/services/application.service.ts:99`, `src/lib/apply-validation.ts:73`, `src/components/apply/apply-success.tsx:15`, `src/components/apply/apply-wizard.tsx:136`
- **Regression tests needed:** Submitting an application with a nomination creates exactly one `supervision_requests` row bound to that application, inside the same transaction.

#### F-02 — No user can select a team or issue an offer — the write does not exist
- **Severity:** P0
- **Category:** PRODUCT_FLOW / BUSINESS_LOGIC
- **Persona:** Partner contact (blocks student and faculty downstream)
- **Route:** `/partner/challenges/[id]/teams/[applicationId]`
- **Current behavior:** `insert(offers)` exists only in `src/db/seed/`. The partner area has exactly six server actions — draft update, submit-for-review, create draft, two milestone actions, profile save — and none of them selects a team. The pipeline board is a read-only link list. Meanwhile the dashboard labels a team "Shortlist" and the projects page says "A project starts when an offer is accepted."
- **Why this feels wrong:** This is the partner's entire reason for using the platform. The UI advertises the action in three places and provides it in none.
- **Expected behavior:** A selection control that creates a `selections` row and a `PENDING` offer with a respond-by date, in one transaction, with an audit event.
- **How to reproduce:** Sign in as `BENCANG_CONTACT_DEMO` → `/partner` → open any "Selection pending" application → no decision control anywhere on the page.
- **Relevant files:** `src/components/partner/pipeline-board.tsx:45`, `src/app/partner/challenges/[id]/teams/[applicationId]/page.tsx`, `src/app/partner/page.tsx:71`
- **Regression tests needed:** Selecting a team creates one selection + one PENDING offer; a second selection on the same application is refused.

#### F-03 — Accepting an offer creates no project, so the workspace it links to stays locked
- **Severity:** P0
- **Category:** PRODUCT_FLOW / BUSINESS_LOGIC
- **Persona:** Student
- **Route:** `/offer/[applicationId]` → `/workspace/[applicationId]`
- **Current behavior:** `respondToPendingOffer` runs in a transaction whose only statement is `UPDATE offers SET status='ACCEPTED'`. Nothing writes `applications.status`, `selections`, `projects` or `project_members` — those inserts exist only in the seed. The success panel's primary button, "Open your workspace", resolves to a project that does not exist and renders *"This workspace opens when you're selected and accept."*
- **Why this feels wrong:** The student just accepted. The app congratulates them, hands them a green button, and the button tells them to accept. It is a dead end at the highest-stakes moment in the product.
- **Expected behavior:** Accept sets the application status, creates the project and its members from accepted application members, and lands the student in a real workspace — atomically.
- **How to reproduce:** Sign in as the leader of the one seeded `PENDING` offer → accept → sign NDA → "Open your workspace" → locked page.
- **Relevant files:** `src/db/mutations/offers.ts:18–49`, `src/services/offer.service.ts:98`, `src/app/workspace/[applicationId]/page.tsx:59`
- **Regression tests needed:** Accept creates project + members and is fully rolled back if any step fails; the workspace renders immediately after.

#### F-04 — A submitted assessment can never be graded
- **Severity:** P0
- **Category:** PRODUCT_FLOW / BUSINESS_LOGIC
- **Persona:** Student (and whoever was meant to review)
- **Route:** `/assessment/[applicationId]/result`
- **Current behavior:** No code writes `assessment_scores` or sets an attempt to `REVIEWED` outside the seed; `updateAssessmentAttemptStatus` accepts only `IN_PROGRESS | SUBMITTED`. `/admin/assessments` is a read-only inventory with no grading action and no `actions.ts`. There is also **no reviewer persona or route for grading anywhere in the app.**
- **Why this feels wrong:** Any assessment actually taken during a demo is parked on "awaiting review" permanently. Only the two pre-seeded reviewed attempts ever show a result.
- **Expected behavior:** A grading surface for the responsible role, writing a score and moving the attempt to `REVIEWED` — or the assessment stage is scoped out of the demo explicitly.
- **How to reproduce:** Take any assessment to completion as a student; the result page shows "awaiting review" with no path forward, for all time.
- **Relevant files:** `src/db/mutations/assessments.ts:91`, `src/app/admin/assessments/page.tsx`
- **Regression tests needed:** A graded attempt transitions to REVIEWED and the student's result page reflects the stored score.

#### F-06 — The public marketplace shows 1 of 8 challenges — to anonymous visitors, partners, and every new account
- **Severity:** P0
- **Category:** PRODUCT_FLOW / DATA-SEED / BUSINESS_LOGIC
- **Persona:** Anonymous visitor, partner contact, newly registered user
- **Route:** `/challenges`
- **Current behavior:** Two compounding causes. (1) `marketplaceVisibilitiesForContext` returns `["PUBLIC_PREVIEW"]` for **both** the `ANONYMOUS` and `EXTERNAL_PARTNER` audiences — partners are treated exactly like logged-out strangers. (2) Of the 8 open challenges only **one** is `PUBLIC_PREVIEW`; 7 are `VINUNI_ONLY` or `PRIVATE`. Separately, `marketplaceContextForActor` has no branch for a role-less account and falls through to `EXTERNAL_PARTNER` with an empty membership array, so every self-registered VinUni student inherits the same restriction.
- **Why this feels wrong:** This is the front door. Verified signed-out in a browser: "1 open challenge", one card, on a page headed "Challenge marketplace". A stakeholder opening the link before signing in sees a marketplace with one item in it — the single most damaging first impression the product can make, and entirely a configuration and seed-mix problem rather than a missing feature.
- **Expected behavior:** Seed 4–5 challenges as `PUBLIC_PREVIEW`; give `EXTERNAL_PARTNER` its own visibility set rather than sharing anonymous's; add an explicit role-less audience with a first-run page explaining how to become a student.
- **How to reproduce:** Verified — sign out entirely, open `/challenges` → 1 card. Sign in as `JORDAN_STUDENT_DEMO` → 8 cards.
- **Relevant files:** `src/services/challenge-policy.ts:113–121`, `src/lib/challenge-marketplace.ts:37–45`, `src/db/seed/challenges.ts`
- **Regression tests needed:** An anonymous visitor sees a populated marketplace; a role-less user never resolves to `EXTERNAL_PARTNER`.

#### F-06b — A challenge titled "SYNTHETIC DEMO: …" is live and applicable in the marketplace
- **Severity:** P0
- **Category:** DATA-SEED
- **Persona:** All — most visibly, stakeholders
- **Route:** `/challenges`
- **Current behavior:** Verified in the database: challenge 8, status `APPLICATIONS_OPEN`, `title = 'SYNTHETIC DEMO: E-Lab venture readiness dashboard'`, summary "Synthetic DEMO challenge for exercising … flows". It appears in the student marketplace alongside real briefs. It is also E-Lab's *only* challenge, so the E-Lab reviewer persona has nothing else to show.
- **Why this feels wrong:** One card in eight announces to a stakeholder that they are looking at test data.
- **Expected behavior:** A real title and summary, or exclude it from marketplace statuses.
- **How to reproduce:** Sign in as any student → `/challenges` → the card is visible.
- **Relevant files:** `src/db/seed/challenges.ts`
- **Regression tests needed:** No marketplace-visible row contains "SYNTHETIC", "DEMO" or "fixture".

#### F-06c — Application status can never change — the one correct mutation has zero call sites
- **Severity:** P0
- **Category:** BUG / BUSINESS_LOGIC
- **Persona:** Student, partner, faculty
- **Route:** All application surfaces
- **Current behavior:** `updateApplicationStatus` (`db/mutations/applications.ts:370–395`) is a properly written compare-and-swap helper — and grepping for it returns the definition and nothing else. Applications are inserted as `SUBMITTED` and never move. Six of the seven states — `SHORTLISTED`, `ASSESSMENT`, `SELECTION_PENDING`, `SELECTED`, `REJECTED`, `WITHDRAWN` — are seed-only.
- **Why this feels wrong:** It also means a student cannot withdraw an application, which is the one piece of control they should always have over their own submission.
- **Expected behavior:** Wire the helper into the selection, rejection and withdrawal flows.
- **How to reproduce:** Apply live; the application stays `SUBMITTED` permanently regardless of any downstream action.
- **Relevant files:** `src/db/mutations/applications.ts:370`
- **Regression tests needed:** Each status transition has at least one call site and one test.

### P1 — High

#### F-05 — Normal denials and malformed URLs return HTTP 500 — there is no root error boundary
- **Severity:** P1
- **Category:** ERROR_HANDLING / AUTHORIZATION
- **Persona:** All
- **Route:** `/offer/[applicationId]`, and every UUID-parameterised route
- **Current behavior:** Two distinct causes, both **confirmed live in a browser**. (1) `/offer/[applicationId]:29` calls `getOfferDetail` with no try/catch, so the `FORBIDDEN` thrown for any non-member becomes an unhandled exception. (2) `public_id` columns are Postgres `uuid`; no route validates the param, so `'abc'` raises `22P02 invalid input syntax for type uuid`. With only `challenges/error.tsx` in the tree and no `src/app/error.tsx`, both reach the framework crash page.
- **Why this feels wrong:** A crash page in front of stakeholders, and the 404-vs-500 split is an enumeration oracle revealing which ids are real.
- **Expected behavior:** Catch `FORBIDDEN` → `notFound()` exactly as `/workspace/[applicationId]:53` already does; validate the UUID shape before querying; add a root `error.tsx`.
- **How to reproduce:** Verified — signed in as `FACULTY_PHAM_DEMO`, `/offer/44444444-4444-4444-8444-000000000001` → 500. Signed in as a student, `/assessment/not-a-uuid` → 500.
- **Relevant files:** `src/app/offer/[applicationId]/page.tsx:29`, `src/services/offer.service.ts:191`; affects `/workspace/*`, `/applications/*`, `/assessment/*`, `/invitations/*`, `/meeting/*`, `/faculty/*`. Correct pattern already at `src/app/admin/users/[userId]/page.tsx:45`.
- **Regression tests needed:** Every parameterised route returns 404 for malformed ids and for authorised-but-not-permitted actors; no route returns 5xx for either.

#### F-07 — Assessment pass/fail fails open — an ungraded result renders as "Passed"
- **Severity:** P1
- **Category:** BUSINESS_LOGIC / BUG
- **Persona:** Student, partner
- **Route:** `/assessment/[applicationId]/result`
- **Current behavior:** `const passed = result.passed ?? result.overallBand !== "Below threshold"`. Both values come from untyped JSONB. When both are null, `null !== "Below threshold"` evaluates **true** and the page renders a green "Passed" chip and "above the threshold for this challenge". The authoritative `assessment_scores.overall_score` column is loaded and never displayed or compared. No passing-threshold field exists in the schema at all.
- **Why this feels wrong:** A student can be told they passed an assessment nobody scored, and a partner may act on it.
- **Expected behavior:** Default to not-passed when the verdict is unknown; add an explicit threshold to the schema and compare the numeric score against it.
- **How to reproduce:** Insert a score row with an empty `rubricScores`; open the result page.
- **Relevant files:** `src/app/assessment/[applicationId]/result/page.tsx:73`, `src/services/assessment.service.ts:776`
- **Regression tests needed:** A score row with missing/malformed JSON never renders a pass.

#### F-08 — Preflight promises 55 minutes; the runner gives 40
- **Severity:** P1
- **Category:** BUG / UX
- **Persona:** Student
- **Route:** `/assessment/[applicationId]` → `/take`
- **Current behavior:** Preflight displays `assessment.timeLimitMinutes`; `CognitiveRunner` sums the per-*section* limits. In seeded data these are 55 and 10+12+10+8 = 40. The demo tells students 55 minutes and gives them 40.
- **Why this feels wrong:** A student paces themselves against a stated budget and is cut off 15 minutes early on a single, unrepeatable attempt.
- **Expected behavior:** One authoritative duration, derived the same way in both places.
- **How to reproduce:** Open the preflight for the seeded cognitive assessment, note "55 minutes", start, watch the clock begin at 40:00.
- **Relevant files:** `src/app/assessment/[applicationId]/page.tsx:126`, `src/components/assessment/cognitive-runner.tsx:47`, `src/db/seed/assessments.ts:293`
- **Regression tests needed:** Preflight minutes equal the runner's starting clock for every assessment shape.

#### F-09 — A blank coding answer makes the whole submission impossible
- **Severity:** P1
- **Category:** BUG / BUSINESS_LOGIC
- **Persona:** Student
- **Route:** `/assessment/[applicationId]/take`
- **Current behavior:** `TechnicalRunner` submits every problem including untouched ones; `validateResponseShape` throws `VALIDATION_ERROR "Code response is empty."` for a blank string; the whole submit is one transaction, so a single empty editor rolls back everything. On timer-expiry auto-submit this silently destroys the attempt.
- **Why this feels wrong:** Leaving one question blank is normal exam behaviour and must not make submission impossible.
- **Expected behavior:** Omit or store blank answers as unanswered; never let one empty field void a submission.
- **How to reproduce:** Open a coding assessment, clear one editor, submit.
- **Relevant files:** `src/components/assessment/technical-runner.tsx:154`, `src/services/assessment.service.ts:634`
- **Regression tests needed:** Submission succeeds with any subset of questions answered, including none.

#### F-10 — An assessment with no questions, or a null time limit, breaks the attempt
- **Severity:** P1
- **Category:** BUG / ERROR_HANDLING
- **Persona:** Student
- **Route:** `/assessment/[applicationId]/take`
- **Current behavior:** Two latent faults, neither triggered by current seed data (verified: 0 of 2 assessments have a null limit). (a) `cognitive-runner.tsx:108` indexes `sections[i].questions[j]` unguarded while the query legitimately returns `sections: []` → SSR TypeError → 500. (b) `use-lockdown.ts:71` starts at 0 seconds when the limit is null and auto-submits an empty attempt one second after load. Both columns are nullable in the schema.
- **Why this feels wrong:** The moment anyone creates an assessment through the admin surface without a time limit or questions, a student's single unrepeatable attempt is destroyed with no warning.
- **Expected behavior:** Refuse to start an assessment that has no questions or no duration, with a controlled message.
- **How to reproduce:** Set `time_limit_minutes = NULL` on an ACTIVE assessment and start it.
- **Relevant files:** `src/components/assessment/cognitive-runner.tsx:108`, `src/components/assessment/use-lockdown.ts:71`, `src/db/schema/assessments.ts:38,70`
- **Regression tests needed:** Zero-section and null-limit assessments render a controlled state, never a crash or an instant auto-submit.

#### F-11 — Every persona lands on the student marketplace after signing in
- **Severity:** P1
- **Category:** PRODUCT_FLOW / NAVIGATION
- **Persona:** Faculty, partner, reviewer, admin
- **Route:** `/` → `/challenges`
- **Current behavior:** All four sign-in actions use `redirectTo: "/"`, and `/` unconditionally redirects to `/challenges`. Verified live for faculty and partner. Each must notice a header link to reach their own queue.
- **Why this feels wrong:** A professor signs in to a browse-and-apply grid for students. Their pending decisions are invisible until they go looking.
- **Expected behavior:** Resolve the actor and redirect by capability — `/faculty`, `/partner`, `/review`, `/admin`.
- **How to reproduce:** Sign in as `FACULTY_PHAM_DEMO` → lands on `/challenges`.
- **Relevant files:** `src/app/sign-in/actions.ts:24,30,44,80`, `src/app/page.tsx:3`
- **Regression tests needed:** Each persona's post-sign-in destination matches their primary capability.

#### F-12 — Faculty decline reason is required, then discarded — and the team is told
- **Severity:** P1
- **Category:** BUG / PRODUCT_FLOW
- **Persona:** Faculty, student
- **Route:** `/faculty`
- **Current behavior:** The dialog requires a reason ("Give the team a short reason"), but both call sites invoke `onDecline()` with no argument and `declineSupervisionRequest(requestId)` has no reason parameter. The UI then says "{teamName} has been told."
- **Why this feels wrong:** Same class of defect as F-01: mandatory input collected, dropped, and a false confirmation shown.
- **Expected behavior:** Persist the reason and surface it to the team, or stop requiring it.
- **How to reproduce:** Decline a supervision request as faculty; inspect the request row — no reason stored.
- **Relevant files:** `src/components/faculty/confirm-decline-dialog.tsx:43`, `src/app/faculty/actions.ts:26`, `src/components/faculty/invite-decision.tsx:69`
- **Regression tests needed:** A declined request stores its reason and renders it to the student.

#### F-13 — Apply CTA is live on challenges that cannot accept applications
- **Severity:** P1
- **Category:** BUSINESS_LOGIC / UX
- **Persona:** Student
- **Route:** `/challenges`, `/challenges/[id]`
- **Current behavior:** The marketplace lists both `PUBLISHED` and `APPLICATIONS_OPEN` with no deadline filter, but `createApplication` accepts only `APPLICATIONS_OPEN` before the deadline. A student can see an enabled "Apply to this challenge" beside the word "Closed", complete four wizard steps, and only then get *"Current challenge status: PUBLISHED"* or a raw ISO deadline.
- **Why this feels wrong:** Wasted effort, and the failure message exposes internal enum and timestamp formats.
- **Expected behavior:** Disable the CTA with a stated reason when the challenge cannot accept applications.
- **How to reproduce:** Open a `PUBLISHED`-but-not-open challenge and apply.
- **Relevant files:** `src/db/queries/challenges.ts:55`, `src/services/application.service.ts:468`, `src/app/challenges/[id]/apply/actions.ts:89`
- **Regression tests needed:** The CTA state matches server acceptance for every status/deadline combination.

#### F-14 — Challenge rejection is one click, unconfirmed, reason-optional and irreversible
- **Severity:** P1
- **Category:** BUSINESS_LOGIC / UX
- **Persona:** Internal unit reviewer, partner
- **Route:** `/review/[slug]`
- **Current behavior:** Reject is a bare submit button beside Approve — no confirmation — with optional comments. It maps to `CANCELLED`, which is in neither the editable nor the submittable status set, so the partner cannot revise or resubmit. The rejection reason, if given, is buried in "Review history" at the page bottom rather than the prominent reason box (which fires only for `REVISION_REQUESTED`).
- **Why this feels wrong:** A partner's work can be permanently killed by a misclick, with no explanation and no recourse.
- **Expected behavior:** Confirmation step, mandatory reason on reject, and a path to revise or repost.
- **How to reproduce:** Sign in as `CAID_ADMIN_DEMO` → `/review/<slug>` → click Reject.
- **Relevant files:** `src/app/review/[slug]/page.tsx:164`, `src/services/challenge-write.service.ts:600`
- **Regression tests needed:** Reject requires a reason and a confirmation; the partner sees the reason prominently and has a next action.

#### F-15 — Three partner surfaces collect work that can never be saved or completed
- **Severity:** P1
- **Category:** PRODUCT_FLOW / UX
- **Persona:** Partner contact
- **Route:** `/partner/post`, sourcing deck, `/partner/projects/[id]/close`
- **Current behavior:** (a) A validation error on the post form redirects to `?error=…` and the shell remounts at step 1 — the partner lands on the upload screen with an error banner, no form, and every field lost. (b) The sourcing deck keeps verdicts in `useState` and renders a "Send N invitations" button; on-screen copy admits "Nothing is saved — this demo keeps decisions in memory only." (c) Close-out's submit is permanently `disabled`, its `ready` flag computed and unused, and its success pane unreachable.
- **Why this feels wrong:** The first and last steps of the partner journey both terminate in lost work, and demo-grade copy is visible to external users.
- **Expected behavior:** Preserve input across validation errors; hide or finish the unimplemented surfaces rather than shipping their disabled shells.
- **How to reproduce:** Submit the post form with an invalid field.
- **Relevant files:** `src/app/partner/post/actions.ts:102`, `src/components/partner/deck-review.tsx:247`, `src/components/partner/close-out-form.tsx:180`
- **Regression tests needed:** A validation error re-renders the form with values intact.

#### F-16 — Internal seed language and unbuilt features are visible in the product
- **Severity:** P1
- **Category:** DATA-SEED / UX
- **Persona:** All — especially stakeholders watching the demo
- **Route:** `/partner`, `/challenges`
- **Current behavior:** All 7 seeded organizations carry internal descriptions — verified in the database: "DEMO partner from static fixture org-bencang…", "Synthetic local-development bootstrap record for the VinUni CAID internal unit." These render on the partner's own organization card. Separately, the filter rail ships a visible **"Not yet wired"** section with a "Coming soon" chip over two disabled controls, one of which ("Only show challenges I'm eligible for") is the filter students most want. The results header also hardcodes "Summer 2026 · Week 31".
- **Why this feels wrong:** It reads as an unfinished internal build rather than a product.
- **Expected behavior:** Realistic organization descriptions; remove unbuilt controls rather than displaying them disabled.
- **How to reproduce:** Sign in as `BENCANG_CONTACT_DEMO` → `/partner` → "Your organisation" card.
- **Relevant files:** `src/db/seed/organizations.ts`, `src/components/marketplace/filter-rail.tsx:80`, `src/components/marketplace/results-header.tsx:36`
- **Regression tests needed:** No user-visible string contains "DEMO", "fixture", "Synthetic" or "Not yet wired".

#### F-17 — A finished project becomes unreachable to the students who did it
- **Severity:** P1
- **Category:** NAVIGATION / PRODUCT_FLOW
- **Persona:** Student
- **Route:** `/workspace`
- **Current behavior:** The "Closed" bucket — which includes `COMPLETED` — renders each row as a dashed chip linking to `/challenges/{slug}`, the public marketing page. The read-only archived workspace view exists and is simply never linked.
- **Why this feels wrong:** The workspace is the student's record of real work: deliverables, milestones, reviews, teammates. After completion it vanishes from their account.
- **Expected behavior:** Closed rows with a project link to the archived workspace.
- **How to reproduce:** Sign in as a member of the seeded completed project → `/workspace` → only a chip to the challenge page.
- **Relevant files:** `src/app/workspace/page.tsx:139–156`, `src/lib/pipeline.ts:221`
- **Regression tests needed:** A completed project remains reachable and renders read-only.

#### F-18 — Pending offers and invitations have no notification of any kind
- **Severity:** P1
- **Category:** PRODUCT_FLOW / NAVIGATION
- **Persona:** Student, faculty
- **Route:** `/workspace`, `/applications`
- **Current behavior:** There is no notification system anywhere in the application. A time-boxed offer with a countdown is discoverable only by signing in and clicking "Your work", where it appears as one row in a generic table — while *team invitations* get a dedicated block. `/applications` never lists invitations awaiting your decision. The nav has no badge or count.
- **Why this feels wrong:** The most time-critical decisions in the product are the least visible. An offer can lapse purely because the student did not happen to log in.
- **Expected behavior:** An "Offer waiting on you" panel mirroring the invitations block, a nav count, and email.
- **How to reproduce:** Sign in as the leader of the seeded pending offer; nothing announces it.
- **Relevant files:** `src/app/workspace/page.tsx:126`, `src/components/layout/nav-links.tsx:47`
- **Regression tests needed:** A pending offer surfaces on the hub and in the nav count.

### P2 / P3 — Medium and low, in compact form

| ID | Finding | Sev | Category | Location |
|---|---|---|---|---|
| F-19 | Declined/withdrawn offers still render a green "Selected" chip and "You've been selected" above the refusal panel | P2 | UX | `offer/[id]/page.tsx:71` |
| F-20 | Offer page omits the team roster, the supervisor, the end date, and any statement that acceptance is final | P2 | UX | `offer/[id]/page.tsx:96` |
| F-21 | Team invitations can be declined in one click with no confirmation and no undo — unlike offers, which are guarded | P2 | UX / BUSINESS_LOGIC | `invitation-decision.tsx:61` |
| F-22 | Expired offers stay `PENDING` in the database forever; expiry is derived only, so partner-side PENDING counts include dead offers | P2 | BUSINESS_LOGIC | `offer.service.ts:218` |
| F-23 | A team invitation can be accepted after the challenge's application deadline — the "Reply by" chip is not enforced server-side | P2 | BUSINESS_LOGIC | `mutations/invitations.ts` |
| F-24 | "Save draft" is a plain link back to the challenge; a footnote below admits nothing is saved | P2 | UX / BUG | `apply-wizard.tsx:264` |
| F-25 | Application success screen has no link to the application it just created | P2 | NAVIGATION | `apply-wizard.tsx:160` |
| F-26 | Duplicate-application error leaks a raw user id and publicId into user-facing copy | P2 | UX | `application.service.ts:500` |
| F-27 | Ineligible students are warned but not blocked; every eligibility rule renders a check icon including failed ones | P2 | UX / BUSINESS_LOGIC | `eligibility-section.tsx:31` |
| F-28 | Profile "+ Add" beside Skills links to an editor with no skills UI — yet skills drive the match signal shown to students | P2 | UX / BUG | `profile/page.tsx:170` |
| F-29 | "Unlocks as you progress" blocks never unlock — the helper takes no viewer argument | P2 | PRODUCT_FLOW | `disclosure.ts:53` |
| F-30 | Raw enum labels shown to external users across 20 files, while a complete label map exists and is used by 5 | P2 | CONSISTENCY | `lib/labels.ts` |
| F-31 | Three sibling student routes handle "not a student" three different ways (explain / 404 / misleading empty state) | P2 | CONSISTENCY | profile · applications · workspace |
| F-32 | Global 404 says "We couldn't find that challenge" — it serves 44 non-challenge `notFound()` calls including all 13 admin pages | P2 | ERROR_HANDLING | `app/not-found.tsx:6` |
| F-33 | Two partner routes have no page-level capability check and call a service that throws — a 404-vs-500 race | P2 | AUTHORIZATION | `partner/projects/[id]` |
| F-34 | `/faculty/[id]` denies an authenticated non-faculty user by redirecting to sign-in, unlike every sibling | P2 | AUTHORIZATION | `faculty/[id]/page.tsx:38` |
| F-35 | `AMBIGUOUS_MEMBERSHIP` renders a friendly page on two partner routes and 500s on three others | P2 | ERROR_HANDLING | `partner/students/page.tsx:35` |
| F-36 | Signing in while already signed in shows the sign-in form plus your own authenticated header | P2 | NAVIGATION | `sign-in/page.tsx` |
| F-37 | Server actions call `BigInt()` on unvalidated form input — a non-numeric value throws and 500s | P2 | ERROR_HANDLING | `faculty/actions.ts:37` |
| F-38 | Double-clicking Submit on an assessment throws an unhandled rejection and strands the student in fullscreen | P2 | BUG | `lockdown-chrome.tsx:249` |
| F-39 | Autosave indicator reports "saved" before the write, and on every keystroke in the technical runner with no write at all | P2 | UX / BUG | `cognitive-runner.tsx:119` |
| F-40 | Non-MCQ, non-coding question types render an empty fieldset with no way to answer | P2 | BUG | `take/page.tsx:75` |
| F-41 | A `TEAM`-scope assessment 500s the preflight for every student — the scope is a legal enum value | P2 | ERROR_HANDLING | `assessment.service.ts:528` |
| F-42 | "Start assessment" 404s when the challenge has no active assessment — the CTA is shown regardless | P2 | PRODUCT_FLOW | `lib/pipeline.ts:211` |
| F-43 | Assessment instructions and AI policy are loaded and never rendered; no threshold or attempt count is stated | P2 | UX | `assessment/[id]/page.tsx:678` |
| F-44 | Workspace deliverable submission is hardcoded `enabled = false`; the dialog beneath would claim success while uploading nothing | P2 | PRODUCT_FLOW | `submit-deliverable.tsx:35` |
| F-45 | Workspace resource and milestone lists have no empty branch — zero items renders a heading over nothing | P2 | EMPTY_STATE | `resource-list.tsx:54` |
| F-46 | Resource "Open" button has no onClick and no href — clicking does nothing | P2 | BUG | `resource-list.tsx:115` |
| F-47 | Meeting join URL is rendered as plain text; the only button is "Back to workspace" | P2 | UX | `meeting/[id]/page.tsx:79` |
| F-48 | The hub agenda's "Invitation expires" item links to the marketing page rather than the offer decision | P2 | NAVIGATION | `workspace-hub.service.ts:143` |
| F-49 | Faculty "Feedback due" rows can never be actioned but still inflate the queue count | P2 | PRODUCT_FLOW | `faculty-queue.tsx:533` |
| F-50 | Faculty with no capacity configured renders "0 of 0 slots" with an empty bar, reading as at-capacity | P2 | EMPTY_STATE | `faculty.service.ts:240` |
| F-51 | Partner close-out addresses the team by the challenge's title | P2 | BUG | `close/page.tsx:76` |
| F-52 | Two different destinations for the same project; only one has the sign-off control | P2 | NAVIGATION | `partner/page.tsx:233` |
| F-53 | A rejected challenge is a dead end — reason buried at page bottom, no resubmit path | P2 | PRODUCT_FLOW | `partner/challenges/[id]:324` |
| F-54 | Reviewer cannot see or contact the person who posted the challenge they are judging | P2 | UX | `review/[slug]/page.tsx:72` |
| F-55 | "A CAID officer reviews every posting" is hardcoded although the managing unit is user-selectable | P2 | CONSISTENCY | `partner/post/page.tsx:72` |
| F-56 | Assessment terms ("proctored and lockdown · 7-day window") are hardcoded for every challenge regardless of data | P2 | CONSISTENCY | `assessment-section.tsx:21` |
| F-57 | Empty marketplace always says "No challenges match these filters" even with no filters applied | P2 | EMPTY_STATE | `challenges/page.tsx:61` |
| F-58 | All nav links vanish below 640px with no menu replacement | P2 | NAVIGATION / A11Y | `nav-links.tsx:126` |
| F-59 | "CAID" appears in student-facing copy without ever being expanded | P3 | UX | `lib/disclosure.ts:39` |
| F-60 | Results header promises a per-card suitability ring that is never rendered — no caller passes the prop | P3 | CONSISTENCY | `results-header.tsx:46` |
| F-61 | "1 open challenges" — unpluralised count; "N milestone(s)" programmer-style pluralisation | P3 | UX | `results-header` · `partner/page` |
| F-62 | Missing duration renders as "— wks" in the faculty queue | P3 | UX | `faculty-queue.tsx` |
| F-63 | Offer start date printed unformatted ("2026-10-01") while every other date on the page is formatted | P3 | CONSISTENCY | `applications/[publicId]:169` |
| F-64 | "Invitations expire after seven days" — no expiry logic exists | P3 | UX | `application-roster.tsx:73` |
| F-65 | Challenge error page exposes "could not load from the database"; its reset link points at the page that just failed | P3 | ERROR_HANDLING | `challenges/error.tsx:14` |
| F-66 | Workspace status chip is hardcoded green for all five project statuses — a paused project reads as healthy | P3 | UX | `workspace/[id]/page.tsx:91` |
| F-67 | `/workspace` has no capability check — non-students get a student-framed empty page (no data leak) | P3 | AUTHORIZATION | `workspace/page.tsx:34` |
| F-68 | Several queries load every project in the system and filter in JS, on force-dynamic routes | P3 | PERFORMANCE | `queries/projects.ts:102` |

### Concurrency and missing constraints

A distinct class: the read-then-write pairs that are correct single-threaded and wrong under a double-click or two tabs. Notably, the schema has no unique index backstopping any of them.

| ID | Finding | Sev | Consequence | Location |
|---|---|---|---|---|
| C-01 | Assessment responses have no unique index on `(attempt_id, question_id)`; the save path reads then inserts | P1 | **Poisons the attempt permanently** — once two rows exist, the duplicate check throws CONFLICT on every subsequent submit and the student can never submit | `assessment.service.ts:492` |
| C-02 | Duplicate-application check is a plain `SELECT` with no `.for("update")`, and the `(challengeId, studentId)` index is non-unique | P1 | A double-click or two tabs creates two applications for the same student on the same challenge | `db/mutations/applications.ts:297` |
| C-03 | Milestone dual sign-off reads the quorum, then writes keyed on id only; no unique on `(milestoneId, reviewerId, role)` | P1 | Concurrent faculty + partner approvals stack decisions and mis-compute the quorum | `milestone-review.service.ts:137` |
| C-04 | Supervision capacity check is unlocked — and its own doc comment claims otherwise | P2 | Two concurrent accepts both pass the cap | `supervision.service.ts:59` |
| C-05 | NDA acceptance checks and inserts outside a transaction with no unique constraint | P2 | Double-submit writes duplicate NDA rows | `offer.service.ts:298` |
| C-06 | `replaceChallengeFacultyAssignments` deletes all rows including `ACCEPTED`, then re-inserts as `PENDING` | P2 | Re-routing silently destroys a faculty member's prior acceptance | `db/mutations/challenges.ts:429` |

> **Worth stating clearly:** all 16 `"use server"` files re-resolve the actor from the session and re-check authorization server-side. There is no bypassable-POST class of defect here — the apply path in particular validates both status and deadline. The concurrency gaps above are the real remaining integrity risk, and each is closable with a unique index.

### Demo data readiness

What each seeded persona would actually show on screen. Verified with read-only SQL against the development database.

| Persona | What they'd show | Verdict |
|---|---|---|
| `JORDAN_STUDENT_DEMO` | Leads 7 of 8 applications across every status; 1 pending offer expiring in 2 days; member of 3 projects incl. one completed; 1 below-threshold assessment | **Excellent** — the hero account. Nearly every edge state lives here. |
| `BENCANG_CONTACT_DEMO` | 3 open challenges, 4 applications, 2 active projects, milestones awaiting sign-off | **Best partner persona** — but sees only 1 challenge on `/challenges` |
| `FACULTY_PHAM_DEMO` | 4 challenge assignments, 1 supervision request, 2 supervised projects, populated action queue | Good queue, but all 14 faculty assignments platform-wide are PENDING and none ACCEPTED — so "my challenges" is empty while he demonstrably supervises two projects |
| `BAO_STUDENT_DEMO` | 1 application, 1 accepted offer, 1 active project | Thin — and his project has 0 meetings while every other project has 3–4, so the Meetings tab is empty |
| `HOANG_STUDENT_DEMO` | Member (never leader) on 3 applications | Cannot respond to any offer — only leaders can. Fine as a teammate view, useless as a decision demo |
| `PRIYA_STUDENT_DEMO` | Member on 3 applications, 1 project | No offer, no assessment, no leadership — nothing to demonstrate |
| `CAID_ADMIN_DEMO` | Manages 10 challenges; 2 in the review queue | Only 1 of the 2 is actually actionable, and `challenge_reviews` has 0 rows — no review history to show |
| `ELAB_ADMIN_DEMO` | 1 managed challenge (the "SYNTHETIC DEMO" one), 0 applications, 0 review items, 0 projects | **Completely empty.** Either seed it or cut it from the demo script. |

| ID | Seed data finding | Sev | Evidence |
|---|---|---|---|
| D-01 | 3 of 8 open challenges are eligible to *nobody* — two require school CHS (no seeded student is CHS) and one requires CAS + year 4 (the only CAS student is year 2). Every student sees "Not eligible" on three cards. | P1 | eligibility rules vs `student_profiles` |
| D-02 | The seed violates its own eligibility rules — application 7 exists on a challenge its team is not eligible for. | P1 | applications vs rules |
| D-03 | 6 of 7 students have a NULL GPA, so any MIN_GPA rule resolves to UNKNOWN and renders a warning banner instead of a clean verdict; profile pages show a blank GPA. | P1 | `student_profiles.gpa` |
| D-04 | Four feature tables are empty: `match_results`, `notifications`, `assessment_responses`, `challenge_reviews` (0 rows each, verified). | P1 | SQL count |
| D-05 | No application is SHORTLISTED or in ASSESSMENT, so two of seven partner pipeline columns are always empty. | P1 | application statuses |
| D-06 | Assessment score comments cite internal phase numbers — "This supports the Phase 3.6 assessment-driven rejection transition." Visible to faculty and partners. | P1 | `assessment_scores.comments` |
| D-07 | Both assessments are titled "DEMO assessment for…". | P1 | `assessments.title` |
| D-08 | Missing edge states worth showing: no expired offer, no declined offer, no cancelled or completed challenge, no close-out feedback. All are code-supported and would demonstrate the guards working. | P2 | offers · feedback |
| D-09 | No assessment attempt is seeded as NOT_STARTED or IN_PROGRESS — so the one assessment flow that *is* fully implemented cannot be demoed from a seeded starting point. | P2 | `assessment_attempts` |
| D-10 | A junk user is in the directory and will appear in the admin list and teammate picker: `haaland@gmail.com` / "Erling Haaland". | P2 | `users.id 29` |
| D-11 | Only 8 applications exist and one student leads 7 of them; one open challenge has none. Partner queues average roughly one application each. | P2 | applications |
| D-12 | A challenge never closes — there is no transition out of APPLICATIONS_OPEN, so a challenge whose project completed in July 2026 is still open for applications, and two carry deadlines in October 2027. | P1 | `challenge-write.service.ts:394` |

---

## 4. Product-flow problems

Behaviors that are technically valid — no exception thrown, code doing exactly what it says — but wrong as product decisions. These are the findings most likely to be dismissed in code review and most likely to be noticed by a stakeholder.

**The landing page is wrong for four of six personas.**
`redirect("/challenges")` is correct behavior and the wrong product decision. Faculty, partners, reviewers and admins each have a purpose-built home they must self-navigate to. Nothing is broken; the product simply doesn't know who just arrived.

**The first-run experience has no onboarding at all.**
There is no welcome, no account-type explanation, no profile-completion prompt, and no path from a role-less account to a student one. The product assumes every user arrives already provisioned. Because registration is publicly available, that assumption is wrong for every self-service signup.

**Copy makes promises the system does not keep.**
Four separate places state that something happened when nothing was written: the supervisor was "notified", the team "has been told", "Send N invitations", "your supervisor and the partner have both been notified". Each is individually small; together they establish that the product's confirmations cannot be trusted.

**Disabled controls are shipped instead of removed.**
"Not yet wired", "Coming soon", a permanently disabled close-out button, a hardcoded `enabled = false`, a "Write feedback" button that never enables. Each advertises a capability and withholds it — worse for confidence than not showing it.

**Denial is expressed three different ways for the same condition.**
Not being a student produces an explanation on `/profile`, a challenge-themed 404 on `/applications`, and a welcoming-but-false empty state on `/workspace` ("You haven't applied to anything yet" — they cannot apply). A user probing the product learns three contradictory things about their own account.

**The most urgent decisions are the least visible.**
A team invitation gets a dedicated panel. An expiring offer — the highest-stakes, time-boxed decision in the product — gets one row in a generic table, no badge, no notification, and an agenda entry that links to the wrong page.

---

## 5. Route and access matrix

Behavior verified by reading each route's guard. "Cap-less" is an authenticated user with no capabilities — the default state of every self-registered account. **Bold** marks a confirmed defect.

| Route | Anon | Cap-less | Student | Faculty | Partner | Unit | Owner | Note |
|---|---|---|---|---|---|---|---|---|
| `/` | → /challenges for everyone | | | | | | | Should route by capability |
| `/sign-in` | render | **renders form + signed-in header** | | | | | | No redirect when authed |
| `/challenges` | render | **1 of 8** | render | render | render | render | render | Cap-less misclassified |
| `/challenges/[id]` | render | render | render | render | render | render | render | correct |
| `/challenges/[id]/apply` | sign-in | 404 | render | 404 | 404 | 404 | 404 | enforced server-side |
| `/applications` | sign-in | 404 | scoped | 404 | 404 | 404 | 404 | correct |
| `/applications/[id]` | sign-in | 404 | member | 404 | org | org | 404 | **500 on bad uuid** |
| `/assessment/[id]` (+take, result) | sign-in | 404 | member | 404 | 404 | 404 | 404 | **500 on bad uuid — confirmed** |
| `/offer/[id]` | sign-in | **500** | member | **500** | **500** | **500** | **500** | **no try/catch — confirmed** |
| `/invitations/[id]` | sign-in | 404 | seat | 404 | 404 | 404 | 404 | **500 on bad uuid** |
| `/workspace` | sign-in | **empty** | scoped | **empty** | **empty** | **empty** | **empty** | No capability check |
| `/workspace/[id]` | sign-in | 404 | render | **500\*** | org | org | 404 | **\*locked branch throws** |
| `/meeting/[id]` | sign-in | 404 | project | project | project | project | 404 | auth correct |
| `/profile` | sign-in | "unavailable" | render | "unavailable" | "unavailable" | "unavailable" | "unavailable" | Copy assumes another role |
| `/faculty` | sign-in | 404 | 404 | render | 404 | 404 | 404 | correct |
| `/faculty/[id]` | sign-in | **→sign-in** | **→sign-in** | request | **→sign-in** | **→sign-in** | **→sign-in** | Wrong denial primitive |
| `/partner`, `/post`, `/students` | sign-in | 404 | 404 | 404 | scoped | 404 | 404 | **students 500s on ambiguous** |
| `/partner/projects/[id]` (+close) | sign-in | **500/404** | **500/404** | **500/404** | owned | **500/404** | **500/404** | **No page-level check** |
| `/partner/challenges/[id]/teams/[id]` | sign-in | 404 | 404 | 404 | owned | 404 | 404 | safe by luck, not by check |
| `/review/*` | sign-in | 404 | 404 | 404 | 404 | scoped | 404 | all re-check |
| `/admin/*` (13 pages) | sign-in | 404 | 404 | 404 | 404 | 404 | render | **exemplary** — layout + per-page |

> **Two structural gaps sit behind most of the defects above.** There is no `src/app/error.tsx`, so any uncaught throw becomes a raw crash page; and no route validates a UUID parameter before querying a Postgres `uuid` column, so a malformed URL raises `22P02` from the driver. The correct pattern already exists in the admin console (`admin/users/[userId]/page.tsx:45`) and needs porting outward.

---

## 6. Lifecycle and state-transition review

For each entity: the states that exist, the transitions the application can actually perform, and the gaps. "Seed-only" means the transition exists in the data model and in the seed script but no running code can perform it.

| Entity | States reachable | Transitions the app can perform | Seed-only / missing | Guard quality |
|---|---|---|---|---|
| **Challenge** | 6 of 19 | DRAFT → SUBMITTED → APPROVED → APPLICATIONS_OPEN; → REVISION_REQUESTED; → CANCELLED (as "reject") | 13 unreachable, including `PUBLISHED` and `UNDER_REVIEW` — both of which other code branches on, so those branches are dead. No transition *out of* APPLICATIONS_OPEN: a challenge never closes. No transition out of CANCELLED: a rejected challenge can't be revised. | Best-built machine in the codebase — transactional compare-and-swap throughout |
| **Application** | **1 of 7** | Insert as SUBMITTED. Member INVITED → ACCEPTED/DECLINED. | All six other states seed-only. `updateApplicationStatus` is correctly written and never called. No shortlist, no reject, and no student withdrawal. | Insert is transactional with four pre-validators |
| **Assessment** | attempts 2 of 4 · assessment **0 of 5** | NOT_STARTED → IN_PROGRESS → SUBMITTED | SUBMITTED → REVIEWED is not even expressible — the mutation's type excludes it. Nothing writes `assessment_scores`; no grading route or persona exists; no passing-threshold field in the schema. All 5 `assessments.status` values are unreachable. | CAS plus explicit pre-assert — genuinely correct |
| **Offer / selection** | 2 of 4 | PENDING → ACCEPTED / DECLINED | Nothing creates an offer or a selection. CANCELLED unreachable. Nothing writes expiry — a lapsed offer stays PENDING forever and is only *derived* as expired, so any PENDING count includes dead offers. Accepting does not set the application to SELECTED. | The single best-guarded write in the app — CAS on status *and* respond-by |
| **Project** | **0 of 5** · milestones 2 of 5 | Milestone approve / request-revision; partner sign-off | Nothing creates a project or its members. Every project status is seed-only. Deliverable submission hardcoded off; close-out button permanently disabled. | Milestone writes assert-then-write with no CAS (see C-03) |

> The pattern is consistent and worth stating plainly: **the transitions that exist are implemented well** — transactional, status-checked, race-safe, in several cases better than typical. The problem is not quality of implementation but coverage. The four transitions that carry the product's value proposition were never built.

---

## 7. UX quick wins

Low effort, high impact, no architectural change. Roughly in value order.

| Win | Effort | Impact |
|---|---|---|
| Add `src/app/error.tsx` — converts every confirmed 500 into a controlled page | ~30 min | Removes the worst demo accident |
| Rewrite `not-found.tsx` to be role- and context-neutral | ~15 min | Fixes 44 misleading denials at once |
| Rewrite the 7 seeded organization descriptions | ~20 min | Removes "DEMO … fixture" from the partner's own page |
| Delete the "Not yet wired" filter block | ~10 min | Removes the most visible unfinished-build signal |
| Wire `src/lib/labels.ts` into the 20 files using `replaceAll("_"," ")` | ~1–2 h | Removes shouting enums for external users |
| Redirect by capability after sign-in | ~30 min | Four personas land somewhere useful |
| Validate UUID params (port the admin regex pattern outward) | ~1 h | Closes the whole 500-on-bad-URL class |
| Catch `FORBIDDEN` → `notFound()` on `/offer/[id]` | ~10 min | Fixes a confirmed live 500 |
| Fix the pluralisation ("1 open challenges") and "— wks" | ~15 min | Cheap credibility |
| Link closed workspace rows to the archived workspace | ~20 min | Students keep their record of work |
| Branch the offer header on status so declined offers stop saying "You've been selected" | ~20 min | Removes a jarring contradiction |
| Add empty branches to the workspace resource and milestone lists | ~20 min | Sections stop looking broken |
| Redirect `/sign-in` to the capability home when already authenticated | ~10 min | Removes a confusing dual state |
| Give the role-less user a real first-run page naming one recovery action | ~2 h | Fixes the first impression for every signup |

---

## 8. Remediation backlog

### Must fix before the stakeholder demo

| # | Issue | Sev | User impact | Effort |
|---|---|---|---|---|
| 1 | Fix marketplace visibility so the public front door is populated (F-06) | P0 | First impression stops being a one-item marketplace | S |
| 2 | Retitle the "SYNTHETIC DEMO" challenge and rewrite the 7 org descriptions, 2 assessment titles and the score comments (F-06b, F-16, D-06, D-07) | P0 | Product stops reading as an internal build | S |
| 3 | Decide and enforce the demo's narrative boundary (implement selection→offer→project, or scope the demo and pre-seed the states you will show) | P0 | Determines whether the demo has an ending | L / XL |
| 4 | Root `error.tsx` + UUID validation + `/offer` try/catch (F-05) | P1 | No crash pages in front of stakeholders | S |
| 5 | Remove or fulfil the supervisor-notification claim (F-01) | P0 | Stops the product asserting a falsehood | S–M |
| 6 | Fix demo data: eligibility deadlock, NULL GPAs, empty E-Lab persona, junk user, spread application leadership (D-01…D-11) | P1 | Every persona has something to show | M |
| 7 | Capability-based sign-in redirect (F-11) | P1 | Every persona lands somewhere that makes sense | S |
| 8 | Confirmation + mandatory reason on challenge rejection (F-14) | P1 | A misclick stops being unrecoverable | S |
| 9 | Correct the assessment duration mismatch (F-08) | P1 | Students get the time they were promised | S |

### Should fix soon

| # | Issue | Sev | User impact | Effort |
|---|---|---|---|---|
| 10 | Unique indexes for assessment responses, applications and milestone reviews (C-01…C-03) | P1 | Closes the data-integrity races, incl. the unrecoverable poisoned attempt | S |
| 11 | Assessment grading surface, or explicit removal of the stage (F-04) | P0 | Assessments become meaningful | L |
| 12 | Wire `updateApplicationStatus` into real flows, incl. student withdrawal (F-06c) | P0 | Applications stop being frozen at SUBMITTED | M |
| 13 | Close challenges at their deadline (D-12) | P1 | No applying to challenges whose project already finished | S |
| 14 | Pass/fail fails open; add a real threshold to the schema (F-07) | P1 | Results can be trusted | M |
| 15 | Blank-answer and zero-question/null-timer assessment faults (F-09, F-10) | P1 | Attempts stop being destroyed | M |
| 16 | Faculty decline reason persisted (F-12) | P1 | Teams learn why | S |
| 17 | Apply CTA reflects real acceptance state (F-13) | P1 | No wasted applications | M |
| 18 | Preserve partner post-form input across validation errors (F-15) | P1 | Partners stop losing work | M |
| 19 | Label maps wired app-wide (F-30) | P2 | Consistent human-readable status | M |
| 20 | Unify the "not a student" denial across the three routes (F-31) | P2 | Coherent account model | S |
| 21 | Page-level capability checks on the two partner project routes (F-33) | P2 | Defense in depth restored | S |
| 22 | Offer discoverability panel + nav count (F-18) | P1 | Offers stop lapsing unseen | M |
| 23 | Closed projects reachable (F-17) | P1 | Students keep their work record | S |
| 24 | Confirm dialog on invitation decline (F-21) | P2 | No accidental irreversible decline | S |

### Future polish

Mobile navigation (F-58); the never-rendered suitability ring (F-60); progressive-disclosure unlocking (F-29); profile skills editing (F-28); workspace empty states and the dead "Open" button (F-45, F-46); meeting join link (F-47); the `listProjectCores` load-everything queries (F-68); and the remaining P3 copy and formatting items in Section 3.

---

## Proposed fix order, in small testable phases

Each phase is independently shippable and independently verifiable. Phases 1–4 are the demo-blocking set and touch no schema; phase 1 alone is roughly half a day and changes the first thing anyone sees. Phases 6 and 7 need migrations.

### Phase 1 — Fix the front door (half a day, no code risk)
Mark 4–5 challenges `PUBLIC_PREVIEW` and give `EXTERNAL_PARTNER` its own visibility set. Retitle the "SYNTHETIC DEMO" challenge; rewrite the 7 organization descriptions, both assessment titles and the score comments. Delete the junk user. Fix the eligibility deadlock and the NULL GPAs so students see clean verdicts.

**Verify:** open `/challenges` signed out and see a populated marketplace with no test-data language anywhere on the page.

### Phase 2 — Stop the crashes
Add `src/app/error.tsx`. Add a shared UUID-param guard and apply it to all seven parameterised route families. Wrap `getOfferDetail` and catch `FORBIDDEN` → `notFound()`. Add page-level capability checks to the two partner project routes.

**Verify:** every route in Section 5 returns 404 — never 5xx — for bad ids and wrong personas.

### Phase 3 — Stop the false statements
Remove the supervisor step and its "has been notified" copy, or persist the nomination. Same decision for the faculty decline reason. Remove the "Not yet wired" block, the sourcing deck's in-memory invitations, and the disabled close-out and deliverable shells.

**Verify:** no user-visible string claims an action the code does not perform.

### Phase 4 — Fix first contact
Give the role-less actor its own marketplace audience and a first-run page naming one recovery action. Redirect by capability after sign-in, and redirect `/sign-in` when already authenticated. Rewrite `not-found.tsx`. Unify the three "not a student" denials.

**Verify:** register a fresh account and reach a page that explains what to do — and each seeded persona lands on its own home.

### Phase 5 — Make the language consistent
Wire `labels.ts` into the 20 files that hand-roll enum formatting. Fix pluralisation, "— wks", the unformatted offer start date, and the always-green project chip. Branch the offer header on status.

**Verify:** no screen shows a raw enum to a non-admin user.

### Phase 6 — Harden integrity, then close the assessment loop
First the cheap structural fix: unique indexes on `(attempt_id, question_id)`, on the application's `(challenge, student)` pair, and on `(milestone, reviewer, role)` — one migration that closes three races including the unrecoverable poisoned attempt. Then reconcile the preflight/runner duration, fix blank-answer submission, zero-question and null-timer handling, and the double-submit. Default pass/fail closed and add a real threshold column. Finally build the grading surface — or remove the stage from the demo path deliberately.

**Verify:** an attempt can be taken, submitted, graded, and shows a result derived from the stored score; concurrent double-submits produce one row, not a poisoned attempt.

### Phase 7 — Build selection → offer → project
The largest phase and the one that makes the product whole. A partner selection action creating a selection plus a PENDING offer; acceptance creating the project and its members in one transaction; an expiry job so lapsed offers stop counting as pending. Then offer discoverability and reachable closed projects.

**Verify:** one account can carry a challenge from posting through to a closed project without any seed data.

### Phase 8 — Polish
Mobile navigation, the suitability ring (render it or remove the copy), progressive-disclosure unlocking, profile skills editing, workspace empty states, the meeting join link, and the load-everything queries.

**Verify:** a full persona-matrix pass with no P2 findings outstanding.

---

## Review method

Static trace of all 57 routes, services, mutations and schema; live browser walkthrough of six personas against the seeded development database; read-only SQL to confirm counts and data quality. All P0 findings were independently re-verified by grep before being recorded. No application code was modified during this review; one test account created during the walkthrough was removed and the database returned to its seeded baseline.
