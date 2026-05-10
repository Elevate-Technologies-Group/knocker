// Canonical 6-status list — matches iOS DoorStatus enum exactly.
// hot_lead is retired; mapped to appointment on read for legacy rows.
export const DOOR_STATUSES = {
  appointment: {
    label: 'Appointment',
    color: '#06b6d4',   // cyan-500  — matches iOS .appointment
    bg: '#083344',
    emoji: '📅',
    pinColor: '#06b6d4'
  },
  interested: {
    label: 'Interested',
    color: '#22c55e',   // green-500 — matches iOS .interested
    bg: '#052e16',
    emoji: '✅',
    pinColor: '#22c55e'
  },
  callback: {
    label: 'Callback',
    color: '#f59e0b',   // amber-500 — matches iOS .callback
    bg: '#451a03',
    emoji: '📞',
    pinColor: '#f59e0b'
  },
  not_interested: {
    label: 'Not Interested',
    color: '#ef4444',   // red-500   — matches iOS .notInterested
    bg: '#450a0a',
    emoji: '❌',
    pinColor: '#ef4444'
  },
  no_answer: {
    label: 'No Answer',
    color: '#94a3b8',   // slate-400 — matches iOS .noAnswer
    bg: '#1e293b',
    emoji: '🔘',
    pinColor: '#94a3b8'
  },
  dq: {
    label: 'Not Qualified',
    color: '#475569',   // slate-600 — matches iOS .dq (dark-slate)
    bg: '#0f172a',
    emoji: '🚫',
    pinColor: '#475569'
  },

  // Legacy alias — existing rows with status=hot_lead render as appointment.
  // Do NOT write hot_lead for new doors.
  hot_lead: {
    label: 'Appointment',
    color: '#06b6d4',
    bg: '#083344',
    emoji: '📅',
    pinColor: '#06b6d4'
  }
}

export const STATUS_ORDER = ['appointment', 'interested', 'callback', 'not_interested', 'no_answer', 'dq']

// Normalise a status value read from the DB: hot_lead → appointment.
export function normaliseStatus(s) {
  return s === 'hot_lead' ? 'appointment' : (DOOR_STATUSES[s] ? s : 'no_answer')
}
