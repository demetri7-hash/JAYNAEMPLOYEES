# JAYNA Employees App — Product Outline

A mobile-first web app for Jaina Jairo restaurant staff to sign in, see only their role-relevant workflows, complete/transfer tasks, and for managers to create templates, assign, prioritize, and audit work. Deployed on Vercel, data on Supabase. Embedded in Google Sites intranet.

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
# JAYNA Gyro App — Product Outline
- Ordering Manager (managerial; protected)
A mobile-first web app for JAYNA Gyro restaurant staff to sign in, see only their role-relevant workflows, complete/transfer tasks, and for managers to create templates, assign, prioritize, and audit work. Deployed on Vercel, data on Supabase. Embedded in Google Sites intranet.
- General Manager (super-admin; protected)

- Transition Line Cook
- Closing Line Cook
- Assistant Manager (protected)
- General Manager (protected)

## Task Model (high level)
- Templates: Created by managers; can recur (daily/weekly/monthly), have required fields (e.g., completion %, photo required), priority, transferability, and who can edit.
- Instances: For each day/assignee, instantiate from templates (and ad-hoc tasks). Each instance tracks status, percent complete, notes, attachments.
- Personalized tasks: Manager can assign to individuals or role groups; users see a consolidated “Today’s Tasks.”
- Gated by an Opening Inventory (required before accessing the rest): items defined by GM.
- After inventory: prep needs assessment. Generate/curate day’s prep tasks.
- Allow drag-and-drop prioritization of prep tasks.
- Lead Prep Cook can assign prep tasks to specific prep cooks.
- Baseline: in-app alerts/badges via Supabase Realtime.
- Optional: Web Push (free) using a service worker. Works on mobile browsers with HTTPS (Vercel). Embedding in Google Sites is via iframe; push still possible but acceptance UX requires a user gesture; we’ll provide a fallback.
- Ensure headers don’t block framing (no X-Frame-Options: DENY; use proper CSP).
- Provide a direct app URL as fallback if embedding limitations arise.
- Roles and Flow access mapping.
- Task Templates (recurrence, required fields, transferability, priority).
- Attachments (images) in Supabase Storage (signed URLs).
- Notifications (in-app) + read/unread state.
## UI/UX Overview
- Sign-in -> Home (role-filtered buttons) -> Today’s Tasks.
- Manager screens: templates, assignments, priorities, required fields, inventory setup, prep planner.

## Clarifications Needed (please answer inline)
1) Staff roster: names, emails, roles. Will you provision users or should we invite by email?
I WILL PROVISION USERS

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


2) Role-to-flow mapping: confirm which roles see which home buttons (any exceptions?).
SEE IN QUESTION 1 RESPONSES FOR ROLES. 
DEMETRI IS FULL ACCESS
AHMET, HAS FULL ACCESS
BRYAN HAS 1 LEVEL BELOW FULL ACCESS, HE CANNOT ACCESS GENERAL MANAGER FUNCTIONS BUT HE CAN CREATE EDIT AND APPROVE TASKS PLUS TASK LISTS, PLUS SEE ALL USER UPDATES FOR ALL AVAILBAL HISTORICAL DATA
DILAN ALSO HAS HIGH ACCESS 1 LEVEL DOWN LIKE BRYAN, ALSO WITH THE ABILITY TO CREATE EDIT DELETE UPDATE TASKS AND NEW TASK LISTS

3) Completion scale: fixed at 25/50/100, or allow 0/25/50/75/100? Any tasks requiring exact numeric entry? 
0/25/50/75/100, REQUIRE REASON INPUT VIA DROPDOWN IF NOT 100 SELECTED. DROPDOWN CAN START WITH THE FOLLOWING, AND ALLOW ALL MANAGERS TO EDIT THE OPTIONS, DO NOT ALLOW CUSTOM INPUT HERE. FOR NOW USE: SELECT REASON (DEFAULT AND CANNOT BE USED TO SUBMIT), RAN OUT OF TIME, MISSING INGREDIENT (THEN PROMPT FOR MANUAL IUNPUT OF INGREDIENT/S), DAMAGED EQUIPMENT.

4) Photo requirements: which template types always require a photo? Max photos per task?
ANY AND ALL TASKS CAN BE TOGGLED TO ALLOW A PHOTO AND/OR REQUIRE THE PHOTO BY ANY MANAGER.

5) Recurrence rules: daily vs selected weekdays vs monthly—examples for each?
THIS WILL BE TOGGLED BY ANY MANAGER PER TASK LIST OR INDIVIDUAL TASKS. SHOULD BE A MANGER FUNCTION TO EWASILIY DRAG AND DROP TASKS AS WELL TO ORDER PRIORITY. THE TASKS WILL BE CREATED ONC ETHE APP IS RUNNING BY GENERSL MANAGER AND THE OTHER MANAGERS, CUSTOM TASK LISTS, SETTING FOR RECURRING LISTS OR INDVDL TASKS SHOULD ALSO BE AN OPTION IN THE BACKEND MANAGER SCREEN.

