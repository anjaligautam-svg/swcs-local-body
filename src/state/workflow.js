// =============================================================================
// THE APPROVAL WORKFLOW — single source of truth.
// Every screen, the tracker, and the reminders all derive from what is here.
// A request is a state machine with: a `status`, a `currentHolder` (whose queue
// it sits in), and a full `history` of transitions. It can never be in two
// queues at once.
// =============================================================================

export const ROLES = {
  Supervisor: 'Supervisor',
  Surveyor: 'Surveyor',
  FinalAuthority: 'FinalAuthority',
  Investor: 'Investor',
}

// The three internal personas a reviewer can "become" via the role switcher.
export const INTERNAL_ROLES = [ROLES.Supervisor, ROLES.Surveyor, ROLES.FinalAuthority]

export const ROLE_LABELS = {
  Supervisor: 'Supervisor',
  Surveyor: 'Surveyor',
  FinalAuthority: 'Final Authority',
  Investor: 'Investor',
}

export const ROLE_BLURB = {
  Supervisor: 'First touch · document & eligibility check',
  Surveyor: 'Site inspection · report & photos',
  FinalAuthority: 'Final decision · certificate issuance',
  Investor: 'Applicant (external · via SWCS)',
}

export const REQUEST_TYPES = ['Advertisement', 'Fire NOC', 'Property Tax']

// -- Statuses (exact strings from the spec) ----------------------------------
export const STATUS = {
  RECEIVED: 'Received',
  CLARIFICATION_INVESTOR: 'Clarification Pending (Investor)',
  PENDING_INSPECTION: 'Pending Site Inspection',
  INSPECTION_IN_PROGRESS: 'Site Inspection In Progress',
  RETURNED_INTERNAL: 'Returned for Clarification (Internal)',
  PENDING_FINAL: 'Pending Final Decision',
  GENERATING_CERT: 'Approved – Generating Certificate',
  CERT_ISSUED: 'Certificate Issued',
  REJECTED: 'Rejected',
}

// `tone` maps to the consistent status-colour system:
//   amber = pending action · blue = in progress · green = approved/issued
//   red = rejected · slate = waiting on investor
// `stage` is the index into the 4-milestone tracker (Received → Inspection →
//   Final → Issued). -1 means "off the happy path" (rejected).
export const STATUS_META = {
  [STATUS.RECEIVED]: { holder: ROLES.Supervisor, tone: 'amber', stage: 0, label: 'Received' },
  [STATUS.RETURNED_INTERNAL]: { holder: ROLES.Supervisor, tone: 'amber', stage: 0, label: 'Returned (internal)' },
  [STATUS.CLARIFICATION_INVESTOR]: { holder: ROLES.Investor, tone: 'slate', stage: 0, label: 'With investor' },
  [STATUS.PENDING_INSPECTION]: { holder: ROLES.Surveyor, tone: 'amber', stage: 1, label: 'Pending inspection' },
  [STATUS.INSPECTION_IN_PROGRESS]: { holder: ROLES.Surveyor, tone: 'blue', stage: 1, label: 'Inspecting' },
  [STATUS.PENDING_FINAL]: { holder: ROLES.FinalAuthority, tone: 'amber', stage: 2, label: 'Pending decision' },
  [STATUS.GENERATING_CERT]: { holder: ROLES.FinalAuthority, tone: 'blue', stage: 3, label: 'Generating certificate' },
  [STATUS.CERT_ISSUED]: { holder: null, tone: 'green', stage: 4, terminal: true, label: 'Certificate issued' },
  [STATUS.REJECTED]: { holder: null, tone: 'red', stage: -1, terminal: true, label: 'Rejected' },
}

// The four happy-path milestones used by the tracker / stepper.
export const MILESTONES = [
  { key: 'received', label: 'Received', sub: 'Supervisor', role: ROLES.Supervisor },
  { key: 'inspection', label: 'Site Inspection', sub: 'Surveyor', role: ROLES.Surveyor },
  { key: 'decision', label: 'Final Decision', sub: 'Final Authority', role: ROLES.FinalAuthority },
  { key: 'issued', label: 'Certificate', sub: 'Issued to investor', role: null },
]

