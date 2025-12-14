/**
 * Planner Component - AI-Optimized Calendar
 * Smart calendar with AI-powered activity creation
 */

import { useState, useEffect, useRef } from 'react'
import calendarService from '../services/calendarService'
import activityParserService from '../services/activityParserService'
import { CalendarSkeleton, ActivitySkeleton, StatCardSkeleton } from './LoadingSkeleton'

const Planner = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activities, setActivities] = useState([])
  const [dayActivities, setDayActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showExamples, setShowExamples] = useState(false)
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' or 'upcoming'
  const [filterType, setFilterType] = useState('all') // 'all' or specific activity type
  const [flyingAwayItems, setFlyingAwayItems] = useState(new Set())
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  useEffect(() => {
    loadActivities()
  }, [currentDate])

  useEffect(() => {
    loadDayActivities()
  }, [selectedDate, activities])

  const loadActivities = async () => {
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const data = await calendarService.getActivitiesForMonth(year, month)
      setActivities(data)
    } catch (err) {
      console.error('Failed to load activities:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDayActivities = () => {
    const dateStr = selectedDate.toISOString().split('T')[0]
    const filtered = activities.filter(a => a.activity_date === dateStr)
    // Sort by time
    const sorted = filtered.sort((a, b) => {
      if (!a.start_time && !b.start_time) return 0
      if (!a.start_time) return 1
      if (!b.start_time) return -1
      return a.start_time.localeCompare(b.start_time)
    })
    setDayActivities(sorted)
  }

  const handleAiCreate = async () => {
    if (!aiInput.trim()) return

    setAiProcessing(true)
    setError('')
    setSuccess('')

    try {
      // Parse activity with AI
      const activityData = await activityParserService.parseActivity(aiInput)

      // Create activity in database
      await calendarService.createActivity(activityData)

      // Reload activities
      await loadActivities()

      // Show success
      setSuccess(`Created: ${activityData.title}`)
      setAiInput('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Failed to create activity:', err)
      setError('Failed to create activity. Try being more specific.')
      setTimeout(() => setError(''), 5000)
    } finally {
      setAiProcessing(false)
    }
  }

  const handleToggleComplete = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus

      // If marking as complete, trigger fly-away animation
      if (newStatus) {
        // Optimistically update the UI to show completed state
        setActivities(prev => prev.map(a =>
          a.id === id ? { ...a, is_completed: true } : a
        ))

        // Small delay to show the checkmark before flying away
        setTimeout(() => {
          setFlyingAwayItems(prev => new Set([...prev, id]))
        }, 100)

        // Wait for animation to complete, then remove from UI
        setTimeout(async () => {
          // Update in database
          await calendarService.toggleCompletion(id, true)

          // Remove from UI
          setActivities(prev => prev.filter(a => a.id !== id))
          setFlyingAwayItems(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }, 1000) // Matched to new 0.85s animation + 150ms buffer
      } else {
        // If unchecking, update immediately without animation
        await calendarService.toggleCompletion(id, false)

        // Update local state optimistically
        setActivities(prev => prev.map(a =>
          a.id === id ? { ...a, is_completed: false } : a
        ))
      }
    } catch (err) {
      console.error('Failed to toggle completion:', err)
      // Reload on error
      await loadActivities()
    }
  }

  const handleDeleteActivity = async (id) => {
    if (confirm('Delete this activity?')) {
      try {
        await calendarService.deleteActivity(id)
        await loadActivities()
      } catch (err) {
        console.error('Failed to delete activity:', err)
      }
    }
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const getActivitiesForDay = (day) => {
    if (!day) return []
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0]
    return activities.filter(a => a.activity_date === dateStr)
  }

  const isToday = (day) => {
    const today = new Date()
    return day &&
      currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth() &&
      day === today.getDate()
  }

  const isSelected = (day) => {
    return day &&
      currentDate.getFullYear() === selectedDate.getFullYear() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      day === selectedDate.getDate()
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  // Swipe gesture handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].clientX
    handleSwipe()
  }

  const handleSwipe = () => {
    const swipeDistance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (swipeDistance > minSwipeDistance) {
      // Swiped left - next month
      nextMonth()
    } else if (swipeDistance < -minSwipeDistance) {
      // Swiped right - previous month
      previousMonth()
    }
  }

  const getUpcomingActivities = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)

    return activities
      .filter(a => {
        const actDate = new Date(a.activity_date)
        return actDate >= today && actDate <= nextWeek
      })
      .sort((a, b) => {
        const dateCompare = a.activity_date.localeCompare(b.activity_date)
        if (dateCompare !== 0) return dateCompare
        if (!a.start_time && !b.start_time) return 0
        if (!a.start_time) return 1
        if (!b.start_time) return -1
        return a.start_time.localeCompare(b.start_time)
      })
  }

  const getFilteredActivities = (activityList) => {
    if (filterType === 'all') return activityList
    return activityList.filter(a => a.activity_type === filterType)
  }

  const getTypeColor = (type) => {
    const colors = {
      task: 'bg-blue-500',
      class: 'bg-purple-500',
      study: 'bg-cyan-500',
      break: 'bg-green-500',
      event: 'bg-amber-500',
      meeting: 'bg-red-500',
      assignment: 'bg-pink-500',
    }
    return colors[type] || 'bg-blue-500'
  }

  const activityTypes = ['all', 'study', 'class', 'task', 'assignment', 'event', 'break']

  const getTotalHours = () => {
    return activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) / 60
  }

  const getTimeOfDay = (time) => {
    if (!time) return 'No time'
    const hour = parseInt(time.split(':')[0])
    if (hour < 12) return 'Morning'
    if (hour < 17) return 'Afternoon'
    return 'Evening'
  }

  return (
    <div className="space-y-4 pb-6 animate-fadeIn">
      {/* Header with Stats */}
      <div>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-dark-text-primary mb-1">Smart Calendar</h1>
            <p className="text-sm text-dark-text-secondary">AI-powered activity planning</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-primary-500">{activities.length}</div>
            <div className="text-[10px] text-dark-text-muted">activities</div>
          </div>
        </div>

        {/* Quick Stats */}
        {loading ? (
          <div className="flex gap-2 mt-2">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : activities.length > 0 && (
          <div className="flex gap-2 mt-2 animate-fadeIn">
            <div className="flex-1 bg-dark-bg-secondary rounded-xl p-2.5 border border-dark-border-glow">
              <div className="text-xs text-dark-text-muted">Total Hours</div>
              <div className="text-lg font-bold text-dark-text-primary">{getTotalHours().toFixed(1)}h</div>
            </div>
            <div className="flex-1 bg-dark-bg-secondary rounded-xl p-2.5 border border-dark-border-glow">
              <div className="text-xs text-dark-text-muted">Completed</div>
              <div className="text-lg font-bold text-green-500">
                {activities.filter(a => a.is_completed).length}
              </div>
            </div>
            <div className="flex-1 bg-dark-bg-secondary rounded-xl p-2.5 border border-dark-border-glow">
              <div className="text-xs text-dark-text-muted">Pending</div>
              <div className="text-lg font-bold text-amber-500">
                {activities.filter(a => !a.is_completed).length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Activity Input */}
      <div className="bg-gradient-to-br from-primary-500/10 via-dark-bg-secondary to-accent-purple/10 rounded-2xl p-4 border border-dark-border-glow shadow-dark-soft-lg">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-3 p-2.5 rounded-xl bg-green-500/10 border border-green-500/30 animate-fadeIn">
            <p className="text-green-400 text-xs font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 animate-fadeIn">
            <p className="text-red-400 text-xs font-medium">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAiCreate()}
            placeholder="Study chemistry tomorrow at 3pm..."
            className="flex-1 px-3 py-2.5 text-sm rounded-xl bg-dark-bg-tertiary border border-dark-border-glow text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            disabled={aiProcessing}
          />
          <button
            onClick={handleAiCreate}
            disabled={aiProcessing || !aiInput.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-cyan text-white text-sm font-semibold rounded-xl hover:shadow-glow-cyan transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center gap-1.5"
          >
            {aiProcessing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="hidden sm:inline">Create</span>
              </>
            )}
          </button>
        </div>

        {/* Pro Tip */}
        <div className="mt-2.5 flex items-start gap-1.5 text-[10px] text-dark-text-muted">
          <svg className="w-3 h-3 flex-shrink-0 mt-0.5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p>
            <span className="font-semibold text-primary-500">Pro tip:</span> Use specific dates like "on the 17th" for best accuracy. Days of the week like "Monday" or "Friday" also work well!
          </p>
        </div>

        {/* Collapsible Examples */}
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="mt-2 flex items-center gap-1.5 text-xs text-dark-text-secondary hover:text-primary-500 transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${showExamples ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium">{showExamples ? 'Hide' : 'Show'} examples</span>
        </button>

        {showExamples && (
          <div className="mt-2 grid grid-cols-2 gap-2 animate-fadeIn">
            <button
              onClick={() => { setAiInput("Study chemistry tomorrow at 3pm for 2 hours"); setShowExamples(false); }}
              className="text-xs px-2.5 py-2 rounded-lg bg-dark-bg-tertiary border border-dark-border-subtle text-dark-text-muted hover:text-primary-500 hover:border-primary-500/50 transition-all text-left"
            >
              Study tomorrow 3pm
            </button>
            <button
              onClick={() => { setAiInput("Math quiz on Friday"); setShowExamples(false); }}
              className="text-xs px-2.5 py-2 rounded-lg bg-dark-bg-tertiary border border-dark-border-subtle text-dark-text-muted hover:text-primary-500 hover:border-primary-500/50 transition-all text-left"
            >
              Quiz on Friday
            </button>
            <button
              onClick={() => { setAiInput("finish physics homework on the 17th"); setShowExamples(false); }}
              className="text-xs px-2.5 py-2 rounded-lg bg-dark-bg-tertiary border border-dark-border-subtle text-dark-text-muted hover:text-primary-500 hover:border-primary-500/50 transition-all text-left"
            >
              Homework on 17th
            </button>
            <button
              onClick={() => { setAiInput("chemistry lab Monday at 2pm"); setShowExamples(false); }}
              className="text-xs px-2.5 py-2 rounded-lg bg-dark-bg-tertiary border border-dark-border-subtle text-dark-text-muted hover:text-primary-500 hover:border-primary-500/50 transition-all text-left"
            >
              Lab Monday 2pm
            </button>
          </div>
        )}
      </div>

      {/* View Mode Toggle & Filters */}
      <div className="space-y-2">
        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 py-2 px-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
              viewMode === 'calendar'
                ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white shadow-glow-cyan'
                : 'bg-dark-bg-secondary text-dark-text-secondary border border-dark-border-glow hover:border-primary-500/50'
            }`}
          >
            <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('upcoming')}
            className={`flex-1 py-2 px-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
              viewMode === 'upcoming'
                ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white shadow-glow-cyan'
                : 'bg-dark-bg-secondary text-dark-text-secondary border border-dark-border-glow hover:border-primary-500/50'
            }`}
          >
            <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Activity Type Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {activityTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                filterType === type
                  ? 'bg-primary-500 text-white shadow-glow-cyan-sm'
                  : 'bg-dark-bg-tertiary text-dark-text-secondary border border-dark-border-subtle hover:border-primary-500/50'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        loading ? (
          <CalendarSkeleton />
        ) : (
          <div
            className="bg-dark-bg-secondary rounded-2xl p-4 border border-dark-border-glow shadow-dark-soft-md animate-fadeIn"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-dark-text-primary">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-1.5">
              <button
                onClick={goToToday}
                className="px-2.5 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-500 text-xs font-semibold hover:bg-primary-500/20 transition-all active:scale-95"
              >
                Today
              </button>
              <button
                onClick={previousMonth}
                className="w-8 h-8 rounded-lg bg-dark-bg-tertiary border border-dark-border-glow text-dark-text-primary hover:border-primary-500 transition-all active:scale-95"
              >
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextMonth}
                className="w-8 h-8 rounded-lg bg-dark-bg-tertiary border border-dark-border-glow text-dark-text-primary hover:border-primary-500 transition-all active:scale-95"
              >
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {dayNames.map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-dark-text-muted py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth().map((day, index) => {
              const dayActivities = getFilteredActivities(getActivitiesForDay(day))
              const hasActivities = dayActivities.length > 0

              return (
                <button
                  key={index}
                  onClick={() => day && setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  disabled={!day}
                  className={`aspect-square rounded-lg p-0.5 transition-all text-center ${
                    !day
                      ? 'invisible'
                      : isSelected(day)
                      ? 'bg-gradient-to-br from-primary-500 to-accent-cyan text-white shadow-glow-cyan'
                      : isToday(day)
                      ? 'bg-primary-500/20 border-2 border-primary-500 text-dark-text-primary font-bold'
                      : 'bg-dark-bg-tertiary text-dark-text-primary hover:bg-dark-navy-dark hover:border-primary-500/50 border border-dark-border-subtle'
                  } active:scale-95`}
                >
                  {day && (
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className={`text-xs font-semibold ${isSelected(day) ? 'text-white' : ''}`}>
                        {day}
                      </span>
                      {hasActivities && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayActivities.slice(0, 3).map((_, i) => (
                            <div
                              key={i}
                              className={`w-0.5 h-0.5 rounded-full ${isSelected(day) ? 'bg-white' : 'bg-primary-500'}`}
                            ></div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          </div>
        )
      )}

      {/* Upcoming List View */}
      {viewMode === 'upcoming' && (
        loading ? (
          <div className="bg-dark-bg-secondary rounded-2xl p-4 border border-dark-border-glow shadow-dark-soft-md">
            <div className="h-5 bg-dark-bg-tertiary rounded w-24 mb-3 animate-pulse"></div>
            <div className="space-y-3">
              <ActivitySkeleton />
              <ActivitySkeleton />
              <ActivitySkeleton />
            </div>
          </div>
        ) : (
          <div className="bg-dark-bg-secondary rounded-2xl p-4 border border-dark-border-glow shadow-dark-soft-md animate-fadeIn">
          <h3 className="text-base font-bold text-dark-text-primary mb-3">Next 7 Days</h3>

          {getFilteredActivities(getUpcomingActivities()).length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-dark-bg-tertiary flex items-center justify-center border border-dark-border-glow">
                <svg className="w-8 h-8 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-dark-text-secondary text-sm">No upcoming activities</p>
              <p className="text-dark-text-muted text-xs mt-0.5">Create one using AI above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getFilteredActivities(getUpcomingActivities()).map((activity, idx, arr) => {
                const showDateHeader = idx === 0 || activity.activity_date !== arr[idx - 1].activity_date

                return (
                  <div key={activity.id}>
                    {showDateHeader && (
                      <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                        <div className="flex-1 h-px bg-dark-border-glow"></div>
                        <div className="text-xs font-bold text-dark-text-secondary">
                          {new Date(activity.activity_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="flex-1 h-px bg-dark-border-glow"></div>
                      </div>
                    )}

                    <div className={`p-3 rounded-xl border transition-all ${
                      flyingAwayItems.has(activity.id)
                        ? 'animate-fly-away'
                        : activity.is_completed
                        ? 'bg-dark-bg-tertiary border-dark-border-subtle opacity-60 duration-300'
                        : 'bg-dark-bg-tertiary border-dark-border-glow duration-200'
                    } ${
                      activity.is_completed && !flyingAwayItems.has(activity.id)
                        ? 'success-flash'
                        : ''
                    }`}>
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() => handleToggleComplete(activity.id, activity.is_completed)}
                          className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                            activity.is_completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-dark-border-glow hover:border-primary-500'
                          }`}
                        >
                          {activity.is_completed && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`text-sm font-semibold leading-tight ${
                              activity.is_completed
                                ? 'text-dark-text-muted line-through'
                                : 'text-dark-text-primary'
                            }`}>
                              {activity.title}
                            </h4>
                            {activity.ai_generated && (
                              <div className="flex-shrink-0 flex items-center px-1.5 py-0.5 rounded bg-primary-500/10 border border-primary-500/30">
                                <svg className="w-2.5 h-2.5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-dark-text-muted">
                            {activity.start_time && (
                              <span className="flex items-center gap-1 font-medium">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {activity.start_time.slice(0, 5)}
                              </span>
                            )}
                            {activity.duration_minutes && (
                              <span>{activity.duration_minutes}min</span>
                            )}
                            {activity.subject && (
                              <span className="text-dark-text-secondary font-medium">{activity.subject}</span>
                            )}
                            <span className={`px-1.5 py-0.5 rounded ${getTypeColor(activity.activity_type)} text-white font-medium`}>
                              {activity.activity_type}
                            </span>
                          </div>

                          {activity.description && (
                            <p className="text-xs text-dark-text-secondary mt-1.5 line-clamp-2">{activity.description}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="flex-shrink-0 w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          </div>
        )
      )}

      {/* Selected Day Activities (only shown in calendar mode) */}
      {viewMode === 'calendar' && (
        loading ? (
          <div className="bg-dark-bg-secondary rounded-2xl p-4 border border-dark-border-glow shadow-dark-soft-md">
            <div className="h-5 bg-dark-bg-tertiary rounded w-48 mb-3 animate-pulse"></div>
            <div className="space-y-2.5">
              <ActivitySkeleton />
              <ActivitySkeleton />
            </div>
          </div>
        ) : (
          <div className="bg-dark-bg-secondary rounded-2xl p-4 border border-dark-border-glow shadow-dark-soft-md animate-fadeIn">
          <h3 className="text-base font-bold text-dark-text-primary mb-3">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h3>

          {getFilteredActivities(dayActivities).length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-dark-bg-tertiary flex items-center justify-center border border-dark-border-glow">
                <svg className="w-6 h-6 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-dark-text-secondary text-sm">No activities</p>
              <p className="text-dark-text-muted text-xs mt-0.5">Use AI to create one</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {getFilteredActivities(dayActivities).map((activity) => (
                <div
                  key={activity.id}
                  className={`p-3 rounded-xl border transition-all ${
                    flyingAwayItems.has(activity.id)
                      ? 'animate-fly-away'
                      : activity.is_completed
                      ? 'bg-dark-bg-tertiary border-dark-border-subtle opacity-60 duration-300'
                      : 'bg-dark-bg-tertiary border-dark-border-glow duration-200'
                  } ${
                    activity.is_completed && !flyingAwayItems.has(activity.id)
                      ? 'success-flash'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => handleToggleComplete(activity.id, activity.is_completed)}
                      className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                        activity.is_completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-dark-border-glow hover:border-primary-500'
                      }`}
                    >
                      {activity.is_completed && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm font-semibold leading-tight ${
                          activity.is_completed
                            ? 'text-dark-text-muted line-through'
                            : 'text-dark-text-primary'
                        }`}>
                          {activity.title}
                        </h4>
                        {activity.ai_generated && (
                          <div className="flex-shrink-0 flex items-center px-1.5 py-0.5 rounded bg-primary-500/10 border border-primary-500/30">
                            <svg className="w-2.5 h-2.5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-dark-text-muted">
                        {activity.start_time && (
                          <span className="flex items-center gap-1 font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {activity.start_time.slice(0, 5)}
                          </span>
                        )}
                        {activity.duration_minutes && (
                          <span>{activity.duration_minutes}min</span>
                        )}
                        {activity.subject && (
                          <span className="text-dark-text-secondary font-medium">{activity.subject}</span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded ${getTypeColor(activity.activity_type)} text-white font-medium`}>
                          {activity.activity_type}
                        </span>
                      </div>

                      {activity.description && (
                        <p className="text-xs text-dark-text-secondary mt-1.5 line-clamp-2">{activity.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteActivity(activity.id)}
                      className="flex-shrink-0 w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        )
      )}
    </div>
  )
}

export default Planner
