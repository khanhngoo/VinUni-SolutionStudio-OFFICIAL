# DEMO Seed Manifest

Phase: 3.5 compact DEMO application and team foundation  
Date: 2026-08-16

## Scope

This manifest is the authoritative compact DEMO identity, organization, and challenge-side inventory for Phase 3.2+.

Phase 3.2 seeds only:

- DEMO organizations
- DEMO organization contact users
- DEMO student users and `student_profiles`
- DEMO faculty users and `faculty_profiles`
- DEMO contact `organization_memberships`
- DEMO `student_skills` linked to existing Phase 3.1 canonical skills

Phase 3.3 adds only challenge-side DEMO records:

- DEMO `challenges`
- DEMO `challenge_skills`
- DEMO `challenge_eligibility_rules`
- DEMO `challenge_faculty_assignments`

Phase 3.5 adds only application/team foundation records:

- DEMO `applications`
- DEMO `application_members`
- DEMO `supervision_requests`

Phase 3.5 intentionally keeps `application_projects = 0` because structured student-project evidence conversion is deferred. It does not seed assessments, assessment attempts, selections, offers, agreements, projects, milestones, deliverables, feedback, matching records, notifications, or audit demo records.

## Compact Scenario Spine

The compact future DEMO workflow set is:

| Scenario coverage | Selected future fixture |
|---|---|
| Public technical challenge | `route-optimisation` |
| Confidential partner challenge | `merchant-churn-model` |
| Solo application / rejected assessment outcome | `app-triage` |
| Team application with pending invite | `app-route` |
| Reviewed assessment | `app-churn` |
| Pending supervision request | `app-outreach` + `inv-outreach` |
| Pending offer | `app-route` |
| Active project | `app-supply` |
| Final-review project | `app-energy` |
| Completed project | `app-archive` |
| Partner approval workflow | `papp-depot` |
| Internal E-Lab-managed challenge | `demo-elab-venture-readiness-dashboard` |

`multimodal-perception` is not used as the public technical challenge because `org-vinai` is excluded until organization classification is explicitly approved. `route-optimisation` preserves public technical coverage through deterministic partner `org-bencang`.

## Organizations Selected

| Stable seed key | Source fixture ID | Display name | Organization type | Why required | Later scenarios supported | Classification confidence |
|---|---|---|---|---|---|---|
| `org:demo-bencang` | `org-bencang` | Bến Cảng Logistics | `EXTERNAL_PARTNER` | Anchor partner for logistics, route, churn, supply, pending offer, active project, and partner approval paths. | `route-optimisation`, `merchant-churn-model`, `supply-chain-dashboard`, `app-route`, `app-churn`, `app-supply`, `papp-depot` | High: fixture describes a port/distribution operator and company partner. |
| `org:demo-vhf` | `org-vhf` | Vietnam Health Foundation | `EXTERNAL_PARTNER` | Required for the public-health supervision-request path. | `community-health-outreach`, `app-outreach`, `inv-outreach` | High: fixture describes a public-health non-profit external partner. |
| `org:demo-facilities` | `org-facilities` | VinUni Facilities | `INTERNAL_UNIT` | Required for the internal campus operations final-review project path. | `campus-energy-audit`, `app-energy` | High: fixture explicitly identifies a VinUni university department. |
| `org:demo-heritage` | `org-heritage` | National Heritage Archive | `EXTERNAL_PARTNER` | Required for completed-project and close-out coverage. | `archive-digitisation`, `app-archive` | High: fixture describes an external cultural institution partner. |
| `org:demo-health` | `org-health` | VinUni Health Sciences | `INTERNAL_UNIT` | Required for the solo/rejected clinical assessment scenario. | `triage-protocol-review`, `app-triage` | High: fixture identifies a VinUni university lab/clinical research group. |

Bootstrap organizations already present and reused:

| Stable seed key | Display name | Organization type | Status |
|---|---|---|---|
| `org:caid` | CAID | `INTERNAL_UNIT` | BOOTSTRAP, already seeded |
| `org:elab` | E-Lab | `INTERNAL_UNIT` | BOOTSTRAP, already seeded |

## Users Selected

