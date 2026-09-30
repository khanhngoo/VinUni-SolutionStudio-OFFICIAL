# Browser product-quality audit — 27 September 2026

## Executive summary

This is an **audit, not an implementation**. Playwright MCP exercised the running local app at `http://127.0.0.1:3000` against the existing development database. The app and PostgreSQL containers were already running. I did not reset the database or alter application code, schema, migrations, or seed files. One temporary self-service account was created through the normal registration form: `browser-audit-20260927-0538@example.test`. No application, offer, approval, or project write was submitted.

Overall: the seeded, role-specific views are substantially more coherent than the new-user journey. Marketplace disclosure behaved correctly for anonymous, VinUni student, and external-partner personas; unrelated assessment and CAID review routes returned 404. The strongest surfaces are the student application/work hub, partner-owned challenge/project overview, and CAID/E-Lab review isolation. The principal demo risks are that a newly registered user cannot become a student or apply, the canonical route-optimisation pending offer is already lapsed, and the partner's visible **Students** tab returns 404 by default. No authorization bypass was observed. This is **not ready for an unassisted stakeholder demonstration** of the full signup-to-project journey. A scripted seeded-persona demonstration can show many read states, but cannot honestly show a live offer decision with this database state.

Five issues to resolve before that demonstration: F1 new-user dead end; F2 lapsed route offer and incoherent dates; F3 partner Students 404; F4 expired faculty invitation presented as actionable; F5 misleading marketplace “open” count. Date-based findings describe this database on 27 September 2026. The seed clock shifts records at reset time, so a later reset may change the exact dates; it will not eliminate the underlying aging risk for a long-lived demo database.

## Browser-tested persona journeys

| Persona | Journey tested and result | Major observations / dead ends | Recommended behavior |
| --- | --- | --- | --- |
| Anonymous | `/challenges` → route-optimisation detail → sign-in CTA; direct `/applications` redirected to `/sign-in`. Search with `zzzx-no-such-challenge` showed a usable clear-filter empty state. | Only the public preview challenge appeared; no VinUni-only challenge was exposed. Detail asks the visitor to sign in to apply, but registration yields a non-student account. | Keep current disclosure; explain that an eligible student account is needed before the CTA leads to registration. |
| Brand-new account | Signed out → `/sign-in` → completed Create account → `/challenges` → route detail → `/profile` → direct `/challenges/route-optimisation/apply`. | Automatic sign-in worked. Landing page showed one challenge and no onboarding/profile navigation. Detail said applications require student accounts; profile said “Profile unavailable”; direct apply returned 404. The golden path stopped before eligibility. | Decide whether self-service registration is intended for students. If yes, provide a verified student-enrolment/onboarding path. If no, label account purpose and the route to obtaining a student identity. |
| Existing student (Jordan) | Development identity → marketplace, profile, applications, application detail, offer, inbox, assessment result, work hub, project detail. | Eight visible cards included a “Closed” campus-energy challenge. Route offer was selected but lapsed, preventing an offer response. Existing accepted projects and assessment result rendered. | Preserve the useful lifecycle views; refresh/align the canonical live demo record and make expired/closed states explicit. |
| Student lifecycle edge (Priya) | Development identity → inbox → route offer; direct unrelated assessment route. | Route offer showed the same lapsed state. An unrelated assessment returned 404. Offer inbox copy still said an offer was “ready.” | Keep resource isolation; make inbox actions state-aware. |
| Faculty (Pham) | Development identity → `/faculty` queue → pending supervision-request detail; direct `/partner`. | Queue and detail showed an invitation whose explicit deadline was 14 September 2026, yet “Respond by today” and live Accept/Decline controls appeared on 27 September. `/partner` returned 404. | Show “Overdue/expired” distinctly and align available actions with server-side transition rules. |
| Partner contact (Bến Cảng) | Development identity → ordinary marketplace → `/partner` → project list/detail → Students tab → explicit Students route query. | Ordinary marketplace showed only route-optimisation, as intended. Owned projects/signoff controls rendered. Default `/partner/students` and private merchant-churn query returned 404; `?challenge=route-optimisation` rendered the student deck. | Make the Students tab land on a challenge it can actually resolve, and decide how owner-private challenges may be used for sourcing without broadening ordinary marketplace disclosure. |
| CAID administrator | Development identity → `/review` → submitted Packaging waste audit detail; direct `/admin`. | Review queue and decisions rendered. `/admin` returned 404 in this checkout. Decisions were not submitted. | Treat a global owner console as separate future scope, not an existing feature. |
| E-Lab administrator | Development identity → `/review` empty state → direct CAID review detail. | Empty state rendered; cross-unit review detail returned 404. | Preserve unit isolation. |

