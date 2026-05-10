# Knocker web — handoff: catch up to iOS multi-tenant model

This handoff is from the agent that built the iOS app (`~/Code/Knocker`, native SwiftUI) and shipped a manager portal scaffold here at `/manager`. The iOS migration introduced auth, teams, an activity log, and a few schema changes. **The web app's rep view is now out of sync with that model and partially broken in production.**

You are picking up from here. Goal: bring the web rep view in line with the iOS app so they share the same Supabase backend cleanly, and finish the manager portal where I left off.

Live URL: https://knocker-web.vercel.app
Manager portal: https://knocker-web.vercel.app/manager
Supabase project: `rxfpsuczmkhxetmzbppb`
Repo: `Elevate-Technologies-Group/knocker` (master, auto-deploys to Vercel — `vercel --prod` from `~/Code/knocker-web` if you need to push manually)

## Context: what shipped on iOS that the web doesn't have yet

The iOS app (`~/Code/Knocker/Knocker/`) ships these features the web app does not:

- **Auth** — Sign in with Apple + email OTP via Supabase Auth. No more `localStorage` rep names.
- **Teams** — Sign-in flow has Individual / Team segmented control. Joining a team requires the team slug; bootstrap team is `clean-grid-solar`.
- **Activity log per door** — `door_events` table, every disposition change is a row. The doors table no longer carries a single mutable `notes` field as the source of truth.
- **`hot_lead` retired → `appointment`** — the strongest disposition is now an actual scheduled appointment (`door_events.appointment_at` timestamp).
- **`dq` status** — disqualified, separate from `not_interested`.
- **Pipeline screen** — replaces "History" with three segments: Pipeline (Kanban grouped by status), Calendar (week view with appointments), History (list).
- **Solar median sun-hours** — Google Solar API parsed for `medianSunshineHours` (from `wholeRoofStats.sunshineQuantiles`), not max. Web already does this — keep it.

## What's broken right now

1. **Rep view loads, but house-dot rendering is broken after sign-in** (per user). Root cause not diagnosed yet — likely either (a) Overpass query failing under newer base URL behavior, or (b) doors fetch silently 401-ing because RLS policies have shifted under it. **Verify before fixing.**
2. **Manager portal sign-in throws "invalid API key"** if the build doesn't have env vars baked in. As of last deploy, env vars are now set on the Vercel project (`vercel env ls production`). If a fresh build still errors, check `import.meta.env.VITE_SUPABASE_ANON_KEY` is actually populated in the bundle (`curl -s https://knocker-web.vercel.app/assets/<hash>.js | grep -oE 'eyJhbGc[A-Za-z0-9_.-]{40,}'`).
3. **Doors RLS is intentionally OFF** — see [`supabase/migrations/20260509100000_add_user_id_to_doors.sql`](supabase/migrations/20260509100000_add_user_id_to_doors.sql). The web app's anonymous flow would break instantly if RLS were enforced. Don't enable RLS on `doors` until the rep view requires sign-in. **This is the load-bearing constraint for everything below.**

## The new schema (what's already migrated)

All migrations live under `supabase/migrations/` and have been applied to the Knocker Supabase project (`rxfpsuczmkhxetmzbppb`).

| Table | What's new | Notes |
|---|---|---|
| `doors` | `user_id` (uuid, nullable, FK auth.users), `team_id` (uuid, nullable, FK teams) | RLS still off. Legacy rows have NULL user_id. |
| `doors` | UNIQUE constraint changed: was global on `address`, now `(user_id, address)` with `NULLS NOT DISTINCT` | Different reps can each log the same physical address. Legacy NULL-user rows still globally unique. |
| `door_events` | New table: id, door_id, user_id, rep_name, status, notes, appointment_at, created_at | RLS ON. Each disposition change = one row. Manager-portal RLS allows `is_team_manager(d.team_id)` to read events for team-stamped doors. |
| `teams` | id, name, slug (unique), owner_user_id | RLS ON. Members can read teams they belong to. |
| `team_members` | id, team_id, user_id, role ('rep'\|'manager'\|'owner') | RLS ON. Users see their own row + roster if they're a manager via `is_team_manager()` security-definer. |

Helpers:
- `is_team_manager(p_team_id uuid) returns boolean` — security-definer; use in RLS policies to avoid recursion.

Bootstrap migration `20260509150000_bootstrap_clean_grid_solar.sql` creates the `clean-grid-solar` team and assigns the most-recent auth.users row as owner. If Keagan signed in to the iOS app first (he did), he is the owner.

