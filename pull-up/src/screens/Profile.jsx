import { ChevronRight, LogOut, Pencil, RotateCcw, ScrollText } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import { RoleSwitch } from '../components/Shell.jsx'
import { Card, DemoControl, SAFE_TOP, Tag } from '../components/ui.jsx'
import { LanguageSwitch, useT } from '../i18n/index.jsx'
import { useAuth } from '../state/auth.jsx'
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

function Row({ icon: Icon, children, onClick, tone = 'text-ink' }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-[56px] w-full items-center gap-3 px-4 text-start text-base font-semibold active:bg-cream-100 ${tone}`}>
      <Icon size={20} className="shrink-0" aria-hidden="true" />
      <span className="flex-1">{children}</span>
      <ChevronRight size={20} className="shrink-0 text-ink-soft rtl:-scale-x-100" aria-hidden="true" />
    </button>
  )
}

export default function Profile() {
  const { dispatch } = useStore()
  const auth = useAuth()
  const { t, list } = useT()
  const { profile, account } = auth

  return (
    <div className="flex h-full flex-col">
      <TabHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <Card className="flex items-center gap-4">
          <Avatar spec={profile.avatar} size={72} />
          <div className="min-w-0">
            <p className="font-display text-2xl font-semibold text-pine-950"><bdi>{profile.first_name}</bdi></p>
            <p className="text-[15px] text-ink-soft">{list([t(`ages.${profile.age_range}`), profile.languages.map((l) => t(`langs.${l}`)).join(', ')])}</p>
          </div>
        </Card>

        {account.interests.length > 0 && (
          <Card>
            <p className="mb-2 text-base font-semibold text-pine-950">{t('profile.upFor')}</p>
            <div className="flex flex-wrap gap-2">{account.interests.map((id) => <Tag key={id} tone="honey">{t(`types.${id}`)}</Tag>)}</div>
          </Card>
        )}

        <Card className="divide-y divide-cream-200 p-0! overflow-hidden">
          <Row icon={Pencil} onClick={() => dispatch({ type: 'PUSH', screen: { name: 'editProfile' } })}>{t('about.edit')}</Row>
          <Row icon={ScrollText} onClick={() => dispatch({ type: 'PUSH', screen: { name: 'legal' } })}>{t('auth.legal')}</Row>
          <Row icon={LogOut} tone="text-clay-700" onClick={auth.signOut}>{t('auth.signOut')}</Row>
        </Card>

        <Card className="flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-pine-950">{t('app.language')}</p>
          <LanguageSwitch />
        </Card>

        <Card>
          <p className="mb-2 text-base font-semibold text-pine-950">{t('profile.tonightIam')}</p>
          <RoleSwitch />
        </Card>

        <DemoControl icon={RotateCcw} onClick={() => dispatch({ type: 'RESET' })}>{t('profile.reset')}</DemoControl>
        <p className="px-2 text-center text-sm text-ink-soft">{t('profile.note')}</p>
      </main>
    </div>
  )
}
