import { useState } from 'react'
import {
  Check,
  Clock,
  CornerUpLeft,
  MessageCircleWarning,
  XCircle,
  ChevronDown,
  Dot,
} from 'lucide-react'
import { MILESTONES, STATUS, STATUS_META, ROLES, ROLE_LABELS } from '../state/workflow.js'
import { TONE, Avatar, OverdueFlag } from './common.jsx'
import { formatDateTime, timeAgo, dwellLabel } from '../lib/format.js'

// Which milestone a given history action "completes".
const COMPLETES = [
  (a) => a.includes('Forwarded to Surveyor'),
  (a) => a.includes('Forwarded to Final Authority'),
  (a) => a.includes('Approved — generating') || a.includes('Certificate issued'),
  (a) => a.includes('Certificate issued'),
]

const REJECT_INDEX = { [ROLES.Supervisor]: 0, [ROLES.Surveyor]: 1, [ROLES.FinalAuthority]: 2 }

export default function ApprovalTracker({ request }) {
  const [open, setOpen] = useState(false)
  const { status, history } = request
  const stage = STATUS_META[status]?.stage ?? 0
  const rejected = status === STATUS.REJECTED
  const eff = stage === 3 ? 2 : stage // "generating cert" still sits at the decision milestone

  const rejectAt = rejected
    ? REJECT_INDEX[[...history].reverse().find((h) => h.action === 'Rejected')?.actorRole] ?? 1
    : null

  const stepState = (i) => {
    if (rejected) {
      if (i < rejectAt) return 'done'
      if (i === rejectAt) return 'rejected'
      return 'upcoming'
    }
    if (i === 0) return eff > 0 ? 'done' : 'current'
    if (i === 1) return eff > 1 ? 'done' : eff === 1 ? 'current' : 'upcoming'
    if (i === 2) return eff > 2 ? 'done' : eff === 2 ? 'current' : 'upcoming'
    return eff === 4 ? 'done' : 'upcoming'
  }

  const completion = (i) => {
    const entry = history.find((h) => COMPLETES[i](h.action))
    return entry || null
  }

  // Progress for the goal-gradient bar (0–100%).
  const pct = rejected ? (rejectAt / 3) * 100 : Math.min(eff, 4) * 25

  // A side-note for the off-happy-path states, anchored under milestone 0/the current step.
  const sideNote =
    status === STATUS.CLARIFICATION_INVESTOR
      ? { tone: 'slate', icon: MessageCircleWarning, text: 'Out to investor for clarification — via SWCS' }
      : status === STATUS.RETURNED_INTERNAL
      ? { tone: 'amber', icon: CornerUpLeft, text: 'Returned for clarification (internal) — back with Supervisor' }
      : null

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4">
        <h3 className="text-sm font-semibold text-slate-700">Approval tracker</h3>
        <span className="text-xs text-slate-400">
          {rejected ? 'Closed — rejected' : status === STATUS.CERT_ISSUED ? 'Complete' : `Stage ${Math.min(eff + 1, 4)} of 4`}
        </span>
      </div>

      {/* goal-gradient progress bar */}
      <div className="mx-4 mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            rejected ? 'bg-red-400' : status === STATUS.CERT_ISSUED ? 'bg-emerald-500' : 'bg-accent-600'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* horizontal stepper */}
      <div className="flex items-stretch gap-1 px-4 py-4">
        {MILESTONES.map((m, i) => {
          const st = stepState(i)
          const entry = st === 'done' ? completion(i) : null
          return (
            <div key={m.key} className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center">
                <StepDot state={st} />
                {i < MILESTONES.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 rounded-full ${
                      stepState(i) === 'done' ? 'bg-accent-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
              <div className="mt-2 pr-2">
                <p
                  className={`truncate text-sm font-semibold ${
                    st === 'upcoming' ? 'text-slate-400' : st === 'rejected' ? 'text-red-600' : 'text-slate-700'
                  }`}
                >
                  {m.label}
                </p>
                <p className="truncate text-xs text-slate-400">{m.sub}</p>

                {st === 'done' && entry && (
                  <p className="mt-1 truncate text-[11px] text-slate-500">
                    {ROLE_LABELS[entry.actorRole]} · {timeAgo(entry.timestamp)}
                  </p>
                )}
                {st === 'current' && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
                      <Clock className="h-3 w-3" />
                      {dwellLabel(request.daysInQueue)}
                    </div>
                    {request.daysInQueue > request.slaDays && <OverdueFlag small />}
                  </div>
                )}
                {st === 'rejected' && (
                  <p className="mt-1 text-[11px] font-medium text-red-500">Closed here</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {sideNote && (
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs font-medium"
          style={{}}
        >
          <span className={`flex items-center gap-2 ${TONE[sideNote.tone].soft} rounded-md px-2 py-1`}>
            <sideNote.icon className="h-3.5 w-3.5" />
            {sideNote.text}
          </span>
        </div>
      )}

      {/* progressive disclosure: full history & comments */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
      >
        <span>Full history &amp; comments ({history.length})</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ol className="space-y-0 border-t border-slate-100 px-4 py-3">
          {[...history].reverse().map((entry, idx) => (
            <HistoryRow key={idx} entry={entry} last={idx === history.length - 1} />
          ))}
        </ol>
      )}
    </div>
  )
}

function StepDot({ state }) {
  if (state === 'done')
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-600 text-white">
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
    )
  if (state === 'rejected')
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
        <XCircle className="h-4 w-4" />
      </span>
    )
  if (state === 'current')
    return (
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
        <span className="absolute inline-flex h-7 w-7 rounded-full bg-amber-400/40 animate-ping2" />
        <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-amber-500 bg-amber-50">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
        </span>
      </span>
    )
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-white text-slate-300">
      <Dot className="h-5 w-5" />
    </span>
  )
}

// A single transition in the vertical history. Back/clarify/reject loops are
// drawn distinctly (colour + corner-arrow) so they read as deviations.
function HistoryRow({ entry, last }) {
  const isBack = /back|Returned/i.test(entry.action)
  const isClarify = /clarification/i.test(entry.action)
  const isReject = entry.action === 'Rejected'
  const isIssue = /Certificate issued|Approved/i.test(entry.action)

  const accent = isReject
    ? 'border-red-300'
    : isBack || isClarify
    ? 'border-amber-300'
    : isIssue
    ? 'border-emerald-300'
    : 'border-slate-200'

  const Icon = isReject ? XCircle : isBack ? CornerUpLeft : isClarify ? MessageCircleWarning : Check

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border bg-white ${accent} ${
            isReject ? 'text-red-500' : isBack || isClarify ? 'text-amber-500' : isIssue ? 'text-emerald-500' : 'text-slate-400'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {!last && <span className="my-0.5 w-px flex-1 bg-slate-200" />}
      </div>
      <div className={`flex-1 pb-4 ${last ? 'pb-1' : ''}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Avatar role={entry.actorRole} size="sm" />
          <span className="text-sm font-semibold text-slate-700">{entry.action}</span>
          <span className="text-xs text-slate-400">
            · {ROLE_LABELS[entry.actorRole]} · {formatDateTime(entry.timestamp)}
          </span>
        </div>
        {entry.category && (
          <span className="mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600">
            {entry.category}
          </span>
        )}
        {entry.comment && (
          <p
            className={`mt-1 rounded-lg border-l-2 bg-slate-50 px-3 py-2 text-sm text-slate-600 ${accent}`}
          >
            “{entry.comment}”
          </p>
        )}
      </div>
    </li>
  )
}
