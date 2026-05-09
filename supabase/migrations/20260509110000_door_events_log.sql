-- Activity log for doors: every disposition change + note becomes a row here.
-- Replaces the previous "single notes field on doors" model with a chronological
-- log so reps can see "Marked Not Interested by Keagan · 2 days ago: <note>".

create table if not exists public.door_events (
  id uuid primary key default gen_random_uuid(),
  door_id uuid not null references public.doors(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  rep_name text,
  status text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists door_events_door_id_created_at_idx
  on public.door_events(door_id, created_at desc);

-- Retire `hot_lead` in favor of `appointment` (better fits the funnel — a real
-- appointment is the strongest possible disposition).
update public.doors
set status = 'appointment'
where status = 'hot_lead';

-- Backfill: each existing user-owned door becomes its first activity log entry.
-- Uses the door's last update time so the log shows the right "when".
insert into public.door_events (id, door_id, user_id, rep_name, status, notes, created_at)
select
  gen_random_uuid(),
  d.id,
  d.user_id,
  d.rep_name,
  d.status,
  d.notes,
  coalesce(d.updated_at, d.created_at, now())
from public.doors d
where d.user_id is not null
  and not exists (
    select 1 from public.door_events e where e.door_id = d.id
  );

-- RLS on door_events. Doors table stays RLS-off until web migrates to auth,
-- but door_events is a new iOS-only table so we can lock it down properly now.
alter table public.door_events enable row level security;

drop policy if exists "users read own door_events" on public.door_events;
create policy "users read own door_events"
  on public.door_events for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own door_events" on public.door_events;
create policy "users insert own door_events"
  on public.door_events for insert
  with check (auth.uid() = user_id);