| Stable seed key | Source fixture ID | Synthetic seed email | Person type | Why required | Later scenarios supported |
|---|---|---|---|---|---|
| `user:contact-org-bencang` | `org-bencang.contact` | `contact.bencang.demo@example.test` | organization contact | Bến Cảng challenge/contact and partner review paths. | route, churn, supply, partner approval |
| `user:contact-org-vhf` | `org-vhf.contact` | `contact.vhf.demo@example.test` | organization contact | VHF challenge/contact path. | outreach supervision |
| `user:contact-org-facilities` | `org-facilities.contact` | `contact.facilities.demo@example.test` | organization contact | Campus facilities internal-unit contact path. | energy final review |
| `user:contact-org-heritage` | `org-heritage.contact` | `contact.heritage.demo@example.test` | organization contact | Archive partner/contact path. | completed project |
| `user:contact-org-health` | `org-health.contact` | `contact.health-sciences.demo@example.test` | organization contact | Clinical internal-unit contact path. | rejected clinical scenario |
| `user:stu-jordan-lee` | `stu-jordan-lee` | `student.jordan-lee.demo@example.test` | student | Central student across most static MVP flows. | all Jordan-facing compact scenarios |
| `user:stu-priya-raman` | `stu-priya-raman` | `student.priya-raman.demo@example.test` | student | Team member for churn, route, and supply paths. | `app-churn`, `app-route`, `app-supply` |
| `user:stu-minh-anh` | `stu-minh-anh` | `student.minh-anh.demo@example.test` | student | Pending invite and supply team member. | `app-route`, `app-supply` |
| `user:stu-hoang-tran` | `stu-hoang-tran` | `student.hoang-tran.demo@example.test` | student | Outreach/energy team member and depot partner approval team member. | `app-outreach`, `app-energy`, `papp-depot` |
| `user:stu-bao-tran` | `stu-bao-tran` | `student.bao-tran.demo@example.test` | student | Depot team leader for partner approval workflow. | `papp-depot` |
| `user:stu-linh-pham` | `stu-linh-pham` | `student.linh-pham.demo@example.test` | student | Archive team design member. | `app-archive` |
| `user:stu-thao-ha` | `stu-thao-ha` | `student.thao-ha.demo@example.test` | student | Archive team research member. | `app-archive` |
| `user:fac-pham` | `fac-pham` | `faculty.minh-pham.demo@example.test` | faculty | Current faculty portal user and supervisor across compact flows. | churn, outreach, supply, archive |
| `user:fac-nguyen-k` | `fac-nguyen-k` | `faculty.kevin-nguyen.demo@example.test` | faculty | Route supervision and partner approval project supervisor. | route, depot |
| `user:fac-osei` | `fac-osei` | `faculty.diane-osei.demo@example.test` | faculty | Churn/triage review and capacity contrast. | churn, triage |
| `user:fac-vu` | `fac-vu` | `faculty.lan-vu.demo@example.test` | faculty | Public-health/final-review supervision coverage. | outreach, energy |
| `user:fac-le` | `fac-le` | `faculty.thu-le.demo@example.test` | faculty | Energy/archive faculty routing coverage. | energy, archive |
| `user:fac-tran` | `fac-tran` | `faculty.bao-tran.demo@example.test` | faculty | Archive suggested-faculty coverage. | archive |

No passwords, password hashes, tokens, or auth-provider identifiers are seeded. Authentication remains Phase 6.

## Profiles

### Student Profiles

Seeded fields:

- `school` from static `college`
- `major` from static `major`
- `study_year` from static `year`
- `gpa` and `gpa_scale` only for Jordan Lee, where deterministic source values exist
- `interests` from static `about`
- `available_hours_per_week` from static `hoursAvailable`
- `profile_visibility = VINUNI_ONLY`
- `ai_matching_consent = false`

Omitted/deferred fields:

- transcripts
- courses
- pinned courses
- registrar sync timestamps
- detailed weekly availability
- live challenge count
- profile completeness
- portfolio/CV URLs unless later explicitly scoped

### Faculty Profiles

Seeded fields:

- `school` from static `college`
- `department`
- `academic_title` from static `title`
- `max_active_supervisions` from static `slotsTotal`

