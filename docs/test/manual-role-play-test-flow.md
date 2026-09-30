# Manual role-play test flow (local)

A hands-on script for testing Solution Studio as every role, on a local
development server. Work through sections 3 in order the first time; the later
sections are extra paths and "try to break it" checks.

For the pre-demo checks on the deployed server, see
[`pre-demo-deployed-test-plan.md`](pre-demo-deployed-test-plan.md).

---

## 1. Setup (about 5 minutes)

- **Enable the test sign-ups.** In `.env`, keep
  `AUTH_SELF_SERVICE_ENABLED=true` and add `AUTH_DEV_PERSONAS_ENABLED=true`.
  This adds an account-type dropdown (Student, Faculty, Partner, CAID, E-Lab)
  to the sign-up form. It only works when the app runs in development mode.
- **Start the app:** `pnpm db:up`, then `pnpm dev --webpack`, and open
  <http://localhost:3000/sign-in>.
- **Keep sessions apart.** Use one browser profile or incognito window per
  role. All tabs in the same browser share one login.
- **Your data will persist.** Everything you do is saved to your local dev
  database. `pnpm db:reset` wipes it back to the seed. It is destructive, so run
  it only when you want a clean slate.
- **Seeded one-click logins** are also on the sign-in page:
  `BAO_STUDENT_DEMO`, `PRIYA_STUDENT_DEMO`, `JORDAN_STUDENT_DEMO`,
  `HOANG_STUDENT_DEMO`, `FACULTY_PHAM_DEMO`, `BENCANG_CONTACT_DEMO`,
  `CAID_ADMIN_DEMO`, `ELAB_ADMIN_DEMO`.

## 2. Your cast

Create these through the sign-up form. Passwords need 12+ characters with at
least one letter and one number.

| Persona | Account type | Plays |
|---|---|---|
| Leader | Student | Applies and leads the team |
| Teammate | Student | Accepts the team invite |
| Decliner | Student | Declines the team invite |
| Outsider | Student | Unrelated student (should see nothing private) |
| Supervisor | Faculty | Supervises, grades, signs off |
| Other faculty | Faculty | Unrelated faculty |
| Partner | Partner → Bến Cảng Logistics | Owns the challenge |
| Other partner | Partner → Vietnam Health Foundation | Unrelated organization |
| CAID admin | CAID administrator | Managing unit that reviews |
| E-Lab admin | E-Lab administrator | The wrong managing unit |

**Check straight after sign-up:** each role lands on its own home page
(Student → Challenges, Faculty → `/faculty`, Partner → `/partner`,
CAID/E-Lab → `/review`). The navigation shows only that role's links.

## 3. Main role-play: from challenge to completed project

### Act 1 — Challenge

1. **Partner:** Post a challenge. Choose *Public preview*, managing unit
   *CAID*, team size 1–3, a deadline a few days out, and a planned start date.
   - Expect a draft you can edit, then **Submit for review**.
2. **E-Lab admin:** the challenge must not appear in their review queue, and
   opening `/review/<slug>` directly gives 404.
3. **Outsider / anonymous:** the draft must not be visible on `/challenges`.
4. **CAID admin:** request revision *without* a comment (refused), then with a
   comment.
   - **Partner:** sees the reason, edits, and resubmits.
   - **CAID:** approves, then publishes.
5. **Anonymous:** sees the public preview with "Sign in to apply".
   **Leader:** sees "Apply to this challenge".
   - "Applications close <date>" and "Planned start <date>" read correctly.

### Act 2 — Application

6. **Leader, Teammate, Decliner:** set roles and weekly hours under
   Profile → Edit. With 0 hours a student shows as "Unavailable" in the invite
   picker.
7. **Leader:** open the apply wizard, invite Teammate and Decliner, write the
   motivation, nominate Supervisor, and submit.
   - Also open the wizard in a second tab beforehand and submit it after the
     first. The second tab gets a controlled "already has an active
     application" message.
8. **Teammate** accepts the invite (Inbox → Respond). **Decliner** declines.
   - **Outsider** opening the invitation link gets 404.
9. **Supervisor:** the Faculty queue shows the request with a due date (five
   working days out).
   - **Other faculty:** doesn't see it, and the direct link gives 404.
   - **Supervisor:** accepts. With no assessment configured, the application
     moves straight to "Ready for selection".

### Act 3 — Selection and offer

10. **Partner:** Challenge → pipeline → open the team.
    - It shows "2 confirmed", the declined member, the assessment result if
      there is one, and no claims of AI ranking.
    - **Other partner:** that team page gives 404.
