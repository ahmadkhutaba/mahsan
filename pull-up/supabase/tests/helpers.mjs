// Test helpers. These talk to the LOCAL Supabase database only (supabase db start).
// Each "user" is its own connection that behaves exactly like a signed-in browser
// request: role "authenticated" plus the JWT claims PostgREST would set.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'

const URL = process.env.TEST_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
if (!/127\.0\.0\.1|localhost/.test(URL)) {
  throw new Error('Refusing to run: tests wipe the database and must only target a local one.')
}

export const TERMS = '2026-11'
export const AVATAR = { skin: 3, hair: 'curly', hairColor: '#3b2a20', bg: '#f5b544', shirt: '#0f3b2d' }

const open = []
async function connect() {
  const c = new pg.Client({ connectionString: URL })
  await c.connect()
  open.push(c)
  return c
}

export const admin = await connect()

export async function closeAll() {
  await Promise.all(open.splice(0).map((c) => c.end().catch(() => {})))
}

/** Wipe everything the app owns. Runs before each test. */
export async function reset() {
  await admin.query(`
    truncate public.reports, public.ratings, public.notifications, public.messages, public.memberships,
             public.join_requests, public.spot_private, public.spots, public.blocks, public.admins,
             public.account_private, public.profiles cascade;
    delete from auth.users where email like '%@test.local';
  `)
}

/** A connection acting as a signed-in user (not yet onboarded). */
export async function signIn(name) {
  const id = randomUUID()
  await admin.query(
    `insert into auth.users (id, instance_id, aud, role, email)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2)`,
    [id, `${name.toLowerCase()}-${id.slice(0, 8)}@test.local`],
  )
  const db = await session(id)
  return { id, name, db }
}

/** Another connection for an existing user (a second device). */
export async function session(id) {
  const db = await connect()
  await db.query('set role authenticated')
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify({ sub: id, role: 'authenticated' }),
  ])
  return db
}

export async function anonSession() {
  const db = await connect()
  await db.query('set role anon')
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ role: 'anon' })])
  return db
}

/** Call an RPC with named arguments, like supabase.rpc(). */
export async function rpc(db, fn, args = {}) {
  const keys = Object.keys(args)
  const sql = `select * from public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')})`
  const values = keys.map((k) => {
    const v = args[k]
    return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) ? JSON.stringify(v) : v
  })
  const res = await db.query(sql, values)
  return res.rows
}

export async function onboard(user, overrides = {}) {
  await rpc(user.db, 'complete_onboarding', {
    p_first_name: user.name,
    p_avatar: AVATAR,
    p_age_range: '25-29',
    p_languages: ['he', 'en'],
    p_gender: null,
    p_interests: ['bar'],
    p_locale: 'en',
    p_is_adult: true,
    p_terms_version: TERMS,
    ...overrides,
  })
  return user
}

/** Signed in and onboarded. */
export async function user(name, overrides) {
  return onboard(await signIn(name), overrides)
}

export const inMinutes = (m) => new Date(Date.now() + m * 60_000)

export function spotArgs(overrides = {}) {
  return {
    p_kind: 'missing_someone',
    p_type: 'boardgames',
    p_title: 'Catan night',
    p_venue_name: 'Meeple House',
    p_address: 'Herzl St 44, Haifa',
    p_lat: 32.81,
    p_lng: 34.99,
    p_starts_at: inMinutes(120),
    p_ends_at: inMinutes(300),
    p_friends_count: 2,
    p_friends_women: 1,
    p_friends_men: 1,
    p_friends_other: 0,
    p_places: 1,
    p_languages: ['he', 'en'],
    p_cost_note: '',
    p_needs_booking: false,
    p_booking_note: '',
    p_host_note: 'We teach, you win.',
    p_find_us_hint: 'Table by the window',
    ...overrides,
  }
}

export async function createSpot(host, overrides) {
  const rows = await rpc(host.db, 'create_spot', spotArgs(overrides))
  return rows[0].create_spot
}

export async function requestJoin(joiner, spotId, message = 'Hi!') {
  const rows = await rpc(joiner.db, 'request_to_join', { p_spot_id: spotId, p_message: message })
  return rows[0].request_to_join
}

export async function accept(host, requestId) {
  await rpc(host.db, 'decide_request', { p_request_id: requestId, p_accept: true })
}

/** Host posts, joiner asks, host accepts. */
export async function joined(host, joiner, overrides) {
  const spotId = await createSpot(host, overrides)
  const requestId = await requestJoin(joiner, spotId)
  await accept(host, requestId)
  return { spotId, requestId }
}

/**
 * Move a spot in time (fixtures only; the app cannot do this).
 * Memberships are moved to before the new start so "was in the group at the start" stays true.
 */
export async function moveSpot(spotId, startsInMinutes, endsInMinutes) {
  await admin.query(
    `update public.spots
        set starts_at = now() + make_interval(mins => $2), ends_at = now() + make_interval(mins => $3)
      where id = $1`,
    [spotId, startsInMinutes, endsInMinutes],
  )
  await admin.query(
    `update public.memberships m set joined_at = s.starts_at - interval '1 hour'
       from public.spots s where s.id = m.spot_id and m.spot_id = $1`,
    [spotId],
  )
}

/** Assert that a promise fails with one of our error codes (SQLSTATE P0001, message = code). */
export async function fails(promise, code) {
  await assert.rejects(promise, (err) => {
    assert.equal(err.message, code, `expected error "${code}", got "${err.message}" (${err.code})`)
    assert.equal(err.code, 'P0001')
    return true
  })
}

/** Assert that a promise fails with a Postgres SQLSTATE (for example 42501 = permission denied). */
export async function failsWith(promise, sqlstate) {
  await assert.rejects(promise, (err) => {
    assert.equal(err.code, sqlstate, `expected SQLSTATE ${sqlstate}, got ${err.code}: ${err.message}`)
    return true
  })
}

export async function rows(db, sql, params = []) {
  return (await db.query(sql, params)).rows
}

export async function count(db, sql, params = []) {
  return (await db.query(`select count(*)::int as n from (${sql}) q`, params)).rows[0].n
}

export async function notifications(u, type) {
  return rows(u.db, `select type, spot_id, request_id, read_at from public.notifications where type = $1`, [type])
}
