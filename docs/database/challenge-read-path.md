# Challenge Read Path

Date: 2026-08-16
Phase: 4.2 Challenge Business Layer

## Scope

Phase 4.1 added a server-side PostgreSQL/Drizzle read path for challenge marketplace data. Phase 4.2 adds a small business/service layer above that query layer. It does not switch the UI from static fixtures yet, does not add writes, and does not implement authentication or full RBAC.

Implemented module:

- `src/db/queries/challenges.ts`

Exported APIs:

- `listPublishedChallenges(options)`
- `getPublishedChallengeBySlug(slug)`

Service APIs:

- `listMarketplaceChallenges(options, context?)`
- `getMarketplaceChallengeBySlug(slug, context?)`

Policy helpers:

- `isChallengePublished(status)`
- `canDiscoverChallenge(challenge, context?)`
- `marketplaceVisibilitiesForContext(context?)`
- `shouldRedactOwnerOrganizationName(challenge, context?)`
- `canAccessOwnerOrganizationChallenge(challenge, context)`
- `canAccessManagingOrganizationChallenge(challenge, context)`
- `canAccessAssignedFacultyChallenge(challenge, context)`
- `evaluateChallengeEligibility(rules, profile)`

## Query Vs Service Responsibility

The query layer remains responsible for SQL/Drizzle access, joins, filtering primitives, pagination, sorting, normalized skill retrieval, normalized eligibility-rule retrieval, derived applicant counts, and detail-only faculty/contact joins.

The service/policy layer owns publication, marketplace discoverability, audience visibility, confidentiality/redaction, contact exposure, owner/managing-organization access predicates, faculty-assignment access predicates, and deterministic eligibility interpretation.

After Phase 4.2, React components should consume the service boundary during Phase 4.3 instead of deciding marketplace visibility, private disclosure, or eligibility rules themselves.

## Marketplace Read Semantics

The ordinary marketplace service defaults to a VinUni-member audience because the current static MVP is student/VinUni-facing and has no anonymous public site yet.

Publication is separate from visibility. A challenge is eligible for marketplace consideration only when:

- `status in (PUBLISHED, APPLICATIONS_OPEN)`

Draft, review, matching, project execution, archived, and cancelled statuses are not marketplace-published states.

Ordinary marketplace discoverability by audience:

| Visibility | Anonymous | VinUni/student/faculty/org/manager/admin context | Notes |
|---|---:|---:|---|
| `PUBLIC_PREVIEW` | yes | yes | Broad preview visibility. |
| `VINUNI_ONLY` | no | yes | Visible to VinUni-authenticated audiences once auth exists. |
| `PRIVATE` | no | yes, as redacted preview unless restricted access applies | Preserves the reviewed confidential marketplace scenario. |
| `INVITE_ONLY` | no | no | Excluded from ordinary marketplace methods; future direct authorized access requires invitation/auth policy. |

`PRIVATE` is intentionally included for the seeded confidential `merchant-churn-model` scenario. It remains discoverable to the VinUni marketplace as a redacted preview. Restricted/full-detail access is reserved for future authenticated contexts such as owner-organization members, managing-organization members, assigned faculty, or administrators.

The service masks confidential owner display when:

```text
visibility = PRIVATE
confidentiality_level = HIGH_CONFIDENTIALITY
and actor lacks restricted-field access
```

The low-level query returns normalized organization rows; Phase 4.2 moved confidential redaction into `src/services/challenge-policy.ts`.

## Access Context

Phase 4.2 defines a small explicit access context. It does not read sessions, cookies, JWTs, or VinUni SSO. Phase 6 will supply authenticated identity and memberships later.

Supported context concepts:

- `ANONYMOUS`
- `VINUNI_MEMBER`
- `STUDENT`
- `FACULTY`
- `ORGANIZATION_MEMBER`
- `MANAGING_UNIT_MEMBER`
- `ADMIN`

Organization and faculty access helpers compare explicit IDs supplied by a caller. They never authorize from organization names, faculty titles, departments, or hard-coded CAID/E-Lab shortcuts.

## Field Disclosure

Safe marketplace preview fields include title, summary, domain, subtype, status, visibility, confidentiality level, work metadata, compensation metadata, skill names/requirement types, eligibility summary, managing organization display, and derived applicant count.

Full marketplace detail additionally includes challenge description, expected deliverables, eligibility rules, and display-level faculty routing data.

Restricted/private fields are not exposed through ordinary marketplace service methods. Contact exposure remains conservative: the read model can carry contact display name only, never email, private user ID, or membership metadata. For `PRIVATE + HIGH_CONFIDENTIALITY` ordinary marketplace reads, contact display is redacted to `null`.

## Owner, Manager, And Faculty Policy

Owner organization access is tied to explicit active membership in the challenge owner organization. It is not inferred from organization name strings.

Managing organization access is tied to explicit active membership in the challenge managing organization with an appropriate managing role (`ADMIN`, `PROJECT_MANAGER`, or `REVIEWER`). CAID membership does not automatically grant access to E-Lab-managed challenges, and E-Lab membership does not automatically grant access to CAID-managed challenges.

Faculty assignment access is tied to the `challenge_faculty_assignments` faculty user ID. Assigned faculty can be recognized by policy helpers; unassigned faculty do not receive equivalent private access merely because they are faculty. This remains distinct from supervision requests and project supervision.

## Eligibility Evaluation

Phase 4.2 implements a pure deterministic eligibility evaluator for normalized challenge eligibility rules. It performs no DB writes, no authentication, no AI/LLM calls, and no semantic matching.

Overall results:

- `ELIGIBLE`: no required rule failed or is unknown.
- `INELIGIBLE`: at least one required rule failed.
- `UNKNOWN`: no required rule failed, but at least one required rule cannot be evaluated from supplied profile data.

