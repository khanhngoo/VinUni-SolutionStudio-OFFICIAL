# VinUniversity Solutions Studio — Product Requirements Document

**Version:** 0.9 (Design Handoff Draft)
**Date:** 27 July 2026
**Status:** Ready for wireframing
**Primary consumer of this doc:** Claude Design (wireframe generation), then engineering
**Supersedes/extends:** *VinUni Solutions Studio Platform — High-Level Product Overview, Draft 1.0 (30 May 2026)*

> **How to use this document.** Sections 1–13 define behaviour. Section 14 is the screen inventory (the wireframe backlog). Section 15 gives per-screen layout specs. Section 16 is a copy-pasteable brief for the design tool. Section 17 lists open decisions that will change wireframes if answered differently — do not block on them; wireframe the stated default and annotate.

---

## 1. Product Summary

The Solutions Studio Platform is a VinUniversity-operated marketplace where companies, faculty, labs, and research groups post **Challenges** — a single umbrella term covering short projects, mini-internships, and research internships — and VinUni students apply through a **gated, multi-stage qualification pipeline** rather than a simple "apply and hope" job board.

The product's differentiating mechanic is **earned disclosure**: a challenge's real details, sensitive materials, and the poster's contact information are hidden until a student has passed every gate. This protects partner confidentiality, filters out low-intent applications, and makes selection defensible to the university.

Student suitability is assessed from a **parsed CV** (the single source of profile truth), combined with **objective test results** and a **live interview**, with academic and departmental oversight at two checkpoints.

### The core loop, in one line

> Browse Challenge → Nominate Faculty Supervisor → **Faculty approval** → **CAID approval** → **Lockdown assessment** → **Interview (MS Teams)** → **Selection** → *Full details + contacts unlocked* → Execute in Workspace → Deliver & Evaluate.

---

## 2. Goals and Non-Goals

### Goals (MVP)

| # | Goal | Success signal |
|---|---|---|
| G1 | Give students a single place to find and win real challenges | ≥ 60% of published challenges receive ≥ 3 qualified applications |
| G2 | Make suitability evidence-based, not self-declared | 100% of applications carry a parsed CV profile + assessment score |
| G3 | Keep faculty in the academic loop without making them a bottleneck | Median faculty decision < 5 working days |
| G4 | Give CAID operational control and an audit trail | Every stage transition logged with actor, timestamp, reason |
| G5 | Protect partner confidentiality by default | Zero disclosure of sensitive challenge content pre-selection |
| G6 | Reduce time-to-start for a matched student | Median application → kickoff < 21 days |

### Non-Goals (MVP)

- Open bidding, rate negotiation, or freelancer-style proposals.
- Payment, payroll, stipend disbursement, or credit registration (record intent only; execute off-platform).
- Full LMS features (grading, attendance, transcripts).
- Replacing MS Teams for meetings — the platform **schedules and links**, it does not host video.
- Automated selection. AI ranks and explains; humans decide. Always.

---

## 3. Roles and Permissions

Five roles. Two distinct portals (Main App and CAID Portal) plus a public marketing surface.

| Role | Portal | Core responsibility |
|---|---|---|
| **Student** | Main App | Build CV-derived profile, apply, complete assessment + interview, execute challenge |
| **Faculty Supervisor** | Main App | Accept/decline supervision requests, mentor, approve scope, evaluate |
| **Challenge Poster** (company rep, professor, lab PI) | Main App | Post challenge, review candidates, interview, select, review deliverables |
| **CAID Officer** | **CAID Portal** | Verify partners, approve challenges, approve applications, configure assessments, oversee pipeline, resolve disputes, report |
| **Super Admin** | CAID Portal | Role/permission management, system config, audit log access |

> A faculty member can hold both **Faculty Supervisor** and **Challenge Poster** roles. The UI must support a role switcher in the top bar for dual-role accounts. A person may never supervise and post on the same challenge instance — block this with a validation message.

### Permission matrix (abbreviated — full CRUD matrix in Appendix A of the eng spec)

