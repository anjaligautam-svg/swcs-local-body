import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { seedRequests } from '../data/seed.js'
import {
  applyAction,
  ACTIONS,
  ROLES,
  ROLE_LABELS,
  STATUS,
  holderOf,
} from './workflow.js'

const STORAGE_KEY = 'swcs-local-body/v1'

let _id = 0
const uid = (p = 'id') => `${p}-${++_id}`

// ---- initial state ----------------------------------------------------------
function freshState() {
  return {
    requests: seedRequests(),
    role: ROLES.Supervisor,
    nav: [{ name: 'inbox' }], // navigation stack; top = current view
    search: '',
    toasts: [],
  }
}

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return freshState()
    const saved = JSON.parse(raw)
    return {
      ...freshState(),
      requests: saved.requests ?? seedRequests(),
      role: saved.role ?? ROLES.Supervisor,
    }
  } catch {
    return freshState()
  }
}

// ---- reducer ----------------------------------------------------------------
function reducer(state, action) {
  switch (action.type) {
    case 'SET_ROLE':
      // Entering a separate portal: reset to that portal's own inbox.
      return { ...state, role: action.role, nav: [{ name: 'inbox' }], search: '' }
    case 'NAVIGATE':
      return { ...state, nav: [...state.nav, action.view], search: '' }
    case 'GO_LIST': // top-level nav resets the stack
      return { ...state, nav: [action.view], search: '' }
    case 'BACK':
      return { ...state, nav: state.nav.length > 1 ? state.nav.slice(0, -1) : state.nav }
    case 'SET_SEARCH':
      return { ...state, search: action.value }
    case 'UPDATE_REQUEST':
      return {
        ...state,
        requests: state.requests.map((r) => (r.id === action.request.id ? action.request : r)),
      }
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.toast] }
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }
    case 'RESET_ALL':
      return freshState()
    default:
      return state
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  // Persist requests + role for the session so an accidental reload mid-demo
  // doesn't wipe progress. (Reset button restores seed data.)
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ requests: state.requests, role: state.role }),
      )
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [state.requests, state.role])

  const api = useMemo(() => {
    const view = state.nav[state.nav.length - 1]

    const toast = (message, tone = 'default') =>
      dispatch({ type: 'ADD_TOAST', toast: { id: uid('toast'), message, tone } })

    const update = (request) => dispatch({ type: 'UPDATE_REQUEST', request })

    return {
      // state
      ...state,
      view,
      requestById: (id) => state.requests.find((r) => r.id === id),

      // navigation
      goList: (name) => dispatch({ type: 'GO_LIST', view: { name } }),
      openRequest: (id) => dispatch({ type: 'NAVIGATE', view: { name: 'detail', requestId: id } }),
      openCertificate: (id) =>
        dispatch({ type: 'NAVIGATE', view: { name: 'certificate', requestId: id } }),
      back: () => dispatch({ type: 'BACK' }),
      setSearch: (value) => dispatch({ type: 'SET_SEARCH', value }),

      // role
      setRole: (role) => {
        dispatch({ type: 'SET_ROLE', role })
        toast(`Entered the ${ROLE_LABELS[role]} portal`, 'info')
      },

      // toasts
      toast,
      dismissToast: (id) => dispatch({ type: 'REMOVE_TOAST', id }),

      // ---- workflow actions -------------------------------------------------
      doAction: (request, actionId, payload = {}) => {
        const next = applyAction(request, actionId, state.role, payload)
        update(next)

        if (actionId === ACTIONS.APPROVE_ISSUE) {
          dispatch({ type: 'NAVIGATE', view: { name: 'certificate', requestId: request.id } })
          return
        }
        const messages = {
          [ACTIONS.FORWARD_SURVEYOR]: 'Forwarded to Surveyor',
          [ACTIONS.FORWARD_FINAL]: 'Forwarded to Final Authority',
          [ACTIONS.CLARIFY_INVESTOR]: 'Sent to investor for clarification (→ SWCS)',
          [ACTIONS.BACK_TO_SUPERVISOR]: 'Sent back to Supervisor',
          [ACTIONS.BACK_TO_SURVEYOR]: 'Sent back to Surveyor',
          [ACTIONS.REJECT]: 'Request rejected',
          [ACTIONS.INVESTOR_RESUBMIT]: 'Investor resubmitted — back in Supervisor queue',
        }
        const tone = actionId === ACTIONS.REJECT ? 'danger' : 'success'
        toast(`${request.id} · ${messages[actionId] || 'Updated'}`, tone)
      },

      // Surveyor saves the inspection report (also moves PENDING → IN PROGRESS).
      saveSiteReport: (request, report) => {
        const hasReportDoc = request.documents.some(
          (d) => d.addedByRole === ROLES.Surveyor && d.name.startsWith('Site Inspection Report'),
        )
        const now = new Date().toISOString()
        const documents = hasReportDoc
          ? request.documents
          : [
              ...request.documents,
              {
                id: `${request.id}-Surveyor-RPT`,
                name: 'Site Inspection Report.pdf',
                addedByRole: ROLES.Surveyor,
                addedAt: now,
                type: 'pdf',
                version: 1,
              },
            ]
        const movingFromPending = request.status === STATUS.PENDING_INSPECTION
        const history = hasReportDoc
          ? request.history
          : [
              ...request.history,
              {
                actorRole: ROLES.Surveyor,
                action: 'Site inspection report saved',
                comment: '',
                category: '',
                timestamp: now,
              },
            ]
        update({
          ...request,
          siteReport: report,
          documents,
          status: movingFromPending ? STATUS.INSPECTION_IN_PROGRESS : request.status,
          history,
        })
        toast(`${request.id} · Inspection report saved`, 'success')
      },

      addPhotos: (request, newPhotos) => {
        update({ ...request, sitePhotos: [...request.sitePhotos, ...newPhotos] })
        toast(
          `${newPhotos.length} ${newPhotos.length === 1 ? 'photo' : 'photos'} added to the file`,
          'success',
        )
      },

      // Final Authority issues the certificate → terminal success.
      issueCertificate: (request, cert) => {
        const now = new Date().toISOString()
        update({
          ...request,
          status: STATUS.CERT_ISSUED,
          currentHolder: null,
          certificate: { ...cert, issuedAt: now },
          history: [
            ...request.history,
            {
              actorRole: ROLES.FinalAuthority,
              action: 'Certificate issued (→ investor via SWCS)',
              comment: `Certificate ${cert.number}`,
              category: '',
              timestamp: now,
            },
          ],
        })
        toast(`Certificate ${cert.number} issued`, 'success')
      },

      // Nudge the current holder of a request you previously handled.
      nudge: (request) => {
        const holder = holderOf(request.status)
        toast(
          `Reminder sent to ${ROLE_LABELS[holder] || 'holder'} for ${request.id}`,
          'info',
        )
      },

      reset: () => {
        dispatch({ type: 'RESET_ALL' })
        toast('Demo data reset to seed', 'info')
      },
    }
  }, [state])

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