Rule-level results are returned with `PASSED`, `FAILED`, or `UNKNOWN` plus a human-readable reason.

Required and optional semantics:

- A failed required rule makes the profile ineligible.
- A missing/malformed required rule produces `UNKNOWN`, not silent rejection.
- A failed optional rule does not block eligibility in Phase 4.2.

Implemented deterministic rule handling:

- `MIN_GPA`: compares GPA only when the student GPA exists and GPA scales are compatible. Scale conversion is not invented; incompatible scales return `UNKNOWN`.
- `STUDY_YEAR`: exact numeric membership only.
- `SCHOOL`: exact normalized school-code/string membership only.
- `MAJOR`: exact normalized string membership only.
- `AVAILABLE_HOURS`: evaluated only when an explicit rule exists.
- `MAX_ACTIVE_PROJECTS`: evaluated only when an explicit rule exists.

`challenge.weekly_hours` remains expected workload metadata and is not treated as an eligibility blocker unless an explicit `AVAILABLE_HOURS` rule exists.

## List Shape

`ChallengeListItem` includes:

- public identity: `publicId`, `slug`
- core fields: `title`, `summary`, `domain`, `subtype`, `status`, `visibility`, `confidentialityLevel`
- work fields: `workMode`, `teamSizeMin`, `teamSizeMax`, `durationWeeks`, `weeklyHours`, `startDate`, `applicationDeadline`
- compensation fields: `compensationType`, `compensationDescription`
- organization joins: `ownerOrganization`, `managingOrganization`
- normalized children: `skills`, `eligibilitySummary`
- derived count: `applicantCount`

Internal bigint IDs are used only inside query/service internals and are not exposed by the marketplace service read model.

## Detail Shape

`ChallengeDetail` extends the list item with:

- `description`
- `expectedDeliverables`
- `eligibilityRules`
- `facultyAssignments`
- `contactPerson.displayName`

Contact email, private user IDs, project resources, agreement records, and downstream restricted content are not exposed by this read path.

## Static UI Field Mapping

| Current static UI field | Phase 4.1 DB read source |
|---|---|
| `challenge.id` route value | `challenges.slug` |
| `challenge.title` | `challenges.title` |
| `challenge.summary` | `challenges.summary` |
| `challenge.orgName` | `ownerOrganization.displayName`; masked when confidentiality requires it |
| `challenge.orgCategory` | `organizations.industry` when owner name is masked |
| `challenge.confidential` | derived from `visibility` and `confidentialityLevel` |
| `challenge.subType` | `challenges.subtype` |
| `challenge.domainTags` | `challenges.domain` |
| `challenge.durationWeeks` | `challenges.duration_weeks` |
| `challenge.hoursPerWeek` | `challenges.weekly_hours` |
| `challenge.teamSizeMin/teamSizeMax` | `challenges.team_size_min/team_size_max` |
| `challenge.workMode` | `challenges.work_mode` |
| `challenge.compensation` | `challenges.compensation_type` plus `compensation_description` |
| `challenge.deadline` | `challenges.application_deadline` |
| `challenge.startDate` | `challenges.start_date` |
| `challenge.skills[]` | `challenge_skills -> skills` |
| `challenge.minGpa/eligibleYears/eligibleColleges` | `challenge_eligibility_rules.config` |
| `challenge.suggestedFacultyIds` | `challenge_faculty_assignments -> users/faculty_profiles` in detail only |
| `challenge.applicantCount` | derived `COUNT(applications)` |
| `challenge.responsibilities[]` | `challenges.expected_deliverables` text |
| `challenge.lockedBlocks` | presentation-only/deferred |
| `challenge.assessmentTrack/assessmentMinutes` | assessment tables, deferred from Phase 4.1 challenge detail shape |
| `challenge.interviewFormat` | deferred; interview workflow is not modeled in ERD v1 |

## Pagination

The list query uses page-based offset pagination:

- default page: `1`
- default page size: `12`
- maximum page size: `50`
- zero, negative, or non-finite page/page-size values are clamped

The response includes `total`, `totalPages`, `hasNextPage`, and `hasPreviousPage`.

## Filters

Implemented filters:

- `subtype`
- `compensationType`
- `workMode`
- `visibility`, still constrained by marketplace visibility
- `domain`, case-insensitive substring match
- `school`, through `challenge_eligibility_rules` JSONB
- `skill`, through `challenge_skills -> skills.canonical_name`
- `ownerOrganizationName`
- `search`

Skill filters use canonical skill names only. Phase 4.1 does not use aliases, relationships, semantic similarity, or embeddings.

## Search

Search is case-insensitive and relational. It checks:

- challenge title
- challenge summary
- challenge domain
- owner organization name
- managing organization name

No full-text search engine or vector search is introduced.

## Sorting

Supported deterministic sorts:

- `applicationDeadline`
- `newest`
- `durationWeeks`
- `startDate`

Each sort uses `slug` as a stable tie-breaker.

## Query Structure

The implementation avoids N+1 behavior by using:

- one base list/detail query for challenge and organization data;
- one set-based skill query for the returned challenge IDs;
- one set-based eligibility query for the returned challenge IDs;
- detail-only faculty/contact queries.

It avoids Cartesian multiplication by not joining skills, eligibility rules, and faculty assignments into the same base query.

## Deferred Boundaries

Phase 4.2 intentionally does not implement:

- authentication/session lookup;
- full RBAC or a global permission engine;
- invitation tables or invite-only direct authorization;
- challenge writes or review transitions;
- application creation/deadline validation;
- matching, embeddings, or match result queries.

Phase 4.3 should migrate the actual `/challenges` UI to this read path.
