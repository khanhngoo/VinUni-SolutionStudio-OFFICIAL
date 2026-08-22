# Phase 5.5 Transaction Boundaries

Date: 2026-08-22
Phase: 5.5 Transaction boundaries

## Ownership rule

Runtime business services own transaction orchestration. A service starts one
PostgreSQL transaction when it receives the root Drizzle database handle. When
it receives an existing Drizzle transaction through its `database` option, it
uses that handle directly. It does not start a nested transaction or commit an
independent portion of the caller's work.

Mutation helpers remain handle-accepting persistence primitives. React
components and server actions do not own SQL transactions.

## Reviewed write workflows

| Runtime | Authoritative write boundary | Result |
| --- | --- | --- |
| Challenge draft creation | challenge + skills + eligibility rules | One service transaction |
| Challenge draft update | content and/or normalized skill/rule replacements | One service transaction; child payloads validate before replacements |
| Challenge review | conditional lifecycle transition + review row | One service transaction |
| Challenge submission/publishing | conditional lifecycle transition | Service transaction; expected source status remains required |
| Faculty routing | assignment replacement | One service transaction |
| Application creation | application + accepted leader + team members | One service transaction |
| Assessment start | attempt creation/transition | One service transaction |
| Assessment response save | validated response insert/update | One service transaction |
| Assessment submission | optional response writes + conditional attempt transition | One service transaction |
| Offer response | conditional pending-offer update | Constrained single-row authoritative write; no cross-domain work is introduced |
| Workspace | No runtime mutations | No transaction added |

Offer acceptance intentionally does not create projects, project members, or
update challenge capacity. Assessment submission intentionally does not update
application, selection, or offer state. Those are not approved Phase 5
business operations, so no cross-domain transaction is manufactured.

## Failure and stale-state behavior

Conditional status mutations continue to require their expected source status.
The transaction boundary therefore does not make a stale transition valid.
Service errors remain domain errors; a database error after writes begin causes
the owning transaction to roll back rather than exposing a partial workflow to
the caller.

## Verification

The established runtime verifiers exercise the service APIs from one explicit
outer transaction and throw a rollback sentinel. With the Phase 5.5 handle
reuse rule, those service calls use that exact outer transaction.

```bash
pnpm exec tsx scripts/verify-challenge-writes.ts
pnpm exec tsx scripts/verify-application-runtime.ts
pnpm exec tsx scripts/verify-assessment-runtime.ts
pnpm exec tsx scripts/verify-offer-runtime.ts
```

They cover dependent challenge, application/member, and
assessment-response/attempt writes; conditional stale transitions; and
canonical-seed preservation after rollback. The offer verifier also confirms
that accepting or declining an offer leaves projects unchanged.
