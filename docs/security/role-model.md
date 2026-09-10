# Phase 6.2 Role Model

Authentication establishes a provider identity, Auth.js session, and active
existing `users` row. Role resolution is a separate server-side read boundary:
`getAuthenticatedActor()` starts from Phase 6.1's authenticated user and reads
profiles and active organization memberships from PostgreSQL on each call.

## Platform capabilities

- `STUDENT` is derived only from a `student_profiles` record.
- `FACULTY` is derived only from a `faculty_profiles` record.
- `PARTNER_REPRESENTATIVE` is derived from an active membership in an
  `EXTERNAL_PARTNER` organization. The membership's role remains available and
  scoped to that organization.
- `INTERNAL_UNIT_MEMBER` is derived from an active `INTERNAL_UNIT` membership.

A user can have any combination of these capabilities, profiles, and active
memberships. No email domain, display name, route, or browser input establishes
a role or organization authority.

## Organization-scoped authority

Each resolved membership retains its organization ID, organization type, and
membership role (`ADMIN`, `PROJECT_MANAGER`, `CONTACT_PERSON`, `REVIEWER`, or
`MEMBER`). `isOrganizationAdmin(actor, organizationId)` checks for an active
`ADMIN` membership in precisely that organization.

CAID and E-Lab are therefore derived labels for an `ADMIN` membership in their
respective canonical organization records; they are not stored global roles.
CAID administration does not imply E-Lab administration, and the inverse is
also true. Resource policies must supply their authoritative organization ID;
they must not authorize from organization names.

## Deliberate boundaries

JWTs and sessions carry authentication data only; PostgreSQL remains the
authority for role resolution. The existing Phase 4/5 development actor helpers
and domain policy enforcement remain unchanged in Phase 6.2. Phase 6.3 will
replace those temporary actor boundaries with authenticated actors and define
the resource permission matrix; this module does not decide access to
challenges, applications, offers, or workspaces.

## Phase 6.6 amendment (2026-09-09)

At the time this document was written for Phase 6.2, ERD v1 had no global
`SYSTEM_ADMIN` role and none was introduced. That decision is superseded: Phase
6.6 — Global Platform Administration (see
`context/admin-console-implementation-plan.md`) introduces one explicit,
database-backed global role, `PLATFORM_OWNER`, distinct from every existing
organization-scoped role described above.

- `PLATFORM_OWNER` is granted through `user_platform_roles` rows only; it is
  never inferred from an organization name, email domain, JWT/session claim,
  or self-service registration.
- CAID and E-Lab `ADMIN` memberships remain organization-scoped exactly as
  described in this document and do not imply `PLATFORM_OWNER`, and the
  inverse is also true.
- `PLATFORM_OWNER` does not become a universal authorization bypass. Existing
  resource policies described by Phase 6.3 keep their current logic; the
  global admin console uses dedicated read models and explicitly enumerated
  owner mutations, each with its own policy.
- Schema (`user_platform_roles`, enums), actor-resolution, and policy-helper
  implementation are tracked separately under Phase 6.6 Checkpoints B and C,
  not as part of this Phase 6.2 module.