export const isTerminal = (status) => !!STATUS_META[status]?.terminal
export const holderOf = (status) => STATUS_META[status]?.holder ?? null

// Which statuses sit in a given internal role's inbox.
export const QUEUE_BY_ROLE = {
  [ROLES.Supervisor]: [STATUS.RECEIVED, STATUS.RETURNED_INTERNAL],
  [ROLES.Surveyor]: [STATUS.PENDING_INSPECTION, STATUS.INSPECTION_IN_PROGRESS],
  [ROLES.FinalAuthority]: [STATUS.PENDING_FINAL, STATUS.GENERATING_CERT],
}

export const isInQueueOf = (request, role) =>
  (QUEUE_BY_ROLE[role] || []).includes(request.status)

// "Has this request passed through `role`'s hands?" — i.e. they have acted on
// it at some point. This is what lets a portal see a request after it has
// forwarded/returned it, without ever seeing another tier's interface.
export const handledBy = (request, role) => request.history.some((h) => h.actorRole === role)

// Everything a single portal may legitimately see: its own current queue, plus
// any request it has handled before (now sitting elsewhere or closed).
export const visibleToRole = (request, role) =>
  isInQueueOf(request, role) || handledBy(request, role)

// Fixed per-role identity colours. These do NOT follow the portal theme — a
// role looks the same everywhere it appears (avatars, scaffold, tracker actors).
export const ROLE_COLOR = {
  [ROLES.Supervisor]: 'blue',
  [ROLES.Surveyor]: 'teal',
  [ROLES.FinalAuthority]: 'violet',
  [ROLES.Investor]: 'slate',
}

// =============================================================================
// ACTIONS — what each role may do to a request in a given status.
// Each descriptor is a pure declaration; `applyAction` performs the mutation.
//   kind:    primary | secondary | danger   (drives Von Restorff emphasis)
//   needs:   'reason' (mandatory comment) | 'siteReport' (form gate) | null
//   confirm: irreversible → requires a confirmation step
// =============================================================================

const A = {
  FORWARD_SURVEYOR: 'forwardToSurveyor',
  CLARIFY_INVESTOR: 'requestClarificationInvestor',
  FORWARD_FINAL: 'forwardToFinal',
  BACK_TO_SUPERVISOR: 'sendBackToSupervisor',
  BACK_TO_SURVEYOR: 'sendBackToSurveyor',
  REJECT: 'reject',
  APPROVE_ISSUE: 'approveIssue',
  INVESTOR_RESUBMIT: 'investorResubmit',
}
export const ACTIONS = A

// Returns the ordered action list for (request, viewing role). Order matters:
// the first `primary` is the single emphasised CTA on the screen.
export function getActions(request, role) {
  const s = request.status
  const out = []

  // -- Supervisor ----------------------------------------------------------
  if (role === ROLES.Supervisor && (s === STATUS.RECEIVED || s === STATUS.RETURNED_INTERNAL)) {
    out.push({
      id: A.FORWARD_SURVEYOR,
      label: 'Forward to Surveyor',
      kind: 'primary',
      gate: 'checklist', // enabled only once the document checklist passes
    })
    out.push({
      id: A.CLARIFY_INVESTOR,
      label: 'Request Clarification (Investor)',
      kind: 'secondary',
      needs: 'reason',
    })
  }

  // -- Surveyor ------------------------------------------------------------
  if (role === ROLES.Surveyor && (s === STATUS.PENDING_INSPECTION || s === STATUS.INSPECTION_IN_PROGRESS)) {
    out.push({
      id: A.FORWARD_FINAL,
      label: 'Forward to Final Authority',
      kind: 'primary',
      gate: 'siteReport', // enabled once the inspection report is saved
    })
    out.push({
      id: A.BACK_TO_SUPERVISOR,
      label: 'Send back to Supervisor',
      kind: 'secondary',
      needs: 'reason',
    })
    out.push({
      id: A.REJECT,
      label: 'Reject',
      kind: 'danger',
      needs: 'reason',
      reasonCategories: ['Documents insufficient', 'Site non-compliant', 'Applicant unsatisfied / unreachable'],
      confirm: true,
    })
  }

  // -- Final Authority -----------------------------------------------------
  if (role === ROLES.FinalAuthority && s === STATUS.PENDING_FINAL) {
    out.push({
      id: A.APPROVE_ISSUE,
      label: 'Approve & Issue Certificate',
      kind: 'primary',
      confirm: true,
    })
    out.push({
      id: A.BACK_TO_SURVEYOR,
      label: 'Send back to Surveyor',
      kind: 'secondary',
      needs: 'reason',
    })
    out.push({
      id: A.BACK_TO_SUPERVISOR,
      label: 'Send back to Supervisor',
      kind: 'secondary',
      needs: 'reason',
    })
    out.push({
      id: A.CLARIFY_INVESTOR,
      label: 'Request Clarification (Investor)',
      kind: 'secondary',
      needs: 'reason',
    })
    out.push({
      id: A.REJECT,
      label: 'Reject',
      kind: 'danger',
      needs: 'reason',
      reasonCategories: ['Documents insufficient', 'Site non-compliant', 'Policy / zoning conflict'],
      confirm: true,
    })
  }

  return out
}

