import { FolderClosed, UserRound, HardHat, Camera } from 'lucide-react'
import { ROLES, ROLE_LABELS } from '../state/workflow.js'
import { DocIcon, PhotoThumb, Avatar } from './common.jsx'
import { formatDate } from '../lib/format.js'

function DocRow({ doc }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:border-slate-200 hover:bg-slate-50">
      <DocIcon type={doc.type} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">
          {doc.name}
          {doc.version > 1 && (
            <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
              v{doc.version} · replaced
            </span>
          )}
        </p>
        <p className="text-xs text-slate-400">
          {ROLE_LABELS[doc.addedByRole]} · {formatDate(doc.addedAt)}
        </p>
      </div>
    </div>
  )
}

function Group({ icon: Icon, title, who, count, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50">
      <header className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
        <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-400">
          {count}
        </span>
        {who && <span className="ml-auto text-[11px] text-slate-400">{who}</span>}
      </header>
      <div className="space-y-2 p-3">{children}</div>
    </div>
  )
}

// Consolidated, growing file. Grouped by source tier (common region) so it is
// obvious what each tier contributed as the request climbs.
export default function DocumentStack({ request }) {
  const applicantDocs = request.documents.filter((d) => d.addedByRole === ROLES.Investor)
  const surveyorDocs = request.documents.filter((d) => d.addedByRole === ROLES.Surveyor)
  const finalDocs = request.documents.filter((d) => d.addedByRole === ROLES.FinalAuthority)
  const photos = request.sitePhotos || []

  return (
    <div className="space-y-3">
      <Group icon={UserRound} title="Applicant documents" who="from SWCS" count={applicantDocs.length}>
        {applicantDocs.length ? (
          applicantDocs.map((d) => <DocRow key={d.id} doc={d} />)
        ) : (
          <p className="px-1 py-2 text-xs text-slate-400">No applicant documents.</p>
        )}
      </Group>

      {(surveyorDocs.length > 0 || photos.length > 0) && (
        <Group
          icon={HardHat}
          title="Surveyor — site inspection"
          who={ROLE_LABELS[ROLES.Surveyor]}
          count={surveyorDocs.length + photos.length}
        >
          {surveyorDocs.map((d) => (
            <DocRow key={d.id} doc={d} />
          ))}
          {photos.length > 0 && (
            <div>
              <p className="mb-2 mt-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <Camera className="h-3.5 w-3.5" /> Site photos
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((p) => (
                  <PhotoThumb key={p.id} photo={p} />
                ))}
              </div>
            </div>
          )}
        </Group>
      )}

      {finalDocs.length > 0 && (
        <Group icon={FolderClosed} title="Final Authority" count={finalDocs.length}>
          {finalDocs.map((d) => (
            <DocRow key={d.id} doc={d} />
          ))}
        </Group>
      )}
    </div>
  )
}
