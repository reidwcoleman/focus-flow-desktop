/**
 * Scheduling Service
 * Provides intelligent scheduling with conflict detection and optimal time suggestions
 */

class SchedulingService {
  /**
   * Check if a new activity conflicts with existing activities
   * @param {Object} newActivity - Activity to check
   * @param {Array} existingActivities - Existing activities for the day
   * @returns {Object} { hasConflict: boolean, conflicts: Array, suggestions: Array }
   */
  checkConflicts(newActivity, existingActivities) {
    if (!newActivity.start_time || !newActivity.duration_minutes) {
      return { hasConflict: false, conflicts: [], suggestions: [] }
    }

    const conflicts = []
    const timedActivities = existingActivities.filter(a => a.start_time && a.duration_minutes)

    // Calculate new activity's time range
    const [newHours, newMinutes] = newActivity.start_time.split(':').map(Number)
    const newStart = newHours * 60 + newMinutes
    const newEnd = newStart + newActivity.duration_minutes

    // Check for overlaps
    timedActivities.forEach(existing => {
      const [existHours, existMinutes] = existing.start_time.split(':').map(Number)
      const existStart = existHours * 60 + existMinutes
      const existEnd = existStart + existing.duration_minutes

      // Overlap detection: activities overlap if one starts before the other ends
      if (newStart < existEnd && existStart < newEnd) {
        conflicts.push({
          activity: existing,
          overlapMinutes: Math.min(newEnd, existEnd) - Math.max(newStart, existStart),
          severity: this._getConflictSeverity(newStart, newEnd, existStart, existEnd)
        })
      }
    })

    const hasConflict = conflicts.length > 0
    const suggestions = hasConflict ? this._generateAlternativeTimes(newActivity, existingActivities) : []

    return { hasConflict, conflicts, suggestions }
  }

  /**
   * Find available time slots for a given date
   * @param {Array} activities - All activities for the day
   * @param {number} minDuration - Minimum duration in minutes (default: 30)
   * @returns {Array} Array of {start: string, end: string, durationMinutes: number}
   */
  findFreeSlots(activities, minDuration = 30) {
    const freeSlots = []
    const timedActivities = activities
      .filter(a => a.start_time && a.duration_minutes)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

    // Working hours: 6 AM to 11 PM
    const dayStart = 6 * 60  // 6:00 AM
    const dayEnd = 23 * 60   // 11:00 PM

    let currentTime = dayStart

    timedActivities.forEach(activity => {
      const [hours, minutes] = activity.start_time.split(':').map(Number)
      const activityStart = hours * 60 + minutes
      const activityEnd = activityStart + activity.duration_minutes

      // Check if there's a gap before this activity
      const gapDuration = activityStart - currentTime
      if (gapDuration >= minDuration) {
        freeSlots.push({
          start: this._minutesToTime(currentTime),
          end: this._minutesToTime(activityStart),
          durationMinutes: gapDuration
        })
      }

      currentTime = Math.max(currentTime, activityEnd)
    })

    // Check for gap after last activity
    const finalGap = dayEnd - currentTime
    if (finalGap >= minDuration) {
      freeSlots.push({
        start: this._minutesToTime(currentTime),
        end: this._minutesToTime(dayEnd),
        durationMinutes: finalGap
      })
    }

    return freeSlots
  }

  /**
   * Suggest optimal times based on activity type and patterns
   * @param {Object} activity - Activity details
   * @param {Array} existingActivities - Existing activities
   * @returns {Array} Suggested time slots with scores
   */
  suggestOptimalTimes(activity, existingActivities) {
    const freeSlots = this.findFreeSlots(existingActivities, activity.duration_minutes || 60)
    const activityType = activity.activity_type || 'task'

    // Score each free slot based on activity type best practices
    const scoredSlots = freeSlots.map(slot => {
      const slotHour = parseInt(slot.start.split(':')[0])
      let score = 100 // Base score

      // Type-specific optimal times
      switch (activityType) {
        case 'study':
          // Best: 9-11 AM, Good: 2-4 PM, OK: evening
          if (slotHour >= 9 && slotHour < 11) score += 30
          else if (slotHour >= 14 && slotHour < 16) score += 20
          else if (slotHour >= 18) score -= 10
          break

        case 'class':
        case 'meeting':
          // Prefer daytime hours
          if (slotHour >= 9 && slotHour < 17) score += 20
          else score -= 15
          break

        case 'break':
          // Best around noon or mid-afternoon
          if (slotHour >= 12 && slotHour < 13) score += 25
          else if (slotHour >= 15 && slotHour < 16) score += 20
          break

        case 'assignment':
        case 'task':
          // Prefer morning (less distractions)
          if (slotHour >= 8 && slotHour < 12) score += 25
          else if (slotHour >= 14 && slotHour < 18) score += 10
          break

        case 'event':
          // No strong preference
          break
      }

      // Prefer slots with more buffer time
      const bufferBonus = Math.min(20, Math.floor((slot.durationMinutes - (activity.duration_minutes || 60)) / 30) * 5)
      score += bufferBonus

      // Slight penalty for very early or very late
      if (slotHour < 7) score -= 15
      if (slotHour >= 21) score -= 10

      return {
        ...slot,
        score,
        label: this._getSlotLabel(score)
      }
    })

    // Sort by score (highest first) and return top 5
    return scoredSlots
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }

  /**
   * Auto-reschedule activities to resolve conflicts
   * @param {Array} conflictingActivities - Activities that conflict
   * @param {Array} allActivities - All activities for the day
   * @param {string} strategy - 'earliest' | 'latest' | 'optimal'
   * @returns {Array} Rescheduled activities with new times
   */
  resolveConflicts(conflictingActivities, allActivities, strategy = 'optimal') {
    const rescheduled = []
    const fixedActivities = allActivities.filter(a => !conflictingActivities.find(c => c.id === a.id))

    conflictingActivities.forEach(activity => {
      const suggestions = this.suggestOptimalTimes(activity, fixedActivities)

      if (suggestions.length > 0) {
        let selectedSlot
        switch (strategy) {
          case 'earliest':
            selectedSlot = suggestions[suggestions.length - 1] // Lowest time
            break
          case 'latest':
            selectedSlot = suggestions[0] // Could be late if high score
            break
          case 'optimal':
          default:
            selectedSlot = suggestions[0] // Highest score
            break
        }

        rescheduled.push({
          ...activity,
          original_start_time: activity.start_time,
          start_time: selectedSlot.start,
          rescheduled: true
        })

        // Add to fixed activities for next iteration
        fixedActivities.push({
          ...activity,
          start_time: selectedSlot.start
        })
      }
    })

    return rescheduled
  }

  // Helper methods

  _getConflictSeverity(newStart, newEnd, existStart, existEnd) {
    const overlapMinutes = Math.min(newEnd, existEnd) - Math.max(newStart, existStart)
    const totalDuration = newEnd - newStart

    if (overlapMinutes >= totalDuration) return 'complete' // Full overlap
    if (overlapMinutes >= totalDuration * 0.5) return 'major' // >50% overlap
    return 'partial' // <50% overlap
  }

  _generateAlternativeTimes(activity, existingActivities) {
    const suggestions = this.suggestOptimalTimes(activity, existingActivities)
    return suggestions.slice(0, 3) // Return top 3 alternatives
  }

  _minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  _getSlotLabel(score) {
    if (score >= 140) return 'Optimal'
    if (score >= 120) return 'Great'
    if (score >= 100) return 'Good'
    return 'Available'
  }
}

export default new SchedulingService()
