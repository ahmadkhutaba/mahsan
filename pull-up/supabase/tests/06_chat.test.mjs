import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, beforeEach, test } from 'node:test'
import {
  accept, admin, closeAll, fails, joined, moveSpot, notifications, requestJoin, reset, rows, rpc, session, user,
} from './helpers.mjs'

beforeEach(reset)
after(closeAll)

const send = (u, spotId, body, clientId = randomUUID()) =>
  rpc(u.db ?? u, 'send_message', { p_spot_id: spotId, p_body: body, p_client_id: clientId })
const read = async (u, spotId) =>
  (await rows(u.db, `select body from public.messages where spot_id = $1 order by created_at, id`, [spotId])).map((m) => m.body)

test('only the host and current members can read or send; pending, declined and strangers cannot', async () => {
  const host = await user('Host')
  const member = await user('Member')
  const pending = await user('Pending')
  const declined = await user('Declined')
  const stranger = await user('Stranger')
  const { spotId } = await joined(host, member, { p_places: 3 })
  await requestJoin(pending, spotId)
  await rpc(host.db, 'decide_request', { p_request_id: await requestJoin(declined, spotId), p_accept: false })

  await send(host, spotId, 'Welcome!')
  await send(member, spotId, 'Thanks, see you there')

  assert.deepEqual(await read(host, spotId), ['Welcome!', 'Thanks, see you there'])
  assert.deepEqual(await read(member, spotId), ['Welcome!', 'Thanks, see you there'])
  for (const who of [pending, declined, stranger]) {
    assert.deepEqual(await read(who, spotId), [])
    await fails(send(who, spotId, 'let me in'), 'not_member')
  }
  assert.equal((await rows(admin, `select 1 from public.messages`)).length, 2)
})

test('a retried send with the same client id stores one message; ids cannot be reused elsewhere', async () => {
  const host = await user('Host')
  const member = await user('Member')
  const { spotId } = await joined(host, member)
  const other = await joined(host, member)
  const clientId = randomUUID()
  const [first] = await send(member, spotId, 'On my way', clientId)
  const [again] = await send(member, spotId, 'On my way', clientId)
  assert.equal(again.id, first.id)
  // two devices sending the same pending message at the same moment
  const second = await session(member.id)
  const cid = randomUUID()
  const both = await Promise.all([send(member, spotId, 'Here', cid), send(second, spotId, 'Here', cid)])
  assert.equal(both[0][0].id, both[1][0].id)
  assert.deepEqual(await read(host, spotId), ['On my way', 'Here'])
  await fails(send(member, other.spotId, 'On my way', clientId), 'invalid_message')
})

test('message text is validated and cleaned', async () => {
  const host = await user('Host')
  const member = await user('Member')
  const { spotId } = await joined(host, member)
  await fails(send(member, spotId, '   '), 'invalid_message')
  await fails(send(member, spotId, 'x'.repeat(1001)), 'invalid_message')
  await fails(send(member, spotId, 'ok', null), 'invalid_message')
  await send(member, spotId, '  שלום ‮world‬\nline two  ')
  assert.deepEqual(await read(host, spotId), ['שלום world\nline two'])
})

test('catching up after a dropped connection returns exactly the missed messages', async () => {
  const host = await user('Host')
  const member = await user('Member')
  const { spotId } = await joined(host, member)
  await send(host, spotId, 'one')
  // The cursor is kept as text, exactly as the API returns it. A JavaScript Date would
  // drop the microseconds and the comparison would be wrong.
  const [last] = await rows(member.db, `select id, created_at::text as at from public.messages where spot_id = $1 order by created_at desc, id desc limit 1`, [spotId])
  await send(host, spotId, 'two')
  await send(host, spotId, 'three')
  // The app re-reads from the last message it has (inclusive) and merges by id, so a
  // message that shares a timestamp with the cursor can never be skipped or doubled.
  const again = await rows(member.db, `
    select id, body from public.messages
    where spot_id = $1 and created_at >= $2::timestamptz order by created_at, id`, [spotId, last.at])
  assert.deepEqual(again.map((m) => m.body), ['one', 'two', 'three'])
  const merged = new Map([[last.id, 'one'], ...again.map((m) => [m.id, m.body])])
  assert.deepEqual([...merged.values()], ['one', 'two', 'three'])
})

test('new messages make one unread notification per chat, not one per message', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const b = await user('Bella')
  const { spotId } = await joined(host, a, { p_places: 2 })
  await accept(host, await requestJoin(b, spotId))
  for (let i = 0; i < 4; i++) await send(a, spotId, `message ${i}`)
  assert.equal((await notifications(host, 'new_message')).length, 1)
  assert.equal((await notifications(b, 'new_message')).length, 1)
  assert.equal((await notifications(a, 'new_message')).length, 0, 'the sender is not notified')
  await rpc(host.db, 'mark_chat_read', { p_spot_id: spotId })
  await send(a, spotId, 'after reading')
  const all = await notifications(host, 'new_message')
  assert.equal(all.length, 2)
  assert.equal(all.filter((n) => n.read_at === null).length, 1)
  // marking read only ever touches your own notifications
  await rpc(a.db, 'mark_all_notifications_read')
  assert.equal((await notifications(b, 'new_message'))[0].read_at, null)
})

test('leaving or being removed ends chat access at once, on a connection that was already open', async () => {
  const host = await user('Host')
  const a = await user('Avi')
  const b = await user('Bella')
  const { spotId } = await joined(host, a, { p_places: 2 })
  await accept(host, await requestJoin(b, spotId))
  await send(host, spotId, 'hello both')
  assert.equal((await read(a, spotId)).length, 1)

  await rpc(a.db, 'leave_spot', { p_spot_id: spotId })
  assert.deepEqual(await read(a, spotId), [])
  await fails(send(a, spotId, 'still here?'), 'not_member')

  await rpc(host.db, 'remove_member', { p_spot_id: spotId, p_user_id: b.id })
  assert.deepEqual(await read(b, spotId), [])
  await fails(send(b, spotId, 'hey'), 'not_member')
  assert.equal((await notifications(b, 'new_message')).length, 0)
})

test('sending is limited to 30 messages a minute and closes 12 hours after the plan ends', async () => {
  const host = await user('Host')
  const member = await user('Member')
  const { spotId } = await joined(host, member)
  for (let i = 0; i < 30; i++) await send(member, spotId, `m${i}`)
  await fails(send(member, spotId, 'one too many'), 'slow_down')
  await send(host, spotId, 'the limit is per person')

  await admin.query(`update public.messages set created_at = created_at - interval '2 hours'`)
  await moveSpot(spotId, -600, -60)
  await send(member, spotId, 'thanks for tonight') // still open shortly after the end
  await moveSpot(spotId, -24 * 60, -13 * 60)
  await fails(send(member, spotId, 'too late'), 'chat_closed')
  assert.equal((await read(member, spotId)).length, 32, 'the history stays readable')
})
