# JAYNA Employees — Kickoff

Start here. This repo currently contains:
- `docs/APP_OUTLINE.md` — Product outline with inline questions for you to answer.
- `docs/DEV_PLAN.md` — Step-by-step phased plan with tasks and clarifications.
- `db/supabase_schema.sql` — Ready-to-apply SQL schema for Supabase (tables, RLS, storage).
- `Folsom_Blvd.txt` — Your original transcript.

## Quick Start

## Quick Start (Easy Steps)

1) Create your Supabase project (already done!)

2) Add yourself as General Manager
	- Go to Supabase dashboard > Authentication > Users
	- Click "Add User" and enter your email and a password you want to use
	- After you create your user, go to Table Editor > user_roles
	- Click "Insert Row"
	- For `user_id`, paste your new user's ID (find it in Authentication > Users)
	- For `role_id`, enter the number for General Manager (usually 1, check the roles table to confirm)
	- Click "Save"

3) Fill in clarifications
	- Open `docs/APP_OUTLINE.md` and `docs/DEV_PLAN.md` in VS Code
	- Answer any questions marked [Clarify] directly in the files

4) Next steps (app scaffold)
	- Once you finish the clarifications, let me know
	- I’ll generate the starter Next.js app for you, with login and home screen wired to Supabase

## Optional: Local Supabase (for advanced users)
If you want to run Supabase on your own computer:

```sh
brew install supabase/tap/supabase
supabase init
supabase start
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f db/supabase_schema.sql
```

## Notifications
- In-app alerts are built-in (enable Realtime for `task_instances`, `transfers`, `notifications` in Supabase dashboard)
- Web Push can be added later for free

## Embedding in Google Sites
- When the app is ready, you’ll get a public URL
- In Google Sites, add an "Embed" block and paste the app URL
- Make it full-width and full-height for best results

## What’s next?
- Fill in the clarifications in the docs
- Tell me when you’re ready, and I’ll build the starter app for you
