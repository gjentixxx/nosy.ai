# Job Agent Setup

## Local preview

Run `npm run dev` and open `http://localhost:3000`.
Set `AGENT_BUILDER_PASSWORD` in `.env.local` to choose the private access password. Keep this file local; it is gitignored. The preview saves extracted resume text, saved jobs, and drafts in `.data/job-agent.db` (also gitignored).

PDF extraction uses the cross-platform `pdf-parse` package. Text and Markdown resumes also work. The app does not send job applications or email automatically.

## Supabase and Google

1. Create or connect a Supabase project, then apply `supabase/migrations/0003_resume_job_agent.sql`. The `job_agent_state` table has owner-only row-level policies.
2. Configure Google Auth in Supabase and register `http://localhost:3000/auth/callback` in the Supabase redirect allow list. Add the deployed origin's callback when hosting.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `.env.local`, then restart the server. Hosted workspace data is now persistent behind the password. Once Google OAuth is configured, set `GOOGLE_LOGIN_ENABLED=true` to require Google sign-in after the password.

Job listings use the free Remotive and Arbeitnow APIs. The matcher accepts fresh postings with matching role titles, resume capabilities, seniority, and eligible region. Related design roles appear only when no exact design role qualifies. Searches refresh every five minutes while the hired agent page is open.

Selecting a job prepares editable resume, cover letter, subject, and email drafts. Local drafting works without an AI key. To enable optional Gemini drafting, set `GEMINI_API_KEY` in the host environment. The user must opt in before resume text is sent to Google. Email drafts open through the default mail app; Gmail sending is not enabled.