Omitted/deferred fields:

- `slotsUsed`, because used capacity is derived
- faculty research areas, because they are not Phase 3.2 profile fields and must not expand the skill taxonomy

## Memberships

| User | Organization | Membership role |
|---|---|---|
| `user:contact-org-bencang` | `org:demo-bencang` | `CONTACT_PERSON` |
| `user:contact-org-vhf` | `org:demo-vhf` | `CONTACT_PERSON` |
| `user:contact-org-facilities` | `org:demo-facilities` | `CONTACT_PERSON` |
| `user:contact-org-heritage` | `org:demo-heritage` | `CONTACT_PERSON` |
| `user:contact-org-health` | `org:demo-health` | `CONTACT_PERSON` |

## Student Skill Claims

All claims resolve to existing Phase 3.1 canonical skills. No new skills, aliases, relationships, or embeddings are created by DEMO seeding.

| Student seed key | Canonical skills attached |
|---|---|
| `user:stu-jordan-lee` | Python, C++, PyTorch, Computer Vision, Data Analysis, Sensor Integration, React |
| `user:stu-priya-raman` | Python, SQL, dbt, Airflow, PostgreSQL |
| `user:stu-minh-anh` | SQL, Tableau, Excel Modelling, Data Analysis |
| `user:stu-hoang-tran` | CAD, Process Design, Project Coordination, Excel Modelling |
| `user:stu-bao-tran` | Python, OR-Tools, Optimization, C++, Data Analysis |
| `user:stu-linh-pham` | Figma, React, Design Systems, User Research |
| `user:stu-thao-ha` | Stata, Econometrics, Survey Design, R |

Alias/normalization examples used:

- `Computer vision` -> `Computer Vision` through canonical lookup normalization
- `Data analysis` -> `Data Analysis` through canonical lookup normalization
- `Excel modelling` -> `Excel Modelling` through canonical lookup normalization
- `Optimisation` -> `Optimization` through the approved lexical alias

## Excluded Fixtures

| Fixture ID | Fixture name | Status | Reason |
|---|---|---|---|
| `org-vinai` | VinAI Research | EXCLUDED / AMBIGUOUS | Fixture says research lab in Hanoi, but does not deterministically establish whether it is an internal VinUni unit or external partner. Future `multimodal-perception` scenario is replaced by `route-optimisation` for compact public technical coverage. |
| `org-consumer` | Sao Mai Consumer | EXCLUDED | Unambiguous external company, but not needed in the compact scenario spine. |
| `org-mekong` | Mekong Ventures | EXCLUDED | Unambiguous external venture firm, but not needed in the compact scenario spine. |
| `org-green` | Hanoi Green Initiative | EXCLUDED | Unambiguous external non-profit, but the compact supervision-request path uses VHF instead. |
| `org-materials` | VinUni Materials Lab | EXCLUDED | Likely internal VinUni unit, but not needed after excluding `app-spectro` from the compact scenario spine. |
| `fac-rivera` | Dr. Alicia Rivera | EXCLUDED | Only needed for excluded/deferred VinAI and non-compact provider scenarios. |
| `fac-do` | Dr. Hanh Do | EXCLUDED | Only needed for non-compact consumer/market/provider scenarios. |
| `stu-duc-khanh` | Duc Khanh Vo | EXCLUDED | Directory-only capacity example not required by selected compact scenarios. |
| `stu-mai-anh-ngo` | Mai Anh Ngo | EXCLUDED | Directory-only/provider-board example not required by selected compact scenarios. |
| `stu-kien-pham` | Kien Pham | EXCLUDED | Provider-board example not required by selected compact scenarios. |
| `stu-sara-idris` | Sara Idris | EXCLUDED | Provider completed-project alternative `papp-meridian` is not selected; completed coverage uses `app-archive`. |

## Synthesized / Deferred

| Item | Status | Notes |
|---|---|---|
| E-Lab internal challenge | SYNTHESIZED DEMO / SEEDED IN PHASE 3.3 | Uses `owner_organization = E-Lab` and `managing_organization = E-Lab`. No Phase 3.5 applications are seeded for this challenge. |
| E-Lab people prerequisites | BOOTSTRAP SUFFICIENT | `user:elab-admin-dev` already exists as an E-Lab admin. No additional E-Lab contact/profile is required for Phase 3.2. |
| Skill relationships | DEFERRED | Remain zero until conservative relationships are explicitly approved. |
| Matching outputs | DEFERRED | Belong to Phase 7, not DEMO seed identity setup. |

