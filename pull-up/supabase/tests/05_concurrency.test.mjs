import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { admin, closeAll, createSpot, requestJoin, reset, rows, rpc, session, user } from './helpers.mjs'

beforeEach(reset)
after(closeAll)

const outcome = (p) => p.then(() => 'ok', (e) => e.message)

test('two accepts racing for the last place: exactly one wins, every time', async () => {
  const host = await user('Host')
  const host2 = await session(host.id) // the host on a second device
  const a = await user('Avi')
  const b = await user('Bella')
  const rounds = 40
  for (let i = 0; i < rounds; i++) {
    await admin.query(`truncate public.notifications, public.memberships, public.join_requests, public.spot_private, public.spots cascade`)
    const spotId = await createSpot(host, { p_places: 1 })
    const ra = await requestJoin(a, spotId)
    const rb = await requestJoin(b, spotId)
    const results = await Promise.all([
      outcome(rpc(host.db, 'decide_request', { p_request_id: ra, p_accept: true })),
      outcome(rpc(host2, 'decide_request', { p_request_id: rb, p_accept: true })),
    ])
    assert.deepEqual([...results].sort(), ['ok', 'spot_full'], `round ${i}: ${results}`)
    const [{ n }] = await rows(admin, `select count(*)::int as n from public.memberships where spot_id = $1 and status = 'active'`, [spotId])
    assert.equal(n, 1)
    const statuses = (await rows(admin, `select status from public.join_requests where spot_id = $1 order by status`, [spotId])).map((r) => r.status)
    assert.deepEqual(statuses, ['accepted', 'pending'])
  }
})

test('the same request accepted twice at once creates one membership and one notification', async () => {
  const host = await user('Host')
  const host2 = await session(host.id)
  const a = await user('Avi')
  for (let i = 0; i < 20; i++) {
    await admin.query(`truncate public.notifications, public.memberships, public.join_requests, public.spot_private, public.spots cascade`)
    const spotId = await createSpot(host, { p_places: 3 })
    const ra = await requestJoin(a, spotId)
    const results = await Promise.all([
      outcome(rpc(host.db, 'decide_request', { p_request_id: ra, p_accept: true })),
      outcome(rpc(host2, 'decide_request', { p_request_id: ra, p_accept: true })),
    ])
    assert.deepEqual([...results].sort(), ['ok', 'request_not_pending'])
    assert.equal((await rows(admin, `select 1 from public.memberships`)).length, 1)
    assert.equal((await rows(admin, `select 1 from public.notifications where type = 'request_accepted'`)).length, 1)
  }
})

test('accept racing against decline of the same request: one decision stands', async () => {
  const host = await user('Host')
  const host2 = await session(host.id)
  const a = await user('Avi')
  for (let i = 0; i < 20; i++) {
    await admin.query(`truncate public.notifications, public.memberships, public.join_requests, public.spot_private, public.spots cascade`)
    const spotId = await createSpot(host)
    const ra = await requestJoin(a, spotId)
    const results = await Promise.all([
      outcome(rpc(host.db, 'decide_request', { p_request_id: ra, p_accept: true })),
      outcome(rpc(host2, 'decide_request', { p_request_id: ra, p_accept: false })),
    ])
    assert.deepEqual([...results].sort(), ['ok', 'request_not_pending'])
    const [r] = await rows(admin, `select status from public.join_requests where id = $1`, [ra])
    const members = (await rows(admin, `select 1 from public.memberships`)).length
    assert.equal(members, r.status === 'accepted' ? 1 : 0)
  }
})

test('the same person asking twice at once ends with one request', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const a2 = await session(a.id)
  for (let i = 0; i < 20; i++) {
    await admin.query(`truncate public.notifications, public.memberships, public.join_requests, public.spot_private, public.spots cascade`)
    const spotId = await createSpot(host)
    const results = await Promise.all([
      outcome(rpc(a.db, 'request_to_join', { p_spot_id: spotId, p_message: 'one' })),
      outcome(rpc(a2, 'request_to_join', { p_spot_id: spotId, p_message: 'two' })),
    ])
    assert.deepEqual([...results].sort(), ['already_requested', 'ok'])
    assert.equal((await rows(admin, `select 1 from public.join_requests`)).length, 1)
    assert.equal((await rows(admin, `select 1 from public.notifications where type = 'request_received'`)).length, 1)
  }
})

test('many accepts, leaves and withdrawals at once never exceed the places', async () => {
  const host = await user('Host')
  const hostSessions = [host.db, await session(host.id), await session(host.id)]
  const people = []
  for (let i = 0; i < 6; i++) people.push(await user(`P${i}`))
  for (let round = 0; round < 10; round++) {
    await admin.query(`truncate public.notifications, public.memberships, public.join_requests, public.spot_private, public.spots cascade`)
    const spotId = await createSpot(host, { p_places: 2 })
    const reqs = []
    for (const p of people) reqs.push(await requestJoin(p, spotId))
    await Promise.all([
      ...reqs.map((r, i) => outcome(rpc(hostSessions[i % 3], 'decide_request', { p_request_id: r, p_accept: true }))),
      outcome(rpc(people[0].db, 'leave_spot', { p_spot_id: spotId })),
      outcome(rpc(people[1].db, 'withdraw_request', { p_request_id: reqs[1] })),
    ])
    const [{ n }] = await rows(admin, `select count(*)::int as n from public.memberships where spot_id = $1 and status = 'active'`, [spotId])
    assert.ok(n <= 2, `round ${round}: ${n} active members for 2 places`)
    const [{ bad }] = await rows(admin, `
      select count(*)::int as bad from public.join_requests r
      where r.spot_id = $1 and (r.status = 'accepted') <> exists (select 1 from public.memberships m where m.request_id = r.id)`, [spotId])
    assert.equal(bad, 0, 'every accepted request has a membership and nothing else does')
  }
})