// The simulated SWCS round-trip: any reviewer can nudge an investor-held
// request back into the module (mirrors "investor resubmits via SWCS").
export function getInvestorSimAction(request) {
  if (request.status === STATUS.CLARIFICATION_INVESTOR) {
    return {
      id: A.INVESTOR_RESUBMIT,
      label: 'Simulate: investor resubmits (via SWCS)',
      kind: 'secondary',
    }
  }
  return null
}

// -- Transition table: (action) → next status + holder -----------------------
const TRANSITIONS = {
  [A.FORWARD_SURVEYOR]: { status: STATUS.PENDING_INSPECTION, action: 'Forwarded to Surveyor' },
  [A.CLARIFY_INVESTOR]: { status: STATUS.CLARIFICATION_INVESTOR, action: 'Requested clarification from investor (→ SWCS)' },
  [A.FORWARD_FINAL]: { status: STATUS.PENDING_FINAL, action: 'Forwarded to Final Authority' },
  [A.BACK_TO_SUPERVISOR]: { status: STATUS.RETURNED_INTERNAL, action: 'Sent back to Supervisor' },
  [A.BACK_TO_SURVEYOR]: { status: STATUS.PENDING_INSPECTION, action: 'Sent back to Surveyor' },
  [A.REJECT]: { status: STATUS.REJECTED, action: 'Rejected' },
  [A.APPROVE_ISSUE]: { status: STATUS.GENERATING_CERT, action: 'Approved — generating certificate' },
  [A.INVESTOR_RESUBMIT]: { status: STATUS.RECEIVED, action: 'Investor resubmitted (← SWCS)' },
}

// Apply an action and return a NEW request (pure — no mutation in place).
// `actorRole` is who performed it; `payload` carries comment/category/etc.
export function applyAction(request, actionId, actorRole, payload = {}) {
  const t = TRANSITIONS[actionId]
  if (!t) return request

  const now = payload.now || new Date().toISOString()
  const nextStatus = t.status
  const nextHolder = holderOf(nextStatus)

  const historyEntry = {
    actorRole: actionId === A.INVESTOR_RESUBMIT ? ROLES.Investor : actorRole,
    action: t.action,
    comment: payload.comment || '',
    category: payload.category || '',
    timestamp: now,
  }

  return {
    ...request,
    status: nextStatus,
    currentHolder: nextHolder,
    daysInQueue: 0, // fresh in its new queue
    isOverdue: false,
    history: [...request.history, historyEntry],
  }
}

// Document checklist a Supervisor must clear before forwarding. Type-specific
// hooks live here so a real checklist can be slotted in per request type later.
export const DOC_CHECKLIST = {
  Advertisement: [
    'Application form complete',
    'Site ownership / lease proof attached',
    'Hoarding structural drawing attached',
    "Owner's NOC attached",
  ],
  'Fire NOC': [
    'Application form complete',
    'Approved building plan attached',
    'Fire-safety scheme attached',
    'Occupancy details provided',
  ],
  'Property Tax': [
    'Application form complete',
    'Property card / extract attached',
    'Sale deed / title document attached',
    'Prior tax receipts attached',
  ],
}
