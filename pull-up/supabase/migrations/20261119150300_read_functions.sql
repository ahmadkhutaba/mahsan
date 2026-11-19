-- Pull Up · 4 of 5 · totals that are safe to show
--
-- These return numbers only, never another person's rows. Each one first checks
-- that the caller is allowed to see the spot or the profile it is asked about.

create or replace function public.server_now()
returns timestamptz language sql stable set search_path = '' as $$ select now() $$;

-- Runs as the owner because it reads a value kept in the private schema.
create or replace function public.app_config()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'terms_version', private.terms_version(),
    'min_lead_minutes', 10,
    'max_days_ahead', 7,
    'rating_window_days', 7,
    'city', 'haifa',
    'time_zone', 'Asia/Jerusalem'
  )
$$;

-- For each spot the caller can see: how many joined through Pull Up, how many places
-- are left, and the gender mix of the people who are Pull Up users (host and members).
-- "unstated" counts people who chose not to say. Friends outside the app are not
-- included here; the host's own count for them is on the spot row.
create or replace function public.spot_summaries(p_spot_ids uuid[])
returns table (
  spot_id     uuid,
  joined      integer,
  places_left integer,
  women       integer,
  men         integer,
  nonbinary   integer,
  unstated    integer
)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as uid),
  visible as (
    select s.id, s.host_id, s.places
      from public.spots s, me
     where s.id = any (p_spot_ids[1:100])
       and private.can_see_spot(s.id, me.uid)
  ),
  people as (
    select v.id as spot_id, v.host_id as user_id, false as is_member from visible v
    union all
    select m.spot_id, m.user_id, true
      from public.memberships m
      join visible v on v.id = m.spot_id
     where m.status = 'active'
  )
  select v.id,
         count(*) filter (where p.is_member)::integer,
         greatest(v.places - count(*) filter (where p.is_member), 0)::integer,
         count(*) filter (where a.gender = 'woman')::integer,
         count(*) filter (where a.gender = 'man')::integer,
         count(*) filter (where a.gender = 'nonbinary')::integer,
         count(*) filter (where a.gender is null)::integer
    from visible v
    join people p on p.spot_id = v.id
    left join public.account_private a on a.user_id = p.user_id
   group by v.id, v.places
$$;

-- Trust summary for people whose profile the caller can see.
--   plans_joined  plans that started while the person was in the group (not proof they showed up)
--   plans_hosted  plans they hosted that started with at least one person joined
--   ratings_count ratings that count (see below)
--   rating_avg    only once there are 3 or more, so a single rating cannot be read off it
-- A rating counts once the other side has rated too, or the 7-day window has closed.
create or replace function public.trust_summaries(p_user_ids uuid[])
returns table (
  user_id           uuid,
  plans_joined      integer,
  plans_hosted      integer,
  ratings_count     integer,
  rating_avg        numeric,
  technion_verified boolean
)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as uid),
  targets as (
    select p.id
      from public.profiles p, me
     where p.id = any (p_user_ids[1:100])
       and p.deleted_at is null
       and private.can_see_profile(p.id, me.uid)
  ),
  counted as (
    select r.ratee_id, r.stars
      from public.ratings r
      join public.spots s on s.id = r.spot_id
      join targets t on t.id = r.ratee_id
     where now() > s.ends_at + interval '7 days'
        or exists (
             select 1 from public.ratings back
              where back.spot_id = r.spot_id
                and back.rater_id = r.ratee_id
                and back.ratee_id = r.rater_id
           )
  )
  select t.id,
         (select count(*)::integer
            from public.memberships m
            join public.spots s on s.id = m.spot_id
           where m.user_id = t.id
             and s.cancelled_at is null
             and s.starts_at <= now()
             and m.joined_at <= s.starts_at
             and (m.status = 'active' or m.ended_at > s.starts_at)),
         (select count(*)::integer
            from public.spots s
           where s.host_id = t.id
             and s.cancelled_at is null
             and s.starts_at <= now()
             and exists (
                   select 1 from public.memberships m
                    where m.spot_id = s.id
                      and m.joined_at <= s.starts_at
                      and (m.status = 'active' or m.ended_at > s.starts_at))),
         (select count(*)::integer from counted c where c.ratee_id = t.id),
         (select case when count(*) >= 3 then round(avg(c.stars), 1) end
            from counted c where c.ratee_id = t.id),
         coalesce((select a.technion_verified_at is not null
                     from public.account_private a where a.user_id = t.id), false)
    from targets t
$$;

-- Who the caller can still rate, and until when.
create or replace function public.rating_tasks()
returns table (spot_id uuid, ratee_id uuid, closes_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as uid),
  open_spots as (
    select s.id, s.host_id, s.ends_at
      from public.spots s
     where s.cancelled_at is null
       and s.ends_at <= now()
       and s.ends_at > now() - interval '7 days'
  ),
  pairs as (
    -- I hosted: everyone who was in the group at the start
    select o.id as spot_id, m.user_id as ratee_id, o.ends_at
      from open_spots o
      join public.memberships m on m.spot_id = o.id, me
     where o.host_id = me.uid
       and private.was_member_at_start(o.id, m.user_id)
    union all
    -- I joined: the host
    select o.id, o.host_id, o.ends_at
      from open_spots o, me
     where o.host_id <> me.uid
       and private.was_member_at_start(o.id, me.uid)
  )
  select p.spot_id, p.ratee_id, p.ends_at + interval '7 days'
    from pairs p, me
   where private.is_onboarded(me.uid)
     and private.is_onboarded(p.ratee_id)
     and not exists (
           select 1 from public.ratings r
            where r.spot_id = p.spot_id and r.rater_id = me.uid and r.ratee_id = p.ratee_id)
$$;
