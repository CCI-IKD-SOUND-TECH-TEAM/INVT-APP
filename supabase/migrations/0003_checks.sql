-- Weekly presence checks — per-department setup / set-down walkthrough sessions.
--
-- A session is one walkthrough: a staff member starts a check for one
-- department + type (setup or set_down) in a given week, marks every
-- non-retired item present / missing / issue, and completes it. week_start is
-- the Sunday that opens the week, computed app-side (lib/checks.ts) — the
-- Sunday-service setup is the first check of the week.
--
-- Access model mirrors 0002: every authenticated staff member has identical
-- read + write access; RLS only shuts out unauthenticated requests.

-- ---------------------------------------------------------------------------
-- Check sessions
-- ---------------------------------------------------------------------------
create table if not exists public.check_sessions (
  id              uuid primary key default gen_random_uuid(),
  department_id   uuid        not null references public.departments (id),
  session_type    text        not null check (session_type in ('setup','set_down')),
  week_start      date        not null,
  status          text        not null default 'in_progress'
                    check (status in ('in_progress','completed','abandoned')),
  started_by      uuid        references public.profiles (id),
  completed_by    uuid        references public.profiles (id),
  completed_at    timestamptz,
  -- Summary counters, written once by completeCheckSession so the landing
  -- page / dashboard / past-session list never need to load old entries.
  total_items     integer,
  present_count   integer,
  missing_count   integer,
  issue_count     integer,
  shortfall_count integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One live-or-completed session per department + type + week. 'abandoned'
-- sessions are excluded so a botched session can be restarted.
create unique index if not exists check_sessions_week_uniq
  on public.check_sessions (department_id, session_type, week_start)
  where status <> 'abandoned';

create index if not exists check_sessions_week_idx on public.check_sessions (week_start desc);
create index if not exists check_sessions_status_idx on public.check_sessions (status);

drop trigger if exists set_check_sessions_updated_at on public.check_sessions;
create trigger set_check_sessions_updated_at
  before update on public.check_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Check entries — one row per item marked within a session
-- ---------------------------------------------------------------------------
create table if not exists public.check_entries (
  id                uuid        primary key default gen_random_uuid(),
  session_id        uuid        not null references public.check_sessions (id) on delete cascade,
  item_id           uuid        not null references public.inventory_items (id) on delete cascade,
  result            text        not null check (result in ('present','missing','issue')),
  -- Snapshot of inventory_items.quantity at record time, so shortfalls stay
  -- correct even after the item's quantity is later edited.
  quantity_expected integer     not null check (quantity_expected >= 0),
  quantity_seen     integer     not null check (quantity_seen >= 0),
  note              text,
  checked_by        uuid        references public.profiles (id),
  checked_at        timestamptz not null default now(),
  constraint check_entries_missing_zero check (result <> 'missing' or quantity_seen = 0),
  constraint check_entries_session_item_uniq unique (session_id, item_id)
);

create index if not exists check_entries_session_idx on public.check_entries (session_id);
create index if not exists check_entries_item_idx on public.check_entries (item_id, checked_at desc);

-- ---------------------------------------------------------------------------
-- "Last confirmed" per item — present and issue both mean physically seen.
-- security_invoker so the view runs under the caller's RLS, matching 0002.
-- ---------------------------------------------------------------------------
create or replace view public.item_last_confirmed
  with (security_invoker = true) as
select item_id, max(checked_at) as last_confirmed_at
from public.check_entries
where result in ('present','issue')
group by item_id;

-- ---------------------------------------------------------------------------
-- audit_log gains the 'Check' action type
-- ---------------------------------------------------------------------------
alter table public.audit_log drop constraint if exists audit_log_action_type_check;
alter table public.audit_log add constraint audit_log_action_type_check
  check (action_type in ('Create','Edit','Retire','Reactivate','Defect',
                         'Repair Status Change','Settings','Check'));

-- ---------------------------------------------------------------------------
-- Row Level Security — authenticated staff read + write everything
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['check_sessions','check_entries']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format($f$
      drop policy if exists "authenticated read %1$s" on public.%1$I;
      create policy "authenticated read %1$s" on public.%1$I
        for select to authenticated using (true);
    $f$, t);

    execute format($f$
      drop policy if exists "authenticated write %1$s" on public.%1$I;
      create policy "authenticated write %1$s" on public.%1$I
        for all to authenticated using (true) with check (true);
    $f$, t);
  end loop;
end;
$$;