### Golden-path transition ledger

| Start → action | Resulting URL / visible state | Primary action and assessment |
| --- | --- | --- |
| Anonymous `/challenges` → open route card | `/challenges/route-optimisation`; public brief, Bến Cảng/CAID, 11 Oct 2027 deadline | “Sign in to apply” is understandable until the user tries registration. |
| `/sign-in` → Create account | `/challenges`; one route card, Challenges and Sign out nav | Account creation succeeded but no first-use guidance or profile action appeared. |
| `/challenges` → route detail as new account | `/challenges/route-optimisation`; “Applications are available to student accounts” | No CTA to become eligible or learn how student status is granted. |
| New account → `/profile` | “Profile unavailable”; “signed in as something else” | Browse challenges loops back to the same dead end. |
| New account → direct apply URL | `/challenges/route-optimisation/apply` → HTTP 404 | No eligibility or application step can be reached by this persona. |
| Seeded Jordan → application/assessment/offer/workspace | Existing application, completed assessment result, selected route application, lapsed offer, active projects rendered | These are different seeded records, **not** a completed end-to-end write journey. No assessment submission, offer acceptance/rejection, or project creation was performed. |

## Detailed findings

### F1 — Successful registration ends before the student journey starts

**Evidence:** OBSERVED  
**Severity:** P1  
**Category:** PRODUCT_FLOW  
**Persona:** Brand-new self-service user  
**Route:** `/sign-in`, `/challenges`, `/challenges/route-optimisation`, `/profile`, `/challenges/route-optimisation/apply`

**Browser reproduction:**

1. Sign out, create a new email account through `/sign-in`.
2. Follow the automatic redirect to `/challenges` and open the only public challenge.
3. Look for profile/onboarding or an application CTA; try `/profile` and the direct apply URL.

**Observed behavior:** Registration signed the user in and landed on one challenge. Navigation had no Profile link. The challenge said only student accounts may apply; `/profile` said the account is “something else”; direct apply returned 404. The form does say registration creates a basic account without student/organization privileges, but the resulting experience gives no next step.

**Why this feels wrong:** The visitor is invited to sign in to apply, can create an account, and then reaches an unexplained dead end. The happy-path message and the actual entitlement path disagree.

**Expected behavior:** Either provide a legitimate student verification/onboarding path after registration, or clearly distinguish general account creation from student application access before and after signup, with an actionable route to the latter. Do not automatically grant student privileges merely because an email account exists.

**Implementation trace:** `signUpWithSelfService` signs in and redirects to `/`; root lands on the marketplace. Self-service creates a basic user, while `getAuthenticatedActor` grants `STUDENT` only for a student profile. The detail panel shows no action for a signed-in non-student; the apply route returns `notFound()` without that capability.

**Relevant files:** `src/app/sign-in/actions.ts`, `src/auth/self-service-authentication.ts`, `src/auth/authenticated-actor.ts`, `src/components/challenge/marketplace-apply-panel.tsx`, `src/app/challenges/[id]/apply/page.tsx`, `src/app/profile/page.tsx`.

