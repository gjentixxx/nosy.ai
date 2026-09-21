# Nosy.ai

Private resume-based job search workspace. Upload a PDF or text resume, review fresh and relevant openings, and edit an application resume, cover letter, subject, and email for a selected job. Applications are never sent automatically.

## Run locally

1. Install Node.js 22 or newer and run `npm ci`.
2. Copy `.env.example` to `.env.local` and set a strong `AGENT_BUILDER_PASSWORD`.
3. Run `npm run dev` and open `http://localhost:3000`.

Without Supabase configuration, workspace data is stored in a local SQLite database under `.data/`. It is not suitable for ephemeral serverless hosting. For a password-protected hosted workspace, configure a Supabase project, apply `supabase/migrations/0003_resume_job_agent.sql`, and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` on the host. Never expose that service-role key in browser code. Google sign-in is optional until its OAuth client is ready; then enable the provider in Supabase, set `GOOGLE_LOGIN_ENABLED=true`, set `NEXT_PUBLIC_SITE_URL` to the deployment origin, and register its `/auth/callback` URL with Supabase Auth.

Drafts work locally without an AI key. Set `GEMINI_API_KEY` to enable AI-assisted tailoring after the user explicitly opts in to sending resume text to the provider. The job sources are Remotive and Arbeitnow. See `agent-builder-setup.md` for details.

The GitHub repository stores source code; it does not host the running Next.js app. Deploy to a server-capable platform with a persistent database before sharing an app URL. Never commit `.env.local`, `.data/`, or uploaded resumes.
