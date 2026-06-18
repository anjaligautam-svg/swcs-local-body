// Small formatting helpers. Timestamps in mock data are ISO strings; the SLA
// "days in queue" is a separate mock number (no real scheduler in a prototype).

const MS_DAY = 86_400_000

export function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Relative "x ago" from an ISO timestamp (used in the history timeline).
export function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  return `${months}mo ago`
}

// Phrase a queue dwell time for SLA reminders.
export function dwellLabel(days) {
  if (days === 0) return 'Arrived today'
  if (days === 1) return '1 day in queue'
  return `${days} days in queue`
}

export function pluralDays(n) {
  return `${n} ${n === 1 ? 'day' : 'days'}`
}

export { MS_DAY }
