# Pre-demo test plan (deployed server)

The full set of checks to run before demonstrating Solution Studio on the
deployed server (Vercel + Supabase, see
[`../deployment/public-demo-launch.md`](../deployment/public-demo-launch.md)).
Every check has an ID so results can be recorded in the sign-off table at the
end. Tick a box only when the check was actually performed and passed.

Related: [`manual-role-play-test-flow.md`](manual-role-play-test-flow.md) — the
step-by-step multi-role script used in section 9.

---

## 0. Read this first: what can be tested where

| Env | What it is | Who can sign in | Used for |
|---|---|---|---|
| **L** | Local dev server (`pnpm dev --webpack`) on a disposable database | Every role, via test-persona sign-up and seeded one-click logins | Full multi-role rehearsal, time-based edge cases |
| **P** | Local production build (`next build --webpack` + `next start`) | Production auth rules (no personas, no one-click logins) | Confirming production-only behaviour before deploying |
| **D** | Deployed Vercel production + Supabase demo DB | Anonymous visitors and the **student demo login only** | Configuration, data, security boundaries, the demo-student journey |

**Constraint — decide before demo day.** In production mode the test-persona
sign-up and seeded one-click logins are disabled, public self-registration is
off (`AUTH_SELF_SERVICE_ENABLED=false`), and Google sign-in admits only users
whose email already exists in the database (seeded users use `example.test`
addresses). The deployed demo therefore shows **anonymous + one student
(Jordan Lee)**. Faculty, partner, CAID and E-Lab views **cannot** be shown on
the deployed server today. Choose one:

1. Show the student journey on **D**, and the other roles from a prepared
   local environment (**L**) on the presenting laptop.
2. Show everything from **L** and use **D** only to prove it is live.
3. Add provisioned role accounts to the deployed demo. That is new work
   requiring a product/security decision and approval; it is not available
   now.

Record the decision here: `__________________________`

**The deployed database is shared and permanent.** Anything done while signed
in (applying, accepting an offer, submitting work) changes the demo data for
everyone and cannot be undone except by rebuilding the demo database (section
14). See section 8 before clicking anything on **D**.

---

## 1. Go / no-go criteria

The demo goes ahead only if all of these hold:

- [ ] All release gates in section 2 pass on the exact commit deployed.
- [ ] Deployed configuration (section 3) and database (section 4) checks pass.
- [ ] Deployed smoke, boundary and journey checks (sections 5–7) pass with no
      HTTP 500s, no console errors and no private data exposed.
- [ ] The irreversible-action plan (section 8) is agreed.
- [ ] The multi-role rehearsal (section 9) passed within the last 48 hours if
      any non-student role will be shown.
- [ ] The presenting laptop, browser and network were tested (sections 11–12).
- [ ] A fallback is ready (section 14).

---

## 2. Release gates (run locally on the commit to deploy)

- [ ] **R1** Working tree is clean and the deployed commit hash is recorded:
      `git status`, `git rev-parse HEAD` → `__________`.
- [ ] **R2** `pnpm install --frozen-lockfile` succeeds.
- [ ] **R3** `pnpm exec tsc --noEmit` passes.
- [ ] **R4** `pnpm lint` passes.
- [ ] **R5** `git diff --check` is clean.
- [ ] **R6** `pnpm exec next build --webpack` passes. (The default Turbopack
      build has a known environment issue; webpack is the validated path.)
- [ ] **R7** `pnpm exec drizzle-kit check` passes, and generating against the
      schema reports "No schema changes". Never run `drizzle-kit push` against
      the deployed database.
