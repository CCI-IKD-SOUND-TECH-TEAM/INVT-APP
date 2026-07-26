-- Profiles — mirrors the `Profile` interface in lib/types.ts.
--
-- Open signup: anyone may create an account and sign in. A profile row is
-- created automatically for each new auth user by the on_auth_user_created
-- trigger below (see requestSignIn in app/actions/auth.ts + shouldCreateUser:
-- true). is_active = false explicitly blocks a specific person without closing
-- signup for everyone.

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text        not null,
  email         text        not null unique,
  is_active     boolean     not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Staff accounts. Seeded ahead of time — no self-serve signup.';
comment on column public.profiles.is_active is
  'False blocks sign-in without deleting history the audit trail references.';

create index if not exists profiles_email_idx on public.profiles (lower(email));

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- All five hold identical access, so everyone reads everyone (needed to build
-- notification recipient lists and render the Settings user panel).
drop policy if exists "authenticated read all profiles" on public.profiles;
create policy "authenticated read all profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Writes are self-only. Nothing in the product lets one user edit another.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No insert/delete policy: rows arrive via the auth.users trigger below, and
-- removal happens through the cascade. Both run as the table owner and bypass
-- RLS, so granting those to `authenticated` would only widen the surface.

-- ---------------------------------------------------------------------------
-- auth.users -> profiles
-- ---------------------------------------------------------------------------
-- Fires for both inviteUserByEmail and any manual dashboard insert. full_name
-- falls back to the email local-part so a profile is never left unnamed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