**Recommended fix:** Make the intended identity-acquisition path a product decision, then give new users an explicit landing state and next action. Preserve server-side role enforcement.

**Regression verification:** Fresh browser context → register a new account → inspect first destination, nav, route detail and profile → follow the documented path to student eligibility → apply. Confirm an unverified account still cannot bypass it by direct URL.

### F2 — Canonical route challenge is open while its selected team's offer has lapsed

**Evidence:** OBSERVED  
**Severity:** P1  
**Category:** DATA-SEED  
**Persona:** Jordan and Priya students  
**Route:** `/challenges/route-optimisation`, `/applications/44444444-4444-4444-8444-000000000002`, `/offer/44444444-4444-4444-8444-000000000002`, `/workspace`

**Browser reproduction:**

1. Sign in as Jordan, open route-optimisation and its selected application.
2. Select “View offer”; repeat the offer view as Priya.
3. Compare challenge dates with issued offer terms and the work-hub state.

**Observed behavior:** The public challenge closes 11 Oct 2027 and starts 20 Oct 2027. The selected team's PENDING offer says respond by 12 Sept 2026, starts 30 Sept 2026, and “Invitation lapsed”; no response controls are available. The work hub calls this application “Expired.” The offer start precedes the challenge's advertised start by more than a year.

**Why this feels wrong:** The app's canonical open challenge cannot demonstrate the offer decision, and a selected team sees incompatible business dates. The state may be technically consistent with the real clock, but the scenario is not coherent as a live demo.

**Expected behavior:** An intentionally live pending-offer fixture should have a future response deadline and terms consistent with its challenge; an intentionally historical offer should not be marketed as the live offer demo.

**Implementation trace:** The route challenge authoring dates are in `DEMO_CHALLENGES`; the pending route offer is in `DEMO_SELECTION_OFFERS`. Both pass through `src/db/seed/clock.ts`, which translates authored dates relative to reset time. Runtime expiry uses the real clock in `offer.service.ts`/`application-stage.ts`; it correctly renders the stored deadline as lapsed. The route challenge's authored year is 2027 while the offer's is 2026.

**Relevant files:** `src/db/seed/challenges.ts`, `src/db/seed/offers.ts`, `src/db/seed/clock.ts`, `src/services/offer.service.ts`, `src/services/application-stage.ts`, `src/app/offer/[applicationId]/page.tsx`.

**Recommended fix:** Review the complete route fixture chronology and durable-demo convention, then align challenge, selection, offer, and project dates without altering production clock behavior. Confirm the actual intended reset cadence.

**Regression verification:** After a controlled local reset, open route as anonymous, Jordan, and Priya; verify challenge and offer dates, a live leader-only offer response, non-leader restrictions, expiry after deadline, and downstream NDA/project transitions in a disposable database.

### F3 — Partner Students tab sends the contact to a 404

**Evidence:** OBSERVED  
**Severity:** P1  
**Category:** NAVIGATION  
**Persona:** Bến Cảng partner contact  
**Route:** `/partner/students`

**Browser reproduction:**

1. Sign in as `BENCANG_CONTACT_DEMO` and click the visible Students tab.
2. Observe HTTP 404 at `/partner/students`.
3. Open `/partner/students?challenge=route-optimisation`: the recommendation deck loads. Open `?challenge=merchant-churn-model`: HTTP 404.

**Observed behavior:** The default route and its first private owned challenge fail, but the explicit public challenge succeeds. The page is reachable from global partner navigation even though its default selection cannot render.

**Why this feels wrong:** A prominent primary tab is broken. A partner may believe student sourcing is unavailable; the 404 does not explain why.

**Expected behavior:** The tab should select an accessible owned challenge or show a useful empty/choice state. If sourcing for owned private postings is intended, authorize it through an owner-scoped read model, while leaving the ordinary external-partner marketplace at PUBLIC_PREVIEW only.

