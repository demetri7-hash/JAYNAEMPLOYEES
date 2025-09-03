# Development Plan (Phased)

This plan is actionable and free-tier friendly. Answer items marked [Clarify] in this file.

## Phase 0 — Supabase Setup (Day 1)
- Create a free Supabase project.
- In Supabase SQL Editor, run `db/supabase_schema.sql` (copy-paste full file).
- In Storage, confirm bucket `attachments` was created.
- Create initial roles and flows (seed included in SQL).
- Add yourself as General Manager: insert into `user_roles` after your first login (or set via Admin UI we’ll add later).
- [Clarify] SMTP sender for email (optional) if you want email invites.

Deliverable: Database, RLS policies, and Storage configured.

## Phase 1 — App Scaffold & Auth (Day 1-2)
- Create a Next.js (App Router) project with Tailwind CSS.
- Add `@supabase/supabase-js` and client/server helpers.
- Implement sign-in/sign-up screen (email + password). Keep simple.
- On login, create profile row if missing; store display name.
- Home screen shows only flows allowed by user roles; top shows “Today’s Tasks.”
- [Clarify] Branding (logo/colors) to apply.

Deliverable: Login -> Home with role-filtered buttons.

## Phase 2 — Manager: Templates & Inventory (Day 2-4)
- GM dashboard: CRUD Task Templates (title, flow, recurrence, required fields, priority, transferable, who can edit).
- Inventory Items CRUD for Prep Opening.
- Role assignment: add/remove user roles.
- [Clarify] Recurrence patterns and default template library.

Deliverable: Managers can set up templates, inventory, and roles.

## Phase 3 — Daily Task Generation (Day 4-5)
- Add a SQL function or serverless job to instantiate daily task instances from active templates.
- Use Supabase cron (pg_cron extension) or Vercel Scheduled Functions.
- Ensure idempotent daily generation (no duplicates).

Deliverable: Each morning, users get their task instances.

## Phase 4 — Today’s Tasks & Completion (Day 5-6)
- Build “Today’s Tasks” list with priority sorting.
- Task form: completion percent (25/50/100), notes, photo upload (if required).
- Upload photos to `attachments` bucket with user-scoped path.
- [Clarify] Max photos per task; allow multiple uploads.

Deliverable: Users can complete tasks with evidence.

## Phase 5 — Transfers & Alerts (Day 6-7)
- Implement transfer request UI; limit to compatible roles.
- Recipient sees pending approvals; accept/reject.
- Use Supabase Realtime on `transfers` and `notifications` for live badges.
- Optional web push (service worker + VAPID keys) if approved.

Deliverable: Transfer workflow with live in-app alerts.

## Phase 6 — Prep Flow (Day 7-9)
- Opening Inventory gate: block prep planner until required items counted today.
- Prep Planner: list tasks, drag-and-drop to reorder (persist `position`).
- Lead Prep Cook can assign tasks to specific users; others can self-assign.
- Updates broadcast via Realtime to all prep cooks.

Deliverable: End-to-end prep morning flow.

## Phase 7 — Embed & Polish (Day 9-10)
- Test in Google Sites iframe; adjust headers/CSP.
- Mobile UX polish: big buttons, one-column, large form controls.
- Add basic audit log and exports (CSV for tasks, inventory).

Deliverable: Embedded app feels native and reliable.

## Phase 8 — Harden & Docs (Day 10-11)
- Tighten RLS policies (least privilege for non-managers).
- Add backups and migration notes.
- Write admin how-to docs.

Deliverable: Stable v1 with docs.

---

## Milestone Checklist
- [ ] Supabase project + schema
- [ ] Next.js app + Auth
- [ ] Manager templates + inventory
- [ ] Daily generation
- [ ] Today’s Tasks + uploads
- [ ] Transfers + alerts
- [ ] Prep flow
- [ ] Embed & polish
- [ ] Harden & docs

---

## Open Clarifications (copy answers inline)
1) Staff roster source of truth? CSV import acceptable?
2) Completion scale options (25/50/100 vs 0/25/50/75/100). Any numeric-only tasks?
3) Which templates require photos by default?
4) Do you want email invites, or will managers create users manually and set temporary passwords?
5) Any due times/SLA per flow (e.g., Opening by 10:30 AM)?
6) Transfer cross-role exceptions, if any?
7) Branding assets (logo/colors), or should we pick a clean theme?
8) Inventory starter list (items, units, par) — we can seed placeholders.
9) Evidence retention period and export needs.
10) Languages: English-only first release?
