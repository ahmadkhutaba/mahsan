import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import {
  AVATAR, TERMS, admin, closeAll, createSpot, fails, failsWith, joined, onboard, requestJoin, reset, rows, rpc,
  signIn, user,
} from './helpers.mjs'

beforeEach(reset)
after(closeAll)

const base = {
  p_first_name: 'Noa', p_avatar: AVATAR, p_age_range: '25-29', p_languages: ['he'], p_gender: 'woman',
  p_interests: ['bar'], p_locale: 'he', p_is_adult: true, p_terms_version: TERMS,
}

test('onboarding needs the 18+ declaration and the current terms', async () => {
  const u = await signIn('Noa')
  await fails(rpc(u.db, 'complete_onboarding', { ...base, p_is_adult: false }), 'adult_required')
  await fails(rpc(u.db, 'complete_onboarding', { ...base, p_is_adult: null }), 'adult_required')
  await fails(rpc(u.db, 'complete_onboarding', { ...base, p_terms_version: 'old' }), 'terms_outdated')
  await rpc(u.db, 'complete_onboarding', base)
  const [priv] = await rows(u.db, `select gender, locale, adult_declared_at, terms_version from public.account_private`)
  assert.equal(priv.gender, 'woman')
  assert.equal(priv.locale, 'he')
  assert.ok(priv.adult_declared_at)
})

test('onboarding rejects bad names, avatars, ages and languages', async () => {
  const u = await signIn('Bad')
  await fails(rpc(u.db, 'complete_onboarding', { ...base, p_first_name: '   ' }), 'invalid_profile')
  await fails(rpc(u.db, 'complete_onboarding', { ...base, p_first_name: 'x'.repeat(31) }), 'invalid_profile')
  await fails(rpc(u.db, 'complete_onboarding', { ...base, p_avatar: { ...AVATAR, bg: 'javascript:alert(1)' } }), 'invalid_profile')
  await fails(rpc(u.db, 'complete_onboarding', { ...base, p_avatar: { ...AVATAR, photo: 'https://x' } }), 'invalid_profile')
  await failsWith(rpc(u.db, 'complete_onboarding', { ...base, p_age_range: '12-17' }), '23514')
  await failsWith(rpc(u.db, 'complete_onboarding', { ...base, p_languages: ['klingon'] }), '23514')
  await failsWith(rpc(u.db, 'complete_onboarding', { ...base, p_languages: [] }), '23514')
  await failsWith(rpc(u.db, 'complete_onboarding', { ...base, p_gender: 'robot' }), '23514')
  assert.equal((await rows(admin, `select 1 from public.profiles where id = $1`, [u.id])).length, 0)
})

test('names are cleaned: direction-override characters and extra spaces are removed', async () => {
  const u = await signIn('Tricky')
  await rpc(u.db, 'complete_onboarding', { ...base, p_first_name: '  Da‮na   Lev⁦ ' })
  const [p] = await rows(u.db, `select first_name from public.profiles where id = $1`, [u.id])
  assert.equal(p.first_name, 'Da na Lev')
})

test('private account data is readable only by its owner', async () => {
  const a = await user('Avi', { p_gender: 'man' })
  const b = await user('Bella', { p_gender: 'woman' })
  await joined(a, b)
  const mine = await rows(a.db, `select user_id from public.account_private`)
  assert.deepEqual(mine.map((r) => r.user_id), [a.id])
  assert.equal((await rows(b.db, `select * from public.account_private where user_id = $1`, [a.id])).length, 0)
  // the public profile row has no private columns at all
  const cols = await rows(admin, `select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' order by 1`)
  assert.deepEqual(cols.map((c) => c.column_name), [
    'age_range', 'avatar', 'created_at', 'deleted_at', 'first_name', 'id', 'languages', 'onboarded_at', 'updated_at',
  ])
})

test('profiles: strangers are invisible; hosts, applicants and group members are visible', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const stranger = await user('Stranger')
  const seen = async (viewer) => (await rows(viewer.db, `select id from public.profiles`)).map((r) => r.id).sort()

  // nobody has a plan yet: each person sees only themselves
  assert.deepEqual(await seen(host), [host.id])
  assert.deepEqual(await seen(stranger), [stranger.id])

  const spotId = await createSpot(host, { p_places: 2 })
  // a host with an open plan is visible to everyone who is onboarded
  assert.deepEqual(await seen(stranger), [host.id, stranger.id].sort())
  // the host does not see people who have not asked to join
  assert.deepEqual(await seen(host), [host.id])

  const requestId = await requestJoin(joiner, spotId)
  assert.deepEqual(await seen(host), [host.id, joiner.id].sort())
  // a withdrawn request hides the applicant again
  await rpc(joiner.db, 'withdraw_request', { p_request_id: requestId })
  assert.deepEqual(await seen(host), [host.id])

  // two members of the same group see each other; the stranger still sees only the host
  const r1 = await requestJoin(joiner, spotId)
  const other = await user('Other')
  const r2 = await requestJoin(other, spotId)
  await rpc(host.db, 'decide_request', { p_request_id: r1, p_accept: true })
  assert.ok(!(await seen(joiner)).includes(other.id), 'a pending applicant is not visible to members')
  await rpc(host.db, 'decide_request', { p_request_id: r2, p_accept: true })
  assert.ok((await seen(joiner)).includes(other.id))
  assert.deepEqual(await seen(stranger), [host.id, stranger.id].sort())
})

test('update_profile changes only the caller; verification and admin flags cannot be set', async () => {
  const a = await user('Avi')
  const b = await user('Bella')
  await rpc(a.db, 'update_profile', {
    p_first_name: 'Avraham', p_avatar: AVATAR, p_age_range: '30-34', p_languages: ['en'], p_gender: 'man', p_interests: [],
  })
  const all = await rows(admin, `select id, first_name from public.profiles order by first_name`)
  assert.deepEqual(all.map((p) => p.first_name), ['Avraham', 'Bella'])
  await failsWith(a.db.query(`update public.account_private set technion_verified_at = now()`), '42501')
  const [t] = await rpc(b.db, 'trust_summaries', { p_user_ids: [b.id] })
  assert.equal(t.technion_verified, false)
  assert.equal(t.ratings_count, 0)
  assert.equal(t.rating_avg, null)
})

test('onboarding twice keeps the original 18+ timestamp', async () => {
  const u = await user('Twice')
  const [first] = await rows(u.db, `select adult_declared_at, terms_accepted_at from public.account_private`)
  await onboard(u, { p_first_name: 'Twice Again' })
  const [second] = await rows(u.db, `select adult_declared_at, terms_accepted_at from public.account_private`)
  assert.deepEqual(second, first)
})