- [ ] **R8** `pnpm audit --prod` reviewed; no unaddressed high/critical issues.
- [ ] **R9** All focused verifiers pass against a **disposable** database
      (never the shared dev DB or the deployed DB):

  ```bash
  # disposable PostgreSQL on port 55432, in-memory storage, no volume
  docker run -d --name vinuni-predemo-db \
    -e POSTGRES_USER=vinuni -e POSTGRES_PASSWORD=predemo -e POSTGRES_DB=solution_studio \
    -p 127.0.0.1:55432:5432 --tmpfs /var/lib/postgresql:rw,size=2g pgvector/pgvector:pg18
  export DATABASE_URL=postgresql://vinuni:predemo@localhost:55432/solution_studio
  pnpm db:migrate && ALLOW_DB_SEED=true pnpm db:seed
  for f in scripts/verify-*.ts; do
    NODE_ENV=development pnpm exec tsx "$f" >/tmp/$(basename "$f").log 2>&1 \
      && echo "PASS $f" || echo "FAIL $f"
  done
  docker rm -f vinuni-predemo-db
  ```

  Expected: every verifier prints `PASS` (31 at the time of writing, including
  Phase 6.3 authorization and the application-deadline verifier).

---

## 3. Deployed configuration (Vercel + Supabase)

Check values in the dashboards without printing secrets.

- [ ] **C1** Vercel Production has `AUTH_SECRET` (long, random),
      `AUTH_DEMO_PASSWORD` (unique, 24+ characters) and `DATABASE_URL` (Supabase
      **Transaction pooler**, port 6543, TLS).
- [ ] **C2** `AUTH_SELF_SERVICE_ENABLED=false`. `AUTH_DEV_PERSONAS_ENABLED`,
      `ALLOW_DB_SEED`, `ALLOW_PUBLIC_DEMO_PROVISION` are **not set** in Vercel.
- [ ] **C3** Optional Google / Entra variables are either complete and intended,
      or absent. Half-configured providers are not acceptable.
- [ ] **C4** Supabase Data API is **disabled** (the app reaches PostgreSQL only
      through the Next.js server).
- [ ] **C5** The Vercel production domain is the one you will present; HTTPS
      works and plain HTTP redirects to HTTPS.
- [ ] **C6** `.env.deploy.local` or any file holding the pooler URI has been
      removed from the laptop after use.

---

## 4. Deployed database

- [ ] **DB1 Migration state.** The code expects migrations `0000`–`0008`.
      The launch runbook was written when there were six, so confirm that
      Drizzle's migration table on Supabase holds **9** rows. If any are missing,
      apply them with `pnpm db:migrate` using `MIGRATION_DATABASE_URL` (Session
      pooler, port 5432) **before** deploying the current code.
- [ ] **DB2 Schema spot-check** (read-only): tables `challenge_candidate_access`,
      `milestone_submissions` and `project_final_reviews` exist;
      `deliverables.submission_id` and `milestone_reviews.submission_id` have no
      NULLs; `assessments.passing_score` exists.
- [ ] **DB3 Row counts** match the synthetic demo expectation (for a freshly
      provisioned demo: 11 challenges, 8 applications, 5 offers, 4 projects,
      15 milestones). Record actual values: `__________`.
- [ ] **DB4 No real personal data** is in the demo database (synthetic fixtures
      only).
- [ ] **DB5 Supabase security and performance advisors** reviewed; relevant
      findings resolved or accepted.
- [ ] **DB6 Data age.** The demo timeline was fixed when the database was
      provisioned; countdowns do not refresh on their own. Check on the live
      site and decide whether each is acceptable to show:
  - Jordan's pending offer (application `…0002`): still open, or now "Offer
    expired"?
  - Challenge cards: how many now show "Closed"?
  - Supervision request due dates, overdue milestones, and "Live now" or
    "starts in 20 min" meetings (these will be stale).

  If the story no longer works, refresh the demo data through the recovery
  path in section 14. The provisioner refuses to run on a non-empty database.

---

## 5. Deployed smoke tests (D)

Use a fresh private window.

- [ ] **S1** `GET /api/health` → 200 `{"status":"ok"}` with `Cache-Control:
      no-store`.
- [ ] **S2** `/` and `/challenges` load within a few seconds, including the
      first (cold) request. Record the time: `____`.
- [ ] **S3** A public-preview challenge detail page loads with "Applications
      close", "Planned start", "How you'll be assessed" and "Sign in to apply".
