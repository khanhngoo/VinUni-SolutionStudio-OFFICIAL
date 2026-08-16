# Challenge Read Path

Date: 2026-08-16
Phase: 4.1 Challenge Marketplace Read Path

## Scope

Phase 4.1 adds a server-side PostgreSQL/Drizzle read path for challenge marketplace data. It does not switch the UI from static fixtures yet, does not add writes, and does not implement actor-aware authorization.

Implemented module:

- `src/db/queries/challenges.ts`

Exported APIs:

- `listPublishedChallenges(options)`
- `getPublishedChallengeBySlug(slug)`

## Public Read Semantics

The Phase 4.1 public marketplace query returns challenges with:

- `status in (PUBLISHED, APPLICATIONS_OPEN)`
- `visibility in (PUBLIC_PREVIEW, VINUNI_ONLY, PRIVATE)`

This is intentionally narrower than returning all challenge rows and excludes draft/review/cancelled/archived rows. `INVITE_ONLY` is excluded until Phase 4.2 defines actor-aware visibility.

`PRIVATE` is included so the seeded confidential `merchant-churn-model` scenario remains discoverable, but confidential owner display is masked in the read model when:

```text
visibility = PRIVATE
confidentiality_level = HIGH_CONFIDENTIALITY
```

Phase 4.2 still owns the final business/authorization policy for confidential detail exposure.

## List Shape

`ChallengeListItem` includes:

- public identity: `publicId`, `slug`
- core fields: `title`, `summary`, `domain`, `subtype`, `status`, `visibility`, `confidentialityLevel`
- work fields: `workMode`, `teamSizeMin`, `teamSizeMax`, `durationWeeks`, `weeklyHours`, `startDate`, `applicationDeadline`
- compensation fields: `compensationType`, `compensationDescription`
- organization joins: `ownerOrganization`, `managingOrganization`
- normalized children: `skills`, `eligibilitySummary`
- derived count: `applicantCount`

Internal bigint IDs are used only inside the query module and are not exposed by the read model.

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

## Phase 4.2 Deferrals

Phase 4.2 should define:

- final public/VinUni/private/invite-only visibility semantics;
- actor-aware admin, faculty, partner, and student access rules;
- whether confidential owner names may be searched or filtered before reveal;
- business-service wrappers around the low-level DB query module;
- marketplace-safe detail exposure rules for contact and assessment information.

Phase 4.3 should migrate the actual `/challenges` UI to this read path.
