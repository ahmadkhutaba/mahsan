import { ChevronRight, Inbox } from 'lucide-react'
import Avatar from '../../components/Avatar.jsx'
import { TabHeader } from '../Profile.jsx'
import { VerifiedMark } from '../../components/ui.jsx'
import { ME } from '../../data/people.js'
import { openLabel } from '../../state/helpers.js'
import { usePerson, useStore } from '../../state/store.jsx'

export default function Requests() {
  const { state, dispatch } = useStore()
  const person = usePerson()
  const spots = state.spots.filter((s) => s.hostId === ME)
  const total = state.requests.filter((r) => spots.some((s) => s.id === r.spotId)).length

  return (
    <div className="flex h-full flex-col">
      <TabHeader title="Requests" subtitle="People asking to join your group" />
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {total === 0 && (
          <div className="mt-10 flex flex-col items-center px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-honey-100 text-honey-800"><Inbox size={30} aria-hidden="true" /></span>
            <h2 className="mt-4 font-display text-xl font-semibold text-pine-950">No requests yet</h2>
            <p className="mt-1 text-base text-ink-soft">When someone asks to join, you’ll see their profile here.</p>
          </div>
        )}
        {spots.map((spot) => {
          const reqs = state.requests.filter((r) => r.spotId === spot.id)
          if (reqs.length === 0) return null
          return (
            <section key={spot.id} className="mb-6">
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="font-display text-lg font-semibold text-pine-950">{spot.activity}</h2>
                <span className="text-sm font-semibold text-ink-soft">{spot.startTime} · {openLabel(spot.openSpots)}</span>
              </div>
              <ul className="space-y-2">
                {reqs.map((r) => {
                  const p = person(r.personId)
                  const decided = r.status !== 'pending'
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'PUSH', screen: { name: 'joiner', requestId: r.id } })}
                        className={`flex w-full items-center gap-3 rounded-3xl border border-cream-200 bg-white p-3 text-left active:bg-cream-100 ${decided ? 'opacity-75' : ''}`}
                      >
                        <Avatar id={p.id} size={56} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-lg font-semibold text-ink">{p.firstName} <VerifiedMark verified={p.verified} /></span>
                          <span className="block text-sm text-ink-soft">{p.ageRange} · {p.verified ? 'Verified' : 'Not verified'} · {r.sentAt}</span>
                          <span className="block truncate text-[15px] text-ink">{r.message ? `“${r.message}”` : 'No message'}</span>
                        </span>
                        {decided ? (
                          <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${r.status === 'accepted' ? 'bg-pine-900 text-cream-50' : 'bg-cream-200 text-ink-soft'}`}>
                            {r.status === 'accepted' ? 'Accepted' : 'Declined'}
                          </span>
                        ) : (
                          <ChevronRight size={22} className="shrink-0 text-ink-soft" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </main>
    </div>
  )
}
