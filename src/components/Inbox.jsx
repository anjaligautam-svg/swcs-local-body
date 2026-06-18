import { useState } from 'react'
import {
  ChevronRight,
  Clock,
  Inbox as InboxIcon,
  Activity,
  CheckCircle2,
  XCircle,
  Search as SearchIcon,
  BellRing,
  ArrowUpDown,
} from 'lucide-react'
import { useApp } from '../state/store.jsx'
import {
  REQUEST_TYPES,
  STATUS,
  ROLE_LABELS,
  isInQueueOf,
  isTerminal,
  holderOf,
  handledBy,
  visibleToRole,
} from '../state/workflow.js'
import { StatusBadge, TypeBadge, OverdueFlag, Avatar, EmptyState } from './common.jsx'
import { dwellLabel, formatDate } from '../lib/format.js'

const BUCKETS = {
  inbox: {
    title: 'My Inbox',
    subtitle: 'Requests waiting for your action',
    icon: InboxIcon,
    empty: { title: 'Inbox zero', hint: 'No requests are currently in your queue. Switch role to act as another tier.' },
    filter: (r, role) => isInQueueOf(r, role),
  },
  inProgress: {
    title: 'In Progress',
    subtitle: 'Requests you have actioned that are now with another tier',
    icon: Activity,
    empty: { title: 'Nothing in flight', hint: 'Requests you forward or return appear here while another tier holds them.' },
    filter: (r, role) => !isTerminal(r.status) && holderOf(r.status) !== role && handledBy(r, role),
  },
  completed: {
    title: 'Completed / Issued',
    subtitle: 'Issued certificates for requests you handled',
    icon: CheckCircle2,
    empty: { title: 'No certificates yet', hint: 'Requests you handled that end in an issued certificate show here.' },
    filter: (r, role) => r.status === STATUS.CERT_ISSUED && handledBy(r, role),
  },
  rejected: {
    title: 'Rejected',
    subtitle: 'Requests you handled that were rejected and returned to SWCS',
    icon: XCircle,
    empty: { title: 'No rejections', hint: 'Rejected requests you handled show here.' },
    filter: (r, role) => r.status === STATUS.REJECTED && handledBy(r, role),
  },
}

function lastReason(r) {
  const entry = [...r.history].reverse().find((h) => h.comment)
  return entry?.comment || ''
}

function Row({ r, showHolder, bucket }) {
  const app = useApp()
  const overdue = !isTerminal(r.status) && r.daysInQueue > r.slaDays
  const iHandled = r.history.some((h) => h.actorRole === app.role)
  const canNudge = showHolder && holderOf(r.status) && holderOf(r.status) !== app.role && iHandled

  return (
    <button
      onClick={() => app.openRequest(r.id)}
      className="group flex w-full items-center gap-4 border-b border-slate-100 bg-white px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent-50/40"
    >
      {/* urgency rail */}
      <span
        className={`h-10 w-1 shrink-0 rounded-full ${
          overdue ? 'bg-red-400' : isTerminal(r.status) ? 'bg-slate-200' : 'bg-amber-300'
        }`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-slate-500">{r.id}</span>
          <TypeBadge type={r.type} />
        </div>
        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{r.applicantName}</p>
        <p className="truncate text-xs text-slate-400">{r.businessName}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={r.status} />
          {bucket === 'rejected' && lastReason(r) && (
            <span className="max-w-[240px] truncate text-xs text-slate-400">“{lastReason(r)}”</span>
          )}
          {bucket === 'completed' && r.certificate && (
            <span className="font-mono text-xs text-emerald-600">{r.certificate.number}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {isTerminal(r.status) ? (
          <span className="text-xs text-slate-400">
            {r.status === STATUS.CERT_ISSUED ? 'Issued' : 'Closed'} {formatDate(r.certificate?.issuedAt || r.history.at(-1)?.timestamp)}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {dwellLabel(r.daysInQueue)}
          </span>
        )}
        {overdue && <OverdueFlag small />}
        {showHolder && holderOf(r.status) && (
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            with {ROLE_LABELS[holderOf(r.status)]}
          </span>
        )}
        {canNudge && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              app.nudge(r)
            }}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-white"
          >
            <BellRing className="h-3 w-3" /> Nudge
          </span>
        )}
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-accent-500" />
    </button>
  )
}

export default function ListView({ bucket }) {
  const app = useApp()
  const [type, setType] = useState('All')
  const cfg = BUCKETS[bucket]
  const showHolder = bucket === 'inProgress'

  let rows = app.requests.filter((r) => cfg.filter(r, app.role))
  if (type !== 'All') rows = rows.filter((r) => r.type === type)
  // oldest-first = most days in queue first (most urgent); terminal by recency.
  rows = rows.slice().sort((a, b) =>
    isTerminal(a.status)
      ? new Date(b.history.at(-1)?.timestamp) - new Date(a.history.at(-1)?.timestamp)
      : b.daysInQueue - a.daysInQueue,
  )

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <cfg.icon className="h-5 w-5 text-accent-600" />
            {cfg.title}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{cfg.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
            {['All', ...REQUEST_TYPES].map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  type === t ? 'bg-accent-600 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rows.length > 0 && !['completed', 'rejected'].includes(bucket) && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
          <ArrowUpDown className="h-3.5 w-3.5" /> Sorted oldest-first — longest-waiting at the top
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState icon={cfg.icon} title={cfg.empty.title} hint={cfg.empty.hint} />
      ) : (
        <div className="card overflow-hidden">
          {rows.map((r) => (
            <Row key={r.id} r={r} showHolder={showHolder} bucket={bucket} />
          ))}
        </div>
      )}
    </div>
  )
}

export function SearchResults() {
  const app = useApp()
  const q = app.search.trim().toLowerCase()
  // Scoped to this portal — only requests it currently holds or has handled.
  const rows = app.requests.filter(
    (r) =>
      visibleToRole(r, app.role) &&
      (r.id.toLowerCase().includes(q) ||
        r.applicantName.toLowerCase().includes(q) ||
        r.businessName.toLowerCase().includes(q)),
  )
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-1 flex items-center gap-2 text-xl font-bold text-slate-800">
        <SearchIcon className="h-5 w-5 text-accent-600" /> Search
      </h1>
      <p className="mb-4 text-sm text-slate-500">
        {rows.length} result{rows.length === 1 ? '' : 's'} for “{app.search}”
      </p>
      {rows.length === 0 ? (
        <EmptyState icon={SearchIcon} title="No matches in this portal" hint="Only requests this portal holds or has handled are searchable. Try a request ID or applicant name." />
      ) : (
        <div className="card overflow-hidden">
          {rows.map((r) => (
            <Row key={r.id} r={r} showHolder bucket="inProgress" />
          ))}
        </div>
      )}
    </div>
  )
}
