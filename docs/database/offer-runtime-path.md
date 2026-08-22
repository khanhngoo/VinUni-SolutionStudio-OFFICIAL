# Offer Runtime Path

Date: 2026-08-22
Phase: 5.3 Offers

## Scope

Phase 5.3 moves `/offer/[applicationId]` from static fixture authority to the
PostgreSQL offer path:

```text
Browser / Next.js server action
        ↓
Offer service
        ↓
Offer query / mutation layer
        ↓
Drizzle
        ↓
PostgreSQL
```

Implemented modules:

- `src/db/queries/offers.ts`
- `src/db/mutations/offers.ts`
- `src/services/offer.service.ts`
- `src/app/offer/[applicationId]/actions.ts`
- `scripts/verify-offer-runtime.ts`

## Read Path And Access

`getOfferByApplicationPublicId(...)` resolves the canonical relational chain:

```text
offer -> selection -> application -> challenge
```

It returns offer snapshot terms, application public ID, challenge slug/title,
and owner/managing organization names. Internal bigint identifiers remain
inside the query/service layer.

`getOfferDetail(...)` requires an explicit development-only student actor before
Phase 6. The actor must be an application member to read the team offer. A
browser-safe `canRespond` value is true only for the accepted application
leader. The temporary route viewer is Jordan Lee, resolved server-side through
`src/lib/offer-development.ts`; it is not a production session.

## Response Lifecycle

`respondToOffer(...)` supports only:

```text
PENDING -> ACCEPTED
PENDING -> DECLINED
```

The service rejects non-students, non-members, invited members, accepted
non-leaders, terminal offers, and expired pending offers. `EXPIRED` is derived
from `PENDING + respond_by < server time`; it is never persisted.

The mutation constrains the update to a pending, unexpired offer. This prevents
concurrent or stale responses from both winning. The server owns `status`,
`responded_by`, and `responded_at`.

Offer acceptance and decline preserve the selection and do not mutate the
application status. In particular, this phase does not invent an application
status such as `ACCEPTED` or `ACTIVE`.

## Terms And Deferrals

Issued terms are read only from the `offers` row. They are snapshots and are
not regenerated from current challenge fields. Students cannot edit them.

Agreement runtime is deferred. Team-level offer acceptance does not accept an
individual NDA for any member. Project provisioning, project membership,
workspace disclosure, milestones, resources, and feedback are also deferred to
later Phase 5 checkpoints. No offer response creates or modifies a project.

The migrated page preserves pending, accepted, declined, cancelled, and expired
display states. The former local NDA signature and local workspace/reveal flow
were removed because neither has a Phase 5.3 persistence boundary.

## Verification

`scripts/verify-offer-runtime.ts` runs disposable offer writes inside one
transaction and rolls them back. It verifies the canonical pending `app-route`
read, accepted historical reads, leader-only response, denial for accepted
non-leader/invited/unrelated students, expiration, conditional stale-response
protection, accept and decline transitions, server-owned response fields,
snapshot independence, no project creation, and canonical seed preservation.
