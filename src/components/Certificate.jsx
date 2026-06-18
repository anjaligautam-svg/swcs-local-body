import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Printer,
  PenLine,
  Type as TypeIcon,
  Upload,
  Eraser,
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react'
import { useApp } from '../state/store.jsx'
import { STATUS } from '../state/workflow.js'
import { formatDate } from '../lib/format.js'

const TYPE_CODE = { Advertisement: 'ADV', 'Fire NOC': 'FNOC', 'Property Tax': 'PTAX' }
const CERT_TITLE = {
  Advertisement: 'Advertisement Hoarding Permit',
  'Fire NOC': 'Fire No-Objection Certificate',
  'Property Tax': 'Property Tax Assessment Certificate',
}
const CERT_CLAUSE = {
  Advertisement:
    'is hereby permitted to erect and display the advertisement hoarding described above, subject to the byelaws of the Authority.',
  'Fire NOC':
    'is hereby granted a No-Objection Certificate from a fire-safety standpoint for the premises described above.',
  'Property Tax':
    'has been assessed for property tax in respect of the premises described above, as recorded in the Authority’s register.',
}

function certNumber(r) {
  const digits = (r.id.match(/\d+/g) || ['0000']).join('').slice(-4).padStart(4, '0')
  return `NMRDA/${TYPE_CODE[r.type] || 'GEN'}/2026/${digits}`
}

// ---- placeholder marks (self-contained SVG) --------------------------------
function NmrdaLogo({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#1e3a8a" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="1" />
      <path d="M20 40V28l12-8 12 8v12h-7v-9h-10v9z" fill="#fff" />
      <rect x="29" y="34" width="6" height="6" fill="#1e3a8a" />
    </svg>
  )
}

function Seal({ className = '' }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="none" stroke="#1e3a8a" strokeWidth="2" />
      <circle cx="60" cy="60" r="46" fill="none" stroke="#1e3a8a" strokeWidth="1" />
      <circle cx="60" cy="60" r="30" fill="#1e3a8a" fillOpacity="0.06" />
      <text x="60" y="50" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e3a8a">NMRDA</text>
      <text x="60" y="66" textAnchor="middle" fontSize="7" fill="#1e3a8a" letterSpacing="0.5">LOCAL BODY</text>
      <text x="60" y="76" textAnchor="middle" fontSize="7" fill="#1e3a8a" letterSpacing="0.5">AUTHORITY</text>
      <text x="60" y="98" textAnchor="middle" fontSize="6" fill="#1e3a8a" letterSpacing="1">★ SWCS ★</text>
      {/* arc text top */}
      <path id="arc" d="M22 60a38 38 0 0 1 76 0" fill="none" />
      <text fontSize="6.5" fill="#1e3a8a" letterSpacing="1.5">
        <textPath href="#arc" startOffset="6%">SINGLE WINDOW CLEARANCE SYSTEM</textPath>
      </text>
    </svg>
  )
}

// Deterministic QR-like matrix (no real encoding — verification placeholder).
function QrPlaceholder({ seed, size = 84 }) {
  const n = 21
  let s = 0
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0
  const lcg = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff), (s >> 8) & 1)
  const cell = size / n
  const rects = []
  const isFinder = (x, y) =>
    (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7)
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (isFinder(x, y)) continue
      if (lcg()) rects.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#0f172a" />)
    }
  const finder = (ox, oy) => (
    <g key={`f${ox}-${oy}`}>
      <rect x={ox * cell} y={oy * cell} width={cell * 7} height={cell * 7} fill="#0f172a" />
      <rect x={(ox + 1) * cell} y={(oy + 1) * cell} width={cell * 5} height={cell * 5} fill="#fff" />
      <rect x={(ox + 2) * cell} y={(oy + 2) * cell} width={cell * 3} height={cell * 3} fill="#0f172a" />
    </g>
  )
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded">
      <rect width={size} height={size} fill="#fff" />
      {rects}
      {finder(0, 0)}
      {finder(n - 7, 0)}
      {finder(0, n - 7)}
    </svg>
  )
}

