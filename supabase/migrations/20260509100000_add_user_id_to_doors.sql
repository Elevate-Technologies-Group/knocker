-- Add user_id to doors for per-user data scoping (iOS auth, phase 1).
-- Nullable on purpose: legacy web rows have no user_id and we don't want
-- to break them. iOS sets user_id = auth.uid() on every insert.
-- RLS is intentionally NOT enabled here — the web app still uses anon
-- and would break. Enable RLS in a later migration once both apps
-- require auth.

alter table public.doors
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists doors_user_id_idx on public.doors(user_id);
