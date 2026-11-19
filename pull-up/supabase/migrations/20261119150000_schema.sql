-- Pull Up · 1 of 5 · tables, constraints, indexes
--
-- Conventions
--   * Timestamps are timestamptz (stored in UTC). The app displays Asia/Jerusalem.
--   * The browser can only SELECT (through row level security). Every write goes
--     through a function in 20261119150200_write_functions.sql.
--   * "Full", "started", "completed" and "expired" are derived from the rows below,
--     never stored twice.

create schema if not exists private;

-- ───────────────────────── validation helpers ─────────────────────────

create or replace function private.valid_avatar(a jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(a) = 'object'
    and not exists (
      select 1 from jsonb_object_keys(a) k
      where k not in ('skin', 'hair', 'hairColor', 'bg', 'shirt', 'beard', 'glasses')
    )
    and coalesce(a ->> 'skin', '') ~ '^[1-5]$'
    and coalesce(a ->> 'hair', '') in ('short', 'buzz', 'long', 'bob', 'bun', 'curly', 'hijab')
    and coalesce(a ->> 'hairColor', '') ~ '^#[0-9a-fA-F]{6}$'
    and coalesce(a ->> 'bg', '') ~ '^#[0-9a-fA-F]{6}$'
    and coalesce(a ->> 'shirt', '') ~ '^#[0-9a-fA-F]{6}$'
    and coalesce(jsonb_typeof(a -> 'beard'), 'boolean') = 'boolean'
    and coalesce(jsonb_typeof(a -> 'glasses'), 'boolean') = 'boolean'
$$;

create or replace function private.known_languages()
returns text[] language sql immutable set search_path = '' as $$
  select array['he', 'en', 'ar', 'ru', 'fr', 'es', 'de', 'am']
$$;

create or replace function private.known_types()
returns text[] language sql immutable set search_path = '' as $$
  select array['bar', 'restaurant', 'boardgames', 'sports', 'class', 'other']
$$;

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- ───────────────────────── people ─────────────────────────

-- What other people are allowed to see: first name, illustrated avatar, age range, languages.
-- The row is never deleted. Deleting an account blanks it (see delete_account).
create table public.profiles (
  id            uuid primary key,              -- same value as auth.users.id; no FK so the blanked row can outlive the sign-in
  first_name    text not null default '' check (char_length(first_name) <= 30),
  avatar        jsonb not null default '{}'::jsonb,
  age_range     text check (age_range in ('18-24', '25-29', '30-34', '35-39', '40-49', '50-59', '60+')),
  languages     text[] not null default '{}'
                check (languages <@ private.known_languages() and cardinality(languages) <= 6),
  onboarded_at  timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_complete_unless_deleted check (
    deleted_at is not null
    or (
      char_length(btrim(first_name)) >= 1
      and age_range is not null
      and cardinality(languages) >= 1
      and private.valid_avatar(avatar)
    )
  )
);

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Only the owner can read this row. Nothing here is ever sent to another user.
create table public.account_private (
  user_id              uuid primary key references public.profiles (id) on delete cascade,
  gender               text check (gender in ('woman', 'man', 'nonbinary')),   -- null = not stated; only ever shown as a group total
  interests            text[] not null default '{}'
                       check (interests <@ private.known_types() and cardinality(interests) <= 6),
  locale               text not null default 'en' check (locale in ('en', 'he')),
  adult_declared_at    timestamptz not null,   -- self-declared "I am 18 or older"
  terms_version        text not null,
  terms_accepted_at    timestamptz not null,
  technion_email       text unique check (technion_email = lower(technion_email)),
  technion_verified_at timestamptz,            -- no function sets this yet: the badge stays off until verification really exists
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger account_private_touch before update on public.account_private
  for each row execute function private.touch_updated_at();

create table public.admins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id),
  blocked_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

-- ───────────────────────── spots ─────────────────────────

create table public.spots (
  id             uuid primary key default gen_random_uuid(),
  host_id        uuid not null references public.profiles (id),
  kind           text not null check (kind in ('missing_someone', 'start_plan')),
  type           text not null check (type = any (private.known_types())),
  title          text not null check (char_length(title) between 3 and 60),
  venue_name     text not null check (char_length(venue_name) between 2 and 80),
  address        text not null check (char_length(address) between 3 and 160),
  lat            double precision,
  lng            double precision,
  city           text not null default 'haifa' check (city in ('haifa')),
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  -- Friends who are coming but are not Pull Up users. Numbers only, as told by the host.
  friends_count  smallint not null default 0 check (friends_count between 0 and 10),
  friends_women  smallint not null default 0 check (friends_women >= 0),
  friends_men    smallint not null default 0 check (friends_men >= 0),
  friends_other  smallint not null default 0 check (friends_other >= 0),
  places         smallint not null check (places between 1 and 8),   -- total places for people joining through Pull Up
  languages      text[] not null
                 check (languages <@ private.known_languages() and cardinality(languages) between 1 and 4),
  cost_note      text not null default '' check (char_length(cost_note) <= 120),
  needs_booking  boolean not null default false,
  booking_note   text not null default '' check (char_length(booking_note) <= 200),
  host_note      text not null default '' check (char_length(host_note) <= 300),
  cancelled_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint spots_time_order check (ends_at > starts_at and ends_at <= starts_at + interval '12 hours'),
  -- Written so that a half-filled pair is rejected: a CHECK passes on NULL.
  constraint spots_coordinates check (
    (lat is null) = (lng is null)
    and (lat is null or (lat between 29.0 and 33.6 and lng between 34.0 and 36.0))
  ),
  constraint spots_friends_mix check (friends_women + friends_men + friends_other <= friends_count),
  constraint spots_kind_matches_friends check (
    (kind = 'missing_someone' and friends_count >= 1)
    or (kind = 'start_plan' and friends_count = 0)
  )
);
create index spots_discovery_idx on public.spots (city, starts_at) where cancelled_at is null;
create index spots_host_idx on public.spots (host_id, starts_at);
create index spots_ends_idx on public.spots (ends_at);

create trigger spots_touch before update on public.spots
  for each row execute function private.touch_updated_at();

-- Readable only by the host and by members who are currently in the group.
create table public.spot_private (
  spot_id      uuid primary key references public.spots (id) on delete cascade,
  find_us_hint text not null default '' check (char_length(find_us_hint) <= 200)
);

-- ───────────────────────── requests and memberships ─────────────────────────

create table public.join_requests (
  id           uuid primary key default gen_random_uuid(),
  spot_id      uuid not null references public.spots (id) on delete cascade,
  requester_id uuid not null references public.profiles (id),
  message      text not null default '' check (char_length(message) <= 200),
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined', 'withdrawn', 'expired')),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  updated_at   timestamptz not null default now()
);
-- At most one live request per person per spot.
create unique index join_requests_one_live on public.join_requests (spot_id, requester_id)
  where status in ('pending', 'accepted');
create index join_requests_spot_idx on public.join_requests (spot_id, status);
create index join_requests_requester_idx on public.join_requests (requester_id, status, created_at);

create trigger join_requests_touch before update on public.join_requests
  for each row execute function private.touch_updated_at();

-- People who joined through Pull Up. The host is spots.host_id and has no row here.
create table public.memberships (
  spot_id    uuid not null references public.spots (id) on delete cascade,
  user_id    uuid not null references public.profiles (id),
  request_id uuid not null unique references public.join_requests (id) on delete cascade,
  status     text not null default 'active' check (status in ('active', 'left', 'removed')),
  joined_at  timestamptz not null default now(),
  ended_at   timestamptz,
  primary key (spot_id, user_id),          -- one membership per person per spot, ever
  check ((status = 'active') = (ended_at is null))
);
create index memberships_user_idx on public.memberships (user_id, status);
create index memberships_active_idx on public.memberships (spot_id) where status = 'active';

-- ───────────────────────── chat and notifications ─────────────────────────

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  spot_id    uuid not null references public.spots (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id),
  body       text not null,
  client_id  uuid not null,                -- made by the phone; a retried send reuses it and cannot duplicate
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (sender_id, client_id),
  check (
    (deleted_at is not null and body = '')
    or (deleted_at is null and char_length(body) between 1 and 1000)
  )
);
create index messages_spot_idx on public.messages (spot_id, created_at, id);
create index messages_sender_idx on public.messages (sender_id, created_at);

