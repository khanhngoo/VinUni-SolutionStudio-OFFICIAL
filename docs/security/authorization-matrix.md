# Phase 6.3 Authorization Matrix

Authentication resolves an active `users` row, then an `AuthenticatedActor`
from profiles and active organization memberships. The rows named below are
authoritative resource relationships; a client cannot supply actor, role,
organization, reviewer, submitter, or responder identity.

| Resource/action | Anonymous | Student | Faculty | External partner representative | Internal-unit membership |
|---|---|---|---|---|---|
| Challenge marketplace | `PUBLIC_PREVIEW` only | Established VinUni visibility | Established VinUni visibility | `PUBLIC_PREVIEW` only | Established VinUni visibility |
| Confidential challenge fields | Deny/redact | Deny/redact unless an explicit resource relationship applies | Assigned faculty only | Owner-org membership only | Managing-org membership only |
| Challenge create/edit/submit | Deny | Deny | Deny unless resource policy grants an owner/managing relationship | Active owner-org role, scoped to the challenge owner ID | Active managing-org role, scoped to the challenge manager ID |
| Challenge review/publish/routing | Deny | Deny | Explicit assignment where policy allows | Deny unless the challenge policy grants that owner action | Managing-org allowed role, scoped to the managing ID |
| Application create | Deny | Authenticated student is the submitted leader | Deny | Deny | Deny |
| Application own/team read | Deny | Current application member | Deny unless owner/managing relationship applies | Allowed owner-org role for that challenge only | Allowed managing-org role for that challenge only |
| Application organization read | Deny | Deny absent membership | Deny absent membership | `ADMIN`/`CONTACT_PERSON` in exact owner org | `ADMIN`/`PROJECT_MANAGER`/`REVIEWER` in exact managing org |
| Assessment read/start/save/submit | Deny | Accepted member owning the individual attempt | Deny | Deny | Deny |
| Offer read | Deny | Application member | Deny | Deny | Deny |
| Offer response | Deny | Accepted application `LEADER`; server records the responder | Deny | Deny | Deny |
| Workspace | Deny | Current project member; agreement-gated resources remain gated | Authoritative `projects.faculty_supervisor_id` only | Allowed role in exact owner org | Allowed role in exact owner/managing org |

No organization-wide capability crosses organization IDs: a Bến Cảng
membership does not grant another partner's resources, and CAID and E-Lab
membership authority remains separately scoped.

## Temporary actor migration

Production runtime routes and actions no longer import the former assessment,
offer, or workspace temporary viewer helpers; the unused domain-specific
helpers were removed. The verifier-facing `getDevelopment*Actor` helpers
remain only to select the fixed Phase 6.1 development identity; each resolves
the same active user and PostgreSQL-derived authenticated actor model used by
runtime.
