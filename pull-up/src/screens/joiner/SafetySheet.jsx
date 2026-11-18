import { Check, ChevronRight, DoorOpen, Flag, Phone } from 'lucide-react'
import { useState } from 'react'
import { Button, Sheet } from '../../components/ui.jsx'
import { useStore } from '../../state/store.jsx'

const REASONS = [
  'The group is not who they said they were',
  'Someone made me uncomfortable',
  'I felt pressured to drink or to stay',
  'The place or time was wrong',
  'Something else',
]

const Emergency = () => (
  <p className="mt-4 flex items-center gap-2 rounded-2xl bg-clay-50 p-3 text-[15px] text-clay-700">
    <Phone size={18} className="shrink-0" aria-hidden="true" />
    <span>In danger right now? Call the police on <b>100</b>.</span>
  </p>
)

/** mode: 'menu' | 'leave' | 'report'. requestId is set once the tester is in the group. */
export default function SafetySheet({ mode: initialMode, spotId, requestId }) {
  const { state, dispatch } = useStore()
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
      <button type="button" onClick={onClick} className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3 text-left active:bg-cream-100">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon size={21} aria-hidden="true" /></span>
        <span className="flex-1"><span className="block text-base font-semibold text-ink">{title}</span><span className="block text-sm text-ink-soft">{text}</span></span>
        <ChevronRight size={20} className="text-ink-soft" aria-hidden="true" />
      </button>
    )
    return (
      <Sheet title="Safety">
        <div className="space-y-2">
          {inGroup && <Row icon={DoorOpen} tone="bg-pine-100 text-pine-800" title="Leave quietly" text="No explanation. The group sees “can’t make it”." onClick={() => setMode('leave')} />}
          <Row icon={Flag} tone="bg-clay-100 text-clay-700" title="Report a concern" text="Private. The group is not told." onClick={() => setMode('report')} />
        </div>
        <Emergency />
      </Sheet>
    )
  }

  if (mode === 'leave') {
    return (
      <Sheet
        title="Leave quietly?"
        footer={
          <div className="space-y-2">
            <Button variant="danger" icon={DoorOpen} onClick={leave}>Leave quietly</Button>
            <Button variant="ghost" onClick={() => dispatch({ type: 'CLOSE_SHEET' })}>Stay in the group</Button>
          </div>
        }
      >
        <ul className="space-y-3 text-base text-ink">
          <li className="flex gap-3"><Check size={20} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" />The group gets one neutral line: “{state.me.firstName} can’t make it tonight.”</li>
          <li className="flex gap-3"><Check size={20} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" />You don’t have to give a reason, and nobody can message you after.</li>
          <li className="flex gap-3"><Check size={20} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" />It does not affect your profile or your rating.</li>
        </ul>
        <button type="button" onClick={() => setMode('report')} className="mt-4 min-h-[44px] text-base font-semibold text-clay-700 underline underline-offset-4">
          Something felt wrong? Report it instead
        </button>
      </Sheet>
    )
  }

  if (mode === 'report') {
    return (
      <Sheet
        title="Report a concern"
        footer={<Button variant="danger" icon={Flag} disabled={!reason} onClick={report}>Send report</Button>}
      >
        <p className="text-[15px] text-ink-soft">Only the Pull Up safety team reads this. The group is never told who reported.</p>
        <fieldset className="mt-4 space-y-2">
          <legend className="mb-2 text-base font-semibold text-pine-950">What happened?</legend>
          {REASONS.map((r) => (
            <label key={r} className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-2xl border-2 px-3 text-base ${reason === r ? 'border-pine-900 bg-pine-50 font-semibold' : 'border-cream-300 bg-white'}`}>
              <input type="radio" name="reason" className="h-5 w-5 accent-pine-900" checked={reason === r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
        </fieldset>
        <label htmlFor="report-details" className="mt-4 block text-base font-semibold text-pine-950">Anything to add? <span className="font-normal text-ink-soft">(optional)</span></label>
        <textarea id="report-details" rows={2} value={details} onChange={(e) => setDetails(e.target.value)} className="mt-2 w-full resize-none rounded-2xl border-2 border-cream-300 bg-white p-3 text-base focus:border-pine-700 focus:outline-none" />
        {inGroup && (
          <label className="mt-3 flex min-h-[48px] cursor-pointer items-center gap-3 text-base text-ink">
            <input type="checkbox" className="h-5 w-5 accent-pine-900" checked={alsoLeave} onChange={(e) => setAlsoLeave(e.target.checked)} />
            Also leave this group quietly
          </label>
        )}
        <Emergency />
      </Sheet>
    )
  }

  // Confirmation after leaving or reporting
  const reported = mode === 'reported'
  return (
    <Sheet title={reported ? 'Report sent' : 'You’ve left the group'} onClose={finish} footer={<Button onClick={finish}>{didLeave ? 'Back to tonight’s spots' : 'Done'}</Button>}>
      <div className="flex flex-col items-center py-2 text-center">
        <span className="anim-pop flex h-14 w-14 items-center justify-center rounded-full bg-pine-100 text-pine-800"><Check size={28} aria-hidden="true" /></span>
        <p className="mt-3 text-base text-ink" role="status">
          {reported
            ? 'Thank you. We read every report, and the group is not told it came from you.'
            : 'The group only sees that you can’t make it. Your spot is open again for someone else.'}
          {reported && didLeave && ' You have also left the group quietly.'}
        </p>
      </div>
      {reported && <Emergency />}
    </Sheet>
  )
}
