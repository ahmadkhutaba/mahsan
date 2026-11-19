import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, beforeEach, test } from 'node:test'
import {
  accept, admin, closeAll, createSpot, fails, failsWith, joined, moveSpot, notifications, requestJoin, reset, rows,
  rpc, user,
} from './helpers.mjs'

beforeEach(reset)
after(closeAll)

const report = (who, args) =>
  rpc(who.db, 'submit_report', { p_spot_id: null, p_reported_user_id: null, p_reason: 'made_uncomfortable', p_details: 'details', ...args })

test('reports are private: not readable by the reporter, the reported person, or anyone else', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const stranger = await user('Stranger')
  const { spotId } = await joined(host, joiner)
  await report(joiner, { p_spot_id: spotId, p_reported_user_id: host.id, p_details: '  He kept insisting.  ' })

  for (const who of [joiner, host, stranger]) {
    assert.equal((await rows(who.db, `select * from public.reports`)).length, 0)
    await failsWith(who.db.query(`delete from public.reports`), '42501')
  }
  assert.equal((await rows(host.db, `select 1 from public.notifications where type not in ('request_received')`)).length, 0, 'the reported person is told nothing')
  // a non-admin "update" is allowed by the grant but matches no rows
  assert.equal((await host.db.query(`update public.reports set status = 'closed'`)).rowCount, 0)

  const [stored] = await rows(admin, `select reporter_id, reported_user_id, spot_id, reason, details, status from public.reports`)
  assert.deepEqual(stored, {
    reporter_id: joiner.id, reported_user_id: host.id, spot_id: spotId, reason: 'made_uncomfortable',
    details: 'He kept insisting.', status: 'open',
  })
})

test('an admin can read and update reports through the restricted path', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const adminUser = await user('Admin')
  await admin.query(`insert into public.admins (user_id) values ($1)`, [adminUser.id])
  const spotId = await createSpot(host)
  await report(joiner, { p_spot_id: spotId })
  assert.equal((await rows(adminUser.db, `select * from public.reports`)).length, 1)
  assert.equal((await adminUser.db.query(`update public.reports set status = 'reviewing', admin_note = 'looking'`)).rowCount, 1)
  await failsWith(adminUser.db.query(`update public.reports set details = 'edited'`), '42501')
  assert.equal((await rows(adminUser.db, `select * from public.admins`).catch((e) => e.code)), '42501')
})

test('reporting stays possible after leaving and after blocking, and is validated and limited', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const { spotId } = await joined(host, joiner)
  await rpc(joiner.db, 'leave_spot', { p_spot_id: spotId })
  await rpc(joiner.db, 'block_user', { p_user_id: host.id })
  await report(joiner, { p_spot_id: spotId, p_reported_user_id: host.id })

  await fails(report(joiner, {}), 'invalid_report')
  await fails(report(joiner, { p_reported_user_id: joiner.id }), 'invalid_report')
  await fails(report(joiner, { p_spot_id: randomUUID() }), 'invalid_report')
  await fails(report(joiner, { p_reported_user_id: randomUUID() }), 'invalid_report')
  await failsWith(report(joiner, { p_spot_id: spotId, p_reason: 'because' }), '23514')
  for (let i = 0; i < 9; i++) await report(joiner, { p_spot_id: spotId })
  await fails(report(joiner, { p_spot_id: spotId }), 'daily_limit')
  assert.equal((await rows(admin, `select 1 from public.reports`)).length, 10)
})

test('old reports and old notifications are removed by the scheduled clean-up', async () => {
  const host = await user('Host')
  const joiner = await user('Joiner')
  const spotId = await createSpot(host)
  await report(joiner, { p_spot_id: spotId })
  await report(joiner, { p_spot_id: spotId })
  await requestJoin(joiner, spotId)
  await admin.query(`update public.reports set created_at = now() - interval '13 months' where id = (select id from public.reports limit 1)`)
  await admin.query(`update public.notifications set created_at = now() - interval '61 days'`)
  await admin.query(`select private.run_maintenance()`)
  assert.equal((await rows(admin, `select 1 from public.reports`)).length, 1)
  assert.equal((await rows(admin, `select 1 from public.notifications`)).length, 0)
})

test('the clean-up job is scheduled every 5 minutes', async () => {
  const jobs = await rows(admin, `select schedule, command, active from cron.job where jobname = 'pull-up-maintenance'`)
  assert.deepEqual(jobs, [{ schedule: '*/5 * * * *', command: 'select private.run_maintenance()', active: true }])
})