| Object | Student | Faculty | Poster | CAID |
|---|---|---|---|---|
| Challenge (public tier) | R | R | R | R |
| Challenge (full detail) | R *after selection only* | R *if supervising* | CRUD *own* | R all, U status |
| Own profile | CRUD | CRUD | CRUD | R |
| Other student profiles | — | R *applicants to own challenges* | R *applicants, tiered* | R all |
| Application | CRU *own* | R + decide *nominated* | R + decide *own challenge* | R + decide *all* |
| Assessment results | R *own summary* | R *supervised* | R *applicants* | CRUD |
| Audit log | — | — | — | R |

---

## 4. Glossary and Core Objects

| Object | Definition |
|---|---|
| **Challenge** | The universal unit of opportunity. Sub-typed as `Project`, `Mini-Internship`, or `Research Internship`. Sub-type changes default duration, workload, deliverable templates, and assessment routing — not the UI structure. |
| **Poster** | The organisation or person who owns the challenge (company, faculty member, lab). |
| **Faculty Supervisor** | The VinUni academic who sponsors a student's participation. Nominated by the student, must consent. |
| **Application** | A student's attempt at one challenge. Carries the pipeline state. One student may hold **max 2 active applications** and **1 active challenge** at a time (default; configurable by CAID). |
| **Student Profile** | The structured record derived from an uploaded CV, then confirmed and enriched by the student. |
| **Assessment** | A proctored, time-boxed, lockdown test. Two tracks: **Cognitive** and **Technical (coding)**. |
| **Interview** | A scheduled MS Teams session between poster and student. |
| **Reveal** | The state transition at which full challenge detail and poster contact become visible to the selected student. |
| **Workspace** | The post-reveal execution area: milestones, deadlines, meetings, deliverables, resources. |

### Colleges (fixed taxonomy — use everywhere as filter, tag, and routing input)

| Code | Name | Default assessment lean |
|---|---|---|
| **CAS** | College of Arts and Sciences | Cognitive |
| **CBM** | College of Business and Management | Cognitive + Case |
| **CECS** | College of Engineering and Computer Science | Technical (coding) |
| **CHS** | College of Health Sciences | Cognitive + Domain scenario |

---

## 5. Progressive Disclosure Model

**This is the most important thing for the wireframes to get right.** Every challenge-facing screen must render one of four tiers. Design each tier explicitly; do not design only the full-detail version.

| Tier | Who sees it | What is visible | What is masked |
|---|---|---|---|
| **T0 — Public** | Anonymous visitors | Title, sub-type, domain tags, skill tags, duration, college fit, application deadline, *organisation category* ("Fintech scale-up, Hanoi") | Org name, poster identity, problem statement, deliverables, attachments |
| **T1 — Authenticated Student** | Any logged-in student | Everything in T0, plus org name (unless confidential), summary problem framing, required/preferred skills, workload, eligibility rules, assessment type & duration, expected interview format, selection timeline | Detailed problem statement, data/resource access, poster contact, attachments, budget/compensation specifics |
| **T2 — In Pipeline (post-CAID approval)** | Applicants who cleared CAID | Everything in T1, plus assessment logistics, interviewer's role & title (not personal email), interview scheduling window, evaluation criteria | Poster direct contact, sensitive attachments, proprietary data |
| **T3 — Selected** | Selected student + faculty supervisor | **Everything.** Full problem statement, technical appendices, datasets, NDA-gated documents, poster name/email/phone, internal stakeholder map | — |

**Design requirement:** masked content is never a blank space. Use a **locked block** component — greyed content silhouette + lock icon + one line explaining the unlock condition ("Full brief unlocks after you're selected"). This makes the funnel legible and motivating rather than confusing.

---

## 6. CV Ingestion and Student Profile

The CV is the **single entry point** to a usable profile. A student cannot apply to any challenge without a confirmed parsed profile.

### 6.1 Flow

1. **Upload** — PDF or DOCX, max 10 MB. Drag-drop zone + file picker. Show file name, size, and a parsing progress state (est. 15–30s).
2. **Parse** — system extracts into structured fields (see 6.2).
3. **Review & Confirm** — a two-column screen: extracted field on the left, source snippet highlighted from the CV preview on the right. Every field is editable. Fields carry a **confidence indicator** (High / Medium / Needs review). All `Needs review` fields must be resolved before confirming.
4. **Enrich** — student adds items the CV cannot supply: availability (hours/week + date range), work preference (on-site / hybrid / remote), interests, challenge-type preference, consent flags.
5. **Confirmed profile** — becomes the applicant record. Re-uploading a CV creates a **new version**; the student re-confirms deltas only (show a diff view).