## Required changes (priority order)

### P0 — make the rep view actually work for the new world

**Auth-aware rep flow.** The current `App.jsx` `RepView()` saves a rep name to localStorage and uses a `session_id` string. This needs to be replaced (or coexist with, for transition) a real Supabase Auth flow that mirrors iOS:

- Existing reference: [`src/manager/ManagerLogin.jsx`](src/manager/ManagerLogin.jsx) — I built it for the manager portal but the OTP flow is identical to what reps need.
- iOS UX to mirror: `~/Code/Knocker/Knocker/Views/AuthView.swift` — Individual / Team segmented Picker, team slug field for Team mode, "Sign in with Apple" + email OTP. Apple Sign In is iOS-only; for web it's email OTP only (or add Apple OAuth later if you want).
- After sign-in: persist `activeTeam` (id + name + role) to localStorage like iOS does in `AuthViewModel.swift`. Reps in a team get `team_id` stamped; individuals get `team_id = null`.
- Logging into a team: query `teams` by slug, then `team_members` where `team_id = team.id and user_id = auth.uid()`. If no row, create one with role `rep`. (Match `AuthViewModel.verifyTeamMembership`.)

**Stamp `user_id` and `team_id` on every door insert.** `src/lib/api.js` `logDoor()` currently sends only `lat/lng/address/status/notes/rep_name/session_id/owner_name/proposal`. Add `user_id` and `team_id` from the active session/team. Use upsert conflict on `(user_id, address)` not `address`.

