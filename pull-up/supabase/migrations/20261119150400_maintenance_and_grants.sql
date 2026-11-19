-- Pull Up · 5 of 5 · scheduled housekeeping, live updates, and the final grants

-- ───────────────────────── housekeeping ─────────────────────────
-- Runs every 5 minutes. Nothing here decides who may do what: a request on a plan
-- that has started is already refused by decide_request, and the app already shows
-- it as expired. This only writes that state down and sends the notifications.
create or replace function private.run_maintenance()
returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- Requests that were still waiting when the plan started.
  with expired as (
    update public.join_requests r
       set status = 'expired', decided_at = now()
      from public.spots s
     where r.spot_id = s.id
       and r.status = 'pending'
       and s.starts_at <= now()
    returning r.id, r.requester_id, r.spot_id
  ),
  cleared as (
    delete from public.notifications n
     using expired e
     where n.request_id = e.id and n.type = 'request_received'
  )
  insert into public.notifications (user_id, type, spot_id, request_id)
  select e.requester_id, 'request_expired', e.spot_id, e.id
    from expired e
   where private.is_onboarded(e.requester_id)
  on conflict do nothing;

  -- "You can rate this plan now", once per person per plan.
  insert into public.notifications (user_id, type, spot_id)
  select u.user_id, 'rating_open', u.spot_id
    from (
      select s.id as spot_id, m.user_id
        from public.spots s
        join public.memberships m on m.spot_id = s.id
       where s.cancelled_at is null
         and s.ends_at <= now() and s.ends_at > now() - interval '7 days'
         and private.was_member_at_start(s.id, m.user_id)
      union
      select s.id, s.host_id
        from public.spots s
       where s.cancelled_at is null
         and s.ends_at <= now() and s.ends_at > now() - interval '7 days'
         and exists (select 1 from public.memberships m
                      where m.spot_id = s.id and private.was_member_at_start(s.id, m.user_id))
    ) u
   where private.is_onboarded(u.user_id)
  on conflict do nothing;

  -- Retention.
  delete from public.notifications where created_at < now() - interval '60 days';
  delete from public.reports where created_at < now() - interval '12 months';
end
$$;

create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'pull-up-maintenance';
select cron.schedule('pull-up-maintenance', '*/5 * * * *', 'select private.run_maintenance()');

-- ───────────────────────── live updates ─────────────────────────
-- Realtime delivers a change only to people whose SELECT policy allows the row.
alter publication supabase_realtime add table
  public.spots,
  public.join_requests,
  public.memberships,
  public.messages,
  public.notifications;

-- ───────────────────────── final grants ─────────────────────────
-- Functions are executable by everyone by default in Postgres, so close that first
-- and then open exactly the list the app calls.

revoke execute on all functions in schema public  from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

grant execute on function
  public.server_now(),
  public.app_config(),
  public.complete_onboarding(text, jsonb, text, text[], text, text[], text, boolean, text),
  public.update_profile(text, jsonb, text, text[], text, text[]),
  public.set_locale(text),
  public.create_spot(text, text, text, text, text, double precision, double precision, timestamptz, timestamptz,
                     integer, integer, integer, integer, integer, text[], text, boolean, text, text, text),
  public.update_spot(uuid, text, text, text, text, double precision, double precision, timestamptz, timestamptz,
                     integer, integer, integer, integer, integer, text[], text, boolean, text, text, text),
  public.cancel_spot(uuid),
  public.request_to_join(uuid, text),
  public.withdraw_request(uuid),
  public.decide_request(uuid, boolean),
  public.leave_spot(uuid),
  public.remove_member(uuid, uuid),
  public.send_message(uuid, text, uuid),
  public.mark_notifications_read(uuid[]),
  public.mark_chat_read(uuid),
  public.mark_all_notifications_read(),
  public.submit_rating(uuid, uuid, integer, text, text, text[]),
  public.block_user(uuid),
  public.unblock_user(uuid),
  public.submit_report(uuid, uuid, text, text),
  public.delete_account(),
  public.spot_summaries(uuid[]),
  public.trust_summaries(uuid[]),
  public.rating_tasks()
to authenticated;

-- Only the helpers that row level security policies call need to be reachable by the
-- signed-in role. The "private" schema is not exposed by the API in any case.
grant execute on function
  private.is_onboarded(uuid),
  private.is_admin(uuid),
  private.blocked_between(uuid, uuid),
  private.is_host(uuid, uuid),
  private.is_active_member(uuid, uuid),
  private.is_participant(uuid, uuid),
  private.has_history(uuid, uuid),
  private.can_see_profile(uuid, uuid)
to authenticated;

-- Check constraints run as whoever writes the row. Writes only happen inside the
-- functions above (as the owner), but keep these callable so a constraint can never
-- fail on permissions.
grant execute on function
  private.valid_avatar(jsonb),
  private.known_languages(),
  private.known_types()
to authenticated;
