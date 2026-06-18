# SWCS · Local Body Approvals (NMRDA) — Clickable Prototype

A front-end **prototype** of the Local Body (NMRDA) approvals module that lives
*inside* the SWCS Single Window Clearance System. It is built as **three
separate, self-contained portals** — Supervisor, Surveyor, Final Authority —
that share request data but never share an interface. A single request flows
through all three. Mock data only — **no backend, no database, no auth.**

> This is a first-draft, reviewable UI for a product design review — not
> production software. Everything outside the Local Body (SWCS platform,
> Central/State portals, DSC signing, notifications) is **simulated as state
> changes**.

## Three separate portals, not one app with roles

In the real product these are **three independent portals**. A Supervisor never
sees the Surveyor's or Final Authority's screens, queues, or navigation. There
is **no in-product role switching and no shared chrome** — each portal has its
own top bar, its own left nav, and its own accent colour (Supervisor = blue,
Surveyor = teal, Final Authority = violet), so each looks like its own product.

A portal only ever sees a request that is **in its queue** or that it has
**handled before** (now sitting elsewhere or closed) — never another tier's
interface. The only thing shared is the request data itself as it travels.

The **persona switcher is external scaffolding for this review only.** It is the
dark "DESIGN-REVIEW SCAFFOLD" strip pinned at the very top — deliberately styled
as dev tooling, outside every portal's chrome. Deleting that strip would leave
three clean, standalone portals. Nothing inside a portal references the other
roles' UIs or hints that switching is possible.

## Run it

```bash
npm install
npm run dev        # http://localhost:5179
```

`npm run build` produces a static bundle in `dist/`.

## The one thing to try first

Use the **DESIGN-REVIEW SCAFFOLD strip** at the very top (external scaffolding,
not a product feature) to preview each portal: **Supervisor → Surveyor → Final
Authority**. Action a request in one portal, then switch via the scaffold to the
next portal and watch it arrive in that queue — exactly as it would when three
separate teams use three separate portals.

A happy-path walkthrough:

1. **Supervisor** → open a `Received` request → tick the document checklist →
   **Forward to Surveyor**.
2. **Surveyor** → fill the **Site inspection** report (+ add photos) →
   **Forward to Final Authority**.
3. **Final Authority** → review the complete file → **Approve & Issue
   Certificate** → sign → **Issue** → **Print / Download**.

Other paths to try: **Request Clarification (Investor)** (exits to SWCS, returns
via *Simulate: investor resubmits*), **Send back** (internal loop), **Reject**
(terminal, with mandatory reason + category).

## What's implemented

- **Three independent portals** (blue / teal / violet) — each with its own
  chrome, queue, search scope, and "passed-through-my-hands" visibility; the
  persona switcher is an external review scaffold only.
- **Role-based inboxes** sorted oldest-first (longest-waiting = most urgent).
- **State-machine workflow** — single source of truth in
  [`src/state/workflow.js`](src/state/workflow.js). Every screen, the tracker,
  and the reminders derive from it. A request has exactly one `status`, one
  `currentHolder`, and a full `history`; it is never in two queues at once.
- **Approval tracker** — horizontal stepper + goal-gradient progress + an
  expandable history timeline that draws send-back / clarification / reject
  loops distinctly.
- **Document stack** — a consolidated, growing file grouped by source tier
  (applicant → surveyor → final authority), with site photos.
- **Reminders** — SLA dwell + overdue flags on rows, in the tracker, and in the
  notifications bell; a **Nudge** affordance to ping the current holder of a
  request you previously handled.
- **Certificate generation** — print-ready, per request type, with NMRDA logo,
  official seal, QR verification placeholder, unique certificate number, and a
  draw / type / upload **e-signature** (UI only).
- **Mandatory reasons** on every send-back / clarification / reject, and
  **confirmation** on irreversible actions (reject, issue).
- Session persistence (survives reload) + **Reset** to seed.

## Status colours (one meaning each)

amber = pending action · blue = in progress · green = approved/issued ·
red = rejected · grey = waiting on investor.

## Assumptions flagged for the PM (built per these defaults — confirm)

1. **Reject is terminal** — a rejected request ends here with a reason and is
   returned to SWCS. (Alternative: route back to the investor for a fresh
   submission.)
2. **Workflow is identical across all three request types**
   (Advertisement / Fire NOC / Property Tax); only the document checklist
   differs per type (see `DOC_CHECKLIST` in `workflow.js`).
3. **Role names** (Supervisor / Surveyor / Final Authority) are placeholders.
4. **Site visit is optional** — the Surveyor toggles "required?". (Some types
   may need to mandate it.)
5. **E-signature is a UI placeholder**, not a legally-binding DSC.
6. **Clarification to investor** exits to SWCS and re-enters at the **Supervisor**
   stage on resubmission (not directly to whoever raised it).

## Project map

```
src/
  state/workflow.js     # statuses, holders, actions, transitions (the state machine)
  state/store.jsx       # in-memory store, navigation, action API, session persistence
  data/seed.js          # ~12 mock requests across all types & states
  components/
    ReviewScaffold.jsx  # external "design review" persona-switch strip (not product)
    Shell.jsx           # ONE portal's own top bar, bell, search, left nav
    Inbox.jsx           # per-portal list-detail queues + scoped search
    RequestDetail.jsx   # role-aware detail + sticky action bar + dialogs
    ApprovalTracker.jsx # stepper + progress + history timeline
    DocumentStack.jsx   # grouped, growing document file
    SiteInspectionForm.jsx
    Certificate.jsx     # print-ready certificate + signature pad
    Dialogs.jsx         # reason / confirmation dialogs
    common.jsx          # badges, avatars, thumbnails, cards
```

## Out of scope (simulated only)

Real authentication, real SWCS / Central / State integration, real DSC signing,
real notifications/email, persistence beyond the browser session, and the
Central/State portals themselves.