-- A notification stores only its type and what it points at. Names and text are read
-- separately through the normal access rules, so a notification can never leak them.
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null check (type in (
               'request_received', 'request_accepted', 'request_declined', 'request_expired',
               'spot_cancelled', 'spot_changed', 'place_opened', 'member_removed',
               'new_message', 'rating_open')),
  spot_id    uuid not null references public.spots (id) on delete cascade,
  request_id uuid references public.join_requests (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
-- One unread "new messages" notification per chat, however many messages arrive.
create unique index notifications_one_unread_chat on public.notifications (user_id, spot_id)
  where type = 'new_message' and read_at is null;
create unique index notifications_rating_open_once on public.notifications (user_id, spot_id)
  where type = 'rating_open';
create unique index notifications_request_once on public.notifications (user_id, request_id, type)
  where request_id is not null;

-- ───────────────────────── ratings and reports ─────────────────────────

create table public.ratings (
  id                  uuid primary key default gen_random_uuid(),
  spot_id             uuid not null references public.spots (id) on delete cascade,
  rater_id            uuid not null references public.profiles (id),
  ratee_id            uuid not null references public.profiles (id),
  stars               smallint not null check (stars between 1 and 5),
  felt_safe           text check (felt_safe in ('yes', 'mostly', 'no')),
  matched_description text check (matched_description in ('yes', 'partly', 'no')),
  tags                text[] not null default '{}'
                      check (tags <@ array['welcoming', 'easy_to_find', 'good_conversation', 'as_described',
                                           'friendly', 'on_time', 'awkward', 'no_show']
                             and cardinality(tags) <= 6),
  created_at          timestamptz not null default now(),
  unique (spot_id, rater_id, ratee_id),
  check (rater_id <> ratee_id)
);
create index ratings_ratee_idx on public.ratings (ratee_id);

-- Private. Readable only by admins (and in the Supabase dashboard).
create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references public.profiles (id),
  reported_user_id uuid references public.profiles (id),
  spot_id          uuid references public.spots (id) on delete set null,
  reason           text not null check (reason in (
                     'not_who_they_said', 'made_uncomfortable', 'pressure', 'wrong_place_or_time',
                     'harassment', 'fake_or_spam', 'other')),
  details          text not null default '' check (char_length(details) <= 1000),
  status           text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  admin_note       text not null default '',
  created_at       timestamptz not null default now(),
  check (reported_user_id is not null or spot_id is not null),
  check (reported_user_id is null or reported_user_id <> reporter_id)
);
create index reports_created_idx on public.reports (created_at);
create index reports_reporter_idx on public.reports (reporter_id, created_at);