**Implementation trace:** `PartnerStudentsPage` selects `open[0]` from the partner's owned challenge dashboard, then calls `getMarketplaceChallengeBySlug` with the external-partner marketplace context. The first open owned challenge is private; `canDiscoverChallenge` refuses it, and the page calls `notFound()`. An explicit public query resolves.

**Relevant files:** `src/app/partner/students/page.tsx`, `src/components/layout/partner-section-tabs.tsx`, `src/services/partner.service.ts`, `src/services/challenge.service.ts`, `src/services/challenge-policy.ts`.

**Recommended fix:** Separate owner-scoped sourcing authorization from ordinary marketplace discovery, or constrain/default the deck to public-preview challenges and explain unavailable postings. Do not weaken Phase 6.3 marketplace policy.

**Regression verification:** As Bến Cảng, click Students from partner overview and project detail; test each owned challenge selector, including private and public. As an unrelated partner, verify private Bến Cảng data remains inaccessible.

### F4 — Expired faculty invitation reads “Respond by today” and still offers a decision

**Evidence:** OBSERVED  
**Severity:** P2  
**Category:** BUSINESS_LOGIC  
**Persona:** Faculty Pham  
**Route:** `/faculty`, `/faculty/44444444-4444-4444-8444-000000000004`

**Browser reproduction:**

1. Sign in as `FACULTY_PHAM_DEMO` and open the pending outreach supervision request.
2. Compare the top-line “respond by 14 Sept 2026” with the decision panel on 27 Sept 2026.

**Observed behavior:** The same request displays “Respond by today” and enabled Accept supervision/Decline controls. No decision was submitted, so whether the server would accept the overdue request is **not verified**.

**Why this feels wrong:** The page gives conflicting urgency and action guidance for an expired date. Faculty cannot tell whether their response is late, still valid, or blocked.

**Expected behavior:** Show “Overdue by N days” or an explicit expired state, and align controls with the authoritative server transition policy.

**Implementation trace:** `getFacultyQueue` computes negative `daysLeft` from the real clock. `InviteDecision` maps all `daysLeft <= 0` to “today” and only disables Accept for capacity/pending state. The detail page separately prints the stored `respondBy` date.

**Relevant files:** `src/services/faculty.service.ts`, `src/components/faculty/invite-decision.tsx`, `src/app/faculty/[applicationId]/page.tsx`.

**Recommended fix:** Distinguish due-today, overdue, and expired; settle whether late responses are permitted and enforce/display the same rule server-side and in the UI.

**Regression verification:** Test a request due today, overdue, and future-dated in an isolated database; compare queue and detail text and submit each permitted/forbidden transition.

### F5 — Marketplace calls a closed challenge “open”

**Evidence:** OBSERVED  
**Severity:** P2  
**Category:** CONSISTENCY  
**Persona:** Jordan student  
**Route:** `/challenges`

**Browser reproduction:** Sign in as Jordan and open the marketplace on 27 Sept 2026.

**Observed behavior:** Header says “8 open challenges,” while the campus-energy-audit card says “Closed.”

**Why this feels wrong:** The count suggests eight current application opportunities. A student must inspect cards to learn one is no longer actionable.

**Expected behavior:** Count genuine apply-now opportunities separately from published historical/closed-for-application items, or label the heading “visible challenges” and identify closed cards clearly.

**Implementation trace:** `ResultsHeader` labels `results.total` as open; the list service includes published/`APPLICATIONS_OPEN` status, while `deadlineLabel` independently evaluates the actual deadline. The two definitions diverge as time passes.

**Relevant files:** `src/components/marketplace/results-header.tsx`, `src/services/challenge.service.ts`, `src/services/challenge-policy.ts`, `src/lib/dates.ts`, `src/components/marketplace/challenge-card.tsx`.

**Recommended fix:** Define and present publication status versus application-window status explicitly; avoid mislabeling historical records as open.