- [ ] **S4** `/sign-in` shows **only** the student demo form. There is no
      test-persona dropdown, no seeded one-click identity buttons, and no
      self-service account creation.
- [ ] **S5** A wrong demo password is refused with a clear message and no
      details leaked.
- [ ] **S6** The correct demo password signs in as Jordan and lands on
      `/challenges` with student navigation.
- [ ] **S7** Sign out → protected pages redirect to sign-in. The browser Back
      button does not reveal private content after reload.
- [ ] **S8** Session cookies are `HttpOnly`, `Secure`, `SameSite=Lax` (DevTools
      → Application → Cookies).
- [ ] **S9** No errors in the browser console on any page above.

---

## 6. Boundary and disclosure checks (D)

Expected results: **404** means the controlled "We couldn't find that…" page;
**→ sign-in** means a redirect. There must never be a raw 500 or partial data.

### 6a. Anonymous (private window, not signed in)

| URL | Expected |
|---|---|
| `/challenges/merchant-churn-model` (PRIVATE) | 404 |
| `/challenges/warehouse-slotting-draft` (draft) | 404 |
| `/profile`, `/applications`, `/inbox`, `/workspace` | → sign-in |
| `/faculty`, `/partner`, `/review` | → sign-in or 404 |
| `/workspace/44444444-4444-4444-8444-000000000005` | → sign-in |
| `/offer/44444444-4444-4444-8444-000000000002` | → sign-in |

- [ ] **B1** All anonymous rows match. The marketplace lists no PRIVATE,
      INVITE_ONLY or VinUni-only challenges.

### 6b. Demo student (Jordan)

