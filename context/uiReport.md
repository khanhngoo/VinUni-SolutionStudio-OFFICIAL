# UI/UX Survey — VinUni Solution Studio

## 1. Tech / UI stack

[`package.json`](../package.json) is deliberately minimal — there is no component library at all.

| Concern | What's there |
|---|---|
| Framework | Next.js 16.2.12 (App Router), React 19.2.4, TypeScript 5 |
| CSS | Tailwind v4 via `@tailwindcss/postcss` — CSS-first config, no `tailwind.config.ts` |
| Component lib | **None.** No shadcn/ui, no Radix, no Headless UI, no Base UI |
| Class utils | `clsx` only, re-exported as `cn` from [`src/lib/cn.ts`](../src/lib/cn.ts). No `tailwind-merge` — so `cn()` cannot resolve conflicting Tailwind classes, only concatenate |
| Icons | Hand-rolled inline SVGs in [`src/components/ui/icons.tsx`](../src/components/ui/icons.tsx) (109 lines, ~8 glyphs). Header comment: *"Six glyphs, inline — not worth a dependency."* No `lucide-react` |
| Fonts | `next/font/google` → Poppins (400/500/600/700), wired as `--font-poppins` in [`src/app/layout.tsx`](../src/app/layout.tsx) |
| Dark mode | **Not implemented.** Zero `dark:` variants anywhere; no `prefers-color-scheme` block; no theme toggle |
| Animation | No library. One hand-written `@keyframes reveal-unblur` + `.reveal-block` utility in `globals.css`, gated by `prefers-reduced-motion` |
| Forms/validation | No react-hook-form / Zod on the client. Hand-rolled `useState` validation |
| Toasts | No library. One bespoke `BlockedActionToast` inside the assessment lockdown only ([`lockdown-chrome.tsx:186`](../src/components/assessment/lockdown-chrome.tsx#L186)) |
| Images | `next/image`: 0 usages. `<img>`: 0 usages. `/public` still holds only the create-next-app SVGs (`next.svg`, `vercel.svg`, `window.svg`, `file.svg`, `globe.svg`) |

---

## 2. Page inventory

No route groups `(...)`, no parallel/intercepting routes. **24 pages, 4 layouts.**

### Public / unauthenticated

| Route | File | Data |
|---|---|---|
| `/` | `src/app/page.tsx` | redirect → `/challenges` (5-line file) |
| `/challenges` | `src/app/challenges/page.tsx` | live (services) |
| `/challenges/[id]` | `src/app/challenges/[id]/page.tsx` | live |
| `/sign-in` | `src/app/sign-in/page.tsx` | — |

### Student, authenticated

| Route | File | Data |
|---|---|---|
| `/challenges/[id]/apply` | `.../apply/page.tsx` + `actions.ts` | live |
| `/workspace` | `src/app/workspace/page.tsx` | live |
| `/workspace/[applicationId]` | `.../[applicationId]/page.tsx` | live (4 tabs via `?tab=`) |
| `/profile` | `src/app/profile/page.tsx` | live (queries `db` directly in the page, bypassing `src/services`) |
| `/profile/edit` | `src/app/profile/edit/page.tsx` | **stub** — redirects straight back to `/profile` |
| `/assessment/[applicationId]` | preflight | live |
| `/assessment/[applicationId]/take` | + own `layout.tsx` | live |
| `/assessment/[applicationId]/result` | | live |
| `/offer/[applicationId]` | | live |
| `/invitations/[applicationId]` | | **static fixtures** |
| `/meeting/[meetingId]` | | **static fixtures** + `generateStaticParams` |

### Partner portal

`src/app/partner/layout.tsx` (requires `PARTNER_REPRESENTATIVE`)

`/partner`, `/partner/post`, `/partner/challenges/[id]`, `/partner/projects`, `/partner/projects/[applicationId]`, `/partner/projects/[applicationId]/close`, `/partner/students` — **all 7 read static fixtures, not the database.**

### Faculty portal

`src/app/faculty/layout.tsx` (requires `FACULTY`)

`/faculty`, `/faculty/[applicationId]` — **both static fixtures.**

### The central split

Ten pages are `force-dynamic` and service-backed; nine pages are still wired to hardcoded fixtures in `src/lib/data/*` (3,069 lines of demo objects) plus `src/lib/provider.ts` and `src/lib/supervision.ts`.

> Concretely, [`partner/page.tsx:29`](../src/app/partner/page.tsx#L29) calls `currentOrganization()` and [`faculty/page.tsx:16`](../src/app/faculty/page.tsx#L16) calls `getFacultyById(currentFacultyId)` — so a real signed-in partner or faculty member passes the capability gate and then sees **someone else's fixture data**, not their own.

### Orphan routes (no inbound link anywhere in the UI)

- `/offer/[applicationId]` — fully production-wired, but nothing links to it
- `/invitations/[applicationId]` — nothing links to it
- `/assessment/[applicationId]` — only the runners link *out* to `/result`; nothing links *in*
- `/meeting/[meetingId]` — reachable only from the partner portal ([`partner/projects/[applicationId]/page.tsx:202`](../src/app/partner/projects/[applicationId]/page.tsx#L202)); the student-side `JoinButton` that would link there is dead code

---

## 3. Component landscape

69 component files in 11 domain folders (`apply`, `assessment`, `challenge`, `faculty`, `layout`, `marketplace`, `offer`, `partner`, `profile`, `team`, `ui`, `workspace`). Organization is by feature, which is consistent and readable.

### The `ui/` folder is thin — 5 files, and one is dead

`src/components/ui/` = `card.tsx`, `chip.tsx`, `section.tsx`, `striped-placeholder.tsx`, `icons.tsx`.

- **`Card` is imported by nothing.** Instead the literal string `bg-card border border-line rounded-card` is repeated **70 times** across pages and components.
- Similarly, `rounded-card bg-brand text-white font-semibold` (the primary button) appears **49 times** inline. There is no `Button` component, no `Input`, no `Dialog`, no `Badge`, no `Table`, no `Tabs` primitive.
- Button sizing has drifted: `h-9 px-4` ×48, `h-10 px-5` ×15, `h-10 px-4` ×3, `h-9 px-5` ×9.
- `Chip` (used in 36 files) and `Section` (17 files) are the only primitives that actually carry the system.

### 25 of 69 component files (36%) are unreachable from the app router

Verified by BFS over `@/` imports starting from every file in `src/app`:

```text
apply/apply-modal.tsx, apply/apply-success.tsx
challenge/apply-panel.tsx, challenge/pipeline-cta.tsx, challenge/selection-timeline.tsx
offer/unlocked-block.tsx
profile/  ← the ENTIRE folder (7 files: availability-editor, availability-grid,
           completeness-panel, course-table, experience-list, profile-rail, team-preferences, verified-mark)
team/invite-picker.tsx, team/team-fit.tsx, team/team-roster.tsx
ui/card.tsx
workspace/agenda-rail.tsx, hub-application-table.tsx, join-button.tsx,
          milestone-list.tsx, next-meeting-card.tsx, resource-list.tsx, submit-deliverable.tsx
```

This is the residue of the DB migration (git log: `feat(workspace): migrate workspace runtime to PostgreSQL`, `feat(challenges): migrate marketplace UI to PostgreSQL`). The rich prototype UI was left in place and thinner server-rendered versions were written beside it. Notably: `submit-deliverable.tsx` (283 lines, drag-drop file upload) and the whole profile editing suite are complete, styled, and unreachable.

### Two competing apply UIs

**Dead:** `ApplyPanel` → `ApplyModal` ([`apply/apply-modal.tsx`](../src/components/apply/apply-modal.tsx), 262 lines) — native `<dialog>` with `showModal()` for free focus-trap/Escape/backdrop, live word counter, per-field inline errors, `disabled` submit, success screen. Its submit is faked: `// Fake the round-trip a real submission would take.` with nested `setTimeout` (lines 73–79).

**Live:** `src/app/challenges/[id]/apply/page.tsx` — a plain server-action form. **No client validation, no per-field errors, no pending/disabled state on submit.** Errors round-trip through a `?error=` query param mapped by an `ERROR_MESSAGES` dict (lines 21–27), so every failure costs a full page navigation and loses typed input. The live page defines its own `Field` component (line 174) with a different signature and look from the dead modal's `Field` (line 227).

### Formatting inconsistency

Some files are conventionally formatted; others are compressed to single enormous JSX lines. `src/app/workspace/[applicationId]/page.tsx` renders its entire page body in ~10 lines; [`offer-flow.tsx:68`](../src/components/offer/offer-flow.tsx#L68) returns the whole component as one 1,400-character line. No Prettier config exists in the repo.

---

## 4. Current UX patterns

### Loading

- **Zero `loading.tsx` files** in the entire app.
- Exactly **one** `<Suspense>` boundary: [`challenges/page.tsx:28`](../src/app/challenges/page.tsx#L28), with a hand-written `MarketplaceResultsSkeleton` (lines 84–107) — good, but it's the only skeleton in the product. Every other page (workspace, profile, offer, assessment, all of partner, all of faculty) blocks with no visual feedback.
- **No `useFormStatus` anywhere.** Server-action forms (`/sign-in`, `/challenges/[id]/apply`, sign-out in the nav) give no pending indication and no double-submit guard. Only [`offer-flow.tsx:32`](../src/components/offer/offer-flow.tsx#L32) uses `useTransition` for an `isPending` → "Saving..." label.

### Error handling

- **One `error.tsx` total:** `src/app/challenges/error.tsx`. No root `error.tsx`, no `global-error.tsx`. An unhandled throw on `/workspace`, `/profile`, `/offer`, or anywhere in the partner/faculty portals hits the raw Next.js error page.
- **One `not-found.tsx`:** `src/app/not-found.tsx` — and its copy is domain-specific ("We couldn't find that challenge") while it serves as the *global* 404, so a bad `/workspace/xyz` URL tells the user a challenge is missing.
- `notFound()` is used as an authorization denial in `src/app/faculty/layout.tsx`, `src/app/partner/layout.tsx`, and [`challenges/[id]/apply/page.tsx:39`](../src/app/challenges/[id]/apply/page.tsx#L39) — a role mismatch renders "We couldn't find that challenge" rather than a "you don't have access" state.

### Empty states

Genuinely good and consistent: a dashed-border centered block with headline + subline, in 5 pages and 1 component (`challenges/page.tsx:62`, `workspace/page.tsx:21`, `partner/page.tsx:255`, `partner/projects/page.tsx:143`, `partner/students/page.tsx:31`, `faculty-queue.tsx:226`). Only the marketplace one carries a recovery action ("Clear filters").

### Forms

- Live forms are uncontrolled with server actions; only the dead prototype components have real validation UX.
- `challenges/[id]/apply/page.tsx` has a single `required` attribute (on motivation) and otherwise relies on server rejection.
- Error text is rendered as a plain `<p className="text-meta text-warn">` — `aria-invalid`: 0 occurrences, `aria-describedby`: 0, `role="alert"`: 0. Screen readers get no association between a field and its error, and no announcement.

### Toasts / notifications

No global toast system. The only notification surface is `BlockedActionToast` in the assessment lockdown, and it *is* done properly (`role="status"`, `aria-live`, `aria-atomic` at `lockdown-chrome.tsx:186-191`). Every other mutation confirms by page navigation or by inline text.

### Responsive

- Only **two breakpoints used in the entire codebase**: `sm:` ×59, `lg:` ×20. No `md:`, `xl:`, `2xl:`.
- **Navigation is hidden below `sm` with no replacement.** `nav-links.tsx:47,50` and `partner-nav-bar.tsx:56` both apply `hidden sm:inline-flex` to every nav link. There is **no hamburger menu, no drawer, no mobile nav** — on a phone the header shows only the logo, avatar, and Sign out.
- Pages with **no** responsive prefixes at all: `src/app/page.tsx`, `src/app/sign-in/page.tsx`, `src/app/profile/edit/page.tsx`, `src/app/assessment/[applicationId]/take/page.tsx`.
- Fixed pixel widths on containers (`max-w-[1080px]`, `max-w-[820px]`, `lg:w-[236px]` filter rail) and fixed table column widths (`w-[120px]`, `w-[140px]` in `workspace/page.tsx`) — tables have no horizontal scroll wrapper.
- Base body font is **13px** (`--text-body`), h2 is 15px, h3 is 12px, chips are 11px — small across the board, and it does not scale up at larger breakpoints.

### Accessibility

Attribute census across all `.tsx`:

```text
aria-hidden 29 · aria-labelledby 8 · aria-label 8 · aria-current 4
aria-live 3 · aria-pressed 1 · aria-modal 1 · aria-expanded 1 · aria-atomic 1
role="…" 3 · sr-only 6
```

- `aria-current="page"` is correctly applied in all three nav bars and in `WorkspaceTabs`.
- `focus-visible:` rings exist in 21 files but are **applied inconsistently** — e.g. `pagination-controls.tsx` has none on Previous/Next, `not-found.tsx` and `challenges/error.tsx` have none on their CTAs.
- `WorkspaceTabs` uses `aria-current` on links rather than the `role="tablist"`/`role="tab"` pattern (defensible, since they're real URL links).
- The one custom modal at `offer-flow.tsx:73` has `role="dialog"`/`aria-modal`/`aria-labelledby` and `autoFocus`, but **no focus trap and no Escape handler** — unlike the dead `ApplyModal`, which got all of that free from native `<dialog>`.
- No skip-to-content link. No `<h1>` on some pages.

### Marketplace list UX (`/challenges`) — the most complete surface

`filter-rail.tsx` + `filter-group.tsx` + `filter-auto-submit.tsx` + `results-header.tsx` + `pagination-controls.tsx`.

- GET-form filtering, so state lives in the URL and is shareable/bookmarkable. `FilterAutoSubmit` submits on `change` with the explicit button retained as the no-JS path — a genuinely nice pattern.
- Removable filter chips with `sr-only` "Remove X filter" labels, plus "Clear all" (`results-header.tsx:66-80`).
- Pagination is Previous / "Page N of M" / Next, with `aria-label="Challenge pages"`. No page-number jumps, no page-size control.
- **Search has no debounce and no submit-on-Enter feedback** — `FilterAutoSubmit` binds `change`, not `input`, so the search box only fires on blur.
- **A "Not yet wired / Coming soon" section is shipped in the live filter rail** (`filter-rail.tsx:80-101`): a disabled Work mode fieldset and a disabled "Only show challenges I'm eligible for" checkbox.

---

## 5. Visual design state

`src/app/globals.css` (161 lines) is a well-considered, fully token-driven Tailwind v4 `@theme`:

- **Ink ramp:** `--color-ink #1a1a1a`, `ink-2 #55585e`, `ink-3 #8a8f98`
- **Surfaces:** `line #e3e6ea`, `line-2 #eef0f3`, `paper #f4f5f7`, `card #ffffff`
- **Brand:** `brand #14417c` (VinUni navy), `brand-deep #0d2f5c`, `brand-soft #e8eef7`, `red #d61f26`, `red-soft #fdeaeb`
- **Semantic:** `warn #b7791f` / `warn-soft`, `ok #1f7a4d` / `ok-soft`, `accent` (aliased to brand)
- **Type scale as tokens:** `--text-h1` 24px … `--text-meta` 12px, each with line-height and letter-spacing — with the stated intent *"every size lives here so components never hardcode px"*
- **One radius:** `--radius-card: 4px`
- Base-layer element styling for `body`, `h1`–`h3`, `a`, `::selection`
- Three custom `@utility` blocks: `marker-triangle` (the red triangle before section headings), `stripes`, `locked-blur`, plus the `reveal-block` animation

### Where it breaks down

1. **`src/app/sign-in/page.tsx` uses none of it.** It is the only file with default-Tailwind palette classes: `text-slate-600` (line 15), `border-amber-300 bg-amber-50 text-amber-900` (line 26). It also uses `text-3xl`, `text-lg`, `text-sm`, `rounded-xl`, `p-5` — all outside the token scale, against a system where h1 is 24px and radius is 4px. It is visibly a different product from every other page.
2. **The "never hardcode px" rule is broken often.** `text-[11px]` in `Chip`, `text-[12px]` in `results-header.tsx:36` and `nav-bar.tsx:31`, `text-[15px]` in the workspace `Stat`, `text-[10px]` in avatars, plus ad-hoc `tracking-[0.01em]` / `tracking-[0.04em]` / `tracking-[0.07em]`.
3. **Hardcoded content in a live hero:** `results-header.tsx:36` renders `"Summer 2026 · Week 31"` as a literal string in the navy marketplace banner.
4. **`StripedPlaceholder` ships in production.** `src/components/ui/striped-placeholder.tsx` is a diagonal-stripe stand-in described as *"for imagery we don't have yet"* — it renders as the org logo on **every card** in the marketplace grid (`challenge-card.tsx:31`) and in partner milestones (`partner-milestone-list.tsx:121`). There is no image pipeline at all behind it.
5. **Three different header treatments:** student nav is white (`bg-card`), partner nav is white with a `· Partner` suffix, faculty nav is solid navy (`bg-brand`) with white text. Deliberate per the code comments, but the faculty nav's single "Queue" item is a static `<span>`, not a link.
6. `README.md` is still the unedited create-next-app boilerplate (references Geist and `app/page.tsx`, neither of which apply) with a Docker block appended.

---

## 6. Known gaps / TODOs

There are **zero literal `TODO`/`FIXME`/`HACK` comments.** The unfinished work is instead visible as user-facing copy:

| Copy shipped to users | Location |
|---|---|
| "Deliverable submission is not part of Phase 5.4." | `workspace/[applicationId]/page.tsx:38` — **internal sprint number rendered in the UI** |
| "Demo — either button loads the same sample brief." | `partner/post-flow.tsx:99` |
| "Nothing was saved — this demo has no persistence layer." | `partner/post-flow.tsx:389` |
| "You approved this — not saved, this demo keeps decisions in memory." | `partner/partner-milestone-list.tsx:223` |
| "Not yet wired" + Coming soon chip on disabled filters | `marketplace/filter-rail.tsx:82-83` |
| "Video calls aren't wired up yet" / "coming soon" | `meeting/[meetingId]/page.tsx:56,59` |
| "Invitation responses are not available in this flow yet." | `challenges/[id]/apply/page.tsx:147` |

**Fake async round-trips** (`setTimeout` standing in for a network call) in 7 components: `apply-modal.tsx:73,76`, `submit-deliverable.tsx:92`, `technical-runner.tsx:128`, `preflight-check.tsx:67`, `post-flow.tsx:46`, `swipe-deck.tsx:46`. Of these, `preflight-check`, `technical-runner`, and `swipe-deck` are **live, reachable pages.**

**Dead / degraded links:**

- `/profile/edit` is referenced 5× from `src/lib/profile.ts:64,71,78,86,94` (the profile-completeness checklist) and from `profile/profile-rail.tsx:54`. The route exists and silently redirects back to `/profile` — a checklist item that bounces the user to where they started. Both callers are currently unreachable, so it isn't user-visible *today*, but the route stub remains.
- `challenge/marketplace-apply-panel.tsx:70-73`: the "Selection timeline" `<Section>` renders one sentence of static prose in place of the real `SelectionTimeline` component (`challenge/selection-timeline.tsx`), which is dead code.
- `challenges/[id]/page.tsx:15-35`: `MARKETPLACE_LOCKED_BLOCKS` is a hardcoded array of three blocks with hardcoded `unlockCopy` and `unlocksAt: "T3"`, rendered on every challenge regardless of that challenge's actual gating.

**Missing entirely:** no per-page `metadata`/`generateMetadata` (only the root `layout.tsx` has any — so every page shares one title), no `viewport` export, no OG images, no `sitemap.ts`/`robots.ts`, no `app/manifest.ts`.

---

## 7. Auth-related UX

**Files:** `auth.ts` (root), `src/auth/authenticated-actor.ts`, `authenticated-presentation.ts`, `authenticated-user.ts`, `development-identities.ts`, `src/app/sign-in/page.tsx`, `src/app/sign-in/actions.ts`, `src/app/api/auth/[...nextauth]/route.ts`.

Auth.js v5 beta with two providers: Microsoft Entra ID (production) and a seeded dev-identity credential provider.

- **There is no sign-up page and no `/sign-out` page.** Sign-out is a bare `<form action={signOutCurrentUser}>` in the nav bar (`nav-bar.tsx:41-45`) with **no confirmation and no pending state** — one click, immediate redirect to `/sign-in`.
- **The sign-in page is the visual outlier of the app** (see §5.1). In dev mode it renders one `<form>` per seeded identity as a row of unstyled bordered buttons; there is no loading state on any of them.
- **No `middleware.ts`.** Every protected page performs its own `getAuthenticatedActor()` + `redirect("/sign-in")` at the top of the server component (`workspace/page.tsx:14`, `profile/page.tsx:18`, `offer/[applicationId]/page.tsx:23`, `assessment/[applicationId]/page.tsx:20`, `challenges/[id]/apply/page.tsx:37`, both portal layouts). Since these are server components the redirect happens before paint, so **there is no flash of wrong content** — that part is solid.
- **No return-to URL.** All redirects are bare `redirect("/sign-in")` with no `callbackUrl`, and both sign-in actions hardcode `redirectTo: "/"` → which itself redirects to `/challenges`. Deep-linking into `/offer/abc` while signed out therefore lands you on the marketplace with your original destination lost.
- **Role misfit renders as a 404.** `notFound()` on capability failure in `faculty/layout.tsx:8`, `partner/layout.tsx:8`, `challenges/[id]/apply/page.tsx:39` — a faculty member visiting `/partner` gets "We couldn't find that challenge."
- **Role-based nav is path-based, not role-based.** `layout/chrome.tsx` picks the header purely from `pathname.startsWith("/faculty")` / `"/partner"`. A signed-in partner browsing `/challenges` sees the *student* nav bar; there is **no cross-portal link anywhere** — a partner cannot navigate back to `/partner` from the marketplace except by editing the URL. `NavLinks` also shows "Your work" and "Profile" to any authenticated actor, including partners and faculty who have no student workspace or profile.
- **Handled gracefully:** the challenge detail apply panel has three distinct states for `NO_SESSION` / student / non-student (`marketplace-apply-panel.tsx:44-56`), and `profile/page.tsx:22-33` has a clear non-student fallback.

---

## Summary — priority themes

| # | Theme | Severity | Representative issue |
|---|---|---|---|
| 1 | Live-vs-dead UI split | High | 25/69 components unreachable; live apply form lost the dead prototype's validation/pending UX |
| 2 | Missing app-shell fundamentals | High | Zero `loading.tsx`; role denials render as domain-specific 404s; no `callbackUrl` after sign-in |
| 3 | No mobile navigation | High | Nav hidden below `sm:` with no hamburger/drawer replacement |
| 4 | Design-system erosion | Medium | Card/button recipes repeated 70×/49× inline; sign-in page entirely off-token |
| 5 | Accessibility gaps in forms/modals | Medium | Zero `aria-invalid`/`aria-describedby`/`role="alert"`; offer modal has no focus trap |
| 6 | Demo residue shipped to users | Low–Medium | "Phase 5.4" copy, hardcoded date string, fake `setTimeout` round-trips on live pages |

**Phase-aware framing:** the partner portal, faculty portal, invitations, and meeting pages still read static fixtures — but those are *planned* deferred boundaries whose DB migration will rewrite them anyway, so polish there is not recommended yet. Themes 1–5 would make a well-bounded future "UI/UX hardening" checkpoint; theme 6's copy fixes are quick wins that could ride along any phase.