**Regression verification:** Browse before and after a challenge deadline with student visibility; verify count, card label, detail CTA, and filters agree.

### F6 — Work hub shows a challenge deadline as “Closed” on an active project

**Evidence:** OBSERVED  
**Severity:** P2  
**Category:** CONSISTENCY  
**Persona:** Jordan student  
**Route:** `/workspace`

**Browser reproduction:** Open Jordan's Your work hub and inspect the In progress rows, including Campus energy audit.

**Observed behavior:** Campus energy is grouped under active/in-progress work but its right-hand date cell says “Closed.” The project detail itself is active.

**Why this feels wrong:** In a project-work table, “Closed” reads like the work or project was closed, not the old application window. It undermines trust in the current state.

**Expected behavior:** For ACTIVE projects show the next project milestone, or no application deadline; if keeping the field, label it “Applications closed” separately.

**Implementation trace:** `toPipelineView` uses the challenge application deadline for all stages except `INVITED`; `listWorkspaceHubRows` carries that value into active project rows; `HubApplicationTable` renders it through `deadlineLabel`.

**Relevant files:** `src/services/application-stage.ts`, `src/services/workspace-hub.service.ts`, `src/components/workspace/hub-application-table.tsx`.

**Recommended fix:** Make the hub's right-hand date stage-specific; project rows should derive from project milestones, not the old application deadline.

**Regression verification:** Open a student hub with an active project whose challenge deadline has passed; compare row date with project milestone and project state.

### F7 — Offer inbox messages remain actionable-sounding after lapse or acceptance

**Evidence:** OBSERVED  
**Severity:** P2  
**Category:** UX  
**Persona:** Jordan and Priya students  
**Route:** `/inbox`, `/offer/44444444-4444-4444-8444-000000000002`

**Browser reproduction:** Open either student's Inbox and follow the route offer “Review offer” link; inspect older accepted-offer items as Jordan.

**Observed behavior:** Route item says “An offer is ready” and “Review offer” even though the destination says “Invitation lapsed.” Older accepted-offer receipt events retain the same ready/review wording. The separate response event may say “Offer accepted,” but the receipt event still reads as pending action.

**Why this feels wrong:** The inbox can imply there is a decision to make when none is available. Priya, a team member, also sees the generic offer CTA without the leader distinction.

**Expected behavior:** Preserve historical events, but render current state alongside them and use state-aware action labels (“View expired offer,” “View accepted offer”); identify which team member may respond.

**Implementation trace:** `applicationEntries` always sets offer receipt body/action to “An offer is ready”/“Review offer” whenever an offer row exists; only `needsResponse` checks deadline and leader role. The offer page correctly computes expiry.

**Relevant files:** `src/services/inbox.service.ts`, `src/app/offer/[applicationId]/page.tsx`, `src/services/offer.service.ts`.

**Recommended fix:** Keep immutable event history but add current-state annotations and action labels derived from offer status, expiry, and actor capability.

**Regression verification:** View inbox as leader and member for pending, expired, accepted, and declined offers; follow each link and verify labels and controls match.

### F8 — Marketplace orientation and suitability copy are stale or role-inappropriate

**Evidence:** OBSERVED  
**Severity:** P2  
**Category:** UX  
**Persona:** Anonymous visitor, new account, external partner  
**Route:** `/challenges`

**Browser reproduction:** Open the marketplace signed out and then as Bến Cảng.

**Observed behavior:** Header says “Summer 2026 · Week 31” in late September 2026. Generic text explains “the ring on each card is your suitability” and tells the partner “partners never see it,” even though no ring appears for either persona and a partner is reading the page.

**Why this feels wrong:** The page looks stale and explains a feature the current viewer cannot see. With only one public challenge, it does not explain why the catalog is sparse.

**Expected behavior:** Use a current, meaningful catalog heading; tailor suitability guidance to eligible student viewers; explain that public browsing is a preview of a larger VinUni-only catalog.

