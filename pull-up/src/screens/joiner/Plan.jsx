import { Check, ChevronRight, Clock, DoorOpen, FastForward, Flag, HeartHandshake, MapPin, MessageCircle, Navigation, PartyPopper, ShieldCheck, Star, ThumbsDown } from 'lucide-react'
import Avatar, { AvatarStack } from '../../components/Avatar.jsx'
import SpotCard from '../../components/SpotCard.jsx'
import { Button, Card, DemoControl, Screen, SectionTitle } from '../../components/ui.jsx'
import { ME } from '../../data/people.js'
import { venuesById } from '../../data/venues.js'
import { useT } from '../../i18n/index.jsx'
import { EMPTY_FILTERS, myRequestFor, visibleSpots } from '../../state/helpers.js'
import { usePerson, useStore } from '../../state/store.jsx'

function Summary({ spot, venue }) {
  const { t, list, formatDistance } = useT()
  return (
    <Card>
      <p className="font-display text-lg font-semibold text-pine-950"><bdi>{spot.activity}</bdi></p>
      <p className="text-[15px] text-ink-soft"><bdi>{list([venue.name, venue.address])}</bdi></p>
      <div className="mt-2 flex gap-4 text-[15px] font-semibold text-ink">
        <span className="flex items-center gap-1.5"><Clock size={17} className="text-pine-700" aria-hidden="true" /> {t('spot.tonightAt', { time: spot.startTime })}</span>
        <span className="flex items-center gap-1.5"><MapPin size={17} className="text-pine-700" aria-hidden="true" /> {formatDistance(venue.distanceKm)}</span>
      </div>
    </Card>
  )
}

function Waiting({ request, spot, venue, host }) {
  const { dispatch } = useStore()
  const { t } = useT()
  return (
    <div className="px-5 py-6">
      <div className="flex flex-col items-center text-center">
        <span className="relative flex h-28 w-28 items-center justify-center">
          <span className="anim-ring absolute h-24 w-24 rounded-full bg-honey-400" />
          <Avatar id={spot.hostId} size={96} className="relative" />
        </span>
        <h2 className="mt-4 font-display text-[26px] font-semibold leading-tight text-pine-950" role="status">
          {t('plan.waitingFor', { name: host.firstName })}
        </h2>
        <p className="mt-2 max-w-[280px] text-base text-ink-soft">{t('plan.waitingText')}</p>
      </div>

      {request.message && (
        <div className="mt-6">
          <p className="mb-1 text-sm font-semibold text-ink-soft">{t('plan.yourMessage')}</p>
          <p className="rounded-2xl rounded-ee-md bg-pine-100 p-3 text-base text-ink"><bdi>{request.message}</bdi></p>
        </div>
      )}

      <div className="mt-5"><Summary spot={spot} venue={venue} /></div>

      <div className="mt-6 space-y-2">
        <Button variant="outline" onClick={() => dispatch({ type: 'HOME', tab: 'home' })}>{t('plan.keepBrowsing')}</Button>
        <Button variant="ghost" className="text-clay-700!" onClick={() => dispatch({ type: 'CANCEL_REQUEST', requestId: request.id })}>
          {t('plan.cancelRequest')}
        </Button>
        <DemoControl icon={ThumbsDown} onClick={() => dispatch({ type: 'RESOLVE_MINE', requestId: request.id, decline: true })}>
          {t('plan.demoDecline')}
        </DemoControl>
      </div>
    </div>
  )
}

