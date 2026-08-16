# DEMO Seed Manifest

Phase: 3.2 compact DEMO identity and organization foundation  
Date: 2026-08-16

## Scope

This manifest is the authoritative compact DEMO identity/org inventory for Phase 3.2+.

Phase 3.2 seeds only:

- DEMO organizations
- DEMO organization contact users
- DEMO student users and `student_profiles`
- DEMO faculty users and `faculty_profiles`
- DEMO contact `organization_memberships`
- DEMO `student_skills` linked to existing Phase 3.1 canonical skills

Phase 3.2 does not seed challenges, challenge-side normalization, applications, assessments, selections, offers, agreements, projects, milestones, deliverables, feedback, matching records, notifications, or audit demo records.

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
| Internal E-Lab-managed challenge | SYNTHESIZED DEMO, challenge deferred |

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
| E-Lab internal challenge | SYNTHESIZED DEMO / DEFERRED | Future challenge will use `owner_organization = E-Lab` and `managing_organization = E-Lab`. The challenge record is intentionally deferred to the challenge DEMO seed phase. |
| E-Lab people prerequisites | BOOTSTRAP SUFFICIENT | `user:elab-admin-dev` already exists as an E-Lab admin. No additional E-Lab contact/profile is required for Phase 3.2. |
| Skill relationships | DEFERRED | Remain zero until conservative relationships are explicitly approved. |
| Matching outputs | DEFERRED | Belong to Phase 7, not DEMO seed identity setup. |
