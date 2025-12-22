/**
 * Activity Timeline Component
 * Displays activities for a selected date in a vertical timeline format
 */

export default function ActivityTimeline({ activities, selectedDate, onToggleComplete, onDelete }) {
  const sortedActivities = activities
    .filter(a => !a.is_completed)
    .sort((a, b) => {
      if (!a.start_time && !b.start_time) return 0
      if (!a.start_time) return 1
      if (!b.start_time) return -1
      return a.start_time.localeCompare(b.start_time)
    })

  const getTimelinePosition = (time) => {
    if (!time) return null
    const [hours, minutes] = time.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes
    // Map 0-24 hours to percentage (6am start = 0%, midnight = 100%)
    const startMinutes = 6 * 60 // 6am
    const endMinutes = 24 * 60 // midnight
    return Math.max(0, Math.min(100, ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100))
  }

  const getActivityEndTime = (activity) => {
    if (!activity.start_time) return null
    const [hours, minutes] = activity.start_time.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const duration = activity.duration_minutes || 60 // Default to 1 hour if no duration
    const endMinutes = startMinutes + duration
    const endHours = Math.floor(endMinutes / 60) % 24
    const endMins = endMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
  }

  // Calculate lanes for overlapping activities
  const calculateLanes = () => {
    const activitiesWithPosition = sortedActivities
      .filter(a => a.start_time)
      .map(activity => ({
        ...activity,
        startPos: getTimelinePosition(activity.start_time),
        endTime: getActivityEndTime(activity),
        endPos: getTimelinePosition(getActivityEndTime(activity)),
      }))

    // Assign lanes to prevent overlap
    const lanes = []
    activitiesWithPosition.forEach(activity => {
      let laneIndex = 0
      let placed = false

      while (!placed) {
        if (!lanes[laneIndex]) {
          lanes[laneIndex] = []
        }

        // Check if this activity overlaps with any in this lane
        const overlaps = lanes[laneIndex].some(existing => {
          // Activities overlap if one starts before the other ends
          return activity.startPos < existing.endPos && existing.startPos < activity.endPos
        })

        if (!overlaps) {
          lanes[laneIndex].push(activity)
          activity.lane = laneIndex
          activity.totalLanes = lanes.length
          placed = true
        } else {
          laneIndex++
        }
      }
    })

    // Update totalLanes for all activities
    activitiesWithPosition.forEach(activity => {
      activity.totalLanes = lanes.length
    })

    // Add activities without start time to the end
    const activitiesWithoutTime = sortedActivities
      .filter(a => !a.start_time)
      .map((activity, index) => ({
        ...activity,
        startPos: null,
        lane: 0,
        totalLanes: 1,
      }))

    return [...activitiesWithPosition, ...activitiesWithoutTime]
  }

  const activitiesWithLanes = calculateLanes()

  const getTypeColor = (type) => {
    const colors = {
      task: 'from-blue-500 to-blue-600',
      class: 'from-purple-500 to-purple-600',
      study: 'from-cyan-500 to-cyan-600',
      break: 'from-green-500 to-green-600',
      event: 'from-amber-500 to-amber-600',
      meeting: 'from-red-500 to-red-600',
      assignment: 'from-pink-500 to-pink-600',
    }
    return colors[type] || 'from-blue-500 to-blue-600'
  }

  const getTypeIcon = (type) => {
    const icons = {
      task: '📋',
      class: '🎓',
      study: '📚',
      break: '☕',
      event: '📅',
      meeting: '👥',
      assignment: '✍️',
    }
    return icons[type] || '📋'
  }

  const getCurrentTimePosition = () => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    return getTimelinePosition(time)
  }

  const isToday = () => {
    const today = new Date()
    return (
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate()
    )
  }

  const timeMarkers = [
    { time: '06:00', label: '6 AM' },
    { time: '09:00', label: '9 AM' },
    { time: '12:00', label: '12 PM' },
    { time: '15:00', label: '3 PM' },
    { time: '18:00', label: '6 PM' },
    { time: '21:00', label: '9 PM' },
    { time: '00:00', label: '12 AM' },
  ]

  if (activitiesWithLanes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-3">📅</div>
        <p className="text-dark-text-secondary">No activities scheduled</p>
        <p className="text-dark-text-muted text-sm mt-1">Add one using AI above</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline container */}
      <div className="relative min-h-[400px] bg-gradient-to-b from-dark-bg-tertiary/30 to-dark-bg-surface/30 rounded-xl p-4 border border-dark-border-glow">
        {/* Vertical timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500/30 to-accent-cyan/30"></div>

        {/* Current time indicator (only if today) */}
        {isToday() && (
          <div
            className="absolute left-0 right-0 flex items-center z-20 transition-all duration-1000"
            style={{ top: `${getCurrentTimePosition()}%` }}
          >
            <div className="absolute left-5 w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-lg animate-pulse flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white"></div>
            </div>
            <div className="ml-14 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-bold backdrop-blur-sm">
              NOW
            </div>
            <div className="flex-1 h-0.5 bg-gradient-to-r from-red-500/50 to-transparent"></div>
          </div>
        )}

        {/* Time markers */}
        {timeMarkers.map((marker) => (
          <div
            key={marker.time}
            className="absolute left-0 right-0 flex items-center opacity-30"
            style={{ top: `${getTimelinePosition(marker.time)}%` }}
          >
            <div className="text-xs text-dark-text-muted font-medium w-12 text-right pr-2">
              {marker.label}
            </div>
            <div className="flex-1 h-px bg-dark-border-subtle"></div>
          </div>
        ))}

        {/* Activities */}
        <div className="relative py-4" style={{ minHeight: '600px' }}>
          {activitiesWithLanes.map((activity, index) => {
            const position = activity.startPos
            const height = activity.endPos ? Math.max(5, activity.endPos - activity.startPos) : null

            // Calculate width and left position based on lane
            const laneWidth = 100 / activity.totalLanes
            const leftPosition = 64 + (activity.lane * (laneWidth * 0.85)) // 64px base offset for timeline
            const cardWidth = laneWidth * 0.85 // 85% to leave some gap

            return (
              <div
                key={activity.id}
                className="absolute animate-stagger-fade-in"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  top: position !== null ? `${position}%` : 'auto',
                  left: position !== null ? `${leftPosition}px` : '64px',
                  width: position !== null ? `calc(${cardWidth}% - 64px)` : 'calc(100% - 80px)',
                  minHeight: height !== null ? `${height}%` : 'auto',
                  ...(position === null && { position: 'relative', marginBottom: '24px' })
                }}
              >
                {/* Timeline dot */}
                <div className={`absolute -left-11 top-0 w-8 h-8 rounded-full bg-gradient-to-br ${getTypeColor(activity.activity_type)} border-2 border-white shadow-lg flex items-center justify-center text-lg z-10`}>
                  {getTypeIcon(activity.activity_type)}
                </div>

                {/* Activity card */}
                <div className="group relative overflow-hidden bg-dark-bg-secondary/50 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-primary-500/30 hover:scale-105 transition-all duration-300 shadow-[0_4px_16px_0_rgba(0,0,0,0.2)] h-full">
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${getTypeColor(activity.activity_type)} opacity-5`}></div>

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-dark-text-primary leading-tight mb-1">
                          {activity.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-dark-text-muted">
                          {activity.start_time && (
                            <span className="flex items-center gap-1 font-medium text-primary-400">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {activity.start_time.slice(0, 5)}
                            </span>
                          )}
                          {activity.duration_minutes && (
                            <span className="font-medium text-accent-cyan">
                              {activity.duration_minutes} min
                            </span>
                          )}
                          {activity.subject && (
                            <span className="px-2 py-0.5 rounded bg-dark-bg-tertiary text-dark-text-secondary font-medium">
                              {activity.subject}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => onToggleComplete(activity.id, activity.is_completed)}
                          className="w-6 h-6 rounded border-2 border-dark-border-glow hover:border-green-500 flex items-center justify-center transition-all hover:scale-110"
                        >
                          <svg className="w-3.5 h-3.5 text-dark-text-muted group-hover:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(activity.id)}
                          className="w-6 h-6 rounded bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {(activity.ai_description || activity.description) && (
                      <p className="text-sm text-dark-text-secondary line-clamp-2">
                        {activity.ai_description || activity.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
