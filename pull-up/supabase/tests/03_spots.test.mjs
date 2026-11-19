import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import {
  admin, closeAll, createSpot, fails, failsWith, inMinutes, joined, moveSpot, notifications, requestJoin, reset,
  rows, rpc, spotArgs, user,
} from './helpers.mjs'

beforeEach(reset)
after(closeAll)

test('create_spot enforces time rules using the server clock', async () => {
  const h = await user('Host')
  await fails(createSpot(h, { p_starts_at: inMinutes(5), p_ends_at: inMinutes(120) }), 'starts_too_soon')
  await fails(createSpot(h, { p_starts_at: inMinutes(-60), p_ends_at: inMinutes(120) }), 'starts_too_soon')
  await fails(createSpot(h, { p_starts_at: inMinutes(8 * 24 * 60), p_ends_at: inMinutes(8 * 24 * 60 + 90) }), 'starts_too_far')
  await fails(createSpot(h, { p_starts_at: inMinutes(60), p_ends_at: inMinutes(70) }), 'invalid_duration')
  await fails(createSpot(h, { p_starts_at: inMinutes(60), p_ends_at: inMinutes(60 + 13 * 60) }), 'invalid_duration')
  await fails(createSpot(h, { p_starts_at: null }), 'invalid_time')
  await fails(createSpot(h, { p_ends_at: null }), 'invalid_time')
  assert.ok(await createSpot(h))
})

test('create_spot enforces the two kinds, coordinates and field limits', async () => {
  const h = await user('Host')
  await failsWith(createSpot(h, { p_kind: 'start_plan' }), '23514') // start_plan cannot bring friends
  await failsWith(createSpot(h, { p_kind: 'missing_someone', p_friends_count: 0, p_friends_women: 0, p_friends_men: 0 }), '23514')
  await failsWith(createSpot(h, { p_friends_count: 1, p_friends_women: 1, p_friends_men: 1 }), '23514')
  await failsWith(createSpot(h, { p_lat: 32.8, p_lng: null }), '23514')
  await failsWith(createSpot(h, { p_lat: 48.85, p_lng: 2.35 }), '23514') // Paris is not Haifa
  await failsWith(createSpot(h, { p_places: 0 }), '23514')
  await failsWith(createSpot(h, { p_places: 9 }), '23514')
  await failsWith(createSpot(h, { p_title: 'ab' }), '23514')
  await failsWith(createSpot(h, { p_address: '' }), '23514')
  await failsWith(createSpot(h, { p_languages: [] }), '23514')
  await failsWith(createSpot(h, { p_type: 'casino' }), '23514')
  const solo = await createSpot(h, {
    p_kind: 'start_plan', p_friends_count: 0, p_friends_women: 0, p_friends_men: 0, p_lat: null, p_lng: null,
    p_type: 'class', p_needs_booking: true, p_booking_note: 'Book your own place with the studio.', p_cost_note: '₪120',
  })
  const [s] = await rows(h.db, `select kind, lat, needs_booking, booking_note, cost_note, city from public.spots where id = $1`, [solo])
  assert.deepEqual(s, { kind: 'start_plan', lat: null, needs_booking: true, booking_note: 'Book your own place with the studio.', cost_note: '₪120', city: 'haifa' })
})

test('a host can have 3 open spots and create 5 a day', async () => {
  const h = await user('Host')
  const ids = []
  for (let i = 0; i < 3; i++) ids.push(await createSpot(h))
  await fails(createSpot(h), 'too_many_open_spots')
  await rpc(h.db, 'cancel_spot', { p_spot_id: ids[0] })
  await rpc(h.db, 'cancel_spot', { p_spot_id: ids[1] })
  await createSpot(h)
  await createSpot(h) // 5 created today
  await rpc(h.db, 'cancel_spot', { p_spot_id: ids[2] })
  await fails(createSpot(h), 'daily_limit')
})

test('the meeting hint is readable only by the host and current members', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const pending = await user('Pending')
  const outsider = await user('Outsider')
  const { spotId } = await joined(host, joiner, { p_places: 2 })
  await requestJoin(pending, spotId)
  const hint = async (u) => (await rows(u.db, `select find_us_hint from public.spot_private where spot_id = $1`, [spotId])).length
  assert.equal(await hint(host), 1)
  assert.equal(await hint(joiner), 1)
  assert.equal(await hint(pending), 0)
  assert.equal(await hint(outsider), 0)
  await rpc(joiner.db, 'leave_spot', { p_spot_id: spotId })
  assert.equal(await hint(joiner), 0, 'leaving removes access to the hint')
})

