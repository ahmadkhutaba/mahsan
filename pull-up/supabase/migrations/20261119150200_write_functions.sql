-- Pull Up · 3 of 5 · every write
--
-- The browser cannot INSERT, UPDATE or DELETE any table. It calls these functions,
-- and each one checks who is calling and whether the change is allowed right now.
--
-- Errors are raised with SQLSTATE P0001 and a short code as the message
-- (for example 'spot_full'). The app translates the code; it never shows it raw.
--
-- Locking: anything that changes who is in a group first locks that spot's row.
-- That makes "is there a place left?" and "take the place" one step, so two accepts
-- for the last place cannot both succeed.

-- ───────────────────────── internal helpers ─────────────────────────

create or replace function private.terms_version()
returns text language sql immutable set search_path = '' as $$ select '2026-11' $$;

-- One-line text: no control or text-direction-override characters, single spaces.
create or replace function private.clean_line(p text)
returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(
           regexp_replace(coalesce(p, ''), '[\u0001-\u001F\u007F‎‏‪-‮⁦-⁩]', ' ', 'g'),
           '\s+', ' ', 'g'))
$$;

-- Multi-line text: keeps line breaks, drops other control and direction-override characters.
create or replace function private.clean_text(p text)
returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(coalesce(p, ''), '[\u0001-\u0008\u000B-\u001F\u007F‪-‮⁦-⁩]', '', 'g'))
$$;

-- The signed-in, onboarded caller. Everything except onboarding itself starts here.
create or replace function private.require_user()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_signed_in';
  end if;
  if not private.is_onboarded(v_uid) then
    raise exception using errcode = 'P0001', message = 'not_onboarded';
  end if;
  return v_uid;
end
$$;