function Accepted({ request, spot, venue, host }) {
  const { dispatch } = useStore()
  const { t, formatDistance } = useT()
  const person = usePerson()
  const lastMessages = spot.chat.filter((m) => !m.system).slice(-2)
  const safety = (mode) => dispatch({ type: 'SHEET', sheet: { name: 'safety', mode, spotId: spot.id, requestId: request.id } })

  return (
    <div>
      <div className="glow rounded-b-[28px] px-5 pb-6 pt-2 text-center text-cream-50">
        <span className="anim-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-honey-400 text-pine-950">
          <PartyPopper size={28} aria-hidden="true" />
        </span>
        <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight" role="status">{t('plan.inTitle')}</h2>
        <p className="mt-1 text-base text-pine-200">{t('plan.inText', { name: host.firstName })}</p>
        <div className="mt-4 flex justify-center"><AvatarStack ids={[...spot.memberIds, ME]} size={46} max={6} /></div>
      </div>

      <div className="space-y-4 px-5 py-5">
        <section className="rounded-3xl bg-honey-100 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-honey-800">
            <Navigation size={16} aria-hidden="true" /> {t('plan.findUs')}
          </h3>
          <p className="mt-1 font-display text-[21px] font-semibold leading-snug text-pine-950"><bdi>{spot.findUsHint || t('plan.findUsFallback', { name: host.firstName })}</bdi></p>
        </section>

        <Card>
          <p className="font-display text-lg font-semibold text-pine-950"><bdi>{spot.activity}</bdi></p>
          <p className="mt-1 flex items-center gap-2 text-base text-ink"><Clock size={18} className="text-pine-700" aria-hidden="true" /> {t('plan.tonightAt', { time: spot.startTime })}</p>
          <p className="mt-1 flex items-start gap-2 text-base text-ink"><MapPin size={18} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" /> <span><bdi>{venue.name}, {venue.address}, {venue.neighborhood}</bdi></span></p>
          <Button variant="soft" className="mt-3" icon={Navigation} onClick={() => dispatch({ type: 'TOAST', key: 'plan.directionsToast' })}>
            {t('plan.directions', { d: formatDistance(venue.distanceKm) })}
          </Button>
        </Card>

        <section>
          <SectionTitle>{t('plan.chat')}</SectionTitle>
          <button
            type="button"
            onClick={() => dispatch({ type: 'PUSH', screen: { name: 'chat', spotId: spot.id, requestId: request.id } })}
            className="mt-2 block w-full rounded-3xl border border-cream-200 bg-white p-4 text-start active:bg-cream-100"
          >
            <ul className="space-y-3">
              {lastMessages.map((m, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Avatar id={m.fromId} size={32} />
                  <p className="min-w-0 text-[15px] leading-snug text-ink">
                    <span className="font-semibold"><bdi>{m.fromId === ME ? t('common.you') : person(m.fromId).firstName}</bdi></span>{' '}
                    <bdi className="text-ink-soft">{m.time}</bdi>
                    <span className="block"><bdi>{m.text}</bdi></span>
                  </p>
                </li>
              ))}
            </ul>
            <span className="mt-3 flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-pine-900 text-base font-semibold text-cream-50">
              <MessageCircle size={19} aria-hidden="true" /> {t('plan.openChat')}
            </span>
          </button>
        </section>

        <section className="rounded-3xl bg-pine-50 p-4" aria-labelledby="plan-safety">
          <h3 id="plan-safety" className="flex items-center gap-2 font-display text-xl font-semibold text-pine-950">
            <ShieldCheck size={22} className="shrink-0 text-pine-700" aria-hidden="true" /> {t('plan.changedMind')}
          </h3>
          <p className="mt-1 text-[15px] text-ink">{t('plan.changedMindText')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => safety('leave')} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-2 text-base font-semibold text-pine-900 ring-2 ring-pine-900 active:bg-pine-100">
              <DoorOpen size={19} aria-hidden="true" /> {t('plan.leave')}
            </button>
            <button type="button" onClick={() => safety('report')} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-2 text-base font-semibold text-clay-700 ring-2 ring-clay-600 active:bg-clay-50">
              <Flag size={19} aria-hidden="true" /> {t('plan.report')}
            </button>
          </div>
        </section>

        <DemoControl icon={FastForward} onClick={() => dispatch({ type: 'END_EVENT', requestId: request.id })}>
          {t('plan.demoSkip')}
        </DemoControl>
      </div>
    </div>
  )
}