## Challenge DEMO Records

Phase 3.3 seeds the challenge-side records needed by the compact scenario spine. Challenge rows are keyed by stable slugs and stable DEMO UUID `public_id` values. Existing rows with the same slug are updated in place; child challenge-side rows are inserted or updated by deterministic challenge/skill, challenge/rule-type, and challenge/faculty combinations.

### Challenge Selection

| Stable slug | Source fixture | Owner organization | Managing organization | Contact user | Visibility | Confidentiality | Status |
|---|---|---|---|---|---|---|---|
| `merchant-churn-model` | `merchant-churn-model` | `org:demo-bencang` | `org:caid` | `user:contact-org-bencang` | `PRIVATE` | `HIGH_CONFIDENTIALITY` | `APPLICATIONS_OPEN` |
| `route-optimisation` | `route-optimisation` | `org:demo-bencang` | `org:caid` | `user:contact-org-bencang` | `VINUNI_ONLY` | `STANDARD` | `APPLICATIONS_OPEN` |
| `triage-protocol-review` | `triage-protocol-review` | `org:demo-health` | `org:caid` | `user:contact-org-health` | `VINUNI_ONLY` | `STANDARD` | `APPLICATIONS_OPEN` |
| `community-health-outreach` | `community-health-outreach` | `org:demo-vhf` | `org:caid` | `user:contact-org-vhf` | `VINUNI_ONLY` | `STANDARD` | `APPLICATIONS_OPEN` |
| `supply-chain-dashboard` | `supply-chain-dashboard` | `org:demo-bencang` | `org:caid` | `user:contact-org-bencang` | `VINUNI_ONLY` | `STANDARD` | `APPLICATIONS_OPEN` |
| `campus-energy-audit` | `campus-energy-audit` | `org:demo-facilities` | `org:caid` | `user:contact-org-facilities` | `VINUNI_ONLY` | `STANDARD` | `APPLICATIONS_OPEN` |
| `archive-digitisation` | `archive-digitisation` | `org:demo-heritage` | `org:caid` | `user:contact-org-heritage` | `VINUNI_ONLY` | `STANDARD` | `APPLICATIONS_OPEN` |
| `demo-elab-venture-readiness-dashboard` | synthesized DEMO | `org:elab` | `org:elab` | `user:elab-admin-dev` | `VINUNI_ONLY` | `DEMO_INTERNAL` | `APPLICATIONS_OPEN` |

`APPLICATIONS_OPEN` is the Phase 3.3 marketplace-ready status for seeded DEMO challenges. Public marketplace examples are visible to VinUni users through `VINUNI_ONLY`; the confidential merchant challenge remains discoverable only through the private/confidential path represented by the seed data.

### Field Mapping Conventions

- `challenges.summary` is copied from the static challenge summary.
- `challenges.description` uses the explicit challenge-level description when available; otherwise it uses the deterministic summary fallback. Phase 3.3 does not read application `project.fullBrief`.
- `challenges.expected_deliverables` is a newline bullet list from static challenge responsibilities.
- `challenges.domain` is the comma-joined static `domainTags` list.
- `application_deadline` uses the fixture deadline at Vietnam end-of-day represented as `16:59:00.000Z`.
- Static `Work-study` compensation maps to `compensation_type = OTHER` with `compensation_description = Work-study`.
- Static `applicantCount`, `lockedBlocks`, assessment track/minutes, and interview format remain derived, deferred, or presentation-only and are not persisted in Phase 3.3.

### Challenge Skills

All challenge skill requirements resolve to the existing Phase 3.1 canonical taxonomy. Phase 3.3 creates no new skills, aliases, relationships, or embeddings.