**Implementation trace:** `ResultsHeader` is static and receives no actor/audience information. `ChallengeCard` only renders a ring if a `fit` prop is supplied; the marketplace page does not pass one.

**Relevant files:** `src/components/marketplace/results-header.tsx`, `src/components/marketplace/challenge-card.tsx`, `src/app/challenges/page.tsx`.

**Recommended fix:** Remove obsolete term/date copy and make helper text audience-aware; show suitability wording only where a real score is present.

**Regression verification:** Compare marketplace text and cards as anonymous, new basic account, student, and external partner.

### F9 — “AI shortlist” label overstates the current student-sourcing implementation

**Evidence:** OBSERVED  
**Severity:** P2  
**Category:** PRODUCT_FLOW  
**Persona:** Bến Cảng partner contact  
**Route:** `/partner/students?challenge=route-optimisation`

**Browser reproduction:** As Bến Cảng, navigate to the explicit public route query and inspect the deck header and fit explanation.

**Observed behavior:** A prominent chip says “✦ AI shortlist,” while nearby text describes the fit score as a weighted count of matched skills, availability, assessment band, and course overlap, “not a learned model.”

**Why this feels wrong:** Partners may infer validated AI ranking or semantic matching that is not present. The roadmap still marks Phase 7 matching as not started.

**Expected behavior:** Describe the current deterministic recommendation as a rule-based fit preview until a governed matching system exists.

**Implementation trace:** `PartnerStudentsPage` calls `recommendationsFor` and renders the static AI chip; its own explanatory copy disclaims a learned model.

**Relevant files:** `src/app/partner/students/page.tsx`, `src/lib/recommendations.ts`, `PRODUCTION_TRANSFORMATION_PLAN.md`.

**Recommended fix:** Rename the chip and explain the score's limited basis; avoid implying Phase 7 exists.

**Regression verification:** Open the partner deck and confirm label, explanation, and any downstream invitation language consistently describe the implemented mechanism.

## First-time-user assessment and product questions

The observed sequence is **anonymous → register → `/challenges` → one visible challenge → “student accounts only”**. This is not a coherent onboarding journey for someone attempting to apply. The page does not explain why there is one challenge, how eligibility is determined, how to add skills/coursework, or how a basic account becomes a student account. The sparse list is defensible under PUBLIC_PREVIEW policy; its lack of explanation is not. `/profile` compounds the dead end with a “signed in as something else” message rather than the next step. The first meaningful action is browsing only; applying is unavailable.

**PRODUCT-QUESTION:** Is self-service email registration meant only for external partner/basic identities, or should verified students eventually use it too? The answer determines the onboarding path and account-verification design. This audit does **not** recommend granting `STUDENT` automatically at signup.

**PRODUCT-QUESTION:** Should a partner source candidates for its own PRIVATE challenge? The current owner dashboard can show it, while the sourcing deck cannot. This requires an explicit owner-scoped access decision, separate from ordinary marketplace visibility.

**PRODUCT-QUESTION:** Should expired faculty supervision requests remain answerable? The UI presents controls after the deadline; whether the server accepts them was not tested. Choose and communicate the lifecycle rule.

Technically valid but product-poor flows include the non-student post-registration redirect, a live-looking route posting with an expired offer, the old application deadline displayed on active project work, and offer receipt events that keep “Review offer” wording after state changes.

## Route and access matrix

`B` = browser observed; `C` = code-inspection only; `—` = not tested. “Admin” below is CAID/E-Lab development administrator, **not** a global platform owner. The current checkout has no `/admin` page.