### 6.2 Extracted fields

| Group | Fields |
|---|---|
| **Identity** | Full name, VinUni email, phone, LinkedIn, GitHub, personal site |
| **Academic** | College (CAS/CBM/CECS/CHS), major, minor, year of study, expected graduation, **GPA + scale**, relevant coursework, academic honours |
| **Skills** | Technical skills, tools/software, languages (human) with proficiency, soft skills — each normalised to a controlled skill taxonomy with a raw-text fallback |
| **Experience** | Role, organisation, dates, location, employment type (internship/part-time/volunteer), bullet achievements |
| **Projects** | Title, description, role, tech/methods used, link, associated course or lab |
| **Research** | Publications, posters, conferences, lab affiliations, PI |
| **Other** | Certifications, awards, competitions/hackathons, extracurricular leadership |

### 6.3 Profile derivatives shown in UI

- **Profile Completeness meter** (0–100%) with the three highest-impact next actions.
- **Skill chips** grouped by verified source: `From CV` / `From project evidence` / `Self-declared` / `Assessment-verified`. Different visual weights — this distinction feeds matching credibility and should be visible to posters.
- **Eligibility badges** — computed: year, college, GPA band, availability window.

### 6.4 GPA handling

Store value + scale (4.0 / 100 / other). Display as-is with scale label. Challenges may set a minimum GPA gate; if a student is below it, the apply button is disabled with an inline reason and a "request exception" link routed to CAID. **Never hide the challenge** — visible-but-gated is clearer than absent.

### 6.5 Consent

Explicit, granular toggles at profile confirmation:

- [ ] Allow my profile to be surfaced to challenge posters in AI recommendations
- [ ] Allow CAID to share my profile with verified partners for unposted opportunities
- [ ] Show my GPA to posters *(default off — CAID sees it regardless)*
- [ ] Allow completed challenges to appear in public success stories

---

## 7. The Application Pipeline (Core State Machine)

Wireframes must render this as a **persistent horizontal stepper** at the top of every application-detail screen, and as a compact pill in list views.

```
[1] DRAFT
     ↓ submit
[2] PENDING_FACULTY ──── declined ──→ FACULTY_DECLINED (student may re-nominate: max 2 re-nominations)
     ↓ accepted
[3] PENDING_CAID ─────── rejected ──→ CAID_REJECTED (terminal, reason required)
     ↓ approved + assessment assigned
[4] ASSESSMENT_PENDING → ASSESSMENT_IN_PROGRESS → ASSESSMENT_SUBMITTED
     ↓ scored ≥ threshold                        ↓ below threshold
[5] INTERVIEW_SCHEDULING                     ASSESSMENT_FAILED (terminal for this challenge;
     ↓ slot booked                            30-day cooldown before re-testing elsewhere)
[6] INTERVIEW_SCHEDULED → INTERVIEW_COMPLETED
     ↓ poster decision
[7] SELECTED ──────────── or ──→ NOT_SELECTED (terminal, feedback optional)
     ↓ student accepts offer (72h to respond)
[8] ACTIVE  ← *** REVEAL EVENT: T3 disclosure fires here ***
     ↓
[9] IN_REVIEW → [10] COMPLETED
     
Side states available from [1]–[7]: WITHDRAWN (student), EXPIRED (deadline passed), ON_HOLD (CAID)
```

### 7.1 Stage detail

| Stage | Actor | Inputs required | SLA (default) | Notifications fired |
|---|---|---|---|---|
| **1. Draft** | Student | Motivation statement (≤ 300 words), relevant evidence selected from profile (pick up to 5 projects/experiences), faculty nomination | — | — |
| **2. Faculty review** | Faculty | Accept / Decline / Request more info. On accept: confirm supervision capacity + whether academic credit is intended | 5 working days | To faculty on submit; to student on decision; reminder to faculty at day 3 |
| **3. CAID review** | CAID Officer | Checklist: eligibility, GPA/credit-load conflict, prior/active challenge conflict, partner verification status, confidentiality tier, **assessment track assignment** | 3 working days | To CAID queue on faculty accept; to student + faculty on decision |
| **4. Assessment** | Student | Complete within a **7-day window** from assignment | 7-day window | Assigned, T-48h reminder, T-12h reminder, result |
| **5–6. Interview** | Poster + Student | Poster publishes ≥ 3 slots within 5 days; student books one | Book within 5 days of offer | Slots available, booked, T-24h, T-1h, no-show follow-up |
| **7. Decision** | Poster | Select / Not select + structured rating + optional feedback | 5 working days post-interview | To student, faculty, CAID |
| **8. Reveal & Kickoff** | System → Student | Student accepts within 72h; NDA e-sign if required | 72h | Reveal notice, NDA reminder, kickoff scheduled |

