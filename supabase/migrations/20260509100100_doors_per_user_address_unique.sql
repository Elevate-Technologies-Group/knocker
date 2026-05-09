-- Replace global unique(address) with per-user unique(user_id, address) so
-- different reps can each log the same physical address. NULLS NOT DISTINCT
-- treats NULL user_id as equal, so legacy web rows (all user_id=NULL) keep
-- their original global address uniqueness.

alter table public.doors drop constraint if exists doors_address_key;

alter table public.doors
  add constraint doors_user_id_address_unique
  unique nulls not distinct (user_id, address);