function Declined({ spot, host }) {
  const { state, dispatch } = useStore()
  const { t } = useT()
  const venue = venuesById[spot.venueId]
  const others = visibleSpots(state.spots, venue.city, EMPTY_FILTERS)
    .filter((s) => s.id !== spot.id && s.hostId !== ME && s.openSpots > 0 && !myRequestFor(state.requests, s.id))
    .sort((a, b) => (b.type === spot.type) - (a.type === spot.type))
    .slice(0, 2)

  return (
    <div className="px-5 py-6">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-honey-100 text-honey-800">
          <HeartHandshake size={32} aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-display text-[26px] font-semibold leading-tight text-pine-950" role="status">{t('plan.declinedTitle')}</h2>
        <p className="mt-2 max-w-[300px] text-base text-ink-soft">{t('plan.declinedText', { name: host.firstName })}</p>
      </div>

      {others.length > 0 && (
        <section className="mt-7">
          <SectionTitle>{t('plan.stillOpen')}</SectionTitle>
          <ul className="mt-3 space-y-3">
            {others.map((s) => (
              <li key={s.id}>
                <SpotCard spot={s} onClick={() => dispatch({ type: 'REPLACE', screen: { name: 'spot', spotId: s.id } })} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 space-y-2">
        <Button onClick={() => dispatch({ type: 'HOME', tab: 'home' })}>{t('plan.seeAll')}</Button>
        <Button variant="ghost" onClick={() => dispatch({ type: 'START_HOSTING', spotType: spot.type })}>{t('plan.openOwn')}</Button>
      </div>
    </div>
  )
}

function Closed({ icon: Icon, title, text, action }) {
  const { dispatch } = useStore()
  const { t } = useT()
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pine-100 text-pine-800"><Icon size={30} aria-hidden="true" /></span>
      <h2 className="mt-4 font-display text-2xl font-semibold text-pine-950">{title}</h2>
      <p className="mt-2 text-base text-ink-soft">{text}</p>
      {action}
      <Button variant={action ? 'ghost' : 'primary'} className="mt-3" onClick={() => dispatch({ type: 'HOME', tab: 'home' })}>
        {t('plan.backToSpots')}
      </Button>
    </div>
  )
}

export default function Plan({ requestId }) {
  const { state, dispatch } = useStore()
  const { t } = useT()
  const person = usePerson()
  const request = state.requests.find((r) => r.id === requestId)
  const spot = state.spots.find((s) => s.id === request.spotId)
  const venue = venuesById[spot.venueId]
  const host = person(spot.hostId)
  const props = { request, spot, venue, host }
  const name = host.firstName

  return (
    <Screen title={t(`plan.t_${request.status}`)} subtitle={request.status === 'accepted' ? undefined : spot.activity}>
      {request.status === 'pending' && <Waiting {...props} />}
      {request.status === 'accepted' && <Accepted {...props} />}
      {request.status === 'declined' && <Declined {...props} />}
      {request.status === 'attended' && (
        <Closed
          icon={Star}
          title={t('plan.overTitle')}
          text={t('plan.overText', { name })}
          action={
            <Button variant="accent" className="mt-6" icon={ChevronRight} flipIcon onClick={() => dispatch({ type: 'REPLACE', screen: { name: 'rating', requestId } })}>
              {t('plan.rate')}
            </Button>
          }
        />
      )}
      {request.status === 'rated' && <Closed icon={Check} title={t('plan.ratedTitle')} text={t('plan.ratedText')} />}
      {request.status === 'cancelled' && <Closed icon={Check} title={t('plan.cancelledTitle')} text={t('plan.cancelledText', { name })} />}
      {request.status === 'left' && <Closed icon={DoorOpen} title={t('plan.leftTitle')} text={t('plan.leftText')} />}
    </Screen>
  )
}
