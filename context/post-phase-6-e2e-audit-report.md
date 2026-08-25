# Post-Phase-6 Full Integrated E2E Audit

**Scope:** Phases 1–6 production-runtime verification (before Phase 7 matching work begins)
**Date:** 2026-08-24

---

## Executive result

**PASS WITH GAPS**

Core Phases 1–6 runtime (auth, marketplace, applications, assessments, offers, workspace, authorization) is solidly DB-backed and correctly enforces identity/organization isolation everywhere it was exercised. Two categories of real defects were found: one server crash on a legitimate deny-path (P1), and a set of authenticated-but-fully-static dashboards left over from the MVP (P2). No P0 security/data-exposure issue was found.

---

## E2E matrix

| Actor | Auth | Marketplace | Profile | Apply | Assessment | Offer | Workspace | Role-specific routes |
|---|---|---|---|---|---|---|---|---|
| Anonymous | PASS (null session) | PASS (1, PUBLIC_PREVIEW only) | DENIED AS EXPECTED (→/sign-in) | DENIED AS EXPECTED | DENIED AS EXPECTED | DENIED AS EXPECTED | DENIED AS EXPECTED | N/A |
| Jordan | PASS | PASS (8, internal) | PASS (DB-backed) | PASS (shows existing SELECTED state, no dup) | PASS (merchant-churn Reviewed band, no fake score; triage Below-threshold) | PASS (PENDING, Accept/Decline shown) | PASS (3 projects, correct members incl. faculty) | N/A |
| Priya | PASS | PASS (8) | PASS (own data only) | not directly re-tested (covered via Jordan pattern) | **FAIL** — triage (unrelated) → 500, not deny (D1) | PASS (readable, no accept authority, correct leader-only message) | PASS (own 1 project; unrelated project → clean 404) | N/A |
| Bao | PASS | not separately re-checked (same marketplace) | not directly re-checked | N/A | N/A | PASS (historical ACCEPTED, terminal, no reversal control) | PASS (own project shown, ACTIVE) | N/A |
| Hoang | PASS | N/A | N/A | N/A | N/A | N/A | PASS (2 correct projects shown) | N/A |
| Faculty Pham | PASS | PASS (8, internal) | PASS (role-aware "unavailable", no Jordan fallback) | N/A (student-only action) | **FAIL** — same 500 crash pattern as Priya (D1) | N/A | PASS (authoritative project allowed; unrelated project → 404) | GAP — `/faculty` dashboard is fully static/mock (D3) |
| Bến Cảng | PASS | PASS (1, PUBLIC_PREVIEW only — no VINUNI_ONLY leak) | N/A (non-student) | DENIED AS EXPECTED (404) | N/A | N/A | PASS (owned project allowed; unrelated owner → 404) | GAP — `/partner` dashboard is fully static/mock (D4) |
| CAID | PASS | PASS (8, internal-unit) | N/A | N/A | N/A | N/A | PASS (managing-org project allowed) | NOT APPLICABLE — no browser-exposed org-admin action beyond workspace |
| E-Lab | PASS | PASS (8, internal-unit) | N/A | N/A | N/A | N/A | PASS (denied on CAID-managed project — 404, no cross-org leak) | NOT APPLICABLE |

---

## Defects

**D1 — P1 (Functional blocker).** Assessment authorization denial crashes instead of returning a clean deny.
- Actor: Priya (also reproduced as Faculty Pham)
- Route/action: `GET /assessment/44444444-4444-4444-8444-000000000001` (triage-protocol-review; actor is not a member of that application)
- Expected: deny (redirect/403/404), consistent with every other unauthorized-resource route tested (workspace, apply all return clean 404s)
- Actual: HTTP 500, Next.js generic error boundary ("This page couldn't load"); no sensitive data is leaked in the response, but console/server logs show an uncaught `AssessmentError: Actor is not an application member.` thrown from `loadAssessmentContext`
- Evidence: console error log captured; screenshot taken (not persisted)
- Likely owner/files: `src/app/assessment/[applicationId]/page.tsx` (calls `getAssessmentPreflight` from `src/services/assessment.service.ts:412`) — this route does not catch `AssessmentError` the way the workspace route (`src/app/workspace/[applicationId]/page.tsx`, confirmed calling `notFound()`) does
- Recommended fix scope: small — wrap the assessment preflight call in a try/catch that maps `AssessmentError` (membership/forbidden cases) to `notFound()` or a sign-in-style deny, matching the pattern already used by the workspace route.

