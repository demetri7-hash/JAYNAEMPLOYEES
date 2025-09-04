# Jayna Gyro Employee Management System

This is the Next.js (App Router) web app with Supabase auth for restaurant employee management.

## Database Setup

### 1. Set up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL script in `database_schema.sql` to create all necessary tables and relationships

### 2. Environment Variables

Create a `.env.local` file in this directory with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Schema Overview

The system uses the following main tables:

- **profiles** - User profiles linked to Supabase auth
- **roles** - Available roles in the system  
- **user_roles** - Junction table linking users to roles
- **task_templates** - Reusable task templates
- **task_instances** - Daily task assignments
- **daily_reports** - Service notes and reports

### 4. Default Roles

The system creates these roles automatically:
- general_manager, assistant_manager, kitchen_manager, ordering_manager
- server, cashier, host, barista
- opening_line_cook, lead_prep_cook, opening_prep_cook, transition_line_cook, closing_line_cook

## Setup

1) Install dependencies
```sh
npm install
```

2) Create `.env.local`
- Copy `.env.example` to `.env.local`
- Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from your Supabase project settings (Project Settings → API)

3) Run the app
```sh
npm run dev
```
Open http://localhost:3000

4) Sign in
- Use the same email/password you created in Supabase Authentication
- After sign in, you’ll see the home screen with role-filtered buttons and a Today’s Tasks button

## Deploy to Vercel
- Push this `web` folder to a GitHub repo
- In Vercel, import the repo and select the `web` folder as the root
- Add env vars in Vercel (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- Deploy

## Notes
- Role-filtered buttons are based on your `roles` and `user_roles` tables in Supabase
- Update styles in `styles/globals.css` and components as needed
