import { useEffect, useState } from 'react'
import { X, AlertTriangle, ShieldCheck } from 'lucide-react'

export function Modal({ title, subtitle, onClose, children, width = 'max-w-lg' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className={`w-full ${width} animate-fade-in rounded-2xl bg-white shadow-pop`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn btn-ghost -mr-2 -mt-1 h-8 w-8 !px-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// One dialog drives every guarded action: mandatory reason (with optional
// category) for send-back / clarification / reject, and a confirm step for
// irreversible actions. Error prevention by design.
export function ActionDialog({ action, request, onConfirm, onClose }) {
  const [comment, setComment] = useState('')
  const [category, setCategory] = useState(action.reasonCategories?.[0] || '')

  const isDanger = action.kind === 'danger'
  const needsReason = action.needs === 'reason'
  const canSubmit = needsReason ? comment.trim().length > 0 : true

  const submit = () => {
    if (!canSubmit) return
    onConfirm({ comment: comment.trim(), category })
  }

  const subtitle = `${request.id} · ${request.applicantName} · ${request.type}`

  return (
    <Modal title={action.label} subtitle={subtitle} onClose={onClose}>
      <div className="space-y-4 px-5 py-4">
        {/* Context banner — confirmation framing for irreversible actions */}
        {action.confirm && (
          <div
            className={`flex gap-3 rounded-lg border p-3 text-sm ${
              isDanger
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-accent-200 bg-accent-50 text-accent-800'
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p>
              {isDanger
                ? 'This is final. A rejected request ends here and is sent back to SWCS with the reason below.'
                : 'This will generate the certificate and issue it to the investor via SWCS.'}
            </p>
          </div>
        )}

        {action.reasonCategories && (
          <div>
            <label className="label">Reason category</label>
            <div className="flex flex-wrap gap-2">
              {action.reasonCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    category === c
                      ? 'border-accent-600 bg-accent-50 text-accent-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {needsReason && (
          <div>
            <label className="label">
              {isDanger ? 'Reason for rejection' : 'Comment to recipient'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              autoFocus
              rows={4}
              className="input resize-none"
              placeholder={
                isDanger
                  ? 'State clearly why this is being rejected…'
                  : 'Explain what is needed and why…'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">
              Mandatory — captured in the request history and shown to the recipient.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-5 py-3">
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className={`btn ${isDanger ? 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400' : 'btn-primary'}`}
        >
          {action.label}
        </button>
      </div>
    </Modal>
  )
}
