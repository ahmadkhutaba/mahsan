import { BadgeCheck, Clock, MapPin } from 'lucide-react'
import { venuesById } from '../data/venues.js'
import { groupMix, km, openLabel, verifiedSummary } from '../state/helpers.js'
import { AvatarStack } from './Avatar.jsx'
import { TypeTile } from './ui.jsx'
import { usePerson } from '../state/store.jsx'

/** A spot in a list. `status` shows the tester's own relation to it, if any. */
export default function SpotCard({ spot, onClick, status, preview = false }) {
  const venue = venuesById[spot.venueId]
  const v = verifiedSummary(spot.memberIds, usePerson())
  const Wrapper = preview ? 'div' : 'button'

  const badge =
    status === 'accepted' ? (
      <span className="rounded-full bg-pine-900 px-3 py-1.5 text-sm font-semibold text-cream-50">You’re in</span>
    ) : status === 'pending' ? (
      <span className="rounded-full bg-cream-200 px-3 py-1.5 text-sm font-semibold text-ink">Requested</span>
    ) : status === 'declined' ? (
      <span className="rounded-full bg-cream-200 px-3 py-1.5 text-sm font-semibold text-ink-soft">Not this time</span>
    ) : status === 'mine' ? (
      <span className="rounded-full bg-pine-100 px-3 py-1.5 text-sm font-semibold text-pine-900">Your spot</span>
    ) : (
      <span
        className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
          spot.openSpots > 0 ? 'bg-honey-400 text-pine-950' : 'bg-cream-200 text-ink-soft'
        }`}
      >
        {openLabel(spot.openSpots)}
      </span>
    )

  return (
    <Wrapper
      {...(preview ? {} : { type: 'button', onClick })}
      className="block w-full rounded-3xl border border-cream-200 bg-white p-4 text-left shadow-[0_1px_2px_rgba(28,43,36,0.05)] transition-transform active:scale-[0.985]"
    >
      <div className="flex items-start gap-3">
        <TypeTile type={spot.type} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[19px] font-semibold leading-snug text-pine-950">
            {spot.activity || 'Your activity'}
          </h3>
          <p className="mt-0.5 truncate text-[15px] text-ink-soft">
            {venue ? `${venue.name} · ${venue.neighborhood}` : 'Pick a venue'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] font-medium text-ink">
        <span className="flex items-center gap-1.5">
          <Clock size={17} className="text-pine-700" aria-hidden="true" />
          {spot.startTime || '--:--'}
        </span>
        {venue && (
          <span className="flex items-center gap-1.5">
            <MapPin size={17} className="text-pine-700" aria-hidden="true" />
            {km(venue.distanceKm)}
          </span>
        )}
        <span className="ml-auto">{badge}</span>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-cream-200 pt-3">
        <AvatarStack ids={spot.memberIds} size={34} max={3} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug text-ink">
            <span className="font-semibold">{spot.memberIds.length} people</span>
            <span className="text-ink-soft"> · {groupMix(spot.memberIds)}</span>
          </p>
          <p className={`flex items-center gap-1 text-sm font-semibold ${v.all ? 'text-pine-700' : 'text-ink-soft'}`}>
            <BadgeCheck size={16} strokeWidth={2.3} aria-hidden="true" />
            {v.label}
          </p>
        </div>
      </div>
    </Wrapper>
  )
}