### 7.2 Faculty nomination rules

- Student browses a **Faculty Directory** filtered by college, department, research area, and **current supervision load** (`3 of 5 slots used` — shown as a capacity bar).
- Faculty who are full are shown but not selectable, with "at capacity this term".
- A challenge may **pre-designate** an eligible faculty list or a required supervisor; if so, the picker is pre-filtered and labelled.
- Faculty decline reasons are structured: `At capacity` / `Outside my expertise` / `Concerns about student readiness` / `Scheduling conflict` / `Other`. Reason is visible to CAID, and to the student **in generalised form only**.

---

## 8. Assessment Module (Lockdown)

### 8.1 Track routing

The track is **proposed by the system, confirmed by CAID** at stage 3. Routing inputs:

| Signal | Effect |
|---|---|
| Challenge `required_skills` includes programming languages / data tooling | → Technical (coding) |
| Challenge sub-type = `Research Internship` + non-computational domain | → Cognitive + Domain scenario |
| Poster explicitly sets `assessment_requirement` on the challenge | Overrides system proposal |
| Student's college | Tie-breaker and difficulty calibration only — **never a hard gate** |
| Student holds a valid assessment result < 90 days old, same track, ≥ threshold | → **Skip**, reuse score (show "reused from [date]") |

CAID can always override to `Cognitive`, `Technical`, `Both`, or `Waived` (waiver requires a reason).

### 8.2 Cognitive track

- 35–45 minutes, sectioned: numerical reasoning, logical/abstract reasoning, verbal/critical reasoning, situational judgement.
- Optional appended **case module** for CBM challenges (short written response, 15 min).
- Per-section timers, no back-navigation between sections, back-navigation allowed within a section.

### 8.3 Technical track

- 60–90 minutes, 2–3 problems, integrated code editor with language selection, run-against-sample-tests, submit-for-full-tests.
- Score = correctness + test coverage + complexity/efficiency signal.

### 8.4 Lockdown behaviour (design these states)

| Control | Behaviour | UI |
|---|---|---|
| Pre-flight check | Browser, camera (if proctored), connection, fullscreen capability | Checklist screen with pass/fail per item; cannot start until all pass |
| Rules acknowledgement | Explicit consent screen listing every monitored behaviour | Checkbox + "I understand" button |
| Fullscreen enforcement | Exiting fullscreen triggers a warning overlay + counter | Modal: "Return to fullscreen. Warning 1 of 3." |
| Tab/window switching | Logged and counted; 3 violations → auto-submit | Persistent violation counter in the top bar |
| Copy / paste / right-click | Disabled in question area; enabled inside code editor only for the student's own code | Toast on blocked action |
| Timer | Always visible, top-right, colour shift at 25% and 10% remaining | Sticky header |
| Autosave | Every 15s + on every answer change | Subtle "Saved" indicator |
| Disconnect | 5-minute grace window; timer keeps running; resume to exact state | Reconnect screen with countdown |
| Single attempt | Enforced; no restart | Blocked-entry screen if re-accessed |

### 8.5 Result presentation

| Audience | Sees |
|---|---|
| **Student** | Pass/fail against the threshold, overall band (e.g. "Strong / Proficient / Developing"), section-level bands, **no raw percentile against other applicants** |
| **Poster** | Overall score, section breakdown, percentile among this challenge's applicants, time taken, integrity flags |
| **Faculty** | Same as poster, for supervised students only |
| **CAID** | Everything, including full proctoring event log |

---

## 9. Interview Module

