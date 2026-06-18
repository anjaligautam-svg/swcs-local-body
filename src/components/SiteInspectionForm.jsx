import { useRef, useState } from 'react'
import { Upload, Plus, ClipboardCheck, MapPinned } from 'lucide-react'
import { PhotoThumb } from './common.jsx'

const RECOMMENDATIONS = [
  'Recommend approval',
  'Recommend approval with condition',
  'Recommend rejection',
  'Needs further clarification',
]
const SETBACK = ['Compliant', 'Non-compliant', 'Review required', 'N/A']

const BLANK = {
  visitRequired: true,
  structureType: '',
  builtUpAreaSqft: '',
  setbackCompliance: 'Compliant',
  observations: '',
  recommendation: '',
}

// Surveyor's structured inspection capture + mock photo uploads. Saving the
// report unlocks "Forward to Final Authority" in the action bar.
export default function SiteInspectionForm({ request, onSave, onAddPhotos }) {
  const [form, setForm] = useState({ ...BLANK, ...(request.siteReport || {}) })
  const [caption, setCaption] = useState('')
  const fileRef = useRef(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const photos = request.sitePhotos || []

  const handleFiles = (fileList) => {
    const files = Array.from(fileList).slice(0, 6)
    files.forEach((file, i) => {
      const reader = new FileReader()
      reader.onload = () => {
        onAddPhotos([
          {
            id: `${request.id}-up-${Date.now()}-${i}`,
            caption: caption.trim() || file.name.replace(/\.[^.]+$/, ''),
            url: reader.result,
            addedAt: new Date().toISOString(),
          },
        ])
      }
      reader.readAsDataURL(file)
    })
    setCaption('')
  }

  const addMockPhoto = () => {
    onAddPhotos([
      {
        id: `${request.id}-mock-${Date.now()}`,
        caption: caption.trim() || `Site view ${photos.length + 1}`,
        addedAt: new Date().toISOString(),
      },
    ])
    setCaption('')
  }

  return (
    <section className="card">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <MapPinned className="h-4 w-4 text-slate-400" />
          Site inspection
        </h3>
        {request.siteReport && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
            <ClipboardCheck className="h-3.5 w-3.5" /> Report saved
          </span>
        )}
      </header>

      <div className="space-y-4 p-4">
        {/* visit required toggle */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
          <span className="text-sm font-medium text-slate-700">Site visit required?</span>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                onClick={() => set('visitRequired', v)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  form.visitRequired === v ? 'bg-accent-600 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {v ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>

        {form.visitRequired && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Structure type</label>
              <input
                className="input"
                placeholder="e.g. RCC framed, unipole, steel shed"
                value={form.structureType}
                onChange={(e) => set('structureType', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Built-up area (sq ft)</label>
              <input
                className="input"
                placeholder="e.g. 3,400"
                value={form.builtUpAreaSqft}
                onChange={(e) => set('builtUpAreaSqft', e.target.value)}
              />
            </div>
            <div className="sm:col-span-3">
              <label className="label">Setback / compliance</label>
              <div className="flex flex-wrap gap-2">
                {SETBACK.map((s) => (
                  <button
                    key={s}
                    onClick={() => set('setbackCompliance', s)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                      form.setbackCompliance === s
                        ? 'border-accent-600 bg-accent-50 text-accent-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="label">Observations</label>
          <textarea
            rows={3}
            className="input resize-none"
            placeholder="Site condition, measurements, compliance notes…"
            value={form.observations}
            onChange={(e) => set('observations', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Recommendation</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {RECOMMENDATIONS.map((r) => (
              <button
                key={r}
                onClick={() => set('recommendation', r)}
                className={`rounded-lg border px-3 py-2 text-left text-sm font-medium ${
                  form.recommendation === r
                    ? 'border-accent-600 bg-accent-50 text-accent-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* photos */}
        <div>
          <label className="label">Site photos</label>
          {photos.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p) => (
                <PhotoThumb key={p.id} photo={p} />
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input flex-1"
              placeholder="Caption for next photo (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <button onClick={() => fileRef.current?.click()} className="btn btn-secondary">
              <Upload className="h-4 w-4" /> Upload
            </button>
            <button onClick={addMockPhoto} className="btn btn-secondary">
              <Plus className="h-4 w-4" /> Add mock
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-3">
          <button onClick={() => onSave(form)} className="btn btn-primary">
            <ClipboardCheck className="h-4 w-4" />
            {request.siteReport ? 'Update report' : 'Save report'}
          </button>
        </div>
      </div>
    </section>
  )
}
