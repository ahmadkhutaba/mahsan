import { BadgeCheck, CalendarDays, Check, Languages, Star, TriangleAlert, X } from 'lucide-react'
import Avatar from '../../components/Avatar.jsx'
import { Button, Card, Screen } from '../../components/ui.jsx'
import { usePerson, useStore } from '../../state/store.jsx'

const Row = ({ icon: Icon, children }) => (
  <p className="flex items-center gap-3 py-2.5 text-base text-ink"><Icon size={20} className="shrink-0 text-pine-700" aria-hidden="true" /> {children}</p>
)

export default function JoinerProfile({ requestId }) {
  const { state, dispatch } = useStore()
  const person = usePerson()
  const request = state.requests.find((r) => r.id === requestId)
  const spot = state.spots.find((s) => s.id === request.spotId)
  const p = person(request.personId)
  const full = spot.openSpots <= 0
  const decide = (decision) => dispatch({ type: 'HOST_DECIDE', requestId, decision })

  let footer = null
  if (request.status === 'pending') {
    footer = (
      <>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" icon={X} onClick={() => decide('declined')}>Decline</Button>
          <Button variant="accent" icon={Check} disabled={full} onClick={() => decide('accepted')}>Accept</Button>
        </div>
        <p className="mt-2 text-center text-sm text-ink-soft">
          {full ? 'Your spot is full, so you can only decline.' : `If you decline, ${p.firstName} gets a kind note and no reason.`}
        </p>
      </>
    )
  }

  return (
    <Screen title={`${p.firstName} wants to join`} subtitle={`${spot.activity} · ${spot.startTime}`} footer={footer}>
      <div className="px-5 py-5">
        <div className="flex flex-col items-center text-center">
          <Avatar id={p.id} size={112} />
          <h2 className="mt-3 flex items-center gap-2 font-display text-[28px] font-semibold text-pine-950">
            {p.firstName} {p.verified && <BadgeCheck size={26} strokeWidth={2.4} className="text-pine-700" fill="#dcebe2" aria-hidden="true" />}
          </h2>
          {request.status !== 'pending' && (
            <span className={`mt-1 rounded-full px-3 py-1 text-sm font-semibold ${request.status === 'accepted' ? 'bg-pine-900 text-cream-50' : 'bg-cream-200 text-ink-soft'}`}>
              You {request.status} this request
            </span>
          )}
        </div>

        <div className={`mt-4 flex items-start gap-3 rounded-2xl p-3 text-[15px] ${p.verified ? 'bg-pine-50 text-ink' : 'bg-honey-100 text-honey-800'}`}>
          {p.verified ? <BadgeCheck size={20} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" /> : <TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />}
          <span>
            {p.verified ? <><b>Verified.</b> ID and selfie checked by Pull Up.</> : <><b>Not verified yet.</b> {p.firstName} has not finished the ID check.</>}
          </span>
        </div>

        {request.message ? (
          <div className="mt-5">
            <p className="mb-1 text-sm font-semibold text-ink-soft">Message to you</p>
            <p className="rounded-3xl rounded-bl-lg bg-white p-4 text-base leading-relaxed text-ink ring-1 ring-cream-200">{request.message}</p>
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-cream-100 p-3 text-[15px] text-ink-soft">{p.firstName} did not add a message.</p>
        )}

        <Card className="mt-5 divide-y divide-cream-200 py-1!">
          <Row icon={CalendarDays}>Age {p.ageRange}</Row>
          <Row icon={Languages}>Speaks {p.languages.join(', ')}</Row>
          <Row icon={Star}>
            {p.stats?.joined ? `Joined ${p.stats.joined} groups · rated ${p.stats.rating.toFixed(1)} by hosts` : 'New here, no ratings yet'}
          </Row>
        </Card>

        {p.bio && (
          <div className="mt-5">
            <p className="mb-1 text-sm font-semibold text-ink-soft">About {p.firstName}</p>
            <p className="text-base leading-relaxed text-ink">{p.bio}</p>
          </div>
        )}
      </div>
    </Screen>
  )
}