- Poster publishes availability slots (30/45/60 min options). Platform generates an **MS Teams meeting link** per booked slot and writes it to both calendars.
- Student sees a **prep card**: interviewer role/title, format, duration, topics likely covered, T2-tier challenge context, "what to bring".
- Panel interviews supported: multiple interviewers, one primary decision-maker.
- Post-interview, poster completes a **structured scorecard** before the decision unlocks: technical/domain fit, communication, motivation, availability realism, overall recommendation (1–5 + Yes/No/Maybe). Free-text notes optional.
- Reschedule allowed once per side, ≥ 24h notice. No-shows flagged; two no-shows by a student = 30-day application freeze (CAID can lift).

---

## 10. The Reveal

The single most designed moment in the product. On transition to `SELECTED` → student accepts → `ACTIVE`:

1. **Offer screen** — congratulations state, challenge summary, faculty supervisor confirmed, commitment terms (hours/week, duration, deliverables, compensation/credit status), NDA requirement flag, 72h countdown, `Accept` / `Decline` .
2. **NDA gate** (if required) — e-signature step; T3 content stays locked until signed.
3. **Reveal transition** — previously locked blocks visibly unlock. Show a short "What's now available to you" summary: full brief, attachments, datasets, poster contact card, workspace.
4. **Kickoff checklist** — auto-generated: confirm milestones, schedule kickoff meeting, review resources, acknowledge communication rules.

---

## 11. Execution Workspace

Created on `ACTIVE`. Members: student(s), faculty supervisor, poster, CAID observer (read-only unless escalated).

| Tab | Contents |
|---|---|
| **Overview** | Full brief (T3), status, progress bar, next deadline, people, quick actions |
| **Milestones** | Timeline/Gantt-lite + list. Each milestone: title, due date, owner, status (`Not started`/`In progress`/`Submitted`/`Approved`/`Revision requested`), linked deliverables |
| **Deliverables** | Upload zone, version history, reviewer, review status, feedback thread per deliverable. Types: report, code repo link, dataset, prototype link, presentation, dashboard |
| **Resources** | Poster-supplied materials, datasets, access credentials (masked, request-to-reveal), reference docs, NDA-tier badge per file |
| **Meetings** | Upcoming + past, Teams links, agenda, notes, attendance |
| **Updates** | Chronological progress log; student posts weekly update (configurable cadence), stakeholders comment |
| **Evaluation** | Appears at `IN_REVIEW`. Poster + faculty each complete an evaluation; student completes a reflection + partner rating |

**Deadline tracking** is cross-cutting: a persistent "Next due" element on the student dashboard, the workspace header, and email/in-app reminders at T-7d, T-2d, T-1d, and overdue.

---

## 12. AI Assistance (scoped)

AI is decision-support, ranked below every human gate.

| Feature | Where | Output |
|---|---|---|
| CV parsing & skill normalisation | Onboarding | Structured fields + confidence |
| Challenge recommendations | Student dashboard & marketplace | Ranked challenges + one-line "why this fits you" |
| Candidate ranking | Poster candidate pipeline | Fit score, skill match table, evidence citations, strengths, gaps |
| Application summarisation | Faculty & CAID review screens | 5-line summary of the applicant against this challenge |
| Deliverable/meeting summarisation | Workspace | *Post-MVP* |

**Explainability requirement:** any fit score must be accompanied by the evidence that produced it, with links to the specific profile items. A bare number is not acceptable in the UI.

---

## 13. Notifications

Channels: in-app centre + email. (Post-MVP: MS Teams bot.)

| Event | Student | Faculty | Poster | CAID |
|---|---|---|---|---|
| Application submitted | ✓ | ✓ | — | — |
| Faculty decision | ✓ | — | — | ✓ |
| CAID decision | ✓ | ✓ | ✓ | — |
| Assessment assigned / reminders / result | ✓ | — | on result | on result |
| Interview slots published / booked / reminders | ✓ | — | ✓ | — |
| Selection decision | ✓ | ✓ | — | ✓ |
| Offer expiring (T-24h) | ✓ | — | — | — |
| Milestone due / overdue | ✓ | ✓ | ✓ | on overdue |
| Deliverable submitted / reviewed | ✓ | ✓ | ✓ | — |
| Challenge published / expiring | — | — | ✓ | ✓ |

Each notification carries a single primary action deep-link.

---

## 14. Screen Inventory (Wireframe Backlog)

