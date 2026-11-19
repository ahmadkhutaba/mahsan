import { Check, ChevronRight, DoorOpen, Flag, Phone } from 'lucide-react'
import { useState } from 'react'
import { Button, Sheet } from '../../components/ui.jsx'
import { useT } from '../../i18n/index.jsx'
import { useStore } from '../../state/store.jsx'

const REASONS = ['r1', 'r2', 'r3', 'r4', 'r5']

function Emergency() {
  const { t } = useT()
  return (
    <p className="mt-4 flex items-center gap-2 rounded-2xl bg-clay-50 p-3 text-[15px] text-clay-700">
      <Phone size={18} className="shrink-0" aria-hidden="true" />
      <span>{t('safety.emergency')} <b><bdi>{t('safety.emergencyNumber')}</bdi></b>.</span>
    </p>
  )
}

/** mode: 'menu' | 'leave' | 'report'. requestId is set once the viewer is in the group. */
export default function SafetySheet({ mode: initialMode, spotId, requestId }) {
  const { state, dispatch } = useStore()
  const { t } = useT()
  const [mode, setMode] = useState(initialMode)
  const [reason, setReason] = useState(null)
  const [details, setDetails] = useState('')
  const request = state.requests.find((r) => r.id === requestId)
  const inGroup = request?.status === 'accepted'
  const [alsoLeave, setAlsoLeave] = useState(true)
  const [didLeave, setDidLeave] = useState(false)

  const finish = () => dispatch({ type: didLeave ? 'HOME' : 'CLOSE_SHEET', tab: 'home' })

  const leave = () => {
    dispatch({ type: 'LEAVE', requestId })
    setDidLeave(true)
    setMode('left')
  }

  const report = () => {
    dispatch({ type: 'REPORT', report: { spotId, reason, details } })
    if (inGroup && alsoLeave) {
      dispatch({ type: 'LEAVE', requestId })
      setDidLeave(true)
    }
    setMode('reported')
  }

  if (mode === 'menu') {
    const Row = ({ icon: Icon, title, text, onClick, tone }) => (
      <button type="button" onClick={onClick} className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3 text-start active:bg-cream-100">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon size={21} aria-hidden="true" /></span>
        <span className="flex-1"><span className="block text-base font-semibold text-ink">{title}</span><span className="block text-sm text-ink-soft">{text}</span></span>
        <ChevronRight size={20} className="text-ink-soft rtl:-scale-x-100" aria-hidden="true" />
      </button>
    )
    return (
      <Sheet title={t('safety.title')}>
        <div className="space-y-2">
          {inGroup && <Row icon={DoorOpen} tone="bg-pine-100 text-pine-800" title={t('safety.leaveRow')} text={t('safety.leaveRowText')} onClick={() => setMode('leave')} />}
          <Row icon={Flag} tone="bg-clay-100 text-clay-700" title={t('safety.reportRow')} text={t('safety.reportRowText')} onClick={() => setMode('report')} />
        </div>
        <Emergency />
      </Sheet>
    )
  }

  if (mode === 'leave') {
    return (
      <Sheet
        title={t('safety.leaveTitle')}
        footer={
          <div className="space-y-2">
            <Button variant="danger" icon={DoorOpen} onClick={leave}>{t('safety.leaveConfirm')}</Button>
            <Button variant="ghost" onClick={() => dispatch({ type: 'CLOSE_SHEET' })}>{t('safety.stay')}</Button>
          </div>
        }
      >
        <ul className="space-y-3 text-base text-ink">
          {['leave1', 'leave2', 'leave3'].map((k) => (
            <li key={k} className="flex gap-3"><Check size={20} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" />{t(`safety.${k}`)}</li>
          ))}
        </ul>
        <button type="button" onClick={() => setMode('report')} className="mt-4 min-h-[44px] text-start text-base font-semibold text-clay-700 underline underline-offset-4">
          {t('safety.reportInstead')}
        </button>
      </Sheet>
    )
  }

  if (mode === 'report') {
    return (
      <Sheet
        title={t('safety.reportTitle')}
        footer={<Button variant="danger" icon={Flag} disabled={!reason} onClick={report}>{t('safety.sendReport')}</Button>}
      >
        <p className="text-[15px] text-ink-soft">{t('safety.reportIntro')}</p>
        <fieldset className="mt-4 space-y-2">
          <legend className="mb-2 text-base font-semibold text-pine-950">{t('safety.what')}</legend>
          {REASONS.map((r) => (
            <label key={r} className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-2xl border-2 px-3 py-2 text-base ${reason === r ? 'border-pine-900 bg-pine-50 font-semibold' : 'border-cream-300 bg-white'}`}>
              <input type="radio" name="reason" className="h-5 w-5 shrink-0 accent-pine-900" checked={reason === r} onChange={() => setReason(r)} />
              {t(`safety.${r}`)}
            </label>
          ))}
        </fieldset>
        <label htmlFor="report-details" className="mt-4 block text-base font-semibold text-pine-950">{t('safety.add')} <span className="font-normal text-ink-soft">{t('common.optional')}</span></label>
        <textarea id="report-details" dir={details ? 'auto' : undefined} rows={2} value={details} onChange={(e) => setDetails(e.target.value)} className="mt-2 w-full resize-none rounded-2xl border-2 border-cream-300 bg-white p-3 text-base focus:border-pine-700 focus:outline-none" />
        {inGroup && (
          <label className="mt-3 flex min-h-[48px] cursor-pointer items-center gap-3 text-base text-ink">
            <input type="checkbox" className="h-5 w-5 shrink-0 accent-pine-900" checked={alsoLeave} onChange={(e) => setAlsoLeave(e.target.checked)} />
            {t('safety.alsoLeave')}
          </label>
        )}
        <Emergency />
      </Sheet>
    )
  }

  const reported = mode === 'reported'
  return (
    <Sheet
      title={reported ? t('safety.reportedTitle') : t('safety.leftTitle')}
      onClose={finish}
      footer={<Button onClick={finish}>{didLeave ? t('safety.backToSpots') : t('common.done')}</Button>}
    >
      <div className="flex flex-col items-center py-2 text-center">
        <span className="anim-pop flex h-14 w-14 items-center justify-center rounded-full bg-pine-100 text-pine-800"><Check size={28} aria-hidden="true" /></span>
        <p className="mt-3 text-base text-ink" role="status">
          {reported ? t('safety.reportedText') : t('safety.leftText')}
          {reported && didLeave && ` ${t('safety.alsoLeft')}`}
        </p>
      </div>
      {reported && <Emergency />}
    </Sheet>
  )
}
