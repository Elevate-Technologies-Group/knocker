-- One-off bootstrap: create the Clean Grid Solar team and add Keagan as owner
-- so we have something to test the team sign-in flow against.
--
-- We try to find Keagan's auth.users row by his known email first; if Apple's
-- "Hide my email" was used, we fall back to the most recently created user
-- (this project has a single user right now). If the project ever has more
-- users when this runs again, the fallback won't fire because the team_members
-- insert is idempotent.

do $$
declare
  v_team_id uuid;
  v_user_id uuid;
begin
  insert into public.teams (name, slug, owner_user_id)
  values ('Clean Grid Solar', 'clean-grid-solar', null)
  on conflict (slug) do nothing;

  select id into v_team_id from public.teams where slug = 'clean-grid-solar';

  -- Try Keagan's known email first
  select id into v_user_id from auth.users
  where email = 'cleangridsolar@gmail.com'
  limit 1;

  -- Fallback: most recent user (covers Apple private-relay case)
  if v_user_id is null then
    select id into v_user_id from auth.users
    order by created_at desc
    limit 1;
  end if;

  if v_team_id is not null and v_user_id is not null then
    update public.teams
      set owner_user_id = v_user_id
      where id = v_team_id and owner_user_id is null;

    insert into public.team_members (team_id, user_id, role)
    values (v_team_id, v_user_id, 'owner')
    on conflict (team_id, user_id) do nothing;
  end if;
end $$;
