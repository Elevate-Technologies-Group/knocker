-- Appointment scheduling: door_events with status='appointment' carry the
-- scheduled date+time as a real timestamp, not embedded in free-text notes.
-- Drives the Calendar view in Pipeline and lets the activity log render
-- "Scheduled: Mar 15, 2026 at 3:00 PM" cleanly.

alter table public.door_events
  add column if not exists appointment_at timestamptz;

create index if not exists door_events_appointment_at_idx
  on public.door_events(appointment_at)
  where appointment_at is not null;
