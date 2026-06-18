import { useEffect } from 'react'
import { CheckCircle2, XCircle, Info, Bell } from 'lucide-react'
import { AppProvider, useApp } from './state/store.jsx'
import ReviewScaffold from './components/ReviewScaffold.jsx'
import Shell from './components/Shell.jsx'
import ListView, { SearchResults } from './components/Inbox.jsx'
import RequestDetail from './components/RequestDetail.jsx'
import CertificateView from './components/Certificate.jsx'

function Router() {
  const app = useApp()

  if (app.search.trim()) return <SearchResults />

  switch (app.view.name) {
    case 'detail':
      return <RequestDetail requestId={app.view.requestId} />
    case 'certificate':
      return <CertificateView requestId={app.view.requestId} />
    case 'inProgress':
      return <ListView bucket="inProgress" />
    case 'completed':
      return <ListView bucket="completed" />
    case 'rejected':
      return <ListView bucket="rejected" />
    case 'inbox':
    default:
      return <ListView bucket="inbox" />
  }
}

const TOAST_STYLE = {
  success: { cls: 'border-emerald-200 bg-white text-emerald-800', icon: CheckCircle2, ic: 'text-emerald-500' },
  danger: { cls: 'border-red-200 bg-white text-red-800', icon: XCircle, ic: 'text-red-500' },
  info: { cls: 'border-accent-200 bg-white text-accent-800', icon: Info, ic: 'text-accent-600' },
  default: { cls: 'border-slate-200 bg-white text-slate-700', icon: Bell, ic: 'text-slate-500' },
}

function Toast({ t }) {
  const app = useApp()
  useEffect(() => {
    const id = setTimeout(() => app.dismissToast(t.id), 3600)
    return () => clearTimeout(id)
  }, [t.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const s = TOAST_STYLE[t.tone] || TOAST_STYLE.default
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-pop animate-slide-in ${s.cls}`}>
      <s.icon className={`h-5 w-5 shrink-0 ${s.ic}`} />
      <span>{t.message}</span>
    </div>
  )
}

function ToastHost() {
  const app = useApp()
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2">
      {app.toasts.map((t) => (
        <Toast key={t.id} t={t} />
      ))}
    </div>
  )
}

function AppInner() {
  const app = useApp()
  return (
    // data-portal drives the per-portal accent theme (and themes the toasts too).
    <div data-portal={app.role} className="flex h-full flex-col">
      <ReviewScaffold />
      {/* keyed by role: switching personas mounts a fresh, self-contained portal */}
      <div key={app.role} className="flex min-h-0 flex-1 flex-col">
        <Shell>
          <Router />
        </Shell>
      </div>
      <ToastHost />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