test('deleting an account as a host: plans cancelled, people told, personal text erased, sign-in gone', async () => {
  const host = await user('Host', { p_gender: 'man' })
  const member = await user('Member')
  const waiting = await user('Waiting')
  const { spotId } = await joined(host, member, { p_places: 2 })
  await requestJoin(waiting, spotId, 'can I come?')
  await rpc(host.db, 'send_message', { p_spot_id: spotId, p_body: 'my phone is 050-0000000', p_client_id: randomUUID() })
  await rpc(member.db, 'send_message', { p_spot_id: spotId, p_body: 'ok', p_client_id: randomUUID() })
  const past = await joined(host, member)
  await moveSpot(past.spotId, -300, -10)
  await rpc(member.db, 'submit_rating', { p_spot_id: past.spotId, p_ratee_id: host.id, p_stars: 5, p_felt_safe: 'yes', p_matched_description: 'yes', p_tags: [] })
  await rpc(host.db, 'submit_rating', { p_spot_id: past.spotId, p_ratee_id: member.id, p_stars: 4, p_felt_safe: null, p_matched_description: null, p_tags: [] })
  await rpc(member.db, 'submit_report', { p_spot_id: spotId, p_reported_user_id: host.id, p_reason: 'other', p_details: 'x' })

  await rpc(host.db, 'delete_account')

  // sign-in and private data are gone
  assert.equal((await rows(admin, `select 1 from auth.users where id = $1`, [host.id])).length, 0)
  assert.equal((await rows(admin, `select 1 from public.account_private where user_id = $1`, [host.id])).length, 0)
  const [p] = await rows(admin, `select first_name, avatar, age_range, languages, onboarded_at, deleted_at is not null as deleted from public.profiles where id = $1`, [host.id])
  assert.deepEqual(p, { first_name: '', avatar: {}, age_range: null, languages: [], onboarded_at: null, deleted: true })
  // plans cancelled and people told
  const [s] = await rows(admin, `select cancelled_at is not null as cancelled, host_note from public.spots where id = $1`, [spotId])
  assert.deepEqual(s, { cancelled: true, host_note: '' })
  assert.equal((await notifications(member, 'spot_cancelled')).length, 1)
  assert.equal((await notifications(waiting, 'spot_cancelled')).length, 1)
  assert.equal((await rows(admin, `select status from public.join_requests where requester_id = $1`, [waiting.id]))[0].status, 'expired')
  // text erased
  assert.deepEqual(await rows(admin, `select body, deleted_at is not null as deleted from public.messages where sender_id = $1`, [host.id]), [{ body: '', deleted: true }])
  assert.equal((await rows(admin, `select find_us_hint from public.spot_private where spot_id = $1`, [spotId]))[0].find_us_hint, '')
  // ratings about them are gone; the rating they gave still counts for the other person; reports are kept
  assert.equal((await rows(admin, `select 1 from public.ratings where ratee_id = $1`, [host.id])).length, 0)
  assert.equal((await rows(admin, `select 1 from public.ratings where rater_id = $1`, [host.id])).length, 1)
  assert.equal((await rows(admin, `select 1 from public.reports where reported_user_id = $1`, [host.id])).length, 1)
  // the old session, still holding a valid-looking token, can no longer read or act
  assert.equal((await rows(host.db, `select 1 from public.spots`)).length, 0)
  assert.equal((await rows(host.db, `select 1 from public.messages`)).length, 0)
  assert.equal((await rows(host.db, `select 1 from public.notifications`)).length, 0)
  await fails(createSpot(host), 'not_onboarded')
  await fails(rpc(host.db, 'send_message', { p_spot_id: spotId, p_body: 'hi', p_client_id: randomUUID() }), 'not_onboarded')
  // others no longer get a profile or trust data for them
  assert.deepEqual(await rpc(member.db, 'trust_summaries', { p_user_ids: [host.id] }), [])
  assert.deepEqual(await rpc(member.db, 'rating_tasks'), [])
})

test('deleting an account as a member: places reopen, waiting requests end, others keep their plan', async () => {
  const host = await user('Host')
  const leaver = await user('Leaver')
  const other = await user('Other')
  const { spotId } = await joined(host, leaver, { p_places: 2 })
  await accept(host, await requestJoin(other, spotId))
  const second = await createSpot(host)
  const pendingId = await requestJoin(leaver, second, 'please')
  await rpc(leaver.db, 'send_message', { p_spot_id: spotId, p_body: 'hello', p_client_id: randomUUID() })
  await rpc(leaver.db, 'block_user', { p_user_id: other.id })

  await rpc(leaver.db, 'delete_account')

  assert.equal((await rows(admin, `select status from public.memberships where user_id = $1`, [leaver.id]))[0].status, 'left')
  assert.deepEqual(await rows(admin, `select status, message from public.join_requests where id = $1`, [pendingId]), [{ status: 'withdrawn', message: '' }])
  assert.equal((await notifications(host, 'place_opened')).length, 1)
  assert.equal((await notifications(host, 'request_received')).length, 0)
  assert.equal((await rows(admin, `select 1 from public.blocks`)).length, 0)
  const [sum] = await rpc(host.db, 'spot_summaries', { p_spot_ids: [spotId] })
  assert.equal(sum.joined, 1)
  // the chat keeps its shape: the message is still there, without its text
  assert.deepEqual((await rows(other.db, `select body from public.messages where spot_id = $1`, [spotId])).map((m) => m.body), [''])
  assert.equal((await rows(admin, `select cancelled_at from public.spots where id = $1`, [spotId]))[0].cancelled_at, null)
  // deleting twice, or with no profile at all, does not break
  await rpc(leaver.db, 'delete_account')
})