-- Serialises one person's rate-limited actions so the limits below are exact.
create or replace function private.lock_user(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  select pg_advisory_xact_lock(hashtextextended('pull-up-user:' || p_user::text, 0))
$$;

create or replace function private.notify(p_user uuid, p_type text, p_spot uuid, p_request uuid default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, spot_id, request_id)
  select p_user, p_type, p_spot, p_request
  where private.is_onboarded(p_user)
  on conflict do nothing
$$;

create or replace function private.active_member_count(p_spot uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.memberships m where m.spot_id = p_spot and m.status = 'active'
$$;

-- ───────────────────────── account ─────────────────────────

create or replace function public.complete_onboarding(
  p_first_name    text,
  p_avatar        jsonb,
  p_age_range     text,
  p_languages     text[],
  p_gender        text,
  p_interests     text[],
  p_locale        text,
  p_is_adult      boolean,
  p_terms_version text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := auth.uid();
  v_name text := private.clean_line(p_first_name);
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_signed_in';
  end if;
  if p_is_adult is not true then
    raise exception using errcode = 'P0001', message = 'adult_required';
  end if;
  if p_terms_version is distinct from private.terms_version() then
    raise exception using errcode = 'P0001', message = 'terms_outdated';
  end if;
  if char_length(v_name) not between 1 and 30 or not private.valid_avatar(p_avatar) then
    raise exception using errcode = 'P0001', message = 'invalid_profile';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and deleted_at is not null) then
    raise exception using errcode = 'P0001', message = 'account_deleted';
  end if;

  insert into public.profiles (id, first_name, avatar, age_range, languages, onboarded_at)
  values (v_uid, v_name, p_avatar, p_age_range, coalesce(p_languages, '{}'), now())
  on conflict (id) do update
    set first_name   = excluded.first_name,
        avatar       = excluded.avatar,
        age_range    = excluded.age_range,
        languages    = excluded.languages,
        onboarded_at = coalesce(public.profiles.onboarded_at, excluded.onboarded_at);

  insert into public.account_private
    (user_id, gender, interests, locale, adult_declared_at, terms_version, terms_accepted_at)
  values
    (v_uid, nullif(p_gender, ''), coalesce(p_interests, '{}'), coalesce(p_locale, 'en'), now(), p_terms_version, now())
  on conflict (user_id) do update
    set gender            = excluded.gender,
        interests         = excluded.interests,
        locale            = excluded.locale,
        terms_version     = excluded.terms_version,
        terms_accepted_at = case
                              when public.account_private.terms_version = excluded.terms_version
                              then public.account_private.terms_accepted_at
                              else excluded.terms_accepted_at
                            end;
end
$$;

create or replace function public.update_profile(
  p_first_name text,
  p_avatar     jsonb,
  p_age_range  text,
  p_languages  text[],
  p_gender     text,
  p_interests  text[]
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := private.require_user();
  v_name text := private.clean_line(p_first_name);
begin
  if char_length(v_name) not between 1 and 30 or not private.valid_avatar(p_avatar) then
    raise exception using errcode = 'P0001', message = 'invalid_profile';
  end if;

  update public.profiles
     set first_name = v_name, avatar = p_avatar, age_range = p_age_range, languages = coalesce(p_languages, '{}')
   where id = v_uid;

  update public.account_private
     set gender = nullif(p_gender, ''), interests = coalesce(p_interests, '{}')
   where user_id = v_uid;
end
$$;

create or replace function public.set_locale(p_locale text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
begin
  update public.account_private set locale = p_locale where user_id = v_uid;
end
$$;

-- ───────────────────────── spots ─────────────────────────

create or replace function public.create_spot(
  p_kind          text,
  p_type          text,
  p_title         text,
  p_venue_name    text,
  p_address       text,
  p_lat           double precision,
  p_lng           double precision,
  p_starts_at     timestamptz,
  p_ends_at       timestamptz,
  p_friends_count integer,
  p_friends_women integer,
  p_friends_men   integer,
  p_friends_other integer,
  p_places        integer,
  p_languages     text[],
  p_cost_note     text,
  p_needs_booking boolean,
  p_booking_note  text,
  p_host_note     text,
  p_find_us_hint  text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_id  uuid;
begin
  perform private.lock_user(v_uid);

  if p_starts_at is null or p_ends_at is null then
    raise exception using errcode = 'P0001', message = 'invalid_time';
  end if;
  if p_starts_at < now() + interval '10 minutes' then
    raise exception using errcode = 'P0001', message = 'starts_too_soon';
  end if;
  if p_starts_at > now() + interval '7 days' then
    raise exception using errcode = 'P0001', message = 'starts_too_far';
  end if;
  if p_ends_at < p_starts_at + interval '30 minutes' or p_ends_at > p_starts_at + interval '12 hours' then
    raise exception using errcode = 'P0001', message = 'invalid_duration';
  end if;

  if (select count(*) from public.spots s
       where s.host_id = v_uid and s.cancelled_at is null and s.ends_at > now()) >= 3 then
    raise exception using errcode = 'P0001', message = 'too_many_open_spots';
  end if;
  if (select count(*) from public.spots s
       where s.host_id = v_uid and s.created_at > now() - interval '24 hours') >= 5 then
    raise exception using errcode = 'P0001', message = 'daily_limit';
  end if;

  insert into public.spots (
    host_id, kind, type, title, venue_name, address, lat, lng, starts_at, ends_at,
    friends_count, friends_women, friends_men, friends_other, places, languages,
    cost_note, needs_booking, booking_note, host_note
  ) values (
    v_uid, p_kind, p_type, private.clean_line(p_title), private.clean_line(p_venue_name),
    private.clean_line(p_address), p_lat, p_lng, p_starts_at, p_ends_at,
    coalesce(p_friends_count, 0), coalesce(p_friends_women, 0), coalesce(p_friends_men, 0),
    coalesce(p_friends_other, 0), p_places, coalesce(p_languages, '{}'),
    private.clean_line(p_cost_note), coalesce(p_needs_booking, false),
    private.clean_text(p_booking_note), private.clean_text(p_host_note)
  )
  returning id into v_id;

  insert into public.spot_private (spot_id, find_us_hint)
  values (v_id, private.clean_text(p_find_us_hint));

  return v_id;
end
$$;

-- The host edits a spot that has not started. Changing the time or the place tells
-- everyone who is in the group or waiting for an answer.
create or replace function public.update_spot(
  p_spot_id       uuid,
  p_type          text,
  p_title         text,
  p_venue_name    text,
  p_address       text,
  p_lat           double precision,
  p_lng           double precision,
  p_starts_at     timestamptz,
  p_ends_at       timestamptz,
  p_friends_count integer,
  p_friends_women integer,
  p_friends_men   integer,
  p_friends_other integer,
  p_places        integer,
  p_languages     text[],
  p_cost_note     text,
  p_needs_booking boolean,
  p_booking_note  text,
  p_host_note     text,
  p_find_us_hint  text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := private.require_user();
  v_spot    public.spots;
  v_venue   text := private.clean_line(p_venue_name);
  v_address text := private.clean_line(p_address);
  v_moved   boolean;
begin
  select * into v_spot from public.spots where id = p_spot_id and host_id = v_uid for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'spot_not_found';
  end if;
  if v_spot.cancelled_at is not null then
    raise exception using errcode = 'P0001', message = 'spot_cancelled';
  end if;
  if v_spot.starts_at <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'spot_started';
  end if;

  if p_starts_at is null or p_ends_at is null then
    raise exception using errcode = 'P0001', message = 'invalid_time';
  end if;
  if p_starts_at is distinct from v_spot.starts_at then
    if p_starts_at < now() + interval '10 minutes' then
      raise exception using errcode = 'P0001', message = 'starts_too_soon';
    end if;
    if p_starts_at > now() + interval '7 days' then
      raise exception using errcode = 'P0001', message = 'starts_too_far';
    end if;
  end if;
  if p_ends_at < p_starts_at + interval '30 minutes' or p_ends_at > p_starts_at + interval '12 hours' then
    raise exception using errcode = 'P0001', message = 'invalid_duration';
  end if;
  if p_places < private.active_member_count(p_spot_id) then
    raise exception using errcode = 'P0001', message = 'places_below_joined';
  end if;

  v_moved := p_starts_at is distinct from v_spot.starts_at
          or p_ends_at   is distinct from v_spot.ends_at
          or v_venue     is distinct from v_spot.venue_name
          or v_address   is distinct from v_spot.address
          or p_lat       is distinct from v_spot.lat
          or p_lng       is distinct from v_spot.lng;

  update public.spots set
    type = p_type, title = private.clean_line(p_title), venue_name = v_venue, address = v_address,
    lat = p_lat, lng = p_lng, starts_at = p_starts_at, ends_at = p_ends_at,
    friends_count = coalesce(p_friends_count, 0), friends_women = coalesce(p_friends_women, 0),
    friends_men = coalesce(p_friends_men, 0), friends_other = coalesce(p_friends_other, 0),
    places = p_places, languages = coalesce(p_languages, '{}'),
    cost_note = private.clean_line(p_cost_note), needs_booking = coalesce(p_needs_booking, false),
    booking_note = private.clean_text(p_booking_note), host_note = private.clean_text(p_host_note)
  where id = p_spot_id;

  update public.spot_private set find_us_hint = private.clean_text(p_find_us_hint) where spot_id = p_spot_id;

  if v_moved then
    perform private.notify(m.user_id, 'spot_changed', p_spot_id)
      from public.memberships m where m.spot_id = p_spot_id and m.status = 'active';
    perform private.notify(r.requester_id, 'spot_changed', p_spot_id)
      from public.join_requests r where r.spot_id = p_spot_id and r.status = 'pending';
  end if;
end
$$;

-- Caller must already hold the spot's row lock and have checked permission.
create or replace function private.cancel_spot_locked(p_spot_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.spots set cancelled_at = now() where id = p_spot_id and cancelled_at is null;
  if not found then
    return;
  end if;

  perform private.notify(m.user_id, 'spot_cancelled', p_spot_id)
    from public.memberships m where m.spot_id = p_spot_id and m.status = 'active';
  perform private.notify(r.requester_id, 'spot_cancelled', p_spot_id)
    from public.join_requests r where r.spot_id = p_spot_id and r.status = 'pending';

  -- Requests that were still waiting can no longer be answered.
  delete from public.notifications n
   using public.join_requests r
   where n.request_id = r.id and n.type = 'request_received'
     and r.spot_id = p_spot_id and r.status = 'pending';
  update public.join_requests set status = 'expired', decided_at = now()
   where spot_id = p_spot_id and status = 'pending';
end
$$;

create or replace function public.cancel_spot(p_spot_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := private.require_user();
  v_spot public.spots;
begin
  select * into v_spot from public.spots where id = p_spot_id and host_id = v_uid for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'spot_not_found';
  end if;
  if v_spot.cancelled_at is not null then
    return;
  end if;
  if v_spot.ends_at <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'spot_ended';
  end if;
  perform private.cancel_spot_locked(p_spot_id);
end
$$;

-- ───────────────────────── requests ─────────────────────────

create or replace function public.request_to_join(p_spot_id uuid, p_message text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := private.require_user();
  v_spot public.spots;
  v_id   uuid;
begin
  perform private.lock_user(v_uid);

  select * into v_spot from public.spots where id = p_spot_id;
  -- A spot the caller may not see is reported exactly like one that does not exist.
  if not found or not private.can_see_spot(p_spot_id, v_uid) then
    raise exception using errcode = 'P0001', message = 'spot_not_found';
  end if;
  if v_spot.host_id = v_uid then
    raise exception using errcode = 'P0001', message = 'own_spot';
  end if;
  if v_spot.cancelled_at is not null then
    raise exception using errcode = 'P0001', message = 'spot_cancelled';
  end if;
  if v_spot.starts_at <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'spot_started';
  end if;

  if exists (select 1 from public.memberships m
              where m.spot_id = p_spot_id and m.user_id = v_uid and m.status = 'active') then
    raise exception using errcode = 'P0001', message = 'already_member';
  end if;
  if exists (select 1 from public.memberships m where m.spot_id = p_spot_id and m.user_id = v_uid) then
    raise exception using errcode = 'P0001', message = 'cannot_rejoin';
  end if;
  if exists (select 1 from public.join_requests r
              where r.spot_id = p_spot_id and r.requester_id = v_uid and r.status = 'pending') then
    raise exception using errcode = 'P0001', message = 'already_requested';
  end if;
  if exists (select 1 from public.join_requests r
              where r.spot_id = p_spot_id and r.requester_id = v_uid and r.status = 'declined') then
    raise exception using errcode = 'P0001', message = 'already_answered';
  end if;
  if (select count(*) from public.join_requests r
       where r.spot_id = p_spot_id and r.requester_id = v_uid and r.status = 'withdrawn') >= 2 then
    raise exception using errcode = 'P0001', message = 'too_many_requests';
  end if;

  if private.active_member_count(p_spot_id) >= v_spot.places then
    raise exception using errcode = 'P0001', message = 'spot_full';
  end if;

  if (select count(*) from public.join_requests r
       where r.requester_id = v_uid and r.status = 'pending') >= 5 then
    raise exception using errcode = 'P0001', message = 'too_many_pending';
  end if;
  if (select count(*) from public.join_requests r
       where r.requester_id = v_uid and r.created_at > now() - interval '24 hours') >= 10 then
    raise exception using errcode = 'P0001', message = 'daily_limit';
  end if;

  begin
    insert into public.join_requests (spot_id, requester_id, message)
    values (p_spot_id, v_uid, private.clean_text(p_message))
    returning id into v_id;
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'already_requested';
  end;

  perform private.notify(v_spot.host_id, 'request_received', p_spot_id, v_id);
  return v_id;
end
$$;

create or replace function public.withdraw_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
begin
  update public.join_requests
     set status = 'withdrawn', message = '', decided_at = now()
   where id = p_request_id and requester_id = v_uid and status = 'pending';
  if not found then
    raise exception using errcode = 'P0001', message = 'request_not_pending';
  end if;
  delete from public.notifications where request_id = p_request_id and type = 'request_received';
end
$$;

-- The host answers a request. Accepting is atomic: host, pending request, spot not
-- started or cancelled, no block, and a free place are all checked while the spot is locked.
create or replace function public.decide_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := private.require_user();
  v_spot_id uuid;
  v_spot    public.spots;
  v_req     public.join_requests;
begin
  if p_accept is null then
    raise exception using errcode = 'P0001', message = 'invalid_decision';
  end if;

  select r.spot_id into v_spot_id
    from public.join_requests r
    join public.spots s on s.id = r.spot_id
   where r.id = p_request_id and s.host_id = v_uid;
  if not found then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;

  select * into v_spot from public.spots where id = v_spot_id for update;
  select * into v_req  from public.join_requests where id = p_request_id for update;

  if v_spot.host_id <> v_uid then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;
  if v_req.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'request_not_pending';
  end if;
  if v_spot.cancelled_at is not null then
    raise exception using errcode = 'P0001', message = 'spot_cancelled';
  end if;
  if v_spot.starts_at <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'spot_started';
  end if;

  if p_accept then
    if private.blocked_between(v_uid, v_req.requester_id) or not private.is_onboarded(v_req.requester_id) then
      raise exception using errcode = 'P0001', message = 'request_not_found';
    end if;
    if private.active_member_count(v_spot_id) >= v_spot.places then
      raise exception using errcode = 'P0001', message = 'spot_full';
    end if;

    insert into public.memberships (spot_id, user_id, request_id)
    values (v_spot_id, v_req.requester_id, v_req.id);
    update public.join_requests set status = 'accepted', decided_at = now() where id = v_req.id;
    perform private.notify(v_req.requester_id, 'request_accepted', v_spot_id, v_req.id);
  else
    update public.join_requests set status = 'declined', decided_at = now() where id = v_req.id;
    perform private.notify(v_req.requester_id, 'request_declined', v_spot_id, v_req.id);
  end if;

  delete from public.notifications where request_id = v_req.id and type = 'request_received';
end
$$;

-- ───────────────────────── leaving and removing ─────────────────────────

-- "Leave quietly": no chat message and no notice to the other members. The place
-- opens again, and before the start the host gets a neutral "a place opened up".
create or replace function public.leave_spot(p_spot_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := private.require_user();
  v_spot public.spots;
begin
  select * into v_spot from public.spots where id = p_spot_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_member';
  end if;

  update public.memberships set status = 'left', ended_at = now()
   where spot_id = p_spot_id and user_id = v_uid and status = 'active';
  if not found then
    raise exception using errcode = 'P0001', message = 'not_member';
  end if;

  delete from public.notifications where user_id = v_uid and spot_id = p_spot_id and type = 'new_message';

  if v_spot.cancelled_at is null and v_spot.starts_at > clock_timestamp() then
    perform private.notify(v_spot.host_id, 'place_opened', p_spot_id);
  end if;
end
$$;

create or replace function public.remove_member(p_spot_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := private.require_user();
  v_spot public.spots;
begin
  select * into v_spot from public.spots where id = p_spot_id and host_id = v_uid for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'spot_not_found';
  end if;
  if v_spot.ends_at <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'spot_ended';
  end if;

  update public.memberships set status = 'removed', ended_at = now()
   where spot_id = p_spot_id and user_id = p_user_id and status = 'active';
  if not found then
    raise exception using errcode = 'P0001', message = 'not_member';
  end if;

  delete from public.notifications where user_id = p_user_id and spot_id = p_spot_id and type = 'new_message';
  perform private.notify(p_user_id, 'member_removed', p_spot_id);
end
$$;

-- ───────────────────────── chat ─────────────────────────

create or replace function public.send_message(p_spot_id uuid, p_body text, p_client_id uuid)
returns public.messages
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := private.require_user();
  v_body text := private.clean_text(p_body);
  v_spot public.spots;
  v_msg  public.messages;
begin
  if p_client_id is null or char_length(v_body) not between 1 and 1000 then
    raise exception using errcode = 'P0001', message = 'invalid_message';
  end if;
  perform private.lock_user(v_uid);

  select * into v_spot from public.spots where id = p_spot_id;
  if not found or not private.is_participant(p_spot_id, v_uid) then
    raise exception using errcode = 'P0001', message = 'not_member';
  end if;

  -- A retry of a message that already arrived returns the stored message.
  select * into v_msg from public.messages where sender_id = v_uid and client_id = p_client_id;
  if found then
    if v_msg.spot_id <> p_spot_id then
      raise exception using errcode = 'P0001', message = 'invalid_message';
    end if;
    return v_msg;
  end if;

  if v_spot.cancelled_at is not null then
    raise exception using errcode = 'P0001', message = 'spot_cancelled';
  end if;
  if clock_timestamp() > v_spot.ends_at + interval '12 hours' then
    raise exception using errcode = 'P0001', message = 'chat_closed';
  end if;
  if (select count(*) from public.messages m
       where m.sender_id = v_uid and m.created_at > now() - interval '1 minute') >= 30 then
    raise exception using errcode = 'P0001', message = 'slow_down';
  end if;

  insert into public.messages (spot_id, sender_id, body, client_id)
  values (p_spot_id, v_uid, v_body, p_client_id)
  returning * into v_msg;

  -- One unread notification per chat for everyone else in the group, skipping
  -- anyone blocked in either direction.
  insert into public.notifications (user_id, type, spot_id)
  select u.user_id, 'new_message', p_spot_id
    from (
      select v_spot.host_id as user_id
      union
      select m.user_id from public.memberships m where m.spot_id = p_spot_id and m.status = 'active'
    ) u
   where u.user_id <> v_uid
     and private.is_onboarded(u.user_id)
     and not private.blocked_between(u.user_id, v_uid)
  on conflict do nothing;

  return v_msg;
end
$$;

create or replace function public.mark_notifications_read(p_ids uuid[])
returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
   where user_id = auth.uid() and id = any (p_ids) and read_at is null
$$;

create or replace function public.mark_chat_read(p_spot_id uuid)
returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
   where user_id = auth.uid() and spot_id = p_spot_id and type = 'new_message' and read_at is null
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null
$$;

-- ───────────────────────── ratings ─────────────────────────

-- Host and joiner rate each other, once, in the 7 days after the plan ends.
-- Only people who were in the group when it started take part.
create or replace function public.submit_rating(
  p_spot_id             uuid,
  p_ratee_id            uuid,
  p_stars               integer,
  p_felt_safe           text,
  p_matched_description text,
  p_tags                text[]
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := private.require_user();
  v_spot public.spots;
begin
  select * into v_spot from public.spots where id = p_spot_id;
  if not found or p_ratee_id is null or p_ratee_id = v_uid or v_spot.cancelled_at is not null then
    raise exception using errcode = 'P0001', message = 'rating_not_allowed';
  end if;
  if not (
       (v_spot.host_id = v_uid      and private.was_member_at_start(p_spot_id, p_ratee_id))
    or (v_spot.host_id = p_ratee_id and private.was_member_at_start(p_spot_id, v_uid))
  ) or not private.is_onboarded(p_ratee_id) then
    raise exception using errcode = 'P0001', message = 'rating_not_allowed';
  end if;
  if clock_timestamp() < v_spot.ends_at then
    raise exception using errcode = 'P0001', message = 'rating_not_open';
  end if;
  if clock_timestamp() > v_spot.ends_at + interval '7 days' then
    raise exception using errcode = 'P0001', message = 'rating_closed';
  end if;

  begin
    insert into public.ratings (spot_id, rater_id, ratee_id, stars, felt_safe, matched_description, tags)
    values (p_spot_id, v_uid, p_ratee_id, p_stars, nullif(p_felt_safe, ''), nullif(p_matched_description, ''),
            coalesce(p_tags, '{}'));
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'already_rated';
  end;
end
$$;

-- ───────────────────────── blocking and reporting ─────────────────────────

-- Blocking is immediate and cuts every tie between the two people:
--   * neither sees the other's profile, spots, requests or messages (see the policies)
--   * waiting requests between them end
--   * host blocks a member: the member is removed
--   * member blocks the host: the member leaves
--   * two members: both stay in the group but cannot read each other
create or replace function public.block_user(p_user_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
begin
  if p_user_id is null or p_user_id = v_uid
     or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'user_not_found';
  end if;
  perform private.lock_user(v_uid);
  if (select count(*) from public.blocks b
       where b.blocker_id = v_uid and b.created_at > now() - interval '24 hours') >= 50 then
    raise exception using errcode = 'P0001', message = 'daily_limit';
  end if;

  -- Lock every spot the two share, in a fixed order, before touching memberships.
  perform 1 from public.spots s
   where (s.host_id = v_uid     and private.has_history(s.id, p_user_id))
      or (s.host_id = p_user_id and private.has_history(s.id, v_uid))
   order by s.id
     for update;

  insert into public.blocks (blocker_id, blocked_id) values (v_uid, p_user_id)
  on conflict do nothing;

  -- My waiting requests on their spots: taken back.
  update public.join_requests r set status = 'withdrawn', message = '', decided_at = now()
    from public.spots s
   where r.spot_id = s.id and r.status = 'pending'
     and r.requester_id = v_uid and s.host_id = p_user_id;

  -- Their waiting requests on my spots: declined, without a notification.
  update public.join_requests r set status = 'declined', decided_at = now()
    from public.spots s
   where r.spot_id = s.id and r.status = 'pending'
     and r.requester_id = p_user_id and s.host_id = v_uid;

  -- They are in a group I host that has not ended: removed.
  update public.memberships m set status = 'removed', ended_at = now()
    from public.spots s
   where m.spot_id = s.id and m.status = 'active'
     and m.user_id = p_user_id and s.host_id = v_uid and s.ends_at > now();

  -- I am in a group they host that has not ended: I leave.
  update public.memberships m set status = 'left', ended_at = now()
    from public.spots s
   where m.spot_id = s.id and m.status = 'active'
     and m.user_id = v_uid and s.host_id = p_user_id and s.ends_at > now();

  -- Notifications that point from one of us to the other's spot or request.
  delete from public.notifications n
   using public.spots s
   where n.spot_id = s.id
     and ((n.user_id = v_uid and s.host_id = p_user_id) or (n.user_id = p_user_id and s.host_id = v_uid));
  delete from public.notifications n
   using public.join_requests r
   where n.request_id = r.id
     and ((n.user_id = v_uid and r.requester_id = p_user_id) or (n.user_id = p_user_id and r.requester_id = v_uid));
end
$$;

create or replace function public.unblock_user(p_user_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
begin
  delete from public.blocks where blocker_id = v_uid and blocked_id = p_user_id;
end
$$;

-- A report is private. It stays possible after leaving a group or blocking someone,
-- so it does not check what the reporter can currently see.
create or replace function public.submit_report(
  p_spot_id          uuid,
  p_reported_user_id uuid,
  p_reason           text,
  p_details          text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
begin
  perform private.lock_user(v_uid);
  if p_spot_id is null and p_reported_user_id is null then
    raise exception using errcode = 'P0001', message = 'invalid_report';
  end if;
  if p_reported_user_id = v_uid then
    raise exception using errcode = 'P0001', message = 'invalid_report';
  end if;
  if p_spot_id is not null and not exists (select 1 from public.spots where id = p_spot_id) then
    raise exception using errcode = 'P0001', message = 'invalid_report';
  end if;
  if p_reported_user_id is not null and not exists (select 1 from public.profiles where id = p_reported_user_id) then
    raise exception using errcode = 'P0001', message = 'invalid_report';
  end if;
  if (select count(*) from public.reports r
       where r.reporter_id = v_uid and r.created_at > now() - interval '24 hours') >= 10 then
    raise exception using errcode = 'P0001', message = 'daily_limit';
  end if;

  insert into public.reports (reporter_id, reported_user_id, spot_id, reason, details)
  values (v_uid, p_reported_user_id, p_spot_id, p_reason, private.clean_text(p_details));
end
$$;

-- ───────────────────────── deleting an account ─────────────────────────

-- What happens, in order:
--   * plans I host that have not ended are cancelled (members are told)
--   * I leave groups that have not ended; my waiting requests are taken back
--   * the text of my chat messages, request messages, host notes and meeting hints is erased
--   * my notifications, my blocks, my private account row and ratings about me are deleted
--   * my profile is blanked (shown to others as "Deleted user")
--   * my sign-in is deleted
-- Kept: ratings I gave (they count toward other people's totals, with no name attached)
-- and reports, for 12 months, for safety review.
create or replace function public.delete_account()
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := auth.uid();
  v_spot record;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_signed_in';
  end if;
  perform private.lock_user(v_uid);

  perform 1 from public.spots s
   where s.ends_at > now()
     and (s.host_id = v_uid or private.is_active_member(s.id, v_uid))
   order by s.id
     for update;

  for v_spot in
    select s.id from public.spots s
     where s.host_id = v_uid and s.cancelled_at is null and s.ends_at > now()
     order by s.id
  loop
    perform private.cancel_spot_locked(v_spot.id);
  end loop;

  for v_spot in
    select s.id, s.host_id, (s.cancelled_at is null and s.starts_at > now()) as upcoming
      from public.memberships m
      join public.spots s on s.id = m.spot_id
     where m.user_id = v_uid and m.status = 'active' and s.ends_at > now()
     order by s.id
  loop
    update public.memberships set status = 'left', ended_at = now()
     where spot_id = v_spot.id and user_id = v_uid and status = 'active';
    if v_spot.upcoming then
      perform private.notify(v_spot.host_id, 'place_opened', v_spot.id);
    end if;
  end loop;

  delete from public.notifications n
   using public.join_requests r
   where n.request_id = r.id and r.requester_id = v_uid and n.type = 'request_received';
  update public.join_requests set status = 'withdrawn', decided_at = now()
   where requester_id = v_uid and status = 'pending';
  update public.join_requests set message = '' where requester_id = v_uid and message <> '';

  update public.messages set body = '', deleted_at = now() where sender_id = v_uid and deleted_at is null;
  update public.spots set host_note = '', booking_note = '', cost_note = '' where host_id = v_uid;
  update public.spot_private sp set find_us_hint = ''
    from public.spots s where s.id = sp.spot_id and s.host_id = v_uid;

  delete from public.notifications where user_id = v_uid;
  delete from public.ratings where ratee_id = v_uid;
  delete from public.blocks where blocker_id = v_uid or blocked_id = v_uid;
  delete from public.admins where user_id = v_uid;
  delete from public.account_private where user_id = v_uid;

  update public.profiles
     set first_name = '', avatar = '{}'::jsonb, age_range = null, languages = '{}',
         onboarded_at = null, deleted_at = now()
   where id = v_uid;

  delete from auth.users where id = v_uid;
end
$$;
