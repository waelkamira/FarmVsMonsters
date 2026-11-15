-- Farm Vs Monsters: player identity and persistent game data.
-- Apply after 001_player_progress.sql in the Supabase SQL Editor.
-- Authentication identities (email and Google) remain managed by Supabase Auth.

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  auth_provider text not null default 'email',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- One row per player and achievement; safe to award repeatedly.
create table if not exists public.player_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, achievement_key)
);

-- Future-proof inventory for unlockable items and cosmetics.
create table if not exists public.player_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  quantity integer not null default 1 check (quantity >= 0),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

-- Keep a profile row in sync with each new Supabase Auth identity,
-- including users who register through Google OAuth.
create or replace function public.handle_new_player_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.player_profiles (user_id, display_name, avatar_url, auth_provider)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_app_meta_data ->> 'provider', 'email')
  )
  on conflict (user_id) do update set
    display_name = coalesce(excluded.display_name, public.player_profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.player_profiles.avatar_url),
    auth_provider = excluded.auth_provider,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_player_profile on auth.users;
create trigger on_auth_user_created_player_profile
  after insert or update of raw_user_meta_data, raw_app_meta_data on auth.users
  for each row execute function public.handle_new_player_profile();

alter table public.player_profiles enable row level security;
alter table public.player_settings enable row level security;
alter table public.player_achievements enable row level security;
alter table public.player_inventory enable row level security;

drop policy if exists "Players can read their own profile" on public.player_profiles;
create policy "Players can read their own profile"
  on public.player_profiles for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Players can update their own profile" on public.player_profiles;
create policy "Players can update their own profile"
  on public.player_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Players can read their own settings" on public.player_settings;
create policy "Players can read their own settings"
  on public.player_settings for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Players can insert their own settings" on public.player_settings;
create policy "Players can insert their own settings"
  on public.player_settings for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Players can update their own settings" on public.player_settings;
create policy "Players can update their own settings"
  on public.player_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Players can read their own achievements" on public.player_achievements;
create policy "Players can read their own achievements"
  on public.player_achievements for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Players can read their own inventory" on public.player_inventory;
create policy "Players can read their own inventory"
  on public.player_inventory for select to authenticated
  using (auth.uid() = user_id);

grant select, update on public.player_profiles to authenticated;
grant select, insert, update on public.player_settings to authenticated;
grant select on public.player_achievements to authenticated;
grant select on public.player_inventory to authenticated;
