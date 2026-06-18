import { Construction, RotateCcw } from 'lucide-react'
import { useApp } from '../state/store.jsx'
import { INTERNAL_ROLES, ROLE_LABELS, ROLE_BLURB, ROLE_COLOR, isInQueueOf } from '../state/workflow.js'

// Fixed per-role dots/text (do not follow any portal theme).
const DOT = { blue: 'bg-blue-400', teal: 'bg-teal-400', violet: 'bg-violet-400' }
const ACTIVE_TEXT = { blue: 'text-blue-200', teal: 'text-teal-200', violet: 'text-violet-200' }

// =============================================================================
// DESIGN-REVIEW SCAFFOLD — external tooling, NOT part of the product.
// In the real product the three personas are separate portals with no way to
// switch between them. This dark strip exists only so a reviewer can preview
// all three. Deleting it would leave three clean, self-contained portals.
// =============================================================================
export default function ReviewScaffold() {
  const app = useApp()

  return (
    <div className="no-print flex shrink-0 items-center gap-3 border-b-2 border-amber-400/70 bg-slate-900 px-4 py-1.5 text-slate-300">
      <div className="flex items-center gap-2">
        <Construction className="h-4 w-4 shrink-0 text-amber-400" />
        <div className="leading-tight">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
            Design-review scaffold
          </p>
          <p className="hidden text-[10px] text-slate-400 lg:block">
            Not in the real product — each persona is a separate portal. Switch only to preview all three.
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="hidden text-[10px] font-medium uppercase tracking-wide text-slate-500 md:inline">
          Preview portal
        </span>
        {INTERNAL_ROLES.map((role) => {
          const active = app.role === role
          const count = app.requests.filter((r) => isInQueueOf(r, role)).length
          const color = ROLE_COLOR[role]
          return (
            <button
              key={role}
              onClick={() => app.setRole(role)}
              title={ROLE_BLURB[role]}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                active
                  ? `bg-white/10 ${ACTIVE_TEXT[color]} ring-1 ring-white/20`
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${DOT[color]}`} />
              {ROLE_LABELS[role]}
              <span
                className={`rounded-full px-1.5 text-[10px] font-bold ${
                  active ? 'bg-white/15 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <button
        onClick={app.reset}
        title="Reset demo data to seed"
        className="ml-1 flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-white/5"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Reset
      </button>
    </div>
  )
}