**D2 — P2/P3 (Integration gap — orphaned unauthenticated legacy route).** `/invitations/[applicationId]` has no auth boundary at all and renders entirely from the static MVP fixture.
- Actor: Anonymous (no sign-in required)
- Route: `GET /invitations/app-route` → HTTP 200
- Expected: per Layer 2 rules, no application/team data should be reachable without authentication; per architecture rules, all production routes should be DB-backed
- Actual: page renders using `currentStudent` from `@/lib/data/student` and `getApplicationById`/`getChallengeById` from `@/lib/queries` (static fixtures), no `getAuthenticatedActor`/`getAuthenticatedUser` call, no `layout.tsx` in `src/app/invitations/` (unlike `src/app/faculty/layout.tsx` and `src/app/partner/layout.tsx`, which do enforce capability checks)
- Evidence: direct navigation returned 200 with fixture team/eligibility content
- Likely owner/files: `src/app/invitations/[applicationId]/page.tsx`; missing `src/app/invitations/layout.tsx`
- Recommended fix scope: small — either delete the orphaned route (nothing links to it) or add an auth-gating layout consistent with `/faculty` and `/partner`. Data shown is fabricated MVP fixture content, not real production data, so this is not classified P0/P1.

**D3 / D4 — P2 (Integration gap — static/mock runtime behind real auth).** `/faculty` and `/partner` are correctly auth/capability-gated (`getAuthenticatedActor` + `hasActorCapability`, denying non-matching actors with `notFound()`), but their content is entirely the pre-Phase-4/5 static MVP dashboard.
- Actors: Faculty Pham (`/faculty`), Bến Cảng (`/partner`)
- Route: `GET /faculty`, `GET /partner`
- Expected: DB-backed dashboards reflecting real supervision/partner data (or an honest "not yet migrated" state)
- Actual: `/faculty` shows a fabricated "Action queue" (invitations/milestone approvals/feedback due, "Supervision load: 2 of 5 slots") with live-looking Accept/Decline/Approve buttons wired to `@/lib/data/*`, not the DB; `/partner` shows fabricated project IDs (`papp-depot`, `papp-meridian`) that do not exist in the seeded database at all
- Evidence: full accessibility snapshots captured for both, matched against DB query results showing no such records
- Likely owner/files: `src/app/faculty/page.tsx`, `src/app/faculty/[applicationId]/page.tsx`, `src/app/partner/page.tsx`, `src/app/partner/post/page.tsx`
- Recommended fix scope: medium — these are full dashboard rewrites (out of scope for a quick patch); the buttons were not clicked during this audit to avoid triggering undefined behavior against non-existent fixture IDs, so their behavior when pressed is unverified and should be checked before any Phase 7 work assumes faculty/partner workflows are live.

---

## Static/mock runtime inventory (B/C classifications only)

| Route | Classification | Notes |
|---|---|---|
| `/faculty` | B — auth-protected but static/mock | Real `getAuthenticatedActor`/`hasActorCapability` gate; content is `@/lib/data/*` fixtures |
| `/faculty/[applicationId]` | B — auth-protected but static/mock | Same fixture source as above |
| `/partner` | B — auth-protected but static/mock | Real capability gate; fabricated project IDs not present in DB |
| `/partner/post` | B — auth-protected but static/mock | Not deeply inspected beyond import audit; same fixture source |
| `/invitations/[applicationId]` | D — dead/unreachable legacy UI (also unauthenticated) | No internal links found via source grep; reachable directly with zero auth |

No C (wrong identity/data leak) classifications were found — every identity/role isolation check performed (Jordan/Priya/Bao/Hoang profiles, faculty/partner/CAID/E-Lab workspace scoping) returned correct, actor-specific data or a clean deny.

