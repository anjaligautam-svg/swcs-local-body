import {
  FileText,
  Image as ImageIcon,
  Inbox as InboxIcon,
  AlertTriangle,
} from 'lucide-react'
import { STATUS_META, ROLE_LABELS } from '../state/workflow.js'

// Consistent status-colour system (one meaning per colour, used everywhere).
export const TONE = {
  amber: {
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    soft: 'bg-amber-50 text-amber-700',
  },
  blue: {
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    soft: 'bg-blue-50 text-blue-700',
  },
  green: {
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    soft: 'bg-emerald-50 text-emerald-700',
  },
  red: {
    chip: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    soft: 'bg-red-50 text-red-700',
  },
  slate: {
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    soft: 'bg-slate-100 text-slate-600',
  },
}

export function StatusBadge({ status, size = 'sm' }) {
  const meta = STATUS_META[status] || { tone: 'slate' }
  const tone = TONE[meta.tone] || TONE.slate
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${tone.chip} ${pad}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {status}
    </span>
  )
}

const TYPE_STYLE = {
  Advertisement: 'bg-violet-50 text-violet-700 border-violet-200',
  'Fire NOC': 'bg-orange-50 text-orange-700 border-orange-200',
  'Property Tax': 'bg-teal-50 text-teal-700 border-teal-200',
}

export function TypeBadge({ type }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
        TYPE_STYLE[type] || 'bg-slate-50 text-slate-600 border-slate-200'
      }`}
    >
      {type}
    </span>
  )
}

// Fixed per-role colours (do not follow the portal theme — a role looks the
// same everywhere it appears).
const ROLE_AVATAR = {
  Supervisor: 'bg-blue-100 text-blue-700',
  Surveyor: 'bg-teal-100 text-teal-700',
  FinalAuthority: 'bg-violet-100 text-violet-700',
  Investor: 'bg-slate-200 text-slate-600',
}

function initials(role, name) {
  if (name) {
    return name
      .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, '')
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
  }
  return (ROLE_LABELS[role] || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
}

export function Avatar({ role, name, size = 'md' }) {
  const dim = size === 'sm' ? 'h-7 w-7 text-[11px]' : size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${
        ROLE_AVATAR[role] || ROLE_AVATAR.Investor
      } ${dim}`}
      title={name || ROLE_LABELS[role]}
    >
      {initials(role, name)}
    </span>
  )
}

export function OverdueFlag({ small }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 font-semibold text-red-700 ${
        small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
    >
      <AlertTriangle className={small ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      Overdue
    </span>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>
}

export function Section({ title, icon: Icon, count, action, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {Icon && <Icon className="h-4 w-4 text-slate-400" />}
          {title}
          {count != null && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {count}
            </span>
          )}
        </h3>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function EmptyState({ icon: Icon = InboxIcon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

// A deterministic soft gradient for a "site photo" placeholder (self-contained,
// no network). Caption + camera glyph make it read as an inspection photo.
export function PhotoThumb({ photo, onClick }) {
  const hue = (photo.caption.length * 47) % 360
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-200 text-left"
      style={
        photo.url
          ? undefined
          : {
              background: `linear-gradient(135deg, hsl(${hue} 45% 88%), hsl(${(hue + 40) % 360} 40% 78%))`,
            }
      }
    >
      {photo.url && (
        <img src={photo.url} alt={photo.caption} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <ImageIcon className="absolute right-2 top-2 h-4 w-4 text-white/70" strokeWidth={2} />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 pb-1.5 pt-6 text-[11px] font-medium leading-tight text-white">
        {photo.caption}
      </span>
    </button>
  )
}

export function DocIcon({ type }) {
  if (type === 'image') {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-50 text-violet-600">
        <ImageIcon className="h-5 w-5" />
      </span>
    )
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-red-50 text-red-500">
      <FileText className="h-5 w-5" />
    </span>
  )
}
