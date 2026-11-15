-- Run this migration in the Supabase SQL Editor for the Farm Vs Monsters project.
create table if not exists public.player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  unlocked_stage integer not null default 1 check (unlocked_stage between 1 and 10),
  completed_stages integer[] not null default '{}',
  coins bigint not null default 0 check (coins >= 0),
  updated_at timestamptz not null default now()
);

alter table public.player_progress enable row level security;

drop policy if exists "Players can read their own progress" on public.player_progress;
create policy "Players can read their own progress"
  on public.player_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Players can insert their own progress" on public.player_progress;
create policy "Players can insert their own progress"
  on public.player_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Players can update their own progress" on public.player_progress;
create policy "Players can update their own progress"
  on public.player_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.player_progress to authenticated;