---

## Browser health

- Console/page errors: only D1 (2× `AssessmentError` uncaught → 500), reproduced for both Priya and Faculty Pham. No other console errors, warnings, or hydration issues observed across ~25 navigations spanning anonymous, 6 student/faculty/partner actors, and CAID/E-Lab.
- Unexpected status codes: one 500 (D1). All other deny paths returned clean 404s (workspace unrelated-project denials, apply route for non-students, `/faculty`/`/partner` for non-matching actors) or redirects to `/sign-in` (protected routes for anonymous).
- No repeated redirects, no broken navigation, no visible loading hangs observed.
- Session lifecycle: sign-out reliably cleared `/api/auth/session` to `null`; sign-in reliably remapped session to the selected identity; no stale-identity or cross-context leakage observed across 8 sign-in/sign-out cycles (Jordan → Priya → Bao → Faculty Pham → Bến Cảng → CAID → E-Lab → Hoang → Jordan again for the write).

---

## Browser performance findings

Nothing outside expected dev-server behavior. No obvious duplicated requests, no unusually large waterfalls, and no page stalls were observed during navigation (network request counts were low and static-asset-dominated on each transition). Given effort constraints, deep `performance.getEntriesByType` sampling was not run across every representative route; no local outlier was noticed during normal use severe enough to flag. Not tested: production build performance, cold-vs-warm compile timing comparison, concurrency/scalability (explicitly out of scope per spec).

---

## Security findings

- **Identity isolation:** PASS. Each actor's `/api/auth/session` and profile/workspace content matched only their own DB record across every test; no Jordan-fallback observed for non-Jordan actors.
- **Partner isolation:** PASS. Bến Cảng saw PUBLIC_PREVIEW-only marketplace (1 challenge), was denied on unrelated owner-org workspace (404), and was denied the apply route (404). No generic `VINUNI_ONLY` access was granted merely by authenticating.
- **CAID/E-Lab isolation:** PASS. CAID (managing org for 7/8 challenges) was allowed on the CAID-managed workspace; E-Lab was denied (404) on that same CAID-managed workspace. No global-admin behavior observed. No browser-exposed UI existed for deeper org-admin actions beyond workspace access, so coverage there is NOT APPLICABLE/verifier-only (consistent with the automated `verify-authorization.ts` and `verify-role-model.ts` passing).
- **Assessment answer-key safety:** PASS. Result pages rendered qualitative bands only ("Strong"/"Below threshold"/etc.) with explicit "no numeric score was imported" copy where `overall_score` was NULL; no `correctIndex`, raw grading config, or answer key found in rendered HTML.
- **Browser secret boundary:** PASS. Spot-checked rendered HTML for `AUTH_SECRET`, `DATABASE_URL`, `correctIndex`, `password` — none present.
- **Server-owned actor fields:** PASS. Controlled write confirmed `responded_by` was server-set to Jordan's real user ID (8), not client-supplied; Priya had no accept/decline control rendered for the same offer, only a leader-only explanatory message.

---

## Controlled write result

Jordan (`student.jordan-lee.demo@example.test`, user id 8) accepted offer for application `44444444-4444-4444-8444-000000000002` via the "Accept invitation" button.
- DB verified: `offers.status` PENDING → ACCEPTED; `responded_by` → 8 (Jordan, server-derived, not client-supplied); `responded_at` → `2026-08-24 16:46:57.862+00` (server-populated)
- Project count for route-optimisation / overall: remained 4 before and after — offer acceptance correctly did **not** provision a project
- Priya re-checked on the same offer: no Accept/Decline affordance rendered for her; UI explicitly states "Only the accepted team leader can accept or decline this offer for the team" — consistent with the authorization matrix's leader-only offer-response rule; no unauthorized-write attempt was made (per instructions, reasoning from policy/UI was sufficient)

---

## Regression suite