// ---- signature pad ---------------------------------------------------------
function SignaturePad({ value, onChange }) {
  const [mode, setMode] = useState('draw')
  const [typed, setTyped] = useState('')
  const canvasRef = useRef(null)
  const drawing = useRef(false)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0f172a'
  }, [mode])

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const t = e.touches?.[0]
    return { x: (t?.clientX ?? e.clientX) - rect.left, y: (t?.clientY ?? e.clientY) - rect.top }
  }
  const start = (e) => {
    drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }
  const move = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    onChange({ dataUrl: canvasRef.current.toDataURL('image/png'), text: '' })
  }
  const clear = () => {
    const c = canvasRef.current
    c?.getContext('2d').clearRect(0, 0, c.width, c.height)
    onChange({ dataUrl: null, text: '' })
  }
  const onUpload = (file) => {
    const reader = new FileReader()
    reader.onload = () => onChange({ dataUrl: reader.result, text: '' })
    reader.readAsDataURL(file)
  }

  const Tab = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setMode(id)}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
        mode === id ? 'bg-accent-600 text-white' : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-1">
        <Tab id="draw" icon={PenLine} label="Draw" />
        <Tab id="type" icon={TypeIcon} label="Type" />
        <Tab id="upload" icon={Upload} label="Upload" />
        {mode === 'draw' && (
          <button onClick={clear} className="btn btn-ghost ml-auto h-8 text-xs">
            <Eraser className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {mode === 'draw' && (
        <canvas
          ref={canvasRef}
          width={420}
          height={120}
          className="w-full cursor-crosshair touch-none rounded-lg border border-dashed border-slate-300 bg-slate-50"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      )}
      {mode === 'type' && (
        <div>
          <input
            className="input"
            placeholder="Type full name to sign"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value)
              onChange({ dataUrl: null, text: e.target.value })
            }}
          />
          {typed && (
            <p className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-2xl text-slate-800" style={{ fontFamily: 'Segoe Script, "Brush Script MT", cursive' }}>
              {typed}
            </p>
          )}
        </div>
      )}
      {mode === 'upload' && (
        <label className="flex h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 hover:bg-slate-100">
          <Upload className="mb-1 h-5 w-5" />
          {value?.dataUrl ? 'Replace signature image' : 'Click to upload a signature image'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        </label>
      )}
    </div>
  )
}

function SignatureMark({ cert, sig }) {
  const dataUrl = cert?.signatureDataUrl ?? sig?.dataUrl
  const text = cert?.signatureText ?? sig?.text
  if (dataUrl) return <img src={dataUrl} alt="signature" className="h-12 object-contain" />
  if (text)
    return (
      <span className="text-2xl text-slate-800" style={{ fontFamily: 'Segoe Script, "Brush Script MT", cursive' }}>
        {text}
      </span>
    )
  return <span className="text-sm italic text-slate-300">— unsigned —</span>
}

