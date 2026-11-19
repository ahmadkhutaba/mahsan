import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import {
  accept, admin, closeAll, createSpot, fails, joined, moveSpot, notifications, requestJoin, reset, rows, rpc, user,
} from './helpers.mjs'

beforeEach(reset)
after(closeAll)

test('happy path: host posts, joiner asks, host accepts, and each side gets one notification', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const spotId = await createSpot(host)
  const requestId = await requestJoin(joiner, spotId, '  Can I come?  ')

  assert.deepEqual(await notifications(host, 'request_received'), [
    { type: 'request_received', spot_id: spotId, request_id: requestId, read_at: null },
  ])
  const [asHost] = await rows(host.db, `select status, message, requester_id from public.join_requests`)
  assert.deepEqual(asHost, { status: 'pending', message: 'Can I come?', requester_id: joiner.id })

  await accept(host, requestId)
  assert.equal((await notifications(joiner, 'request_accepted')).length, 1)
  assert.equal((await notifications(host, 'request_received')).length, 0, 'answered requests leave the inbox')
  const [m] = await rows(joiner.db, `select status, user_id from public.memberships where spot_id = $1`, [spotId])
  assert.deepEqual(m, { status: 'active', user_id: joiner.id })

  // a fresh connection (new session, refresh) sees the same state
  const again = await rows(joiner.db, `select status from public.join_requests where id = $1`, [requestId])
  assert.equal(again[0].status, 'accepted')
  const [sum] = await rpc(joiner.db, 'spot_summaries', { p_spot_ids: [spotId] })
  assert.equal(sum.joined, 1)
  assert.equal(sum.places_left, 0)
})

test('you cannot ask to join your own spot, twice, after a decline, or when it is full', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const b = await user('Bella')
  const spotId = await createSpot(host)

  await fails(requestJoin(host, spotId), 'own_spot')
  const r1 = await requestJoin(a, spotId)
  await fails(requestJoin(a, spotId), 'already_requested')
  await rpc(host.db, 'decide_request', { p_request_id: r1, p_accept: false })
  assert.equal((await notifications(a, 'request_declined')).length, 1)
  await fails(requestJoin(a, spotId), 'already_answered')

  const r2 = await requestJoin(b, spotId)
  await accept(host, r2)
  await fails(requestJoin(b, spotId), 'already_member')
  const c = await user('Chen')
  await fails(requestJoin(c, spotId), 'spot_full')
  await fails(requestJoin(c, crypto.randomUUID()), 'spot_not_found')
})

test('withdraw: only your own pending request, and you can ask again at most twice', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const b = await user('Bella')
  const spotId = await createSpot(host)
  const r1 = await requestJoin(a, spotId, 'first message')
  await fails(rpc(b.db, 'withdraw_request', { p_request_id: r1 }), 'request_not_pending')
  await fails(rpc(host.db, 'withdraw_request', { p_request_id: r1 }), 'request_not_pending')
  await rpc(a.db, 'withdraw_request', { p_request_id: r1 })
  await fails(rpc(a.db, 'withdraw_request', { p_request_id: r1 }), 'request_not_pending')
  assert.equal((await notifications(host, 'request_received')).length, 0)
  const [w] = await rows(host.db, `select status, message from public.join_requests where id = $1`, [r1])
  assert.deepEqual(w, { status: 'withdrawn', message: '' }, 'the message is erased when a request is taken back')
  await fails(rpc(host.db, 'decide_request', { p_request_id: r1, p_accept: true }), 'request_not_pending')

  const r2 = await requestJoin(a, spotId)
  await rpc(a.db, 'withdraw_request', { p_request_id: r2 })
  await fails(requestJoin(a, spotId), 'too_many_requests')
})

test('only the host can answer: not the requester, not a member, not a stranger', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const member = await user('Member')
  const stranger = await user('Stranger')
  const spotId = await createSpot(host, { p_places: 2 })
  await accept(host, await requestJoin(member, spotId))
  const requestId = await requestJoin(joiner, spotId)

  for (const who of [joiner, member, stranger]) {
    await fails(rpc(who.db, 'decide_request', { p_request_id: requestId, p_accept: true }), 'request_not_found')
    await fails(rpc(who.db, 'decide_request', { p_request_id: requestId, p_accept: false }), 'request_not_found')
  }
  await fails(rpc(host.db, 'decide_request', { p_request_id: requestId, p_accept: null }), 'invalid_decision')
  const [r] = await rows(admin, `select status from public.join_requests where id = $1`, [requestId])
  assert.equal(r.status, 'pending')
  assert.equal((await rows(admin, `select 1 from public.memberships where user_id = $1`, [joiner.id])).length, 0)
})

