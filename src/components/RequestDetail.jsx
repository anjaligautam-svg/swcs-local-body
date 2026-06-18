import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  UserRound,
  MapPin,
  CalendarClock,
  ClipboardList,
  CheckSquare,
  Square,
  FileCheck2,
  Info,
  BellRing,
  Lock,
} from 'lucide-react'
import { useApp } from '../state/store.jsx'
import {
  getActions,
  getInvestorSimAction,
  ACTIONS,
  DOC_CHECKLIST,
  STATUS,
  ROLES,
  ROLE_LABELS,
  holderOf,
  isInQueueOf,
  isTerminal,
} from '../state/workflow.js'
import { StatusBadge, TypeBadge, OverdueFlag, Avatar, Section } from './common.jsx'
import { dwellLabel, pluralDays } from '../lib/format.js'
import ApprovalTracker from './ApprovalTracker.jsx'
import DocumentStack from './DocumentStack.jsx'
import SiteInspectionForm from './SiteInspectionForm.jsx'
import { ActionDialog } from './Dialogs.jsx'

const REC_TONE = (rec = '') =>
  /rejection/i.test(rec)
    ? 'bg-red-50 text-red-700 border-red-200'
    : /condition/i.test(rec)
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : /clarification/i.test(rec)
    ? 'bg-slate-100 text-slate-600 border-slate-200'
    : /approval/i.test(rec)
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-slate-100 text-slate-600 border-slate-200'

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-700">{value || '—'}</dd>
    </div>
  )
}

function ApplicantCard({ r }) {
  const overdue = !isTerminal(r.status) && r.daysInQueue > r.slaDays
  return (
    <Section title="Applicant & request" icon={UserRound}>
      <dl className="grid grid-cols-2 gap-4">
        <Field label="Applicant" value={r.applicantName} />
        <Field label="Business" value={r.businessName} />
        <Field label="Request type" value={<TypeBadge type={r.type} />} />
        <Field label="Request ID" value={<span className="font-mono">{r.id}</span>} />
        <div className="col-span-2 flex items-start gap-1.5 text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          {r.address}
        </div>
        {!isTerminal(r.status) && (
          <div className="col-span-2 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <CalendarClock className="h-4 w-4 text-slate-400" />
            <span className="text-slate-600">
              {dwellLabel(r.daysInQueue)} · SLA {pluralDays(r.slaDays)}
            </span>
            {overdue && <OverdueFlag small />}
            <span className="ml-auto text-xs text-slate-400">
              Holder: <span className="font-medium text-slate-600">{ROLE_LABELS[holderOf(r.status)] || '—'}</span>
            </span>
          </div>
        )}
      </dl>
    </Section>
  )
}

