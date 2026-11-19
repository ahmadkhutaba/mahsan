import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, beforeEach, test } from 'node:test'
import {
  accept, admin, closeAll, createSpot, fails, joined, notifications, requestJoin, reset, rows, rpc, user,
} from './helpers.mjs'

beforeEach(reset)
after(closeAll)

const block = (who, target) => rpc(who.db, 'block_user', { p_user_id: target.id })
const send = (u, spotId, body) => rpc(u.db, 'send_message', { p_spot_id: spotId, p_body: body, p_client_id: randomUUID() })
const ids = async (u, table) => (await rows(u.db, `select * from public.${table}`)).length

test('after a block, neither person can see the other: profile, spots, summaries or trust', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const spotId = await createSpot(host)
  assert.equal(await ids(joiner, 'spots'), 1)
  assert.equal((await rows(joiner.db, `select 1 from public.profiles where id = $1`, [host.id])).length, 1)

  await block(joiner, host)
  // the same already-open connection loses access immediately
  assert.equal(await ids(joiner, 'spots'), 0)
  assert.equal((await rows(joiner.db, `select 1 from public.profiles where id = $1`, [host.id])).length, 0)
  assert.deepEqual(await rpc(joiner.db, 'spot_summaries', { p_spot_ids: [spotId] }), [])
  assert.deepEqual(await rpc(joiner.db, 'trust_summaries', { p_user_ids: [host.id] }), [])
  // and it works in the other direction too
  const mine = await createSpot(joiner)
  assert.equal((await rows(host.db, `select 1 from public.spots where id = $1`, [mine])).length, 0)
  assert.equal((await rows(host.db, `select 1 from public.profiles where id = $1`, [joiner.id])).length, 0)
  // a direct link or API call behaves as if the spot did not exist
  await fails(requestJoin(joiner, spotId), 'spot_not_found')
  await fails(requestJoin(host, mine), 'spot_not_found')
  // only the person who blocked can see the block
  assert.equal(await ids(joiner, 'blocks'), 1)
  assert.equal(await ids(host, 'blocks'), 0)
})

test('blocking ends waiting requests in both directions and clears their notifications', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const b = await user('Bella')
  const spotId = await createSpot(host, { p_places: 2 })
  const ra = await requestJoin(a, spotId, 'hello from Avi')
  const rb = await requestJoin(b, spotId, 'hello from Bella')
  assert.equal((await notifications(host, 'request_received')).length, 2)

  await block(a, host) // the requester blocks the host
  const [mineA] = await rows(a.db, `select status, message from public.join_requests where id = $1`, [ra])
  assert.deepEqual(mineA, { status: 'withdrawn', message: '' })
  assert.deepEqual((await rows(host.db, `select id from public.join_requests`)).map((r) => r.id), [rb], 'the host no longer sees it')
  assert.equal((await notifications(host, 'request_received')).length, 1)

  await block(host, b) // the host blocks the other requester
  const [mineB] = await rows(b.db, `select status from public.join_requests where id = $1`, [rb])
  assert.equal(mineB.status, 'declined')
  assert.equal((await notifications(b, 'request_declined')).length, 0, 'no notification points at the blocker')
  assert.equal((await notifications(host, 'request_received')).length, 0)
  await fails(rpc(host.db, 'decide_request', { p_request_id: ra, p_accept: true }), 'request_not_pending')
})

test('a request cannot be accepted across a block, even by calling the function directly', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const spotId = await createSpot(host)
  const ra = await requestJoin(a, spotId)
  // put a block in place without the side effects, as if it happened a moment before the accept
  await admin.query(`insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`, [a.id, host.id])
  await fails(rpc(host.db, 'decide_request', { p_request_id: ra, p_accept: true }), 'request_not_found')
  assert.equal((await rows(admin, `select 1 from public.memberships`)).length, 0)
})

test('host blocks a member: removed. Member blocks the host: leaves. Both lose the chat and the plan', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const b = await user('Bella')
  const { spotId } = await joined(host, a, { p_places: 2 })
  await accept(host, await requestJoin(b, spotId))
  await send(host, spotId, 'see you all at 8')

  await block(host, a)
  assert.equal((await rows(admin, `select status from public.memberships where user_id = $1`, [a.id]))[0].status, 'removed')
  assert.equal(await ids(a, 'messages'), 0)
  assert.equal(await ids(a, 'spot_private'), 0)
  assert.equal((await rows(a.db, `select 1 from public.spots where id = $1`, [spotId])).length, 0)
  assert.equal((await rows(a.db, `select 1 from public.notifications where spot_id = $1`, [spotId])).length, 0)
  await fails(send(a, spotId, 'why?'), 'not_member')

  await block(b, host)
  assert.equal((await rows(admin, `select status from public.memberships where user_id = $1`, [b.id]))[0].status, 'left')
  assert.equal(await ids(b, 'messages'), 0)
  await fails(send(b, spotId, 'bye'), 'not_member')
  const [sum] = await rpc(host.db, 'spot_summaries', { p_spot_ids: [spotId] })
  assert.equal(sum.places_left, 2, 'both places are free again')
})

test('two members who block each other stay in the group but cannot read each other', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const b = await user('Bella')
  const { spotId } = await joined(host, a, { p_places: 2 })
  await accept(host, await requestJoin(b, spotId))
  await send(a, spotId, 'from Avi (before)')
  await send(b, spotId, 'from Bella (before)')
  await rpc(a.db, 'mark_chat_read', { p_spot_id: spotId })
  await rpc(b.db, 'mark_chat_read', { p_spot_id: spotId })

  await block(a, b)
  await send(a, spotId, 'from Avi (after)')
  await send(b, spotId, 'from Bella (after)')
  await send(host, spotId, 'from the host')

  const bodies = async (u) => (await rows(u.db, `select body from public.messages order by created_at, id`)).map((m) => m.body)
  assert.deepEqual(await bodies(a), ['from Avi (before)', 'from Avi (after)', 'from the host'])
  assert.deepEqual(await bodies(b), ['from Bella (before)', 'from Bella (after)', 'from the host'])
  assert.equal((await bodies(host)).length, 5)
  assert.equal((await rows(a.db, `select 1 from public.profiles where id = $1`, [b.id])).length, 0)
  assert.equal((await rows(admin, `select 1 from public.memberships where status = 'active'`)).length, 2)
  // Bella's message did not create a notification for Avi; the host's did
  assert.equal((await notifications(a, 'new_message')).filter((n) => n.read_at === null).length, 1)
})

test('block rules: not yourself, not unknown people, and unblocking restores visibility only', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const { spotId } = await joined(host, a)
  await fails(block(a, a), 'user_not_found')
  await fails(rpc(a.db, 'block_user', { p_user_id: randomUUID() }), 'user_not_found')
  await block(a, host)
  await block(a, host) // repeating it is harmless
  assert.equal(await ids(a, 'blocks'), 1)
  await rpc(host.db, 'unblock_user', { p_user_id: a.id }) // the blocked person cannot lift it
  assert.equal((await rows(admin, `select 1 from public.blocks`)).length, 1)
  await rpc(a.db, 'unblock_user', { p_user_id: host.id })
  assert.equal((await rows(a.db, `select 1 from public.spots where id = $1`, [spotId])).length, 1)
  assert.equal((await rows(admin, `select status from public.memberships`))[0].status, 'left', 'unblocking does not put anyone back in a group')
  await fails(requestJoin(a, spotId), 'cannot_rejoin')
})
