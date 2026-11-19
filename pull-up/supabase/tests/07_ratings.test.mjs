import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import {
  accept, admin, closeAll, createSpot, fails, failsWith, joined, moveSpot, notifications, requestJoin, reset, rows,
  rpc, user,
} from './helpers.mjs'

beforeEach(reset)
after(closeAll)

const rate = (rater, spotId, ratee, stars = 5, extra = {}) =>
  rpc(rater.db, 'submit_rating', {
    p_spot_id: spotId, p_ratee_id: ratee.id ?? ratee, p_stars: stars, p_felt_safe: 'yes',
    p_matched_description: 'yes', p_tags: ['welcoming'], ...extra,
  })
const trust = async (viewer, target) => (await rpc(viewer.db, 'trust_summaries', { p_user_ids: [target.id] }))[0]

test('rating opens when the plan ends and closes 7 days later', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const { spotId } = await joined(host, joiner)
  await fails(rate(joiner, spotId, host), 'rating_not_open')
  await moveSpot(spotId, -120, 30) // running
  await fails(rate(joiner, spotId, host), 'rating_not_open')
  await moveSpot(spotId, -300, -10) // ended
  await rate(joiner, spotId, host, 4)
  await fails(rate(joiner, spotId, host, 1), 'already_rated')
  await moveSpot(spotId, -8 * 24 * 60 - 180, -8 * 24 * 60)
  await fails(rate(host, spotId, joiner), 'rating_closed')
})

test('only the host and people who were in the group at the start can rate each other', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const b = await user('Bella')
  const leftEarly = await user('LeftEarly')
  const declined = await user('Declined')
  const stranger = await user('Stranger')
  const { spotId } = await joined(host, a, { p_places: 4 })
  await accept(host, await requestJoin(b, spotId))
  await accept(host, await requestJoin(leftEarly, spotId))
  await rpc(host.db, 'decide_request', { p_request_id: await requestJoin(declined, spotId), p_accept: false })
  await rpc(leftEarly.db, 'leave_spot', { p_spot_id: spotId })
  await moveSpot(spotId, -300, -10)
  // "left early" really did leave before the (moved) start
  await admin.query(`update public.memberships m set ended_at = s.starts_at - interval '5 minutes'
                       from public.spots s where s.id = m.spot_id and m.user_id = $1`, [leftEarly.id])

  await fails(rate(a, spotId, a), 'rating_not_allowed') // yourself
  await fails(rate(a, spotId, b), 'rating_not_allowed') // member to member
  await fails(rate(stranger, spotId, host), 'rating_not_allowed')
  await fails(rate(declined, spotId, host), 'rating_not_allowed')
  await fails(rate(leftEarly, spotId, host), 'rating_not_allowed')
  await fails(rate(host, spotId, leftEarly), 'rating_not_allowed')
  await fails(rate(host, spotId, stranger), 'rating_not_allowed')
  await fails(rate(a, crypto.randomUUID(), host), 'rating_not_allowed')
  await failsWith(rate(a, spotId, host, 6), '23514')
  await failsWith(rate(a, spotId, host, 5, { p_tags: ['made_up_tag'] }), '23514')
  await rate(a, spotId, host)
  await rate(host, spotId, a)
  await rate(host, spotId, b)
  assert.equal((await rows(admin, `select 1 from public.ratings`)).length, 3)
})

test('a member removed after the start can still rate and be rated; a cancelled plan cannot be rated', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const { spotId } = await joined(host, a)
  await moveSpot(spotId, -60, 60)
  await rpc(host.db, 'remove_member', { p_spot_id: spotId, p_user_id: a.id })
  await moveSpot(spotId, -300, -10)
  await admin.query(`update public.memberships set ended_at = now() - interval '100 minutes' where user_id = $1`, [a.id])
  await rate(a, spotId, host, 1)
  await rate(host, spotId, a, 2)

  const second = await joined(host, a)
  await rpc(host.db, 'cancel_spot', { p_spot_id: second.spotId })
  await moveSpot(second.spotId, -300, -10)
  await fails(rate(a, second.spotId, host), 'rating_not_allowed')
})

test('a rating counts once both sides rated or the window closed, and the average needs 3', async () => {
  const host = await user('Host')
  const people = [await user('Avi'), await user('Bella'), await user('Chen')]
  const { spotId } = await joined(host, people[0], { p_places: 3 })
  await accept(host, await requestJoin(people[1], spotId))
  await accept(host, await requestJoin(people[2], spotId))
  await moveSpot(spotId, -300, -10)

  await rate(people[0], spotId, host, 5)
  let t = await trust(people[0], host)
  assert.equal(t.ratings_count, 0, 'one-sided: not counted yet')
  assert.equal(t.rating_avg, null)

  await rate(host, spotId, people[0], 4)
  t = await trust(people[0], host)
  assert.equal(t.ratings_count, 1)
  assert.equal(t.rating_avg, null, 'fewer than 3: no average, so one rating cannot be read off it')
  assert.equal((await trust(host, people[0])).ratings_count, 1)

  await rate(people[1], spotId, host, 4)
  await rate(host, spotId, people[1], 5)
  await rate(people[2], spotId, host, 3)
  t = await trust(people[0], host)
  assert.equal(t.ratings_count, 2, 'the third is still one-sided')
  assert.equal(t.rating_avg, null)

  await moveSpot(spotId, -8 * 24 * 60 - 180, -8 * 24 * 60) // window closed: the one-sided rating now counts
  t = await trust(people[0], host)
  assert.equal(t.ratings_count, 3)
  assert.equal(Number(t.rating_avg), 4.0)
  assert.equal(t.plans_hosted, 1)
  assert.equal((await trust(host, people[0])).plans_joined, 1)
})

test('nobody can read the individual ratings they received, and outsiders get no trust data', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const stranger = await user('Stranger')
  const { spotId } = await joined(host, a)
  await moveSpot(spotId, -300, -10)
  await rate(a, spotId, host, 2)
  assert.equal((await rows(host.db, `select * from public.ratings`)).length, 0)
  assert.equal((await rows(a.db, `select stars from public.ratings`)).length, 1)
  assert.equal((await rows(stranger.db, `select * from public.ratings`)).length, 0)
  // the plan has ended and the stranger has no tie to either person
  assert.deepEqual(await rpc(stranger.db, 'trust_summaries', { p_user_ids: [host.id, a.id] }), [])
})

test('rating_tasks lists who you can still rate, and the "you can rate now" notice is sent once', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const b = await user('Bella')
  const { spotId } = await joined(host, a, { p_places: 2 })
  await accept(host, await requestJoin(b, spotId))
  assert.deepEqual(await rpc(a.db, 'rating_tasks'), [])
  await moveSpot(spotId, -300, -10)

  assert.deepEqual((await rpc(a.db, 'rating_tasks')).map((t) => t.ratee_id), [host.id])
  assert.deepEqual((await rpc(host.db, 'rating_tasks')).map((t) => t.ratee_id).sort(), [a.id, b.id].sort())
  await rate(a, spotId, host)
  assert.deepEqual(await rpc(a.db, 'rating_tasks'), [])

  await admin.query(`select private.run_maintenance()`)
  await admin.query(`select private.run_maintenance()`)
  for (const who of [host, a, b]) assert.equal((await notifications(who, 'rating_open')).length, 1)

  const empty = await createSpot(host)
  await moveSpot(empty, -300, -10)
  await admin.query(`select private.run_maintenance()`)
  assert.equal((await notifications(host, 'rating_open')).length, 1, 'a plan nobody joined has nothing to rate')
})
