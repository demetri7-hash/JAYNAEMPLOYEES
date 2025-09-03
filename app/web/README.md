# JAYNA Gyro — Web App

This is the Next.js (App Router) web app with Supabase auth.

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