**P0** = required for clickable MVP prototype. **P1** = second pass. **P2** = later.

### Public (3)

| ID | Screen | Priority | Notes |
|---|---|---|---|
| PUB-01 | Landing / marketing home | P1 | Value prop, featured challenges (T0), partner logos, CTAs by role |
| PUB-02 | Public challenge browse | P0 | T0 tier cards, filters, "Sign in to see more" gate |
| PUB-03 | Sign in / SSO | P0 | VinUni SSO primary, partner email/password secondary |

### Student (17)

| ID | Screen | Priority | Notes |
|---|---|---|---|
| STU-01 | CV upload | P0 | Drag-drop, parsing progress |
| STU-02 | Parsed profile review & confirm | P0 | Two-column, confidence flags, inline edit |
| STU-03 | Profile enrichment (availability, preferences, consent) | P0 | |
| STU-04 | Student dashboard | P0 | Next actions, active applications, recommendations, deadlines |
| STU-05 | Challenge marketplace | P0 | T1 cards, filter rail, sort, save |
| STU-06 | Challenge detail (T1) | P0 | **Must show locked blocks** |
| STU-07 | Apply — Step 1: fit & motivation | P0 | Evidence picker from profile |
| STU-08 | Apply — Step 2: faculty nomination | P0 | Directory, capacity bars, filters |
| STU-09 | Apply — Step 3: review & submit | P0 | Full summary + declarations |
| STU-10 | My applications (list) | P0 | Stage pills, sort by urgency |
| STU-11 | Application detail / pipeline tracker | P0 | Persistent stepper, per-stage panel, SLA countdown |
| STU-12 | Assessment pre-flight check | P0 | System checks, rules consent |
| STU-13 | Lockdown assessment — cognitive | P0 | Timer, sections, violation counter |
| STU-14 | Lockdown assessment — technical/coding | P0 | Editor, test runner, timer |
| STU-15 | Assessment result | P0 | Bands, next step |
| STU-16 | Interview booking | P0 | Slot picker, prep card |
| STU-17 | Offer / reveal | P0 | Countdown, accept/decline, NDA |
| STU-18 | Workspace — Overview | P0 | T3 content |
| STU-19 | Workspace — Milestones | P0 | |
| STU-20 | Workspace — Deliverables + submit modal | P0 | |
| STU-21 | Workspace — Resources / Meetings / Updates | P1 | Tabs |
| STU-22 | Notifications centre | P1 | |
| STU-23 | Public profile view (as a poster sees it) | P1 | Preview mode toggle |

### Faculty (6)

| ID | Screen | Priority | Notes |
|---|---|---|---|
| FAC-01 | Faculty dashboard | P0 | Pending requests, supervised projects, capacity |
| FAC-02 | Supervision request inbox | P0 | Queue with student + challenge summary |
| FAC-03 | Supervision request detail | P0 | AI summary, CV highlights, accept/decline/request info |
| FAC-04 | Supervised projects list + detail | P1 | |
| FAC-05 | Capacity & availability settings | P1 | Slots per term, expertise tags |
| FAC-06 | Evaluation form | P1 | Shared component with poster |

### Challenge Poster (8)

| ID | Screen | Priority | Notes |
|---|---|---|---|
| POS-01 | Poster dashboard | P0 | Challenges by status, candidates awaiting action |
| POS-02 | Post a challenge — wizard (4 steps) | P0 | Basics → Requirements → Conditions & visibility → Assessment & review |
| POS-03 | My challenges list | P0 | Status chips |
| POS-04 | Candidate pipeline (kanban by stage) | P0 | Columns mirror §7 state machine |
| POS-05 | Candidate detail | P0 | Profile + fit score + evidence + assessment results |
| POS-06 | Interview slots setup | P0 | |
| POS-07 | Interview scorecard & decision | P0 | Structured rating, select/reject |
| POS-08 | Active project monitoring + deliverable review | P1 | |

### CAID Portal (9)