**Fetch doors scoped to user OR team.** Right now `getDoors(session_id)` filters by `session_id`. Replace:
- If `team_id` present: `select * from doors where team_id = $1`
- Else (individual): `select * from doors where user_id = $1`
- Drop `session_id` from queries entirely. (Keep the column in the DB for now — legacy rows may use it. But new code shouldn't write or filter on it.)

**Realtime subscription.** Same change: filter by `team_id=eq.X` or `user_id=eq.X`, not `session_id`.

### P1 — switch from `doors.notes` to `door_events` log

The activity-log model is the source of truth now. The rep modal should:
- On save: insert a row into `door_events` (with `appointment_at` if status=appointment), then upsert the `doors` row to reflect the latest disposition. iOS reference: `~/Code/Knocker/Knocker/ViewModels/DoorsViewModel.swift` `saveDoor(_, eventNote:, appointmentAt:)`.
- In the modal: render the chronological log fetched via `fetchEvents(for:)` (in iOS) — `select * from door_events where door_id = $1 order by created_at desc`.
- The current `notes` column on `doors` should be treated as deprecated; only show it as a fallback when no events exist.

### P1 — replace `hot_lead` with `appointment` and add `dq`

- iOS uses 6 statuses: `appointment`, `interested`, `callback`, `not_interested`, `no_answer`, `dq`. The legacy `hot_lead` is mapped to `appointment` on read for backward compat (see `Door.swift` enum init), and the bootstrap migration already updated existing rows.
- Web's `src/lib/constants.js` `DOOR_STATUSES` needs to be updated to the 6-status list. Match the iOS color palette in `DoorModalView.swift` (cyan/green/amber/red/slate/dark-slate).

### P1 — Pipeline view (replaces History)

iOS reference: `~/Code/Knocker/Knocker/Views/PipelineView.swift` — three segments:
- **Pipeline** — horizontal Kanban, one column per status, doors as cards
- **Calendar** — week strip with day badges showing appointment count, agenda below
- **History** — flat list (the existing `HistoryScreen.jsx` mostly works for this; just make it event-aware)

The current `src/components/HistoryScreen.jsx` is fine as a starting point for the History segment; the other two are net-new.

### P2 — appointment date picker in the modal

iOS reference: `~/Code/Knocker/Knocker/Views/AppointmentPickerSheet.swift` — `.graphical` DatePicker. Web equivalent: any datetime-local input or a small calendar lib. When status = `appointment`, show the picker, save to `door_events.appointment_at`.

### P2 — Settings parity

The iOS Settings screen has Account (email + display name + sign out), Active Team section (team name, role, slug copy, leave team button), Door Modal toggle (showSolarInfo persisted in UserDefaults), About. Web should match — or at least have Sign Out + Active Team + the showSolarInfo preference somewhere visible.

## What's already done that you should NOT redo

- `/manager` route is wired up: [`src/App.jsx`](src/App.jsx) routes, [`src/manager/ManagerApp.jsx`](src/manager/ManagerApp.jsx) auth + role check, [`src/manager/ManagerLogin.jsx`](src/manager/ManagerLogin.jsx) email OTP, [`src/manager/Dashboard.jsx`](src/manager/Dashboard.jsx) team pipeline + roster + recent activity feed.
- React Router is installed and wrapped in `src/main.jsx`. SPA rewrites are in `vercel.json`.
- All seven migrations under `supabase/migrations/` are applied to the live Supabase project. **Don't re-apply** — they're idempotent but pointless. To check what's applied: `supabase migration list --project-ref rxfpsuczmkhxetmzbppb` (or use the Supabase MCP / Management API).
- Vite base path is now root (`vite.config.js` no longer has `base: '/knocker/'`). Don't add it back.
- Vercel env vars are set on the project, not in `vercel.json`. The `env` block in `vercel.json` was misleading (it injects runtime env for serverless functions, not Vite build env). Removed.
- `parcel-lookup` edge function is deployed to the Knocker Supabase project. iOS uses it via GET with query params + Bearer anon key. **iOS gateway requires JWT-format anon key, not `sb_publishable_*` keys** — keep that in mind if you ever rotate keys.
- Custom OTP email template was set via Supabase Management API (mailer_otp_length=6, body shows the token prominently). Sender name still says "Supabase" — Resend SMTP setup is in flight, separate task.

## Reference: iOS files most relevant to your work

- **Auth:** `~/Code/Knocker/Knocker/ViewModels/AuthViewModel.swift`, `~/Code/Knocker/Knocker/Views/AuthView.swift`
- **Doors data layer:** `~/Code/Knocker/Knocker/ViewModels/DoorsViewModel.swift`
- **Models:** `~/Code/Knocker/Knocker/Models/{Door,DoorEvent,SolarData,Team}.swift`
- **Modal layout:** `~/Code/Knocker/Knocker/Views/DoorModalView.swift`
- **Pipeline screen:** `~/Code/Knocker/Knocker/Views/PipelineView.swift`
- **Settings:** `~/Code/Knocker/Knocker/Views/SettingsView.swift`

You can read these to understand intended behavior; you don't need to mirror Swift idioms in JS.

## Out of scope for this handoff

- Do **not** enable RLS on `public.doors` yet. The migration to do so should be your final commit, after the rep view is fully auth-gated and you've verified the manager dashboard still works.
- Do **not** remove `session_id`, `rep_name`, or `notes` columns from `doors`. They're still populated by legacy rows and may be referenced by old views. Stop writing to them in new code; leave them in the schema.
- Do **not** rip out the existing localStorage rep-name flow without first confirming there's no in-flight session you'd be logging out. Add the auth flow alongside it, then remove the old path once the new one is verified.
- The Knocker iOS Apple OAuth provider (`com.elevate.Knocker`) is enabled in Supabase. The web app **does not** need to support Apple Sign In — email OTP is enough.

## Testing checklist (when you're ready to ship)

1. Sign-in flow loads at `/` (rep view) — Individual and Team paths both work. Test Team flow with slug `clean-grid-solar`.
2. After sign-in, doors fetch is scoped: individual users see only their own dots, team users see all team-stamped dots.
3. Save a new door → row appears in `public.doors` with correct `user_id` and `team_id`. A row also lands in `public.door_events`.
4. Save a status change → new `door_events` row, `doors.status` updated.
5. Save status `appointment` with a future date → `door_events.appointment_at` is set, appears in the Calendar view.
6. Hit `/manager` while signed in as Keagan → manager dashboard loads, shows team pipeline counts, roster, and recent events from step 3-5.
7. Sign out from rep view → routes back to sign-in, no stale localStorage causing zombie sessions.
8. Verify Realtime: open two browsers signed into the same team, save a door in one, see the dot appear in the other within ~2s.

## Final ordering of commits I'd recommend

1. `feat(auth): email OTP sign-in for rep view, mirroring /manager`
2. `feat(teams): Individual vs Team toggle on sign-in + team verification`
3. `refactor(api): scope doors fetch + insert by user_id and team_id`
4. `feat(events): write to door_events on every disposition change`
5. `feat(modal): activity log + appointment date picker`
6. `feat(pipeline): replace History with Pipeline / Calendar / History segments`
7. `feat(constants): retire hot_lead, add dq, update color palette to match iOS`
8. `chore(rls): enable RLS on doors with user_id/team_id policies`

Each commit should leave the app deployable. The Vercel auto-deploy will pick up master pushes (once the GitHub OAuth connection is wired up — currently the Vercel project is not connected to the repo, so deploys are manual via `vercel --prod`).