| Challenge slug | Required skills | Preferred skills |
|---|---|---|
| `merchant-churn-model` | Python, Data Analysis, SQL | Business Modelling |
| `route-optimisation` | Python, Algorithms | Data Analysis, Operations Research |
| `triage-protocol-review` | Literature Review, Clinical Reasoning | Statistics |
| `community-health-outreach` | Programme Evaluation, Statistics | Fieldwork |
| `supply-chain-dashboard` | SQL, Data Visualization | Stakeholder Interviews |
| `campus-energy-audit` | Data Analysis, Energy Systems | Python |
| `archive-digitisation` | Archival Research, Metadata Standards | Vietnamese |
| `demo-elab-venture-readiness-dashboard` | Data Analysis, Business Modelling | Data Visualization |

British spelling fixture labels such as `Data visualisation` resolve through the approved canonical/source-label normalization to `Data Visualization`; no semantic equivalence is inferred from category membership.

### Eligibility Rules

Phase 3.3 seeds only hard gates represented by the current static eligibility logic: `MIN_GPA`, `STUDY_YEAR`, and `SCHOOL`.

| Challenge slug | Rules |
|---|---|
| `merchant-churn-model` | `STUDY_YEAR = [2,3,4]`; `SCHOOL = [CBM,CECS]` |
| `route-optimisation` | `STUDY_YEAR = [2,3,4]`; `SCHOOL = [CECS]` |
| `triage-protocol-review` | `STUDY_YEAR = [3,4]`; `SCHOOL = [CHS]` |
| `community-health-outreach` | `STUDY_YEAR = [2,3,4]`; `SCHOOL = [CHS]` |
| `supply-chain-dashboard` | `STUDY_YEAR = [2,3,4]`; `SCHOOL = [CECS,CBM]` |
| `campus-energy-audit` | `STUDY_YEAR = [2,3,4]`; `SCHOOL = [CECS]` |
| `archive-digitisation` | `STUDY_YEAR = [4]`; `SCHOOL = [CAS]` |
| `demo-elab-venture-readiness-dashboard` | `MIN_GPA = 3.5/4`; `STUDY_YEAR = [2,3,4]`; `SCHOOL = [CBM,CECS]` |

`AVAILABLE_HOURS` is not seeded as a challenge eligibility rule in Phase 3.3 because the current MVP eligibility function does not treat weekly hours as a hard gate. `weekly_hours` remains challenge display/expectation metadata.

### Faculty Routing

Phase 3.3 seeds pending `challenge_faculty_assignments` only for suggested faculty IDs already selected in Phase 3.2. These records represent challenge-side routing suggestions, not supervision requests and not project supervision.

| Challenge slug | Faculty assignments |
|---|---|
| `merchant-churn-model` | `user:fac-osei`, `user:fac-pham` |
| `route-optimisation` | `user:fac-pham`, `user:fac-nguyen-k` |
| `triage-protocol-review` | `user:fac-vu` |
| `community-health-outreach` | `user:fac-vu`, `user:fac-le` |
| `supply-chain-dashboard` | `user:fac-pham`, `user:fac-osei` |
| `campus-energy-audit` | `user:fac-nguyen-k`, `user:fac-le` |
| `archive-digitisation` | `user:fac-le`, `user:fac-tran` |
| `demo-elab-venture-readiness-dashboard` | `user:fac-pham` |

CAID-managed challenge assignments are assigned by `user:caid-admin-dev`. The E-Lab-managed synthesized challenge is assigned by `user:elab-admin-dev`.

### Challenge Reviews

Phase 3.3 intentionally seeds zero `challenge_reviews`. The selected static challenge fixtures already appear as marketplace/published records, but they do not contain durable review history with reviewer decisions/comments. Review rows remain deferred until a later checkpoint explicitly requires challenge approval history.

## Phase 3.5 Application DEMO Records

Phase 3.5 seeds the compact application spine only. Static `Application.stage` remains source material, not production authority. Application rows use stable DEMO UUID `public_id` values and are keyed in seed code by `application:<source fixture id>`.

### Application Selection