11. **Partner:** *Select this team and issue offer*. Try double-clicking or a
    second tab: expect a controlled conflict, never a second offer.
12. **Offer page:**
    - **Leader:** sees Accept / Decline.
    - **Teammate:** sees the offer read-only, with no buttons.
    - **Decliner and Outsider:** 404.
    - **Leader:** Accept. "Open your workspace" then appears.

### Act 4 — Project

13. **Workspace access:**
    - Leader, Teammate, Supervisor, Partner and CAID can open it.
    - Decliner, Outsider, other faculty, other partner and E-Lab get 404.
14. **Deliverables tab:**
    - **Supervisor** adds milestone A. **Partner** adds milestone B.
    - **Students:** no "Add milestone" control.
15. **Revision round on milestone A:**
    - **Teammate** submits round 1.
    - **Supervisor** requests revision (a comment is required).
    - **Leader** resubmits as round 2. Round 1 stays in the history and both
      sign-offs reset to pending.
16. **Supervisor and Partner** both approve round 2 → milestone A completes.
    After only one side approves, it must *not* complete.
17. **Milestone B:**
    - A student submits.
    - **Partner** approves from `/partner/projects/...`.
    - **Supervisor** approves from the Faculty queue.
    - The project switches to **Final review** automatically, and that row
      disappears from the queue without a reload.
18. **Partner:** Close out → send feedback, including a private note.
    **Supervisor**, then **Partner**, approve the final review → **Completed**.
19. **Completed state:**
    - Everyone who had access can still read the workspace; nothing is
      editable.
    - Students see the shared feedback but never the private note.
    - The header shows "Completed · Planned start …". Completing before the
      planned start is allowed by design.

## 4. Alternative paths (one run each)

- **Supervisor declines:** the Leader sees the decline and can nominate a
  different faculty. Both requests stay in the history.
- **Leader withdraws** before selection: the application becomes terminal and
  read-only. A non-leader has no Withdraw button.
- **Leader declines the offer** instead of accepting: no project is created.
- **Final review "Request more work":** the project returns to Active, a new
  milestone can be added, and the final review restarts at round 2.
- **Invite-only challenge:**
  - **Partner** posts with *Invite only*; CAID publishes.
  - It never appears in the marketplace, and Outsider gets 404.
  - **Partner** grants Outsider by exact email; now only Outsider can see and
    apply.
  - Revoking before submission removes the access again.
- **Private challenge** (seeded `merchant-churn-model`): anonymous users and
  external partners get 404; VinUni students see a masked version
  ("Organisation revealed after…").

## 5. "Try to break it" checks (every role)

- Paste another role's URL (for example `/faculty/assessments/...`,
  `/partner/challenges/.../teams/...`, `/review/...`, `/offer/...`,
  `/workspace/...`). Every one should be a clean 404 or a redirect to sign-in —
  never a 500, never partial data.
- **Stale tab:** keep a Partner tab open on the round-1 approve button.
  Meanwhile the Supervisor requests revision and a student resubmits. Clicking
  Approve in the old tab says "A newer submission exists."
- **Refresh after every action:** what the page shows must match what the other
  roles see.
- **Honest copy:** no promises of proctoring, interviews, email notifications,
  or "within N days". Counts include accepted members only. No button is
  offered for an action the server then refuses.

## 6. Tests that need a small database nudge

These can't be reached by clicking alone; each needs one SQL statement against
your **local** dev database (for example via `pnpm db:studio`).

- **Assessment pass/fail.** There is no screen for creating assessments.
  Seeded `triage-protocol-review` has one but no pass mark, so grading records
  "no threshold configured".
  - Set `passing_score = 60` on that challenge's assessment first.
  - A student applies, the Supervisor accepts, the student takes the test, the
    Supervisor grades it: 60 passes, 59 fails.
- **Expired supervision:** set that request's `respond_by` to a past time. The
  faculty buttons become disabled, and a click from an already-open tab is
  refused.
- **Expired offer:** same with the offer's `respond_by`. The page shows "Offer
  expired" with no Accept button.
- **Deadline day:** a challenge closing today stays open until 23:59 campus
  time (Asia/Ho_Chi_Minh) and shows "Closes today". One that closed yesterday
  shows "Closed", and applying is refused.

## 7. Known limits (not bugs)

- No screens for creating assessments, uploading resources, or signing an NDA.
  Those rows exist only in seed data or via SQL.
- Files are shared by link only; nothing is uploaded.
- No emails or notifications are sent. The Inbox is the only channel.
