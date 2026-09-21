create table if not exists public.job_agent_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.job_agent_state enable row level security;

create policy "Job agent owners read" on public.job_agent_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Job agent owners insert" on public.job_agent_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Job agent owners update" on public.job_agent_state
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Job agent owners delete" on public.job_agent_state
  for delete to authenticated using ((select auth.uid()) = user_id);
