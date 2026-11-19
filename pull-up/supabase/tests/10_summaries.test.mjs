import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { accept, closeAll, createSpot, joined, moveSpot, requestJoin, reset, rpc, user } from './helpers.mjs'

beforeEach(reset)
after(closeAll)

test('spot_summaries: joined, places left and the mix of Pull Up users, as totals only', async () => {
  const host = await user('Host', { p_gender: 'woman' })
  const a = await user('Avi', { p_gender: 'man' })
  const b = await user('Bella', { p_gender: 'woman' })
  const c = await user('Chen', { p_gender: null })
  const viewer = await user('Viewer')
  const spotId = await createSpot(host, { p_places: 4 })
  const summary = async (u) => (await rpc(u.db, 'spot_summaries', { p_spot_ids: [spotId] }))[0]

  assert.deepEqual(await summary(viewer), { spot_id: spotId, joined: 0, places_left: 4, women: 1, men: 0, nonbinary: 0, unstated: 0 })
  await accept(host, await requestJoin(a, spotId))
  await accept(host, await requestJoin(b, spotId))
  await accept(host, await requestJoin(c, spotId))
  const pending = await user('Pending', { p_gender: 'man' })
  await requestJoin(pending, spotId)
  assert.deepEqual(await summary(viewer), { spot_id: spotId, joined: 3, places_left: 1, women: 2, men: 1, nonbinary: 0, unstated: 1 }, 'a pending applicant is not counted')
  await rpc(b.db, 'leave_spot', { p_spot_id: spotId })
  assert.deepEqual(await summary(viewer), { spot_id: spotId, joined: 2, places_left: 2, women: 1, men: 1, nonbinary: 0, unstated: 1 })
})

test('spot_summaries returns nothing for spots the caller cannot see, and caps the list', async () => {
  const host = await user('Host')
  const viewer = await user('Viewer')
  const spotId = await createSpot(host)
  const ended = await createSpot(host)
  await moveSpot(ended, -300, -10)
  const got = await rpc(viewer.db, 'spot_summaries', { p_spot_ids: [spotId, ended, crypto.randomUUID()] })
  assert.deepEqual(got.map((g) => g.spot_id), [spotId])
  const many = Array.from({ length: 150 }, () => crypto.randomUUID())
  assert.deepEqual(await rpc(viewer.db, 'spot_summaries', { p_spot_ids: [...many, spotId] }), [], 'only the first 100 ids are looked at')
})

test('trust_summaries: "joined" means in the group when the plan started; cancelled plans do not count', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const trust = async () => (await rpc(host.db, 'trust_summaries', { p_user_ids: [a.id] }))[0]
  const first = await joined(host, a)
  assert.equal((await trust()).plans_joined, 0, 'not started yet')
  await moveSpot(first.spotId, -60, 60)
  assert.equal((await trust()).plans_joined, 1)

  const cancelled = await joined(host, a)
  await rpc(host.db, 'cancel_spot', { p_spot_id: cancelled.spotId })
  await moveSpot(cancelled.spotId, -60, 60)
  assert.equal((await trust()).plans_joined, 1)
  const mine = (await rpc(host.db, 'trust_summaries', { p_user_ids: [host.id] }))[0]
  assert.equal(mine.plans_hosted, 1)
  assert.equal(mine.technion_verified, false)
})

test('app_config and server_now are available to signed-in users', async () => {
  const u = await user('Any')
  const [{ app_config }] = await rpc(u.db, 'app_config')
  assert.equal(app_config.terms_version, '2026-11')
  assert.equal(app_config.time_zone, 'Asia/Jerusalem')
  const [{ server_now }] = await rpc(u.db, 'server_now')
  assert.ok(Math.abs(new Date(server_now) - Date.now()) < 60_000)
})
