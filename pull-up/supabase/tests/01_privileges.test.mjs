import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { admin, anonSession, closeAll, createSpot, failsWith, reset, rows, signIn, user } from './helpers.mjs'

before(reset)
after(closeAll)

const TABLES = [
  'profiles', 'account_private', 'admins', 'blocks', 'spots', 'spot_private', 'join_requests',
  'memberships', 'messages', 'notifications', 'ratings', 'reports',
]

test('every public table has row level security on', async () => {
  const r = await rows(admin, `
    select c.relname, c.relrowsecurity from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' order by 1`)
  assert.deepEqual(r.map((x) => x.relname).sort(), [...TABLES].sort())
  assert.ok(r.every((x) => x.relrowsecurity), 'a table has RLS off')
})

test('anon has no privilege on any table, sequence or function', async () => {
  const t = await rows(admin, `
    select table_name, privilege_type from information_schema.role_table_grants
    where table_schema in ('public', 'private') and grantee in ('anon', 'PUBLIC')`)
  assert.deepEqual(t, [])
  const f = await rows(admin, `
    select p.oid::regprocedure::text as fn from pg_proc p
    where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
      and has_function_privilege('anon', p.oid, 'execute')`)
  assert.deepEqual(f, [])
})

test('authenticated can only SELECT tables (plus two admin-gated report columns)', async () => {
  const t = await rows(admin, `
    select table_name, privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated' and privilege_type <> 'SELECT'`)
  assert.deepEqual(t, [])
  const c = await rows(admin, `
    select table_name, column_name, privilege_type from information_schema.column_privileges
    where table_schema = 'public' and grantee = 'authenticated' and privilege_type <> 'SELECT' order by 2`)
  assert.deepEqual(c, [
    { table_name: 'reports', column_name: 'admin_note', privilege_type: 'UPDATE' },
    { table_name: 'reports', column_name: 'status', privilege_type: 'UPDATE' },
  ])
  const admins = await rows(admin, `select has_table_privilege('authenticated', 'public.admins', 'select') as ok`)
  assert.equal(admins[0].ok, false)
})

test('authenticated can execute exactly the intended functions', async () => {
  const f = await rows(admin, `
    select n.nspname || '.' || p.proname as fn from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and has_function_privilege('authenticated', p.oid, 'execute')
    order by 1`)
  assert.deepEqual(f.map((x) => x.fn), [
    'private.blocked_between', 'private.can_see_profile', 'private.has_history', 'private.is_active_member',
    'private.is_admin', 'private.is_host', 'private.is_onboarded', 'private.is_participant',
    'private.known_languages', 'private.known_types', 'private.valid_avatar',
    'public.app_config', 'public.block_user', 'public.cancel_spot', 'public.complete_onboarding',
    'public.create_spot', 'public.decide_request', 'public.delete_account', 'public.leave_spot',
    'public.mark_all_notifications_read', 'public.mark_chat_read', 'public.mark_notifications_read',
    'public.rating_tasks', 'public.remove_member', 'public.request_to_join', 'public.send_message',
    'public.server_now', 'public.set_locale', 'public.spot_summaries', 'public.submit_rating',
    'public.submit_report', 'public.trust_summaries', 'public.unblock_user', 'public.update_profile',
    'public.update_spot', 'public.withdraw_request',
  ])
})

test('every SECURITY DEFINER function pins an empty search_path', async () => {
  const f = await rows(admin, `
    select p.oid::regprocedure::text as fn from pg_proc p
    where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace) and p.prosecdef
      and not coalesce(p.proconfig @> array['search_path=""'], false)`)
  assert.deepEqual(f, [])
})

test('a logged-out visitor can read nothing and call nothing', async () => {
  const host = await user('Host')
  await createSpot(host)
  const anon = await anonSession()
  for (const t of TABLES) {
    await failsWith(anon.query(`select * from public.${t}`), '42501')
  }
  await failsWith(anon.query(`select public.server_now()`), '42501')
  await failsWith(anon.query(`select * from public.spot_summaries(array[]::uuid[])`), '42501')
})

test('a signed-in user cannot write any table directly', async () => {
  const u = await user('Writer')
  const other = await user('Other')
  const spotId = await createSpot(u)
  const attempts = [
    [`insert into public.profiles (id, first_name) values (gen_random_uuid(), 'x')`],
    [`update public.profiles set first_name = 'Hacked' where id = $1`, [u.id]],
    [`delete from public.profiles where id = $1`, [u.id]],
    [`update public.account_private set technion_verified_at = now() where user_id = $1`, [u.id]],
    [`insert into public.admins (user_id) values ($1)`, [u.id]],
    [`update public.spots set places = 8 where id = $1`, [spotId]],
    [`delete from public.spots where id = $1`, [spotId]],
    [`insert into public.join_requests (spot_id, requester_id, status) values ($1, $2, 'accepted')`, [spotId, other.id]],
    [`insert into public.memberships (spot_id, user_id, request_id) values ($1, $2, gen_random_uuid())`, [spotId, u.id]],
    [`insert into public.messages (spot_id, sender_id, body, client_id) values ($1, $2, 'x', gen_random_uuid())`, [spotId, u.id]],
    [`insert into public.notifications (user_id, type, spot_id) values ($1, 'new_message', $2)`, [other.id, spotId]],
    [`update public.notifications set read_at = now()`],
    [`insert into public.ratings (spot_id, rater_id, ratee_id, stars) values ($1, $2, $3, 5)`, [spotId, other.id, u.id]],
    [`insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`, [other.id, u.id]],
    [`insert into public.reports (reporter_id, spot_id, reason) values ($1, $2, 'other')`, [u.id, spotId]],
    [`delete from public.reports`],
    [`truncate public.messages`],
  ]
  for (const [sql, params] of attempts) {
    await failsWith(u.db.query(sql, params), '42501')
  }
})

test('a signed-in user who has not finished onboarding sees no spots and cannot act', async () => {
  const host = await user('Host2')
  const spotId = await createSpot(host)
  const fresh = await signIn('Fresh')
  assert.equal((await rows(fresh.db, `select id from public.spots`)).length, 0)
  assert.equal((await rows(fresh.db, `select id from public.profiles`)).length, 0)
  await assert.rejects(fresh.db.query(`select public.request_to_join($1, 'hi')`, [spotId]), /not_onboarded/)
  await assert.rejects(fresh.db.query(`select public.block_user($1)`, [host.id]), /not_onboarded/)
})
