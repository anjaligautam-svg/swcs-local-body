// =============================================================================
// Mock seed data — ~12 requests across the 3 request types and spread across
// the workflow so every queue and every screen has something to show.
// No backend: this is the entire "database".
// =============================================================================
import { STATUS, ROLES } from '../state/workflow.js'

// -- builders ----------------------------------------------------------------
function docs(reqId, addedByRole, addedAt, list) {
  return list.map(([name, type = 'pdf'], i) => ({
    id: `${reqId}-${addedByRole}-D${i + 1}`,
    name,
    addedByRole,
    addedAt,
    type,
    version: 1,
  }))
}

function photos(reqId, addedAt, captions) {
  return captions.map((caption, i) => ({
    id: `${reqId}-P${i + 1}`,
    caption,
    addedAt,
  }))
}

// Applicant document sets per request type (what arrives from SWCS).
const APPLICANT_DOCS = {
  Advertisement: [
    ['Application Form (Form A-7).pdf'],
    ['Site Ownership Proof.pdf'],
    ['Hoarding Structural Drawing.pdf', 'image'],
    ["Owner's NOC.pdf"],
    ['Location Plan.pdf', 'image'],
  ],
  'Fire NOC': [
    ['Application Form (Fire-1).pdf'],
    ['Approved Building Plan.pdf', 'image'],
    ['Fire Safety Scheme.pdf'],
    ['Occupancy Details.pdf'],
    ['Structural Stability Certificate.pdf'],
  ],
  'Property Tax': [
    ['Self-Assessment Form.pdf'],
    ['Property Card / Extract.pdf'],
    ['Sale Deed.pdf'],
    ['Occupancy Certificate.pdf'],
    ['Prior Tax Receipts.pdf'],
  ],
}

const SURVEYOR_REPORT = (reqId, at) =>
  docs(reqId, ROLES.Surveyor, at, [['Site Inspection Report.pdf']])

// Shorthand for the inbound-from-SWCS history entry.
const inbound = (at) => ({
  actorRole: ROLES.Investor,
  action: 'Received from SWCS platform',
  comment: '',
  category: '',
  timestamp: at,
})

const h = (actorRole, action, timestamp, comment = '', category = '') => ({
  actorRole,
  action,
  comment,
  category,
  timestamp,
})

