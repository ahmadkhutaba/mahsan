import { RotateCcw } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import { RoleSwitch } from '../components/Shell.jsx'
import { Card, DemoControl, SAFE_TOP, Tag, VerifiedMark } from '../components/ui.jsx'
import { TYPES } from '../data/venues.js'
import { useStore } from '../state/store.jsx'

export function TabHeader({ title, subtitle, right }) {
  return (
    <header className="glow flex shrink-0 items-end justify-between gap-3 rounded-b-[28px] px-5 pb-5 text-cream-50" style={SAFE_TOP}>
      <div>
        <h1 className="mt-2 font-display text-[30px] font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-[15px] text-pine-200">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

export default function Profile() {
  const { state, dispatch } = useStore()
  const me = state.me

  return (
    <div className="flex h-full flex-col">
      <TabHeader title="Profile" subtitle="What groups and guests see about you" />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <Card className="flex items-center gap-4">
          <Avatar id="me" size={72} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-display text-2xl font-semibold text-pine-950">
              {me.firstName} <VerifiedMark verified={me.verified} size={22} />
            </p>
            <p className="text-[15px] text-ink-soft">{me.ageRange} · {me.languages.join(', ')}</p>
            <p className={`text-sm font-semibold ${me.verified ? 'text-pine-700' : 'text-clay-700'}`}>
              {me.verified ? 'ID verified' : 'Not verified yet'}
            </p>
          </div>
        </Card>

        {me.interests.length > 0 && (
          <Card>
            <p className="mb-2 text-base font-semibold text-pine-950">Up for</p>
            <div className="flex flex-wrap gap-2">{me.interests.map((t) => <Tag key={t} tone="honey">{TYPES[t].label}</Tag>)}</div>
          </Card>
        )}

        <Card>
          <p className="mb-2 text-base font-semibold text-pine-950">Tonight I am</p>
          <RoleSwitch />
        </Card>

        <DemoControl icon={RotateCcw} onClick={() => dispatch({ type: 'RESET' })}>Reset for the next tester</DemoControl>
        <p className="px-2 text-center text-sm text-ink-soft">Prototype with mock data. Nothing is saved or sent.</p>
      </main>
    </div>
  )
}
