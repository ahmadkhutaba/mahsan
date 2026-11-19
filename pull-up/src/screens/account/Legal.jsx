import { BackButton, SAFE_TOP } from '../../components/ui.jsx'
import { useT } from '../../i18n/index.jsx'

/** Terms and privacy. Opened before sign-in, during onboarding, and from the profile. */
export default function Legal({ onBack }) {
  const { t } = useT()
  return (
    <div className="anim-screen absolute inset-0 z-40 flex flex-col bg-cream-50">
      <header className="flex shrink-0 items-center gap-1 bg-pine-900 px-4 pb-3 text-cream-50" style={SAFE_TOP}>
        <BackButton onClick={onBack} />
        <h1 className="font-display text-xl font-semibold">{t('legal.title')}</h1>
      </header>
      <main className="flex-1 space-y-5 overflow-y-auto px-5 py-5" style={{ paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <section key={n}>
            <h2 className="font-display text-lg font-semibold text-pine-950">{t(`legal.p${n}Title`)}</h2>
            <p className="mt-1 text-base leading-relaxed text-ink">{t(`legal.p${n}`)}</p>
          </section>
        ))}
      </main>
    </div>
  )
}
