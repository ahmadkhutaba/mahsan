import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import {
  admin, closeAll, createSpot, fails, failsWith, inMinutes, joined, moveSpot, notifications, requestJoin, reset,
  rows, rpc, spotArgs, user,
} from './helpers.mjs'

beforeEach(reset)
after(closeAll)

test('leaving after the start: allowed, the host is not pinged, and rating stays possible', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const { spotId } = await joined(host, joiner)
  await moveSpot(spotId, -30, 90)
  await rpc(joiner.db, 'leave_spot', { p_spot_id: spotId })
  assert.equal((await notifications(host, 'place_opened')).length, 0)
  const late = await user('Late')
  await fails(requestJoin(late, spotId), 'spot_started') // the freed place cannot be taken once it started
  await moveSpot(spotId, -300, -10)
  await admin.query(`update public.memberships set ended_at = now() - interval '100 minutes' where user_id = $1`, [joiner.id])
  await rpc(joiner.db, 'submit_rating', { p_spot_id: spotId, p_ratee_id: host.id, p_stars: 2, p_felt_safe: 'no', p_matched_description: 'no', p_tags: ['awkward'] })
  // ...and they can still report, although they no longer see the chat
  await rpc(joiner.db, 'submit_report', { p_spot_id: spotId, p_reported_user_id: host.id, p_reason: 'pressure', p_details: '' })
  assert.equal((await rows(joiner.db, `select 1 from public.messages`)).length, 0)
})

test('notifications: readable and markable only by their owner', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const spotId = await createSpot(host)
  await requestJoin(joiner, spotId)
  const [n] = await rows(host.db, `select id from public.notifications`)
  assert.equal((await rows(joiner.db, `select 1 from public.notifications`)).length, 0)
  await rpc(joiner.db, 'mark_notifications_read', { p_ids: [n.id] }) // someone else's id: nothing happens
  assert.equal((await rows(host.db, `select read_at from public.notifications`))[0].read_at, null)
  await rpc(host.db, 'mark_notifications_read', { p_ids: [n.id] })
  assert.ok((await rows(host.db, `select read_at from public.notifications`))[0].read_at)
})

test('set_locale accepts only the two supported languages and changes only the caller', async () => {
  const a = await user('Avi')
  const b = await user('Bella')
  await rpc(a.db, 'set_locale', { p_locale: 'he' })
  await failsWith(rpc(a.db, 'set_locale', { p_locale: 'fr' }), '23514')
  assert.deepEqual(await rows(admin, `select locale from public.account_private order by locale`), [{ locale: 'en' }, { locale: 'he' }])
  assert.equal((await rows(b.db, `select locale from public.account_private`))[0].locale, 'en')
})

test('update_spot applies the same time rules when the start is moved', async () => {
  const host = await user('Host')
  const spotId = await createSpot(host)
  const { p_kind, ...edit } = spotArgs()
  await fails(rpc(host.db, 'update_spot', { p_spot_id: spotId, ...edit, p_starts_at: inMinutes(2), p_ends_at: inMinutes(90) }), 'starts_too_soon')
  await fails(rpc(host.db, 'update_spot', { p_spot_id: spotId, ...edit, p_starts_at: inMinutes(9 * 24 * 60), p_ends_at: inMinutes(9 * 24 * 60 + 60) }), 'starts_too_far')
  await fails(rpc(host.db, 'update_spot', { p_spot_id: spotId, ...edit, p_ends_at: edit.p_starts_at }), 'invalid_duration')
  await fails(rpc(host.db, 'update_spot', { p_spot_id: spotId, ...edit, p_starts_at: null }), 'invalid_time')
  await rpc(host.db, 'update_spot', { p_spot_id: spotId, ...edit, p_starts_at: inMinutes(200), p_ends_at: inMinutes(320), p_find_us_hint: 'By the door' })
  assert.equal((await rows(host.db, `select find_us_hint from public.spot_private`))[0].find_us_hint, 'By the door')
  await rpc(host.db, 'cancel_spot', { p_spot_id: spotId })
  await fails(rpc(host.db, 'update_spot', { p_spot_id: spotId, ...edit }), 'spot_cancelled')
})

test('times are stored as absolute instants: a Haifa evening reads back the same from any session time zone', async () => {
  const host = await user('Host')
  const startsAt = inMinutes(180)
  const spotId = await createSpot(host, { p_starts_at: startsAt, p_ends_at: inMinutes(300) })
  await host.db.query(`set time zone 'Asia/Jerusalem'`)
  const [a] = await rows(host.db, `select starts_at from public.spots where id = $1`, [spotId])
  await host.db.query(`set time zone 'UTC'`)
  const [b] = await rows(host.db, `select starts_at from public.spots where id = $1`, [spotId])
  assert.equal(a.starts_at.getTime(), startsAt.getTime())
  assert.equal(b.starts_at.getTime(), startsAt.getTime())
  const [{ data_type }] = await rows(admin, `select data_type from information_schema.columns where table_name = 'spots' and column_name = 'starts_at'`)
  assert.equal(data_type, 'timestamp with time zone')
})
