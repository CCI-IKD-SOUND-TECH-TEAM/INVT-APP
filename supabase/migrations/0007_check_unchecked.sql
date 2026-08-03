-- Weekly checks: allow completing a session with items never marked.
-- Coverage is no longer enforced at completion; instead the count of
-- never-checked items is denormalized so reports distinguish "confirmed
-- present" from "never looked at". No constraint changes — enforcement
-- lived in the app layer (completeCheckSession).

alter table public.check_sessions add column if not exists unchecked_count integer;
