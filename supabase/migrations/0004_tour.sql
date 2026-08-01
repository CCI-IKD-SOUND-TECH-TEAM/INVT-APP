-- Onboarding tour — per-user completion stamp.
--
-- Stored on profiles (not just localStorage) so the tour follows the user
-- across browsers and devices — church staff share machines. The client keeps
-- a localStorage guard as fallback: if this write fails the tour still won't
-- re-show on that device, and the client retries the write on the next visit.
--
-- Null = auto-start the tour. Finishing OR skipping both set it.
-- No RLS changes: the existing "update own profile" policy (0001) already
-- permits the self-update.

alter table public.profiles
  add column if not exists tour_completed_at timestamptz;

comment on column public.profiles.tour_completed_at is
  'Set when the onboarding tour is finished or skipped. Null = auto-start the tour.';