| Route | Anonymous | Student | Faculty | Contact person | Admin | Observed behavior / expected behavior |
| --- | --- | --- | --- | --- | --- | --- |
| `/challenges` | B: 1 public | B: 8 Jordan-visible | — | B: 1 public | — | Public-preview restriction worked for anonymous/partner; VinUni student saw broader scope. |
| `/challenges/route-optimisation` | B: public detail | B: detail | — | — | — | Sign-in CTA when anonymous; student apply CTA; new basic account sees no application path. |
| `/challenges/route-optimisation/apply` | C: sign-in redirect | B: new basic account 404; existing student not tested here | C: 404 | C: 404 | — | Student capability gate is server-side. |
| `/profile` | C: sign-in redirect | B: Jordan profile; B: new basic account unavailable | — | — | — | Basic account has no usable profile/onboarding. |
| `/applications` | B: sign-in redirect | B: Jordan list | — | — | — | Existing student application states render. |
| `/assessment/<applicationId>` | — | B: unrelated Priya resource 404; B: Jordan completed assessment | — | — | — | Resource isolation observed; assessment submission not tested. |
| `/offer/<applicationId>` | — | B: Jordan/Priya route offer lapsed | — | — | — | Read state correct for stored deadline; response transition not exercised. |
| `/workspace` | — | B: Jordan hub | — | — | — | Active projects render; old challenge deadline confuses status. |
| `/faculty` and request detail | — | — | B: queue/detail | C: role gate | — | Pending overdue request shown with contradictory “today” label. |
| `/partner` and projects | — | — | B: `/partner` 404 | B: overview/projects/detail | — | Owner scoping rendered; signoff writes not tested. |
| `/partner/students` | — | — | — | B: default 404; public query 200; private query 404 | — | Visible tab broken by private-first default/marketplace policy mismatch. |
| `/review` and CAID detail | — | — | — | — | B: CAID detail; B: E-Lab empty/cross-unit 404 | Cross-unit review isolation observed. |
| `/admin` | — | — | — | — | B: CAID 404 | Global owner console is not present in this checkout. |

## Lifecycle and state-transition review

| Domain / state | Available action and resulting state | Evidence / risk |
| --- | --- | --- |
| Challenge: `APPLICATIONS_OPEN`, `PUBLIC_PREVIEW` | Anonymous/partner read; VinUni student can reach apply CTA. Post deadline, card can say “Closed.” | **B:** route publicly visible; **B:** campus energy closed card still counted as open. Submission after deadline was not tested. |
| Challenge: `PRIVATE` high-confidentiality | VinUni student sees established scope; external partner ordinary marketplace cannot discover. Owner dashboard shows own challenge. | **B:** Jordan vs Bến Cảng marketplace; **B:** private sourcing query 404. No policy bypass observed. |
| Application: `SUBMITTED`, `ASSESSMENT`, `SELECTION_PENDING`, `SELECTED`, `REJECTED` | Existing student can view rows/details; apply route has duplicate-application screen by code. | **B:** Jordan list spans these states; **C:** duplicate guard in apply page. New-account application write unreachable. |
| Assessment: pending/completed | Completed result is readable by its student; unrelated resource 404. | **B:** Jordan completed merchant assessment and Priya unrelated 404. Starting/submitting/scoring a new attempt was not tested. |
| Offer: PENDING before/after deadline; ACCEPTED | A live pending offer should allow authorized leader decision; expired one is read-only; accepted offer can lead to NDA/project. | **B:** route PENDING but expired with no controls. **B:** older accepted offer history visible. Acceptance, decline, NDA writes not tested. |
| Project: ACTIVE, milestone pending/approved; COMPLETED | Students see project and milestones; partner sees signoff controls; faculty has approval queue. | **B:** Jordan active project and Bến Cảng project detail; no signoff/revision/closeout write was tested. Active hub date copy is wrong. |

No unprotected write transition was demonstrated. The most salient unresolved server-side question is whether an overdue faculty request can still be accepted. The browser audit intentionally avoided altering shared seeded lifecycle rows.

## UX quick wins

