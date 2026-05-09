-- Helpers so the manager portal can read teammate rosters + door_events
-- without recursive RLS issues.

-- security-definer escape hatch: returns true if the calling user is a
-- manager or owner of the given team. Bypasses RLS on team_members so the
-- policy below doesn't recurse on itself.
create or replace function public.is_team_manager(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and user_id = auth.uid()
      and role in ('manager', 'owner')
  );
$$;

-- Make team_members readable by team managers/owners (in addition to
-- the user's own row), so the manager portal can list the roster.
drop policy if exists "users read own memberships" on public.team_members;
drop policy if exists "users read team rosters" on public.team_members;
create policy "users read team rosters"
  on public.team_members for select
  using (
    user_id = auth.uid()
    or public.is_team_manager(team_id)
  );

-- Make door_events readable by team managers/owners for any door owned
-- by their team. Reps still only see their own events.
drop policy if exists "users read own door_events" on public.door_events;
drop policy if exists "users read door_events" on public.door_events;
create policy "users read door_events"
  on public.door_events for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.doors d
      where d.id = door_events.door_id
        and d.team_id is not null
        and public.is_team_manager(d.team_id)
    )
  );
