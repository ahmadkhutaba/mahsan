import { CalendarDays, Clock, DoorOpen, Flag, Languages, MapPin, ShieldCheck, Store, UserCheck, Users } from 'lucide-react'
import Avatar from '../../components/Avatar.jsx'
import { BackButton, Button, Card, SAFE_TOP, Screen, SectionTitle, Tag, TYPE_ICONS, useMixText, useOpenLabel } from '../../components/ui.jsx'
import { ME } from '../../data/people.js'
import { venuesById } from '../../data/venues.js'
import { useT } from '../../i18n/index.jsx'
import { groupLanguages, groupMix, myRequestFor } from '../../state/helpers.js'
import { usePerson, useStore } from '../../state/store.jsx'

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-50 text-pine-800">
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-ink-soft">{label}</p>
        <p className="text-base font-semibold text-ink">{children}</p>
      </div>
    </div>
  )
}

function SafetyPoint({ icon: Icon, title, children }) {
  return (
    <li className="flex gap-3">
      <Icon size={20} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" />
      <span><b>{title}</b> {children}</span>
    </li>
  )
}

export default function SpotDetails({ spotId }) {
  const { state, dispatch } = useStore()
  const { t, list, formatDistance } = useT()
  const mixText = useMixText()
  const openLabel = useOpenLabel()
  const person = usePerson()
  const spot = state.spots.find((s) => s.id === spotId)
  const venue = venuesById[spot.venueId]
  const host = person(spot.hostId)
  const mine = spot.hostId === ME
  const request = myRequestFor(state.requests, spot.id)
  const langs = groupLanguages(spot.memberIds)
  const TypeIcon = TYPE_ICONS[spot.type]

  const openPlan = () => dispatch({ type: 'PUSH', screen: { name: 'plan', requestId: request.id } })

  let footer
  if (mine) {
    footer = (
      <Button variant="outline" onClick={() => dispatch({ type: 'ROLE', role: 'host', tab: 'requests' })}>
        {t('spot.manage')}
      </Button>
    )
  } else if (request?.status === 'pending') {
    footer = <Button variant="soft" onClick={openPlan}>{t('spot.seeStatus')}</Button>
  } else if (request?.status === 'accepted' || request?.status === 'attended') {
    footer = <Button onClick={openPlan}>{t('spot.openPlan')}</Button>
  } else if (request?.status === 'declined') {
    footer = <Button variant="soft" onClick={openPlan}>{t('spot.seeAnswer', { name: host.firstName })}</Button>
  } else if (spot.openSpots <= 0) {
    footer = <Button disabled>{t('spot.groupFull')}</Button>
  } else {
    footer = (
      <>
        <Button variant="accent" onClick={() => dispatch({ type: 'SHEET', sheet: { name: 'request', spotId: spot.id } })}>
          {t('spot.askToJoin', { open: openLabel(spot.openSpots) })}
        </Button>
        <p className="mt-2 text-center text-sm text-ink-soft">{t('spot.askHint', { name: host.firstName })}</p>
      </>
    )
  }

  return (
    <Screen
      footer={footer}
      header={
        <header className="glow shrink-0 rounded-b-[28px] px-4 pb-5 text-cream-50" style={SAFE_TOP}>
          <div className="flex items-center justify-between">
            <BackButton />
            <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold">
              <TypeIcon size={16} aria-hidden="true" /> {t(`types.${spot.type}`)}
            </span>
          </div>
          <div className="px-1">
            <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight"><bdi>{spot.activity}</bdi></h1>
            <p className="mt-1 text-base text-pine-200"><bdi>{list([venue.name, `${venue.address}, ${venue.neighborhood}`])}</bdi></p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px] font-semibold">
              <span className="flex items-center gap-1.5"><Clock size={17} className="text-honey-400" aria-hidden="true" /> {t('spot.tonightAt', { time: spot.startTime })}</span>
              <span className="flex items-center gap-1.5"><MapPin size={17} className="text-honey-400" aria-hidden="true" /> {t('common.kmAway', { d: formatDistance(venue.distanceKm) })}</span>
            </div>
          </div>
        </header>
      }
    >
      <div className="space-y-6 px-5 py-5">
        <section aria-labelledby="who">
          <div className="flex items-baseline justify-between">
            <SectionTitle><span id="who">{t('spot.whoTitle')}</span></SectionTitle>
            <span className="text-[15px] font-medium text-ink-soft">{t('spot.people', { count: spot.memberIds.length })}</span>
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-x-2 gap-y-4">
            {spot.memberIds.map((id) => {
              const p = person(id)
              return (
                <li key={id} className="flex flex-col items-center text-center">
                  <Avatar id={id} size={76} />
                  <span className="mt-1.5 text-base font-semibold text-ink"><bdi>{id === ME ? t('common.you') : p.firstName}</bdi></span>
                  <span className="text-sm text-ink-soft">
                    {id === spot.hostId ? t('spot.hostAge', { age: p.ageRange }) : <bdi>{p.ageRange}</bdi>}
                  </span>
                </li>
              )
            })}
            {spot.openSpots > 0 && !request && !mine && (
              <li className="flex flex-col items-center text-center">
                <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-dashed border-honey-500 bg-honey-100 font-display text-lg font-semibold text-honey-800">
                  {t('spot.youSlot')}
                </span>
                <span className="mt-1.5 text-base font-semibold text-honey-800">{openLabel(spot.openSpots)}</span>
              </li>
            )}
          </ul>

          <Card className="mt-4 divide-y divide-cream-200 py-1!">
            <Fact icon={Users} label={t('spot.groupMix')}>{mixText(groupMix(spot.memberIds))}</Fact>
            <Fact icon={CalendarDays} label={t('spot.ageRange')}><bdi>{spot.ageRange}</bdi></Fact>
            <Fact icon={Languages} label={t('spot.languages')}>{langs.map((l) => t(`langs.${l.lang}`)).join(', ')}</Fact>
          </Card>
          <p className="mt-2 px-1 text-sm text-ink-soft">{t('spot.selfReported')}</p>
        </section>

        {spot.vibeTags.length > 0 && (
          <section>
            <SectionTitle>{t('spot.vibe')}</SectionTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              {spot.vibeTags.map((tag) => (
                <Tag key={tag} tone="honey">{tag}</Tag>
              ))}
            </div>
          </section>
        )}

        {spot.hostNote && (
          <section>
            <SectionTitle>{mine ? t('spot.noteFromYou') : t('spot.noteFrom', { name: host.firstName })}</SectionTitle>
            <Card className="mt-3 flex gap-3">
              <Avatar id={spot.hostId} size={44} />
              <p className="text-base leading-relaxed text-ink"><bdi>{spot.hostNote}</bdi></p>
            </Card>
          </section>
        )}

        <section aria-labelledby="safety" className="rounded-3xl bg-pine-50 p-4">
          <h2 id="safety" className="flex items-center gap-2 font-display text-xl font-semibold text-pine-950">
            <ShieldCheck size={22} className="text-pine-700" aria-hidden="true" /> {t('spot.safetyTitle')}
          </h2>
          <ul className="mt-3 space-y-3 text-[15px] leading-snug text-ink">
            <SafetyPoint icon={Store} title={t('spot.safetyPublicTitle')}>{t('spot.safetyPublic', { venue: venue.name })}</SafetyPoint>
            <SafetyPoint icon={UserCheck} title={t('spot.safetyHostTitle')}>{t('spot.safetyHost')}</SafetyPoint>
            <SafetyPoint icon={DoorOpen} title={t('spot.safetyLeaveTitle')}>{t('spot.safetyLeave')}</SafetyPoint>
          </ul>
          {!mine && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'SHEET', sheet: { name: 'safety', mode: 'report', spotId: spot.id } })}
              className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-clay-600 bg-white text-base font-semibold text-clay-700 active:bg-clay-50"
            >
              <Flag size={18} aria-hidden="true" /> {t('spot.report')}
            </button>
          )}
        </section>
      </div>
    </Screen>
  )
}