test('requests are visible only to the requester and the host', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const b = await user('Bella')
  const stranger = await user('Stranger')
  const spotId = await createSpot(host, { p_places: 3 })
  const ra = await requestJoin(a, spotId, 'secret from Avi')
  await requestJoin(b, spotId, 'secret from Bella')
  await accept(host, ra)

  assert.equal((await rows(host.db, `select id from public.join_requests`)).length, 2)
  assert.deepEqual((await rows(a.db, `select requester_id from public.join_requests`)).map((r) => r.requester_id), [a.id])
  assert.deepEqual((await rows(b.db, `select requester_id from public.join_requests`)).map((r) => r.requester_id), [b.id])
  assert.equal((await rows(stranger.db, `select id from public.join_requests`)).length, 0)
  assert.equal((await rows(stranger.db, `select 1 from public.memberships`)).length, 0)
  assert.equal((await rows(stranger.db, `select 1 from public.notifications`)).length, 0)
  // a pending applicant does not see who is already in the group
  assert.equal((await rows(b.db, `select 1 from public.memberships`)).length, 0)
})

test('a started or cancelled plan cannot take or accept requests; waiting ones expire', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const b = await user('Bella')
  const spotId = await createSpot(host)
  const requestId = await requestJoin(a, spotId)

  await moveSpot(spotId, -1, 120)
  await fails(rpc(host.db, 'decide_request', { p_request_id: requestId, p_accept: true }), 'spot_started')
  await fails(rpc(host.db, 'decide_request', { p_request_id: requestId, p_accept: false }), 'spot_started')
  await fails(requestJoin(b, spotId), 'spot_started')
  assert.equal((await rows(admin, `select 1 from public.memberships`)).length, 0)

  await admin.query(`select private.run_maintenance()`)
  await admin.query(`select private.run_maintenance()`) // running it again changes nothing
  const [r] = await rows(a.db, `select status from public.join_requests where id = $1`, [requestId])
  assert.equal(r.status, 'expired')
  assert.equal((await notifications(a, 'request_expired')).length, 1)
  assert.equal((await notifications(host, 'request_received')).length, 0)
})

test('limits: 5 requests waiting at once and 10 a day', async () => {
  const joiner = await user('Joiner')
  const spots = []
  for (let i = 0; i < 11; i++) {
    const h = await user(`Host${i}`)
    spots.push({ host: h, id: await createSpot(h) })
  }
  const reqs = []
  for (let i = 0; i < 5; i++) reqs.push(await requestJoin(joiner, spots[i].id))
  await fails(requestJoin(joiner, spots[5].id), 'too_many_pending')
  for (let i = 0; i < 5; i++) await rpc(spots[i].host.db, 'decide_request', { p_request_id: reqs[i], p_accept: false })
  for (let i = 5; i < 10; i++) await requestJoin(joiner, spots[i].id)
  await rpc(spots[9].host.db, 'decide_request', { p_request_id: (await rows(joiner.db, `select id from public.join_requests where spot_id = $1`, [spots[9].id]))[0].id, p_accept: false })
  await fails(requestJoin(joiner, spots[10].id), 'daily_limit')
})

test('leave quietly: no chat message, the place reopens, the host gets a neutral notice, no way back', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const other = await user('Other')
  const next = await user('Next')
  const { spotId } = await joined(host, joiner, { p_places: 2 })
  await accept(host, await requestJoin(other, spotId))
  const waiting = await requestJoin(next, spotId).catch((e) => e.message)
  assert.equal(waiting, 'spot_full')

  await fails(rpc(next.db, 'leave_spot', { p_spot_id: spotId }), 'not_member')
  await rpc(joiner.db, 'leave_spot', { p_spot_id: spotId })
  await fails(rpc(joiner.db, 'leave_spot', { p_spot_id: spotId }), 'not_member')

  assert.equal((await rows(admin, `select 1 from public.messages where spot_id = $1`, [spotId])).length, 0)
  assert.equal((await rows(other.db, `select 1 from public.notifications`)).filter(Boolean).length, 1, 'the other member only has their own "accepted" notice')
  assert.deepEqual((await notifications(host, 'place_opened')).map((n) => n.spot_id), [spotId])
  const [sum] = await rpc(next.db, 'spot_summaries', { p_spot_ids: [spotId] })
  assert.equal(sum.places_left, 1)
  // the remaining member no longer sees the one who left
  assert.deepEqual((await rows(other.db, `select user_id from public.memberships where spot_id = $1`, [spotId])).map((m) => m.user_id), [other.id])

  await fails(requestJoin(joiner, spotId), 'cannot_rejoin')
  await accept(host, await requestJoin(next, spotId)) // the freed place can be taken by someone else
})

test('remove_member: host only, the member is told, and the place reopens', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const stranger = await user('Stranger')
  const { spotId } = await joined(host, joiner)
  await fails(rpc(stranger.db, 'remove_member', { p_spot_id: spotId, p_user_id: joiner.id }), 'spot_not_found')
  await fails(rpc(joiner.db, 'remove_member', { p_spot_id: spotId, p_user_id: joiner.id }), 'spot_not_found')
  await fails(rpc(host.db, 'remove_member', { p_spot_id: spotId, p_user_id: stranger.id }), 'not_member')
  await rpc(host.db, 'remove_member', { p_spot_id: spotId, p_user_id: joiner.id })
  assert.equal((await notifications(joiner, 'member_removed')).length, 1)
  const [m] = await rows(joiner.db, `select status from public.memberships where spot_id = $1`, [spotId])
  assert.equal(m.status, 'removed')
  assert.equal((await rows(joiner.db, `select 1 from public.spot_private where spot_id = $1`, [spotId])).length, 0)
})
