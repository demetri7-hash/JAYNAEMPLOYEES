# JAYNA Gyro App — Product Outline (Updated)

A mobile-first web app for JAYNA Gyro restaurant staff to sign in, see only their role-relevant workflows, complete/transfer tasks, and for managers to create templates, assign, prioritize, and audit work. Deployed on Vercel, data on Supabase. Embedded in Google Sites intranet.

## Vision
- Make daily operations reliable and auditable with friendly, tap-first workflows.
- Personalized “Today’s Tasks” per staff member with quick completion and evidence (notes, photos).
- Managers configure recurring templates, priorities, required fields, and who can edit.
- Lightweight auth: simple email+password; role-gated access for managerial flows.
- Free-tier friendly: Vercel + Supabase (Auth, Postgres, Storage, Realtime). Optional free web push.

## Constraints and Platforms
- Free or free-tier services only.
- Runs as a responsive web app, embedded in Google Sites via iframe.
- Must support mobile-first single-column UI, large touch targets.
- Avoid heavy dependencies and paid notification/SMS; prefer in-app alerts + optional web push.

## Primary Roles (initial)
- Line Cook (Opening, Transition, Closing flows)
- Prep Cook (Opening + daily prep planner flow)
- Lead Prep Cook (managerial; password/role protected)
- Kitchen Manager (managerial; protected)
- Ordering Manager (managerial; protected)
- Assistant Manager (protected)
- General Manager (super-admin; protected)

Note: Users can have multiple roles.

## Home Screen
After sign-in, show only applicable buttons for that user (single-column, big buttons):
- Opening Line Cook
- Transition Line Cook
- Closing Line Cook
- Opening Prep Cook
- Lead Prep Cook (protected)
- Kitchen Manager (protected)
- Ordering Manager (protected)
- Assistant Manager (protected)
- General Manager (protected)

Topmost: a prominent “Today’s Tasks” button for the signed-in user.

## Task Model (high level)
**Templates:** Created by managers; can recur (daily/weekly/monthly), have required fields (completion %, photo required, numeric entry for inventory), priority, transferability, and who can edit. Multiple photos allowed if set in master settings.

**Instances:** For each day/assignee, instantiate from templates (and ad-hoc tasks). Each instance tracks:
- Status
- Completion percent (0/25/50/75/100)
- Reason dropdown (if not 100%)
- Notes
- Attachments (default 1 photo, manager can set more)
- Numeric entry for inventory tasks

**Personalized tasks:** Manager can assign to individuals or role groups; users see a consolidated “Today’s Tasks.”

**Required evidence:** Any and all tasks can be toggled to allow or require a photo by any manager. Numeric entry required for inventory-type task lists. Multiple photos allowed if set in master settings.

**Shift notes:** Managers can add daily summary/shift notes per role.

**Announcements:** Managers can send announcements to all staff.

**Staff requests:** Staff can request new tasks or flag issues.

**Reminders:** Recurring reminders for tasks not completed by a certain time.

**Prep Flow:**
- Gated by an Opening Inventory (required before accessing the rest): items defined by GM.
- After inventory: prep needs assessment. Generate/curate day’s prep tasks.
- Allow drag-and-drop prioritization of prep tasks.
- Lead Prep Cook can assign prep tasks to specific prep cooks.

**Notifications:**
- Baseline: in-app alerts/badges via Supabase Realtime (cannot be disabled/muted by users).
- Optional: Web Push (free) using a service worker. Works on mobile browsers with HTTPS (Vercel). Embedding in Google Sites is via iframe; push still possible but acceptance UX requires a user gesture; fallback provided.
- SMS: Find a free solution to text users if possible. Email optional via provider (free-tier), or Supabase SMTP if configured.

**Security/Embedding:**
- Ensure headers don’t block framing (no X-Frame-Options: DENY; use proper CSP).
- Provide a direct app URL as fallback if embedding limitations arise.
- App disables itself if not loaded from Google Sites (if possible).

## Data Entities (summary)
- Users (Supabase Auth) + Profiles (display name, roles, phone numbers)
- Roles and Flow access mapping
- Task Templates (recurrence, required fields, transferability, priority, drag-and-drop ordering, numeric entry for inventory)
- Daily Task Instances (per user/role/date, state, evidence, completion percent, reason dropdown, notes, attachments, numeric entry for inventory)
- Transfers (approval workflow, cross-role allowed as set by managers)
- Inventory Items and Counts (for opening inventory; units: liters, lbs, tablespoons, teaspoons, cups, oz, quarts; managers can add/edit/remove units)
- Prep Planner Tasks (priority-ordered list for the day, assignable, reorderable by multiple roles)
- Attachments (images) in Supabase Storage (signed URLs; retention: 7 days, auto-email report, then delete; multiple photos allowed if set in master settings)
- Notifications (in-app, SMS if possible, email fallback) + read/unread state
- Shift Notes (per role, per day)
- Announcements (manager to all staff)
- Staff Requests (new tasks, issue flags)
- Reminders (recurring for incomplete tasks)
- History (staff can view their own past completions)