function DocumentChecklist({ r, checked, toggle }) {
  const items = DOC_CHECKLIST[r.type] || []
  const done = items.filter((i) => checked[i]).length
  return (
    <Section
      title="Document & eligibility check"
      icon={ClipboardList}
      action={
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            done === items.length ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}
        >
          {done}/{items.length} verified
        </span>
      }
    >
      <ul className="space-y-1">
        {items.map((item) => {
          const on = !!checked[item]
          return (
            <li key={item}>
              <button
                onClick={() => toggle(item)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
              >
                {on ? (
                  <CheckSquare className="h-5 w-5 shrink-0 text-accent-600" />
                ) : (
                  <Square className="h-5 w-5 shrink-0 text-slate-300" />
                )}
                <span className={on ? 'text-slate-700' : 'text-slate-500'}>{item}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 px-2 text-xs text-slate-400">
        Tick every item to enable <span className="font-medium text-slate-500">Forward to Surveyor</span>.
      </p>
    </Section>
  )
}

function SiteReportSummary({ r }) {
  const sr = r.siteReport
  if (!sr) return null
  return (
    <Section title="Site inspection report" icon={FileCheck2}>
      <dl className="grid grid-cols-2 gap-4">
        <Field label="Visit required" value={sr.visitRequired ? 'Yes' : 'No'} />
        <Field label="Structure type" value={sr.structureType} />
        <Field label="Built-up area" value={sr.builtUpAreaSqft ? `${sr.builtUpAreaSqft} sq ft` : '—'} />
        <Field label="Setback / compliance" value={sr.setbackCompliance} />
        <div className="col-span-2">
          <Field label="Observations" value={sr.observations} />
        </div>
        {sr.recommendation && (
          <div className="col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recommendation</dt>
            <dd className={`mt-1 inline-flex rounded-lg border px-2.5 py-1 text-sm font-semibold ${REC_TONE(sr.recommendation)}`}>
              {sr.recommendation}
            </dd>
          </div>
        )}
      </dl>
    </Section>
  )
}

function ActionBar({ r, actions, gates, onAct }) {
  const app = useApp()
  const simAction = getInvestorSimAction(r)
  const holder = holderOf(r.status)
  const iHandled = r.history.some((h) => h.actorRole === app.role)

  // No actions for this viewer → this request has moved on (it is in your
  // "In Progress"/closed lists). Read-only: show where it is + let you nudge.
  if (actions.length === 0) {
    return (
      <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <Lock className="h-4 w-4 text-slate-400" />
          {isTerminal(r.status) ? (
            <p className="text-sm text-slate-500">
              This request is closed ({r.status}). No further action.
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              You have actioned this — it has moved on and is no longer in your queue.
              <span className="ml-1 text-slate-400">Currently with the {ROLE_LABELS[holder]}.</span>
            </p>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!isTerminal(r.status) && iHandled && holder && holder !== app.role && (
              <button onClick={() => app.nudge(r)} className="btn btn-secondary">
                <BellRing className="h-4 w-4" /> Nudge the {ROLE_LABELS[holder]}
              </button>
            )}
            {simAction && (
              <button onClick={() => onAct(simAction)} className="btn btn-secondary">
                {simAction.label}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const primary = actions.find((a) => a.kind === 'primary')
  const secondary = actions.filter((a) => a.kind === 'secondary')
  const danger = actions.find((a) => a.kind === 'danger')

  const gateOk = (a) =>
    a.gate === 'checklist' ? gates.checklist : a.gate === 'siteReport' ? gates.siteReport : true
  const gateHint = (a) =>
    a.gate === 'checklist'
      ? 'Complete the document check first'
      : a.gate === 'siteReport'
      ? 'Save the inspection report first'
      : ''

  return (
    <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {/* secondary + danger on the left, de-emphasised */}
        {secondary.map((a) => (
          <button key={a.id} onClick={() => onAct(a)} className="btn btn-secondary">
            {a.label}
          </button>
        ))}
        {danger && (
          <button onClick={() => onAct(danger)} className="btn btn-danger">
            {danger.label}
          </button>
        )}

        {/* single emphasised primary CTA on the right (Fitts + Von Restorff) */}
        {primary && (
          <div className="ml-auto flex flex-col items-end">
            <button
              onClick={() => onAct(primary)}
              disabled={!gateOk(primary)}
              className="btn btn-primary px-5 py-2.5 text-base shadow-card"
            >
              {primary.label}
            </button>
            {!gateOk(primary) && <span className="mt-1 text-xs text-amber-600">{gateHint(primary)}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function RequestDetail({ requestId }) {
  const app = useApp()
  const r = app.requestById(requestId)
  const [checked, setChecked] = useState({})
  const [dialog, setDialog] = useState(null)

  const actions = useMemo(() => (r ? getActions(r, app.role) : []), [r, app.role])

  if (!r) {
    return (
      <div className="p-10 text-center text-slate-500">
        Request not found.{' '}
        <button onClick={() => app.goList('inbox')} className="text-accent-600 underline">
          Back to inbox
        </button>
      </div>
    )
  }

  const isSupervisorActing = app.role === ROLES.Supervisor && isInQueueOf(r, ROLES.Supervisor)
  const isSurveyorActing = app.role === ROLES.Surveyor && isInQueueOf(r, ROLES.Surveyor)

  const checklistItems = DOC_CHECKLIST[r.type] || []
  const checklistOk = checklistItems.every((i) => checked[i])
  const siteReportOk = !!(r.siteReport && r.siteReport.recommendation)
  const gates = { checklist: checklistOk, siteReport: siteReportOk }

  const onAct = (action) => {
    if (action.needs === 'reason' || action.confirm) {
      setDialog(action)
    } else {
      app.doAction(r, action.id)
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-5xl flex-1 p-6">
        {/* header */}
        <button onClick={() => app.back()} className="btn btn-ghost mb-3 -ml-2 h-8 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Avatar role={ROLES.Investor} name={r.applicantName} size="lg" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">{r.applicantName}</h1>
              <p className="text-sm text-slate-500">
                {r.businessName} · <span className="font-mono text-xs">{r.id}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TypeBadge type={r.type} />
            <StatusBadge status={r.status} size="md" />
          </div>
        </div>

        {/* tracker */}
        <div className="mb-5">
          <ApprovalTracker request={r} />
        </div>

        {/* role hint banner */}
        {(isSupervisorActing || isSurveyorActing || (app.role === ROLES.FinalAuthority && isInQueueOf(r, ROLES.FinalAuthority))) && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {isSupervisorActing && 'Verify the applicant documents, then forward to the Surveyor — or send back to the investor for clarification.'}
              {isSurveyorActing && 'Record the site inspection and recommendation, then forward to the Final Authority.'}
              {app.role === ROLES.FinalAuthority && isInQueueOf(r, ROLES.FinalAuthority) && 'Review the complete file and take the final decision. Issuing generates the certificate.'}
            </span>
          </div>
        )}

        {/* body grid */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {isSurveyorActing ? (
              <SiteInspectionForm
                request={r}
                onSave={(report) => app.saveSiteReport(r, report)}
                onAddPhotos={(photos) => app.addPhotos(r, photos)}
              />
            ) : (
              <SiteReportSummary r={r} />
            )}
            <Section title="Document stack" icon={ClipboardList} count={r.documents.length + (r.sitePhotos?.length || 0)}>
              <DocumentStack request={r} />
            </Section>
          </div>

          <div className="space-y-5">
            <ApplicantCard r={r} />
            {isSupervisorActing && (
              <DocumentChecklist
                r={r}
                checked={checked}
                toggle={(item) => setChecked((c) => ({ ...c, [item]: !c[item] }))}
              />
            )}
          </div>
        </div>
      </div>

      <ActionBar r={r} actions={actions} gates={gates} onAct={onAct} />

      {dialog && (
        <ActionDialog
          action={dialog}
          request={r}
          onClose={() => setDialog(null)}
          onConfirm={(payload) => {
            app.doAction(r, dialog.id, payload)
            setDialog(null)
          }}
        />
      )}
    </div>
  )
}