| Stable seed key | Source fixture | Public ID | Challenge slug | `submitted_by` | Team name | Phase 3.5 status |
|---|---|---|---|---|---|---|
| `application:app-triage` | `app-triage` | `44444444-4444-4444-8444-000000000001` | `triage-protocol-review` | `user:stu-jordan-lee` | `Triage Review` | `ASSESSMENT` |
| `application:app-route` | `app-route` | `44444444-4444-4444-8444-000000000002` | `route-optimisation` | `user:stu-jordan-lee` | `Last Mile` | `SELECTION_PENDING` |
| `application:app-churn` | `app-churn` | `44444444-4444-4444-8444-000000000003` | `merchant-churn-model` | `user:stu-jordan-lee` | `Retention Two` | `SELECTION_PENDING` |
| `application:app-outreach` | `app-outreach` | `44444444-4444-4444-8444-000000000004` | `community-health-outreach` | `user:stu-jordan-lee` | `Outreach Metrics` | `SUBMITTED` |
| `application:app-supply` | `app-supply` | `44444444-4444-4444-8444-000000000005` | `supply-chain-dashboard` | `user:stu-jordan-lee` | `Warehouse Four` | `SELECTION_PENDING` |
| `application:app-energy` | `app-energy` | `44444444-4444-4444-8444-000000000006` | `campus-energy-audit` | `user:stu-jordan-lee` | `Kilowatt` | `SELECTION_PENDING` |
| `application:app-archive` | `app-archive` | `44444444-4444-4444-8444-000000000007` | `archive-digitisation` | `user:stu-jordan-lee` | `Long Record` | `SELECTION_PENDING` |
| `application:papp-depot` | `papp-depot` | `44444444-4444-4444-8444-000000000008` | `route-optimisation` | `user:stu-bao-tran` | `Depot` | `SELECTION_PENDING` |

Every seeded application references an existing Phase 3.3 challenge. No application is seeded for the synthesized E-Lab challenge; that challenge remains application-free until a later fixture explicitly requires it.

### Application Member Mapping

| Application | Leader | Accepted members | Invited members | Preferred-role source |
|---|---|---|---|---|
| `app-triage` | Jordan Lee / `Research` | none | none | `soloTeam("Triage Review", "Research")` |
| `app-route` | Jordan Lee / `Data & ML` | Priya Raman / `Backend` | Minh Anh Nguyen / `Domain expert` | `lastMileTeam` |
| `app-churn` | Jordan Lee / `Data & ML` | Priya Raman / `Analysis` | none | `churnTeam` |
| `app-outreach` | Jordan Lee / `Analysis` | Hoang Tran / `Coordination` | none | `outreachTeam` |
| `app-supply` | Jordan Lee / `Data & ML` | Priya Raman / `Backend`; Minh Anh Nguyen / `Analysis` | none | `supplyTeam` |
| `app-energy` | Jordan Lee / `Analysis` | Hoang Tran / `Coordination` | none | `energyTeam` |
| `app-archive` | Jordan Lee / `Backend` | Linh Pham / `Design`; Thao Ha / `Research` | none | `archiveTeam` |
| `papp-depot` | Bao Tran / `Data & ML` | Hoang Tran / `Coordination` | none | `providerApplications` `depotTeam` |

Static member states map as follows:

- `leader` -> `member_role = LEADER`, `status = ACCEPTED`
- `accepted` -> `member_role = MEMBER`, `status = ACCEPTED`
- `invited` -> `member_role = MEMBER`, `status = INVITED`

Leader `responded_at` uses the deterministic application `appliedAt` timestamp because the leader is the submitting actor and has no team invitation timestamp. Accepted member `responded_at` uses the static `invitedAt` timestamp when no better source exists. Pending invited members keep `responded_at = NULL`.

`committed_hours_per_week` remains `NULL` for every member in Phase 3.5. Static `hoursAvailable` is general profile availability and was already seeded on `student_profiles.available_hours_per_week`; no fixture provides a distinct per-application commitment. `availability_confirmed` also remains `NULL` because the fixtures do not carry an explicit confirmation value separate from member status.

`applications.motivation` and `applications.relevant_experience` remain `NULL` for every Phase 3.5 application because the selected static application fixtures do not contain the submitted draft narrative. Profile bios, challenge descriptions, and project full briefs are not copied into application narratives.

`application_projects = 0` in Phase 3.5. Transcript/experience-to-`student_projects` conversion remains deferred, and no fake structured evidence links are created.