| # | Command | Result |
|---|---|---|
| 1 | `tsx -r dotenv/config scripts/verify-challenge-writes.ts` | PASS |
| 2 | `tsx -r dotenv/config scripts/verify-application-runtime.ts` | PASS |
| 3 | `tsx -r dotenv/config scripts/verify-apply-flow-integration.ts` | PASS |
| 4 | `tsx -r dotenv/config scripts/verify-assessment-runtime.ts` | PASS |
| 5 | `tsx -r dotenv/config scripts/verify-offer-runtime.ts` | PASS |
| 6 | `tsx -r dotenv/config scripts/verify-workspace-runtime.ts` | PASS |
| 7 | `tsx -r dotenv/config scripts/verify-auth-architecture.ts` | PASS (the logged `MissingCSRF` error is expected — it's the intentional invalid-CSRF rejection test) |
| 8 | `tsx -r dotenv/config scripts/verify-role-model.ts` | PASS |
| 9 | `tsx -r dotenv/config scripts/verify-authorization.ts` | PASS |
| 10 | `pnpm exec tsc --noEmit` | PASS |
| 11 | `pnpm lint` | PASS |
| 12 | `pnpm db:check` | PASS |
| 13 | `pnpm exec drizzle-kit check` | PASS ("Everything's fine") |
| 14 | `pnpm build` | PASS (Next.js 16.2.12, Turbopack, compiled successfully) |
| 15 | `git diff --check` | PASS (clean; only an untracked audit screenshot appeared, which was deleted before finishing) |

Note: no `verify:*` package.json scripts exist; all verifiers were run directly via `tsx -r dotenv/config scripts/<name>.ts` (the `-r dotenv/config` flag was required — running bare `tsx scripts/...` fails with `DATABASE_URL is not defined`, since only `db:reset`/`db:seed` scripts self-import `dotenv/config`).

---

## Canonical reset

Final `pnpm db:reset` + `pnpm db:check` confirmed:
- app-route offer (`44444444-4444-4444-8444-000000000002`) → back to PENDING, `responded_by` NULL
- projects count → 4 (unchanged)
- Seed row counts matched the canonical baseline exactly on both the pre-audit and post-audit reset (challenges 8, applications 8, application_members 18, assessments 2, assessment_attempts 2, offers 5, projects 4, project_members 10, milestones 15, deliverables 12, milestone_reviews 20, project_resources 10; match_results/match_skill_details/match_experience_details all 0)
- `git status --short` clean (no tracked changes; temporary screenshot artifact removed)

---

## Pre-Phase-7 integration closure — Cluster A (2026-08-25)

**D1 — fixed.** `src/app/assessment/[applicationId]/page.tsx` now wraps `getAssessmentPreflight` in try/catch and maps `AssessmentError` with `code === "FORBIDDEN"` to `notFound()`, matching the pattern already used by `src/app/workspace/[applicationId]/page.tsx`. All other errors rethrow uncaught. No changes to `assessment.service.ts` authorization logic. Verified via Playwright: Jordan (member) sees the reviewed-assessment state as before; Priya and Faculty Pham (non-members) now get a clean 404 with no assessment data in the DOM and no server 500; anonymous still redirects to `/sign-in`.

**D2 — removed.** Confirmed via source grep that no runtime code links to `/invitations/[applicationId]` (only unrelated string matches for the word "invitations" in `/faculty` copy and `src/lib/teams.ts`), and the route had no `layout.tsx` auth gate. Deleted `src/app/invitations/[applicationId]/page.tsx` (and the now-empty `src/app/invitations/` directory) entirely; no replacement backend was added. Verified via Playwright: both anonymous and authenticated (Jordan) direct access to the old route now returns the standard Next.js/app 404 with no fixture team/application content rendered.

Regression run after both fixes: `verify-assessment-runtime`, `verify-authorization`, `verify-auth-architecture`, `verify-application-runtime`, `verify-apply-flow-integration`, `verify-offer-runtime`, `verify-workspace-runtime`, `verify-role-model`, `verify-challenge-writes` (all PASS) · `tsc --noEmit` PASS · `pnpm lint` PASS · `pnpm db:check` PASS · `pnpm build` PASS · `git diff --check` PASS.

D3/D4 (static `/faculty` and `/partner` dashboards) remain open and out of scope for this closure — unchanged from the original audit.

---

## Pre-Phase-7 integration closure — Cluster B (2026-08-25)

**D3 — migrated.** `/faculty` and `/faculty/[applicationId]` are now DB-backed. Root cause was that both routes rendered from `@/lib/data/faculty` and `@/lib/supervision` (static MVP fixtures) despite sitting behind the real Phase 6 `FACULTY` capability gate. Added `src/db/queries/faculty.ts` (reads `challenge_faculty_assignments`, `supervision_requests`, `faculty_profiles.max_active_supervisions`) and `src/services/faculty.service.ts` (`getFacultyDashboard`, `getFacultyApplicationDetail`), reusing the existing `listProjectCores`/`listProjectMilestones` project-read model rather than duplicating policy logic. Rewrote `src/app/faculty/page.tsx` and `src/app/faculty/[applicationId]/page.tsx` to read the authenticated actor's `facultyProfile.userId` (never a client-supplied or hardcoded faculty ID) and deleted the now-unused fixture-driven `src/components/faculty/*` (queue, invite-decision, project-review, and their dialogs — none had other importers).

Domain semantics preserved: challenge-faculty assignments are shown as routing/review relationships, explicitly labelled "not active supervision"; supervision requests render read-only (no accept/decline — no production mutation exists for that lifecycle); active supervision is derived solely from `projects.faculty_supervisor_id`. `/faculty/[applicationId]` now only owns the pre-supervision "has this faculty been asked to supervise?" relationship (`supervision_requests`); a confirmed project-supervisor relationship redirects to the already-authoritative `/workspace/[applicationId]` instead of re-implementing its access policy. An unrelated application (no supervision request, no supervisor relationship) 404s even though the same faculty member has unrelated challenge assignments — assignment alone was verified not to leak project/application access.

The "2 of 5 supervision slots" capacity line was kept, but is now real: `faculty_profiles.max_active_supervisions` is an authoritative seeded column (Pham = 5), and the numerator is a live count of `projects` rows where `faculty_supervisor_id` matches the actor. Fake feedback-due, approval, and invitation-count metrics were removed outright (no supporting production writes exist for any of them).

Verified via Playwright (dev server, isolated sign-in/sign-out cycles) against the real dataset: anonymous → redirect to `/sign-in` on both routes; Jordan (student) → 404; Bến Cảng (partner) → 404; Faculty Pham → `/faculty` 200 showing exactly 2 supervised projects (app-supply ACTIVE 1/5 milestones, app-archive COMPLETED 3/3), 1 supervision request (app-outreach, PENDING), 4 challenge assignments — all cross-checked against a new focused verifier (`scripts/verify-faculty-runtime.ts`) hitting the same service functions directly against PostgreSQL, with matching counts. `/faculty/[applicationId]` for app-outreach (supervision request) renders read-only team/status detail with no action buttons; for app-supply (confirmed supervision) redirects to `/workspace/app-supply`; for app-energy (a different faculty member's project) returns a clean 404. No console errors, no failed requests, no repeated fetch loops observed across any of the above.

No writes were added or exercised; no schema, seed, or auth changes were made. Regression run after the change: `verify-faculty-runtime` (new), `verify-authorization`, `verify-role-model`, `verify-auth-architecture`, `verify-workspace-runtime`, `verify-application-runtime` (all PASS, canonical seed counts unchanged: projects 4, supervisionRequests 1, feedback 0) · `tsc --noEmit` PASS · `pnpm lint` PASS · `pnpm db:check` PASS · `pnpm exec drizzle-kit check` PASS ("Everything's fine") · `pnpm build` PASS (Next.js 16.2.12, Turbopack).

D4 (`/partner`) remains open and out of scope for this closure — Partner routes were explicitly excluded from Cluster B.

---

## Pre-Phase-7 integration closure — Cluster C (2026-08-25)

**D4 — migrated.** `/partner` and its subroutes are now DB-backed. Root cause was the same shape as D3: `/partner/**` rendered from `@/lib/provider`, `@/lib/data/organizations` (`currentOrganization()`/`currentOrgId = "org-bencang"`, hardcoded regardless of who signed in), and `@/lib/data/brief-parse`, despite sitting behind the real Phase 6 `PARTNER_REPRESENTATIVE` capability gate. The audit's `papp-depot`/`papp-meridian` fabricated IDs traced to `@/lib/data/provider-applications.ts`, which is a pure fixture file with no PostgreSQL row of that name — the real seeded rows use generated UUID `publicId`s (`sourceFixtureId: "papp-depot"` in `src/db/seed/*` is only an internal seed-transform key, never persisted or displayed).

Added `src/db/queries/partner.ts` (`listOwnedChallenges`, `getOwnedChallengeDetail`, `listApplicationsForOwnerOrganization` — all scoped by `ownerOrganizationId` in the query itself, set-based, no N+1) and `src/services/partner.service.ts` (`resolvePartnerOrganization`, `getPartnerDashboard`, `getPartnerChallengePage`). Rewrote `src/app/partner/page.tsx`, `post/page.tsx`, `students/page.tsx`, `challenges/[id]/page.tsx`, `projects/page.tsx`, and `projects/[applicationId]/page.tsx`; deleted the fixture-driven `src/components/partner/*` (attention-list, close-out-form, partner-milestone-list, pipeline-board, post-flow, swipe-deck, group-heading — none had importers outside `/partner` after the rewrite) and the orphaned `projects/[applicationId]/close` route (its only caller, the old "Close out" CTA, was removed since no production close-out/milestone-approval mutation exists).

**Organization resolution:** the partner's organization is resolved exclusively from `actor.memberships` where `organizationType === "EXTERNAL_PARTNER"` (`resolvePartnerOrganization`) — never from org display name, email domain, a client-selected value, or a route parameter. Zero matches denies; exactly one resolves; more than one returns an explicit `AMBIGUOUS` result that the page renders as a plain "multiple partner organizations — not yet supported" message rather than guessing or building org-switching. `BENCANG_CONTACT_DEMO` resolves to the real "Bến Cảng Logistics" `organizations` row through PostgreSQL, confirmed both via Playwright (header/sidebar show "Bến Cảng Logistics" / "Dung Tran" / `contact.bencang.demo@example.test`) and via `scripts/verify-partner-runtime.ts` reading the same row directly.

**Dashboard sections**, all DB-backed: owned challenges (any lifecycle status, not just published — title, slug, status, visibility, managing-org name, deadline, live applicant count via a `leftJoin`+`count`); applications against owned challenges (team name, real `application_status` enum value, submitted date), gated by `hasOneOfActiveOrganizationRoles(actor, organizationId, ["ADMIN","CONTACT_PERSON"])` — the same predicate `application-policy.ts`'s `OWNER_APPLICATION_ROLES` encodes, reused directly rather than re-derived, so holding `PARTNER_REPRESENTATIVE` alone (without an owner-org ADMIN/CONTACT_PERSON role) does not grant application reads; projects reached through the project→application→challenge→owner chain via the **unmodified** `listWorkspaceProjects`/`getWorkspaceDetail` from `workspace.service.ts` — the exact same policy and reads `/workspace` uses, not a partner-specific reimplementation.

**Owner vs. managing organization** is preserved throughout: every challenge/application/project read is scoped by `challenges.owner_organization_id` (the external partner), while `managing_organization_id` (CAID/E-Lab) is only ever displayed ("Managed by CAID"), never used as an authority boundary for partner reads.

**Fabricated data removed:** the static `currentOrganization()`/`org-bencang` identity, `papp-depot`/`papp-meridian`-shaped IDs, the fake "AI shortlist" recommendation deck, the fictional 5-column pipeline (`applied/shortlisted/assessment/interview/invited`) replaced by the real 7-value `application_status` enum, and all fabricated "pending approval"/"needs your sign-off" metrics (no `milestone_reviews`-by-partner-role write path exists, so no partner action-queue counts are shown).

**`/partner/post` — deferred, not wired.** The Phase 4.4 `createChallengeDraft` write service exists and is exercised by `verify-challenge-writes.ts`, but it requires the caller to supply a `managingOrganizationId` (CAID or E-Lab — the seed has exactly two `INTERNAL_UNIT` organizations, and no rule anywhere decides which one a *new* external-partner submission should route to; the existing seeded challenges were assigned by seed/test code, not a product rule). Wiring this would mean inventing owner→manager routing behavior rather than reading an existing decision — an explicit STOP condition in the brief — so `/partner/post` now renders a clear "not available yet" state naming the exact gap instead of a fake-working form. This is a reported gap, not a silent skip.

**`/partner/students` — deferred.** The old "recommended students" deck was `recommendationsFor()` over a static fixture with no matching model behind it; recommendation/matching is explicitly Phase 7 scope, so this route now says so plainly rather than presenting a fabricated shortlist.

**Controls kept/removed:** "Post a challenge" link kept (points at the deferred page, which explains the gap — not a working-looking button backed by nothing). "Find students" removed from the challenge page (destination is deferred). Selection/shortlist actions on the pipeline are read-only — no production mutation exists for a partner to move an application between statuses. Milestone approval and close-out feedback are removed entirely (no `mutations` module for projects/milestones exists in the codebase at all); `/partner/projects/[applicationId]` now verifies access via `getWorkspaceDetail` and redirects to the authoritative `/workspace/[applicationId]`, the same "defer to the authoritative route" pattern Cluster B used for a faculty member's confirmed supervision, rather than re-implementing milestone UI with nothing behind it.

**Route audit:** `page.tsx`, `post/page.tsx`, `challenges/[id]/page.tsx`, `projects/page.tsx` — (A) legitimate production routes, migrated to DB-backed authority (post deferred, see above). `projects/[applicationId]/page.tsx` — (A) migrated to a thin redirect onto the already-authoritative `/workspace/[applicationId]`. `projects/[applicationId]/close/page.tsx` — (B) legacy dead-end with its only caller removed in this change; deleted, matching the D2 pattern. `students/page.tsx` — (C) unsupported future (Phase 7 matching) feature; simplified to a safe unavailable state rather than removed, since it is a legitimate future route.

**A real bug found and fixed during Playwright verification, not present in the original static code:** the initial rewrite relied solely on `partner/layout.tsx`'s `hasActorCapability(... "PARTNER_REPRESENTATIVE")` gate. Testing as Faculty Pham showed the page component itself still executed and threw an uncaught `PartnerError` (visible in the dev server log) even though the response happened to come back as a 404 — the same class of issue D1 fixed for `/assessment`: a Server Component page can begin executing before a sibling layout's `notFound()` is observed. Fixed by adding the identical `hasActorCapability` check directly in every `/partner/**` page body (defense in depth, matching how `/faculty/page.tsx` already checks its own preconditions rather than trusting `FacultyLayout` alone). Re-verified clean (no server-side error trace, no console errors) for Faculty Pham, Jordan, and CAID after the fix.

**Static-reference audit (outside `/partner/**`):** no remaining importers of `@/lib/provider`, `@/lib/data/brief-parse`, or `@/lib/recommendations` anywhere in the app after this change (all three are now fully orphaned, dead code — left in place, not deleted, since only `/partner/**` and its direct backing files were in scope). `@/lib/data/organizations` and `@/lib/data/provider-applications` are imported only by `@/lib/provider.ts`, which itself has zero importers. No `papp-depot`/`papp-meridian`-style IDs are reachable from any `/partner/**` route.

Verified via Playwright (dev server, isolated sign-in/sign-out cycles): anonymous → clean redirect to `/sign-in` on `/partner` and `/partner/post`, no partner data, no console errors. Jordan (student) → clean 404. Faculty Pham → clean 404 (post-fix). CAID admin → clean 404 (managing-unit authority correctly not confused with partner authority). Bến Cảng (`BENCANG_CONTACT_DEMO`) → `/partner` 200, header/sidebar show the real Bến Cảng identity, dashboard shows exactly 3 owned challenges (`merchant-churn-model`, `route-optimisation`, `supply-chain-dashboard`, all `APPLICATIONS_OPEN`/managed by CAID), 4 applications (`SELECTION_PENDING`/`SELECTED` mix), 2 active projects — all cross-checked against `scripts/verify-partner-runtime.ts` querying the same tables directly (exact match: 3/4/2), no fabricated IDs. Cross-partner isolation: direct URL access to `/partner/challenges/community-health-outreach` (owned by Vietnam Health Foundation, not Bến Cảng) as the Bến Cảng actor returned a clean 404 with no metadata leak, confirmed both in the browser and by the verifier script calling `getPartnerChallengePage` directly. `/partner/projects/[applicationId]` correctly redirected to `/workspace/[applicationId]` and rendered the real project detail. No console errors, no failed requests beyond the expected 404-status resource entries on denied routes, no redirect loops, no hydration issues observed across any of the above. Final dashboard screenshot taken for Bến Cảng.

Regression run after the change (in the specified order): `verify-partner-runtime` (new, PASS) · `verify-challenge-writes` (PASS, canonical counts unchanged and rolled back) · `verify-application-runtime` (PASS) · `verify-workspace-runtime` (PASS) · `verify-authorization` (PASS) · `verify-role-model` (PASS) · `verify-auth-architecture` (PASS) · `tsc --noEmit` PASS · `pnpm lint` PASS · `pnpm db:check` PASS · `pnpm exec drizzle-kit check` PASS ("Everything's fine") · `pnpm build` PASS (Next.js 16.2.12, Turbopack; `/partner/**` routes all present, `/partner/projects/[applicationId]/close` absent) · `git diff --check` PASS. `pnpm db:reset` followed by `pnpm db:check` and a re-run of `verify-partner-runtime` confirmed canonical seed state is unchanged (challenges 8, applications 8, projects 4 at the database level; 3/4/2 scoped to Bến Cảng, matching the pre-reset Playwright observations exactly).

No schema, seed, Auth.js, or partner-role-semantics changes were made. No project/milestone writes, notifications, audit logging, file uploads, matching, or org-switching were implemented. No new dependency was added.

**Remaining Partner limitations (by design, reported not silently resolved):** posting a new challenge is not yet possible from the UI — it needs a product decision on owner→managing-org routing that doesn't exist yet anywhere in the codebase or seed. Student recommendations are not available — that is Phase 7 matching work. Partners cannot act on applications (shortlist/select/reject) or projects (approve milestones, submit close-out feedback) from `/partner` — no production mutation exists for any of these, so all of it is read-only or absent rather than fake. Multiple concurrent `EXTERNAL_PARTNER` memberships for one actor are detected and reported in-page rather than supported (no such actor exists in the current seed).

D4 is closed. No open items block Phase 7.1; the two deferred flows above (`/partner/post`, `/partner/students`) are explicit, documented gaps for product/architecture review before Phase 7 UI work assumes them live.

---

## Recommendation before Phase 7

**B — fix specific P0/P1/P2 items first**, grouped into two small clusters:

1. **Cluster 1 (small, do first): D1 assessment-deny crash.** One-file fix in `src/app/assessment/[applicationId]/page.tsx` to catch `AssessmentError` and deny cleanly instead of 500ing. This is the only P1 and the only true functional break found; it's cheap to fix and currently means any unauthorized assessment access (a case Phase 7 matching will make more common as more students see more assessments) surfaces as a crash rather than a controlled deny.
2. **Cluster 2 (defer or scope explicitly, not a blocker): static faculty/partner dashboards + orphaned `/invitations` route (D2–D4).** These are pre-existing, already-known-style integration gaps (analogous to the deliberately-deferred items in the spec) rather than regressions from Phase 6 work. They don't block Phase 7.1 matching work directly, but should be explicitly scoped (rewrite `/faculty` and `/partner` on the DB-backed pattern already used by `/workspace`, and delete or gate `/invitations/[applicationId]`) before any Phase 7 UI work assumes those dashboards are live.

No P0 security or data-exposure issues were found. Once D1 is fixed (small, isolated change), the platform is otherwise ready for Phase 7.1.