| URL | Expected |
|---|---|
| `/faculty`, `/partner`, `/partner/students`, `/review` | 404 |
| `/workspace/44444444-4444-4444-8444-000000000008` (Bao and Hoang's project) | 404 |
| `/offer/44444444-4444-4444-8444-000000000008` | 404 |
| `/workspace/44444444-4444-4444-8444-000000000005` (Jordan's active project) | 200 |
| `/challenges/merchant-churn-model` | 200, masked ("Organisation revealed after…") |

- [ ] **B2** All demo-student rows match.
- [ ] **B3** Restricted resources: in Jordan's project workspace, NDA-gated
      resources behave per the recorded agreements; no restricted URL appears
      in the page source for a user without the agreement.
- [ ] **B4** Changing IDs in URLs (increment a digit, use a random UUID or a
      non-UUID string) always gives 404, never 500.

---

## 7. Demo-student journey content checks (D)

Read-only checks: look, don't click actions.

- [ ] **J1** Profile, Inbox, Applications, application detail and workspace
      pages all load.
- [ ] **J2** Deadlines show campus dates; "Closes today" or "Closed" is
      consistent with the date shown.
- [ ] **J3** Start dates read "Planned start …". A completed project with a
      future planned start reads "Completed · Planned start …".
- [ ] **J4** No promises of proctoring, interviews, timed notifications,
      "within N working days" decisions, or cooldowns anywhere in the
      challenge, assessment or result pages.
- [ ] **J5** Member counts include accepted members only.
- [ ] **J6** Offer page for application `…0002`: either live with Accept/Decline
      (leader) or clearly "Offer expired" with no actions, matching DB6.
- [ ] **J7** Completed project (`…0007`) is readable with no editing controls;
      the final-review project (`…0006`) shows the correct status.
- [ ] **J8** No "AI shortlist" or ranking claims anywhere.
- [ ] **J9** Pages are usable at 1280×720 and 1920×1080 projector resolutions,
      and at 125% browser zoom.

---

## 8. Irreversible actions on the shared demo database

Decide in advance which of these, if any, will be performed live. Each one
permanently changes the demo for every future visitor:

| Action (as the demo student) | Permanent effect |
|---|---|
| Edit profile | Changes Jordan's profile for everyone |
| Apply to a challenge | Creates an application and a supervision request |
| Withdraw an application | Terminal; cannot be reopened |
| Start an assessment | Starts a single attempt and its timer |
| Accept or decline an offer | Accept creates a project; decline is terminal |
| Accept an NDA | Records an agreement |
| Submit milestone work | Creates a new review round |

- [ ] **X1** The list of live actions is agreed: `__________`.
- [ ] **X2** Each agreed action was rehearsed on **L** first.
- [ ] **X3** If a live action must be repeatable across several demos, a
      data-refresh plan exists (section 14).

---

## 9. Full multi-role rehearsal (L)

Needed if any non-student role will be shown (see section 0).

- [ ] **L1** Start from a clean disposable database (recipe in R9), run
      `pnpm dev --webpack` with `AUTH_SELF_SERVICE_ENABLED=true` and
      `AUTH_DEV_PERSONAS_ENABLED=true`.
- [ ] **L2** Run [`manual-role-play-test-flow.md`](manual-role-play-test-flow.md)
      sections 2–5 end to end: challenge → review/publish → application with
      invitees → supervision → selection → offer → project → milestone revision
      round → dual approval → final review → Completed.
- [ ] **L3** Alternative paths (flow section 4): supervision decline and
      reroute; leader withdrawal; offer decline; final-review "Request more
      work"; invite-only grant and revoke; private challenge masking.
- [ ] **L4** Time-based cases (flow section 6), using SQL on the **disposable**
      database only: assessment pass/fail with `passing_score = 60`, expired
      supervision, expired offer, deadline-day behaviour.
- [ ] **L5** Concurrency in the browser: two-tab application submit, two-tab
      selection, a stale-round milestone approval, and a double-click on
      Accept. Each gives a controlled message and no duplicate records.
- [ ] **L6** Role access matrix (below) spot-checked for every role.
- [ ] **L7** If roles will be demonstrated from **L**, prepare the exact
      accounts and data on the presenting laptop and **do not reset** it
      afterwards.

### Role access matrix (L)

| Page | Anon | Student (member) | Other student | Supervisor | Other faculty | Owner partner | Other partner | CAID (managing) | E-Lab |
|---|---|---|---|---|---|---|---|---|---|
| Public challenge detail | ✓ preview | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ preview | ✓ | ✓ |
| Draft / under-review challenge | 404 | 404 | 404 | 404 | 404 | ✓ owner page | 404 | ✓ review | 404 |
| Team review `/partner/challenges/…/teams/…` | → sign-in | 404 | 404 | 404 | 404 | ✓ | 404 | 404 | 404 |
| Grading `/faculty/assessments/…` | → sign-in | 404 | 404 | ✓ | 404 | 404 | 404 | 404 | 404 |
| Offer `/offer/…` | → sign-in | leader ✓ actions; accepted member read-only; declined 404 | 404 | 404 | 404 | 404 | 404 | 404 | 404 |
| Workspace `/workspace/…` | → sign-in | ✓ | 404 | ✓ | 404 | ✓ | 404 | ✓ read | 404 |

---

## 10. Production-build parity (P)

- [ ] **P1** On a disposable database, run `pnpm exec next build --webpack`,
      then `NODE_ENV=production pnpm start`. Confirm the sign-in page hides
      test personas and one-click identities, and the demo form appears only
      when `AUTH_DEMO_PASSWORD` is set.
- [ ] **P2** Anonymous boundary rows (6a) behave the same as on **D**.
- [ ] **P3** Note: production cookies are `Secure`, so signing in over plain
      `http://localhost` may not behave like the HTTPS deployment. Use **P** for
      rendering and routing checks; confirm sign-in on **D**.

---

## 11. Browsers and devices

- [ ] **U1** Presenting laptop + browser (exact machine and version):
      `__________` — full demo-student journey passes.
- [ ] **U2** Chrome, Safari and Firefox (current versions): smoke S1–S9 pass.
- [ ] **U3** Mobile width (375 px): marketplace, challenge detail, sign-in and
      workspace are usable with no horizontal scrolling.
- [ ] **U4** Assessment preflight: the fullscreen check passes on the presenting
      browser. If an assessment will be started live, rehearse it on that
      machine first. Leaving fullscreen or switching tabs counts as a warning,
      and three warnings submit the test.
- [ ] **U5** Projector: text is readable; no content is cut off at the projector
      resolution.

---

## 12. Performance and resilience (D)

- [ ] **F1** Cold start: the first request after about 15 minutes idle finishes
      within an acceptable time. Record: `____`. Warm the site shortly before
      presenting.
- [ ] **F2** Key pages (marketplace, challenge detail, workspace) load in under
      about 3 seconds when warm.
- [ ] **F3** 3–5 people browse and sign in at the same time for 5 minutes: no
      errors or timeouts. Each Vercel function holds one pooled connection, so
      this checks the Supabase pooler.
- [ ] **F4** With DevTools network throttling (Fast 3G), pages still render and
      show loading states rather than blank screens.
- [ ] **F5** The venue network reaches the Vercel domain and Supabase Singapore;
      a mobile hotspot is available as backup.

---

## 13. Observability during testing and the demo

- [ ] **O1** Vercel runtime logs show no errors during sections 5–7. Note the
      deployment ID: `__________`.
- [ ] **O2** Browser console is clean on every visited page.
- [ ] **O3** Supabase logs and advisors show no new warnings after testing.
- [ ] **O4** Someone other than the presenter keeps Vercel logs open during the
      demo.

---

## 14. Rollback and fallback

- **Application failure:** promote the previous Vercel deployment (Vercel →
  Deployments → previous → Promote). Rehearse this once: **K1** [ ].
- **Demo data broken or stale:** follow the runbook recovery — new Supabase
  project, apply the version-controlled migrations, run the one-time provisioner
  with synthetic fixtures only, update Vercel's `DATABASE_URL`, redeploy. This
  takes time; do it before demo day, not during. **K2** [ ].
- **Venue network or hosting failure:** keep the local environment (**L**)
  prepared on the presenting laptop with the rehearsed accounts, plus a short
  screen recording of the full flow. **K3** [ ].

---

## 15. Demo-day timeline

- **T-48h:** release gates (section 2) on the final commit; deploy; sections
  3–7; multi-role rehearsal (section 9) if needed.
- **T-24h:** DB6 data-age check; decide on data refresh; freeze deployments —
  no merges after this point.
- **T-2h:** health check (S1), smoke S2–S9 on the presenting laptop, venue
  network check (F5), prepare fallback (K3).
- **T-15min:** warm the site (F1); open the tabs you will use; sign in if the
  demo starts signed in; silence notifications; set the display resolution.
- **During:** a second person watches logs (O4); avoid unplanned irreversible
  actions (section 8).
- **After:** review logs and advisors; note any data changes made live; record
  issues found.

---

## 16. Known limits (say them, don't hide them)

- On the deployed server only the student view is available (section 0).
- No screens for creating assessments, uploading files or resources, or signing
  NDAs; those records come from fixtures. Deliverables are shared by link.
- No email or push notifications; the Inbox is the only channel.
- No interview step; partners decide directly.
- Assessment lockdown is enforced in the browser only; violations are not
  recorded server-side.
- Phase 7 skill matching is deferred; there is no AI ranking.

---

## 17. Sign-off

| Section | Env | Tester | Date | Result | Notes |
|---|---|---|---|---|---|
| 2 Release gates | Local | | | | |
| 3 Configuration | D | | | | |
| 4 Database | D | | | | |
| 5 Smoke | D | | | | |
| 6 Boundaries | D | | | | |
| 7 Journey content | D | | | | |
| 8 Irreversible actions agreed | — | | | | |
| 9 Multi-role rehearsal | L | | | | |
| 10 Production parity | P | | | | |
| 11 Browsers/devices | D | | | | |
| 12 Performance | D | | | | |
| 13 Observability | D | | | | |
| 14 Fallback ready | — | | | | |

**Go / no-go decision:** `__________` **By:** `__________` **Date:** `__________`
