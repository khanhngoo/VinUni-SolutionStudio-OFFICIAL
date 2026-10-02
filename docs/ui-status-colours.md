# Status colour language

Every status chip is produced by `src/lib/status-tone.ts` (`statusTone`,
`challengeTone`, `deadlineVariant`) and rendered with `StatusChip`
(`src/components/ui/status-chip.tsx`). Do not hard-code a chip colour for a
status; add or change the mapping in `status-tone.ts` so every role sees the
same colour for the same meaning.

| Tone | Chip variant | Meaning | Examples |
|---|---|---|---|
| Solid green | `live` | Open or running right now | Applications open, Active project |
| Green | `ok` | Approved / accepted / done | Approved, Selected, Accepted, Completed, Passed |
| Amber | `warn` | Waiting on someone; an action is owed | Awaiting decision, Awaiting response, Pending supervision, Submitted milestone |
| Blue | `accent` | In progress or under review | Submitted for review, Under review, Final review |
| Pink | `revise` | Needs rework | Revision requested |
| Red | `danger` | Negative outcome or imminent deadline | Not selected, Declined, Rejected, Cancelled, Revoked, Overdue, closes today/tomorrow |
| Ivory | `draft` | Not submitted yet | Draft |
| Grey | `neutral` | Closed, withdrawn, expired or not started | Applications closed, Withdrawn, Expired, Archived, Not started |

Deadlines: closed = grey, today or tomorrow = red, within 7 days = amber.
