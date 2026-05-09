-- Teams + team_members: foundation for the manager portal.
-- A team is a scope of shared visibility. Reps log doors as themselves
-- (doors.user_id) but doors are also stamped with team_id when the rep
-- is signed in to a team — so managers + teammates can see them.
-- Individual users (no team) keep team_id NULL and see only their own doors.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'rep' check (role in ('rep', 'manager', 'owner')),
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index if not exists team_members_user_id_idx on public.team_members(user_id);
create index if not exists team_members_team_id_idx on public.team_members(team_id);

-- doors gets an optional team_id. NULL = individual; set = team-shared.
alter table public.doors
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists doors_team_id_idx on public.doors(team_id);

-- RLS for teams + team_members. Doors RLS still off (web app compat).
-- Will tighten doors when web migrates to auth.
alter table public.teams enable row level security;

drop policy if exists "members read own teams" on public.teams;
create policy "members read own teams"
  on public.teams for select
  using (exists (
    select 1 from public.team_members tm
    where tm.team_id = teams.id and tm.user_id = auth.uid()
  ));

alter table public.team_members enable row level security;

-- Simple policy: users can only read their own membership rows for now.
-- Avoids recursive policy complexity. The manager portal will use a
-- security-definer helper or the service role to read teammate rows
-- when we get there.
drop policy if exists "users read own memberships" on public.team_members;
create policy "users read own memberships"
  on public.team_members for select
  using (user_id = auth.uid());
