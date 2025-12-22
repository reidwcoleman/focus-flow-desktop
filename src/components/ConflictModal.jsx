/**
 * Conflict Modal Component
 * Displays conflict warnings and alternative time suggestions
 */

export default function ConflictModal({
  newActivity,
  conflicts,
  suggestions,
  onSelectTime,
  onCreateAnyway,
  onCancel
}) {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'complete': return 'text-red-500 bg-red-500/10 border-red-500/30'
      case 'major': return 'text-orange-500 bg-orange-500/10 border-orange-500/30'
      case 'partial': return 'text-amber-500 bg-amber-500/10 border-amber-500/30'
      default: return 'text-amber-500 bg-amber-500/10 border-amber-500/30'
    }
  }

  const getSlotColor = (label) => {
    switch (label) {
      case 'Optimal': return 'border-green-500/50 bg-green-500/10'
      case 'Great': return 'border-blue-500/50 bg-blue-500/10'
      case 'Good': return 'border-cyan-500/50 bg-cyan-500/10'
      default: return 'border-dark-border-glow bg-dark-bg-tertiary/30'
    }
  }

  const getSlotBadgeColor = (label) => {
    switch (label) {
      case 'Optimal': return 'bg-green-500 text-white'
      case 'Great': return 'bg-blue-500 text-white'
      case 'Good': return 'bg-cyan-500 text-white'
      default: return 'bg-dark-bg-tertiary text-dark-text-secondary'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-dark-bg-secondary/95 backdrop-blur-xl rounded-2xl border border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.3)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-bg-secondary/95 backdrop-blur-xl border-b border-dark-border-subtle p-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30">
              <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-dark-text-primary mb-1">Schedule Conflict Detected</h2>
              <p className="text-sm text-dark-text-secondary">
                "{newActivity.title}" overlaps with {conflicts.length} existing {conflicts.length === 1 ? 'activity' : 'activities'}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-dark-text-muted hover:text-dark-text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Conflicts List */}
          <div>
            <h3 className="text-lg font-bold text-dark-text-primary mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Conflicting Activities
            </h3>
            <div className="space-y-2">
              {conflicts.map((conflict, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-xl border ${getSeverityColor(conflict.severity)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-bold text-sm mb-1">{conflict.activity.title}</div>
                      <div className="text-xs opacity-80">
                        {conflict.activity.start_time} • {conflict.activity.duration_minutes} min
                      </div>
                    </div>
                    <div className="text-xs font-bold uppercase px-2 py-1 rounded bg-white/10">
                      {conflict.overlapMinutes} min overlap
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alternative Time Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-dark-text-primary mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Suggested Alternative Times
              </h3>
              <div className="space-y-2">
                {suggestions.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => onSelectTime(slot.start)}
                    className={`w-full p-4 rounded-xl border-2 ${getSlotColor(slot.label)} hover:scale-[1.02] transition-all text-left group`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-base font-bold text-dark-text-primary">
                            {slot.start} - {slot.end}
                          </span>
                        </div>
                        <div className="text-xs text-dark-text-muted">
                          {slot.durationMinutes} minutes available
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSlotBadgeColor(slot.label)}`}>
                          {slot.label}
                        </span>
                        <svg className="w-5 h-5 text-dark-text-muted group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No suggestions available */}
          {suggestions.length === 0 && (
            <div className="p-4 rounded-xl bg-dark-bg-tertiary/30 border border-dark-border-subtle text-center">
              <p className="text-sm text-dark-text-muted">
                No alternative times available for today. Consider adjusting the duration or choosing a different day.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-dark-bg-secondary/95 backdrop-blur-xl border-t border-dark-border-subtle p-6 pt-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl bg-dark-bg-tertiary hover:bg-dark-bg-tertiary/70 text-dark-text-primary font-medium transition-colors border border-dark-border-glow"
            >
              Cancel
            </button>
            <button
              onClick={onCreateAnyway}
              className="flex-1 px-4 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-medium transition-colors border border-amber-500/30"
            >
              Create Anyway
            </button>
          </div>
          <p className="text-xs text-dark-text-muted text-center mt-3">
            Creating anyway may result in scheduling conflicts
          </p>
        </div>
      </div>
    </div>
  )
}
