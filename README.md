# JAYNA Employees — Kickoff

Start here. This repo currently contains:
- `docs/APP_OUTLINE.md` — Product outline with inline questions for you to answer.
- `docs/DEV_PLAN.md` — Step-by-step phased plan with tasks and clarifications.
- `db/supabase_schema.sql` — Ready-to-apply SQL schema for Supabase (tables, RLS, storage).
- `Folsom_Blvd.txt` — Your original transcript.

## Quick Start

1) Create a free Supabase project
- Go to Supabase, create a project.
- In SQL Editor, paste the entire contents of `db/supabase_schema.sql` and run it.
- In Storage, ensure the `attachments` bucket exists; if not, re-run the storage command in the SQL.
- In Table Editor, confirm `roles`, `flows`, and policies exist.

2) Create your user and make yourself General Manager
- Sign up in the app later, or create an auth user in Supabase Auth.
- After your user exists, add a row to `user_roles` mapping your user id to the `general_manager` role.

3) Answer clarifications
- Open `docs/APP_OUTLINE.md` and `docs/DEV_PLAN.md` and fill in all [Clarify] sections inline.

4) App scaffold (coming next)
- We’ll generate a Next.js app with Supabase auth and the home screen in the next step once clarifications are in.

## Optional: Local dev with Supabase CLI
If you prefer local dev, you can run Supabase locally and apply the schema.

```sh
# Install supabase cli
brew install supabase/tap/supabase

# Initialize (inside a new app folder, not this docs repo)
supabase init

# Start local stack
supabase start

# Apply schema
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f db/supabase_schema.sql
```

## Notifications
- In-app alerts are enabled via database tables and Realtime (enable Realtime for `task_instances`, `transfers`, `notifications`).
- Web Push can be added for free later; we’ll wire it in Phase 5 if desired.

## Embedding in Google Sites
- We’ll deploy to Vercel later; embed the app URL in a full-width/full-height iframe inside Google Sites.
- We’ll ensure headers allow embedding and CSP is safe.

## Next
- Fill in the clarifications.
- Tell me when you’re ready, and I’ll generate the starter Next.js app with the Home screen wired to Supabase.
