export const DOOR_STATUSES = {
  no_answer: {
    label: 'No Answer',
    color: '#94a3b8',
    bg: '#1e293b',
    emoji: '🔘',
    pinColor: '#94a3b8'
  },
  not_interested: {
    label: 'Not Interested',
    color: '#ef4444',
    bg: '#450a0a',
    emoji: '❌',
    pinColor: '#ef4444'
  },
  callback: {
    label: 'Callback',
    color: '#f59e0b',
    bg: '#451a03',
    emoji: '📞',
    pinColor: '#f59e0b'
  },
  interested: {
    label: 'Interested',
    color: '#22c55e',
    bg: '#052e16',
    emoji: '✅',
    pinColor: '#22c55e'
  },
  hot_lead: {
    label: '🔥 Hot Lead',
    color: '#ff6b35',
    bg: '#431407',
    emoji: '🔥',
    pinColor: '#ff6b35'
  }
}

export const STATUS_ORDER = ['no_answer', 'not_interested', 'callback', 'interested', 'hot_lead']