// -- the requests ------------------------------------------------------------
function buildRequests() {
  return [
    // 1 — Supervisor inbox · fresh
    {
      id: 'LB-ADV-3012',
      applicantName: 'Rohan Deshmukh',
      businessName: 'Skyline Outdoor Media Pvt. Ltd.',
      type: 'Advertisement',
      address: 'Plot 14, Wardha Road, Nagpur',
      status: STATUS.RECEIVED,
      currentHolder: ROLES.Supervisor,
      daysInQueue: 1,
      slaDays: 3,
      documents: docs('LB-ADV-3012', ROLES.Investor, '2026-06-17T09:40:00', APPLICANT_DOCS.Advertisement),
      sitePhotos: [],
      siteReport: null,
      history: [inbound('2026-06-17T09:40:00')],
      certificate: null,
    },

    // 2 — Supervisor inbox · OVERDUE
    {
      id: 'LB-FNOC-3025',
      applicantName: 'Meera Joshi',
      businessName: 'Orange City Mall',
      type: 'Fire NOC',
      address: 'Civil Lines, Nagpur',
      status: STATUS.RECEIVED,
      currentHolder: ROLES.Supervisor,
      daysInQueue: 5,
      slaDays: 3,
      documents: docs('LB-FNOC-3025', ROLES.Investor, '2026-06-13T11:10:00', APPLICANT_DOCS['Fire NOC']),
      sitePhotos: [],
      siteReport: null,
      history: [inbound('2026-06-13T11:10:00')],
      certificate: null,
    },

    // 3 — Supervisor inbox · returned by Surveyor (internal loop)
    {
      id: 'LB-PTAX-3008',
      applicantName: 'Anil Kumar',
      businessName: 'Kumar Textiles',
      type: 'Property Tax',
      address: 'Itwari, Nagpur',
      status: STATUS.RETURNED_INTERNAL,
      currentHolder: ROLES.Supervisor,
      daysInQueue: 2,
      slaDays: 4,
      documents: docs('LB-PTAX-3008', ROLES.Investor, '2026-06-12T10:00:00', APPLICANT_DOCS['Property Tax']),
      sitePhotos: [],
      siteReport: null,
      history: [
        inbound('2026-06-12T10:00:00'),
        h(ROLES.Supervisor, 'Forwarded to Surveyor', '2026-06-13T14:20:00'),
        h(
          ROLES.Surveyor,
          'Sent back to Supervisor',
          '2026-06-16T16:05:00',
          'Sale deed appears to be for an adjacent plot. Please re-verify the property boundaries with the applicant before site visit.',
        ),
      ],
      certificate: null,
    },

    // 4 — Out to investor (waiting on SWCS round-trip)
    {
      id: 'LB-ADV-2994',
      applicantName: 'Sana Sheikh',
      businessName: 'Vision Ads & Signage',
      type: 'Advertisement',
      address: 'Sitabuldi, Nagpur',
      status: STATUS.CLARIFICATION_INVESTOR,
      currentHolder: ROLES.Investor,
      daysInQueue: 3,
      slaDays: 5,
      documents: docs('LB-ADV-2994', ROLES.Investor, '2026-06-11T09:15:00', APPLICANT_DOCS.Advertisement),
      sitePhotos: [],
      siteReport: null,
      history: [
        inbound('2026-06-11T09:15:00'),
        h(
          ROLES.Supervisor,
          'Requested clarification from investor (→ SWCS)',
          '2026-06-15T12:30:00',
          "Owner's NOC is unsigned. Please upload a signed copy and confirm the hoarding dimensions.",
        ),
      ],
      certificate: null,
    },

    // 5 — Surveyor inbox · fresh
    {
      id: 'LB-FNOC-3030',
      applicantName: 'Vikram Rao',
      businessName: 'Rao Hospitality',
      type: 'Fire NOC',
      address: 'Dharampeth, Nagpur',
      status: STATUS.PENDING_INSPECTION,
      currentHolder: ROLES.Surveyor,
      daysInQueue: 1,
      slaDays: 4,
      documents: docs('LB-FNOC-3030', ROLES.Investor, '2026-06-15T08:50:00', APPLICANT_DOCS['Fire NOC']),
      sitePhotos: [],
      siteReport: null,
      history: [
        inbound('2026-06-15T08:50:00'),
        h(ROLES.Supervisor, 'Forwarded to Surveyor', '2026-06-17T10:15:00', 'Documents verified and complete.'),
      ],
      certificate: null,
    },

    // 6 — Surveyor inbox · OVERDUE
    {
      id: 'LB-PTAX-2980',
      applicantName: 'Prakash Bhonsle',
      businessName: 'Bhonsle Estates',
      type: 'Property Tax',
      address: 'Manish Nagar, Nagpur',
      status: STATUS.PENDING_INSPECTION,
      currentHolder: ROLES.Surveyor,
      daysInQueue: 6,
      slaDays: 4,
      documents: docs('LB-PTAX-2980', ROLES.Investor, '2026-06-09T13:25:00', APPLICANT_DOCS['Property Tax']),
      sitePhotos: [],
      siteReport: null,
      history: [
        inbound('2026-06-09T13:25:00'),
        h(ROLES.Supervisor, 'Forwarded to Surveyor', '2026-06-12T11:40:00'),
      ],
      certificate: null,
    },

    // 7 — Surveyor inbox · inspection in progress (draft report + photos)
    {
      id: 'LB-ADV-3001',
      applicantName: 'Imran Khan',
      businessName: 'Metro Hoardings',
      type: 'Advertisement',
      address: 'Sadar, Nagpur',
      status: STATUS.INSPECTION_IN_PROGRESS,
      currentHolder: ROLES.Surveyor,
      daysInQueue: 2,
      slaDays: 4,
      documents: [
        ...docs('LB-ADV-3001', ROLES.Investor, '2026-06-13T09:00:00', APPLICANT_DOCS.Advertisement),
        ...SURVEYOR_REPORT('LB-ADV-3001', '2026-06-17T15:30:00'),
      ],
      sitePhotos: photos('LB-ADV-3001', '2026-06-17T15:30:00', [
        'North elevation — proposed hoarding location',
        'Road setback from carriageway',
      ]),
      siteReport: {
        visitRequired: true,
        structureType: 'Cantilever / unipole',
        builtUpAreaSqft: '',
        setbackCompliance: 'Compliant',
        observations:
          'Proposed unipole sits 4.2 m from the carriageway edge. No overhead utility conflict observed. Foundation pit not yet excavated.',
        recommendation: '',
      },
      history: [
        inbound('2026-06-13T09:00:00'),
        h(ROLES.Supervisor, 'Forwarded to Surveyor', '2026-06-16T10:30:00'),
        h(ROLES.Surveyor, 'Site inspection report saved (draft)', '2026-06-17T15:30:00'),
      ],
      certificate: null,
    },

    // 8 — Final Authority inbox · complete file
    {
      id: 'LB-FNOC-2966',
      applicantName: 'Dr. Kavita Nair',
      businessName: 'Nair Diagnostics',
      type: 'Fire NOC',
      address: 'Ramdaspeth, Nagpur',
      status: STATUS.PENDING_FINAL,
      currentHolder: ROLES.FinalAuthority,
      daysInQueue: 2,
      slaDays: 3,
      documents: [
        ...docs('LB-FNOC-2966', ROLES.Investor, '2026-06-10T09:00:00', APPLICANT_DOCS['Fire NOC']),
        ...SURVEYOR_REPORT('LB-FNOC-2966', '2026-06-15T16:00:00'),
      ],
      sitePhotos: photos('LB-FNOC-2966', '2026-06-15T16:00:00', [
        'Main entrance & assembly point',
        'Fire extinguisher placement — ground floor',
        'Emergency exit signage — first floor',
      ]),
      siteReport: {
        visitRequired: true,
        structureType: 'RCC framed — 2 storey',
        builtUpAreaSqft: '3,400',
        setbackCompliance: 'Compliant',
        observations:
          'All fire-fighting equipment installed per the approved scheme. Two means of egress verified. Hydrant pressure adequate on test.',
        recommendation: 'Recommend approval',
      },
      history: [
        inbound('2026-06-10T09:00:00'),
        h(ROLES.Supervisor, 'Forwarded to Surveyor', '2026-06-12T11:00:00', 'Documents verified and complete.'),
        h(ROLES.Surveyor, 'Site inspection report saved (draft)', '2026-06-15T16:00:00'),
        h(ROLES.Surveyor, 'Forwarded to Final Authority', '2026-06-16T09:20:00', 'Site compliant. Recommend approval.'),
      ],
      certificate: null,
    },

    // 9 — Final Authority inbox · OVERDUE
    {
      id: 'LB-ADV-2950',
      applicantName: 'Sunil More',
      businessName: 'More Outdoor Advertising',
      type: 'Advertisement',
      address: 'Kingsway, Nagpur',
      status: STATUS.PENDING_FINAL,
      currentHolder: ROLES.FinalAuthority,
      daysInQueue: 4,
      slaDays: 3,
      documents: [
        ...docs('LB-ADV-2950', ROLES.Investor, '2026-06-08T09:00:00', APPLICANT_DOCS.Advertisement),
        ...SURVEYOR_REPORT('LB-ADV-2950', '2026-06-13T14:00:00'),
      ],
      sitePhotos: photos('LB-ADV-2950', '2026-06-13T14:00:00', [
        'Proposed gantry over Kingsway Road',
        'Sight-line check from junction',
      ]),
      siteReport: {
        visitRequired: true,
        structureType: 'Gantry / overhead',
        builtUpAreaSqft: '',
        setbackCompliance: 'Review required',
        observations:
          'Gantry spans a notified junction. Recommend traffic-police sight-line concurrence before final approval.',
        recommendation: 'Recommend approval with condition',
      },
      history: [
        inbound('2026-06-08T09:00:00'),
        h(ROLES.Supervisor, 'Forwarded to Surveyor', '2026-06-10T10:00:00'),
        h(ROLES.Surveyor, 'Forwarded to Final Authority', '2026-06-14T11:30:00', 'Approve subject to sight-line concurrence.'),
      ],
      certificate: null,
    },

    // 10 — Completed · certificate issued (terminal, success)
    {
      id: 'LB-PTAX-2890',
      applicantName: 'Latha Iyer',
      businessName: 'Iyer Residency',
      type: 'Property Tax',
      address: 'Pratap Nagar, Nagpur',
      status: STATUS.CERT_ISSUED,
      currentHolder: null,
      daysInQueue: 0,
      slaDays: 4,
      documents: [
        ...docs('LB-PTAX-2890', ROLES.Investor, '2026-06-01T09:00:00', APPLICANT_DOCS['Property Tax']),
        ...SURVEYOR_REPORT('LB-PTAX-2890', '2026-06-05T14:00:00'),
      ],
      sitePhotos: photos('LB-PTAX-2890', '2026-06-05T14:00:00', [
        'Front facade & door number',
        'Built-up measurement reference',
      ]),
      siteReport: {
        visitRequired: true,
        structureType: 'RCC — ground + 1',
        builtUpAreaSqft: '2,150',
        setbackCompliance: 'Compliant',
        observations: 'Built-up area matches declared self-assessment. No unauthorised construction.',
        recommendation: 'Recommend approval',
      },
      history: [
        inbound('2026-06-01T09:00:00'),
        h(ROLES.Supervisor, 'Forwarded to Surveyor', '2026-06-03T10:00:00'),
        h(ROLES.Surveyor, 'Forwarded to Final Authority', '2026-06-06T11:00:00', 'Assessment verified.'),
        h(ROLES.FinalAuthority, 'Approved — generating certificate', '2026-06-08T15:30:00'),
        h(ROLES.FinalAuthority, 'Certificate issued (→ investor via SWCS)', '2026-06-08T15:34:00'),
      ],
      certificate: {
        number: 'NMRDA/PTAX/2026/0418',
        issuedAt: '2026-06-08T15:34:00',
        signerName: 'A. Wankhede',
        signatureDataUrl: null, // seeded as a typed signature → rendered as text
        signatureText: 'A. Wankhede',
      },
    },

    // 11 — Rejected (terminal)
    {
      id: 'LB-FNOC-2901',
      applicantName: 'Gopal Verma',
      businessName: 'Verma Warehousing',
      type: 'Fire NOC',
      address: 'MIDC Hingna, Nagpur',
      status: STATUS.REJECTED,
      currentHolder: null,
      daysInQueue: 0,
      slaDays: 3,
      documents: [
        ...docs('LB-FNOC-2901', ROLES.Investor, '2026-06-02T09:00:00', APPLICANT_DOCS['Fire NOC']),
        ...SURVEYOR_REPORT('LB-FNOC-2901', '2026-06-06T14:00:00'),
      ],
      sitePhotos: photos('LB-FNOC-2901', '2026-06-06T14:00:00', ['Blocked rear egress — stacked pallets']),
      siteReport: {
        visitRequired: true,
        structureType: 'Steel shed — warehouse',
        builtUpAreaSqft: '6,800',
        setbackCompliance: 'Non-compliant',
        observations: 'Rear emergency egress obstructed by stored goods. Hydrant line not pressurised. Scheme not implemented as approved.',
        recommendation: 'Recommend rejection',
      },
      history: [
        inbound('2026-06-02T09:00:00'),
        h(ROLES.Supervisor, 'Forwarded to Surveyor', '2026-06-04T10:00:00'),
        h(
          ROLES.Surveyor,
          'Rejected',
          '2026-06-07T12:15:00',
          'Approved fire-safety scheme not implemented on site; emergency egress obstructed. Applicant may re-apply after rectification.',
          'Site non-compliant',
        ),
      ],
      certificate: null,
    },

    // 12 — Final Authority inbox · second item (depth)
    {
      id: 'LB-PTAX-3018',
      applicantName: 'Farida Begum',
      businessName: 'Begum Enterprises',
      type: 'Property Tax',
      address: 'Mominpura, Nagpur',
      status: STATUS.PENDING_FINAL,
      currentHolder: ROLES.FinalAuthority,
      daysInQueue: 1,
      slaDays: 4,
      documents: [
        ...docs('LB-PTAX-3018', ROLES.Investor, '2026-06-12T09:00:00', APPLICANT_DOCS['Property Tax']),
        ...SURVEYOR_REPORT('LB-PTAX-3018', '2026-06-16T14:00:00'),
      ],
      sitePhotos: photos('LB-PTAX-3018', '2026-06-16T14:00:00', [
        'Shop frontage — commercial use',
        'Rear extension under construction',
      ]),
      siteReport: {
        visitRequired: true,
        structureType: 'RCC — commercial ground floor',
        builtUpAreaSqft: '1,180',
        setbackCompliance: 'Compliant',
        observations: 'Property in commercial use as declared. A minor rear extension is under construction; flagged for re-assessment next cycle.',
        recommendation: 'Recommend approval',
      },
      history: [
        inbound('2026-06-12T09:00:00'),
        h(ROLES.Supervisor, 'Forwarded to Surveyor', '2026-06-14T10:00:00'),
        h(ROLES.Surveyor, 'Forwarded to Final Authority', '2026-06-17T11:00:00', 'Commercial use confirmed.'),
      ],
      certificate: null,
    },

    // 13 — Final Authority sent it back to the Surveyor (populates Final's
    // "In Progress" + Surveyor's inbox; demonstrates the Final→Surveyor loop).
    {
      id: 'LB-FNOC-3041',
      applicantName: 'Rajesh Pawar',
      businessName: 'Pawar Industries',
      type: 'Fire NOC',
      address: 'MIDC Butibori, Nagpur',
      status: STATUS.PENDING_INSPECTION,
      currentHolder: ROLES.Surveyor,
      daysInQueue: 1,
      slaDays: 4,
      documents: [
        ...docs('LB-FNOC-3041', ROLES.Investor, '2026-06-10T09:00:00', APPLICANT_DOCS['Fire NOC']),
        ...SURVEYOR_REPORT('LB-FNOC-3041', '2026-06-14T15:00:00'),
      ],
      sitePhotos: photos('LB-FNOC-3041', '2026-06-14T15:00:00', [
        'Sprinkler riser — pump room',
        'Assembly area marking',
      ]),
      siteReport: {
        visitRequired: true,
        structureType: 'Steel shed — light industrial',
        builtUpAreaSqft: '5,200',
        setbackCompliance: 'Compliant',
        observations: 'Fire-fighting installation broadly in order. Pump-test certificate from the contractor was not on file at the time of visit.',
        recommendation: 'Recommend approval',
      },
      history: [
        inbound('2026-06-10T09:00:00'),
        h(ROLES.Supervisor, 'Forwarded to Surveyor', '2026-06-12T10:00:00'),
        h(ROLES.Surveyor, 'Forwarded to Final Authority', '2026-06-15T11:00:00', 'Recommend approval.'),
        h(
          ROLES.FinalAuthority,
          'Sent back to Surveyor',
          '2026-06-17T16:30:00',
          'Please attach the contractor pump-test certificate and confirm hydrant pressure before I can approve.',
        ),
      ],
      certificate: null,
    },
  ]
}

export const seedRequests = buildRequests