### Static To Staged Lifecycle Matrix

| Source fixture | Static display state | Phase 3.5 authoritative database state | Future database state |
|---|---|---|---|
| `app-triage` | `NOT_SELECTED` after failed assessment | `applications.status = ASSESSMENT`; no assessment rows yet | Phase 3.6 seeds reviewed failed assessment and may transition to `REJECTED` |
| `app-route` | `INVITED` / pending offer | `applications.status = SELECTION_PENDING`; no selection/offer rows yet | Phase 3.7 creates selection plus pending offer and transitions to `SELECTED` |
| `app-churn` | `TEST_SUBMITTED` with passing visible result | `applications.status = SELECTION_PENDING`; no assessment rows yet | Phase 3.6 seeds reviewed individual assessment history |
| `app-outreach` | `APPLIED` / waiting on supervisor | `applications.status = SUBMITTED`; pending supervision request exists | Later phase may advance after supervision and assessment/selection rows exist |
| `app-supply` | `ACTIVE` project workspace | `applications.status = SELECTION_PENDING`; no selection/offer/project rows yet | Phase 3.7 creates accepted selection/offer; Phase 3.8 creates active project |
| `app-energy` | `IN_REVIEW` project | `applications.status = SELECTION_PENDING`; no selection/offer/project rows yet | Phase 3.7 creates accepted selection/offer; Phase 3.8 creates final-review project |
| `app-archive` | `COMPLETED` project | `applications.status = SELECTION_PENDING`; no selection/offer/project rows yet | Phase 3.7 creates accepted selection/offer; Phase 3.8 creates completed project and close-out data |
| `papp-depot` | `ACTIVE` partner approval workflow | `applications.status = SELECTION_PENDING`; no selection/offer/project rows yet | Phase 3.7 creates accepted selection/offer; Phase 3.8 creates active project with pending partner approval |

Phase 3.5 intentionally seeds no `SELECTED` applications because `selections = 0`. It also avoids `REJECTED` for `app-triage` until the failed assessment result exists as durable assessment data.

### Supervision Request Mapping

| Stable seed key | Source fixture | Application | Faculty | Requested by | Status | Requested at | Respond by | Responded at |
|---|---|---|---|---|---|---|---|---|
| `supervision-request:inv-outreach` | `inv-outreach` | `application:app-outreach` | `user:fac-pham` | `user:stu-jordan-lee` | `PENDING` | `2026-07-25` | `2026-08-01` | `NULL` |

`supervision_requests` records faculty asked to supervise a specific application/team. It is distinct from `challenge_faculty_assignments`, which records challenge-side faculty routing suggestions, and from future `projects.faculty_supervisor_id`, which records the project supervisor after project creation.

`requested_by` is Jordan Lee for `inv-outreach` because the fixture describes a student/team nomination at application time and Jordan is the application leader/submitting actor.

### Phase 3.5 Expected Counts

After a clean Phase 3.5 seed, the application/team DEMO layer should contain:

- `applications`: 8
- `application_members`: 18
- `application_projects`: 0
- `supervision_requests`: 1

Status distribution:

- `SUBMITTED`: 1
- `ASSESSMENT`: 1
- `SELECTION_PENDING`: 6
- `SELECTED`: 0
- `REJECTED`: 0
- `WITHDRAWN`: 0

Acceptance invariants verified during seeding:

- Every application references an existing seeded challenge.
- Every member references an existing seeded student profile.
- Every seeded application has exactly one `LEADER`, and that leader is `ACCEPTED`.
- Every student/team-initiated application has `submitted_by` among its application members.
- `app-triage` remains a solo application with one accepted leader and no artificial member row.
- `app-route` preserves one pending invited member.
- No duplicate `(application_id, student_id)` membership exists.
- No assessments, selections, offers, agreements, projects, milestones, resources, feedback, or matching records are seeded in Phase 3.5.

### Phase 3.3 Expected Counts

After a clean Phase 3.3 seed, the challenge-side DEMO layer should contain:

- `challenges`: 8
- `challenge_skills`: 26
- `challenge_eligibility_rules`: 17
- `challenge_faculty_assignments`: 14
- `challenge_reviews`: 0
