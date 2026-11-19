-- Pull Up · 2 of 5 · who can read what
--
-- Row level security is on for every table. The browser role ("authenticated") gets
-- SELECT only, and only on the rows the policies below allow. Logged-out visitors
-- ("anon") get nothing at all.
--
-- The helper functions live in the "private" schema, which the API does not expose.
-- They run as the table owner so that one policy can look at another table without
-- recursing into that table's own policy.

-- ───────────────────────── helpers used by policies ─────────────────────────

create or replace function private.is_onboarded(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user and p.onboarded_at is not null and p.deleted_at is null
  )
$$;

create or replace function private.is_admin(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = p_user)
$$;

create or replace function private.blocked_between(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  )
$$;

create or replace function private.is_host(p_spot uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.spots s where s.id = p_spot and s.host_id = p_user)
$$;

create or replace function private.is_active_member(p_spot uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.spot_id = p_spot and m.user_id = p_user and m.status = 'active'
  )
$$;

-- Host, or a member who is in the group right now.
create or replace function private.is_participant(p_spot uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_host(p_spot, p_user) or private.is_active_member(p_spot, p_user)
$$;

-- Has this person ever asked to join, or been a member of, this spot?
-- A withdrawn request does not count: the person took it back.
create or replace function private.has_history(p_spot uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
           select 1 from public.memberships m where m.spot_id = p_spot and m.user_id = p_user
         )
      or exists (
           select 1 from public.join_requests r
           where r.spot_id = p_spot and r.requester_id = p_user and r.status <> 'withdrawn'
         )
$$;

-- Was this person in the group when the plan started? Used for ratings and "plans joined".
create or replace function private.was_member_at_start(p_spot uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships m
    join public.spots s on s.id = m.spot_id
    where m.spot_id = p_spot
      and m.user_id = p_user
      and m.joined_at <= s.starts_at
      and (m.status = 'active' or m.ended_at > s.starts_at)
  )
$$;

-- The one definition of "may this person see this spot".
--   * the host always can
--   * nobody can if either side blocked the other
--   * everyone else can until the plan ends (so a shared link shows "started" or
--     "cancelled" instead of nothing), and afterwards only people who were involved
create or replace function private.can_see_spot(p_spot uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_onboarded(p_user) and exists (
    select 1 from public.spots s
    where s.id = p_spot
      and (
        s.host_id = p_user
        or (
          not private.blocked_between(s.host_id, p_user)
          and (s.ends_at > now() or private.has_history(s.id, p_user))
        )
      )
  )
$$;

-- May p_user see p_target's public profile (first name, avatar, age range, languages)?
--   * yourself: always
--   * a host: while they have a plan you can see
--   * someone who asked to join, or joined, your plan
--   * someone in the same group as you
-- The last three stop 30 days after the plan ends.
create or replace function private.can_see_profile(p_target uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_target = p_user
    or (
      private.is_onboarded(p_user)
      and not private.blocked_between(p_target, p_user)
      and (
        exists (
          select 1 from public.spots s
          where s.host_id = p_target
            and (
              s.ends_at > now()
              or (s.ends_at > now() - interval '30 days' and private.has_history(s.id, p_user))
            )
        )
        or exists (
          select 1 from public.spots s
          where s.host_id = p_user
            and s.ends_at > now() - interval '30 days'
            and private.has_history(s.id, p_target)
        )
        or exists (
          select 1
          from public.memberships mine
          join public.memberships theirs on theirs.spot_id = mine.spot_id
          join public.spots s on s.id = mine.spot_id
          where mine.user_id = p_user and mine.status = 'active'
            and theirs.user_id = p_target and theirs.status = 'active'
            and s.ends_at > now() - interval '30 days'
        )
      )
    )
$$;

-- ───────────────────────── row level security ─────────────────────────

alter table public.profiles        enable row level security;
alter table public.account_private enable row level security;
alter table public.admins          enable row level security;
alter table public.blocks          enable row level security;
alter table public.spots           enable row level security;
alter table public.spot_private    enable row level security;
alter table public.join_requests   enable row level security;
alter table public.memberships     enable row level security;
alter table public.messages        enable row level security;
alter table public.notifications   enable row level security;
alter table public.ratings         enable row level security;
alter table public.reports         enable row level security;

create policy profiles_read on public.profiles
  for select to authenticated
  using (private.can_see_profile(id, (select auth.uid())));

create policy account_private_read_own on public.account_private
  for select to authenticated
  using (user_id = (select auth.uid()));

-- admins: no policy, so nobody reads it through the API.

create policy blocks_read_own on public.blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy spots_read on public.spots
  for select to authenticated
  using (
    private.is_onboarded((select auth.uid()))
    and (
      host_id = (select auth.uid())
      or (
        not private.blocked_between(host_id, (select auth.uid()))
        and (ends_at > now() or private.has_history(id, (select auth.uid())))
      )
    )
  );

create policy spot_private_read on public.spot_private
  for select to authenticated
  using (
    private.is_onboarded((select auth.uid()))
    and private.is_participant(spot_id, (select auth.uid()))
  );

-- The requester sees their own request. The host sees requests for their spot,
-- unless one of the two blocked the other.
create policy join_requests_read on public.join_requests
  for select to authenticated
  using (
    private.is_onboarded((select auth.uid()))
    and (
      requester_id = (select auth.uid())
      or (
        private.is_host(spot_id, (select auth.uid()))
        and not private.blocked_between(requester_id, (select auth.uid()))
      )
    )
  );

-- You see your own membership, the host sees all of them, and members who are in
-- the group right now see the others who are in it right now.
create policy memberships_read on public.memberships
  for select to authenticated
  using (
    private.is_onboarded((select auth.uid()))
    and (
      user_id = (select auth.uid())
      or private.is_host(spot_id, (select auth.uid()))
      or (status = 'active' and private.is_active_member(spot_id, (select auth.uid())))
    )
  );

-- Only the host and current members read the chat, and never a message from
-- someone they blocked or who blocked them.
create policy messages_read on public.messages
  for select to authenticated
  using (
    private.is_onboarded((select auth.uid()))
    and private.is_participant(spot_id, (select auth.uid()))
    and not private.blocked_between(sender_id, (select auth.uid()))
  );

create policy notifications_read_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- You can read the ratings you gave. Nobody reads the individual ratings they received.
create policy ratings_read_own_given on public.ratings
  for select to authenticated
  using (rater_id = (select auth.uid()));

-- Reports: admins only. The person who sent a report cannot read it back, and the
-- person it is about never sees it.
create policy reports_admin_read on public.reports
  for select to authenticated
  using (private.is_admin((select auth.uid())));

create policy reports_admin_update on public.reports
  for update to authenticated
  using (private.is_admin((select auth.uid())))
  with check (private.is_admin((select auth.uid())));

-- ───────────────────────── grants ─────────────────────────
-- Start from nothing, then add exactly what is needed.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on
  public.profiles,
  public.account_private,
  public.blocks,
  public.spots,
  public.spot_private,
  public.join_requests,
  public.memberships,
  public.messages,
  public.notifications,
  public.ratings,
  public.reports
to authenticated;

grant update (status, admin_note) on public.reports to authenticated;   -- still gated by reports_admin_update

-- Policies call the helpers as the signed-in role, so it needs to reach them.
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