6) Task priorities: simple 1–5 scale OK? Any due times or SLA windows (e.g., must finish Opening by 10:30 AM)?
DRAG AND DROP WITHIN A TASK LISTS, EDIT AND REMOVE ICONS AS WELL

7) Transfer rules: confirm role compatibility sets (all same-role only, or some cross-role allowed?). SOME CROSS-ROLE WILL BE ALLOWED, FOR EACH TASK AND TASK LISTS A MANAGER CAN SELECT A SINGLE ROLE, MULTIPLE, OR ALL ROLES. ROLES ARE IN QUESTION 1.

8) Notifications: prefer in-app only, or add web push prompt? Any email fallback desired?
YES LETS FIND SOMETHING THAT CAN TEXT THE USERS, AND ALWAYS IN APP WITH NO ABILITY FOR USER LEEL TO DISABLE OR MUTE, ALWAYS ON IN APP.

9) Inventory catalog: provide starter list, units, par levels, categories? Any counted-by-weight items?
FOR UNITS LETS START WITH THESE AND ALLOW MANAGERS TO ADD EDIT AND REMOVE AS WE GO: LITERS, LBS, TABLESPOONS, TEASPOONS, CUPS, OZ, QUARTS

10) Prep planner: who can reorder—only Lead Prep Cook, or any prep cook? Should reordering broadcast live?

YES LIVE IF POSSIBLE, IF NOT FORCE A RESET WHEN THEY SAVE THE NEW ORDER. PREP COOK, LEAD PREP COOK, KITCHEN MANAGER, ORDER MANAGER, GENERAL MANAGER AND ASSISTANR MANAGER CAN RE-ORDER.

11) Manager edit rights: which non-GM roles can change templates/assignments? Precise list.
LEAD PREP COOK, KITCHEN MANAGER, ORDER MANAGER, GENERAL MANAGER AND ASSISTANR MANAGER

12) Evidence retention: how long to keep photos/notes? Any export/reporting requirements?
EMAIL DAILIY REPORT WITH ALL DATA FROM ALL USERS IN A CLEAN FORMATTED MANAGERS REPORT, INCLUDE ATTACHEMENT WITH ALL PHOTOS AND ANY OTHER UPPLOADS, RESET THE DATABASE OF PHOTOS TO RPESERVE SPAVE AFT 7 DAYS FROM UPLOAD, AND MAKE SURE ITS BEEN EMAILED AS A LIVE UPLOADED FILE, NOT A LINK TO WHERE ITS TEMPROIARILY HELD FOR 7 DAYS.

13) Privacy & PII: any constraints for storing staff names/emails/photos?
NO

14) Branding: logo, colors, iconography for buttons—do you have assets?
CHECK WWWW.JAYNAGYRO.COM FOR INSPIRATION AND LOGO

15) Languages: English only now?
ENGLISH, MEXICAN SPANISH, AND TURKISH

16) Access window: any time restrictions (e.g., sign-in only on-prem Wi‑Fi)?
NOTHING

17) Google Sites: what domain hosts the site? Any CSP restrictions we must obey?
NO CUSTOM DOMAIN, GOOGLE SITES REGULAR ACCESS. WE WILL EMBEDD THE WEBAPP URL AS A FULL SCREEN EMBED, AND I WILL MANUALLY SHARE THE SITE ACCESS TO MY USERS VIA THEIR GMAIL ACCOUNT, AND THE WEB APP STAYS SECURE THAT WAY, IF THERES A WAY TO PULL A KEY OR SOMETHING THAT VERIFIES THE APP ISBEING RUN FROM THE GOOGLE SITE, OTHERWISE ANY OTHER SOURCE IT WILL STAY DISABLED.

---

## Success Criteria

---

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

### Open Questions
- Any tasks that require numeric entry (e.g., inventory counts) beyond the completion percent?
YES THAT WOULD BE FOR A SPECIFIC TASK LIST TYPE "INVENTORY LIST" THAT MANAGERS CAN SELECT WHEN CREATING TASK LISTS
- Should staff be able to see historical task completion (past days/weeks)?
ONLY FOR THEMSELVES
- Any need for “shift notes” or daily summary per role?
YES FOR ALL MANAGERS
- Should managers be able to send announcements to all staff?
YES
- Any tasks that require multiple photos or file uploads?
YES BUT DEGAULT TO 1, THAT WOULD BE IN THE MASTER SETTINGS NOT IN THE INDIVIUDAL TASK TO TOGGLE VIA MANAGER
- Should we support “recurring reminders” for tasks not completed by a certain time?
YES
- Any need for time tracking (clock-in/out) or attendance?
NO
- Should we allow staff to request new tasks or flag issues?
YES
- Any integrations with Google Calendar or other tools?
LATER

Please review, answer open questions, and suggest any additional features you want!