## UI/UX Overview
- Sign-in -> Home (role-filtered buttons) -> Today’s Tasks
- Task instance card: title, due/priority, percent, quick “check” action opening the task form
- Task form: required completion % (0/25/50/75/100), required reason dropdown if not 100%, optional notes, optional photo (or required if template mandates), numeric entry for inventory tasks, multiple photos if allowed
- Transfer action (if allowed): select compatible user(s) -> send request
- Alerts: badge in header; list pending approvals; accept/reject
- Manager screens: templates, assignments, priorities, required fields, inventory setup, prep planner, drag-and-drop ordering, recurrence toggles, master settings for photo count, announcements, shift notes, reminders
- Daily auto-email report to managers with all user data and attachments; photos deleted after 7 days
- Multi-language support: English, Mexican Spanish, Turkish
- Staff can view their own historical completions
- Staff can request new tasks or flag issues
- Announcements visible to all staff
- Shift notes visible to relevant roles
- Recurring reminders for incomplete tasks

## Staff Roster (Provisioned Users)
| Name                   | Roles                                         | Phone        |
|------------------------|-----------------------------------------------|--------------|
| BRYAN COX              | Assistant Manager, FOH Employee               | 916-680-1130 |
| KAYLA MCCULLOUGH       | FOH Employee                                 | 346-546-8421 |
| AHMET CAN GULER        | Ordering Manager, Kitchen Manager, FOH Employee | 775-297-9934 |
| AIDAN REDDY            | FOH Employee                                 | 916-836-6667 |
| AYKUT KIRAC            | Line Cook                                    | 916-509-2075 |
| CHRISTIAN AHKION       | FOH Employee                                 | 916-877-1424 |
| DEMETRI GREGORAKIS (ME)| General Manager                              | 916-513-3192 |
| DILAN UZUM             | Lead Prep Cook, FOH Employee, Line Cook      |              |
| DIMAS HERNANDEZ        | Line Cook                                    | 916-680-3440 |
| EMILIO MORALES         | Dishwasher, Prep Cook                        | 916-716-0200 |
| GEMMA PIQUE            | FOH Employee                                 | 916-708-4656 |
| HUBERTO MALDONADO      | Line Cook                                    | 916-706-9706 |
| HUSEYIN DOKCU          | Dishwasher, Prep Cook, Cleaner                | 279-222-6223 |
| LAURENCE LEE           | Line Cook                                    | 916-531-6401 |
| MIGUEL ERAPE           | Prep Cook                                    |              |
| URIEL REYES-SANCHEZ    | Line Cook                                    | 279-263-0073 |
| ZILAN AVCI             | Prep Cook                                    | 916-719-1123 |

## Success Criteria
- Staff can sign in and only see relevant flows
- “Today’s Tasks” reliably shows correct, prioritized instances
- Transfers function with approval loop and alerts
- Prep opening inventory gating works; prep planner reorders and assigns
- Managers can configure templates, required fields, and assignments without dev help
- Works embedded in Google Sites on iOS/Android browsers; no paid services

## Suggestions & Open Questions
### Features to Consider for Ultimate Ease of Use
- Bulk user import (CSV or Google Sheet sync)
- Quick “reset password” for staff (manager-initiated)
- One-tap “mark all complete” for recurring tasks
- Color-coded priorities and overdue indicators
- Push notification opt-in for managers (for urgent tasks)
- In-app chat or comment threads per task (for clarifications)
- Manager dashboard: analytics (completion rates, overdue, transfer stats)
- Export to PDF/CSV for audits
- Offline mode: allow task completion and photo upload to queue, sync when online
- QR code login for staff (scan at site entrance)
- Customizable home screen (reorder buttons, add shortcuts)
- Multi-location support (if you expand)
- API for future integrations (payroll, scheduling)

### Open Questions & Your Answers
- Any tasks that require numeric entry (e.g., inventory counts) beyond the completion percent?
  - YES THAT WOULD BE FOR A SPECIFIC TASK LIST TYPE "INVENTORY LIST" THAT MANAGERS CAN SELECT WHEN CREATING TASK LISTS
- Should staff be able to see historical task completion (past days/weeks)?
  - ONLY FOR THEMSELVES
- Any need for “shift notes” or daily summary per role?
  - YES FOR ALL MANAGERS
- Should managers be able to send announcements to all staff?
  - YES
- Any tasks that require multiple photos or file uploads?
  - YES BUT DEFAULT TO 1, THAT WOULD BE IN THE MASTER SETTINGS NOT IN THE INDIVIDUAL TASK TO TOGGLE VIA MANAGER
- Should we support “recurring reminders” for tasks not completed by a certain time?
  - YES
- Any need for time tracking (clock-in/out) or attendance?
  - NO
- Should we allow staff to request new tasks or flag issues?
  - YES
- Any integrations with Google Calendar or other tools?
  - LATER

Please review, answer open questions, and suggest any additional features you want!
