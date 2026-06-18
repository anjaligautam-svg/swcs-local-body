import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Search,
  Inbox,
  Activity,
  CheckCircle2,
  XCircle,
  Building2,
  Clock,
} from 'lucide-react'
import { useApp } from '../state/store.jsx'
import {
  ROLE_LABELS,
  STATUS,
  isInQueueOf,
  isTerminal,
  handledBy,
  holderOf,
} from '../state/workflow.js'
import { OverdueFlag } from './common.jsx'
import { dwellLabel } from '../lib/format.js'

function useOutside(ref, onClose) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && onClose()
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, onClose])
}

// Reminders for THIS portal's holder only — no cross-role visibility.
function NotificationsBell() {
  const app = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOutside(ref, () => setOpen(false))

  const queue = app.requests.filter((r) => isInQueueOf(r, app.role))
  const overdue = queue.filter((r) => r.daysInQueue > r.slaDays)

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="btn btn-ghost relative h-9 w-9 !px-0" title="Reminders">
        <Bell className="h-5 w-5" />
        {queue.length > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
              overdue.length ? 'bg-red-500' : 'bg-accent-600'
            }`}
          >
            {queue.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 animate-fade-in rounded-xl border border-slate-200 bg-white shadow-pop">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-700">Reminders</p>
            <p className="text-xs text-slate-400">
              Pending your action{overdue.length ? ` · ${overdue.length} overdue` : ''}
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto scroll-slim py-1">
            {queue.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">You're all caught up 🎉</p>
            )}
            {queue
              .slice()
              .sort((a, b) => b.daysInQueue - a.daysInQueue)
              .map((r) => {
                const od = r.daysInQueue > r.slaDays
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      app.openRequest(r.id)
                      setOpen(false)
                    }}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                  >
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${od ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-700">{r.id}</span>
                        {od && <OverdueFlag small />}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{r.applicantName} · {r.type}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="h-3 w-3" /> Pending your action · {dwellLabel(r.daysInQueue)}
                      </span>
                    </span>
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

function GlobalSearch() {
  const app = useApp()
  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className="input pl-9"
        placeholder="Search by request ID or applicant…"
        value={app.search}
        onChange={(e) => app.setSearch(e.target.value)}
      />
    </div>
  )
}

function NavItem({ icon: Icon, label, count, active, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-accent-50 text-accent-700' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon className={`h-[18px] w-[18px] ${active ? 'text-accent-600' : 'text-slate-400'}`} />
      <span className="flex-1 text-left">{label}</span>
      {count != null && count > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            accent === 'red'
              ? 'bg-red-50 text-red-600'
              : active
              ? 'bg-accent-100 text-accent-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function SideNav() {
  const app = useApp()
  const { requests, role } = app
  const current = app.view.name

  // Per-portal buckets — a portal sees its own queue, plus requests it has
  // handled that are now elsewhere / closed. It never sees untouched requests.
  const inboxCount = requests.filter((r) => isInQueueOf(r, role)).length
  const inProgressCount = requests.filter(
    (r) => !isTerminal(r.status) && holderOf(r.status) !== role && handledBy(r, role),
  ).length
  const completedCount = requests.filter((r) => r.status === STATUS.CERT_ISSUED && handledBy(r, role)).length
  const rejectedCount = requests.filter((r) => r.status === STATUS.REJECTED && handledBy(r, role)).length

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-3">
      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-accent-700">
        {ROLE_LABELS[role]} portal
      </p>
      <NavItem icon={Inbox} label="My Inbox" count={inboxCount} active={current === 'inbox'} onClick={() => app.goList('inbox')} />
      <NavItem icon={Activity} label="In Progress" count={inProgressCount} active={current === 'inProgress'} onClick={() => app.goList('inProgress')} />
      <NavItem icon={CheckCircle2} label="Completed / Issued" count={completedCount} active={current === 'completed'} onClick={() => app.goList('completed')} />
      <NavItem icon={XCircle} label="Rejected" count={rejectedCount} accent="red" active={current === 'rejected'} onClick={() => app.goList('rejected')} />

      <div className="mt-auto rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        <p className="mb-1 font-semibold text-slate-600">Local Body · NMRDA</p>
        Single Window Clearance System. Prototype with mock data.
      </div>
    </nav>
  )
}

// One portal — its own top bar + nav + content. Self-contained: nothing here
// references the other two roles' interfaces or hints that switching exists.
export default function Shell({ children }) {
  const app = useApp()
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* portal identity colour band */}
      <div className="h-1 w-full shrink-0 bg-accent-600" />

      <header className="z-30 flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <button onClick={() => app.goList('inbox')} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-700 text-white">
            <Building2 className="h-5 w-5" />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-bold text-slate-800">{ROLE_LABELS[app.role]} Portal</span>
            <span className="text-[11px] text-slate-400">Local Body Approvals · NMRDA</span>
          </span>
        </button>

        <div className="mx-auto flex flex-1 justify-center px-2">
          <GlobalSearch />
        </div>

        <div className="flex items-center gap-2">
          <NotificationsBell />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <SideNav />
        <main className="min-w-0 flex-1 overflow-y-auto scroll-slim bg-slate-100">{children}</main>
      </div>
    </div>
  )
}
