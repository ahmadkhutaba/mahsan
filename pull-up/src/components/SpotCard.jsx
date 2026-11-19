import { Clock, MapPin } from 'lucide-react'
import { venuesById } from '../data/venues.js'
import { useT } from '../i18n/index.jsx'
import { groupMix } from '../state/helpers.js'
import { AvatarStack } from './Avatar.jsx'
import { TypeTile, useMixText, useOpenLabel } from './ui.jsx'

/** A spot in a list. `status` shows the viewer's own relation to it, if any. */
export default function SpotCard({ spot, onClick, status, preview = false }) {
  const { t, list, formatDistance } = useT()
  const mixText = useMixText()
  const openLabel = useOpenLabel()
  const venue = venuesById[spot.venueId]
  const Wrapper = preview ? 'div' : 'button'

  const pill = 'rounded-full px-3 py-1.5 text-sm font-semibold'
  const badge =
    status === 'accepted' ? (
      <span className={`${pill} bg-pine-900 text-cream-50`}>{t('spot.youreIn')}</span>
    ) : status === 'pending' ? (
      <span className={`${pill} bg-cream-200 text-ink`}>{t('spot.requested')}</span>
    ) : status === 'declined' ? (
      <span className={`${pill} bg-cream-200 text-ink-soft`}>{t('spot.notThisTime')}</span>
    ) : status === 'mine' ? (
      <span className={`${pill} bg-pine-100 text-pine-900`}>{t('spot.yourSpot')}</span>
    ) : (
      <span className={`${pill} ${spot.openSpots > 0 ? 'bg-honey-400 text-pine-950' : 'bg-cream-200 text-ink-soft'}`}>
        {openLabel(spot.openSpots)}
      </span>
    )

  return (
    <Wrapper
      {...(preview ? {} : { type: 'button', onClick })}
      className="block w-full rounded-3xl border border-cream-200 bg-white p-4 text-start shadow-[0_1px_2px_rgba(28,43,36,0.05)] transition-transform active:scale-[0.985]"
    >
      <div className="flex items-start gap-3">
        <TypeTile type={spot.type} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[19px] font-semibold leading-snug text-pine-950"><bdi>{spot.activity || t('spot.yourActivity')}</bdi></h3>
          <p className="mt-0.5 truncate text-[15px] text-ink-soft"><bdi>{venue ? list([venue.name, venue.neighborhood]) : t('spot.pickVenue')}</bdi></p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] font-medium text-ink">
        <span className="flex items-center gap-1.5">
          <Clock size={17} className="text-pine-700" aria-hidden="true" />
          <bdi>{spot.startTime || '--:--'}</bdi>
        </span>
        {venue && (
          <span className="flex items-center gap-1.5">
            <MapPin size={17} className="text-pine-700" aria-hidden="true" />
            {formatDistance(venue.distanceKm)}
          </span>
        )}
        <span className="ms-auto">{badge}</span>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-cream-200 pt-3">
        <AvatarStack ids={spot.memberIds} size={34} max={3} />
        <p className="min-w-0 flex-1 text-[15px] leading-snug text-ink">
          <span className="font-semibold">{t('spot.people', { count: spot.memberIds.length })}</span>
          <span className="text-ink-soft"> · {mixText(groupMix(spot.memberIds))}</span>
        </p>
      </div>
    </Wrapper>
  )
}