export default function CertificateView({ requestId }) {
  const app = useApp()
  const r = app.requestById(requestId)
  const [sig, setSig] = useState({ dataUrl: null, text: '' })
  const [signer, setSigner] = useState('A. Wankhede')

  if (!r) return <div className="p-10 text-center text-slate-500">Request not found.</div>

  const issued = r.status === STATUS.CERT_ISSUED && r.certificate
  const number = issued ? r.certificate.number : certNumber(r)
  const issueDate = issued ? r.certificate.issuedAt : new Date().toISOString()
  const hasSig = !!(sig.dataUrl || sig.text.trim())
  const canIssue = hasSig && signer.trim()

  const issue = () => {
    if (!canIssue) return
    app.issueCertificate(r, {
      number,
      signerName: signer.trim(),
      signatureDataUrl: sig.dataUrl,
      signatureText: sig.dataUrl ? null : sig.text.trim(),
    })
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* toolbar (not printed) */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => app.back()} className="btn btn-ghost -ml-2 h-8 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          {issued ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <BadgeCheck className="h-4 w-4" /> Certificate issued
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              <ShieldCheck className="h-4 w-4" /> Ready to issue
            </span>
          )}
          <button onClick={() => window.print()} className="btn btn-secondary">
            <Printer className="h-4 w-4" /> Print / Download
          </button>
          {!issued && (
            <button onClick={issue} disabled={!canIssue} className="btn btn-primary">
              <BadgeCheck className="h-4 w-4" /> Issue certificate
            </button>
          )}
        </div>
      </div>

      {/* signing controls before issue (not printed) */}
      {!issued && (
        <div className="no-print mb-5 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <div>
            <label className="label">Final Authority — name</label>
            <input className="input" value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="Signing officer's name" />
            <p className="mt-2 text-xs text-slate-400">
              UI placeholder only — not a legally-binding digital signature (DSC). That integration is out of scope for this prototype.
            </p>
          </div>
          <div>
            <label className="label">E-signature</label>
            <SignaturePad value={sig} onChange={setSig} />
          </div>
        </div>
      )}

      {/* ---- the printable certificate sheet ---- */}
      <div className="print-sheet relative mx-auto overflow-hidden rounded-xl border-2 border-accent-800 bg-white p-8 shadow-card">
        {/* watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
          <NmrdaLogo className="h-80 w-80" />
        </div>

        <div className="relative">
          {/* header */}
          <div className="flex items-center gap-4 border-b-2 border-accent-800 pb-4">
            <NmrdaLogo className="h-16 w-16 shrink-0" />
            <div className="flex-1 text-center">
              <h1 className="text-lg font-bold uppercase tracking-wide text-accent-900">
                Nagpur Metropolitan Region Development Authority
              </h1>
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
                Local Body · Single Window Clearance System
              </p>
            </div>
            <div className="w-16 shrink-0" />
          </div>

          {/* title */}
          <div className="mt-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Certificate of Approval</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-800">{CERT_TITLE[r.type]}</h2>
          </div>

          {/* body */}
          <p className="mx-auto mt-6 max-w-2xl text-center text-[15px] leading-7 text-slate-700">
            This is to certify that <span className="font-semibold">{r.applicantName}</span>{' '}
            (<span className="font-semibold">{r.businessName}</span>), in respect of the premises at{' '}
            <span className="font-semibold">{r.address}</span>, {CERT_CLAUSE[r.type]}
          </p>

          {/* details grid */}
          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-3 rounded-lg bg-slate-50 px-6 py-4 text-sm">
            <Detail k="Certificate No." v={number} mono />
            <Detail k="Request ID" v={r.id} mono />
            <Detail k="Request type" v={r.type} />
            <Detail k="Date of issue" v={formatDate(issueDate)} />
          </div>

          {/* footer: QR · seal · signature */}
          <div className="mt-8 flex items-end justify-between gap-6">
            <div className="text-center">
              <QrPlaceholder seed={number} />
              <p className="mt-1 max-w-[90px] text-[9px] leading-tight text-slate-400">Scan to verify authenticity</p>
            </div>

            <Seal className="h-24 w-24 shrink-0 opacity-90" />

            <div className="min-w-[180px] text-center">
              <div className="flex h-14 items-end justify-center border-b border-slate-300 pb-1">
                <SignatureMark cert={issued ? r.certificate : null} sig={sig} />
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {issued ? r.certificate.signerName : signer || '—'}
              </p>
              <p className="text-xs text-slate-500">Final Authority, NMRDA</p>
            </div>
          </div>

          <p className="mt-6 border-t border-dashed border-slate-200 pt-3 text-center text-[10px] text-slate-400">
            Issued electronically through the SWCS Local Body module. This is a computer-generated certificate
            and is a prototype placeholder, not a legally valid document.
          </p>
        </div>
      </div>

      {issued && (
        <div className="no-print mt-4 text-center text-sm text-slate-500">
          Certificate issued and returned to the investor via SWCS.{' '}
          <button onClick={() => app.goList('completed')} className="font-semibold text-accent-600 underline">
            View completed requests
          </button>
        </div>
      )}
    </div>
  )
}

function Detail({ k, v, mono }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-200/70 pb-1">
      <span className="text-slate-400">{k}</span>
      <span className={`font-semibold text-slate-700 ${mono ? 'font-mono text-[13px]' : ''}`}>{v}</span>
    </div>
  )
}