1. Remove “Summer 2026 · Week 31”; explain public-preview scope and conditionally show suitability help.
2. Rename the marketplace total to “visible challenges” or compute a genuinely actionable-open count.
3. Replace “today” for negative faculty `daysLeft` with overdue/expired wording.
4. Make inbox offer labels reflect current status without deleting historical events.
5. Make active-project hub dates milestone-specific, or suppress the old application deadline.
6. Rename “AI shortlist” to a truthful rule-based fit label until Phase 7 is implemented.

## Remediation backlog

### Must fix before stakeholder demo

| Order | Finding | Severity | Evidence | User impact | Estimated effort |
| --- | --- | --- | --- | --- | --- |
| 1 | F1 Registration-to-student dead end | P1 | OBSERVED | Full new-user golden path cannot proceed | Medium–large; requires product identity decision |
| 2 | F2 Route pending offer expired/date conflict | P1 | OBSERVED | Cannot demo offer decision; trust-damaging chronology | Medium; fixture and reset strategy review |
| 3 | F3 Partner Students 404 | P1 | OBSERVED | Primary partner tab unusable | Small–medium; owner-scoped policy decision |
| 4 | F4 Faculty overdue invitation UI | P2 | OBSERVED | May invite an invalid or unclear action | Small–medium; confirm server rule |
| 5 | F5 “8 open” count includes closed | P2 | OBSERVED | Misstates available opportunities | Small |

### Should fix soon

| Order | Finding | Severity | Evidence | User impact | Estimated effort |
| --- | --- | --- | --- | --- | --- |
| 6 | F6 Active-project hub says Closed | P2 | OBSERVED | Confuses project status | Small–medium |
| 7 | F7 Stale offer inbox CTA | P2 | OBSERVED | Suggests unavailable action | Small–medium |
| 8 | F8 Stale/role-inappropriate marketplace copy | P2 | OBSERVED | Weak first impression and orientation | Small |
| 9 | F9 “AI shortlist” overclaim | P2 | OBSERVED | Misrepresents current recommendation capability | Small |

### Future polish

Retest disabled work-mode/eligibility filters once implemented; improve basic-account empty states after the identity decision; add a role-aware first-login overview; audit project milestone/meeting overdue prioritization in a disposable dataset.

## Browser regression plan

1. **Signup path:** New isolated browser context → anonymous public challenge → sign in/register → first destination → profile/verification path → challenge eligibility → application submission. Repeat direct-URL access as an unverified basic account.
2. **Visibility:** Anonymous and unrelated external partner should see only PUBLIC_PREVIEW; VinUni student should see established VinUni scope; confidential private content must remain appropriately redacted; owner-only partner challenge access must not leak to unrelated partners.
3. **Canonical route chronology:** Reset a disposable local database → inspect route challenge/application/offer dates → as leader accept or decline before deadline → as member verify no unauthorized team decision → inspect NDA/project transition → simulate/advance beyond deadline only in a test harness, not by pinning production clock.
4. **Partner sourcing:** Click Students tab from overview and project page; test public/private owned selector values and unrelated partner denial; confirm no generic 404 for valid owner context.
5. **Faculty deadline:** Future, today, and overdue invitations; compare queue/detail label, enabled actions, server result, and post-decision refresh.
6. **Marketplace/work hub/inbox:** Browse before/after application and offer deadlines, open active project rows, and inspect offer inbox entries in pending, expired, accepted, and declined states.

## Coverage and limitations

All `OBSERVED` findings above were reproduced with Playwright MCP in the running app. Browser evidence is based on accessibility snapshots and actual navigation/status responses; no screenshot was needed to establish these mostly textual/route-state issues. The browser emitted repeated development WebSocket/HMR console errors, but route content continued to load; these were not classified as product defects without a separate environment investigation. No cross-device/mobile visual pass, accessibility automation, performance profiling, production deployment, or mutation of existing lifecycle rows was performed. The newly created basic account remains in the local development database. This report is the requested checkpoint; no Phase 7 or admin implementation work was begun.
