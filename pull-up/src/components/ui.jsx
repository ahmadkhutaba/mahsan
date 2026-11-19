import { ChevronLeft, Dices, GraduationCap, Sparkles, UtensilsCrossed, Volleyball, Wine, X } from 'lucide-react'
import { useEffect } from 'react'
import { useT } from '../i18n/index.jsx'
import { useStore } from '../state/store.jsx'

// ── Buttons ──────────────────────────────────────────────────────────────

const BUTTON_STYLES = {
  primary: 'bg-pine-900 text-cream-50 active:bg-pine-950 disabled:bg-cream-300 disabled:text-ink-soft',
  accent: 'bg-honey-400 text-pine-950 active:bg-honey-500 disabled:bg-cream-300 disabled:text-ink-soft',
  outline: 'border-2 border-pine-900 text-pine-900 active:bg-pine-50',
  soft: 'bg-pine-100 text-pine-900 active:bg-pine-200',
  danger: 'bg-clay-600 text-white active:bg-clay-700 disabled:bg-cream-300 disabled:text-ink-soft',
  dangerSoft: 'bg-clay-100 text-clay-700 active:bg-clay-100/70',
  ghost: 'text-pine-800 active:bg-pine-50',
}

export function Button({ variant = 'primary', icon: Icon, flipIcon = false, children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-colors ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={20} strokeWidth={2.2} className={flipIcon ? 'rtl:-scale-x-100' : ''} aria-hidden="true" />}
      {children}
    </button>
  )
}

/** Selectable pill used for filters, tags and form choices. */
export function Chip({ selected, onClick, icon: Icon, children, className = '' }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-[44px] items-center justify-center gap-2 rounded-full border-2 px-4 text-[15px] font-medium transition-colors ${
        selected ? 'border-pine-900 bg-pine-900 text-cream-50' : 'border-cream-300 bg-white text-ink active:bg-cream-100'
      } ${className}`}
    >
      {Icon && <Icon size={18} aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Tag({ children, tone = 'cream' }) {
  const tones = {
    cream: 'bg-cream-100 text-ink',
    honey: 'bg-honey-100 text-honey-800',
    pine: 'bg-pine-100 text-pine-900',
    clay: 'bg-clay-100 text-clay-700',
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium ${tones[tone]}`}>{children}</span>
}

// ── Activity types ───────────────────────────────────────────────────────

export const TYPE_ICONS = { bar: Wine, restaurant: UtensilsCrossed, boardgames: Dices, sports: Volleyball, class: GraduationCap, other: Sparkles }
export const ALL_TYPES = ['bar', 'restaurant', 'boardgames', 'sports', 'class', 'other']

const TYPE_TILE = {
  bar: 'bg-honey-100 text-honey-800',
  restaurant: 'bg-clay-100 text-clay-700',
  boardgames: 'bg-plum-100 text-plum-700',
  sports: 'bg-pine-100 text-pine-800',
  class: 'bg-honey-100 text-honey-800',
  other: 'bg-cream-200 text-ink',
}

export function TypeTile({ type, size = 48 }) {
  const Icon = TYPE_ICONS[type]
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-2xl ${TYPE_TILE[type] || 'bg-cream-100 text-ink-soft'}`}
      style={{ width: size, height: size }}
    >
      {Icon && <Icon size={size * 0.48} strokeWidth={2} aria-hidden="true" />}
    </span>
  )
}

// ── Screen scaffolding ───────────────────────────────────────────────────

/** Top padding that clears the phone status bar (frame) or the device safe area. */
export const SAFE_TOP = { paddingTop: 'calc(var(--safe-top) + 10px)' }

export function BackButton({ onClick }) {
  const { dispatch } = useStore()
  const { t } = useT()
  return (
    <button
      type="button"
      aria-label={t('common.back')}
      onClick={onClick || (() => dispatch({ type: 'POP' }))}
      className="-ms-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-cream-50 active:bg-white/10"
    >
      <ChevronLeft size={28} className="rtl:-scale-x-100" aria-hidden="true" />
    </button>
  )
}

/** Full-height screen that slides over the tab view. */
export function Screen({ title, subtitle, onBack, right, header, footer, children, scrollRef, bodyClass = '' }) {
  return (
    <div className="anim-screen absolute inset-0 z-20 flex flex-col bg-cream-50">
      {header || (
        <header className="flex shrink-0 items-center gap-1 bg-pine-900 px-4 pb-3 text-cream-50" style={SAFE_TOP}>
          <BackButton onClick={onBack} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-semibold">{title}</h1>
            {subtitle && <p className="truncate text-sm text-pine-200">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto overscroll-contain ${bodyClass}`}>
        {children}
      </div>
      {footer && (
        <div className="shrink-0 border-t border-cream-200 bg-cream-50 px-5 pt-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 14px)' }}>
          {footer}
        </div>
      )}
    </div>
  )
}

/** Bottom sheet rendered inside the phone frame. */
export function Sheet({ title, onClose, children, footer }) {
  const { dispatch } = useStore()
  const { t } = useT()
  const close = onClose || (() => dispatch({ type: 'CLOSE_SHEET' }))

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label={t('common.close')} tabIndex={-1} onClick={close} className="anim-fade absolute inset-0 bg-pine-950/60" />
      <div className="anim-sheet relative flex max-h-[90%] flex-col rounded-t-[28px] bg-cream-50 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="font-display text-[22px] font-semibold leading-tight text-pine-950">{title}</h2>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={close}
            className="-me-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream-100 text-ink active:bg-cream-200"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-cream-200 px-5 pt-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 14px)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function SectionTitle({ children, className = '' }) {
  return <h2 className={`font-display text-xl font-semibold text-pine-950 ${className}`}>{children}</h2>
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`rounded-3xl border border-cream-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,43,36,0.05)] ${className}`} {...props}>
      {children}
    </div>
  )
}

/** Things in the prototype that are stand-ins for the facilitator, not product UI. */
export function DemoControl({ children, onClick, icon: Icon }) {
  const { t } = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cream-300 px-4 text-sm font-semibold text-ink-soft active:bg-cream-100"
    >
      {Icon && <Icon size={18} className="rtl:-scale-x-100" aria-hidden="true" />}
      <span>
        <span className="me-1 rounded bg-cream-200 px-1.5 py-0.5 text-[11px] uppercase tracking-wide">{t('common.demo')}</span> {children}
      </span>
    </button>
  )
}

/** "2 women · 1 man" from the counts in helpers.groupMix. */
export function useMixText() {
  const { t, list } = useT()
  return (mix) =>
    list([
      mix.you && t('common.you'),
      mix.women > 0 && t('mix.women', { count: mix.women }),
      mix.men > 0 && t('mix.men', { count: mix.men }),
      mix.nonbinary > 0 && t('mix.nonbinary', { count: mix.nonbinary }),
    ])
}

export function useOpenLabel() {
  const { t } = useT()
  return (n) => (n <= 0 ? t('spot.full') : t('spot.open', { count: n }))
}