| ID | Screen | Priority | Notes |
|---|---|---|---|
| CAI-01 | CAID dashboard | P0 | Queue counts, SLA breaches, pipeline funnel |
| CAI-02 | Application approval queue | P0 | Filter by college, challenge, age |
| CAI-03 | Application review detail | P0 | Checklist, assessment track assignment, approve/reject/hold |
| CAI-04 | Challenge intake review queue + detail | P0 | Approve/publish/request edits, set visibility tier |
| CAI-05 | Partner verification | P1 | Verify company, contacts, agreement status |
| CAI-06 | Assessment configuration | P1 | Banks, thresholds, durations, waiver rules |
| CAI-07 | User & role management | P1 | |
| CAI-08 | Analytics & reporting | P1 | Funnel, by college, by partner, outcomes |
| CAI-09 | Audit log | P2 | |

**Total P0 screens: 33.** Suggest wireframing in this order: Student happy path (STU-01 → STU-20) → CAID gates (CAI-01–04) → Faculty gate (FAC-01–03) → Poster (POS-01–07).

---

## 15. Detailed Specs for Key P0 Screens

### STU-02 — Parsed Profile Review & Confirm

- **Layout:** split view, 55/45. Left = editable field groups in accordion sections (Academic, Skills, Experience, Projects, Other). Right = sticky CV page preview with the active field's source text highlighted.
- **Header:** "We read your CV. Check what we got." + parse quality summary ("42 fields extracted · 5 need your review").
- **Field row anatomy:** label · extracted value (inline-editable) · confidence chip · "jump to source" link.
- **Blocking rule:** sticky footer bar with "5 fields need review" and a disabled `Confirm profile` button until resolved.
- **Empty/failure state:** parse failed → "We couldn't read this file. Try a text-based PDF, or fill your profile manually."

### STU-06 — Challenge Detail (T1)

- **Above fold:** title, sub-type badge, org name (or masked category), college fit chips, duration, workload, deadline countdown, primary `Apply` button (sticky on scroll), secondary `Save`.
- **Body sections in order:** Summary framing → Required skills (must/nice, with **your match** indicator per skill) → What you'll be assessed on (track, duration) → Selection timeline (visual, 5 steps with estimated days) → Eligibility → **Locked: Full problem statement** → **Locked: Resources & datasets** → **Locked: Poster contact**.
- **Right rail:** "Your fit" card — skill overlap %, gaps listed, faculty supervisors commonly matched to this domain, similar challenges.
- **Gated state:** if ineligible (GPA/year/college), Apply is disabled with a specific reason line + "Request exception".

### STU-11 — Application Detail / Pipeline Tracker

- **Top:** horizontal 8-node stepper, current node emphasised, completed nodes with timestamps, future nodes greyed with estimated dates.
- **Main panel is stage-aware** — it renders the one thing the student can do now:
  - `PENDING_FACULTY` → "Waiting on Dr. X · submitted 2 days ago · typical response 5 days" + nudge button (available after day 4, once).
  - `ASSESSMENT_PENDING` → prominent "Start assessment" card + window countdown + what to expect.
  - `INTERVIEW_SCHEDULING` → slot picker inline.
  - `SELECTED` → offer card.
- **Side panel:** activity timeline (every state change, actor, timestamp), documents, messages.

### STU-13/14 — Lockdown Assessment

- **Chrome:** minimal. No global nav. Header only: challenge name (short), timer, question progress (`4 of 18`), violation counter, `Submit` (confirm modal).
- **Cognitive:** one question per view, answer options as large tap targets, `Previous`/`Next` within section, section-transition interstitial ("Section 2 of 4 · Logical Reasoning · 12 min").
- **Technical:** three-pane — problem statement (left), editor (centre), test output (right, collapsible). Language selector, `Run sample tests`, `Submit solution`. Problem tabs across the top.
- **Overlays to design:** fullscreen warning, tab-switch warning, time-low warning at 5 min, disconnect/reconnect, submit confirmation, auto-submit on violation cap.

### CAI-03 — CAID Application Review Detail

- **Layout:** three columns. Left = review checklist. Centre = applicant + challenge context. Right = decision panel.
- **Checklist items (each pass/fail/NA with note):** student eligibility, GPA & credit-load conflict, active-challenge conflict, faculty acceptance confirmed, partner verification status, confidentiality tier appropriate, workload realistic vs. term calendar.
- **Assessment assignment control:** system proposal shown with rationale + override dropdown (`Cognitive` / `Technical` / `Both` / `Waived`) + reason field (required on override/waive).
- **Decision panel:** `Approve & assign assessment` / `Request changes` / `Reject` (structured reason, required) / `Hold`. Bulk-approve available from CAI-02 for low-risk applications.