test('discovery: started plans stay readable until they end, then only for people involved', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const outsider = await user('Outsider')
  const { spotId } = await joined(host, joiner)
  const sees = async (u) => (await rows(u.db, `select id from public.spots where id = $1`, [spotId])).length === 1
  const discoverable = async (u) =>
    (await rows(u.db, `select id from public.spots where cancelled_at is null and starts_at > now()`)).length

  assert.equal(await discoverable(outsider), 1)
  await moveSpot(spotId, -30, 60) // started, not ended
  assert.equal(await discoverable(outsider), 0, 'a started plan is not in discovery')
  assert.ok(await sees(outsider), 'a direct link still resolves while the plan is running')
  await moveSpot(spotId, -180, -60) // ended
  assert.ok(!(await sees(outsider)), 'after the end an outsider gets nothing')
  assert.ok(await sees(joiner), 'a member keeps the plan')
  assert.ok(await sees(host))
})

test('update_spot: only the host, only before the start, and moving it notifies people', async () => {
  const host = await user('Host')
  const member = await user('Member')
  const waiting = await user('Waiting')
  const outsider = await user('Outsider')
  const { spotId } = await joined(host, member, { p_places: 2 })
  await requestJoin(waiting, spotId)
  const { p_kind, ...edit } = spotArgs({ p_places: 2 })

  await fails(rpc(outsider.db, 'update_spot', { p_spot_id: spotId, ...edit }), 'spot_not_found')
  await fails(rpc(member.db, 'update_spot', { p_spot_id: spotId, ...edit }), 'spot_not_found')

  // a note-only edit tells nobody
  const before = (await rows(host.db, `select starts_at, ends_at from public.spots where id = $1`, [spotId]))[0]
  await rpc(host.db, 'update_spot', { p_spot_id: spotId, ...edit, p_starts_at: before.starts_at, p_ends_at: before.ends_at, p_host_note: 'New note' })
  assert.equal((await notifications(member, 'spot_changed')).length, 0)

  // moving the place tells the member and the person waiting, once each
  await rpc(host.db, 'update_spot', { p_spot_id: spotId, ...edit, p_starts_at: before.starts_at, p_ends_at: before.ends_at, p_venue_name: 'Another Place' })
  assert.equal((await notifications(member, 'spot_changed')).length, 1)
  assert.equal((await notifications(waiting, 'spot_changed')).length, 1)
  assert.equal((await notifications(outsider, 'spot_changed')).length, 0)

  // places cannot drop below the people already in
  await fails(rpc(host.db, 'update_spot', { p_spot_id: spotId, ...edit, p_starts_at: before.starts_at, p_ends_at: before.ends_at, p_places: 0 }), 'places_below_joined')

  await moveSpot(spotId, -10, 120)
  await fails(rpc(host.db, 'update_spot', { p_spot_id: spotId, ...edit }), 'spot_started')
})

test('cancel_spot: tells members and people waiting, expires their requests, and is final', async () => {
  const host = await user('Host')
  const member = await user('Member')
  const waiting = await user('Waiting')
  const { spotId } = await joined(host, member, { p_places: 2 })
  const waitingRequest = await requestJoin(waiting, spotId)

  await fails(rpc(member.db, 'cancel_spot', { p_spot_id: spotId }), 'spot_not_found')
  await rpc(host.db, 'cancel_spot', { p_spot_id: spotId })
  await rpc(host.db, 'cancel_spot', { p_spot_id: spotId }) // repeating it is harmless

  assert.equal((await notifications(member, 'spot_cancelled')).length, 1)
  assert.equal((await notifications(waiting, 'spot_cancelled')).length, 1)
  assert.equal((await notifications(host, 'request_received')).length, 0, 'the stale request notice is gone')
  const [r] = await rows(waiting.db, `select status from public.join_requests where id = $1`, [waitingRequest])
  assert.equal(r.status, 'expired')

  const late = await user('Late')
  await fails(requestJoin(late, spotId), 'spot_cancelled')
  await fails(rpc(host.db, 'decide_request', { p_request_id: waitingRequest, p_accept: true }), 'request_not_pending')
  await fails(rpc(member.db, 'send_message', { p_spot_id: spotId, p_body: 'hello?', p_client_id: crypto.randomUUID() }), 'spot_cancelled')

  const ended = await createSpot(host)
  await moveSpot(ended, -300, -60)
  await fails(rpc(host.db, 'cancel_spot', { p_spot_id: ended }), 'spot_ended')
  assert.equal((await rows(admin, `select 1 from public.spots where cancelled_at is not null`)).length, 1)
})