### POS-04 — Candidate Pipeline

- Kanban, columns = `Applied` · `Faculty approved` · `CAID approved` · `Assessment` · `Interview` · `Decision` · `Selected`.
- Card: photo/initials, name, college + year, fit score, skill-match mini-bar, assessment band (once available), days-in-stage badge (amber > SLA).
- Column headers show counts and any SLA breach count.
- Bulk actions: shortlist, publish interview slots to selected candidates, reject with template.

---

## 16. Wireframe Brief for Claude Design

**Fidelity:** low-to-mid greyscale wireframes. Structure, hierarchy, and state — not visual design. Real placeholder copy, not lorem ipsum; the copy carries meaning in this product.

**Breakpoints:** design desktop-first at 1440px for CAID/Poster/Faculty (operational, data-dense). Design **mobile-first at 390px and desktop at 1440px** for all Student screens **except STU-13/14 (assessment), which is desktop-only** — state this constraint on the screen.

**Global layout conventions**
- Top bar: logo · role switcher (if multi-role) · global search (challenges, students for posters/CAID) · notifications · avatar menu.
- Left nav in the Main App: Dashboard, Challenges, My Applications, Workspace, Profile. CAID Portal has its own nav: Dashboard, Applications, Challenges, Partners, Assessments, Users, Analytics.
- Content max-width 1200px for reading screens; full-bleed for kanban/tables.
- Single primary action per screen, top-right or sticky footer on mobile.

**Components to define once and reuse**
1. Challenge card (T0 / T1 variants)
2. **Locked block** (the disclosure primitive — most important component)
3. Pipeline stepper (horizontal, 8 nodes) + stage pill (compact)
4. Skill chip with source badge and match state
5. Confidence chip (High/Medium/Needs review)
6. Fit score card with evidence list
7. Person card (student, faculty, poster variants)
8. Capacity bar (faculty slots)
9. Review checklist row
10. Deadline/countdown element
11. Empty state (illustration slot + one-line + primary action)
12. Lockdown overlay/modal family

**States to draw for every list and detail screen:** default · empty · loading (skeleton) · error · permission-denied/gated.

**Do not draw:** brand colours, photography, marketing illustration, final typography.

---

## 17. Open Decisions

Wireframe the stated default; annotate the alternative.

| # | Question | Default to wireframe |
|---|---|---|
| D1 | Can students apply as a **team**, or individuals only? | Individuals only in MVP; poster may later group selected students into a team |
| D2 | Does faculty approval come **before** or **after** CAID? | Faculty first (as specified). Note: CAID-first would reduce wasted faculty effort — worth testing |
| D3 | Is the assessment **per challenge** or **per student, reusable**? | Reusable within 90 days for the same track (see §8.1) |
| D4 | Who sets the assessment pass threshold — CAID globally, or poster per challenge? | CAID sets a global floor; poster may raise it |
| D5 | Can a poster see a candidate's identity before the interview stage? | Yes, from CAID-approved onward. Alternative: anonymised until interview (fairness) |
| D6 | Compensation model | Record as metadata only (`Paid` / `Credit` / `Work-study` / `Unpaid` / `Prize`); no payment flows |
| D7 | Does the faculty supervisor also need to approve the **final deliverable**? | Yes — dual sign-off (faculty + poster) at `IN_REVIEW` |
| D8 | Concurrency limits | 2 active applications, 1 active challenge per student |
| D9 | Does CAID review every application, or sample high-risk ones? | Every one in MVP; add auto-approve rules once volume is known |
| D10 | Is the interview always MS Teams? | Yes for MVP (VinUni standard); design the link as a generic "Join meeting" so other providers can slot in |

---

## 18. MVP Cut Line

**In:** everything marked P0 in §14, plus the full state machine, CV parsing, both assessment tracks, Teams link generation, workspace overview/milestones/deliverables, core notifications, CAID approval and challenge intake.

**Out (post-MVP):** team formation, semantic search across labs/courses, public success-story pages, AI meeting/deliverable summarisation, payment or credit registration workflows, advanced leadership analytics, Teams bot notifications, mobile app (responsive web only), alumni/mentor role.
